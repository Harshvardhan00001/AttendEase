// Student Logout — clears the current session token so the account is locked out on old devices
import { Router, type Request, type Response } from 'express';
import { User } from '../models/User.js';
import { verifyAuth } from '../middlewares/verifyAuth.js';

const router = Router();

// POST /api/auth/logout
router.post('/logout', verifyAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;

        // Wipe session token from DB so the JWT is effectively invalid on the server side
        await User.findByIdAndUpdate(userId, { currentSessionToken: '' });

        // Clear the token cookie if the client uses cookie-based auth
        res.clearCookie('token', { httpOnly: true, sameSite: 'strict' });

        res.status(200).json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
        console.error('[Student Logout Error]', err);
        res.status(500).json({ success: false, message: 'Logout failed.' });
    }
});

export default router;
