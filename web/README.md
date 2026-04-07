# web

This is the active `clean-image` app built with Next.js App Router.

Key structure:

- `app/` contains the page entry and route handlers
- `features/clean-image/` contains the UI for the cleaner experience
- `lib/clean-image/` contains shared client contracts and helpers
- `lib/server/cleaner/` contains the server-only processing pipeline

Run it from the repo root:

```bash
bun install --cwd web
bun --cwd web dev
```

Verify it:

```bash
bun --cwd web lint
bun --cwd web build
```
