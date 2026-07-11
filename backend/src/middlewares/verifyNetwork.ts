import type { Request, Response, NextFunction } from 'express';
import { Workplace } from '../models/Workplace.js';

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

  // Fallback: if either is localhost/loopback, they are considered similar for local dev convenience
  if (a === '127.0.0.1' || b === '127.0.0.1') {
    return true;
  }

  return false;
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

    // Extract client IP address, handling x-forwarded-for headers
    let clientIp = '';
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      if (Array.isArray(xForwardedFor)) {
        clientIp = xForwardedFor[0] || '';
      } else {
        clientIp = xForwardedFor.split(',')[0]?.trim() || '';
      }
    } else {
      clientIp = req.socket.remoteAddress || '';
    }

    const pinnedIp = workplace.pinnedIP.trim();
    (req as any).networkVerified = isSimilarIP(clientIp, pinnedIp);
    
    next();
  } catch (error) {
    console.error('[verifyNetwork] Error:', error);
    (req as any).networkVerified = false;
    next();
  }
};

