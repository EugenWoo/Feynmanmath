import React, { useState, useEffect, useRef } from 'react';
import { AppState, Problem, TOPICS, User, Message } from './types';
import { generateMathProblem } from './services/geminiService';
import { initializeAdmin, getCurrentUser, logout, getUserMistakes, saveUserMistakes, saveLastSession, getLastSession } from './services/authService';
import { Button } from './components/Button';
import { ProblemDisplay } from './components/ProblemDisplay';
import { ChatInterface } from './components/ChatInterface';
import { MistakeNotebook } from './components/MistakeNotebook';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { Login } from './components/Login';
import { ChangePassword } from './components/ChangePassword';
import { CoachDashboard } from './components/CoachDashboard';
import { AchievementModal } from './components/AchievementModal';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.Login);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Data for the current view (could be current user's or a student being viewed by coach)
  const [activeMistakes, setActiveMistakes] = useState<Problem[]>([]);
  
  // Achievement System State
  const [showAchievements, setShowAchievements] = useState(false);
  const [previousLoginTime, setPreviousLoginTime] = useState<number | undefined>(undefined);
  
  // For Coach View
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

  // --- Resizable Pane State ---
  const [problemPaneHeight, setProblemPaneHeight] = useState(350); // Initial height in px
  const [isDragging, setIsDragging] = useState(false);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeAdmin();
    const user = getCurrentUser();
    if (user) {
      handleLoginSuccess(user);
    }
  }, []);

  // Save mistakes whenever they change, BUT ONLY if we are a student logged in
  useEffect(() => {
    if (currentUser && currentUser.role === 'student' && appState !== AppState.Login) {
      saveUserMistakes(currentUser.id, activeMistakes);
    }
  }, [activeMistakes, currentUser, appState]);

  // Persist Current Session (Last active problem) whenever it changes
  useEffect(() => {
    if (currentUser && currentUser.role === 'student' && appState === AppState.ProblemActive) {
      saveLastSession(currentUser.id, currentProblem);
    }
  }, [currentProblem, currentUser, appState]);

  // Handle Dragging Logic
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!contentContainerRef.current) return;
      
      const containerRect = contentContainerRef.current.getBoundingClientRect();
      // Calculate height relative to the container top
      let newHeight = e.clientY - containerRect.top;
      
      // Constraints
      const minHeight = 150;
      const maxHeight = containerRect.height - 200; // Leave space for chat
      
      if (newHeight < minHeight) newHeight = minHeight;
      if (newHeight > maxHeight) newHeight = maxHeight;
      
      setProblemPaneHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'row-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isDragging]);

  const handleLoginSuccess = (user: User, prevLoginTime?: number) => {
    setCurrentUser(user);
    setPreviousLoginTime(prevLoginTime);
    
    if (user.isFirstLogin) {
      setAppState(AppState.ChangePassword);
      return;
    }

    if (user.role === 'coach') {
      setAppState(AppState.CoachDashboard);
    } else {
      // Load student data
      const loadedMistakes = getUserMistakes(user.id);
      setActiveMistakes(loadedMistakes);
      
      // If we have a prevLoginTime (coming from manual login), show achievements
      if (prevLoginTime !== undefined) {
         setShowAchievements(true);
      }

      // Try to restore last session
      const lastSession = getLastSession(user.id);
      if (lastSession) {
        setCurrentProblem(lastSession);
        setAppState(AppState.ProblemActive);
      } else {
        setAppState(AppState.TopicSelection);
      }
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setAppState(AppState.Login);
    setActiveMistakes([]);
    setSelectedStudent(null);
    setCurrentProblem(null);
    setShowAchievements(false);
  };

  const handlePasswordChangeSuccess = () => {
    // Refresh user state
    const updated = getCurrentUser();
    if (updated) handleLoginSuccess(updated);
  };

  // --- Student / Practice Logic ---

  const handleTopicSelect = async (topic: string) => {
    setLoading(true);
    try {
      const selectedTopic = topic === "随机挑战" 
        ? TOPICS[Math.floor(Math.random() * (TOPICS.length - 1))] 
        : topic;
        
      const problem = await generateMathProblem(selectedTopic);
      setCurrentProblem(problem);
      setAppState(AppState.ProblemActive);
    } catch (error) {
      alert("无法生成题目。请检查网络连接或API Key。");
    } finally {
      setLoading(false);
    }
  };

  const toggleMistake = () => {
    if (!currentProblem) return;
    
    // Only students can modify their notebook
    if (currentUser?.role !== 'student') return;

    const exists = activeMistakes.some(m => m.id === currentProblem.id);
    if (exists) {
      setActiveMistakes(prev => prev.filter(m => m.id !== currentProblem.id));
    } else {
      setActiveMistakes(prev => [{ ...currentProblem, timestamp: Date.now() }, ...prev]);
    }
  };

  // Explicitly save the current problem (used when user gives up)
  const saveCurrentProblem = () => {
    if (!currentProblem || currentUser?.role !== 'student') return;
    // Check if already saved to avoid duplicates
    if (!activeMistakes.some(m => m.id === currentProblem.id)) {
      setActiveMistakes(prev => [{ ...currentProblem, timestamp: Date.now() }, ...prev]);
    }
  };

  const handleChatUpdate = (messages: Message[]) => {
    if (!currentProblem) return;
    
    const updatedProblem = { ...currentProblem, chatHistory: messages };
    setCurrentProblem(updatedProblem);

    // If this problem exists in mistakes, we must update the record there too
    // so the chat history is preserved in the notebook permanently
    if (activeMistakes.some(m => m.id === updatedProblem.id)) {
       setActiveMistakes(prev => prev.map(m => m.id === updatedProblem.id ? updatedProblem : m));
    }
  };

  // --- Coach Logic ---

  const handleCoachSelectStudent = (student: User, mistakes: Problem[]) => {
    setSelectedStudent(student);
    setActiveMistakes(mistakes);
    setAppState(AppState.CoachAnalytics);
  };

  // --- Render Views ---

  if (appState === AppState.Login) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (appState === AppState.ChangePassword && currentUser) {
    return <ChangePassword user={currentUser} onSuccess={handlePasswordChangeSuccess} />;
  }

  // Coach Dashboard (Main List)
  if (appState === AppState.CoachDashboard) {
    return <CoachDashboard onSelectStudent={handleCoachSelectStudent} onLogout={handleLogout} />;
  }

  // Coach viewing Student Analytics
  if (appState === AppState.CoachAnalytics) {
    return (
      <div className="h-full flex flex-col">
          <div className="bg-indigo-900 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <span className="bg-white/20 px-3 py-1 rounded text-sm">正在查看学生: </span>
                  <span className="font-bold text-lg">{selectedStudent?.name}</span>
              </div>
              <button onClick={() => setAppState(AppState.CoachDashboard)} className="text-sm hover:underline">返回列表</button>
          </div>
          <div className="flex-1 overflow-hidden">
             <AnalyticsDashboard 
                mistakes={activeMistakes}
                onBack={() => setAppState(AppState.CoachDashboard)}
            />
          </div>
      </div>
    );
  }

  // Student Application Flow
  return (
    <div className="h-full flex flex-col relative">
      {/* Achievement Overlay */}
      {showAchievements && currentUser && (
        <AchievementModal 
          user={currentUser} 
          previousLoginTime={previousLoginTime}
          mistakes={activeMistakes}
          onClose={() => setShowAchievements(false)}
        />
      )}

      {/* Student Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex items-center justify-between z-20 flex-none">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setAppState(AppState.TopicSelection)}>
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-white font-bold text-xl">F</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">FeynmanMath</h1>
            <p className="text-xs text-slate-500">你好, {currentUser?.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           {appState === AppState.TopicSelection && (
             <button 
                onClick={() => setAppState(AppState.MistakeNotebook)}
                className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors font-medium text-sm px-3 py-2 rounded-lg hover:bg-slate-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                我的错题本
                {activeMistakes.length > 0 && (
                  <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-xs font-bold">{activeMistakes.length}</span>
                )}
              </button>
           )}
           <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-red-500">
             退出
           </button>
        </div>
      </header>

      {/* Student Content */}
      <main className="flex-1 overflow-hidden relative bg-slate-50" ref={contentContainerRef}>
        {appState === AppState.TopicSelection && (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto pt-10 pb-20">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">今天你想攻克什么难题？</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {TOPICS.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => handleTopicSelect(topic)}
                      disabled={loading}
                      className={`p-6 rounded-2xl text-left transition-all duration-300 border 
                        ${loading 
                          ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed' 
                          : 'bg-white border-slate-200 hover:border-indigo-500 hover:shadow-xl hover:-translate-y-1 group'
                        }`}
                    >
                      <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700">{topic}</h3>
                    </button>
                  ))}
                </div>
              </div>
              {loading && (
                 <div className="text-center mt-10 text-indigo-600 animate-pulse">生成题目中...</div>
              )}
            </div>
          </div>
        )}

        {appState === AppState.MistakeNotebook && (
          <MistakeNotebook 
            mistakes={activeMistakes}
            onSelect={(problem) => {
              setCurrentProblem(problem);
              setAppState(AppState.ProblemActive);
            }}
            onDelete={(id, e) => {
              e.stopPropagation();
              const newMistakes = activeMistakes.filter(m => m.id !== id);
              setActiveMistakes(newMistakes);
              // Save happens via useEffect
            }}
            onBack={() => setAppState(AppState.TopicSelection)}
          />
        )}

        {appState === AppState.ProblemActive && currentProblem && (
          <div className="h-full flex flex-col">
            {/* Resizable Top Pane (Problem Display) */}
            <div style={{ height: problemPaneHeight }} className="flex-none overflow-hidden relative border-b border-slate-200">
              <ProblemDisplay 
                problem={currentProblem} 
                onBack={() => {
                  saveLastSession(currentUser!.id, null); // Clear last session when explicitly going back
                  setAppState(AppState.TopicSelection);
                  setCurrentProblem(null);
                }} 
                isSaved={activeMistakes.some(m => m.id === currentProblem.id)}
                onToggleSave={toggleMistake}
              />
            </div>
            
            {/* Drag Handle */}
            <div 
              className="h-3 bg-slate-100 border-b border-slate-200 hover:bg-indigo-100 cursor-row-resize flex items-center justify-center flex-none transition-colors z-20 shadow-sm"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
            >
              <div className="w-12 h-1 bg-slate-300 rounded-full" />
            </div>

            {/* Bottom Pane (Chat Interface) */}
            <div className="flex-1 overflow-hidden min-h-0 bg-white relative">
              <ChatInterface 
                key={currentProblem.id}
                problem={currentProblem} 
                onAutoSave={saveCurrentProblem}
                onMessagesUpdate={handleChatUpdate}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;