import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';

import { JWT_SECRET } from '@/lib/auth';

function isLikelyDatabaseOrInfraError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /POSTGRES|postgres|Neon|connection|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|timeout|database/i.test(msg);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const u = (body as Record<string, unknown>).usernameEmail;
  const p = (body as Record<string, unknown>).password;
  const usernameEmail = typeof u === 'string' ? u.trim().toLowerCase() : '';
  const password = typeof p === 'string' ? p : '';

  if (!usernameEmail || !password) {
    return NextResponse.json({ error: 'missing_credentials' }, { status: 400 });
  }

  try {
    const { AdminUserService } = await import('@/services/AdminUserService');
    const user = await AdminUserService.getUserByUsername(usernameEmail);

    if (!user) {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'account_blocked' }, { status: 403 });
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    } catch (compareErr) {
      console.error('Login bcrypt.compare error:', compareErr);
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
    }

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
    }

    const jwt = await new SignJWT({
      userId: user.id,
      role: user.role,
      username: user.usernameEmail,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, fullName: user.fullName, role: user.role },
    });

    response.cookies.set({
      name: 'auth_token',
      value: jwt,
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    if (isLikelyDatabaseOrInfraError(error)) {
      return NextResponse.json({ error: 'service_unavailable' }, { status: 503 });
    }
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
