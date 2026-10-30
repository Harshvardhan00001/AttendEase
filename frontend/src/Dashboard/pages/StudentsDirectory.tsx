import { useState } from 'react';
import { UserCheck, ShieldAlert, CheckCircle, Search, Mail, ShieldCheck, AlertCircle } from 'lucide-react';

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

interface StudentsDirectoryProps {
  pendingStudents: PendingStudent[];
  approvedStudents: ApprovedStudent[];
  onApprove: (studentId: string, workplaceId: string) => Promise<void>;
}

export default function StudentsDirectory({ pendingStudents, approvedStudents, onApprove }: StudentsDirectoryProps) {
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleApprove = async (studentId: string, workplaceId: string, membershipId: string) => {
    setApprovingId(membershipId);
    try {
      await onApprove(studentId, workplaceId);
    } catch (err) {
      console.error(err);
    } finally {
      setApprovingId(null);
    }
  };

  const filteredApproved = approvedStudents.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.workplaceName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* ── SECTION: PENDING APPROVAL REQUESTS ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <ShieldAlert className="text-amber-500" size={18} />
            Pending Authorization Requests
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 font-semibold">
            {pendingStudents.length} awaiting review
          </span>
        </div>

        {pendingStudents.length === 0 ? (
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-400 dark:text-slate-500 font-mono text-xs">
            No pending enrollment requests in queue.
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800/80">
            {pendingStudents.map((req) => (
              <div
                key={req.membershipId}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-base font-mono border border-amber-500/20 shrink-0">
                    {req.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">{req.name}</h4>
                    <p className="text-xs font-mono text-slate-400 dark:text-slate-500 truncate">{req.email}</p>
                    <span className="inline-flex text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md mt-1.5 uppercase border border-indigo-200 dark:border-indigo-900/60">
                      Requested: {req.workplaceName}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleApprove(req.studentId, req.workplaceId, req.membershipId)}
                  disabled={approvingId === req.membershipId}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50 transition-all shrink-0"
                >
                  <UserCheck size={14} />
                  {approvingId === req.membershipId ? 'Authorizing…' : 'Approve Enrollment'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION: APPROVED STUDENTS DIRECTORY ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <CheckCircle className="text-emerald-500" size={18} />
              Approved Roster & Biometric Keys
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              Cryptographically verified students and liveness status.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search by student or class…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-slate-900 dark:text-white transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {filteredApproved.length === 0 ? (
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-slate-400 dark:text-slate-500 text-xs font-mono">
            {searchTerm ? 'No student records match search criteria.' : 'Roster directory empty. Deploy classrooms to begin enrolling.'}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredApproved.map((student) => (
              <div
                key={student.membershipId}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-600 text-white flex items-center justify-center font-bold text-base font-mono shadow-sm shrink-0">
                    {student.avatarUrl ? (
                      <img src={student.avatarUrl} alt={student.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      student.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">{student.name}</h4>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono text-[11px]">
                      <span className="flex items-center gap-1"><Mail size={12} className="text-slate-400" />{student.email}</span>
                      <span>&bull;</span>
                      <span>Class: <strong className="font-semibold text-slate-700 dark:text-slate-300 font-sans">{student.workplaceName}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">Biometrics:</span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border ${
                      student.hasBiometrics
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                    }`}
                  >
                    {student.hasBiometrics ? (
                      <>
                        <ShieldCheck size={11} className="text-emerald-500" />
                        <span>Enrolled & Ready</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={11} className="text-rose-500" />
                        <span>Missing Setup</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
