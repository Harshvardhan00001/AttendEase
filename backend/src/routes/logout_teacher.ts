// Teacher Logout — clears the current session token so the account is locked out on old devices
import { Router, type Request, type Response } from 'express';
import { Teacher } from '../models/Teacher.js';
import { verifyAuth } from '../middlewares/verifyAuth.js';

const router = Router();

// POST /api/auth/teacher/logout
router.post('/logout', verifyAuth, async (req: Request, res: Response) => {
    try {
        const teacherId = (req as any).userId;

        // Wipe session token from DB so the JWT is effectively invalid on the server side
        await Teacher.findByIdAndUpdate(teacherId, { currentSessionToken: '' });

        // Clear the token cookie if the client uses cookie-based auth
        res.clearCookie('token', { httpOnly: true, sameSite: 'strict' });

        res.status(200).json({ success: true, message: 'Teacher logged out successfully.' });
    } catch (err) {
        console.error('[Teacher Logout Error]', err);
        res.status(500).json({ success: false, message: 'Logout failed.' });
    }
});

export default router;
