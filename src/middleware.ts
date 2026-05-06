import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from '@/lib/auth';

// --- CONFIGURATION ---
const SHARED_API_PREFIXES = ['/api/machines', '/api/materials', '/api/customers'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. ROUTE CLASSIFICATION
  const isApi = pathname.startsWith('/api');
  const isAuthPage = pathname === '/login' || pathname.startsWith('/login/');
  const isApiAuth = pathname.startsWith('/api/auth');
  
  const isWorkerPage = pathname.startsWith('/worker');
  const isWorkerApi = pathname.startsWith('/api/worker');
  
  const isAdminPage = pathname.startsWith('/admin');
  const isSharedApi = SHARED_API_PREFIXES.some(prefix => pathname.startsWith(prefix));
  
  // SECURE DEFAULT: Any API route not specifically for workers, shared, or auth is treated as an admin API
  const isAdminApi = isApi && !isApiAuth && !isWorkerApi && !isSharedApi;

  const requiresAuth = isAdminPage || isWorkerPage || isAdminApi || isWorkerApi || isSharedApi;

  // 2. PUBLIC ROUTES
  if (!requiresAuth || isApiAuth) {
    return NextResponse.next();
  }

  // 3. AUTHENTICATION (Token Extraction)
  const token = request.cookies.get('auth_token')?.value;

  const handleUnauthorized = () => {
    if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', request.url));
  };

  if (!token) return handleUnauthorized();

  // 4. AUTHORIZATION (Role Verification)
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const role = verified.payload.role as 'admin' | 'worker';

    // Role-based redirects for auth pages (logged-in users shouldn't see login)
    if (isAuthPage) {
      return NextResponse.redirect(new URL(role === 'admin' ? '/admin' : '/worker', request.url));
    }

    // Admin constraints
    if ((isAdminPage || isAdminApi) && role !== 'admin') {
      if (isAdminApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      return NextResponse.redirect(new URL('/worker', request.url));
    }

    // Worker/Shared constraints (Admin can access worker routes too)
    if ((isWorkerPage || isWorkerApi || isSharedApi) && !['worker', 'admin'].includes(role)) {
      if (isWorkerApi || isSharedApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  } catch (err) {
    // 5. INVALID TOKEN HANDLING
    const response = handleUnauthorized();
    response.cookies.delete('auth_token');
    return response;
  }
}

export const config = {
  matcher: ['/admin/:path*', '/worker/:path*', '/login', '/api/:path*'],
};
