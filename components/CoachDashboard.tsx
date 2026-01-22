import React, { useState, useEffect, useRef } from 'react';
import ExcelJS from 'exceljs';
import { Button } from './Button';
import { User, Problem, TOPICS } from '../types';
import { getStudents, registerBatchUsers, getUserMistakes, resetUserPasswordToUsername } from '../services/authService';

interface CoachDashboardProps {
  onSelectStudent: (student: User, mistakes: Problem[]) => void;
  onLogout: () => void;
}

export const CoachDashboard: React.FC<CoachDashboardProps> = ({ onSelectStudent, onLogout }) => {
  const [students, setStudents] = useState<User[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshStudents();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStudents(students);
    } else {
      const lowerTerm = searchTerm.toLowerCase();
      setFilteredStudents(students.filter(s => 
        s.name.toLowerCase().includes(lowerTerm) || 
        s.username.toLowerCase().includes(lowerTerm)
      ));
    }
  }, [searchTerm, students]);

  const refreshStudents = () => {
    const allStudents = getStudents();
    setStudents(allStudents);
    setFilteredStudents(allStudents);
  };

  const handleResetPassword = async (student: User) => {
    if (window.confirm(`确定要重置 ${student.name} (${student.username}) 的密码吗？\n重置后密码将变更为与账号相同，并要求学生下次登录时修改。`)) {
      try {
        await resetUserPasswordToUsername(student.id);
        alert(`成功重置。密码已设置为: ${student.username}`);
        refreshStudents(); // Refresh to show status change if any
      } catch (e) {
        alert("重置失败");
        console.error(e);
      }
    }
  };

  const handleExportData = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('学生学情统计');

    // Define columns
    const columns = [
      { header: '姓名', key: 'name', width: 15 },
      { header: '账号', key: 'username', width: 15 },
      { header: '状态', key: 'status', width: 10 },
      { header: '错题总数', key: 'totalMistakes', width: 12 },
    ];

    // Add dynamic topic columns
    const topics = TOPICS.filter(t => t !== "随机选题");
    topics.forEach(t => {
      columns.push({ header: t, key: t, width: 20 });
    });

    sheet.columns = columns;

    // Add Data
    students.forEach(student => {
        const mistakes = getUserMistakes(student.id);
        const topicCounts: Record<string, number> = {};
        topics.forEach(t => topicCounts[t] = 0);
        
        mistakes.forEach(m => {
            if (topicCounts[m.topic] !== undefined) {
                topicCounts[m.topic]++;
            } else {
                 topicCounts[m.topic] = (topicCounts[m.topic] || 0) + 1;
            }
        });

        const rowData: any = {
            name: student.name,
            username: student.username,
            status: student.isFirstLogin ? "未激活" : "活跃",
            totalMistakes: mistakes.length,
            ...topicCounts
        };
        sheet.addRow(rowData);
    });

    // Write to buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `FeynmanMath_Export_${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) throw new Error("Excel 文件为空");

        const newUsersRaw: {name: string, username: string}[] = [];
        const headers: string[] = [];

        // Read headers from row 1
        worksheet.getRow(1).eachCell((cell, colNumber) => {
           headers[colNumber] = cell.text.toLowerCase().trim();
        });

        const nameIndex = headers.indexOf('name');
        const usernameIndex = headers.indexOf('username');

        // Allow Chinese headers fallback
        const nameIndexCn = headers.indexOf('姓名');
        const usernameIndexCn = headers.indexOf('账号');
        
        const finalNameIdx = nameIndex > -1 ? nameIndex : nameIndexCn;
        const finalUserIdx = usernameIndex > -1 ? usernameIndex : usernameIndexCn;

        if (finalNameIdx === -1 || finalUserIdx === -1) {
            alert("Excel格式错误。第一行必须包含 'name' (或 '姓名') 和 'username' (或 '账号') 列。");
            setImporting(false);
            return;
        }

        // Iterate rows (ExcelJS is 1-based, start from 2)
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            
            // @ts-ignore - ExcelJS types for cells can be complex
            const name = row.getCell(finalNameIdx).text; 
            // @ts-ignore
            const username = row.getCell(finalUserIdx).text;

            if (name && username) {
                newUsersRaw.push({ name, username });
            }
        });
        
        if (newUsersRaw.length > 0) {
          const count = await registerBatchUsers(newUsersRaw);
          alert(`成功导入 ${count} 名学生。初始密码与账号(Username)相同。`);
          refreshStudents();
        } else {
          alert("未找到有效的学生数据。");
        }
      } catch (err) {
        console.error(err);
        alert("文件解析失败");
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    
    // ExcelJS needs ArrayBuffer
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-900 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">教练控制台</h1>
            <p className="text-xs text-slate-500">FeynmanMath 管理系统</p>
          </div>
        </div>
        <button onClick={onLogout} className="text-sm text-slate-500 hover:text-red-600">退出登录</button>
      </header>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {/* Actions & Search */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
            <div className="w-full md:w-auto">
              <h2 className="text-2xl font-bold text-slate-900">学生管理</h2>
              <p className="text-slate-500 mt-1 mb-4">查看学生进度或导入新账号</p>
              
              {/* Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="搜索姓名或账号..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-64"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx, .xls"
                onChange={handleFileUpload} 
              />
              <Button 
                variant="secondary" 
                onClick={handleExportData}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mr-2">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                导出数据
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => fileInputRef.current?.click()}
                isLoading={importing}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Excel 批量导入
              </Button>
            </div>
          </div>

          {/* Student List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-700 text-sm">姓名</th>
                  <th className="px-6 py-4 font-semibold text-slate-700 text-sm">账号</th>
                  <th className="px-6 py-4 font-semibold text-slate-700 text-sm">状态</th>
                  <th className="px-6 py-4 font-semibold text-slate-700 text-sm text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(student => {
                    const mistakes = getUserMistakes(student.id);
                    return (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 text-slate-900 font-medium">{student.name}</td>
                        <td className="px-6 py-4 text-slate-500 font-mono text-sm">{student.username}</td>
                        <td className="px-6 py-4">
                            {student.isFirstLogin ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                未激活
                            </span>
                            ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                活跃
                            </span>
                            )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-4">
                            <button 
                              onClick={() => handleResetPassword(student)}
                              className="text-slate-400 hover:text-red-600 text-sm font-medium transition-colors"
                              title="重置密码为用户名"
                            >
                              重置密码
                            </button>
                            <button 
                            onClick={() => onSelectStudent(student, mistakes)}
                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium transition-opacity"
                            >
                            查看学情 &rarr;
                            </button>
                        </td>
                        </tr>
                    );
                })}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      {searchTerm ? "未找到匹配的学生。" : "暂无学生数据。请使用 Excel 导入。"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-xs text-slate-400">
            * 仅展示已注册学生。密码加密存储。
            Excel 模板格式: 第一列 "name" 或 "姓名", 第二列 "username" 或 "账号"。
          </div>
        </div>
      </main>
    </div>
  );
};