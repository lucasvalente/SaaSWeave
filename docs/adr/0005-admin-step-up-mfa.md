# ADR 0005: session-bound administrative TOTP step-up

Critical administrative role changes require recent TOTP in addition to normal session MFA and permissions. Better Auth 1.7.0-rc.1 `auth.api.verifyTOTP` is the verifier; client timestamps, trusted devices and browser storage are rejected. Successful verification stores only the internal session ID's proof in Redis for five minutes. The code, secret and session token are never persisted or logged. Redis unavailability fails closed. This prevents Session A from authorizing Session B and limits replay exposure.
