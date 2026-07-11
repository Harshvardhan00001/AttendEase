import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Membership } from '../models/Membership.js';
import { Workplace } from '../models/Workplace.js';
import { AttendanceLog } from '../models/AttendanceLog.js';
import { verifyAuth } from '../middlewares/verifyAuth.js';
import { isSimilarIP } from '../middlewares/verifyNetwork.js';
import { getTodayUtcBounds } from '../utils/attendanceDate.js';
import { respondWithServerError } from '../utils/errorResponse.js';

const router = Router();

// GET /api/auth/dashboard/student
router.get('/dashboard/student', verifyAuth, async (req: Request, res: Response): Promise<Response | void> => {
  try {
    if ((req as any).role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied: Students only.' });
    }

    const userId = (req as any).userId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID.' });
    }

    const user = await User.findById(userId).select('username email avatarUrl isActive createdAt');
    if (!user || user.isActive === false) {
      return res.status(404).json({ success: false, message: 'User not found or deactivated.' });
    }

    const profile = {
      id: user._id,
      name: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl || null,
    };

    // Extract client IP address, handling x-forwarded-for headers
    let clientIp = '';
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      if (Array.isArray(xForwardedFor)) {
        clientIp = xForwardedFor[0] || '';
      } else {
        clientIp = xForwardedFor.split(',')[0]?.trim() || '';
      }
    } else {
      clientIp = req.socket.remoteAddress || '';
    }

    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.substring(7);
    }
    if (clientIp === '::1' || clientIp === 'localhost') {
      clientIp = '127.0.0.1';
    }

    // Fetch all memberships of this student
    const memberships = await Membership.find({ studentId: userId }).populate({
      path: 'workplaceId',
      model: 'Workplace',
      select: 'name subjectDetails isLive createdBy pinnedIP',
    });

    // Filter out any orphaned memberships
    const filteredMemberships = memberships.filter((m: any) => m.workplaceId);
    const workplaceIds = filteredMemberships.map((m: any) => m.workplaceId._id);

    const { start, end } = getTodayUtcBounds();
    const todayLogs = workplaceIds.length
      ? await AttendanceLog.find({
          studentId: userId,
          workplaceId: { $in: workplaceIds },
          timestamp: { $gte: start, $lte: end },
        }).select('workplaceId')
      : [];

    const checkedInTodaySet = new Set(todayLogs.map((log) => log.workplaceId.toString()));

    const workplaces = filteredMemberships.map((m: any) => {
      const workplaceId = m.workplaceId._id.toString();

      // Count attendance logs for this student in this workplace
      return AttendanceLog.countDocuments({
        studentId: userId,
        workplaceId: m.workplaceId._id,
      }).then((logsCount) => ({
        id: m.workplaceId._id,
        name: m.workplaceId.name,
        subjectDetails: m.workplaceId.subjectDetails,
        pinnedIP: m.workplaceId.pinnedIP,
        status: m.status,
        attendancePct: logsCount > 0 ? 100 : 0,
        activeSession: m.workplaceId.isLive,
        hasBiometrics: !!(m.faceDescriptor && m.faceDescriptor.length === 128),
        networkMatched: isSimilarIP(clientIp, m.workplaceId.pinnedIP),
        checkedInToday: checkedInTodaySet.has(workplaceId),
      }));
    });

    const filteredWorkplaces = await Promise.all(workplaces);

    // Fetch student attendance logs
    const logs = await AttendanceLog.find({ studentId: userId })
      .populate({
        path: 'workplaceId',
        model: 'Workplace',
        select: 'name',
      })
      .sort({ timestamp: -1 });

    const attendance = logs.map((log: any) => ({
      id: log._id,
      workplaceName: log.workplaceId?.name || 'Classroom',
      date: new Date(log.timestamp).toISOString().split('T')[0] || 'Unknown Date',
      status: log.status, // 'present'
      networkVerified: log.networkVerified,
    }));

    return res.status(200).json({
      success: true,
      profile,
      clientIp,
      workplaces: filteredWorkplaces,
      attendance,
    });
  } catch (err: unknown) {
    return respondWithServerError(res, 'Student Dashboard', err);
  }
});

export default router;
