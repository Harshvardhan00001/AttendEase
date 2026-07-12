import { useState } from 'react';
import { Plus, ToggleLeft, ToggleRight, Copy, Check, Users, Radio, MapPin, Key, Trash2, ChevronLeft, UserCheck, UserX, Clock, CheckCircle2, X } from 'lucide-react';

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
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
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
            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-xl transition-colors text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold tracking-tight">{workplace.name}</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400">{workplace.subjectDetails}</p>
          </div>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
            workplace.isLive
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 animate-pulse'
              : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-zinc-700/50'
          }`}>
            <Radio size={10} />
            {workplace.isLive ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Enrolled', value: totalStudents, color: 'blue' },
            { label: 'Present', value: presentStudents.length, color: 'emerald' },
            { label: 'Absent', value: absentStudents.length, color: 'rose' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 text-center shadow-sm">
              <p className={`text-3xl font-bold text-${color}-600 dark:text-${color}-400`}>{value}</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Students roster */}
        {students.length === 0 ? (
          <div className="bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center">
            <p className="text-slate-400 dark:text-zinc-500 font-medium">No approved students yet.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Attendance Roster</h3>
              <span className="text-xs text-slate-400 dark:text-zinc-500">{totalStudents} students</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
              {students.map((student) => {
                const isPresent = student.presentCount > 0;
                const isExpanded = expandedLogStudent === student.studentId;
                return (
                  <div key={student.studentId}>
                    <div
                      className="flex items-center gap-4 p-4 hover:bg-slate-50/50 dark:hover:bg-zinc-900/40 transition-all cursor-pointer"
                      onClick={() => setExpandedLogStudent(isExpanded ? null : student.studentId)}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                        {student.avatarUrl
                          ? <img src={student.avatarUrl} alt={student.name} className="w-full h-full rounded-2xl object-cover" />
                          : getInitial(student.name)
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 truncate">{student.name}</p>
                        <p className="text-xs text-slate-400 dark:text-zinc-500 truncate mt-0.5">{student.email}</p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-slate-400 dark:text-zinc-500 hidden sm:block">
                          {student.presentCount} attendance{student.presentCount !== 1 ? 's' : ''}
                        </span>
                        {isPresent ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                            <CheckCircle2 size={10} /> Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20">
                            <UserX size={10} /> Absent
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expanded attendance log */}
                    {isExpanded && (
                      <div className="bg-slate-50 dark:bg-zinc-950/50 border-t border-slate-100 dark:border-zinc-800/50 px-4 py-3 space-y-2 animate-in slide-in-from-top-1 duration-150">
                        {student.logs.length === 0 ? (
                          <p className="text-xs text-slate-400 dark:text-zinc-500 py-2 text-center">No attendance records logged yet.</p>
                        ) : (
                          student.logs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                                <Clock size={11} className="text-slate-400" />
                                <span>{new Date(log.timestamp).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${log.networkVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                  {log.networkVerified ? '✓ Network OK' : '⚠ Off-network'}
                                </span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">{log.status}</span>
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Classrooms Roster</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            Manage your class sessions, join codes, and live attendance portals.
          </p>
        </div>
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95"
        >
          <Plus size={16} />
          Create Class
        </button>
      </div>

      {workplaces.length === 0 ? (
        <div className="bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center">
          <p className="text-slate-400 dark:text-zinc-500 font-medium">No classrooms set up yet.</p>
          <button
            onClick={onCreateClick}
            className="mt-4 px-4 py-2 bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 rounded-xl text-sm font-semibold transition-all"
          >
            Create Your First Class
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workplaces.map((w) => (
            <div
              key={w.id}
              className="bg-white dark:bg-[#0f111a] border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full pointer-events-none" />

              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-lg font-bold truncate text-slate-800 dark:text-zinc-100">{w.name}</h3>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 truncate mt-0.5">{w.subjectDetails}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                      w.isLive
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 animate-pulse'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border border-slate-200/30 dark:border-zinc-700/30'
                    }`}
                  >
                    <Radio size={10} />
                    {w.isLive ? 'Live' : 'Offline'}
                  </span>
                </div>

                <div className="space-y-2.5 my-5 text-sm text-slate-600 dark:text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-slate-400" />
                    <span>Approved Students: <strong className="text-slate-800 dark:text-zinc-100 font-bold">{w.studentCount}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-slate-400" />
                    <span className="truncate">Network IP: <code className="font-mono text-xs bg-slate-50 dark:bg-zinc-900 px-1.5 py-0.5 rounded">{w.pinnedIP}</code></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Key size={16} className="text-slate-400" />
                    <div className="flex items-center gap-1.5">
                      <span>Join Code: <strong className="font-mono text-blue-600 dark:text-blue-400 font-bold">{w.joinCode}</strong></span>
                      <button
                        onClick={() => handleCopyCode(w.id, w.joinCode)}
                        className="text-slate-400 hover:text-blue-500 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
                        title="Copy Join Code"
                      >
                        {copiedId === w.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* View students button */}
                <button
                  onClick={() => openClassDetail(w.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-xl transition-all border border-blue-100 dark:border-blue-500/20 mb-3"
                >
                  <UserCheck size={14} />
                  View Class Attendance
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4 flex items-center justify-between mt-2">
                {/* Delete button */}
                {confirmDeleteId === w.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-rose-500 font-medium">Confirm delete?</span>
                    <button
                      onClick={() => handleDelete(w.id)}
                      disabled={deletingId === w.id}
                      className="text-[10px] font-bold px-2 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all disabled:opacity-50"
                    >
                      {deletingId === w.id ? '…' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-[10px] font-bold px-2 py-1 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg hover:bg-slate-300 transition-all"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(w.id)}
                    className="flex items-center gap-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 text-xs font-medium transition-colors p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    title="Delete Classroom"
                  >
                    <Trash2 size={14} />
                    <span className="hidden group-hover:inline">Delete</span>
                  </button>
                )}

                <button
                  onClick={() => handleToggle(w.id, w.isLive)}
                  disabled={togglingId === w.id}
                  className="flex items-center gap-1 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 transition-colors"
                  title={w.isLive ? 'Close Attendance Portal' : 'Open Attendance Portal'}
                >
                  {w.isLive ? (
                    <ToggleRight size={38} className="text-emerald-500" />
                  ) : (
                    <ToggleLeft size={38} className="text-slate-300 dark:text-zinc-700" />
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
