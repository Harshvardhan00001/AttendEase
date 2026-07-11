import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const verifyAuth = (req: Request, res: Response, next: NextFunction): Response | void => {
    const authHeader = req.headers.authorization;
    const token =
        (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
        (req.cookies?.token ?? '');

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided.' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || '') as {
            userId: string;
            role: string;
            email?: string;
            username?: string;
        };

        (req as any).userId = payload.userId;
        (req as any).role = payload.role;
        (req as any).email = payload.email;
        (req as any).username = payload.username;

        return next();
    } catch (err) {
        console.error('[verifyAuth] Invalid token:', err);
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};
