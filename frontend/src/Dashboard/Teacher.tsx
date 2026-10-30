import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  LayoutDashboard,
  User,
  Clock,
  LogOut,
  Users,
  Plus,
  X,
  GraduationCap,
  BookOpen,
  Bell,
  CheckCircle2,
  Radio
} from 'lucide-react';
import MyClass from './pages/Myclass';
import StudentsDirectory from './pages/StudentsDirectory';
import { Logo } from '../components/Logo';

// ---------- API helpers ----------
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const SOCKET_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('token') || '';
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// --- Interfaces ---
interface UserProfile {
  name: string;
  username: string;
  avatarUrl: string;
  department: string;
}

interface DashboardStats {
  totalStudents: number;
  activeClasses: number;
  activeClassesCount: number;
  attendanceRate: number;
  attendanceChange: number;
  pendingAssignments: number;
}

interface Classroom {
  id: string;
  name: string;
  subjectDetails: string;
  joinCode: string;
  pinnedIP: string;
  isLive: boolean;
  studentCount: number;
}

interface PendingStudent {
  membershipId: string;
  workplaceId: string;
  workplaceName: string;
  studentId: string;
  name: string;
  email: string;
  avatarUrl: string;
}

interface ApprovedStudent {
  membershipId: string;
  workplaceId: string;
  workplaceName: string;
  studentId: string;
  name: string;
  email: string;
  avatarUrl: string;
  hasBiometrics: boolean;
}

interface DashboardData {
  user: UserProfile;
  stats: DashboardStats;
  workplaces: Classroom[];
  pendingStudents: PendingStudent[];
  approvedStudents: ApprovedStudent[];
}

interface AttendanceAlert {
  id: string;
  studentName: string;
  workplaceName: string;
  networkVerified: boolean;
  timestamp: string;
}

export default function Teacher() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loggingOut, setLoggingOut] = useState(false);

  // --- Live Attendance Log Alerts State ---
  const [alerts, setAlerts] = useState<AttendanceAlert[]>([]);

  // --- Create Class Modal State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [isSubmittingClass, setIsSubmittingClass] = useState(false);

  // Real-time Clock Effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Dashboard Data function
  const fetchDashboard = () => {
    apiFetch<{
      success: boolean;
      user: UserProfile;
      stats: DashboardStats;
      workplaces: Classroom[];
      pendingStudents: PendingStudent[];
      approvedStudents: ApprovedStudent[];
    }>('/auth/teacher/dashboard/teacher')
      .then((res) => {
        setData({
          user: res.user,
          stats: res.stats,
          workplaces: res.workplaces,
          pendingStudents: res.pendingStudents,
          approvedStudents: res.approvedStudents,
        });
      })
      .catch((err) => {
        console.error(err);
        setLoadError('Could not load faculty dashboard. Please sign in again.');
      });
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Socket.io Connection & Listening Effect
  useEffect(() => {
    if (!data || !data.workplaces || data.workplaces.length === 0) return;

    const token = getToken();
    const newSocket = io(SOCKET_BASE, {
      transports: ['websocket', 'polling'],
      auth: { token },
    });

    newSocket.on('connect', () => {
      data.workplaces.forEach((w) => {
        newSocket.emit('join', { workplaceId: w.id, role: 'teacher' });
      });
    });

    newSocket.on('attendance:marked', (payload: { studentId: string; username?: string; timestamp: string; networkVerified: boolean; workplaceId?: string }) => {
      const workplaceName = data.workplaces.find(w => w.id === payload.workplaceId)?.name || 'Classroom';
      const newAlert: AttendanceAlert = {
        id: Math.random().toString(),
        studentName: payload.username || 'Student',
        workplaceName,
        networkVerified: payload.networkVerified,
        timestamp: new Date(payload.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setAlerts((prev) => [newAlert, ...prev].slice(0, 10));
      fetchDashboard();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [data?.workplaces?.length]);

  // Logout handler
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiFetch('/auth/teacher/logout', { method: 'POST' });
    } catch { /* ignore */ }
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  // --- API Handlers ---
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingClass(true);
    try {
      await apiFetch('/workplace/create', {
        method: 'POST',
        body: JSON.stringify({
          name: className,
          subjectDetails: subject,
        }),
      });
      setClassName('');
      setSubject('');
      setIsModalOpen(false);
      fetchDashboard();
    } catch (err: any) {
      alert(`Error creating classroom: ${err.message || 'Please try again.'}`);
    } finally {
      setIsSubmittingClass(false);
    }
  };

  const handleToggleLive = async (workplaceId: string, isLive: boolean) => {
    try {
      await apiFetch('/workplace/toggle-live', {
        method: 'POST',
        body: JSON.stringify({ workplaceId, isLive }),
      });
      fetchDashboard();
    } catch (err: any) {
      alert(`Error toggling attendance portal: ${err.message}`);
    }
  };

  const handleApproveStudent = async (studentId: string, workplaceId: string) => {
    try {
      await apiFetch('/workplace/approve', {
        method: 'POST',
        body: JSON.stringify({ studentId, workplaceId }),
      });
      fetchDashboard();
    } catch (err: any) {
      alert(`Error approving student: ${err.message}`);
    }
  };

  const handleDeleteWorkplace = async (workplaceId: string) => {
    try {
      await apiFetch(`/workplace/${workplaceId}`, { method: 'DELETE' });
      fetchDashboard();
    } catch (err: any) {
      alert(`Error deleting classroom: ${err.message}`);
    }
  };

  if (!data && loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#090D16] gap-4 p-4 text-center">
        <p className="text-rose-600 dark:text-rose-400 font-semibold">{loadError}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-transparent text-slate-900 font-sans">

      {/* --- SIDEBAR PANEL (Linear / Stripe SaaS Style) --- */}
      <aside className="w-20 md:w-64 flex flex-col justify-between py-6 px-3.5 bg-white/95 backdrop-blur-md border-r border-slate-200 transition-all duration-300 shrink-0">
        <div className="flex flex-col gap-6 w-full items-center md:items-stretch">

          {/* Top Brand Logo */}
          <div className="flex items-center justify-center md:justify-start px-2">
            <Logo size="sm" showText className="hidden md:inline-flex" />
            <Logo size="sm" className="inline-flex md:hidden" />
          </div>

          {/* Top Profile Frame */}
          <div className="flex flex-col items-center text-center px-2 pb-5 border-b border-slate-100 dark:border-slate-800/80 w-full">
            <div className="relative mb-3 group">
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl p-0.5 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 transition-transform duration-300 group-hover:scale-105 flex items-center justify-center overflow-hidden shadow-md">
                {data.user.avatarUrl ? (
                  <img src={data.user.avatarUrl} alt={data.user.name} className="w-full h-full object-cover rounded-[14px] border-2 border-white dark:border-[#111827]" />
                ) : (
                  <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-white text-lg font-bold font-mono">
                    {data.user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#111827] rounded-full shadow-sm"></span>
            </div>
            <div className="hidden md:block min-w-0 w-full">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">{data.user.name}</h2>
              <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">{data.user.department || data.user.username}</p>
            </div>
          </div>

          {/* Navigation Control List */}
          <nav className="flex flex-col gap-1.5 w-full">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Analytics Overview' },
              { id: 'classes', icon: GraduationCap, label: 'Classrooms Roster' },
              { id: 'students', icon: User, label: 'Directory & Approvals' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 w-full p-3 rounded-xl font-semibold text-xs transition-all relative ${activeTab === item.id
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
              >
                <item.icon size={18} className="shrink-0 mx-auto md:mx-0" />
                <span className="hidden md:block">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom Logout Area */}
        <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <button
            id="teacher-logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 w-full p-2.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all font-semibold text-xs disabled:opacity-50"
          >
            <LogOut size={16} className="shrink-0 mx-auto md:mx-0" />
            <span className="hidden md:block">{loggingOut ? 'Signing out…' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">

        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>FACULTY GATEWAY</span>
            <span>/</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold uppercase">{activeTab}</span>
          </div>
        </header>

        {/* ── TAB CONTENT ── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

              {/* Time Counter Status & Create Class Feature Panel */}
              <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none" />
                <div>
                  <div className="flex items-center gap-2 text-slate-400 mb-2 font-mono">
                    <Clock size={14} className="text-cyan-500" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold">Active Session Clock</span>
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight mb-1 font-mono text-slate-900 dark:text-white">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </h2>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
                    {currentTime.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 group active:scale-[0.98]"
                >
                  <Plus size={16} className="transition-transform group-hover:rotate-90" />
                  Setup New Classroom
                </button>
              </div>

              {/* Academic Metrics Grid Row Panel */}
              <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">{data.stats.totalStudents}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Enrolled Students</p>
                    </div>
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/50 dark:border-indigo-900/50">
                      <Users size={18} />
                    </div>
                  </div>
                  <div className="text-[11px] mt-4 text-indigo-600 dark:text-indigo-400 font-mono">Synced directory</div>
                </div>

                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">{data.stats.activeClasses}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Total Classrooms</p>
                    </div>
                    <div className="p-2.5 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 rounded-xl border border-cyan-200/50 dark:border-cyan-900/50">
                      <GraduationCap size={18} />
                    </div>
                  </div>
                  <div className="text-[11px] mt-4 text-cyan-600 dark:text-cyan-400 font-mono">All course sections</div>
                </div>

                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">{data.stats.activeClassesCount}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Live Portals</p>
                    </div>
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200/50 dark:border-emerald-900/50">
                      <Radio size={18} className="animate-pulse" />
                    </div>
                  </div>
                  <div className="text-[11px] mt-4 text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                    {data.stats.activeClassesCount} receiving check-ins
                  </div>
                </div>

                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">{data.stats.pendingAssignments}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Pending Approvals</p>
                    </div>
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-200/50 dark:border-amber-900/50">
                      <BookOpen size={18} />
                    </div>
                  </div>
                  <div className="text-[11px] mt-4 text-amber-600 dark:text-amber-400 font-mono font-semibold">Action required</div>
                </div>

              </div>
            </div>

            {/* ── REAL-TIME ATTENDANCE FEED ── */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Bell size={18} className="text-indigo-600 dark:text-indigo-400" />
                  Live Cryptographic Attendance Feed
                </h3>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> WebSocket Synchronized
                </span>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-mono">
                  Listening for biometric verify events across open classrooms…
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50/60 dark:bg-[#090D16]/60 border border-slate-200 dark:border-slate-800 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg shrink-0 border border-emerald-500/20">
                          <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                            Student <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{alert.studentName}</strong> verified attendance.
                          </p>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 block">
                            Section: <strong>{alert.workplaceName}</strong> &bull; {alert.timestamp}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                        Subnet Matched
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'classes' && (
          <MyClass
            workplaces={data.workplaces}
            onCreateClick={() => setIsModalOpen(true)}
            onToggleLive={handleToggleLive}
            onDeleteWorkplace={handleDeleteWorkplace}
          />
        )}

        {activeTab === 'students' && (
          <StudentsDirectory
            pendingStudents={data.pendingStudents}
            approvedStudents={data.approvedStudents}
            onApprove={handleApproveStudent}
          />
        )}

      </main>

      {/* --- INLINE MODAL: CREATE CLASS --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 transition-all">
          <div className="bg-white dark:bg-[#111827] w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-gray-100">

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <h3 className="text-base font-bold flex items-center gap-2">
                <GraduationCap className="text-indigo-600 dark:text-indigo-400" size={20} />
                Configure New Classroom
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Input Submission Fields */}
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1.5">Class / Section Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS-401 (Section B)"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090D16] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs transition-all text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1.5">Subject & Track</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Cryptographic Systems"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090D16] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs transition-all text-slate-900 dark:text-white"
                />
              </div>

              {/* Action Operations Tray */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClass}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50"
                >
                  {isSubmittingClass ? 'Initializing…' : 'Deploy Classroom'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
