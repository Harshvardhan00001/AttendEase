import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  LayoutDashboard,
  User,
  Sun,
  Moon,
  Monitor,
  Clock,
  LogOut,
  Users,
  Plus,
  X,
  GraduationCap,
  BookOpen,
  Bell,
  CheckCircle2
} from 'lucide-react';
import MyClass from './pages/Myclass';
import StudentsDirectory from './pages/StudentsDirectory';

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
type Theme = 'light' | 'dark' | 'system';

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
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'system');
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
        setLoadError('Could not load dashboard. Please log in again.');
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
      // Join room for each workplace to receive mark attendance broadcasts
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

      setAlerts((prev) => [newAlert, ...prev].slice(0, 10)); // keep last 10
      fetchDashboard(); // Refresh counts and directory biometrics
    });

    // Connected successfully

    return () => {
      newSocket.disconnect();
    };
  }, [data?.workplaces?.length]);

  // Logout handler
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiFetch('/auth/teacher/logout', { method: 'POST' });
    } catch (_) { /* ignore */ }
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  // Theme Syncing Effect
  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (currentTheme: Theme) => {
      root.classList.remove('light', 'dark');
      if (currentTheme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(currentTheme);
      }
    };
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 gap-4">
        <p className="text-red-500 font-medium">{loadError}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Retry</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-[#090a0f] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">

      {/* --- SIDEBAR PANEL --- */}
      <aside className="w-20 md:w-64 flex flex-col justify-between py-8 px-4 bg-white dark:bg-[#0f111a] border-r border-gray-200 dark:border-zinc-800 transition-all duration-300">
        <div className="flex flex-col gap-8 w-full items-center md:items-stretch">

          {/* Top Profile Frame */}
          <div className="flex flex-col items-center text-center px-2 pb-4 border-b border-gray-100 dark:border-zinc-900 w-full">
            <div className="relative mb-3 group">
              <div className="w-14 h-14 md:w-24 md:h-24 rounded-full p-1 bg-gradient-to-tr from-blue-600 to-indigo-600 transition-transform duration-300 group-hover:scale-105 flex items-center justify-center overflow-hidden shadow-md">
                {data.user.avatarUrl ? (
                  <img src={data.user.avatarUrl} alt={data.user.name} className="w-full h-full object-cover rounded-full border-2 border-white dark:border-[#0f111a]" />
                ) : (
                  <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold font-mono">
                    {data.user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="absolute bottom-0.5 right-0.5 md:bottom-1 md:right-2 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#0f111a] rounded-full"></span>
            </div>
            <div className="hidden md:block min-w-0 w-full">
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 tracking-wide truncate">{data.user.name}</h2>
              <p className="text-xs text-gray-400 font-medium truncate mt-0.5">{data.user.username}</p>
            </div>
          </div>

          {/* Navigation Control List */}
          <nav className="flex flex-col gap-1.5 w-full">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
              { id: 'classes', icon: GraduationCap, label: 'My Classes' },
              { id: 'students', icon: User, label: 'Students Directory' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3.5 w-full p-3 rounded-xl font-medium text-sm transition-all relative group ${activeTab === item.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-900/40'
                  }`}
              >
                <item.icon size={20} className="shrink-0 mx-auto md:mx-0" />
                <span className="hidden md:block">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom Logout Area */}
        <div className="w-full">
          <button
            id="teacher-logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3.5 w-full p-3 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl hover:bg-red-50/50 dark:hover:bg-red-950/10 transition-all font-medium text-sm disabled:opacity-50"
          >
            <LogOut size={20} className="shrink-0 mx-auto md:mx-0" />
            <span className="hidden md:block">{loggingOut ? 'Logging out…' : 'Logout Account'}</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">

        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Portal</span>
            <span>&raquo;</span>
            <span className="text-blue-500 font-medium capitalize">{activeTab} Workspace</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Controls */}
            <div className="flex items-center bg-gray-200 dark:bg-zinc-800 p-1 rounded-lg">
              {(['light', 'dark', 'system'] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`p-1.5 rounded-md transition-all ${theme === t ? 'bg-white dark:bg-zinc-700 text-blue-500 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                >
                  {t === 'light' && <Sun size={15} />}
                  {t === 'dark' && <Moon size={15} />}
                  {t === 'system' && <Monitor size={15} />}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ── TAB CONTENT ── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

              {/* Time Counter Status & Create Class Feature Panel */}
              <div className="bg-white dark:bg-[#0f111a] border border-gray-200 dark:border-zinc-800/80 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Clock size={16} />
                    <span className="text-xs uppercase tracking-wider font-semibold">Session Tracker</span>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight mb-1 font-mono">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium">{currentTime.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </p>
                </div>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-2 group active:scale-[0.98]"
                >
                  <Plus size={16} className="transition-transform group-hover:rotate-90" />
                  Create Class
                </button>
              </div>

              {/* Academic Metrics Grid Row Panel */}
              <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                <div className="bg-white dark:bg-[#0f111a] border border-gray-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-3xl font-bold tracking-tight">{data.stats.totalStudents}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Total Students</p>
                    </div>
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-500 rounded-xl"><Users size={20} /></div>
                  </div>
                  <div className="text-xs mt-4 text-blue-500">Roster synchronized</div>
                </div>

                <div className="bg-white dark:bg-[#0f111a] border border-gray-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-3xl font-bold tracking-tight">{data.stats.activeClasses}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Active Classrooms</p>
                    </div>
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-xl"><GraduationCap size={20} /></div>
                  </div>
                  <div className="text-xs mt-4 text-indigo-500">Total classrooms setup</div>
                </div>

                <div className="bg-white dark:bg-[#0f111a] border border-gray-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-3xl font-bold tracking-tight">{data.stats.activeClassesCount}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Live Portals</p>
                    </div>
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-xl"><Bell size={20} /></div>
                  </div>
                  <div className="text-xs mt-4 text-emerald-500">{data.stats.activeClassesCount} classrooms live</div>
                </div>

                <div className="bg-white dark:bg-[#0f111a] border border-gray-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-3xl font-bold tracking-tight">{data.stats.pendingAssignments}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Pending Approvals</p>
                    </div>
                    <div className="p-2 bg-yellow-50 dark:bg-yellow-950/40 text-yellow-500 rounded-xl"><BookOpen size={20} /></div>
                  </div>
                  <div className="text-xs mt-4 text-yellow-600 font-semibold">Requires teacher review</div>
                </div>

              </div>
            </div>

            {/* ── REAL-TIME ATTENDANCE FEED ── */}
            <div className="bg-white dark:bg-[#0f111a] border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-5">
                <Bell size={20} className="text-blue-500 animate-bounce" />
                Live Attendance marking Feed
              </h3>
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-zinc-500 text-sm">
                  Waiting for student check-ins. Toggled classrooms will receive events in real-time.
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800/50 rounded-2xl transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-full shrink-0">
                          <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                            Student <strong className="text-blue-600 dark:text-blue-400 font-bold">{alert.studentName}</strong> successfully checked-in.
                          </p>
                          <span className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                            Classroom: <strong>{alert.workplaceName}</strong> • {alert.timestamp}
                          </span>
                        </div>
                      </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-all">
          <div className="bg-white dark:bg-[#0f111a] w-full max-w-md rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 text-gray-900 dark:text-gray-100">

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-900 mb-5">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <GraduationCap className="text-blue-500" size={22} />
                Setup New Classroom
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Input Submission Fields */}
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-gray-400 mb-1.5">Class/Section Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., CS-3A, Grade 10-B"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-gray-400 mb-1.5">Subject Track</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Advanced Web Architecture"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                />
              </div>

              {/* Action Operations Tray */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-900 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClass}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/10 transition-colors disabled:opacity-50"
                >
                  {isSubmittingClass ? 'Launching…' : 'Launch Class'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}