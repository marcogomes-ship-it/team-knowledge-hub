import { describe, expect, it } from "vitest";
import { isHostifyEmail } from "@/lib/teams";

describe("sign-up domain rule", () => {
  it("accepts @hostify.com addresses", () => {
    expect(isHostifyEmail("Marco.Gomes@Hostify.com")).toBe(true);
  });
  it("rejects other domains", () => {
    expect(isHostifyEmail("someone@gmail.com")).toBe(false);
    expect(isHostifyEmail("x@nothostify.com.evil.io")).toBe(false);
  });
});
