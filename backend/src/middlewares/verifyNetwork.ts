import type { Request, Response, NextFunction } from 'express';
import { Workplace } from '../models/Workplace.js';

const isProd = process.env.NODE_ENV === 'production';

export const isSimilarIP = (ip1: string, ip2: string): boolean => {
  const cleanIp = (ip: string) => {
    let clean = ip.trim();
    if (clean.startsWith('::ffff:')) {
      clean = clean.substring(7);
    }
    if (clean === '::1' || clean === 'localhost') {
      return '127.0.0.1';
    }
    return clean;
  };

  const a = cleanIp(ip1);
  const b = cleanIp(ip2);

  if (a === b) return true;

  // Check if they share the same subnet (first 3 octets for IPv4)
  const isIPv4 = (ip: string) => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip);
  if (isIPv4(a) && isIPv4(b)) {
    const octetsA = a.split('.');
    const octetsB = b.split('.');
    if (octetsA[0] === octetsB[0] && octetsA[1] === octetsB[1] && octetsA[2] === octetsB[2]) {
      return true;
    }
  }

  // Fallback: treat localhost/loopback as "similar" ONLY outside production.
  // This is a dev convenience so local testing doesn't require a real network match.
  // Gating it behind isProd prevents a misconfigured proxy or edge case from
  // silently auto-passing network verification in production.
  if (!isProd && (a === '127.0.0.1' || b === '127.0.0.1')) {
    return true;
  }

  return false;
};

// Extracts the real client IP from the request, handling x-forwarded-for
// (needed since Render and most hosts sit behind a reverse proxy).
// Exported so other places (e.g. auto-capturing a teacher's IP on workplace
// creation) can reuse the exact same extraction logic as verifyNetwork.
export const extractClientIp = (req: Request): string => {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    if (Array.isArray(xForwardedFor)) {
      return xForwardedFor[0] || '';
    }
    return xForwardedFor.split(',')[0]?.trim() || '';
  }
  return req.socket.remoteAddress || '';
};

export const verifyNetwork = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { workplaceId } = req.params;

  if (!workplaceId) {
    (req as any).networkVerified = false;
    return next();
  }

  try {
    const workplace = await Workplace.findById(workplaceId);
    if (!workplace) {
      (req as any).networkVerified = false;
      return next();
    }

    const clientIp = extractClientIp(req);
    const pinnedIp = workplace.pinnedIP.trim();
    (req as any).networkVerified = isSimilarIP(clientIp, pinnedIp);

    next();
  } catch (error) {
    console.error('[verifyNetwork] Error:', error);
    (req as any).networkVerified = false;
    next();
  }
};