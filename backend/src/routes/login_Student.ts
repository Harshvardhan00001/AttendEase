// Student Login — generates JWT and overwrites previous session
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required.' });
        }

        // Find user and explicitly include password (select:false in schema)
        const user = await User.findOne({ username }).select('+password +currentSessionToken');
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // Generate new JWT
        const token = jwt.sign(
            { userId: user._id, username: user.username, role: 'student' },
            process.env.JWT_SECRET || '',
            { expiresIn: '1d' }
        );

        // OVERWRITE session token: drops access on old devices instantly
        user.currentSessionToken = token;
        await user.save();

        res.status(200).json({ success: true, token });
    } catch (error) {
        console.error('[Student Login Error]', error);
        res.status(500).json({ success: false, message: 'Login server error.' });
    }
});

export default router;