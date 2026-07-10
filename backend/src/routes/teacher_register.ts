// Teacher Auth Routes — Register & Login
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Teacher } from '../models/Teacher.js';

const router = Router();

// ─────────────────────────────────────────────
// POST /api/auth/teacher/register
// ─────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { name, email, password, department } = req.body;

        // 1. Required field validation
        if (!name || !email || !password || !department) {
            return res.status(400).json({
                success: false,
                message: 'name, email, password, and department are all required.',
            });
        }

        // 2. Check for duplicate email
        const existingTeacher = await Teacher.findOne({ email: email.toLowerCase() });
        if (existingTeacher) {
            return res.status(409).json({
                success: false,
                message: 'Email is already registered.',
            });
        }

        // 3. Hash the password before storing
        const hashedPassword = await bcrypt.hash(password, 12);

        // 4. Create and save the new teacher document
        const newTeacher = new Teacher({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            department: department.trim(),
        });
        await newTeacher.save();

        res.status(201).json({
            success: true,
            message: 'Teacher registered successfully.',
            teacher: {
                id: newTeacher._id,
                name: newTeacher.name,
                email: newTeacher.email,
                department: newTeacher.department,
            },
        });
    } catch (error) {
        console.error('[Teacher Register Error]', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

// ─────────────────────────────────────────────
// POST /api/auth/teacher/login
// ─────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // 1. Basic field validation
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        // 2. Find teacher by email
        const teacher = await Teacher.findOne({ email: email.toLowerCase() });
        if (!teacher) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // 3. Check if account is active
        if (!teacher.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account has been deactivated. Contact admin.',
            });
        }

        // 4. Verify password against stored hash
        const passwordMatch = await bcrypt.compare(password, teacher.password);
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // 5. Sign a new JWT with role embedded
        const token = jwt.sign(
            {
                userId: teacher._id,
                email: teacher.email,
                role: 'teacher',
            },
            process.env.JWT_SECRET || '',
            { expiresIn: '1d' }
        );

        // 6. OVERWRITE session token — drops access on any previously logged-in device instantly
        teacher.currentSessionToken = token;
        await teacher.save();

        // 7. Respond — never send the password hash back
        res.status(200).json({
            success: true,
            message: 'Login successful.',
            token,
            teacher: {
                id: teacher._id,
                name: teacher.name,
                email: teacher.email,
                department: teacher.department,
            },
        });
    } catch (error) {
        console.error('[Teacher Login Error]', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

export default router;
