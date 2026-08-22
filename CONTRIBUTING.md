# Contributing to CleanSpot 

Thanks for your interest in contributing. This is a hackathon-originated project, but contributions,
bug reports, and suggestions are welcome from anyone.

## Ground rules

- Be respectful — see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- Open an issue before starting large changes, so we can discuss the approach first.
- Keep pull requests focused — one feature or fix per PR is easier to review than a bundle of
  unrelated changes.

## Project structure

```
frontend/    Single-page HTML/CSS/JS app — no build step, no framework
backend/     Node.js/Express REST API + MongoDB
```

See [README.md](README.md) for the full architecture overview, and
[backend/README.md](backend/README.md) for the backend-specific setup and API reference.

## Getting set up locally

```bash
cd backend
npm install
cp .env.example .env      # fill in MONGO_URI and JWT_SECRET
npm run seed
npm run dev
```

Then open `frontend/index.html` in a browser (serve it locally rather than opening it directly as
a `file://` URL — see the frontend README section for why).

## Making a change

1. Fork the repo and create a branch off `main`: `git checkout -b your-feature-name`
2. Make your change. For backend changes, run `node --check <file>` on anything you touch as a
   quick syntax sanity check before opening a PR.
3. Test manually against a local backend + frontend — there's no automated test suite yet
   (contributions adding one are very welcome).
4. Commit with a clear message describing *what* changed and *why*.
5. Open a pull request against `main`, describing what you changed and how you tested it.

## Reporting bugs

Open a GitHub issue with:
- What you expected to happen vs. what actually happened
- Steps to reproduce
- Whether it's the frontend, backend, or both

## Reporting security issues

**Do not open a public issue for security vulnerabilities.** See [SECURITY.md](SECURITY.md) for
how to report those privately.

## Code style

- Backend: plain CommonJS Node.js, no framework-specific conventions beyond what's already in the
  codebase — match the existing style in the file you're editing.
- Frontend: vanilla JS, no build tooling — keep it that way unless there's a strong reason to
  introduce a bundler/framework (discuss in an issue first).
