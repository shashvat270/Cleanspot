# Security Policy

CleanSpot is a hackathon-originated MVP. This document is honest about its current security
posture rather than overstating it — treat anything not explicitly hardened below as unsafe for
production use until addressed.

## Supported versions

This is a single-branch project (`main`). There are no maintained older versions — security fixes
land on `main` only.

## Reporting a vulnerability

If you find a security issue in this project:

1. **Do not open a public GitHub issue for it.**
2. Open a [GitHub Security Advisory](../../security/advisories/new) on this repo, or contact the
   maintainer directly if you have another private channel.
3. Include what you found, how to reproduce it, and (if known) its potential impact.

This is a personal/hackathon project without a dedicated security team, so response times aren't
guaranteed — but reports will be read and taken seriously.

## Known limitations (read before deploying anywhere real)

These are current, known gaps — not hypothetical ones. Don't deploy this beyond a local demo
without addressing the ones relevant to your setup:

- **Demo admin credentials are public.** The seeded login (`admin@cleanspot.local` /
  `cleanspot123`) is documented in this repo's README and `seed/seed.js`. **Change this password
  or remove the seeded account entirely before deploying anywhere reachable from the internet.**
- **No rate limiting.** `POST /api/reports`, `POST /api/auth/login`, and other endpoints have no
  request throttling. This means the report endpoint can be spammed, and the login endpoint is
  open to brute-force attempts. Add rate limiting (e.g. `express-rate-limit`) before any public
  deployment.
- **`POST /api/auth/register` is open.** Anyone who can reach the API can currently create an
  admin account. Lock this behind an existing super-admin's authorization before deploying, or
  remove the route and create admin accounts via the seed script / direct DB access instead.
- **Photo uploads are stored unencrypted on local disk** (`middleware/upload.js`), served directly
  via a static route with no access control. Anyone with a report's photo URL can view it. Swap in
  a proper object storage provider (S3, Cloudinary, Firebase Storage) with signed URLs before
  handling real user-submitted photos at scale.
- **No CSRF protection**, since the API is designed to be called by a separate frontend via
  `fetch`/JSON rather than form submissions — if you add cookie-based auth instead of the current
  JWT-in-header approach, add CSRF protection at that point.
- **CORS is wide open** (`cors()` with no config in `server.js`), which is fine for local
  development but should be restricted to your actual frontend's origin before deploying.
- **No government/authority system integration.** Escalation is demonstrated via a mock authority
  dashboard, as documented in the original project plan — this is intentional, not a bug, but
  worth restating here so it's not mistaken for a real integration.
- **AI classification is not authoritative.** Whichever provider is configured
  (mock/Claude/custom), its output only informs severity — it never auto-approves or auto-rejects
  a report. Don't change this without careful thought; false negatives/positives from an AI
  classifier shouldn't be able to unilaterally resolve or dismiss a citizen's report.

## Reasonable hardening checklist before a real deployment

- [ ] Rotate/remove demo credentials
- [ ] Add rate limiting on public-facing write endpoints
- [ ] Lock down or remove `POST /api/auth/register`
- [ ] Move photo storage to a proper object store with access control
- [ ] Restrict CORS to your actual frontend origin
- [ ] Set a long, random `JWT_SECRET` (not the placeholder in `.env.example`)
- [ ] Put the API behind HTTPS (required for browser geolocation to work reliably anyway)
- [ ] Review MongoDB Atlas network access rules — don't leave `0.0.0.0/0` allowed long-term
