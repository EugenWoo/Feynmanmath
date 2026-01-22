import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Message, Sender, Problem, Attachment } from '../types';
import { evaluateSolution } from '../services/geminiService';
import { Button } from './Button';

interface ChatInterfaceProps {
  problem: Problem;
  onAutoSave?: () => void;
  onMessagesUpdate: (messages: Message[]) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ problem, onAutoSave, onMessagesUpdate }) => {
  // Initialize state with history if it exists, otherwise show welcome message
  const [messages, setMessages] = useState<Message[]>(() => {
    if (problem.chatHistory && problem.chatHistory.length > 0) {
      return problem.chatHistory;
    }
    return [{
      id: 'welcome',
      sender: Sender.AI,
      text: "我已经看过题目了。准备好后，请上传你的解题过程（支持图片、PDF、Word或LaTeX），或者直接输入你的思路。"
    }];
  });

  const [inputText, setInputText] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTop = container.scrollHeight;
      setTimeout(() => {
        if (scrollContainerRef.current) {
             scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Propagate messages up whenever they change
  useEffect(() => {
    onMessagesUpdate(messages);
  }, [messages, onMessagesUpdate]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isTex = file.name.endsWith('.tex');
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const result = reader.result as string;
        let mimeType = file.type;
        let type: 'image' | 'file' = 'file';
        
        if (file.type.startsWith('image/')) {
          type = 'image';
        } else if (file.name.endsWith('.tex')) {
          mimeType = 'text/x-tex';
        } else if (file.name.endsWith('.docx')) {
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }

        setSelectedAttachment({
          type,
          mimeType,
          data: result,
          name: file.name,
          isText: isTex
        });
      };

      if (isTex) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedAttachment) || isProcessing) return;

    if (!selectedAttachment && onAutoSave) {
        const keywords = ['不会', '太难', '不懂', '放弃', '没思路', '很难', '不知道', 'Help'];
        if (keywords.some(k => inputText.toLowerCase().includes(k.toLowerCase()))) {
            onAutoSave();
        }
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: Sender.User,
      text: inputText,
      attachment: selectedAttachment || undefined,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setSelectedAttachment(null);
    setIsProcessing(true);

    try {
      const aiResponseText = await evaluateSolution(problem, updatedMessages, userMsg.attachment, userMsg.text);
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: Sender.AI,
        text: aiResponseText
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderAttachmentPreview = (att: Attachment) => {
    if (att.type === 'image') {
      return <img src={att.data} alt="User submission" className="max-h-64 object-contain bg-black/50" />;
    }
    return (
      <div className="flex items-center gap-3 bg-slate-100 p-3 rounded-lg border border-slate-200">
        <div className="bg-white p-2 rounded shadow-sm">
          {att.mimeType === 'application/pdf' ? (
             <span className="text-red-500 font-bold text-xs">PDF</span>
          ) : att.name.endsWith('.tex') ? (
             <span className="text-slate-800 font-bold text-xs">TEX</span>
          ) : (
             <span className="text-blue-600 font-bold text-xs">DOC</span>
          )}
        </div>
        <div className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
          {att.name}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 max-w-4xl mx-auto w-full shadow-xl bg-white relative overflow-hidden">
      {/* Messages Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender === Sender.User ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                msg.sender === Sender.User 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
              }`}
            >
              {msg.image && !msg.attachment && (
                <div className="mb-3 rounded-lg overflow-hidden border border-white/20">
                  <img src={msg.image} alt="User submission" className="max-h-64 object-contain bg-black/50" />
                </div>
              )}
              {msg.attachment && (
                <div className="mb-3 rounded-lg overflow-hidden border border-white/20">
                   {renderAttachmentPreview(msg.attachment)}
                </div>
              )}

              <div className={`prose max-w-none text-sm md:text-base ${
                msg.sender === Sender.User 
                  ? 'prose-invert prose-p:text-white prose-headings:text-white' 
                  : 'prose-slate'
              }`}>
                <ReactMarkdown 
                  remarkPlugins={[remarkMath]} 
                  rehypePlugins={[rehypeKatex]}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-none p-4 border-t border-slate-200 bg-white z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] relative">
        {selectedAttachment && (
          <div className="mb-2 flex items-center gap-2 bg-slate-100 p-2 rounded-lg w-fit animate-fade-in">
             <span className="text-xs text-slate-500 font-medium">已附文件:</span>
             <span className="text-xs text-slate-700 max-w-[150px] truncate">{selectedAttachment.name}</span>
            <button 
              onClick={() => setSelectedAttachment(null)} 
              className="text-slate-400 hover:text-red-500 ml-2"
            >
              ×
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-slate-400 hover:text-indigo-600 transition-colors"
            title="上传答案 (图片, PDF, Word, LaTeX)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input 
            type="file" 
            accept="image/*,.pdf,.doc,.docx,.tex" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload}
          />
          
          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="输入思路，或上传 PDF/Word/图片 答案..."
              className="w-full bg-slate-100 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none max-h-32 text-slate-800 placeholder-slate-400"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
          </div>

          <Button 
            type="submit" 
            disabled={!inputText.trim() && !selectedAttachment}
            isLoading={isProcessing}
            className="rounded-full w-12 h-12 p-0 flex items-center justify-center flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </Button>
        </form>
      </div>
    </div>
  );
};