import { beforeEach, describe, expect, it } from "vitest";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/lib/authStorage";

describe("authStorage", () => {
  beforeEach(() => {
    clearAuthToken();
  });

  it("stores and clears the auth token", () => {
    expect(getAuthToken()).toBeNull();
    setAuthToken("token-123");
    expect(getAuthToken()).toBe("token-123");
    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });
});
