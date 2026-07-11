import { Router } from 'express';
import { verifyAuth } from '../middlewares/verifyAuth.js';
import { verifyNetwork } from '../middlewares/verifyNetwork.js';
import {
  createWorkplace,
  requestToJoin,
  approveStudent,
  uploadFaceBiometrics,
  toggleAttendanceWindow,
  markAttendance,
  deleteWorkplace,
  getClassAttendance,
} from '../controllers/workplaceController.js';

const router = Router();

// All workplace routes require authenticated users
router.use(verifyAuth);

// Teachers: Create new workplace (metadata + pinnedIP)
router.post('/create', createWorkplace);

// Students: Submit joinCode to request joining a workplace
router.post('/join', requestToJoin);

// Teachers: Approve a student's pending membership
router.post('/approve', approveStudent);

// Students: Upload initial face biometrics (128-float vector)
router.post('/biometrics', uploadFaceBiometrics);

// Teachers: Open/close the attendance window (toggles isLive status)
router.post('/toggle-live', toggleAttendanceWindow);

// Teachers: Delete a workplace (cascades memberships + attendance)
router.delete('/:workplaceId', deleteWorkplace);

// Teachers: Get full student attendance list for a classroom
router.get('/:workplaceId/students', getClassAttendance);

// Students: Mark attendance (checks network IP + compares snapshot biometric face vector)
router.post('/:workplaceId/attendance', verifyNetwork, markAttendance);

export default router;
