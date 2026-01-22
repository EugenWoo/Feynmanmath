import React, { useEffect, useState } from 'react';
import { User, Problem } from '../types';
import { Button } from './Button';

interface AchievementModalProps {
  user: User;
  previousLoginTime?: number;
  mistakes: Problem[]; // Use mistakes count as a proxy for experience points
  onClose: () => void;
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  condition: (count: number, loginCount: number, topics: number) => boolean;
}

const BADGES: Badge[] = [
  {
    id: 'newbie',
    name: '初出茅庐',
    icon: '🌱',
    description: '成功注册并首次登录系统',
    condition: (c, l, t) => l >= 1
  },
  {
    id: 'explorer',
    name: '探索者',
    icon: '🧭',
    description: '尝试了3个不同的数学主题',
    condition: (c, l, t) => t >= 3
  },
  {
    id: 'scholar',
    name: '勤奋学员',
    icon: '📚',
    description: '累计练习超过 5 道题目',
    condition: (c, l, t) => c >= 5
  },
  {
    id: 'master',
    name: '解题大师',
    icon: '🏆',
    description: '累计练习超过 20 道题目',
    condition: (c, l, t) => c >= 20
  },
  {
    id: 'legend',
    name: '费曼传奇',
    icon: '👑',
    description: '累计练习超过 50 道题目',
    condition: (c, l, t) => c >= 50
  }
];

export const AchievementModal: React.FC<AchievementModalProps> = ({ user, previousLoginTime, mistakes, onClose }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Small delay for animation
    setTimeout(() => setShow(true), 100);
  }, []);

  // Stats Calculation
  const problemCount = mistakes.length;
  const loginCount = user.loginCount || 1;
  const uniqueTopics = new Set(mistakes.map(m => m.topic)).size;
  
  // Level Calculation (Simple linear progression)
  // Level 1 = 0-2 problems
  // Level 2 = 3-5 problems
  // etc.
  const level = Math.floor(problemCount / 3) + 1;
  const nextLevelThreshold = level * 3;
  const progressPercent = Math.min(100, ((problemCount - (level - 1) * 3) / 3) * 100);

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '这是您的第一次登录';
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const unlockedBadges = BADGES.filter(b => b.condition(problemCount, loginCount, uniqueTopics));
  const nextBadge = BADGES.find(b => !b.condition(problemCount, loginCount, uniqueTopics));

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative transform transition-all duration-500 ${show ? 'scale-100 translate-y-0' : 'scale-95 translate-y-10'}`}>
        
        {/* Header Background */}
        <div className="bg-indigo-600 h-32 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500 rounded-full opacity-50 blur-2xl"></div>
          <div className="absolute top-10 left-10 w-20 h-20 bg-indigo-400 rounded-full opacity-50 blur-xl"></div>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 -mt-16 relative">
          
          {/* Avatar / Level */}
          <div className="flex justify-between items-end mb-6">
            <div className="bg-white p-1 rounded-2xl shadow-lg">
               <div className="w-24 h-24 bg-gradient-to-br from-amber-300 to-amber-500 rounded-xl flex flex-col items-center justify-center text-white shadow-inner">
                  <span className="text-xs font-bold uppercase opacity-80">Level</span>
                  <span className="text-4xl font-extrabold">{level}</span>
               </div>
            </div>
            <div className="text-right mb-2">
               <div className="text-sm text-indigo-100 font-medium bg-indigo-800/80 px-3 py-1 rounded-full backdrop-blur-md border border-indigo-500/30">
                  上次登录: {formatTime(previousLoginTime)}
               </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">欢迎回来, {user.name}</h2>
            <p className="text-slate-500">准备好接受今天的挑战了吗？</p>
          </div>

          {/* Level Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">
              <span>当前进度</span>
              <span>{problemCount} / {nextLevelThreshold} XP</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Badges Grid */}
          <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-2">
            我的成就勋章
            <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full">{unlockedBadges.length} / {BADGES.length}</span>
          </h3>
          
          <div className="grid grid-cols-4 gap-3 mb-8">
            {BADGES.map((badge) => {
              const isUnlocked = unlockedBadges.some(b => b.id === badge.id);
              return (
                <div key={badge.id} className="group relative flex flex-col items-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-1 transition-all duration-300 ${
                    isUnlocked 
                      ? 'bg-amber-50 border-2 border-amber-200 shadow-sm scale-100' 
                      : 'bg-slate-50 border-2 border-slate-100 grayscale opacity-40 scale-90'
                  }`}>
                    {badge.icon}
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isUnlocked ? 'text-slate-700' : 'text-slate-300'}`}>
                    {badge.name}
                  </span>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-32 bg-slate-800 text-white text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center shadow-xl">
                    <div className="font-bold mb-1">{badge.name}</div>
                    {badge.description}
                    {!isUnlocked && <div className="text-slate-400 mt-1 italic">未解锁</div>}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-800"></div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button onClick={onClose} className="w-full justify-center rounded-xl py-4 text-lg shadow-indigo-500/20">
            开始训练
          </Button>
        </div>
      </div>
    </div>
  );
};