import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { initSocket } from './socket.js';
import { logger } from './utils/logger.js';
import studentRegisterRouter from './routes/Register_students.js';
import studentLoginRouter from './routes/login_Student.js';
import teacherAuthRouter from './routes/teacher_register.js';
import teacherLoginRouter from './routes/teacher_login.js';
import studentLogoutRouter from './routes/logout_student.js';
import teacherLogoutRouter from './routes/logout_teacher.js';
import studentDashboardRouter from './routes/dashboard_student.js';
import teacherDashboardRouter from './routes/dashboard_teacher.js';
import workplaceRouter from './routes/workplaceRoutes.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const isProd = process.env.NODE_ENV === 'production';

if (!process.env.MONGO_URI) {
  logger.error('MONGO_URI is required. Copy backend/.env.example to backend/.env and configure it.');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  logger.error('JWT_SECRET is required. Copy backend/.env.example to backend/.env and configure it.');
  process.exit(1);
}

// ────────────────────────────────────────────────────────
// HARDCODED CORS ORIGIN PATCH
// ────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://attend-ease-ebon.vercel.app' // Added your new clean production Vercel domain
];

app.use(
  cors({
    origin: function (origin, callback) {
      // 1. Allow internal/server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      // 2. Check if the origin matches our whitelist or subdomains
      const isAllowed = allowedOrigins.includes(origin) || origin.includes('vercel.app');

      if (isAllowed) {
        return callback(null, true);
      } else {
        // 3. CRITICAL: Do NOT pass an Error object here. 
        // Just pass null and false. This cleanly strips the CORS header, 
        // allowing the browser to safely reject it without crashing your backend.
        return callback(null, false);
      }
    },
    credentials: true,
    optionsSuccessStatus: 200
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 300 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    env: process.env.NODE_ENV || 'development',
  });
});

// ────────────────────────────────────────────────────────
// MONGOOSE CONNECTION WITH DROP INDEX PATCH
// ────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    logger.info('Connected to MongoDB');
    
    try {
      const db = mongoose.connection.db;
      if (db) {
        // Drop the phantom unique index rule causing the 500 crash
        await db.collection('teachers').dropIndex('employeeId_1');
        logger.info('✅ Successfully removed the broken employeeId unique rule!');
      }
    } catch (err) {
      // Index doesn't exist anymore or collection is fresh; safe to ignore
      logger.info('ℹ️ Legacy index already dropped or does not exist.');
    }
  })
  .catch((err) => {
    logger.error('MongoDB connection failed:', err);
    process.exit(1);
  });

const httpServer = createServer(app);

// Use your exact Vercel production URL for fallback matching in socket initialization
const socketOrigin = 'https://attend-ease-hwmwi4fkc-harshvardhan2672-4132s-projects.vercel.app';
initSocket(httpServer, socketOrigin);

app.use('/api/auth', studentRegisterRouter);
app.use('/api/auth', studentLoginRouter);
app.use('/api/auth', studentLogoutRouter);
app.use('/api/auth', studentDashboardRouter);
app.use('/api/auth/teacher', teacherAuthRouter);
app.use('/api/auth/teacher', teacherLoginRouter);
app.use('/api/auth/teacher', teacherLogoutRouter);
app.use('/api/auth/teacher', teacherDashboardRouter);
app.use('/api/workplace', workplaceRouter);

httpServer.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT} (${isProd ? 'production' : 'development'})`);
});