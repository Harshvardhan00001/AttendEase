import type { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { Workplace } from '../models/Workplace.js';
import { Membership } from '../models/Membership.js';
import { AttendanceLog } from '../models/AttendanceLog.js';
import { User } from '../models/User.js';
import { notifyAttendanceToggled, notifyAttendanceMarked } from '../socket.js';
import { extractClientIp } from '../middlewares/verifyNetwork.js';
import { getTodayUtcBounds } from '../utils/attendanceDate.js';
import { respondWithServerError } from '../utils/errorResponse.js';

// ── ZOD SCHEMAS ───────────────────────────────────────────────

const createWorkplaceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subjectDetails: z.string().min(1, 'Subject details are required'),
});

const requestToJoinSchema = z.object({
  joinCode: z.string().min(1, 'Join code is required'),
});

const approveStudentSchema = z.object({
  studentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid student ID format'),
  workplaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid workplace ID format'),
});

const uploadFaceBiometricsSchema = z.object({
  workplaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid workplace ID format'),
  faceDescriptor: z.array(z.number()).length(128, 'Face descriptor must be exactly 128 numbers'),
});

const toggleAttendanceSchema = z.object({
  workplaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid workplace ID format'),
  isLive: z.boolean(),
});

const markAttendanceSchema = z.object({
  snapshotDescriptor: z.array(z.number()).length(128, 'Snapshot descriptor must be exactly 128 numbers'),
});

// ── HELPERS ───────────────────────────────────────────────────

const generateJoinCode = async (): Promise<string> => {
  let isUnique = false;
  let code = '';
  while (!isUnique) {
    code = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 character code
    const existing = await Workplace.findOne({ joinCode: code });
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
};

const calculateEuclideanDistance = (arr1: number[], arr2: number[]): number => {
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const diff = (arr1[i] ?? 0) - (arr2[i] ?? 0);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

// ── CONTROLLER IMPLEMENTATIONS ─────────────────────────────────

export const createWorkplace = async (req: Request, res: Response): Promise<Response> => {
  try {
    const parsed = createWorkplaceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.format() });
    }

    const { name, subjectDetails } = parsed.data;
    const userId = (req as any).userId;
    const role = (req as any).role;

    // Check if the user is a teacher or has appropriate rights
    if (role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Forbidden. Only teachers can create workplaces.' });
    }

    const joinCode = await generateJoinCode();

    // Auto-capture the teacher's current IP as the classroom's pinned network,
    // instead of requiring manual entry. The teacher is making this exact
    // request from the classroom network at creation time, so this is a
    // more reliable source of truth than a hand-typed IP address.
    const pinnedIP = extractClientIp(req) || '127.0.0.1';

    const workplace = new Workplace({
      name,
      subjectDetails,
      createdBy: userId,
      pinnedIP,
      isLive: false,
      joinCode,
    });

    await workplace.save();

    // NOTE: was res.status(210) — 210 is not a standard HTTP status code.
    // 201 Created is correct for a successful resource-creation response.
    return res.status(201).json({
      success: true,
      message: 'Workplace created successfully.',
      workplace,
    });
  } catch (error: unknown) {
    return respondWithServerError(res, 'createWorkplace', error);
  }
};

export const requestToJoin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const parsed = requestToJoinSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.format() });
    }

    const { joinCode } = parsed.data;
    const studentId = (req as any).userId;

    const workplace = await Workplace.findOne({ joinCode });
    if (!workplace) {
      return res.status(404).json({ success: false, message: 'Workplace not found with the provided join code.' });
    }

    // Check for existing membership
    const existingMembership = await Membership.findOne({ workplaceId: workplace._id, studentId });
    if (existingMembership) {
      return res.status(400).json({
        success: false,
        message: 'Membership request already exists or is already approved.',
        status: existingMembership.status,
      });
    }

    const membership = new Membership({
      workplaceId: workplace._id,
      studentId,
      status: 'pending_approval',
    });

    await membership.save();

    return res.status(201).json({
      success: true,
      message: 'Join request submitted successfully. Waiting for teacher approval.',
      membership,
    });
  } catch (error: unknown) {
    return respondWithServerError(res, 'requestToJoin', error);
  }
};

export const approveStudent = async (req: Request, res: Response): Promise<Response> => {
  try {
    const parsed = approveStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.format() });
    }

    const { studentId, workplaceId } = parsed.data;
    const teacherId = (req as any).userId;

    // Verify workplace ownership
    const workplace = await Workplace.findById(workplaceId);
    if (!workplace) {
      return res.status(404).json({ success: false, message: 'Workplace not found.' });
    }

    if (workplace.createdBy.toString() !== teacherId) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not own this workplace.' });
    }

    const membership = await Membership.findOne({ workplaceId, studentId });
    if (!membership) {
      return res.status(404).json({ success: false, message: 'Membership request not found.' });
    }

    membership.status = 'approved';
    await membership.save();

    return res.status(200).json({
      success: true,
      message: 'Student approved successfully.',
      membership,
    });
  } catch (error: unknown) {
    return respondWithServerError(res, 'approveStudent', error);
  }
};

export const uploadFaceBiometrics = async (req: Request, res: Response): Promise<Response> => {
  try {
    const parsed = uploadFaceBiometricsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.format() });
    }

    const { workplaceId, faceDescriptor } = parsed.data;
    const studentId = (req as any).userId;

    const membership = await Membership.findOne({ workplaceId, studentId });
    if (!membership) {
      return res.status(404).json({ success: false, message: 'Membership not found for this workplace.' });
    }

    if (membership.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You must be approved by the teacher before uploading face biometrics.',
      });
    }

    membership.faceDescriptor = faceDescriptor;
    await membership.save();

    return res.status(200).json({
      success: true,
      message: 'Face biometrics uploaded and saved successfully.',
    });
  } catch (error: unknown) {
    return respondWithServerError(res, 'uploadFaceBiometrics', error);
  }
};

export const toggleAttendanceWindow = async (req: Request, res: Response): Promise<Response> => {
  try {
    const parsed = toggleAttendanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.format() });
    }

    const { workplaceId, isLive } = parsed.data;
    const teacherId = (req as any).userId;

    const workplace = await Workplace.findById(workplaceId);
    if (!workplace) {
      return res.status(404).json({ success: false, message: 'Workplace not found.' });
    }

    if (workplace.createdBy.toString() !== teacherId) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not own this workplace.' });
    }

    workplace.isLive = isLive;
    await workplace.save();

    // Broadcast the status toggle to all connected clients in the workplace room
    notifyAttendanceToggled(workplaceId, isLive);

    return res.status(200).json({
      success: true,
      message: `Attendance window is now ${isLive ? 'open (live)' : 'closed'}.`,
      isLive,
    });
  } catch (error: unknown) {
    return respondWithServerError(res, 'toggleAttendanceWindow', error);
  }
};

export const markAttendance = async (req: Request, res: Response): Promise<Response> => {
  try {
    const workplaceId = req.params.workplaceId as string;
    if (!workplaceId) {
      return res.status(400).json({ success: false, message: 'Workplace ID parameter is required.' });
    }

    const parsed = markAttendanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.format() });
    }

    const { snapshotDescriptor } = parsed.data;
    const studentId = (req as any).userId;
    const username = (req as any).username;
    const networkVerified = !!(req as any).networkVerified;

    // Verify workplace is live
    const workplace = await Workplace.findById(workplaceId);
    if (!workplace) {
      return res.status(404).json({ success: false, message: 'Workplace not found.' });
    }

    if (!workplace.isLive) {
      return res.status(400).json({ success: false, message: 'Attendance window is closed for this workplace.' });
    }

    // ── NETWORK VERIFICATION ENFORCEMENT ─────────────────────────
    // Previously `networkVerified` was only recorded on the log and never
    // actually checked here, so a student off the registered network could
    // still mark attendance. Per the spec (docs/architecture.md §3 / plan.md),
    // both network AND face checks must pass before attendance is accepted.
    if (!networkVerified) {
      return res.status(403).json({
        success: false,
        message: 'Network verification failed. You must be on the classroom network to mark attendance.',
      });
    }

    // Verify approved membership and biometrics
    const membership = await Membership.findOne({ workplaceId, studentId });
    if (!membership) {
      return res.status(404).json({ success: false, message: 'Membership not found for this workplace.' });
    }

    if (membership.status !== 'approved') {
      return res.status(403).json({ success: false, message: 'Forbidden. Student is not approved for this workplace.' });
    }

    if (!membership.faceDescriptor || membership.faceDescriptor.length !== 128) {
      return res.status(400).json({ success: false, message: 'Biometrics are not set up. Please upload face descriptor first.' });
    }

    // Perform face comparison via Euclidean distance
    const distance = calculateEuclideanDistance(snapshotDescriptor, membership.faceDescriptor);
    if (distance > 0.6) {
      return res.status(400).json({
        success: false,
        message: 'Face biometric verification failed. Please try again in good lighting.',
      });
    }

    const { start, end } = getTodayUtcBounds();
    const existingToday = await AttendanceLog.findOne({
      studentId,
      workplaceId,
      timestamp: { $gte: start, $lte: end },
    });

    if (existingToday) {
      return res.status(409).json({
        success: false,
        message: 'You have already checked in for this class today.',
        alreadyCheckedIn: true,
      });
    }

    // Save Attendance Log
    const log = new AttendanceLog({
      studentId,
      workplaceId,
      timestamp: new Date(),
      status: 'present',
      networkVerified,
    });

    await log.save();

    // Emit real-time attendance marked notification to teacher room
    notifyAttendanceMarked(workplaceId, {
      studentId,
      username,
      timestamp: log.timestamp,
      networkVerified,
    });

    return res.status(201).json({
      success: true,
      message: 'Attendance marked successfully.',
      log,
    });
  } catch (error: unknown) {
    return respondWithServerError(res, 'markAttendance', error);
  }
};

export const deleteWorkplace = async (req: Request, res: Response): Promise<Response> => {
  try {
    const workplaceId = req.params.workplaceId as string;
    if (!workplaceId) {
      return res.status(400).json({ success: false, message: 'Workplace ID parameter is required.' });
    }

    const teacherId = (req as any).userId;
    const role = (req as any).role;

    if (role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Forbidden. Only teachers can delete workplaces.' });
    }

    const workplace = await Workplace.findById(workplaceId);
    if (!workplace) {
      return res.status(404).json({ success: false, message: 'Workplace not found.' });
    }
    if (workplace.createdBy.toString() !== teacherId) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not own this workplace.' });
    }

    // Delete memberships and attendance logs
    await Membership.deleteMany({ workplaceId });
    await AttendanceLog.deleteMany({ workplaceId });
    await Workplace.findByIdAndDelete(workplaceId);

    return res.status(200).json({ success: true, message: 'Workplace deleted successfully.' });
  } catch (error: unknown) {
    return respondWithServerError(res, 'deleteWorkplace', error);
  }
};

export const getClassAttendance = async (req: Request, res: Response): Promise<Response> => {
  try {
    const workplaceId = req.params.workplaceId as string;
    if (!workplaceId) {
      return res.status(400).json({ success: false, message: 'Workplace ID parameter is required.' });
    }

    const teacherId = (req as any).userId;
    const role = (req as any).role;

    if (role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Forbidden. Teachers only.' });
    }

    const workplace = await Workplace.findById(workplaceId);
    if (!workplace) {
      return res.status(404).json({ success: false, message: 'Workplace not found.' });
    }
    if (workplace.createdBy.toString() !== teacherId) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not own this workplace.' });
    }

    // All approved members
    const memberships = await Membership.find({ workplaceId, status: 'approved' }).populate({
      path: 'studentId',
      select: 'username email avatarUrl',
      model: 'User',
    });

    // All attendance logs for this workplace
    const logs = await AttendanceLog.find({ workplaceId }).sort({ timestamp: -1 });

    // Build a lookup: studentId -> list of logs
    const logMap = new Map<string, typeof logs>();
    for (const log of logs) {
      const sid = log.studentId.toString();
      if (!logMap.has(sid)) logMap.set(sid, []);
      logMap.get(sid)!.push(log);
    }

    const students = memberships.map((m: any) => {
      const sid = m.studentId?._id?.toString() ?? '';
      const studentLogs = logMap.get(sid) ?? [];
      const presentCount = studentLogs.length;
      return {
        studentId: sid,
        name: m.studentId?.username ?? 'Unknown',
        email: m.studentId?.email ?? '',
        avatarUrl: m.studentId?.avatarUrl ?? '',
        hasBiometrics: !!(m.faceDescriptor && m.faceDescriptor.length === 128),
        presentCount,
        lastSeen: studentLogs[0]?.timestamp ?? null,
        logs: studentLogs.map((l) => ({
          id: l._id,
          timestamp: l.timestamp,
          networkVerified: l.networkVerified,
          status: l.status,
        })),
      };
    });

    return res.status(200).json({
      success: true,
      workplace: {
        id: workplace._id,
        name: workplace.name,
        subjectDetails: workplace.subjectDetails,
        isLive: workplace.isLive
      },
      students
    });
  } catch (error: unknown) {
    return respondWithServerError(res, 'getClassAttendance', error);
  }
};