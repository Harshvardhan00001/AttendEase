
import { Shield, Wifi, Sparkles, Camera, Fingerprint, LogIn, UserPlus } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

import { useNavigate } from 'react-router-dom';


export const Home= () => {
  const Navigate=useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      
      {/* Navigation Header */}
      <header className="border-b border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-600/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Attend<span className="text-indigo-600 dark:text-indigo-400">Ease</span>
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-wide uppercase">Smart Campus Verification</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Campus Wi-Fi Connected
            </div>
            
            {/* Theme Picker Dropdown Selection Component */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Core Panel */}
      <main className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" /> Next-Gen Biometric Matrix Locked
        </div>

        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-4 max-w-2xl mx-auto leading-tight">
          Your attendance marked instantly with <span className="text-indigo-600 dark:text-indigo-400">Face Recognition</span>
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-base mb-10 leading-relaxed">
          No proxies. AttendEase checks your campus location perimeter and securely verifies your facial ID profile in seconds.
        </p>
        
        {/* Working Navigation Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
          <button 
            onClick={() => Navigate('/login')}
            className="w-full sm:w-1/2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-indigo-600/20 transition transform hover:-translate-y-0.5 active:scale-[0.99]"
          >
            <LogIn className="w-4 h-4" />
            Sign In Account
          </button>
          
          <button 
            onClick={() => Navigate('/register')}
            className="w-full sm:w-1/2 flex items-center justify-center gap-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold py-4 px-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm transition transform hover:-translate-y-0.5 active:scale-[0.99]"
          >
            <UserPlus className="w-4 h-4" />
            Create Profile 
          </button>
        </div>

        {/* Feature Grid Infographics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left border-t border-slate-200 dark:border-slate-800 pt-12">
          <div className="flex gap-4 p-2">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 h-11 w-11 shrink-0 flex items-center justify-center">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">1. Sync Network</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Locks tracking to authorized campus network coordinates.</p>
            </div>
          </div>

          <div className="flex gap-4 p-2">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 h-11 w-11 shrink-0 flex items-center justify-center">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">2. Secure Session</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Active authentication system drops multi-device entry leaks instantly.</p>
            </div>
          </div>

          <div className="flex gap-4 p-2">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 h-11 w-11 shrink-0 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">3. Biometric Scan</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Parses face layout profiles securely to map localized float markers.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};