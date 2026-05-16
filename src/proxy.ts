import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from '@/lib/auth';
import { isSuperadminRole } from '@/lib/tenantContext';

// --- CONFIGURATION ---
const SHARED_API_PREFIXES = ['/api/machines', '/api/materials', '/api/customers', '/api/categories'];

const ADMIN_PANEL_ROLES = ['admin', 'viewer'];
const WORKER_APP_ROLES = ['worker', 'admin'];
const SHARED_READ_ROLES = ['worker', 'admin', 'viewer'];
const PLATFORM_ROLES = ['superadmin'];

function loginRedirectForRole(role: string): string {
  if (isSuperadminRole(role)) return '/platform';
  if (role === 'worker') return '/worker';
  return '/admin';
}

/** Strażnik Edge JWT/ról — konwencja Next.js 16: `proxy` zamiast `middleware`. */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. ROUTE CLASSIFICATION
  const isApi = pathname.startsWith('/api');
  const isAuthPage = pathname === '/login' || pathname.startsWith('/login/');
  const isApiAuth = pathname.startsWith('/api/auth');

  const isPlatformPage = pathname.startsWith('/platform');
  const isPlatformApi = pathname.startsWith('/api/platform');

  const isWorkerPage = pathname.startsWith('/worker');
  const isWorkerApi = pathname.startsWith('/api/worker');

  const isAdminPage = pathname.startsWith('/admin');
  const isSharedApi = SHARED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // SECURE DEFAULT: Any API route not specifically for workers, shared, platform, or auth is treated as an admin API
  const isAdminApi =
    isApi && !isApiAuth && !isWorkerApi && !isSharedApi && !isPlatformApi;

  const requiresAuth =
    isAdminPage ||
    isWorkerPage ||
    isPlatformPage ||
    isAdminApi ||
    isWorkerApi ||
    isSharedApi ||
    isPlatformApi;

  // 2. API logowania/wylogowania — zawsze bez straży tras
  if (isApiAuth) {
    return NextResponse.next();
  }

  // 3. /login: ważne przed `!requiresAuth` — inaczej zalogowany użytkownik (np. wstecz z WebView)
  //    widziałby formularz mimo ważnego JWT; cookie zostaje, sesja jest aktywna.
  if (isAuthPage) {
    const loginToken = request.cookies.get('auth_token')?.value;
    if (!loginToken) {
      return NextResponse.next();
    }
    try {
      const verified = await jwtVerify(loginToken, JWT_SECRET);
      const role = verified.payload.role as string;
      return NextResponse.redirect(new URL(loginRedirectForRole(role), request.url));
    } catch {
      const res = NextResponse.next();
      res.cookies.delete('auth_token');
      return res;
    }
  }

  // 4. Pozostałe publiczne (poza /login — już obsłużone)
  if (!requiresAuth) {
    return NextResponse.next();
  }

  // 5. AUTHENTICATION (Token Extraction)
  const token = request.cookies.get('auth_token')?.value;

  const handleUnauthorized = () => {
    if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', request.url));
  };

  if (!token) return handleUnauthorized();

  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

  // 6. AUTHORIZATION (Role Verification)
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const role = verified.payload.role as string;
    const isSuperadmin = isSuperadminRole(role);

    // Panel platformy (superadmin)
    if (isPlatformPage || isPlatformApi) {
      if (!PLATFORM_ROLES.includes(role)) {
        if (isPlatformApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        return NextResponse.redirect(new URL(loginRedirectForRole(role), request.url));
      }
      return NextResponse.next();
    }

    // Superadmin nie wchodzi w panel firmy ani worker bez kontekstu firmy
    if (isSuperadmin && (isAdminPage || isWorkerPage || isAdminApi || isWorkerApi || isSharedApi)) {
      if (isApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      return NextResponse.redirect(new URL('/platform', request.url));
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
  matcher: [
    '/admin/:path*',
    '/worker/:path*',
    '/platform/:path*',
    '/login',
    '/api/:path*',
  ],
};
