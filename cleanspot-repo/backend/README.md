# CleanSpot API

Node.js/Express + MongoDB backend for the CleanSpot tourist-cleanliness monitoring app.
Implements everything the frontend prototype (`cleanspot.html`) mocks in-browser: nearby-spot
search, photo-backed reports, AI-assisted verification (pluggable), cleanliness scoring,
authority escalation, complaint status tracking, before/after resolution, and community drives.

## 1. Setup

```bash
cd backend   # or cleanspot-backend, if you kept the original folder name
npm install
cp .env.example .env      # then edit .env — at minimum set MONGO_URI and JWT_SECRET
```

You need a MongoDB instance reachable at `MONGO_URI` — either local (`mongod` running on
`127.0.0.1:27017`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

```bash
npm run seed     # creates 6 sample spots, an admin login, and a sample clean-up drive
npm run dev       # starts the API on http://localhost:4000 (nodemon, auto-restarts)
# or: npm start
```

Seeded admin login: `admin@cleanspot.local` / `cleanspot123` (role: `local_authority`).

Health check: `GET http://localhost:4000/api/health` → `{ ok: true }`

## 2. Project layout

```
config/db.js            Mongo connection
models/                 Spot, Report, Incident, Admin, Drive (Mongoose schemas)
controllers/             Route handlers / business logic
middleware/auth.js       JWT auth + role guard for admin routes
middleware/upload.js     Multer photo upload (local disk by default)
services/aiClassifier.js Pluggable AI image classification (mock or HTTP-backed)
utils/scoring.js         Cleanliness score recalculation
utils/escalation.js      Authority escalation hierarchy logic
routes/                  Express routers, one per resource
seed/seed.js             Sample data matching the frontend prototype
server.js                App entry point
```

## 3. How the core logic works

**Scoring** (`utils/scoring.js`) — each spot has five category scores (waste, toilet,
general, water, area), 0-100. A new report knocks its category down by 3/6/11 points
depending on severity (derived from AI confidence); a verified resolution with after-photo
evidence recovers 18 points in that category. The overall score is the average of the five
categories, so recent/verified activity moves it more than an old unresolved report just
sitting there.

**Escalation** (`utils/escalation.js`) — once a spot's score drops below
`ATTENTION_THRESHOLD` (default 40), an `Incident` is created starting at the `Local`
authority level. If open issues keep climbing past 10 it moves to `District`, past 20 to
`State` — mirroring the hierarchy in the project plan (§9) instead of jumping straight to
the top. Incidents auto-resolve once the spot's score climbs back above the threshold.

**AI verification** (`services/aiClassifier.js`) — defaults to a mock classifier so the API
works fully offline; set `AI_PROVIDER=claude` and `ANTHROPIC_API_KEY` to classify real photos
with Claude's vision API (see §7 below), or `AI_PROVIDER=http` to forward photos to any other
custom-trained computer-vision endpoint. Whichever provider runs, the result only sets
severity/confidence — it never silently auto-resolves or auto-rejects a report, per the "AI
assists, doesn't decide" principle in the project plan. If the configured provider errors out
(bad key, network issue, rate limit) the report still goes through — it silently falls back to
the mock classifier and logs the failure server-side, so a flaky AI provider can never block a
tourist from filing a report.

## 4. API reference

All bodies are JSON unless noted as `multipart/form-data`. Admin-only routes require
`Authorization: Bearer <token>` from `/api/auth/login`.

### Public / tourist-facing

| Method | Route | Body | Notes |
|---|---|---|---|
| GET | `/api/spots?lat=&lng=&radiusKm=` | — | Nearby spots sorted by distance. Omit lat/lng to list all. |
| GET | `/api/spots/:id` | — | Spot detail + score breakdown + recent reports. |
| POST | `/api/reports` | multipart: `photo`, `spotId`, `category`, `description?`, `lat?`, `lng?` | Files a report; runs AI verification; updates spot score; may auto-escalate. |
| GET | `/api/reports/:id` | — | Track a single report's status. |
| GET | `/api/drives` | — | List community clean-up drives. |
| POST | `/api/drives/:id/join` | `{ contact? }` | Join a drive (no auth required). |

### Admin / authority (require `Authorization: Bearer <token>`)

| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` | Returns `{ token, admin }`. |
| POST | `/api/auth/register` | `{ name, email, password, role? }` | Lock this behind super-admin in production. |
| GET | `/api/admin/dashboard` | — | Good/attention/critical counts, totals, all spots. |
| GET | `/api/admin/incidents` | — | Open escalations with authority level and severity. |
| PATCH | `/api/admin/incidents/:id` | `{ status?, authorityLevel?, notes? }` | Manually move an incident through the hierarchy. |
| PATCH | `/api/reports/:id/status` | `{ status }` | Advance a report through the status pipeline. |
| POST | `/api/reports/:id/resolve` | multipart: `afterPhoto` | Marks resolved + verified, recovers the spot's score. |
| POST | `/api/spots` | `{ name, lat, lng, description?, address? }` | Add a new monitored spot (super_admin/state_authority). |
| POST | `/api/drives` | `{ spotId, title, date, timeLabel? }` | Organize a new clean-up drive. |

Report status pipeline: `Reported → Under Verification → Verified → Action Required → In Progress → Resolved`.

## 5. Connecting the frontend prototype

The shipped `cleanspot.html` uses in-memory mock data. To point it at this API, replace its
mock arrays with `fetch` calls to the routes above (e.g. `fetch('/api/spots?lat=..&lng=..')`
on load, and `FormData` + `fetch('/api/reports', { method: 'POST', body: form })` from the
report modal). CORS is already enabled for all origins in `server.js` for local development —
tighten it before deploying.

## 7. Turning on real AI classification (Claude vision)

By default `AI_PROVIDER=mock` in `.env`, so reports work with no external calls. To classify
real photos:

1. Get an API key at [console.anthropic.com](https://console.anthropic.com).
2. In `.env`, set:
   ```
   AI_PROVIDER=claude
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Restart the server. File a report with a real photo — the response's `report.aiAnalysis`
   will now come back with `provider: "claude"`, a `detectedCategory` picked from the same
   8 categories the frontend uses, a `confidence` score, and a one-line `reasoning`.

Claude is sent the photo plus the category the tourist selected, and asked to return strict
JSON — no separate model training or hosting needed. If you'd rather plug in a custom-trained
model or another vendor's CV API instead, use `AI_PROVIDER=http` and point `AI_API_URL` at it;
see the `httpClassify` function in `services/aiClassifier.js` for the expected response shape.

Cost note: classification runs once per filed report (not per page view), using
`claude-haiku-4-5-20251001` by default — override with `CLAUDE_MODEL` in `.env` if you want a
different model.

## 8. Production notes

- Swap `middleware/upload.js`'s disk storage for Cloudinary/S3/Firebase Storage — everything
  downstream only depends on the returned URL.
- Set a real `AI_API_URL`/`AI_API_KEY` and `AI_PROVIDER=http` once a CV model is available.
- Lock down `POST /api/auth/register` and tighten CORS to your actual frontend origin.
- Add a scheduled job to reconcile `reportsToday` counters at midnight if you outgrow the
  simple date-check used here.
