
import { User, UserRole, UserData, Problem } from '../types';

// STORAGE KEYS
const USERS_KEY = 'feynman_users';
const DATA_KEY = 'feynman_data';
const CURRENT_USER_KEY = 'feynman_current_user';
const LAST_SESSION_PREFIX = 'feynman_last_session_';

// --- Crypto Utils ---
async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Data Access Layer (Simulated Database) ---

const getDBUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveDBUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const getDBData = (): UserData[] => {
  const stored = localStorage.getItem(DATA_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveDBData = (data: UserData[]) => {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
};

// --- Auth Service Exports ---

export const initializeAdmin = async () => {
  const users = getDBUsers();
  let hasChanges = false;
  
  // 1. Ensure the specific 'Coach' account exists
  if (!users.some(u => u.username === 'Coach')) {
    const pHash = await hashPassword('admin123');
    const admin: User = {
      id: 'admin_default',
      username: 'Coach',
      passwordHash: pHash,
      name: '竞赛主教练',
      role: 'coach',
      isFirstLogin: false
    };
    users.push(admin);
    hasChanges = true;
  }

  // 2. Ensure the specific 'test' student account exists
  if (!users.some(u => u.username === 'test')) {
    const pHash = await hashPassword('test');
    const testUser: User = {
      id: 'student_test_default',
      username: 'test',
      passwordHash: pHash,
      name: '测试学生',
      role: 'student',
      isFirstLogin: false // Skip password change for easier testing
    };
    users.push(testUser);
    hasChanges = true;
  }

  if (hasChanges) {
    saveDBUsers(users);
  }
};

export const login = async (username: string, password: string): Promise<{user: User, previousLogin?: number}> => {
  const users = getDBUsers();
  const userIndex = users.findIndex(u => u.username === username);
  
  if (userIndex === -1) throw new Error("用户不存在");
  
  const user = users[userIndex];
  const pHash = await hashPassword(password);
  if (user.passwordHash !== pHash) throw new Error("密码错误");
  
  // Capture previous login time to display to user
  const previousLogin = user.lastLogin;

  // Update stats
  const updatedUser = {
      ...user,
      lastLogin: Date.now(),
      loginCount: (user.loginCount || 0) + 1
  };
  
  // Save back to "DB"
  users[userIndex] = updatedUser;
  saveDBUsers(users);

  // Save session
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));

  return { user: updatedUser, previousLogin };
};

export const logout = () => {
  // Clear current user but KEEP the session data in localStorage so it persists across sessions
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const updatePassword = async (userId: string, newPassword: string): Promise<User> => {
  const users = getDBUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) throw new Error("User not found");

  const pHash = await hashPassword(newPassword);
  
  // Update user record
  users[index].passwordHash = pHash;
  users[index].isFirstLogin = false; // Mark as initialized
  
  saveDBUsers(users);
  
  // Update session
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(users[index]));
  
  return users[index];
};

/**
 * Resets a user's password to be identical to their username.
 * Also resets 'isFirstLogin' to true so they are prompted to change it.
 */
export const resetUserPasswordToUsername = async (userId: string): Promise<void> => {
  const users = getDBUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) throw new Error("User not found");
  
  const user = users[index];
  const newHash = await hashPassword(user.username);
  
  users[index].passwordHash = newHash;
  users[index].isFirstLogin = true; // Force them to change it again
  
  saveDBUsers(users);
};

export const registerBatchUsers = async (newUsersRaw: {name: string, username: string}[]) => {
  const currentUsers = getDBUsers();
  
  // Create users with password equal to username
  const newUsersPromises = newUsersRaw.map(async (u) => ({
    id: `u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    username: u.username,
    name: u.name,
    passwordHash: await hashPassword(u.username), // Set initial password same as username
    role: 'student' as UserRole,
    isFirstLogin: true // Force password change
  }));

  const newUsers = await Promise.all(newUsersPromises);

  // Filter out duplicates based on username
  const uniqueNewUsers = newUsers.filter(nu => !currentUsers.some(cu => cu.username === nu.username));
  
  saveDBUsers([...currentUsers, ...uniqueNewUsers]);
  return uniqueNewUsers.length;
};

export const getStudents = (): User[] => {
  return getDBUsers().filter(u => u.role === 'student');
};

// --- Mistake Data Management ---

export const getUserMistakes = (userId: string) => {
  const allData = getDBData();
  const userData = allData.find(d => d.userId === userId);
  return userData ? userData.mistakes : [];
};

export const saveUserMistakes = (userId: string, mistakes: any[]) => {
  const allData = getDBData();
  const index = allData.findIndex(d => d.userId === userId);
  
  if (index > -1) {
    allData[index].mistakes = mistakes;
  } else {
    allData.push({ userId, mistakes });
  }
  
  saveDBData(allData);
};

// --- Session Persistence Management ---

export const saveLastSession = (userId: string, problem: Problem | null) => {
  const key = `${LAST_SESSION_PREFIX}${userId}`;
  if (problem) {
    localStorage.setItem(key, JSON.stringify(problem));
  } else {
    localStorage.removeItem(key);
  }
};

export const getLastSession = (userId: string): Problem | null => {
  const key = `${LAST_SESSION_PREFIX}${userId}`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : null;
};
