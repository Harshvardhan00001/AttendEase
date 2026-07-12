// Student Registration
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { username, password, email } = req.body;

        if (!username || !password || !email) {
            return res.status(400).json({ success: false, message: 'username, password, and email are required.' });
        }

        // Check for existing username or email
        const existing = await User.findOne({ $or: [{ username }, { email }] });
        if (existing) {
            const field = existing.username === username ? 'Username' : 'Email';
            return res.status(409).json({ success: false, message: `${field} is already taken.` });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ username, password: hashedPassword, email });
        await newUser.save();

        res.status(201).json({ success: true, message: 'Student registered successfully!' });
    } catch (error) {
        console.error('[Student Register Error]', error);
        res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
    }
});

export default router;
