import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const DEFAULT_JWT_SECRET = 'backend-a-jwt-secret-change-in-production';

export function createAuthenticateToken({
  jwtVerifier = jwt,
  jwtSecret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
} = {}) {
  return function authenticateToken(req, res, next) {
    const header = req.headers.authorization;

    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authorization token is required',
      });
    }

    const token = header.slice('Bearer '.length).trim();

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Authorization token is required',
      });
    }

    try {
      const payload = jwtVerifier.verify(token, jwtSecret);
      req.user = payload;
      return next();
    } catch (error) {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid or expired token',
      });
    }
  };
}

export const authenticateToken = createAuthenticateToken();

export default authenticateToken;
