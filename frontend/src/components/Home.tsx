import { Wifi, Camera, Fingerprint, LogIn, UserPlus, KeyRound, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from './Logo';

export const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-transparent text-slate-900 font-sans">
      
      {/* Navigation Header */}
      <header className="border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-50 px-6 sm:px-8 py-3.5">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size="lg" showText versionBadge="v2.0" />
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono text-[11px]">Campus Subnet Verified</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative max-w-5xl mx-auto px-6 py-16 sm:py-20 text-center">
        <div className="relative z-10">
          {/* Security Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-50/90 backdrop-blur-sm text-indigo-700 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6 border border-indigo-200/80 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
            <span>Biometric Liveness Matrix Locked &bull; Zero Proxy Protocol</span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 mb-6 max-w-3xl mx-auto leading-[1.12]">
            Precision attendance with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600">cryptographic trust</span>
          </h2>
          
          <p className="text-slate-600 max-w-xl mx-auto text-base sm:text-lg mb-10 leading-relaxed font-normal">
            Tamper-proof check-ins engineered for high-security campus perimeters. Combines localized IP subnet validation with real-time facial biometric descriptors.
          </p>
          
          {/* Working Navigation Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3.5 max-w-xl mx-auto mb-16">
            <button 
              onClick={() => navigate('/login')}
              className="w-full sm:w-1/3 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-600/25 transition transform hover:-translate-y-0.5 active:scale-[0.99]"
            >
              <LogIn className="w-4 h-4" />
              Log In
            </button>
            
            <button 
              onClick={() => navigate('/register')}
              className="w-full sm:w-1/3 flex items-center justify-center gap-2 bg-white/95 hover:bg-white text-slate-800 font-bold py-3.5 px-6 rounded-2xl border border-slate-200 shadow-sm transition transform hover:-translate-y-0.5 active:scale-[0.99]"
            >
              <UserPlus className="w-4 h-4" />
              Create Profile
            </button>

            <button 
              onClick={() => navigate('/demo')}
              className="w-full sm:w-1/3 flex items-center justify-center gap-2 bg-amber-50/90 hover:bg-amber-100/90 text-amber-700 font-bold py-3.5 px-6 rounded-2xl border border-amber-300/80 transition transform hover:-translate-y-0.5 active:scale-[0.99]"
            >
              <KeyRound className="w-4 h-4 text-amber-500" />
              Try Demo
            </button>
          </div>

          {/* Feature Grid Infographics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left border-t border-slate-200/80 pt-12">
            <div className="flex gap-4 p-4 rounded-2xl bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm hover:border-cyan-500/40 transition-colors">
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-cyan-600 h-11 w-11 shrink-0 flex items-center justify-center">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-1.5">
                  <span>1. Subnet Verification</span>
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pins sessions strictly to authorized campus IP boundaries. Proxy proxies and off-site spoofing are rejected automatically.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-2xl bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm hover:border-indigo-500/40 transition-colors">
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-indigo-600 h-11 w-11 shrink-0 flex items-center justify-center">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">2. Biometric Vector Map</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Generates a client-side 128-float facial descriptor. Never sends raw unencrypted imagery over the wire.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-2xl bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm hover:border-emerald-500/40 transition-colors">
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-emerald-600 h-11 w-11 shrink-0 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">3. Liveness Check</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Real-time active comparison prevents static photo presentation attacks with millisecond verification speed.
                </p>
              </div>
            </div>
          </div>

          {/* Security Trust Micro-Bar */}
          <div className="mt-12 py-3 px-4 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 shadow-sm">
            <div className="flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>256-bit Token Rotation</span>
            </div>
            <span className="text-slate-300">&bull;</span>
            <div className="flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />
              <span>Anti-Proxy Subnet Pinning</span>
            </div>
            <span className="text-slate-300">&bull;</span>
            <div className="flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Client-Side Liveness Analysis</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
