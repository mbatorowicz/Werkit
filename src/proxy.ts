import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/auth";
import { isCompanyScopedRole, isSuperadminRole } from "@/lib/tenantRoles";

// --- CONFIGURATION ---
const SHARED_API_PREFIXES = [
  "/api/machines",
  "/api/materials",
  "/api/material-categories",
  "/api/customers",
  "/api/categories",
];
const APP_DISTRIBUTION_API_PREFIXES = ["/api/app"];

const ADMIN_PANEL_ROLES = ["admin", "viewer"];
const WORKER_APP_ROLES = ["worker", "admin"];
const SHARED_READ_ROLES = ["worker", "admin", "viewer"];
const PLATFORM_ROLES = ["superadmin"];

/** Worker z `can_create_customers` tworzy kontrahenta przez POST /api/customers (guard w route handler). */
function isWorkerSharedCustomerCreate(pathname: string, method: string, role: string): boolean {
  return role === "worker" && method === "POST" && pathname === "/api/customers";
}

/** Scoped dyspozycja — viewer/lider mutuje tylko work-orders (weryfikacja w route handlerze). */
function isAdminDispatchMutation(pathname: string, method: string): boolean {
  if (method !== "POST" && method !== "PUT") return false;
  if (pathname === "/api/admin/work-orders") return true;
  return /^\/api\/admin\/work-orders\/\d+$/.test(pathname);
}

function loginRedirectForRole(role: string): string {
  if (isSuperadminRole(role)) return "/platform";
  if (role === "worker") return "/worker";
  return "/admin";
}

interface RouteClassification {
  isApi: boolean;
  isAuthPage: boolean;
  isApiAuth: boolean;
  isPlatformPage: boolean;
  isPlatformApi: boolean;
  isWorkerPage: boolean;
  isWorkerApi: boolean;
  isAdminPage: boolean;
  isSharedApi: boolean;
  isAppDistributionApi: boolean;
  isAdminApi: boolean;
  requiresAuth: boolean;
}

function classifyRoute(pathname: string): RouteClassification {
  const isApi = pathname.startsWith("/api");
  const isAuthPage = pathname === "/login" || pathname.startsWith("/login/");
  const isApiAuth = pathname.startsWith("/api/auth");

  const isPlatformPage = pathname.startsWith("/platform");
  const isPlatformApi = pathname.startsWith("/api/platform");

  const isWorkerPage = pathname.startsWith("/worker");
  const isWorkerApi = pathname.startsWith("/api/worker");

  const isAdminPage = pathname.startsWith("/admin");
  const isSharedApi = SHARED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAppDistributionApi = APP_DISTRIBUTION_API_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // SECURE DEFAULT: Any API route not specifically for workers, shared, platform, or auth is treated as an admin API
  const isAdminApi =
    isApi && !isApiAuth && !isWorkerApi && !isSharedApi && !isPlatformApi && !isAppDistributionApi;

  const requiresAuth =
    isAdminPage ||
    isWorkerPage ||
    isPlatformPage ||
    isAdminApi ||
    isWorkerApi ||
    isSharedApi ||
    isPlatformApi ||
    isAppDistributionApi;

  return {
    isApi,
    isAuthPage,
    isApiAuth,
    isPlatformPage,
    isPlatformApi,
    isWorkerPage,
    isWorkerApi,
    isAdminPage,
    isSharedApi,
    isAppDistributionApi,
    isAdminApi,
    requiresAuth,
  };
}

async function handleLoginPage(
  request: NextRequest,
  route: RouteClassification
): Promise<NextResponse | null> {
  if (!route.isAuthPage) return null;

  const loginToken = request.cookies.get("auth_token")?.value;
  const tenantRefresh = request.nextUrl.searchParams.get("reason") === "tenant";

  if (!loginToken || tenantRefresh) {
    const res = NextResponse.next();
    if (tenantRefresh) res.cookies.delete("auth_token");
    return res;
  }

  try {
    const verified = await jwtVerify(loginToken, JWT_SECRET);
    const role = verified.payload.role as string;
    const rawCompanyId = verified.payload.companyId;
    const hasCompanyInJwt = typeof rawCompanyId === "number" && rawCompanyId >= 1;

    // Stary JWT bez companyId — nie przekierowuj z powrotem na /admin (pętla ładowania).
    // Layout/API i tak odczytają firmę z DB; po ponownym logowaniu token będzie kompletny.
    if (isCompanyScopedRole(role) && !hasCompanyInJwt) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL(loginRedirectForRole(role), request.url));
  } catch {
    const res = NextResponse.next();
    res.cookies.delete("auth_token");
    return res;
  }
}

function createUnauthorizedHandler(isApi: boolean, request: NextRequest) {
  return () => {
    if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", request.url));
  };
}

function authorizePlatformAccess(
  role: string,
  route: RouteClassification,
  request: NextRequest
): NextResponse | null {
  if (!route.isPlatformPage && !route.isPlatformApi) return null;

  if (!PLATFORM_ROLES.includes(role)) {
    if (route.isPlatformApi) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL(loginRedirectForRole(role), request.url));
  }
  return NextResponse.next();
}

function authorizeSuperadminRestrictions(
  role: string,
  route: RouteClassification,
  isApi: boolean,
  request: NextRequest
): NextResponse | null {
  const isSuperadmin = isSuperadminRole(role);
  if (!isSuperadmin) return null;

  const isCompanyScopedRoute =
    route.isAdminPage ||
    route.isWorkerPage ||
    route.isAdminApi ||
    route.isWorkerApi ||
    route.isSharedApi ||
    route.isAppDistributionApi;

  if (isCompanyScopedRoute) {
    if (isApi) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL("/platform", request.url));
  }
  return null;
}

function authorizeAdminAccess(
  role: string,
  route: RouteClassification,
  isMutation: boolean,
  request: NextRequest
): NextResponse | null {
  if (!route.isAdminPage && !route.isAdminApi) return null;

  if (!ADMIN_PANEL_ROLES.includes(role)) {
    if (route.isAdminApi) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL("/worker", request.url));
  }
  if (route.isAdminApi && isMutation && role !== "admin") {
    const pathname = request.nextUrl.pathname;
    if (isAdminDispatchMutation(pathname, request.method)) {
      return null;
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

function authorizeWorkerAccess(
  role: string,
  route: RouteClassification,
  request: NextRequest
): NextResponse | null {
  if (!route.isWorkerPage && !route.isWorkerApi) return null;

  if (!WORKER_APP_ROLES.includes(role)) {
    if (route.isWorkerApi) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return null;
}

function authorizeSharedApiAccess(
  role: string,
  pathname: string,
  method: string,
  route: RouteClassification,
  isMutation: boolean
): NextResponse | null {
  if (!route.isSharedApi) return null;

  if (!SHARED_READ_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (isMutation && role !== "admin" && !isWorkerSharedCustomerCreate(pathname, method, role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

function authorizeAppDistributionAccess(
  role: string,
  route: RouteClassification,
  method: string
): NextResponse | null {
  if (!route.isAppDistributionApi) return null;

  if (method !== "GET") {
    return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
  }
  if (!SHARED_READ_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/** Strażnik Edge JWT/ról — konwencja Next.js 16: `proxy` zamiast `middleware`. */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const route = classifyRoute(pathname);

  // 1. API logowania/wylogowania — zawsze bez straży tras
  if (route.isApiAuth) {
    return NextResponse.next();
  }

  // 2. /login: ważne przed `!requiresAuth` — inaczej zalogowany użytkownik (np. wstecz z WebView)
  //    widziałby formularz mimo ważnego JWT; cookie zostaje, sesja jest aktywna.
  const loginResponse = await handleLoginPage(request, route);
  if (loginResponse) return loginResponse;

  // 3. Pozostałe publiczne (poza /login — już obsłużone)
  if (!route.requiresAuth) {
    return NextResponse.next();
  }

  // 4. AUTHENTICATION (Token Extraction)
  const token = request.cookies.get("auth_token")?.value;
  const handleUnauthorized = createUnauthorizedHandler(route.isApi, request);

  if (!token) return handleUnauthorized();

  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);

  // 5. AUTHORIZATION (Role Verification)
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const role = verified.payload.role as string;

    // Sprawdź autoryzację dla każdego typu routy
    const platformAuth = authorizePlatformAccess(role, route, request);
    if (platformAuth) return platformAuth;

    const superadminAuth = authorizeSuperadminRestrictions(role, route, route.isApi, request);
    if (superadminAuth) return superadminAuth;

    const adminAuth = authorizeAdminAccess(role, route, isMutation, request);
    if (adminAuth) return adminAuth;

    const workerAuth = authorizeWorkerAccess(role, route, request);
    if (workerAuth) return workerAuth;

    const sharedApiAuth = authorizeSharedApiAccess(role, pathname, request.method, route, isMutation);
    if (sharedApiAuth) return sharedApiAuth;

    const appDistributionAuth = authorizeAppDistributionAccess(role, route, request.method);
    if (appDistributionAuth) return appDistributionAuth;

    return NextResponse.next();
  } catch {
    const response = handleUnauthorized();
    response.cookies.delete("auth_token");
    return response;
  }
}

export const config = {
  matcher: ["/admin/:path*", "/worker/:path*", "/platform/:path*", "/login", "/api/:path*"],
};
