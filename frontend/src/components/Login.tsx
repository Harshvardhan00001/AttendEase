import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, LogIn, Shield } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  
  // Form States
  const [studentData, setStudentData] = useState({ name: '', rollNumber: '' });
  const [teacherData, setTeacherData] = useState({ name: '', subject: '' });
    const [ErrorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // if (role === 'student') {
    //   console.log('Student Login Data:', studentData);
    // } else {
    //   console.log('Teacher Login Data:', teacherData);
    // }
    // // Redirect to a dashboard route on success
    // navigate('/');
    try {
      // 1. Fire a network POST request to your backend server port
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Inform backend we are sending JSON string data
        },
        body: JSON.stringify(studentData), // Convert TSX state object to string
      });

      // 2. Parse the answer text back into a usable object
      const data = await response.json();

      if (response.ok && data.success) {
        setErrorMessage('Login Approved! Token:');
        
        // 3. Navigate the user to the main app dashboard route
        navigate('/'); 
      } else {
        // Handle custom error message sent back from backend
        setErrorMessage(data.message || 'Invalid Credentials');
      }
    } catch (error) {
      setErrorMessage('Cannot connect to server. Check your network.');
    }
  };
  


  

  return (


    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex bg-indigo-600 p-2.5 rounded-2xl text-white mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Welcome Back</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sign in to your AttendEase portal</p>
        </div>

        {/* Role Segmented Picker */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setRole('student')}
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
            onClick={() => setRole('teacher')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition ${
              role === 'teacher'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Teacher
          </button>
        </div>

        {/* Interactive Dynamic Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {role === 'student' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Student Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={studentData.name}
                  onChange={(e) => setStudentData({ ...studentData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Roll Number</label>
                <input
                  type="text"
                  required
                  placeholder="STU-2026-08"
                  value={studentData.rollNumber}
                  onChange={(e) => setStudentData({ ...studentData, rollNumber: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white text-sm"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Teacher Name</label>
                <input
                  type="text"
                  required
                  placeholder="Prof. Smith"
                  value={teacherData.name}
                  onChange={(e) => setTeacherData({ ...teacherData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Primary Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Computer Science"
                  value={teacherData.subject}
                  onChange={(e) => setTeacherData({ ...teacherData, subject: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white text-sm"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            onClick={()=>handleLogin}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition mt-6"
          >
            <LogIn className="w-4 h-4" /> Log In
          </button>
        </form>

        {/* Footer Toggle Link */}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          New to the portal?{' '}
          <button onClick={() => navigate('/register')} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
            Create Profile
          </button>
        </p>
      </div>
    </div>
  );
};