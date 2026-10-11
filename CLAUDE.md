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
- Master Rank armor is `.dataset/armor_{part}_mr.json` (839 pieces, rarity 9-12): a second file per part, which `load_armors`' glob picks up, the part still coming from the file's `type` key. The rows are the wiki's `Master_Rank_{Head,Chest,Arms,Waist,Leg}_Armor` list pages (`Leg`, not `Legs`) plus 16 pieces those pages leave out but the wiki has a page for (Rimeguard γ+, Demonlord α+, Shield-Weaver +, Pearlspring α+). **The values are not the wiki's as scraped.** About 1% of its fields are wrong (rows copied from a neighbour, α+ pages cloned from β+), and its piece and set pages repeat the list page's mistakes, so every field was settled against two datasets that are not the wiki: mhw-db.com and Gathering Hall Studios' MHWorldData. Where those two agree they overrule the wiki: 71 fields on 63 pieces, and five piece names (`Anjanath Vambraces` is `Anja Vambraces`). Scraping the list pages again on their own brings the errors back. 15 pieces (Direwolf, Golden Lune α+/β+) are in a base file too: the `_mr` file sorts after its base file, so it loads second and wins, and it keeps the base file's spelling of the name (`Golden Lunehelm Alpha+`, no space) because the loader upserts on name.
- Weapons are data only so far: `weapons.Weapon`, loaded by `load_weapons` (part of `seed`), with no API view and no place in the builder. `.dataset/weapon_{type}_mr.json` is 14 files, 1,792 Master Rank weapons (rarity 9-12), the type coming from each file's `type` key as with armor. **The values are the game's, not the wiki's.** The rows start from the wiki's `Master_Rank_Weapons` page (1,297 of its 1,298: `Purgation's Atrocity` is High Rank), but that page is far worse than the armor pages: 355 fields on 312 weapons are wrong (the hidden-element parentheses missing on 162, slots on 55, attack on 40, the Safi'jiiva weapons shown awakened) and 15 names are misspelt (`Usuper's Lightning`, `Deep Terrior`). mhw-db.com stops at rarity 8, so the two datasets that settle a weapon are MHWorldData (`weapon_base.csv` + `weapon_sharpness.csv`) and Kiranico (`/en/weapons?type=0..13`). They disagree on 8 fields of 6 weapons, and mhw.poedb.tw, a third datamined site, sided with Kiranico on every one. Added to the page's rows: 34 weapons it leaves out (every Fatalis weapon), 4 that MHWorldData lacks too but Kiranico, poedb and a wiki page have (`Azure Era "Soaring Dragon"`), and the 457 Kulve Taroth weapons. **Kulve attack and element are the fully upgraded numbers, from MHWorldData alone**: Kiranico and the wiki show the weapon before its upgrade levels. The check that they are not typos is that the gap is one fixed bonus per weapon type and rarity across all 457. Names are the game's: `Tiger Jawblade+` without the wiki's space, `Kjárr` with its accent, so a search box has to fold it. Three PlayStation-only Horizon weapons (`Aloy's Adept War Bow`, `Stormslinger Prototype`, `Adept Stormslinger`) are on the wiki alone and could not be checked. Left out: 14 rarity 11 weapons, one per type, that only the datamined sites list (`Hunter's Knife`, `Artemis's Dual Blades`) and the wiki has no Master Rank page for. `sharpness` is red to purple in the game's units (a full bar is 400) and `sharpness_max` the same bar at Handicraft 5. `skill` is a name, not a link, because it is a skill (Critical Element), a set bonus (Kulve Taroth Essence) or a set-bonus skill in neither table (Guts).
- Set-bonus skills render in their own Summary block and are never added to skill points — most (Adrenaline, Guts, …) aren't in the skill catalog.
- Set search (`SetSearch`, the panel left of the armor): the wanted skills are `wantedAtom` (localStorage `wanted`), a `GrantedSkill[]` whose order is the priority and whose `level` is the target. The pure `recommend` in `recommend.ts` returns ready `Build`s (jewels placed), so the panel shows them through `computeTotals`, choosing one is one `setBuild`, and the set equal to the current build wears the selection band. **Best** = the level reached of each skill, capped at its target, compared in list order; defense breaks ties. It is exact, not a heuristic: dominated pieces are dropped, then a depth-first search is cut by two bounds, and it needs **both** — the per-skill one alone stops cutting past ~6 skills and a maxed 12-skill list goes from 0.2 s to 2 s (measured on the base-game catalog; with Master Rank loaded the slowest list found takes ~0.3 s with both bounds). `recommend.test.ts` (also `pnpm test`) holds it against a brute force over small generated catalogs. It ignores set bonuses and the level-4 combo / "+" jewels — which costs more than it did, now that half the Master Rank pieces have a level 4 slot and it can only put a smaller jewel there — and the top results are near-twins of each other (same pieces, another charm): it ranks, it does not diversify.
- The search is live: it reruns on every change to the list, on the main thread, capped at `MAX_WANTED`. `useDeferredValue` puts it behind the repaint of the list, and its initial value (an empty list) keeps the first paint from waiting on it. The array handed to it is `useMemo`ed on purpose: it compares by identity, and a list filtered afresh each render would re-render forever. In dev a search costs double (StrictMode runs `useMemo` twice).
- Set search layout: three columns at `xl` (`search | armor | status`). The search and the armor share a wrapper that is a stacked column until `xl` and `xl:contents` from there, so one DOM order serves both. The panel scrolls inside itself at every size — capped at `75dvh` when stacked, sticky and screen-tall at `xl` — so ten sets never push the armor they fill off the screen; the scroll sits on an inner div because `frame`'s brackets would scroll away with the content. Its wanted rows are one line down to a 22rem panel and two below it, by a **container** query, not a breakpoint: the `xl` column is as narrow as a phone, and must stay one line. The controls are sized to make that fit (28px buttons, no `Lv` label) — widen them and the names get cut. Every row opens with a 3rem number gutter, which is there for `SoundToggle` (below).
- Look: the color tokens in `frontend/src/styles.css` are read off the game's Smithy screens. The serif (`font-serif`, Crimson Pro) is for titles and section bands only; names, labels and numbers stay in the sans, as in the game. Panels use the `frame` utility, which draws its brackets with absolutely positioned pseudo-elements and sets no `position` itself: add `relative`, and on a `<dialog>` frame a child, never the dialog — `relative` would replace the modal's `position: fixed` and unseat it. `frame` is opaque on purpose (the picker opens over the page).
- Slot icons: `SlotGem` is an `<img>` that picks one of 14 files, `frontend/src/assets/slots/{slot}-{jewel}.svg`: every slot level (1-4) holding every jewel level it can, `-0` for empty. Nothing is painted in the frontend. The files are **generated**, not drawn: the game's socket icons as the wiki's armor tables show them in their slot column (`Gem_level_{1,2,3}.png` and `Decoration_level_4_mhw_wiki.png` on the wiki's image host, 24×24, the largest it has), each pixel turned into an SVG square with the greys reduced to a small palette (at most 11/255 off the PNG). So they stay crisp pixels at any density, and they are not vector art: do not hand-edit the paths. A jewel lights, in `#b377f5`, as much of the icon as it uses of the slot, which is the "levels wasted" text drawn: as many **tails** as its own level, the outer pair first, and the outer jewel/slot share of the **body** (the inside of the jewel's outline), from both sides toward the centre. A facet lying wholly on one side lights whole once its centre is in that share; only a region straddling the axis is cut by column. 3's source is drawn the other way round (grey inside, black lines), so its body is the grey plus the centre oval and its two bracket lines stay black. The generator is a one-off script and is not committed, like the dataset scrapers, and the PNGs are not kept: a new purple is a search and replace over the 14 files, a new fill rule means fetching the PNGs and writing the script again. The files are loaded by `import.meta.glob`, so a missing variant is a blank icon, not a build error. Vite inlines the ones under 4 KB (levels 1-3) into the JS and emits level 4's as files. The icon carries `-mt-2 translate-y-1` so it takes a 16px line like the text beside it: without it a picker row with slots is 7px taller than one without, and `Def` leaves the name's baseline. The armor picker's `meta` is `items-baseline` for the same reason.
- Backdrop: `frontend/public/img/backdrop.webp` is the game's ornament tapestry — Iceborne's Steam store background (`store_item_assets/steam/apps/1118010/page_bg_raw.jpg`, a PNG despite the name) re-encoded with `cwebp -q 72`. It is Capcom's art with no licence for web use, hence the "Fan-made" line in the page footer. The `smithy` utility paints it on a `position: fixed` `::before` (iOS ignores `background-attachment: fixed`) under an 80% scrim. That 80% is measured, not chosen: it is what keeps `moss` at 4.5:1 on this image's brightest patch, so a different image needs measuring again. The file is optional: it lives in `public/` so a missing file is a build warning rather than an error, and the page then falls back to the plain cobalt glow. Controls that sit bare on the backdrop (`SlotButton`) carry their own `bg-hide`, because a border cannot hold contrast against a background that varies.
- Background music: `SoundToggle` plays `frontend/public/audio/seliana-{day,night}.mp3` in turn. It floats `fixed` bottom-left, which puts it over the equipment rows' 3.5rem label column, or over the set search's 3rem number gutter where that is the left column: never on a tap target, and clear of the Summary's numbers on the right. The page container's `pb-20` is what lets the footer clear it. The files are supplied locally, not committed. Sound is off by default and not persisted — browsers block audio before a gesture. A missing file does not 404 (Vite and nginx both fall back to `index.html`), so the only symptom is the toggle snapping back to off.
- Not modelled: secret-skill caps and Iceborne sets. `sets.json` is scraped from the wiki's base-game set comparison page, so the other 45 set bonuses have no tiers and no armors — no Master Rank piece has a set bonus — and skills cap at `max_level`. For weapons: Low and High Rank, what is particular to a weapon type (shelling, phials, horn notes, kinsect bonus, coatings, ammo), Safi'jiiva awakenings and augments.

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
