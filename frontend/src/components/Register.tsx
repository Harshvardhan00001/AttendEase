import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, UserPlus, Shield, AlertCircle, CheckCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<'student' | 'teacher'>('student');

  // ── Student registration (backend: username + password + email)
  const [studentData, setStudentData] = useState({ username: '', password: '', email: '' });

  // ── Teacher registration (backend: name + email + password + department)
  const [teacherData, setTeacherData] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      // Pick endpoint and payload based on role
      const url =
        role === 'student'
          ? `${API_URL}/auth/register`
          : `${API_URL}/auth/teacher/register`;

      const payload =
        role === 'student'
          ? studentData
          : teacherData;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type');
      const data = contentType?.includes('application/json') ? await response.json() : null;

      if (response.ok && (!data || data.success)) {
        setSuccessMessage('Account created! Redirecting to login…');
        setTimeout(() => navigate('/login'), 1000);
      } else {
        setErrorMessage(data?.message || `Registration failed (${response.status}).`);
      }
    } catch {
      setErrorMessage('Cannot connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white text-sm transition';

  const labelClass =
    'block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex bg-indigo-600 p-2.5 rounded-2xl text-white mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Create Profile</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Register your AttendEase account</p>
        </div>

        {/* Role Segmented Picker */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => { setRole('student'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition ${
              role === 'student'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4" /> Student
          </button>
          <button
            type="button"
            onClick={() => { setRole('teacher'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition ${
              role === 'teacher'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Teacher
          </button>
        </div>

        {/* Dynamic Registration Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          {role === 'student' ? (
            <>
              <div>
                <label className={labelClass}>Username</label>
                <input
                  id="student-username"
                  type="text"
                  required
                  placeholder="john_doe"
                  value={studentData.username}
                  onChange={(e) => setStudentData({ ...studentData, username: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Password</label>
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
              <div>
                <label className={labelClass}>Campus Email</label>
                <input
                  id="student-email"
                  type="email"
                  required
                  placeholder="john.doe@campus.edu"
                  value={studentData.email}
                  onChange={(e) => setStudentData({ ...studentData, email: e.target.value })}
                  className={inputClass}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelClass}>Full Name</label>
                <input
                  id="teacher-name"
                  type="text"
                  required
                  placeholder="Prof. Smith"
                  value={teacherData.name}
                  onChange={(e) => setTeacherData({ ...teacherData, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Faculty Email</label>
                <input
                  id="teacher-email"
                  type="email"
                  required
                  placeholder="smith@faculty.edu"
                  value={teacherData.email}
                  onChange={(e) => setTeacherData({ ...teacherData, email: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Password</label>
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
              <div>
                <label className={labelClass}>Department</label>
                <input
                  id="teacher-department"
                  type="text"
                  required
                  placeholder="Computer Science"
                  value={teacherData.department}
                  onChange={(e) => setTeacherData({ ...teacherData, department: e.target.value })}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* Feedback messages */}
          {errorMessage && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <button
            id="register-submit"
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition mt-2"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? 'Creating account…' : 'Create Profile'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};