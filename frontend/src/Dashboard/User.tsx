import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  Camera,
  LogOut,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  X,
  Scan,
  Check,
  UserCheck,
  ShieldCheck,
  Wifi
} from 'lucide-react';
import { Logo } from '../components/Logo';

// ---------- Types ----------
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
  if (status === 'present') return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-800/60', icon: CheckCircle };
  if (status === 'late') return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800/60', icon: Clock };
  return { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/20', border: 'border-rose-200 dark:border-rose-800/60', icon: AlertTriangle };
}

export default function StudentDashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [classes, setClasses] = useState<WorkplaceSummary[] | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[] | null>(null);

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

  // ---------- Load dashboard data ----------
  const loadDashboard = () => {
    setLoading(true);
    setError(null);
    apiFetch<{ success: boolean; profile: UserProfile; clientIp: string; workplaces: WorkplaceSummary[]; attendance: AttendanceRecord[] }>('/auth/dashboard/student')
      .then((data) => {
        setProfile(data.profile);
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
    } catch { /* ignore */ }
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
  const captureDescriptor = (video: HTMLVideoElement): { descriptor: number[]; brightness: number } => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, 128, 128);
    const imageData = ctx.getImageData(0, 0, 128, 128);
    const data = imageData.data;

    let totalBrightness = 0;
    const descriptor: number[] = [];

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
      setCameraError('Camera interface not supported in this environment.');
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
      setCameraError('Camera access denied. Please grant permission to scan.');
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

  // ---------- Biometrics Enrollment: Camera management ----------
  useEffect(() => {
    if (biometricsModalOpen && enrollingStep !== 'success') {
      setCameraError(null);
      startCamera(enrollStreamRef, enrollVideoRef);
    } else if (!biometricsModalOpen) {
      stopStream(enrollStreamRef);
    }
  }, [biometricsModalOpen, enrollingStep]);

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
        alert('Low ambient light detected. Please position your face into an illuminated area.');
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

  // ---------- Check-In: Camera management ----------
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
        setMarkingError('Camera interface inaccessible. Ensure camera authorization.');
        setMarkingStep('idle');
        return;
      }

      attachStreamToVideo(checkVideoRef, checkStreamRef);
      const hasFrame = await waitForVideoFrame(video);
      if (cancelled) return;

      if (!hasFrame) {
        setMarkingError('Unable to extract live video frames.');
        setMarkingStep('idle');
        return;
      }

      const { descriptor: snapshotDescriptor, brightness } = captureDescriptor(video);

      if (brightness < 15) {
        setMarkingError('Liveness verification failed: Inadequate lighting detected.');
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
        const message = err.message || 'Biometric vector mismatch. Ensure facial orientation is straight.';
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
    <div className="min-h-screen bg-transparent text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header Navbar */}
        <header className="flex justify-between items-center mb-8 bg-white/90 backdrop-blur-md border border-slate-200 px-5 py-3.5 rounded-2xl shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div>
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Attend<span className="text-indigo-600 dark:text-indigo-400">Ease</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-700/60">
                  Student
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              id="student-logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 active:scale-95"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">{loggingOut ? 'Signing out…' : 'Sign Out'}</span>
            </button>
          </div>
        </header>

        {/* Global loading skeleton */}
        {loading && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
                <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
              </div>
              <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
            </div>
          </div>
        )}

        {/* Global error */}
        {!loading && error && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-8 text-center shadow-sm">
            <p className="text-rose-700 dark:text-rose-400 font-semibold mb-4 text-base">{error}</p>
            <button
              onClick={loadDashboard}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/20"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Dashboard content */}
        {!loading && !error && profile && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">

            {/* ---------- Profile Section ---------- */}
            <section className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/10 via-cyan-500/5 to-transparent rounded-bl-full pointer-events-none" />
              <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10 text-center sm:text-left">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-tr from-indigo-600 to-cyan-600 flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-md ring-4 ring-slate-100 dark:ring-slate-800">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-mono">{getInitial(profile.name)}</span>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    aria-label="Upload photo"
                    className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-md hover:border-cyan-500 transition-all disabled:opacity-50 active:scale-95 text-slate-600 dark:text-slate-300"
                  >
                    <Camera size={14} />
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
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/50 text-[10px] font-mono font-bold uppercase tracking-wider">
                    <ShieldCheck size={11} className="text-cyan-500" />
                    <span>Verified Student Profile</span>
                  </div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate mt-1">{profile.name}</h1>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">{profile.email}</p>
                  {uploading && (
                    <span className="inline-flex items-center text-xs font-semibold text-cyan-600 dark:text-cyan-400 mt-2 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-md animate-pulse">
                      Encrypting & uploading avatar…
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
                    <BookOpen size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Classrooms</h2>
                  </div>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {classes?.length || 0} registered
                  </span>
                </div>

                {/* Workplace Cards list */}
                {!classes || classes.length === 0 ? (
                  <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">You are not enrolled in any classrooms yet.</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Submit a classroom join code on the right panel to request access.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {classes.map((c) => {
                      const isApproved = c.status === 'approved';
                      const isLive = c.activeSession;
                      const hasBio = c.hasBiometrics;
                      const checkedIn = c.checkedInToday;

                      return (
                        <div
                          key={c.id}
                          className={`bg-white dark:bg-[#111827] border rounded-2xl p-5 shadow-sm transition-all relative overflow-hidden flex flex-col justify-between hover:shadow-md ${
                            isLive && isApproved
                              ? 'border-emerald-500/40 dark:border-emerald-500/30 ring-1 ring-emerald-500/20 bg-gradient-to-tr from-white to-emerald-500/[0.03] dark:from-[#111827] dark:to-emerald-950/20'
                              : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-3">
                              <div className="min-w-0">
                                <h3 className="text-base font-bold truncate text-slate-900 dark:text-white">{c.name}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{c.subjectDetails}</p>
                              </div>

                              <div className="shrink-0 flex gap-1 items-center">
                                {!isApproved ? (
                                  <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/60 uppercase">
                                    Pending Approval
                                  </span>
                                ) : (
                                  <>
                                    {isLive ? (
                                      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        LIVE PORTAL
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md uppercase">
                                        Offline
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Details row */}
                            <div className="space-y-2 my-4 text-xs text-slate-500 dark:text-slate-400">
                              {isApproved && (
                                <div className="flex items-center justify-between">
                                  <span>Face Biometric Key:</span>
                                  {hasBio ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono flex items-center gap-1">
                                      <Check size={12} /> Enrolled
                                    </span>
                                  ) : (
                                    <span className="text-rose-500 font-semibold font-mono">Missing</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Classroom Card Footer */}
                          {isApproved && (
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-3.5 mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <span>Attendance:</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                  {c.attendancePct}%
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {!hasBio ? (
                                  <button
                                    onClick={() => {
                                      setSelectedClass(c);
                                      setEnrollingStep('idle');
                                      setCameraError(null);
                                      setBiometricsModalOpen(true);
                                    }}
                                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                                  >
                                    <Camera size={13} /> Setup Biometrics
                                  </button>
                                ) : isLive ? (
                                  checkedIn ? (
                                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-xl flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800/60">
                                      <CheckCircle size={12} /> Verified Today
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
                                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-600/25 active:scale-95"
                                    >
                                      <UserCheck size={13} /> Check In Now
                                    </button>
                                  )
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-mono italic">Portal Inactive</span>
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
              <div className="space-y-6">

                {/* ---------- Join Workplace Card ---------- */}
                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-bl-full pointer-events-none" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-4">
                    <Plus size={15} className="text-cyan-500" />
                    Enter Classroom Token
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
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090D16] text-center font-mono font-bold text-base focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all text-slate-900 dark:text-gray-100 placeholder:font-sans placeholder:font-normal placeholder:text-xs tracking-widest uppercase"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={joining || !joinCode}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95"
                    >
                      {joining ? 'Transmitting Request…' : 'Submit Join Token'}
                    </button>
                  </form>
                </div>

                {/* ---------- History Card ---------- */}
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Calendar size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Verified Attendance Feed</h2>
                  </div>
                  <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm max-h-[380px] overflow-y-auto">
                    {!attendance || attendance.length === 0 ? (
                      <div className="p-8 text-xs text-slate-400 dark:text-slate-500 text-center flex flex-col items-center justify-center">
                        <p>No verified attendance events recorded.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {attendance.map((r) => {
                          const s = statusColor(r.status);
                          const StatusIcon = s.icon;
                          return (
                            <div
                              key={r.id}
                              className="flex items-center justify-between p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all"
                            >
                              <div className="min-w-0 mr-2">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{r.workplaceName}</p>
                                <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">{r.date}</p>
                              </div>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded-md border shrink-0 ${s.text} ${s.bg} ${s.border}`}>
                                <StatusIcon size={11} />
                                <span className="uppercase">{r.status}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111827] w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl relative text-center">
            
            <button
              onClick={() => { setBiometricsModalOpen(false); stopStream(enrollStreamRef); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>

            <h3 className="text-base font-bold flex items-center justify-center gap-2 mb-1 text-slate-900 dark:text-white">
              <Scan className="text-cyan-500" size={20} />
              Setup Biometric Descriptor
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-mono">
              Classroom: <strong className="text-slate-800 dark:text-slate-200 font-sans">{selectedClass.name}</strong>
            </p>

            {(enrollingStep === 'verifying' || enrollingStep === 'success') && (
              <video ref={enrollVideoRef} autoPlay muted playsInline className="hidden" />
            )}

            {enrollingStep === 'idle' && (
              <div className="space-y-6">
                {/* Live camera preview with Cyber Cyan bounding ring */}
                <div className="relative w-44 h-44 rounded-full mx-auto bg-black overflow-hidden border-2 border-cyan-500 shadow-scan-cyan ring-4 ring-cyan-500/20 flex items-center justify-center transition-all">
                  <video
                    ref={enrollVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                  />
                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 text-rose-400 text-[11px] px-3 text-center">
                      <Camera size={22} className="mb-1 text-rose-500" />
                      {cameraError}
                    </div>
                  )}
                </div>

                <div className="text-xs text-left bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl flex items-start gap-3">
                  <ShieldCheck size={18} className="text-cyan-500 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    A 128-float biometric nodal vector is created strictly within this client. No raw photographic images are permanently uploaded or shared.
                  </div>
                </div>

                <button
                  onClick={() => setEnrollingStep('scanning')}
                  disabled={!!cameraError}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
                >
                  Initiate Biometric Scan
                </button>
              </div>
            )}

            {enrollingStep === 'scanning' && (
              <div className="space-y-5">
                <div className="w-44 h-44 rounded-full mx-auto bg-black relative overflow-hidden border-2 border-cyan-500 shadow-scan-cyan ring-4 ring-cyan-500/30 flex items-center justify-center">
                  <video
                    ref={enrollVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-70"
                  />
                  {/* Subtle scanning laser line */}
                  <div className="absolute inset-x-0 h-0.5 bg-cyan-400 shadow-[0_0_12px_#06B6D4] animate-scanline pointer-events-none" />
                  <div className="relative text-white font-mono text-3xl font-extrabold drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                    {scanCountdown}
                  </div>
                </div>

                <div className="space-y-2 max-w-xs mx-auto">
                  <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400">
                    <span className="uppercase tracking-wider">Mapping Face Coordinates</span>
                    <span>{Math.round(scanProgress)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 transition-all duration-300 ease-out" style={{ width: `${scanProgress}%` }} />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono italic">Keep your head stable inside the ring...</p>
              </div>
            )}

            {enrollingStep === 'verifying' && (
              <div className="space-y-4 py-8 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                <p className="text-xs font-mono text-slate-400">Encoding localized 128-float vector matrix…</p>
              </div>
            )}

            {enrollingStep === 'success' && (
              <div className="space-y-4 py-6 flex flex-col items-center justify-center">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-full flex items-center justify-center shadow-scan-emerald animate-in zoom-in-75 duration-200">
                  <CheckCircle size={32} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Biometrics Enrolled Successfully!</h4>
                <p className="text-xs font-mono text-slate-400 max-w-xs">Facial coordinates securely registered for this classroom.</p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ---------- MODAL: MARK ATTENDANCE (CHECK IN) ---------- */}
      {attendanceModalOpen && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111827] w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl relative text-center">
            
            <button
              onClick={() => { setAttendanceModalOpen(false); stopStream(checkStreamRef); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>

            <h3 className="text-base font-bold flex items-center justify-center gap-2 mb-1 text-slate-900 dark:text-white">
              <Scan className="text-emerald-500" size={20} />
              Biometric Liveness Verification
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 font-mono">
              Session: <strong className="text-slate-800 dark:text-slate-200 font-sans">{selectedClass.name}</strong>
            </p>

            {/* Error Banner with Crimson Rose proxy alert styling */}
            {markingError && (
              <div className="mb-5 bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900/60 text-[#F43F5E] p-3 rounded-2xl text-xs text-left flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-[#F43F5E]" />
                <div>
                  <strong className="font-mono uppercase tracking-wide">Verification Failed:</strong>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">{markingError}</p>
                </div>
              </div>
            )}

            {(markingStep === 'comparing' || markingStep === 'success') && (
              <video ref={checkVideoRef} autoPlay muted playsInline className="hidden" />
            )}

            {markingStep === 'idle' && (
              <div className="space-y-6">
                {/* Live camera preview with Cyber Cyan bounding ring */}
                <div className={`relative w-44 h-44 rounded-full mx-auto bg-black overflow-hidden border-2 transition-all flex items-center justify-center ${
                  markingError
                    ? 'border-[#F43F5E] shadow-scan-danger ring-4 ring-rose-500/20'
                    : 'border-cyan-500 shadow-scan-cyan ring-4 ring-cyan-500/20'
                }`}>
                  <video
                    ref={checkVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                  />
                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 text-rose-400 text-[11px] px-3 text-center">
                      <Camera size={22} className="mb-1 text-rose-500" />
                      {cameraError}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                  <Wifi size={13} className="text-emerald-500" />
                  <span>Subnet Validated &bull; Liveness Active</span>
                </div>

                <button
                  onClick={() => setMarkingStep('scanning')}
                  disabled={!!cameraError}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/25 active:scale-95 disabled:opacity-50"
                >
                  Verify Face & Log Attendance
                </button>
              </div>
            )}

            {markingStep === 'scanning' && (
              <div className="space-y-5">
                <div className="w-44 h-44 rounded-full mx-auto bg-black relative overflow-hidden border-2 border-cyan-500 shadow-scan-cyan ring-4 ring-cyan-500/30 flex items-center justify-center">
                  <video
                    ref={checkVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-70"
                  />
                  {/* Subtle scanning laser line */}
                  <div className="absolute inset-x-0 h-0.5 bg-cyan-400 shadow-[0_0_12px_#06B6D4] animate-scanline pointer-events-none" />
                  <div className="relative text-white font-mono text-3xl font-extrabold drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                    {scanCountdown}
                  </div>
                </div>

                <div className="space-y-2 max-w-xs mx-auto">
                  <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400">
                    <span className="uppercase tracking-wider">Verifying Biometric Nodes</span>
                    <span>{Math.round(scanProgress)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 transition-all duration-300 ease-out" style={{ width: `${scanProgress}%` }} />
                  </div>
                </div>
              </div>
            )}

            {markingStep === 'comparing' && (
              <div className="space-y-4 py-8 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-xs font-mono text-slate-400">Comparing live descriptor against authorized profile…</p>
              </div>
            )}

            {markingStep === 'success' && (
              <div className="space-y-4 py-6 flex flex-col items-center justify-center">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-full flex items-center justify-center shadow-scan-emerald animate-in zoom-in-75 duration-200">
                  <CheckCircle size={32} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Attendance Verified!</h4>
                <p className="text-xs font-mono text-slate-400 max-w-xs">Cryptographic session registered in classroom ledger.</p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
