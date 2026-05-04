import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn("WARNING: JWT_SECRET is not defined in environment variables. Using fallback. This is a severe security risk in production.");
  }
  return new TextEncoder().encode(secret || 'super-secret-fallback');
};

export const JWT_SECRET = getJwtSecret();

export interface JwtPayload {
  userId: number;
  role: string;
}

/**
 * Parses and verifies the JWT token from cookies.
 * Returns the decoded payload if valid, null otherwise.
 */
export async function getAuthSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as unknown as JwtPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Returns the userId from the current session or null if unauthenticated.
 */
export async function getUserId(): Promise<number | null> {
  const session = await getAuthSession();
  return session ? session.userId : null;
}

/**
 * Returns the user role from the current session or null if unauthenticated.
 */
export async function getUserRole(): Promise<string | null> {
  const session = await getAuthSession();
  return session ? session.role : null;
}
