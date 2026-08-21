# CleanSpot — Smart Cleanliness Monitoring for Tourist Places

A location-based, evidence-driven system that monitors cleanliness at tourist spots, converts
reports into measurable cleanliness scores, identifies critical problems, escalates them to the
responsible authority, and verifies whether the problem was actually resolved.

**Core concept:** Report → Verify → Score → Escalate → Act → Verify Resolution

---

## What's in this repo

```
frontend/
  cleanspot.html       Frontend — self-contained HTML/CSS/JS, no build step required
backend/
  ...                   Backend — Node.js/Express + MongoDB API
```

The frontend is a single static file that talks to the backend over a REST API. Open it in a
browser once the backend is running and it works end to end — nearby spot discovery, photo-backed
reports, AI-assisted verification, cleanliness scoring, authority escalation, complaint status
tracking, before/after resolution, and community clean-up drives.

## Features

**Tourist side**
- Location detection with a graceful fallback if GPS is unavailable
- Nearby tourist spots with live cleanliness scores
- Photo-backed problem reporting across 8 categories
- AI-assisted verification (mock by default, or real classification via Claude's vision API)
- Complaint status tracking (`Reported → Under Verification → Verified → Action Required → In Progress → Resolved`)
- Community clean-up drives

**Authority side**
- JWT-secured admin login
- Dashboard with good/attention/critical counts and totals
- Escalation hierarchy: Local → District → State, auto-triggered by score and open-issue count
- Advance report status, resolve with before/after evidence
- Add new tourist spots to monitor via an interactive map picker (OpenStreetMap/Leaflet, no API key needed)

## Quick start

```bash
cd backend
npm install
cp .env.example .env      # fill in MONGO_URI and JWT_SECRET at minimum
npm run seed               # creates sample spots, an admin login, and a sample drive
npm run dev                 # starts the API on http://localhost:4000
```

Then open `frontend/cleanspot.html` in a browser (serving it via `npx serve .` or similar works
better than double-clicking it, since some browser features like geolocation prefer `http://` over
`file://`). Full backend setup, environment variables, and the API reference are in
[`backend/README.md`](backend/README.md).

Seeded admin login: `admin@cleanspot.local` / `cleanspot123` — **this is a demo credential.**
Change it before deploying anywhere real; see [SECURITY.md](SECURITY.md).

## Tech stack

- **Frontend:** HTML, CSS, vanilla JavaScript (`fetch` API), Leaflet/OpenStreetMap for the map picker
- **Backend:** Node.js, Express, Mongoose, MongoDB
- **Auth:** JWT (admin/authority routes only — tourist reporting is anonymous by design)
- **AI verification:** pluggable — mock classifier by default, or Claude's vision API
- **Photo storage:** local disk in dev (swap for Cloudinary/S3/Firebase Storage in production)

## Project status

This is a hackathon-originated MVP, not a production deployment. It intentionally does **not**
claim real government integration — escalation is demonstrated via a mock authority dashboard, as
described in the original project plan. See [SECURITY.md](SECURITY.md) for known limitations
before deploying this anywhere beyond a local demo.

## License

MIT — see [LICENSE](LICENSE).
