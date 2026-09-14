import { jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { clearAuthTokenCookie, clearPlatformResumeCookie, isHttpsRequest } from "@/lib/authCookie";

export const POST = withApiErrorHandling(async (req: Request) => {
  const response = jsonOk({ success: true });
  const isHttps = isHttpsRequest(req);
  clearAuthTokenCookie(response, isHttps);
  clearPlatformResumeCookie(response, isHttps);
  return response;
});
