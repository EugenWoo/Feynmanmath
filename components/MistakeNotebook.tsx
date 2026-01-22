import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Problem } from '../types';

interface MistakeNotebookProps {
  mistakes: Problem[];
  onSelect: (problem: Problem) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onBack: () => void;
}

export const MistakeNotebook: React.FC<MistakeNotebookProps> = ({ 
  mistakes, 
  onSelect, 
  onDelete, 
  onBack 
}) => {
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
          <h2 className="text-2xl font-bold text-slate-900">我的错题本</h2>
          <span className="text-slate-500 text-sm bg-slate-200 px-2 py-1 rounded-full">{mistakes.length}</span>
        </div>

        {mistakes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-slate-200 rounded-full mx-auto flex items-center justify-center mb-4 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">错题本是空的</h3>
            <p className="text-slate-500">在练习过程中，点击星标收藏需要复习的题目。</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {mistakes.map((problem) => (
              <div 
                key={problem.id}
                onClick={() => onSelect(problem)}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group relative"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="inline-block px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-md">
                    {problem.topic}
                  </span>
                  <button 
                    onClick={(e) => onDelete(problem.id, e)}
                    className="text-slate-400 hover:text-red-500 p-2 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="移除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                
                <div className="prose prose-slate prose-sm max-w-none line-clamp-3 mb-2 pointer-events-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                  >
                     {problem.content.replace(/\*\*题目:\*\*/g, '').replace(/\*\*Problem:\*\*/g, '').trim()}
                  </ReactMarkdown>
                </div>
                
                <div className="text-indigo-600 text-sm font-medium mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  重新挑战
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
