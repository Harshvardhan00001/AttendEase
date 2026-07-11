import { useState } from 'react';
import { UserCheck, ShieldAlert, CheckCircle, Search, Mail } from 'lucide-react';

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
    <div className="space-y-8">
      {/* ── SECTION: PENDING APPROVAL REQUESTS ── */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <ShieldAlert className="text-amber-500" size={22} />
          Join Requests ({pendingStudents.length})
        </h2>
        {pendingStudents.length === 0 ? (
          <div className="bg-white dark:bg-[#0f111a] border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-6 text-center text-slate-400 dark:text-zinc-500 text-sm">
            No pending enrollment requests.
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0f111a] border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-zinc-800/60">
            {pendingStudents.map((req) => (
              <div
                key={req.membershipId}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-lg border border-amber-500/10 shrink-0">
                    {req.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-zinc-100 truncate">{req.name}</h4>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 truncate">{req.email}</p>
                    <span className="inline-flex text-[10px] font-bold text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10 px-1.5 py-0.5 rounded-md mt-1.5 uppercase tracking-wide">
                      Class: {req.workplaceName}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleApprove(req.studentId, req.workplaceId, req.membershipId)}
                  disabled={approvingId === req.membershipId}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 disabled:opacity-50 transition-all shrink-0"
                >
                  <UserCheck size={14} />
                  {approvingId === req.membershipId ? 'Approving…' : 'Approve Student'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION: APPROVED STUDENTS DIRECTORY ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CheckCircle className="text-emerald-500" size={22} />
            Roster & Biometrics Directory ({approvedStudents.length})
          </h2>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by student or class…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {filteredApproved.length === 0 ? (
          <div className="bg-white dark:bg-[#0f111a] border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-8 text-center text-slate-400 dark:text-zinc-500 text-sm">
            {searchTerm ? 'No matches found in search.' : 'Roster is empty. Set up classrooms and approve students.'}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0f111a] border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-zinc-800/60">
            {filteredApproved.map((student) => (
              <div
                key={student.membershipId}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4 hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-lg border border-blue-500/10 shrink-0">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-zinc-100 truncate">{student.name}</h4>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                      <span className="flex items-center gap-1"><Mail size={12} />{student.email}</span>
                      <span>•</span>
                      <span>Class: <strong className="font-semibold text-slate-600 dark:text-zinc-300">{student.workplaceName}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  <span className="text-xs text-slate-400 dark:text-zinc-500">Biometrics:</span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider border ${
                      student.hasBiometrics
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20'
                        : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20'
                    }`}
                  >
                    {student.hasBiometrics ? 'Registered' : 'Not Uploaded'}
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
