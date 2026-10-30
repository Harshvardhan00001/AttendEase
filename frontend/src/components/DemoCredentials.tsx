import { useState } from 'react';
import { Copy, ArrowLeft, Check, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from './Logo';

function DemoCredentials() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const navigate = useNavigate(); 

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent px-4 py-8">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/60 p-8 sm:p-10 relative overflow-hidden">
        
        {/* Subtle accent top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-indigo-500 to-cyan-500" />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Sandbox Accounts</h2>
              <p className="text-[10px] font-mono uppercase text-slate-400">Pre-Configured Environments</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
            Live Sandbox
          </span>
        </div>

        <div className="space-y-6">
          {/* Faculty Box */}
          <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-[#090D16]/60 border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                1. Faculty Admin Account
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Role: teacher</span>
            </div>
            
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Email Address</label>
                <div className="flex items-center justify-between bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 mt-1">
                  <span className="font-mono text-xs text-slate-800 dark:text-slate-200">{credentials.teacher.email}</span>
                  <button 
                    onClick={() => copyToClipboard(credentials.teacher.email, 't-email')}
                    className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors"
                    title="Copy Email"
                  >
                    {copiedKey === 't-email' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Passcode</label>
                <div className="flex items-center justify-between bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 mt-1">
                  <span className="font-mono text-xs text-slate-800 dark:text-slate-200">{credentials.teacher.password}</span>
                  <button 
                    onClick={() => copyToClipboard(credentials.teacher.password, 't-pass')}
                    className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors"
                    title="Copy Password"
                  >
                    {copiedKey === 't-pass' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Student Box */}
          <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-[#090D16]/60 border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                2. Student Profile Account
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Role: student</span>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Username</label>
                <div className="flex items-center justify-between bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 mt-1">
                  <span className="font-mono text-xs text-slate-800 dark:text-slate-200">{credentials.student.email}</span>
                  <button 
                    onClick={() => copyToClipboard(credentials.student.email, 's-email')}
                    className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors"
                    title="Copy Username"
                  >
                    {copiedKey === 's-email' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Passcode</label>
                <div className="flex items-center justify-between bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 mt-1">
                  <span className="font-mono text-xs text-slate-800 dark:text-slate-200">{credentials.student.password}</span>
                  <button 
                    onClick={() => copyToClipboard(credentials.student.password, 's-pass')}
                    className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors"
                    title="Copy Password"
                  >
                    {copiedKey === 's-pass' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>Biometric descriptors and campus network verification are simulated in real-time.</span>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="w-full mt-6 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-600/25 transition active:scale-[0.99]"
        >
          <ArrowLeft className="w-4 h-4" />
          Proceed to Login
        </button>
      </div>
    </div>
  );
}

export default DemoCredentials;
