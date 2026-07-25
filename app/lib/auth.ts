// lib/auth.ts
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export function getAuthUser(request: NextRequest): AuthPayload | null {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;

  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

  try {
    return jwt.verify(token, jwtSecret) as AuthPayload;
  } catch {
    return null; // expired or tampered token
  }
}