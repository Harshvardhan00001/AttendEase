import express from 'express';
import type { Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from './models/User.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB Free Tier
mongoose.connect(process.env.MONGO_URI || '')
  .then(() => console.log("Connected securely to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB link failure:", err));





app.listen(PORT, () => {
  console.log(`TypeScript server handling sessions on http://localhost:${PORT}`);
});