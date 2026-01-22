import { GoogleGenAI, Content, Part, Type } from "@google/genai";
import { Message, Sender, Problem, Attachment } from "../types";
import { FEYNMAN_TUTOR_PROMPT, PROBLEM_GENERATOR_PROMPT } from "../constants";

// Initialize Gemini Client
// We use a relative 'baseUrl' so requests go to our own server (e.g., /api/genai)
// which then proxies them to Google. This avoids CORS and Firewall issues.
// NOTE: Ensure VITE_API_KEY is set in your environment variables.
const ai = new GoogleGenAI({ 
  apiKey: process.env.API_KEY, 
}, {
  baseUrl: '/api/genai'
});

/**
 * Generates a math problem based on the selected topic.
 * Now returns a JSON structure containing the problem, Feynman explanation, and standard solution.
 */
export const generateMathProblem = async (topic: string): Promise<Problem> => {
  try {
    const prompt = `${PROBLEM_GENERATOR_PROMPT}\nRequested Topic: ${topic}`;
    
    // Configure response schema for structured output
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            problemStatement: {
              type: Type.STRING,
              description: "The formatted math problem text in Markdown/LaTeX.",
            },
            source: {
              type: Type.STRING,
              description: "The source/origin string of the problem, e.g. '(第十二届全国大学生数学竞赛非数学类预赛)'.",
            },
            feynmanExplanation: {
              type: Type.STRING,
              description: "A step-by-step Feynman technique explanation of the concept and problem logic, without just giving the answer immediately if possible, but explaining the 'Why'.",
            },
            standardSolution: {
              type: Type.STRING,
              description: "The complete, correct mathematical derivation and answer.",
            },
          },
          required: ["problemStatement", "source", "feynmanExplanation", "standardSolution"],
        },
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");

    const parsed = JSON.parse(jsonText);
    
    return {
      id: Date.now().toString(),
      topic: topic,
      content: parsed.problemStatement,
      source: parsed.source,
      feynmanExplanation: parsed.feynmanExplanation,
      standardSolution: parsed.standardSolution,
      difficulty: 'Medium'
    };
  } catch (error) {
    console.error("Gemini Generate Error:", error);
    // Fallback for error cases
    return {
       id: Date.now().toString(),
       topic: topic,
       content: "生成题目时遇到问题，请重试。请确认云托管环境变量 VITE_API_KEY 已配置。",
       difficulty: 'Medium'
    };
  }
};

/**
 * Helper to process an attachment into a Gemini Part.
 */
const processAttachmentToPart = (attachment: Attachment): Part | null => {
  // If it's a LaTeX file, we treat it as text content.
  if (attachment.isText && attachment.data) {
    return { text: `\n[Student Attached LaTeX/Text File Content]:\n${attachment.data}\n` };
  }

  // If it's a binary file (Image, PDF, etc.)
  if (attachment.data) {
    // Strip the data:mime/type;base64, prefix if present
    const base64Data = attachment.data.includes(',') 
      ? attachment.data.split(',')[1] 
      : attachment.data;

    return {
      inlineData: {
        mimeType: attachment.mimeType,
        data: base64Data
      }
    };
  }
  return null;
};

/**
 * Analyzes the student's solution (text + attachment) and provides feedback.
 */
export const evaluateSolution = async (
  currentProblem: Problem,
  history: Message[],
  newAttachment?: Attachment,
  newText?: string
): Promise<string> => {
  try {
    const contents: Content[] = [];

    // Prepare hidden context from pre-generated data
    const hiddenContext = `
    [INSTRUCTOR DATA - HIDDEN FROM STUDENT]
    The following data was pre-generated for this problem. 
    If the student explicitly chooses "Option B" (Feynman Method) or asks for the Feynman explanation, OUTPUT the content below verbatim (or adapted slightly for flow).
    
    --- PRE-GENERATED FEYNMAN EXPLANATION ---
    ${currentProblem.feynmanExplanation || "(Not available, generate dynamically)"}
    -----------------------------------------

    If the student explicitly chooses "Option C" (Direct Answer), use the content below:
    --- PRE-GENERATED STANDARD SOLUTION ---
    ${currentProblem.standardSolution || "(Not available, generate dynamically)"}
    ---------------------------------------
    `;

    // 1. Add System Instruction as the first part of the context
    contents.push({
      role: 'user',
      parts: [{ text: `System Context: ${FEYNMAN_TUTOR_PROMPT}\n\nThe current problem is:\n${currentProblem.content}\n\n${hiddenContext}` }]
    });

    contents.push({
      role: 'model',
      parts: [{ text: "Understood. I will act as the Feynman Tutor. I have the pre-generated explanation and solution ready if requested." }]
    });

    // 2. Map existing app history to Gemini format
    history.forEach(msg => {
      const parts: Part[] = [];
      
      // Handle legacy image support
      if (msg.image && !msg.attachment) {
        const base64Data = msg.image.split(',')[1] || msg.image;
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        });
      }

      // Handle new attachment structure
      if (msg.attachment) {
        const part = processAttachmentToPart(msg.attachment);
        if (part) parts.push(part);
      }

      if (msg.text) {
        parts.push({ text: msg.text });
      }

      contents.push({
        role: msg.sender === Sender.User ? 'user' : 'model',
        parts: parts
      });
    });

    // 3. Add the new user input
    const newParts: Part[] = [];
    
    if (newAttachment) {
       const part = processAttachmentToPart(newAttachment);
       if (part) newParts.push(part);
    }

    if (newText) {
      newParts.push({ text: newText });
    }

    if (newParts.length > 0) {
        contents.push({
            role: 'user',
            parts: newParts
        });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        temperature: 0.7,
      }
    });

    return response.text || "I'm having trouble reading that. Could you try again?";

  } catch (error) {
    console.error("Gemini Evaluate Error:", error);
    return "Sorry, I encountered an error analyzing your solution. Please check your API key or try again. Note: Word documents may not be fully supported by the AI model directly; try converting to PDF.";
  }
};

/**
 * Generates a study plan based on mistake history.
 */
export const generateStudyPlan = async (mistakes: Problem[]): Promise<string> => {
  try {
    if (mistakes.length === 0) {
      return "目前没有错题记录，无法生成分析报告。请先进行练习。";
    }

    // Aggregate topics locally first to help the model
    const topicCounts: Record<string, number> = {};
    mistakes.forEach(m => {
      topicCounts[m.topic] = (topicCounts[m.topic] || 0) + 1;
    });

    const analysisPrompt = `
      作为数学竞赛教练，请根据以下学生的错题统计数据生成一份简短的学情分析报告。
      
      错题分布统计:
      ${JSON.stringify(topicCounts, null, 2)}

      错题详情摘要:
      ${mistakes.map(m => `- [${m.topic}] ${m.content.substring(0, 50)}...`).join('\n')}

      请包含以下部分（使用Markdown格式）：
      1. **薄弱点诊断**：指出哪些模块问题最大。
      2. **复习建议**：针对薄弱模块给出具体的数学竞赛复习策略。
      3. **重点关注**：接下来的训练重点。
      
      保持语气专业、鼓励，并针对大学生数学竞赛的特点给出建议。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: analysisPrompt,
    });

    return response.text || "无法生成报告。";
  } catch (error) {
    console.error("Gemini Study Plan Error:", error);
    return "分析服务暂时不可用，请稍后再试。";
  }
};