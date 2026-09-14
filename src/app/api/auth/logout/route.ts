import { jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { clearAuthTokenCookie, isHttpsRequest } from "@/lib/authCookie";

export const POST = withApiErrorHandling(async (req: Request) => {
  const response = jsonOk({ success: true });
  clearAuthTokenCookie(response, isHttpsRequest(req));
  return response;
});
