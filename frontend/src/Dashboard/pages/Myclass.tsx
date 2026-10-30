import { useState } from 'react';
import { Plus, ToggleLeft, ToggleRight, Copy, Check, Users, Radio, Trash2, ChevronLeft, UserCheck, UserX, Clock, CheckCircle2, QrCode } from 'lucide-react';

// ---------- Types ----------
interface Classroom {
  id: string;
  name: string;
  subjectDetails: string;
  joinCode: string;
  pinnedIP: string;
  isLive: boolean;
  studentCount: number;
}

interface StudentLog {
  id: string;
  timestamp: string;
  networkVerified: boolean;
  status: string;
}

interface ClassStudent {
  studentId: string;
  name: string;
  email: string;
  avatarUrl: string;
  hasBiometrics: boolean;
  presentCount: number;
  lastSeen: string | null;
  logs: StudentLog[];
}

interface ClassDetail {
  workplace: { id: string; name: string; subjectDetails: string; isLive: boolean };
  students: ClassStudent[];
}

interface MyClassProps {
  workplaces: Classroom[];
  onCreateClick: () => void;
  onToggleLive: (workplaceId: string, isLive: boolean) => Promise<void>;
  onDeleteWorkplace: (workplaceId: string) => Promise<void>;
}

// ---------- API base ----------
const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

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
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

function getInitial(name: string) {
  return name?.trim()?.[0]?.toUpperCase() || '?';
}

export default function MyClass({ workplaces, onCreateClick, onToggleLive, onDeleteWorkplace }: MyClassProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Class detail view
  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedLogStudent, setExpandedLogStudent] = useState<string | null>(null);

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    setTogglingId(id);
    try {
      await onToggleLive(id, !currentStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteWorkplace(id);
      setConfirmDeleteId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const openClassDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await apiFetch<{ success: boolean } & ClassDetail>(`/workplace/${id}/students`);
      setClassDetail({ workplace: data.workplace, students: data.students });
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Class Detail Panel ─────────────────────────────────────────
  if (detailLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (classDetail) {
    const { workplace, students } = classDetail;
    const totalStudents = students.length;
    const presentStudents = students.filter(s => s.presentCount > 0);
    const absentStudents = students.filter(s => s.presentCount === 0);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setClassDetail(null)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{workplace.name}</h2>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{workplace.subjectDetails}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
            workplace.isLive
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 animate-pulse'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/60'
          }`}>
            <Radio size={10} />
            {workplace.isLive ? 'Portal Live' : 'Offline'}
          </span>
        </div>

        {/* Stats row with high contrast theme cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Enrolled', value: totalStudents, textClass: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'Verified Present', value: presentStudents.length, textClass: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Absent / Unverified', value: absentStudents.length, textClass: 'text-rose-600 dark:text-rose-400' },
          ].map(({ label, value, textClass }) => (
            <div key={label} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center shadow-sm">
              <p className={`text-3xl font-extrabold font-mono ${textClass}`}>{value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Students roster */}
        {students.length === 0 ? (
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
            <p className="text-slate-400 dark:text-slate-500 font-mono text-xs">No approved students recorded in this classroom.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Classroom Biometric Ledger</h3>
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{totalStudents} records</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {students.map((student) => {
                const isPresent = student.presentCount > 0;
                const isExpanded = expandedLogStudent === student.studentId;
                return (
                  <div key={student.studentId}>
                    <div
                      className="flex items-center gap-4 p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-all cursor-pointer"
                      onClick={() => setExpandedLogStudent(isExpanded ? null : student.studentId)}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm font-mono">
                        {student.avatarUrl
                          ? <img src={student.avatarUrl} alt={student.name} className="w-full h-full rounded-xl object-cover" />
                          : getInitial(student.name)
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{student.name}</p>
                        <p className="text-xs font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">{student.email}</p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono text-slate-400 dark:text-slate-500 hidden sm:block">
                          {student.presentCount} verified check-in{student.presentCount !== 1 ? 's' : ''}
                        </span>
                        {isPresent ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                            <CheckCircle2 size={11} /> PRESENT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
                            <UserX size={11} /> ABSENT
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expanded attendance log */}
                    {isExpanded && (
                      <div className="bg-slate-50/70 dark:bg-[#090D16]/60 border-t border-slate-100 dark:border-slate-800 px-5 py-3.5 space-y-2 animate-in slide-in-from-top-1 duration-150">
                        {student.logs.length === 0 ? (
                          <p className="text-xs font-mono text-slate-400 dark:text-slate-500 py-1 text-center">No attendance records logged yet.</p>
                        ) : (
                          student.logs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                                <Clock size={12} className="text-cyan-500" />
                                <span>{new Date(log.timestamp).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                                  {log.status} &bull; Network Verified
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Classroom Grid ──────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Classrooms Roster</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
            Manage biometric attendance portals and cryptographic join tokens.
          </p>
        </div>
        <button
          onClick={onCreateClick}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/25 active:scale-95"
        >
          <Plus size={15} />
          Deploy New Classroom
        </button>
      </div>

      {workplaces.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-slate-400 dark:text-slate-500 font-mono text-xs">No active classrooms configured.</p>
          <button
            onClick={onCreateClick}
            className="mt-4 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl text-xs font-semibold transition-all border border-indigo-200 dark:border-indigo-900/60"
          >
            Create Your First Class
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workplaces.map((w) => (
            <div
              key={w.id}
              className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group overflow-hidden"
            >
              {/* Subtle top background highlight */}
              <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-indigo-500/10 via-cyan-500/5 to-transparent rounded-bl-full pointer-events-none" />

              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-base font-bold truncate text-slate-900 dark:text-white">{w.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{w.subjectDetails}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                      w.isLive
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 animate-pulse'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    <Radio size={10} />
                    {w.isLive ? 'PORTAL OPEN' : 'OFFLINE'}
                  </span>
                </div>

                {/* Rotating WebSocket QR / Join Token Container with radial gradient glow */}
                <div className="my-5 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-500/[0.08] via-cyan-500/[0.05] to-transparent tamper-proof-qr-bg relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <QrCode size={13} className="text-cyan-500" />
                      Session Join Token
                    </span>
                    <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-200 dark:border-cyan-800/60">
                      Live Code
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-white/80 dark:bg-[#090D16]/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="font-mono font-bold tracking-wider text-sm text-indigo-600 dark:text-cyan-400">
                      {w.joinCode}
                    </span>
                    <button
                      onClick={() => handleCopyCode(w.id, w.joinCode)}
                      className="text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 p-1 rounded-md transition-colors"
                      title="Copy Token"
                    >
                      {copiedId === w.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <Users size={14} /> Approved Students:
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{w.studentCount}</span>
                  </div>
                </div>

                {/* View attendance roster button */}
                <button
                  onClick={() => openClassDetail(w.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 rounded-xl transition-all border border-indigo-200/60 dark:border-indigo-900/40 mb-3"
                >
                  <UserCheck size={14} />
                  Inspect Class Ledger
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between mt-2">
                {/* Delete button */}
                {confirmDeleteId === w.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-rose-500 font-mono text-[11px]">Delete?</span>
                    <button
                      onClick={() => handleDelete(w.id)}
                      disabled={deletingId === w.id}
                      className="text-[10px] font-bold px-2 py-1 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-all disabled:opacity-50"
                    >
                      {deletingId === w.id ? '…' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-[10px] font-bold px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-300 transition-all"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(w.id)}
                    className="flex items-center gap-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 text-xs font-medium transition-colors p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20"
                    title="Delete Classroom"
                  >
                    <Trash2 size={14} />
                    <span className="hidden group-hover:inline text-[11px]">Remove</span>
                  </button>
                )}

                {/* Portal Toggle Button */}
                <button
                  onClick={() => handleToggle(w.id, w.isLive)}
                  disabled={togglingId === w.id}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50 transition-colors"
                  title={w.isLive ? 'Deactivate Attendance Portal' : 'Activate Live Attendance Portal'}
                >
                  {w.isLive ? (
                    <ToggleRight size={38} className="text-emerald-500 transition-transform" />
                  ) : (
                    <ToggleLeft size={38} className="text-slate-300 dark:text-slate-700 transition-transform" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
