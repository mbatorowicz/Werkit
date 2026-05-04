import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname === '/login' || pathname.startsWith('/login/');
  const isAdminPage = pathname.startsWith('/admin');
  const isWorkerPage = pathname.startsWith('/worker');
  const isApiRoute = pathname.startsWith('/api');
  const isApiAuthRoute = pathname.startsWith('/api/auth');
  const isWorkerApi = pathname.startsWith('/api/worker');
  
  // SECURE DEFAULT: Any API route not specifically for workers or auth is treated as an admin API
  const isAdminApi = isApiRoute && !isApiAuthRoute && !isWorkerApi;

  // If it's not a protected route, let it pass (e.g. public assets, root, etc)
  if (!isAdminPage && !isWorkerPage && !isAuthRoute && !isAdminApi && !isWorkerApi && !isApiAuthRoute) {
    return NextResponse.next();
  }

  // Allow login/logout APIs
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // Handle missing token
  if (!token) {
    if (isAdminApi || isWorkerApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isAdminPage || isWorkerPage) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Verify token
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

    if (isAdminPage || isAdminApi) {
      if (role !== 'admin') {
        if (isAdminApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        return NextResponse.redirect(new URL('/worker', request.url));
      }
    }

    if (isWorkerPage || isWorkerApi) {
      if (role !== 'worker' && role !== 'admin') {
        if (isWorkerApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    return NextResponse.next();
  } catch (err) {
    // Token is invalid or expired
    if (isAdminApi || isWorkerApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth_token');
    return response;
  }
}

export const config = {
  matcher: ['/admin/:path*', '/worker/:path*', '/login', '/api/:path*'],
};
