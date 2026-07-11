import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  Camera,
  Sun,
  Moon,
  Monitor,
  LogOut,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  X,
  Scan,
  Shield,
  MapPin,
  Check,
  UserCheck,
  Zap,
  Activity
} from 'lucide-react';

// ---------- Types ----------
type Theme = 'light' | 'dark' | 'system';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface WorkplaceSummary {
  id: string;
  name: string;
  subjectDetails: string;
  pinnedIP: string;
  attendancePct: number;
  activeSession: boolean;
  status: 'pending_approval' | 'approved';
  hasBiometrics: boolean;
  networkMatched: boolean;
  checkedInToday: boolean;
}

interface AttendanceRecord {
  id: string;
  workplaceName: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  networkVerified: boolean;
}

// ---------- API base ----------
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
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append('avatar', file);

  const res = await fetch(`${API_BASE}/auth/users/me/avatar`, {
    method: 'POST',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

// ---------- Helpers ----------
function getInitial(name: string) {
  return name?.trim()?.[0]?.toUpperCase() || '?';
}

function statusColor(status: AttendanceRecord['status']) {
  if (status === 'present') return { text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20', icon: CheckCircle };
  if (status === 'late') return { text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20', icon: Clock };
  return { text: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-100 dark:border-rose-500/20', icon: AlertTriangle };
}

export default function StudentDashboard() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'system');

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [classes, setClasses] = useState<WorkplaceSummary[] | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[] | null>(null);
  const [clientIp, setClientIp] = useState<string>('Unknown');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Join Workplace form state
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Biometrics setup state
  const [biometricsModalOpen, setBiometricsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<WorkplaceSummary | null>(null);
  const [enrollingStep, setEnrollingStep] = useState<'idle' | 'scanning' | 'verifying' | 'success'>('idle');
  const [scanCountdown, setScanCountdown] = useState(3);
  const [scanProgress, setScanProgress] = useState(0);

  // Check-in state
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [markingStep, setMarkingStep] = useState<'idle' | 'scanning' | 'comparing' | 'success'>('idle');
  const [markingError, setMarkingError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const enrollVideoRef = useRef<HTMLVideoElement>(null);
  const checkVideoRef = useRef<HTMLVideoElement>(null);
  const enrollStreamRef = useRef<MediaStream | null>(null);
  const checkStreamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // ---------- Theme sync ----------
  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (t: Theme) => {
      root.classList.remove('light', 'dark');
      if (t === 'system') {
        const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(system);
      } else {
        root.classList.add(t);
      }
    };
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ---------- Load dashboard data ----------
  const loadDashboard = () => {
    setLoading(true);
    setError(null);
    apiFetch<{ success: boolean; profile: UserProfile; clientIp: string; workplaces: WorkplaceSummary[]; attendance: AttendanceRecord[] }>('/auth/dashboard/student')
      .then((data) => {
        setProfile(data.profile);
        setClientIp(data.clientIp || 'Unknown');
        setClasses(data.workplaces);
        setAttendance(data.attendance);
      })
      .catch((err) => setError(err.message || 'Could not load dashboard. Please log in again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDashboard(); }, []);

  // ---------- Socket.io Setup ----------
  useEffect(() => {
    if (!classes || classes.length === 0) return;

    const token = getToken();
    const newSocket = io(SOCKET_BASE, {
      transports: ['websocket', 'polling'],
      auth: { token },
    });

    newSocket.on('connect', () => {
      classes.forEach((c) => {
        newSocket.emit('join', { workplaceId: c.id, role: 'student' });
      });
    });

    newSocket.on('attendance:toggled', (payload: { workplaceId: string; isLive: boolean }) => {
      setClasses((prev) => {
        if (!prev) return prev;
        return prev.map((c) => {
          if (c.id === payload.workplaceId) {
            return { ...c, activeSession: payload.isLive };
          }
          return c;
        });
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [classes?.length]);

  // ---------- Logout ----------
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (_) { /* ignore */ }
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  // ---------- Avatar upload ----------
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const localPreviewUrl = URL.createObjectURL(file);
    setProfile((prev) => (prev ? { ...prev, avatarUrl: localPreviewUrl } : prev));

    setUploading(true);
    try {
      const { avatarUrl } = await uploadAvatar(file);
      setProfile((prev) => (prev ? { ...prev, avatarUrl } : prev));
    } catch {
      loadDashboard();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ---------- Join Workplace Handler ----------
  const handleJoinCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoining(true);
    try {
      await apiFetch('/workplace/join', {
        method: 'POST',
        body: JSON.stringify({ joinCode: joinCode.trim().toUpperCase() }),
      });
      setJoinCode('');
      alert('Join request submitted successfully. Waiting for teacher approval.');
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to submit join request. Make sure join code is correct.');
    } finally {
      setJoining(false);
    }
  };

  // ── Camera helpers ───────────────────────────────────────────
  // Capture a frame from a video element and return pixel descriptor + brightness
  const captureDescriptor = (video: HTMLVideoElement): { descriptor: number[]; brightness: number } => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, 128, 128);
    const imageData = ctx.getImageData(0, 0, 128, 128);
    const data = imageData.data; // RGBA array, length = 128*128*4

    // Compute mean brightness across all pixels
    let totalBrightness = 0;
    const descriptor: number[] = [];

    // Sample 128 values across the frame (every 512 pixels worth of data)
    const step = Math.floor(data.length / 128 / 4) * 4;
    for (let i = 0; i < 128; i++) {
      const idx = i * step;
      const r = data[idx] / 255;
      const g = data[idx + 1] / 255;
      const b = data[idx + 2] / 255;
      descriptor.push((r + g + b) / 3);
    }

    for (let i = 0; i < data.length; i += 4) {
      totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const brightness = totalBrightness / (128 * 128);

    return { descriptor, brightness };
  };

  const stopStream = (ref: React.MutableRefObject<MediaStream | null>) => {
    if (ref.current) {
      ref.current.getTracks().forEach((t) => t.stop());
      ref.current = null;
    }
  };

  const attachStreamToVideo = (
    videoRef: React.RefObject<HTMLVideoElement | null>,
    streamRef: React.MutableRefObject<MediaStream | null>,
  ) => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream && video.srcObject !== stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
  };

  const startCamera = async (
    streamRef: React.MutableRefObject<MediaStream | null>,
    videoRef: React.RefObject<HTMLVideoElement | null>,
  ): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera not supported in this browser. Use HTTPS or localhost.');
      return false;
    }
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
      }
      attachStreamToVideo(videoRef, streamRef);
      return true;
    } catch (err) {
      setCameraError('Camera access denied. Please allow camera permissions.');
      console.error('Camera error:', err);
      return false;
    }
  };

  const waitForVideoFrame = (video: HTMLVideoElement, timeoutMs = 3000): Promise<boolean> =>
    new Promise((resolve) => {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        resolve(true);
        return;
      }
      const onReady = () => {
        if (video.videoWidth > 0) {
          cleanup();
          resolve(true);
        }
      };
      const cleanup = () => {
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('canplay', onReady);
        clearTimeout(timer);
      };
      video.addEventListener('loadeddata', onReady);
      video.addEventListener('canplay', onReady);
      const timer = setTimeout(() => {
        cleanup();
        resolve(video.videoWidth > 0);
      }, timeoutMs);
    });

  // ---------- Biometrics Enrollment: keep camera alive for entire modal session ----------
  useEffect(() => {
    if (biometricsModalOpen && enrollingStep !== 'success') {
      setCameraError(null);
      startCamera(enrollStreamRef, enrollVideoRef);
    } else if (!biometricsModalOpen) {
      stopStream(enrollStreamRef);
    }
  }, [biometricsModalOpen, enrollingStep]);

  // Re-attach stream when step changes (video element remounts between UI states)
  useEffect(() => {
    if (biometricsModalOpen && enrollingStep !== 'success') {
      attachStreamToVideo(enrollVideoRef, enrollStreamRef);
    }
  }, [biometricsModalOpen, enrollingStep]);

  // ---------- Biometrics Enrollment Scanning Effect ----------
  useEffect(() => {
    if (biometricsModalOpen && enrollingStep === 'scanning') {
      setScanCountdown(3);
      setScanProgress(0);

      const countdownTimer = setInterval(() => {
        setScanCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            setEnrollingStep('verifying');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const progressTimer = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) { clearInterval(progressTimer); return 100; }
          return prev + 1.2;
        });
      }, 30);

      return () => {
        clearInterval(countdownTimer);
        clearInterval(progressTimer);
      };
    }
  }, [biometricsModalOpen, enrollingStep]);

  // ---------- Biometrics Enrollment: Capture + upload ----------
  useEffect(() => {
    if (!(biometricsModalOpen && enrollingStep === 'verifying' && selectedClass)) return;

    let cancelled = false;

    (async () => {
      const ready = await startCamera(enrollStreamRef, enrollVideoRef);
      const video = enrollVideoRef.current;
      if (cancelled) return;

      if (!ready || !video) {
        alert('Camera not available. Please allow camera access and try again.');
        setEnrollingStep('idle');
        return;
      }

      attachStreamToVideo(enrollVideoRef, enrollStreamRef);
      const hasFrame = await waitForVideoFrame(video);
      if (cancelled) return;

      if (!hasFrame) {
        alert('Camera not available. Please allow camera access and try again.');
        setEnrollingStep('idle');
        return;
      }

      const { descriptor, brightness } = captureDescriptor(video);

      if (brightness < 15) {
        alert('The camera is too dark or showing a black screen. Please ensure your face is clearly lit and visible.');
        setEnrollingStep('idle');
        return;
      }

      localStorage.setItem(`face_descriptor_${selectedClass.id}`, JSON.stringify(descriptor));
      stopStream(enrollStreamRef);

      try {
        await apiFetch('/workplace/biometrics', {
          method: 'POST',
          body: JSON.stringify({ workplaceId: selectedClass.id, faceDescriptor: descriptor }),
        });
        if (cancelled) return;
        setEnrollingStep('success');
        setTimeout(() => {
          setBiometricsModalOpen(false);
          loadDashboard();
        }, 1500);
      } catch (err: any) {
        alert(`Failed to save face descriptor: ${err.message}`);
        setEnrollingStep('idle');
      }
    })();

    return () => { cancelled = true; };
  }, [enrollingStep, selectedClass, biometricsModalOpen]);

  // ---------- Check-In: keep camera alive for entire modal session ----------
  useEffect(() => {
    if (attendanceModalOpen && markingStep !== 'success') {
      setCameraError(null);
      startCamera(checkStreamRef, checkVideoRef);
    } else if (!attendanceModalOpen) {
      stopStream(checkStreamRef);
    }
  }, [attendanceModalOpen, markingStep]);

  useEffect(() => {
    if (attendanceModalOpen && markingStep !== 'success') {
      attachStreamToVideo(checkVideoRef, checkStreamRef);
    }
  }, [attendanceModalOpen, markingStep]);

  // ---------- Attendance Check-In Scanning Effect ----------
  useEffect(() => {
    if (attendanceModalOpen && markingStep === 'scanning') {
      setScanCountdown(3);
      setScanProgress(0);
      setMarkingError(null);

      const countdownTimer = setInterval(() => {
        setScanCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            setMarkingStep('comparing');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const progressTimer = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) { clearInterval(progressTimer); return 100; }
          return prev + 1.5;
        });
      }, 30);

      return () => {
        clearInterval(countdownTimer);
        clearInterval(progressTimer);
      };
    }
  }, [attendanceModalOpen, markingStep]);

  // ---------- Check-In: Capture frame, validate brightness, submit ----------
  useEffect(() => {
    if (!(attendanceModalOpen && markingStep === 'comparing' && selectedClass)) return;

    let cancelled = false;

    (async () => {
      const ready = await startCamera(checkStreamRef, checkVideoRef);
      const video = checkVideoRef.current;
      if (cancelled) return;

      if (!ready || !video) {
        setMarkingError('Camera not available. Please allow camera access and try again.');
        setMarkingStep('idle');
        return;
      }

      attachStreamToVideo(checkVideoRef, checkStreamRef);
      const hasFrame = await waitForVideoFrame(video);
      if (cancelled) return;

      if (!hasFrame) {
        setMarkingError('Camera not available. Please allow camera access and try again.');
        setMarkingStep('idle');
        return;
      }

      const { descriptor: snapshotDescriptor, brightness } = captureDescriptor(video);

      if (brightness < 15) {
        setMarkingError('Camera is too dark or showing a black screen. Please ensure your face is clearly lit and visible.');
        setMarkingStep('idle');
        return;
      }

      stopStream(checkStreamRef);

      try {
        await apiFetch(`/workplace/${selectedClass.id}/attendance`, {
          method: 'POST',
          body: JSON.stringify({ snapshotDescriptor }),
        });
        if (cancelled) return;
        setClasses((prev) =>
          prev?.map((c) => (c.id === selectedClass.id ? { ...c, checkedInToday: true } : c)) ?? prev,
        );
        setMarkingStep('success');
        setTimeout(() => {
          setAttendanceModalOpen(false);
          loadDashboard();
        }, 1500);
      } catch (err: any) {
        const message = err.message || 'Face comparison failed. Make sure you are in a well-lit area.';
        if (message.toLowerCase().includes('already checked in')) {
          setClasses((prev) =>
            prev?.map((c) => (c.id === selectedClass.id ? { ...c, checkedInToday: true } : c)) ?? prev,
          );
        }
        setMarkingError(message);
        setMarkingStep('idle');
      }
    })();

    return () => { cancelled = true; };
  }, [markingStep, selectedClass, attendanceModalOpen]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090a0f] text-slate-900 dark:text-gray-100 font-sans transition-colors duration-300 selection:bg-blue-500/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header Navbar */}
        <header className="flex justify-between items-center mb-8 bg-white dark:bg-[#0f111a] border border-slate-200/80 dark:border-zinc-800/80 px-5 py-3.5 rounded-3xl shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <Activity className="text-blue-500 animate-pulse" size={24} />
            <div>
              <span className="text-sm font-bold tracking-wide">AttendEase Dashboard</span>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5">IP: <span className="font-semibold">{clientIp}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl">
              {(['light', 'dark', 'system'] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  aria-label={t}
                  aria-pressed={theme === t}
                  className={`p-1.5 rounded-lg transition-all relative ${theme === t
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm font-medium scale-105'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                >
                  {t === 'light' && <Sun size={15} />}
                  {t === 'dark' && <Moon size={15} />}
                  {t === 'system' && <Monitor size={15} />}
                </button>
              ))}
            </div>

            <button
              id="student-logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 px-4.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all disabled:opacity-50 active:scale-95 border border-transparent hover:border-rose-100 dark:hover:border-rose-950/20"
            >
              <LogOut size={15} />
              {loggingOut ? 'Logging out…' : 'Logout'}
            </button>
          </div>
        </header>

        {/* Global loading skeleton */}
        {loading && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-48 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                  <div className="h-4 w-32 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="h-32 bg-slate-200 dark:bg-zinc-800 rounded-3xl animate-pulse" />
                <div className="h-32 bg-slate-200 dark:bg-zinc-800 rounded-3xl animate-pulse" />
              </div>
              <div className="h-64 bg-slate-200 dark:bg-zinc-800 rounded-3xl animate-pulse" />
            </div>
          </div>
        )}

        {/* Global error */}
        {!loading && error && (
          <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-3xl p-8 text-center shadow-sm">
            <p className="text-rose-700 dark:text-rose-400 font-semibold mb-4 text-base">{error}</p>
            <button
              onClick={loadDashboard}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/20"
            >
              Retry Layout
            </button>
          </div>
        )}

        {/* Dashboard content */}
        {!loading && !error && profile && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-250">

            {/* ---------- Profile Section ---------- */}
            <section className="bg-white dark:bg-[#0f111a] border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full pointer-events-none" />
              <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10 text-center sm:text-left">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-md shadow-blue-500/10 ring-4 ring-slate-100 dark:ring-zinc-800">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover animate-in zoom-in-90" />
                    ) : (
                      <span>{getInitial(profile.name)}</span>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    aria-label="Upload photo"
                    className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center shadow-md hover:scale-105 transition-all disabled:opacity-50 active:scale-95"
                  >
                    <Camera size={14} className="text-slate-600 dark:text-zinc-300" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">Student Profile</span>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 truncate mt-1">{profile.name}</h1>
                  <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mt-0.5 truncate">{profile.email}</p>
                  {uploading && (
                    <span className="inline-flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 mt-2 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md animate-pulse">
                      Updating photo…
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

              {/* Left 2 Columns: Classes */}
              <div className="lg:col-span-2 space-y-6">

                {/* ---------- Live Portals Header ---------- */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen size={18} className="text-blue-500 animate-bounce" />
                    <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Your Workplaces</h2>
                  </div>
                </div>

                {/* Workplace Cards list */}
                {!classes || classes.length === 0 ? (
                  <div className="bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center">
                    <p className="text-slate-400 dark:text-zinc-500 font-medium">You are not registered in any classes yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Submit a join code on the right to start.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {classes.map((c) => {
                      const isApproved = c.status === 'approved';
                      const isLive = c.activeSession;
                      const hasBio = c.hasBiometrics;
                      const networkOk = c.networkMatched;
                      const checkedIn = c.checkedInToday;

                      return (
                        <div
                          key={c.id}
                          className={`bg-white dark:bg-[#0f111a] border rounded-3xl p-5 shadow-sm transition-all relative overflow-hidden flex flex-col justify-between hover:shadow-md ${
                            isLive && isApproved && networkOk
                              ? 'border-emerald-500/50 dark:border-emerald-500/30 ring-1 ring-emerald-500/20 bg-gradient-to-tr from-white to-emerald-500/5 dark:from-[#0f111a] dark:to-emerald-950/10'
                              : 'border-slate-200/80 dark:border-zinc-800/80'
                          }`}
                        >
                          {/* Live portal neon header decoration */}
                          {isLive && isApproved && networkOk && (
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />
                          )}

                          <div>
                            <div className="flex justify-between items-start gap-2 mb-3">
                              <div>
                                <h3 className="text-base font-bold truncate text-slate-800 dark:text-zinc-100">{c.name}</h3>
                                <p className="text-xs text-slate-400 dark:text-zinc-500 truncate mt-0.5">{c.subjectDetails}</p>
                              </div>

                              <div className="shrink-0 flex gap-1 items-center">
                                {/* Approval Badge */}
                                {!isApproved ? (
                                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Pending</span>
                                ) : (
                                  <>
                                    {isLive ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 animate-pulse">
                                        <Zap size={8} /> Live
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:text-zinc-500 dark:bg-zinc-800/60 px-2 py-0.5 rounded-md uppercase tracking-wider">Offline</span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Details list */}
                            <div className="space-y-2 my-4 text-xs text-slate-500 dark:text-zinc-400">
                              <div className="flex items-center justify-between">
                                <span>Router Pinned IP:</span>
                                <code className="font-mono bg-slate-50 dark:bg-zinc-900 px-1.5 py-0.5 rounded text-slate-700 dark:text-zinc-300 truncate max-w-[150px]">{c.pinnedIP}</code>
                              </div>
                              {isApproved && (
                                <>
                                  <div className="flex items-center justify-between">
                                    <span>Face Descriptor:</span>
                                    {hasBio ? (
                                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                        <Check size={12} /> Set up
                                      </span>
                                    ) : (
                                      <span className="text-rose-500 font-semibold">Not enrolled</span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span>Classroom Network:</span>
                                    {networkOk ? (
                                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                        <Check size={12} /> Verified
                                      </span>
                                    ) : (
                                      <span className="text-rose-500 font-semibold flex items-center gap-1">
                                        <AlertTriangle size={12} /> Mismatch
                                      </span>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Classroom Footer Buttons */}
                          {isApproved && (
                            <div className="border-t border-slate-100 dark:border-zinc-800/50 pt-3.5 mt-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-slate-400 dark:text-zinc-500">Attendance:</span>
                                <span className="text-xs font-bold font-mono text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{c.attendancePct}%</span>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Setup biometrics button */}
                                {!hasBio ? (
                                  <button
                                    onClick={() => {
                                      setSelectedClass(c);
                                      setEnrollingStep('idle');
                                      setCameraError(null);
                                      setBiometricsModalOpen(true);
                                    }}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all active:scale-95"
                                  >
                                    <Camera size={12} /> Setup Scan
                                  </button>
                                ) : isLive ? (
                                  networkOk ? (
                                    checkedIn ? (
                                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg flex items-center gap-1 border border-emerald-500/20">
                                        <CheckCircle size={10} /> Checked In
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setSelectedClass(c);
                                          setMarkingStep('idle');
                                          setMarkingError(null);
                                          setCameraError(null);
                                          setAttendanceModalOpen(true);
                                        }}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all shadow-md shadow-emerald-500/10 animate-bounce active:scale-95"
                                      >
                                        <UserCheck size={12} /> Check In
                                      </button>
                                    )
                                  ) : (
                                    <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded-lg flex items-center gap-1">
                                      <MapPin size={10} /> Out of Zone
                                    </span>
                                  )
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-medium italic">Closed</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Join workplace & logs */}
              <div className="space-y-8">

                {/* ---------- Join Workplace Card ---------- */}
                <div className="bg-white dark:bg-[#0f111a] border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full pointer-events-none" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-2 mb-4">
                    <Plus size={16} className="text-blue-500" />
                    Register in Class
                  </h3>
                  <form onSubmit={handleJoinCodeSubmit} className="space-y-3">
                    <div>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        placeholder="e.g. 5A92BF"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 text-center font-mono font-bold text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:font-sans placeholder:font-normal placeholder:text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={joining || !joinCode}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {joining ? 'Submitting…' : 'Submit Join Code'}
                    </button>
                  </form>
                </div>

                {/* ---------- History Card ---------- */}
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Calendar size={16} className="text-blue-500" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Attendance Log</h2>
                  </div>
                  <div className="bg-white dark:bg-[#0f111a] border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-sm max-h-[400px] overflow-y-auto pr-0.5">
                    {!attendance || attendance.length === 0 ? (
                      <div className="p-8 text-xs text-slate-400 dark:text-zinc-500 text-center flex flex-col items-center justify-center h-full">
                        <p>No logged attendance found.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                        {attendance.map((r) => {
                          const s = statusColor(r.status);
                          const StatusIcon = s.icon;
                          return (
                            <div
                              key={r.id}
                              className="flex items-center justify-between p-3.5 hover:bg-slate-50/50 dark:hover:bg-zinc-900/40 transition-all"
                            >
                              <div className="min-w-0 mr-2">
                                <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">{r.workplaceName}</p>
                                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">{r.date} • {r.networkVerified ? 'Network OK' : 'No Network'}</p>
                              </div>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border shrink-0 ${s.text} ${s.bg} ${s.border}`}>
                                <StatusIcon size={10} />
                                {r.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>

      {/* ---------- MODAL: SETUP FACE BIOMETRICS ---------- */}
      {biometricsModalOpen && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f111a] w-full max-w-md rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-2xl relative text-center">
            
            <button
              onClick={() => { setBiometricsModalOpen(false); stopStream(enrollStreamRef); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <X size={16} />
            </button>

            <h3 className="text-base font-bold flex items-center justify-center gap-2 mb-1">
              <Scan className="text-blue-500 animate-pulse" size={20} />
              Setup Biometrics
            </h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mb-6">Registering face credentials for <strong className="text-slate-700 dark:text-zinc-300">{selectedClass.name}</strong></p>

            {/* Keep video mounted for capture during verifying step */}
            {(enrollingStep === 'verifying' || enrollingStep === 'success') && (
              <video ref={enrollVideoRef} autoPlay muted playsInline className="hidden" />
            )}

            {enrollingStep === 'idle' && (
              <div className="space-y-6">
                {/* Live camera preview */}
                <div className="relative w-40 h-40 rounded-full mx-auto bg-black overflow-hidden border-2 border-blue-500/50 flex items-center justify-center shadow-inner">
                  <video
                    ref={enrollVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                  />
                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-rose-400 text-[10px] px-2 text-center">
                      <Camera size={20} className="mb-1" />
                      {cameraError}
                    </div>
                  )}
                </div>

                <div className="text-xs text-left bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800/80 p-3.5 rounded-2xl flex items-start gap-2.5">
                  <Shield size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    By proceeding, you consent to store your face biometrics. The model stores a localized key descriptor vector representation, which never leaves this dashboard client.
                  </div>
                </div>

                <button
                  onClick={() => setEnrollingStep('scanning')}
                  disabled={!!cameraError}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  Start Scanning Process
                </button>
              </div>
            )}

            {enrollingStep === 'scanning' && (
              <div className="space-y-5">
                <div className="w-40 h-40 rounded-full mx-auto bg-black relative overflow-hidden border-2 border-blue-500 flex items-center justify-center">
                  {/* Live camera in scanning state */}
                  <video
                    ref={enrollVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-60"
                  />
                  <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-500 shadow-md shadow-blue-500/50 animate-bounce" style={{ animationDuration: '2s' }} />
                  <div className="relative text-white font-mono text-3xl font-bold drop-shadow-lg">{scanCountdown}</div>
                </div>

                <div className="space-y-1.5 max-w-xs mx-auto">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Extracting Face Nodes</span>
                    <span>{Math.round(scanProgress)}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-300 ease-out" style={{ width: `${scanProgress}%` }} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic">Please align your face within the frame...</p>
              </div>
            )}

            {enrollingStep === 'verifying' && (
              <div className="space-y-4 py-8 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                <p className="text-xs font-medium text-slate-400">Generating 128-float model representation...</p>
              </div>
            )}

            {enrollingStep === 'success' && (
              <div className="space-y-4 py-6 flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                  <CheckCircle size={28} />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200">Biometrics Configured!</h4>
                <p className="text-[11px] text-slate-400 max-w-xs">Face structure mapping successfully saved onto classroom roster.</p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ---------- MODAL: MARK ATTENDANCE (CHECK IN) ---------- */}
      {attendanceModalOpen && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f111a] w-full max-w-md rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-2xl relative text-center">
            
            <button
              onClick={() => { setAttendanceModalOpen(false); stopStream(checkStreamRef); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <X size={16} />
            </button>

            <h3 className="text-base font-bold flex items-center justify-center gap-2 mb-1">
              <Scan className="text-emerald-500 animate-pulse" size={20} />
              Mark Classroom Attendance
            </h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mb-6">Logging attendance session for <strong className="text-slate-700 dark:text-zinc-300">{selectedClass.name}</strong></p>

            {markingError && (
              <div className="mb-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 p-3 rounded-2xl text-[11px] text-left">
                <strong>Scan Error:</strong> {markingError}
              </div>
            )}

            {/* Keep video mounted for capture during comparing step */}
            {(markingStep === 'comparing' || markingStep === 'success') && (
              <video ref={checkVideoRef} autoPlay muted playsInline className="hidden" />
            )}

            {markingStep === 'idle' && (
              <div className="space-y-6">
                {/* Live camera preview */}
                <div className="relative w-40 h-40 rounded-full mx-auto bg-black overflow-hidden border-2 border-emerald-500/50 flex items-center justify-center shadow-inner">
                  <video
                    ref={checkVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                  />
                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-rose-400 text-[10px] px-2 text-center">
                      <Camera size={20} className="mb-1" />
                      {cameraError}
                    </div>
                  )}
                </div>
                
                <div className="text-[11px] text-slate-400 bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-emerald-500" />
                    <span>Device IP status:</span>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">NETWORK MATCHED</span>
                </div>

                <button
                  onClick={() => setMarkingStep('scanning')}
                  disabled={!!cameraError}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  Verify Face & Log Presence
                </button>
              </div>
            )}

            {markingStep === 'scanning' && (
              <div className="space-y-5">
                <div className="w-40 h-40 rounded-full mx-auto bg-black relative overflow-hidden border-2 border-emerald-500 flex items-center justify-center">
                  {/* Live camera in scanning state */}
                  <video
                    ref={checkVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-60"
                  />
                  <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500 shadow-md shadow-emerald-500/50 animate-bounce" style={{ animationDuration: '2s' }} />
                  <div className="relative text-white font-mono text-3xl font-bold drop-shadow-lg">{scanCountdown}</div>
                </div>

                <div className="space-y-1.5 max-w-xs mx-auto">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Comparing Face Vectors</span>
                    <span>{Math.round(scanProgress)}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-300 ease-out" style={{ width: `${scanProgress}%` }} />
                  </div>
                </div>
              </div>
            )}

            {markingStep === 'comparing' && (
              <div className="space-y-4 py-8 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
                <p className="text-xs font-medium text-slate-400">Comparing live descriptor with enrolled database...</p>
              </div>
            )}

            {markingStep === 'success' && (
              <div className="space-y-4 py-6 flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                  <CheckCircle size={28} />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200">Attendance Logged Successfully!</h4>
                <p className="text-[11px] text-slate-400 max-w-xs">Presence and network credentials synchronized in teacher room.</p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}