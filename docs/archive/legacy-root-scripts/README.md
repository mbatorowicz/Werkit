# Legacy skrypty z katalogu głównego repo

Przeniesione z roota w maju 2026 — **nie używać** w normalnym workflow.

| Plik | Opis |
|---|---|
| `migrate.js` | Jednorazowy ALTER TABLE (`quantity_tons`, `expected_duration_hours`) — pokryte migracjami Drizzle |
| `runQuery.mjs`, `runQuery2.mjs`, `runQuery3.mjs` | Ad-hoc SQL przed ujednoliceniem pipeline’u |
| `refactor_auth.py` | Jednorazowa podmiana importów JWT w całym repo |

**Kanoniczne migracje:** `drizzle/` + `npm run db:migrate:pg` / `npm run db:napraw-wszystko-i-zweryfikuj` (patrz `AGENTS.md`, `docs/SYSTEM_MAP.md` §3.3).
