
export enum Sender {
  User = 'user',
  AI = 'model'
}

export interface Attachment {
  type: 'image' | 'file';
  mimeType: string;
  data: string; // Base64 string or raw text for .tex
  name: string;
  isText?: boolean;
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  image?: string; // Legacy support for backward compatibility
  attachment?: Attachment;
  isThinking?: boolean;
}

export interface Problem {
  id: string;
  topic: string;
  content: string;
  source?: string;             // Origin/Source of the problem (e.g. 12th Competition)
  feynmanExplanation?: string; // Pre-generated Feynman explanation
  standardSolution?: string;   // Pre-generated standard solution
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timestamp?: number;
  chatHistory?: Message[];     // Persisted chat history for this problem
}

export enum AppState {
  Login,
  ChangePassword,
  TopicSelection,
  ProblemActive,
  MistakeNotebook,
  CoachDashboard, // List of students
  CoachAnalytics // Specific student analysis
}

export type UserRole = 'student' | 'coach';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  isFirstLogin: boolean;
  lastLogin?: number;  // Timestamp of the login BEFORE the current session
  loginCount?: number; // Total number of logins
}

// Associate mistakes with specific users in our "Database"
export interface UserData {
  userId: string;
  mistakes: Problem[];
}

export const TOPICS = [
  "极限与连续性",
  "导数及其应用",
  "积分及其应用",
  "微分方程",
  "线性代数 (矩阵/行列式)",
  "解析几何",
  "级数与数列",
  "随机挑战"
];
