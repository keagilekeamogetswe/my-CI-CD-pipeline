## Summary
- implement the full Swift onboarding sequence in the Next.js frontend: phone entry, profile details, OTP verification, optional profile customization, Swift Recovery, and the main messaging interface
- add device-context JWE access tokens, refresh-token rotation support, recovery routing, and request fingerprint verification across the Express and gRPC auth flow
- add MongoDB settings delta merge support, harden test environment setup, and update endpoint contract coverage

## Screen Sequence Walkthrough
1. Phone entry captures the selected dial code and phone number.
2. Profile details collect first name, last name, and date of birth before requesting verification.
3. OTP verification confirms account creation and issues the first device-bound access token.
4. Profile customization optionally captures a profile image URL and bio.
5. Swift Recovery lets the user opt in to encrypted recovery credentials and backup limits, or continue with passwordless retention rules and number-sync preferences.
6. Main messaging redirects the user into the core interface and keeps the session alive with silent token rotation.

## Security Verification
- access tokens now use encrypted JWE payloads that carry device name, user-agent, WebGL fingerprint, device ID hash, and session linkage claims
- refresh-token issuance and rotation preserve the same device context and reject mismatched request fingerprints through Express middleware
- recovery login returns the gRPC access-token payload while keeping the refresh token in an HTTP-only cookie
- the frontend maintains a background renewal loop so active sessions can rotate access tokens without interrupting the messaging experience

## Testing
- `cd /home/runner/work/my-CI-CD-pipeline/my-CI-CD-pipeline/frontend/swift/website && npm run lint`
- `cd /home/runner/work/my-CI-CD-pipeline/my-CI-CD-pipeline/frontend/swift/website && npm run build`
- `cd /home/runner/work/my-CI-CD-pipeline/my-CI-CD-pipeline && bash test.containers.setup.sh`
- `cd /home/runner/work/my-CI-CD-pipeline/my-CI-CD-pipeline && npm test`

## Endpoint Contract Validation
- `/api/start` now forwards the gRPC account-creation request payload and response shape, including the verification token contract
- `/api/start/verify`, `/api/access-token`, and `/api/account/recovery` now preserve the gRPC `success/message/access_token` response contract while keeping refresh tokens cookie-only
- HTTP integration tests now cover protected-route acceptance with matching device headers and forced re-authentication on fingerprint mismatch
