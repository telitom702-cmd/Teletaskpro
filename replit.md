# TeliTask Pro

A full-stack Telegram-based daily task earning platform where users login via Telegram WebApp, complete tasks to earn money, and withdraw via bKash/Nagad/USD.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — build lib declarations (run before leaf checks if DB schema changes)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `TELEGRAM_BOT_TOKEN` — for Telegram bot notifications and hash verification
- Optional env: `ADMIN_TELEGRAM_IDS` — comma-separated Telegram IDs that get admin access on login

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080, mounted at `/api`)
- Frontend: React + Vite + Tailwind CSS + shadcn/ui (port auto, mounted at `/`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Auth: JWT (secret from `SESSION_SECRET`), Telegram WebApp initData verification
- Build: esbuild (CJS bundle for API server)

## Where things live

- `lib/db/src/schema/` — DB schema (users, tasks, completions, withdrawals, notifications, group_summary)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/api-zod/src/generated/api.ts` — Generated Zod validators (from codegen)
- `lib/api-client-react/src/generated/api.ts` — Generated React Query hooks (from codegen)
- `artifacts/api-server/src/routes/` — All API route handlers
- `artifacts/api-server/src/lib/jwtAuth.ts` — JWT sign/verify + Telegram initData verification
- `artifacts/api-server/src/middlewares/auth.ts` — `requireAuth` / `requireAdmin` middleware
- `artifacts/telitask/src/pages/` — All user-facing pages
- `artifacts/telitask/src/pages/admin/` — Admin panel pages
- `artifacts/telitask/src/components/nav.tsx` — Bottom navigation bar

## Architecture decisions

- Admin access: users whose Telegram ID is in `ADMIN_TELEGRAM_IDS` env var get `isAdmin=true` on login/register. Checked at login time, stored in JWT and DB.
- Dev mode bypass: in non-production, if initData contains `mockhash` the Telegram signature check is skipped — allowing dev login without a real bot token.
- Balance hold on withdrawal request: user balance is deducted immediately when a withdrawal is requested; refunded if rejected by admin.
- Screenshot upload: base64 JSON body → saved to `artifacts/api-server/uploads/`; served at `/api/uploads/:filename`.
- JWT stored in `localStorage` key `teli_token`; injected into every API request via `setAuthTokenGetter`.

## Product

- **User features**: Telegram WebApp auto-login, browse and complete tasks (with timer + screenshot + link-copy), view completion history, wallet with bKash/Nagad/USD withdrawal, notification inbox, profile with referral code.
- **Admin features**: Dashboard stats, task CRUD, approve/reject completions, approve/reject withdrawals, user management (ban/unban, balance adjustment), broadcast + personal notifications, Telegram group summary.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm run typecheck:libs` after changing any `lib/*` schema before running leaf package typechecks — stale lib declarations cause false TS2305 errors on table imports.
- The API server `dev` script runs build then start; after code changes just restart the workflow.
- Withdrawal flow: balance is deducted at request time (hold), refunded on rejection — do NOT double-deduct on approval.
- `createdAt` columns are returned as strings from DB; convert to `Number()` for numeric fields like `balance`, `reward`, etc.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
