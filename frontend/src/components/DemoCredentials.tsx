import { KeyRound, Copy, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


function DemoCredentials() {
  const credentials = {
    teacher: {
      email: 'sir@test.com',
      password: '12',
    },
    student: {
      email: 'user1',
      password: '12',
    },
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  const navigate = useNavigate(); 
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <KeyRound className="w-5 h-5 text-amber-500" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Demo Credentials</h2>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Teacher</h3>
            <div className="space-y-2">
              <div>
                <label className="text-sm text-slate-500 dark:text-slate-400">Email</label>
                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 mt-1">
                  <span className="font-mono text-slate-800 dark:text-slate-200">{credentials.teacher.email}</span>
                  <button onClick={() => copyToClipboard(credentials.teacher.email)}>
                    <Copy className="w-4 h-4 text-slate-500 hover:text-indigo-600" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-500 dark:text-slate-400">Password</label>
                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 mt-1">
                  <span className="font-mono text-slate-800 dark:text-slate-200">{credentials.teacher.password}</span>
                  <button onClick={() => copyToClipboard(credentials.teacher.password)}>
                    <Copy className="w-4 h-4 text-slate-500 hover:text-indigo-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Student</h3>
            <div className="space-y-2">
              <div>
                <label className="text-sm text-slate-500 dark:text-slate-400">Email</label>
                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 mt-1">
                  <span className="font-mono text-slate-800 dark:text-slate-200">{credentials.student.email}</span>
                  <button onClick={() => copyToClipboard(credentials.student.email)}>
                    <Copy className="w-4 h-4 text-slate-500 hover:text-indigo-600" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-500 dark:text-slate-400">Password</label>
                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 mt-1">
                  <span className="font-mono text-slate-800 dark:text-slate-200">{credentials.student.password}</span>
                  <button onClick={() => copyToClipboard(credentials.student.password)}>
                    <Copy className="w-4 h-4 text-slate-500 hover:text-indigo-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="w-full mt-8 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>
      </div>
    </div>
  );
}

export default DemoCredentials;