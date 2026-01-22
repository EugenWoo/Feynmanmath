import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Problem, TOPICS } from '../types';
import { generateStudyPlan } from '../services/geminiService';
import { Button } from './Button';

interface AnalyticsDashboardProps {
  mistakes: Problem[];
  onBack: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ mistakes, onBack }) => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const counts: Record<string, number> = {};
    TOPICS.filter(t => t !== "随机挑战").forEach(t => counts[t] = 0);
    
    mistakes.forEach(m => {
      if (counts[m.topic] !== undefined) {
        counts[m.topic]++;
      } else {
        // Handle cases where topic might slightly differ or be older
        counts[m.topic] = (counts[m.topic] || 0) + 1;
      }
    });

    const total = mistakes.length;
    const maxCount = Math.max(...Object.values(counts), 1);
    
    // Sort by count descending
    const sortedTopics = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .filter(([, count]) => count > 0); // Only show topics with mistakes

    return { counts, total, maxCount, sortedTopics };
  }, [mistakes]);

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const result = await generateStudyPlan(mistakes);
      setReport(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="max-w-4xl mx-auto w-full p-6 flex-1 overflow-y-auto">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-slate-900">学情分析仪表盘</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 col-span-1 md:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" className="text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              薄弱知识点分布
            </h3>
            {stats.sortedTopics.length > 0 ? (
              <div className="space-y-4">
                {stats.sortedTopics.map(([topic, count]) => (
                  <div key={topic}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{topic}</span>
                      <span className="text-slate-500">{count} 题</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div 
                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                        style={{ width: `${(count / stats.maxCount) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">
                暂无错题数据，请先进行练习。
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-6 rounded-2xl shadow-lg col-span-1">
            <h3 className="text-lg font-bold mb-2">总体概况</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold">{stats.total}</span>
              <span className="text-indigo-200 ml-2">个记录在案的难点</span>
            </div>
            <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
              持续追踪你的错题是提高竞赛成绩的最快方法。点击下方按钮获取AI教练的详细诊断。
            </p>
            <Button 
              onClick={handleGenerateReport} 
              isLoading={loading}
              className="w-full bg-white text-indigo-700 hover:bg-indigo-50 border-none"
              disabled={stats.total === 0}
            >
              {loading ? '分析中...' : '生成教练诊断报告'}
            </Button>
          </div>
        </div>

        {report && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI 教练诊断报告
            </h3>
            <div className="prose prose-slate max-w-none prose-headings:text-indigo-800 prose-a:text-indigo-600">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
