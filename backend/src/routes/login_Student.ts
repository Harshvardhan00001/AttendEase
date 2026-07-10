// 2. Student Login (Generates token and overrides previous session)
import express from 'express';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';


const app = express();
app.use(express.json());

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        // Generate new JWT
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET || '',
            { expiresIn: '1d' }
        );

        // OVERWRITE session token: Drops access on old devices instantly
        user.currentSessionToken = token;
        await user.save();

        res.json({ success: true, token });
    } catch (error) {
        res.status(500).json({ error: "Login server error" });
    }
});