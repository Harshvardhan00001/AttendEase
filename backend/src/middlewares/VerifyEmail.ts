import type { Request, Response, NextFunction } from 'express';
import dns from 'dns/promises';

export const verifyEmailDomain = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<Response | void> => {
    const { email } = req.body as { email?: string };

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email field is required.' });
    }

    // Named capture group makes the extracted value accessible via match.groups.domain
    const emailRegex = /^[^\s@]+@(?<domain>[^\s@]+\.[^\s@]+)$/;
    const match = email.match(emailRegex);
    const domain = match?.groups?.domain?.toLowerCase();

    if (!domain) {
        return res.status(400).json({ success: false, message: 'Invalid email syntax format.' });
    }

    // --- DEVELOPMENT OVERRIDE BYPASS ---
    const allowedDevDomains: string[] = ['test.com', 'example.com', 'localhost.com'];
    if (process.env.NODE_ENV !== 'production' && allowedDevDomains.includes(domain)) {
        return next(); // Skip MX checks for mock testing data
    }

    // --- PRODUCTION VALIDATION ENGINE ---
    try {
        // Resolve Mail Exchanger (MX) records for the domain to see if the mail server exists
        const mxRecords = await dns.resolveMx(domain);

        if (!mxRecords || mxRecords.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'The email domain does not have valid mail routing records (MX).'
            });
        }

        return next(); // Domain exists, pass control to controller execution
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: `Verification failed: Domain '@${domain}' does not exist or cannot accept mail.`,
            error: error.code || error.message
        });
    }
};