import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, LogIn, AlertCircle, CheckCircle } from 'lucide-react';
import { Logo } from './Logo';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<'student' | 'teacher'>('student');

  // ── Student login fields (backend: username + password)
  const [studentData, setStudentData] = useState({ username: '', password: '' });

  // ── Teacher login fields (backend: email + password)
  const [teacherData, setTeacherData] = useState({ email: '', password: '' });

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      // Pick the right endpoint and payload based on the selected role
      const url =
        role === 'student'
          ? `${API_URL}/auth/login`
          : `${API_URL}/auth/teacher/login`;

      const payload = role === 'student' ? studentData : teacherData;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store the JWT and role in localStorage for later API calls
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', role);
        setSuccessMessage('Credentials verified. Initiating cryptographic session…');
        // Navigate to the correct dashboard based on role
        setTimeout(() => {
          if (role === 'teacher') {
            navigate('/teacher-dashboard');
          } else {
            navigate('/student-dashboard');
          }
        }, 800);
      } else {
        setErrorMessage(data.message || 'Authentication failed. Please verify credentials.');
      }
    } catch {
      setErrorMessage('Cannot establish connection to authentication gateway.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400 text-sm transition';

  const labelClass =
    'block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 font-mono';

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent px-4 py-8">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200 p-8 sm:p-10 relative overflow-hidden">
        
        {/* Subtle accent top border line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-600" />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-3">
            <Logo size="lg" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Portal Authentication</h2>
          <p className="text-xs text-slate-500 mt-1 font-mono uppercase tracking-wide">AttendEase Verified Trust Session</p>
        </div>

        {/* Role Segmented Picker */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 border border-slate-200/80">
          <button
            type="button"
            onClick={() => { setRole('student'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition ${
              role === 'student'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4" /> Student Portal
          </button>
          <button
            type="button"
            onClick={() => { setRole('teacher'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition ${
              role === 'teacher'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Faculty Admin
          </button>
        </div>

        {/* Dynamic Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {role === 'student' ? (
            <>
              <div>
                <label className={labelClass}>Student Username</label>
                <input
                  id="student-username"
                  type="text"
                  required
                  placeholder="e.g. john_doe"
                  value={studentData.username}
                  onChange={(e) => setStudentData({ ...studentData, username: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Security Passcode</label>
                <input
                  id="student-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={studentData.password}
                  onChange={(e) => setStudentData({ ...studentData, password: e.target.value })}
                  className={inputClass}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelClass}>Faculty Email</label>
                <input
                  id="teacher-email"
                  type="email"
                  required
                  placeholder="faculty@campus.edu"
                  value={teacherData.email}
                  onChange={(e) => setTeacherData({ ...teacherData, email: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Faculty Passcode</label>
                <input
                  id="teacher-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={teacherData.password}
                  onChange={(e) => setTeacherData({ ...teacherData, password: e.target.value })}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* Feedback messages with verified semantic colors */}
          {errorMessage && (
            <div className="flex items-center gap-2.5 text-[#F43F5E] text-xs font-medium bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900/60 rounded-xl px-4 py-3 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#F43F5E]" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="flex items-center gap-2.5 text-[#10B981] text-xs font-medium bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900/60 rounded-xl px-4 py-3 animate-in fade-in duration-150">
              <CheckCircle className="w-4 h-4 shrink-0 text-[#10B981]" />
              <span>{successMessage}</span>
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-600/25 transition mt-2 active:scale-[0.99]"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Authenticating…' : 'Sign In to Portal'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Need an account?</span>
          <button 
            onClick={() => navigate('/register')} 
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
          >
            Create Profile &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
