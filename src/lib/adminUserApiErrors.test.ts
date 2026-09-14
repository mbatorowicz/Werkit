import { describe, expect, it } from "vitest";
import { mapAdminUserWriteError } from "@/lib/adminUserApiErrors";

async function errorBody(res: Response) {
  return (await res.json()) as { error: string };
}

describe("mapAdminUserWriteError", () => {
  it("unique login (23505, także w cause) → 400 invalid_username, nie user_exists", async () => {
    const driver = Object.assign(new Error("duplicate key"), { code: "23505" });
    const wrapped = Object.assign(new Error("Failed query"), { cause: driver });
    const res = mapAdminUserWriteError(wrapped);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
    const body = await errorBody(res!);
    expect(body.error).toBe("invalid_username");
    expect(body.error).not.toBe("user_exists");
  });

  it("invalid_supervisor / invalid_team → 400", async () => {
    const supervisor = mapAdminUserWriteError(new Error("invalid_supervisor"));
    expect(supervisor?.status).toBe(400);
    expect(await errorBody(supervisor!)).toEqual({ error: "invalid_supervisor" });

    const team = mapAdminUserWriteError(new Error("invalid_team"));
    expect(team?.status).toBe(400);
    expect(await errorBody(team!)).toEqual({ error: "invalid_team" });
  });

  it("inny błąd → null (domyślny save_error w handlerze)", () => {
    expect(mapAdminUserWriteError(new Error("disk full"))).toBeNull();
  });
});
