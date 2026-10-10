# CLAUDE.md

Guidance for Claude Code working in this fullstack template.

## Stack

- **Backend**: Django + DRF. API in `api/` (v1 in `api/v1/`). `core/` = project config (settings/urls/wsgi) + shared abstractions only (`BaseModel`, `AppSetting`, payments, utils). **Domain models do NOT go in `core` — each context gets its own app** (see [App structure](#app-structure-where-models-go)). Token auth (`rest_framework.authtoken`). Package mgmt via `uv`.
- **Frontend**: React + Vite SPA in `frontend/`, routing by TanStack Router (file-based, `frontend/src/routes/`), state by Jotai. Package mgmt via `pnpm`.

## App structure (where models go)

**One Django app per domain context. A new model = a new (or existing) domain app, NEVER `core`.**

- Create it: `uv run manage.py startapp <name>` at repo root (top-level, sibling to `core/` and `api/`), add `"<name>"` to `INSTALLED_APPS` in `core/settings.py`, then `make mmg && make migrate`.
- Name apps by context (`accounts`, `billing`, `projects`), not by layer. Domain models subclass `BaseModel` from `core.models` for ObjectId PK + timestamps + `actor`.
- `core` is reserved for project config and cross-cutting shared code only (`BaseModel`, `AppSetting`, payments, utils). Do **not** add feature/domain models to `core/models.py`.

## API conventions (read before adding endpoints)

API modules live in `api/v1/{resource}_api.py`. Use class-based `from rest_framework.views import APIView` (one `APIView` subclass per resource), wired in `api/v1/urls.py` via `.as_view()`, serializers centralized in `api/v1/serializers.py`.

- **A `{resource}_api.py` view may only define the four standard CRUD methods: `get`, `patch`, `post`, `delete`** (retrieve/list, update, create, destroy on that resource). No other HTTP methods belong here.
- **Clean-REST collapse**: the four verbs collapse onto ONE `APIView` served at a canonical route pair — `/{resource}/` (GET list, POST create) and `/{resource}/{id}/` (GET retrieve, PATCH update, DELETE destroy). Both routes point at the same `.as_view()`; methods branch on `pk`. No per-action routes.
- **Everything else goes to `api/v1/{resource}_extras_api.py`** — one extras file per resource, sibling to its `_api.py`, wired in the same `urls.py`, also `APIView` classes. "Everything else" = custom / RPC-style actions that aren't plain CRUD on the resource: auth flows (`login`, `register`, `logout`, `google`), webhooks, bulk / aggregate / side-effect endpoints.

```python
# api/v1/projects_api.py
from rest_framework.views import APIView
from rest_framework.response import Response

class ProjectAPI(APIView):
    def get(self, request, pk=None):  # pk → retrieve, else list
        ...
    def post(self, request):          # create
        ...
    def patch(self, request, pk):     # update
        ...
    def delete(self, request, pk):    # destroy
        ...

# api/v1/urls.py — verbs collapse onto one view, two routes
path("projects/", ProjectAPI.as_view(), name="api-v1-projects"),
path("projects/<str:pk>/", ProjectAPI.as_view(), name="api-v1-project-detail"),
```

`<str:pk>` because `BaseModel` uses an ObjectId PK. Custom actions (`POST /projects/{id}/archive/`, `POST /projects/import/`) go to `projects_extras_api.py`, not here.

> Existing `auth_api.py` / `payments_api.py` use the older function-based `@api_view` style and predate this rule. `auth_api.py`'s custom endpoints (`login`/`register`/`logout`/`google`) are the canonical example of what now belongs in an `auth_extras_api.py`. Leave both as-is unless you're touching them for another reason.

## Armor builder (public, no login)

- Page: `/` → `BuilderPage` in `frontend/src/features/builder/`. Build state is `buildAtom` (`state.ts`, persisted to localStorage under `build`); every number on screen comes from the pure `computeTotals` in `totals.ts`, checked by `pnpm test` (plain `node`, no test runner).
- Data: `GET /api/v1/{skills,set-bonuses,armors,decorations,charms}/` — list-only catalog views in `api/v1/{resource}_api.py`. The whole catalog is fetched once (`useCatalog`) and filtered in the browser.
- **Public views set `authentication_classes = []`, not just `AllowAny`.** `TokenAuthentication` raises 401 on a bad token before permissions run, so a visitor with a stale token in localStorage would be locked out of a "public" page. The frontend also passes `skipAuth: true`.
- Granted skills serialize as `{skill: <id>, level}` via `source="skill_id"`, so prefetching the through rows is the only extra query. `api/v1/tests.py` pins this with `assertNumQueries(2)`.
- Set bonuses hang off the **piece**, not a set: `Armor.set_bonus` (FK) + `SetBonus.tiers` (`[{pieces, skill}]`, `effects[i]` describes `tiers[i]`). Pieces of different sets feed one bonus (Rathalos α + Rath Soul β → Rathalos Mastery), so there is no `ArmorSet` table. Both fields come from `.dataset/sets.json` via `load_sets` — the last step of `seed`, and it relinks from scratch on every run. The file is `sets.json`, not `armor_sets.json`: `load_armors` globs `armor_*.json`.
- Set-bonus skills render in their own Summary block and are never added to skill points — most (Adrenaline, Guts, …) aren't in the skill catalog.
- Not modelled: secret-skill caps and Iceborne sets. `sets.json` is scraped from the wiki's base-game set comparison page, so the other 45 set bonuses have no tiers and no armors, and skills cap at `max_level`.

## Auth + frontend flow (read before touching login/onboarding/routing)

- Endpoints: `api/v1/auth_api.py` — `POST /auth/google/`, `POST /auth/register/`, `POST /auth/login/` each return `{ token, user }`; `GET /auth/me/` rehydrates the user from the token; `POST /auth/logout/` deletes the token.
- The user shape is `UserSerializer` in `api/v1/serializers.py` → `{ id, email, onboarded }`. Frontend mirror: `AuthUser` in `frontend/src/features/auth/types.ts`.
- **Routing is centralized in `AuthGate`** (`frontend/src/features/auth/components/auth-gate.tsx`) — the single source of truth for redirects:
  - No token + not on a public path (`/`, `/login`) → `/login`.
  - Token + `!onboarded` → `/onboarding` (the opt-in gate; dormant by default).
  - `onboarded` + on `/login` or `/onboarding` → `/dashboard`. **Not** on `/`: that is the public armor builder, and signed-in users may stay on it.
- **`onboarded` source of truth** = `get_onboarded` in `api/v1/serializers.py`. **It defaults to `True`** so a fresh template runs `login → dashboard` out of the box. The `/onboarding` page (`frontend/src/routes/onboarding.tsx`) is an optional placeholder and is unreachable while `onboarded` is always true.

### Enabling a real onboarding step

Previously the template trapped users in onboarding because `get_onboarded` read a non-existent `profile` model and always returned false with no way to complete it. To build a working onboarding flow, change **all four** touch-points in one pass:

1. **Model**: create an `accounts` app (`uv run manage.py startapp accounts`), add `"accounts"` to `INSTALLED_APPS` in `core/settings.py`, define `Profile(BaseModel)` (e.g. `full_name`, `OneToOne` to `User`) in `accounts/models.py`, then `make mmg && make migrate`. Do **not** put this in `core/models.py` (see [App structure](#app-structure-where-models-go)).
2. **Serializer**: `get_onboarded` in `api/v1/serializers.py` returns the real state (e.g. `bool(obj.profile.full_name)`).
3. **Endpoint**: add a PATCH/POST in `api/v1/auth_api.py` (wired in the v1 urls) that fills the profile / flips the flag.
4. **Frontend**: build the form in `frontend/src/routes/onboarding.tsx` to call that endpoint, then refetch `me()` so `AuthGate` redirects to `/dashboard`.

## Dev commands (Makefile)

- `make dev` — Django dev server on :8000.
- `make web` — frontend dev server (`pnpm run dev`).
- `make migrate` / `make mmg` — apply / make migrations.
- `make lint` — `ruff format` + `ruff check --fix`.
- `make dock` — full docker compose stack.
- Frontend build/typecheck: `cd frontend && pnpm run build`.

## Docker

Three services in `docker-compose.yml`, all driven by `.env.docker` (`make dock`, `./update.sh`):

- `postgres` — 16-alpine, `pgdata` volume. Its `POSTGRES_*` vars use `${VAR:?...}`, so a bare `docker compose up` **aborts** instead of initdb'ing a cluster with throwaway credentials the backend can't log into. `initdb` runs once on an empty data dir and `down` keeps the volume, so that mistake is not fixable by restarting — only `ALTER ROLE` or `down -v`.
- `backend` — `Dockerfile.backend`, gunicorn on :8000, **not published**. Non-root (uid 10001), venv on `PATH` so the runtime command is bare `gunicorn` / `python manage.py` (no `uv` in the image). Its `node:20-alpine AS tw` stage is **not** the SPA build — it compiles Tailwind for Django's own `templates/` from the **root** `package.json`.
- `frontend` — `frontend/Dockerfile` (pnpm build → `nginx:alpine`), published on **`127.0.0.1:$FRONTEND_PORT`** (8080) only. Put a reverse proxy / tunnel on the host in front of it.

**The two are ONE origin.** `frontend/nginx.conf` proxies `/api/`, `/admin/` and `/static/` to `backend:8000`; everything else falls through to the SPA. So:

- `VITE_API_URL` is **unset** — `frontend/src/lib/api.ts` builds `${VITE_API_URL ?? ""}/api/v1`, i.e. relative `/api/v1`. The built image is environment-agnostic; don't reintroduce an absolute API URL.
- **CORS is inert**, but `DJANGO_CORS_ALLOWED_ORIGINS` is still load-bearing: it feeds `CSRF_TRUSTED_ORIGINS`, and without the real public origin admin POSTs fail with "Origin checking failed".
- `/admin/` is reachable **only through nginx** (`http://localhost:$FRONTEND_PORT/admin/`) since the backend port isn't published.
- `SECURE_PROXY_SSL_HEADER` in `core/settings.py` trusts `X-Forwarded-Proto`, which nginx passes through from upstream (**not** `$scheme` — nginx is reached over plain HTTP, so `$scheme` would silently defeat it). That trust is only safe while the backend port stays unpublished.
- nginx resolves the literal `backend` hostname at config load, hence `depends_on: {backend: service_healthy}`. That chain makes `DJANGO_ALLOWED_HOSTS` load-bearing too: it must include `localhost,127.0.0.1` for the backend healthcheck, or the backend sits `unhealthy` forever and `frontend` never starts — symptom is a dead site, not a red check.

Healthchecks hit `127.0.0.1`, never `localhost`: in `nginx:alpine` `localhost` is `::1`, nginx listens on `0.0.0.0:80`, and busybox `wget` won't fall back to IPv4.

`try_files … /index.html` in `frontend/nginx.conf` keeps client-side routes (`/dashboard`, `/login`) alive on a hard refresh — don't drop it. Django's own `/login/`, `/dashboard/` template views are scaffolds and are deliberately not proxied.

`VITE_*` are **build args**, inlined by Vite at build time: changing one needs `docker compose build frontend`, not a restart.

Dev loop mirrors prod — `make web` runs Vite on :5173 and proxies `/api`, `/admin/` and `/static/` to a local backend on :8000, so dev is one origin too (admin at `http://localhost:5173/admin/`).

Container ops: `make sh` (shell into backend), `make mg CMD="createsuperuser"` (manage.py in the container), `make backup` (verified `pg_dump` into `./backups`, keeps the last 14).

Two things that must stay true or the image build breaks:

- `frontend/src/routeTree.gen.ts` is **committed**, not gitignored. `pnpm build` is `tsc -b && vite build`; `tsc -b` runs first and fails on a fresh clone if the generated route tree is absent.
- `.dockerignore` (root and `frontend/`) excludes `.venv/`, `node_modules/`, `dist/`, `db.sqlite3`, and `.env*`. A stray `.env` inside the backend image would win over compose's env — `core/settings.py` calls `load_dotenv(..., override=True)`.
