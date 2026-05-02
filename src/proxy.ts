import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-fallback');

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

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
  matcher: ['/admin/:path*', '/worker/:path*', '/'],
};
