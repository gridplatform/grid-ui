import { describe, expect, it } from "vitest";
import { ApiError } from "@/hooks/useGridApi";

describe("ApiError", () => {
  it("flags forbidden and unauthorized statuses", () => {
    const forbidden = new ApiError(403, "forbidden", "No access");
    expect(forbidden.isForbidden).toBe(true);
    expect(forbidden.isUnauthorized).toBe(false);

    const unauthorized = new ApiError(401, "unauthorized", "Login required");
    expect(unauthorized.isUnauthorized).toBe(true);
    expect(unauthorized.isForbidden).toBe(false);
  });

  it("keeps details payload", () => {
    const err = new ApiError(403, "forbidden", "denied", { project: "grid-labs" });
    expect(err.details).toEqual({ project: "grid-labs" });
    expect(err.message).toBe("denied");
  });
});
