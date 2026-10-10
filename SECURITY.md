# Security

FoodGuard is a development preview, not an independently audited production service.

## Report privately

Use GitHub's private vulnerability reporting in this repository's **Security** tab if enabled. If it is not enabled, open an issue requesting a private contact channel **without exploit details, credentials or personal data**, then wait for a private channel. Do not post Keys, private photos, history exports or raw logs publicly.

Provide the affected version, a minimal synthetic reproduction, expected/actual behavior and the impact. Do not test against other users or unrelated production services. No response-time or bounty commitment is currently offered.

## Operator checklist

- Never embed an AI Key in source, APK, `VITE_*` variables, release assets or Actions logs. Users supply their own Key.
- Keep `.env*`, SSH/private keys, Android signing files and local SDK settings untracked. The two committed `.env*.example` files contain no credentials.
- The backend temporarily handles user Keys and images; use trusted HTTPS infrastructure, protect access, inspect proxy logging/buffering and understand the AI provider's retention policy.
- Do not log Authorization headers, request/response bodies or provider errors containing secrets. Preserve DNS/public-address validation and certificate checks.
- Set upload/time limits and bounded concurrency; monitor total server capacity and abuse before broad public distribution. Per-Key request limits are not a complete anti-abuse system.
- If a Key was ever exposed, revoke/rotate it at the provider. Deleting it from the latest source does not undo exposure in commits, caches or earlier APKs.
- Use and back up a private release-signing key before stable distribution. Debug-signed preview packages are not production signing.

The repository check `npm run check:secrets -- --history` detects common secret formats and exact matches to locally configured secrets. It is deliberately non-exhaustive and prints only paths/rule names. Review binaries, generated metadata and publication history separately.
