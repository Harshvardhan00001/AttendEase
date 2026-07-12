import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { Teacher } from '../models/Teacher.js';
import { Workplace } from '../models/Workplace.js';
import { Membership } from '../models/Membership.js';
import { verifyAuth } from '../middlewares/verifyAuth.js';

const router = Router();

// GET /api/auth/teacher/dashboard/teacher
router.get('/dashboard/teacher', verifyAuth, async (req: Request, res: Response): Promise<Response | void> => {
  try {
    if ((req as any).role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Access denied: Teachers only.' });
    }

    const teacherId = (req as any).userId;

    if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({ success: false, message: 'Invalid teacher ID.' });
    }

    const teacher = await Teacher.findById(teacherId).select('name email avatarUrl department isActive');
    if (!teacher || teacher.isActive === false) {
      return res.status(404).json({ success: false, message: 'Teacher not found or deactivated.' });
    }

    // Find all workplaces created by this teacher
    const workplaces = await Workplace.find({ createdBy: teacherId });
    const workplaceIds = workplaces.map((w) => w._id);

    // Count statistics
    const totalStudents = await Membership.countDocuments({
      workplaceId: { $in: workplaceIds },
      status: 'approved',
    });

    const activeClassesCount = workplaces.filter((w) => w.isLive).length;

    const pendingAssignments = await Membership.countDocuments({
      workplaceId: { $in: workplaceIds },
      status: 'pending_approval',
    });

    // Get list of pending student memberships with populated student profiles
    const pendingMemberships = await Membership.find({
      workplaceId: { $in: workplaceIds },
      status: 'pending_approval',
    }).populate({
      path: 'studentId',
      select: 'username email avatarUrl',
      model: 'User',
    });

    // Get list of approved students with populated student profiles
    const approvedMemberships = await Membership.find({
      workplaceId: { $in: workplaceIds },
      status: 'approved',
    }).populate({
      path: 'studentId',
      select: 'username email avatarUrl faceDescriptor',
      model: 'User',
    });

    // Map workplaces with student count
    const workplacesData = await Promise.all(
      workplaces.map(async (w) => {
        const studentCount = await Membership.countDocuments({ workplaceId: w._id, status: 'approved' });
        return {
          id: w._id,
          name: w.name,
          subjectDetails: w.subjectDetails,
          joinCode: w.joinCode,
          pinnedIP: w.pinnedIP,
          isLive: w.isLive,
          studentCount,
        };
      })
    );

    const user = {
      id: teacher._id,
      name: teacher.name,
      username: `@${teacher.name.toLowerCase().replace(/\s+/g, '_')}`,
      email: teacher.email,
      avatarUrl: teacher.avatarUrl || '',
      department: teacher.department,
    };

    const stats = {
      totalStudents,
      activeClasses: workplaces.length,
      activeClassesCount, // live count
      attendanceRate: totalStudents > 0 ? 92 : 0, // baseline placeholder or computed
      attendanceChange: 4,
      pendingAssignments, // pending approvals
    };

    return res.status(200).json({
      success: true,
      user,
      stats,
      workplaces: workplacesData,
      pendingStudents: pendingMemberships.map((m: any) => ({
        membershipId: m._id,
        workplaceId: m.workplaceId,
        workplaceName: workplaces.find((w) => w._id.toString() === m.workplaceId.toString())?.name || 'Class',
        studentId: m.studentId?._id,
        name: m.studentId?.username || 'Unknown Student',
        email: m.studentId?.email || '',
        avatarUrl: m.studentId?.avatarUrl || '',
      })),
      approvedStudents: approvedMemberships.map((m: any) => ({
        membershipId: m._id,
        workplaceId: m.workplaceId,
        workplaceName: workplaces.find((w) => w._id.toString() === m.workplaceId.toString())?.name || 'Class',
        studentId: m.studentId?._id,
        name: m.studentId?.username || 'Unknown Student',
        email: m.studentId?.email || '',
        avatarUrl: m.studentId?.avatarUrl || '',
        hasBiometrics: !!(m.faceDescriptor && m.faceDescriptor.length === 128),
      })),
    });
  } catch (err: any) {
    console.error('[Teacher Dashboard Error]', err);
    return res.status(500).json({ success: false, message: err.message || 'Could not load dashboard data.' });
  }
});

export default router;
