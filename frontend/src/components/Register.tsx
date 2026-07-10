import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, UserPlus, Shield } from 'lucide-react';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  
  // Registration Form States
  const [studentData, setStudentData] = useState({ name: '', password: '', email: '' });
  const [teacherData, setTeacherData] = useState({ name: '', subject: '', email: '' });

  const handleRegister = async(e: React.FormEvent) => {
    e.preventDefault();

   try {
  const response = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: {
      "Content-Type": 'application/json',
    },
    body: JSON.stringify(studentData),
  });

  // 1. Check if the server actually sent back data BEFORE trying to parse it
  let data = null;
  const contentType = response.headers.get("content-type");
  
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  }

  // 2. Validate success state safely
  if (response.ok) {
    // If your backend relies on a custom data.success flag, verify it here:
    if (!data || data.success) {
      navigate("/"); // Route transition to root dashboard
    } else {
      console.warn("Backend validation failed:", data?.message);
    }
  } else {
    console.warn(`Server responded with error status: ${response.status}`);
  }

} catch (error) {
  // 3. CRITICAL: Pass the actual error variable here so you can read it in the browser inspect tool!
  console.error("Network or parsing execution error:", error);
}


    // if (role === 'student') {
    //   console.log('Registering Student:', studentData);
    // } else {
    //   console.log('Registering Teacher:', teacherData);
    // }
    // // Redirect to login page upon registration
    // navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex bg-indigo-600 p-2.5 rounded-2xl text-white mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Create Profile</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Register your biometric workspace details</p>
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

        {/* Dynamic Registration Form */}
        <form onSubmit={handleRegister} className="space-y-4">
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
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Password</label>
                <input
                  type="text"
                  required
                  placeholder="1234abc"
                  value={studentData.password}
                  onChange={(e) => setStudentData({ ...studentData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Campus Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="john.doe@campus.edu"
                  value={studentData.email}
                  onChange={(e) => setStudentData({ ...studentData, email: e.target.value })}
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
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Faculty Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="smith@faculty.edu"
                  value={teacherData.email}
                  onChange={(e) => setTeacherData({ ...teacherData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white text-sm"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition mt-6"
          >
            <UserPlus className="w-4 h-4" /> Create Profile
          </button>
        </form>

        {/* Footer Toggle Link */}
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