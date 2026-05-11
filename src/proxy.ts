import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from '@/lib/auth';

// --- CONFIGURATION ---
const SHARED_API_PREFIXES = ['/api/machines', '/api/materials', '/api/customers', '/api/categories'];

const ADMIN_PANEL_ROLES = ['admin', 'viewer'];
const WORKER_APP_ROLES = ['worker', 'admin'];
const SHARED_READ_ROLES = ['worker', 'admin', 'viewer'];

/** Strażnik Edge JWT/ról — konwencja Next.js 16: `proxy` zamiast `middleware`. */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. ROUTE CLASSIFICATION
  const isApi = pathname.startsWith('/api');
  const isAuthPage = pathname === '/login' || pathname.startsWith('/login/');
  const isApiAuth = pathname.startsWith('/api/auth');

  const isWorkerPage = pathname.startsWith('/worker');
  const isWorkerApi = pathname.startsWith('/api/worker');

  const isAdminPage = pathname.startsWith('/admin');
  const isSharedApi = SHARED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));

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

  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

  // 4. AUTHORIZATION (Role Verification)
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const role = verified.payload.role as string;

    // Role-based redirects for auth pages (logged-in users shouldn't see login)
    if (isAuthPage) {
      const dest = role === 'worker' ? '/worker' : '/admin';
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // Panel administratora (admin + podgląd)
    if (isAdminPage || isAdminApi) {
      if (!ADMIN_PANEL_ROLES.includes(role)) {
        if (isAdminApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        return NextResponse.redirect(new URL('/worker', request.url));
      }
      if (isAdminApi && isMutation && role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Aplikacja pracownika + API worker (bez konta podgląd)
    if (isWorkerPage || isWorkerApi) {
      if (!WORKER_APP_ROLES.includes(role)) {
        if (isWorkerApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }

    // API współdzielone (GET: worker/admin/viewer; mutacje: wyłącznie admin — dodatkowo chronione w route handlers)
    if (isSharedApi) {
      if (!SHARED_READ_ROLES.includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (isMutation && role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.next();
  } catch {
    const response = handleUnauthorized();
    response.cookies.delete('auth_token');
    return response;
  }
}

export const config = {
  matcher: ['/admin/:path*', '/worker/:path*', '/login', '/api/:path*'],
};
