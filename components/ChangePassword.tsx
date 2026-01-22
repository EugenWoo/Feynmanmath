import React, { useState } from 'react';
import { Button } from './Button';
import { updatePassword } from '../services/authService';
import { User } from '../types';

interface ChangePasswordProps {
  user: User;
  onSuccess: () => void;
}

export const ChangePassword: React.FC<ChangePasswordProps> = ({ user, onSuccess }) => {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) {
      setError("密码长度至少需6位");
      return;
    }
    if (newPass !== confirmPass) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(user.id, newPass);
      onSuccess();
    } catch (e) {
      setError("更新失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900 mb-2">首次登录需修改密码</h2>
        <p className="text-slate-500 text-sm mb-6">为了账户安全，请设置一个新的访问密码。</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">新密码</label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">确认新密码</label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <Button type="submit" className="w-full justify-center" isLoading={loading}>
            确认修改
          </Button>
        </form>
      </div>
    </div>
  );
};