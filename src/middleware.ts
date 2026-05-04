import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-fallback');

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith('/login');
  const isAdminRoute = pathname.startsWith('/admin');
  const isWorkerRoute = pathname.startsWith('/worker');
  const isApiAuthRoute = pathname.startsWith('/api/auth');

  if (!isAdminRoute && !isWorkerRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  if (!token) {
    if (isAdminRoute || isWorkerRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const role = verified.payload.role as string;

    if (isAuthRoute) {
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else {
        return NextResponse.redirect(new URL('/worker', request.url));
      }
    }

    if (isAdminRoute && role !== 'admin') {
      return NextResponse.redirect(new URL('/worker', request.url));
    }

    // Optional: if worker routes shouldn't be accessed by admin (or they can be, up to business logic)
    // For now, allow admin to access worker routes or just keep strict separation
    if (isWorkerRoute && role !== 'worker' && role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  } catch (err) {
    // Token is invalid or expired
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth_token');
    return response;
  }
}

export const config = {
  matcher: ['/admin/:path*', '/worker/:path*', '/login'],
};
