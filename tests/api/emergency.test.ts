import bcrypt from "bcryptjs";
import * as OTPAuth from "otpauth";
import { signSession, verifySession, checkPassword, checkTotp, recordFailure, lockState, _resetAttempts, LOCK_MS } from "../../api/_lib/emergency";

const SECRET = "test-secret-0123456789";

describe("emergency session cookie", () => {
  it("verifies its own signature and expires after 2 h", () => {
    const now = Date.now();
    const t = signSession(SECRET, now);
    expect(verifySession(t, SECRET, now)).toBe(true);
    expect(verifySession(t, "other-secret", now)).toBe(false);
    expect(verifySession(t, SECRET, now + 2 * 3600_000 + 1000)).toBe(false);
    expect(verifySession(t.replace(/.$/, (c) => (c === "A" ? "B" : "A")), SECRET, now)).toBe(false);
  });
});

describe("emergency credentials", () => {
  it("checks bcrypt password", async () => {
    const hash = await bcrypt.hash("correct horse", 4);
    expect(await checkPassword("correct horse", hash)).toBe(true);
    expect(await checkPassword("wrong", hash)).toBe(false);
  });
  it("checks TOTP codes", () => {
    const secret = new OTPAuth.Secret({ size: 20 }).base32;
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret) });
    expect(checkTotp(totp.generate(), secret)).toBe(true);
    expect(checkTotp("000000", secret, 0)).toBe(false);
    expect(checkTotp("abc", secret)).toBe(false);
  });
});

describe("lockout", () => {
  beforeEach(() => _resetAttempts());
  it("locks for 15 minutes after 5 failures", () => {
    const now = 1_000_000;
    for (let i = 0; i < 4; i++) recordFailure("ip:1", now);
    expect(lockState("ip:1", now).locked).toBe(false);
    recordFailure("ip:1", now);
    expect(lockState("ip:1", now).locked).toBe(true);
    expect(lockState("ip:1", now + LOCK_MS + 1).locked).toBe(false);
  });
});

import { checkSetupCode, finishSetup, newTotp, setupState } from "../../api/_lib/emergencySetup";

describe("emergency setup page", () => {
  afterEach(() => { for (const k of ["EMERGENCY_SETUP_CODE", "EMERGENCY_PASSWORD_HASH", "EMERGENCY_TOTP_SECRET", "EMERGENCY_SESSION_SECRET"]) delete process.env[k]; });
  it("is open only with a setup code and locks once configured", () => {
    expect(setupState()).toBe("no-code");
    process.env.EMERGENCY_SETUP_CODE = "abc";
    expect(setupState()).toBe("open");
    process.env.EMERGENCY_PASSWORD_HASH = "h"; process.env.EMERGENCY_TOTP_SECRET = "s"; process.env.EMERGENCY_SESSION_SECRET = "x";
    expect(setupState()).toBe("locked");
  });
  it("checks the setup code", () => {
    expect(checkSetupCode("right-code", "right-code")).toBe(true);
    expect(checkSetupCode("wrong", "right-code")).toBe(false);
  });
  it("produces values the login accepts", async () => {
    const { secret } = newTotp();
    const code = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret) }).generate();
    const v = await finishSetup({ password: "a-long-emergency-pass", secret, code });
    expect(await checkPassword("a-long-emergency-pass", v.EMERGENCY_PASSWORD_HASH)).toBe(true);
    expect(checkTotp(new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(v.EMERGENCY_TOTP_SECRET) }).generate(), v.EMERGENCY_TOTP_SECRET)).toBe(true);
    expect(verifySession(signSession(v.EMERGENCY_SESSION_SECRET), v.EMERGENCY_SESSION_SECRET)).toBe(true);
    await expect(finishSetup({ password: "short", secret, code })).rejects.toThrow();
  });
});
