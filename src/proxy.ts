import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-fallback');

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  // Zabezpieczenie API
  if (request.nextUrl.pathname.startsWith('/api') && !request.nextUrl.pathname.startsWith('/api/auth')) {
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      const role = verified.payload.role as string;
      const adminOnlyRoutes = ['/api/admin', '/api/materials', '/api/machines', '/api/customers', '/api/categories', '/api/workers', '/api/settings'];
      const isAdminRoute = adminOnlyRoutes.some(route => request.nextUrl.pathname.startsWith(route));
      if (isAdminRoute && role !== 'admin') {
        const isAllowedWorkerGet = request.method === 'GET' && ['/api/materials', '/api/machines', '/api/customers'].some(r => request.nextUrl.pathname.startsWith(r));
        if (!isAllowedWorkerGet) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    } catch (err) {
      return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
    }
  }

  // Zabezpieczenie routingu na /admin oraz /worker
  if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/worker')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      const role = verified.payload.role as string;

      if (request.nextUrl.pathname.startsWith('/admin') && role !== 'admin') {
         return NextResponse.redirect(new URL('/worker', request.url));
      }
      if (request.nextUrl.pathname.startsWith('/worker') && role !== 'worker' && role !== 'admin') {
         return NextResponse.redirect(new URL('/login', request.url));
      }

      return NextResponse.next();
    } catch (err) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Przekierowanie roota, jeśli zalogowany
  if (request.nextUrl.pathname === '/') {
    if (token) {
      try {
        const verified = await jwtVerify(token, JWT_SECRET);
        const role = verified.payload.role as string;
        return NextResponse.redirect(new URL(role === 'admin' ? '/admin' : '/worker', request.url));
      } catch (err) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/worker/:path*', '/', '/api/:path*'],
};
