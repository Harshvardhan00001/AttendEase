// 1. Student Registration
import express from 'express';

import bcrypt from 'bcryptjs';

import { User } from '../models/User.js';


const app = express();
app.use(express.json());
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ username, password: hashedPassword, email });
        await newUser.save();

        res.status(201).json({ success: true, message: "Student registered successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Registration failed. Username might be taken." });
    }
});
