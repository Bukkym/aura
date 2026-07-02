import { describe, it, expect } from "vitest";
import { isUnknownUserOtpError } from "../auth/otpSignInError";

describe("isUnknownUserOtpError", () => {
  it("matches the GoTrue otp_disabled code (shouldCreateUser: false, unknown email)", () => {
    expect(
      isUnknownUserOtpError({
        code: "otp_disabled",
        status: 422,
        message: "Signups not allowed for otp",
      }),
    ).toBe(true);
  });

  it("matches neighbouring unknown-user codes", () => {
    expect(isUnknownUserOtpError({ code: "user_not_found" })).toBe(true);
    expect(isUnknownUserOtpError({ code: "signup_disabled" })).toBe(true);
  });

  it("falls back to the message when the code is absent", () => {
    expect(isUnknownUserOtpError({ message: "Signups not allowed for otp" })).toBe(true);
    expect(isUnknownUserOtpError({ message: "User not found" })).toBe(true);
  });

  it("does not fire for unrelated auth errors", () => {
    expect(isUnknownUserOtpError({ code: "over_email_send_rate_limit", status: 429 })).toBe(false);
    expect(isUnknownUserOtpError({ code: "validation_failed", message: "Invalid email" })).toBe(false);
  });

  it("is safe on null / undefined / empty input", () => {
    expect(isUnknownUserOtpError(null)).toBe(false);
    expect(isUnknownUserOtpError(undefined)).toBe(false);
    expect(isUnknownUserOtpError({})).toBe(false);
  });
});
