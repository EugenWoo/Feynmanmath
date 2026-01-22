import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Problem } from '../types';

interface ProblemDisplayProps {
  problem: Problem;
  onBack: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
}

export const ProblemDisplay: React.FC<ProblemDisplayProps> = ({ problem, onBack, isSaved, onToggleSave }) => {
  const [showToast, setShowToast] = useState(false);

  const cleanContent = problem.content
    .replace(/\*\*题目:\*\*/g, '')
    .replace(/\*\*Problem:\*\*/g, '')
    .trim();

  // Auto-hide toast after 2 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleToggle = () => {
    onToggleSave();
    // If it is currently NOT saved, it means we are adding it, so show toast
    if (!isSaved) {
      setShowToast(true);
    }
  };

  return (
    <div className="bg-white p-6 shadow-sm z-10 relative h-full flex flex-col">
      {/* Toast Notification */}
      <div 
        className={`absolute top-4 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full shadow-xl transition-all duration-300 z-50 flex items-center gap-2 ${
          showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="text-green-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm font-medium">已加入错题本</span>
      </div>

      <div className="max-w-4xl mx-auto w-full flex-none">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-full mb-2">
              {problem.topic}
            </span>
            <h2 className="text-xl font-bold text-slate-900">当前挑战</h2>
          </div>
          <div className="flex items-center gap-2">
             <button
              onClick={handleToggle}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                isSaved 
                  ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              {isSaved ? '已加入错题本' : '加入错题本'}
            </button>

            <button 
              onClick={onBack}
              className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              结束会话
            </button>
          </div>
        </div>
      </div>
      
      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 w-full max-w-4xl mx-auto">
        <div className="bg-slate-50 p-6 rounded-lg border-l-4 border-indigo-500 overflow-y-auto h-full shadow-inner">
          {problem.source && (
            <div className="font-bold text-slate-600 mb-3">
              {problem.source}
            </div>
          )}
          <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-indigo-600">
            <ReactMarkdown 
              remarkPlugins={[remarkMath]} 
              rehypePlugins={[rehypeKatex]}
            >
              {cleanContent}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};