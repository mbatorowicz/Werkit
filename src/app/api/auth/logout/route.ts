import { jsonOk, withApiErrorHandling } from "@/lib/apiRoute";

export const POST = withApiErrorHandling(async () => {
  const response = jsonOk({ success: true });
  response.cookies.delete("auth_token");
  return response;
});
