# SDD ledger — plan: workspaces/chunxiaruo-commits/docs/2026-10-21-lesson-homework-plan.md

- User approved design, plan and inline execution. Scope: personal directory only; main and root source remain read-only.
- Ruling: cloud skill helper scripts are not available as executable files; keep this durable ledger in the personal directory and use equivalent direct test/commit commands. Cost if wrong: bookkeeping differs, product behavior unchanged.
- Ruling: Git checkout and linked worktree live inside the personal directory .local; no root .gitignore changes are necessary. Baseline is fixed at 5c189221bb80a6232e20c3902e550f1d867eb97b.
- Pre-flight 1→2: preview root and database paths must be passed explicitly, never inherited from external DATABASE_URL.
- Pre-flight 2→3→4: published lesson and attachment DTOs share transaction ownership checks; bindings are immutable.
- Pre-flight 2/4→5→6: Page metadata, UTC timestamps and requestId semantics are identical across server and frontend.
- Pre-flight 1/3→7: review regeneration preserves data outside review-app; recovery cleans only unbound uploads.
- Task 1: in progress.

- Task 1: complete — isolation tests 5/5, original frontend tests 45/45, original backend tests 54/54.
- Ruling: original CORS test assumes 5173; test runner uses original CORS setting while preview serves on 5174. Empty SQLite test files are created before migrate deploy, matching existing project runner.
- Task 2: RED observed — 7 missing-API failures, existing-booking assertion passed; implementing lesson endpoints next.

- Task 2: complete — watched missing endpoints fail, implemented Prisma additive migration and guarded lesson APIs, full backend suite 62/62; TypeScript build passed.

- Task 3: complete — multipart tests observed RED (7 missing-feature failures), full suite GREEN 69/69; real byte download, 20 MiB boundary, Office parsing, quota concurrency, interrupted-upload recovery, publication immutability and cancellation verified.
- Task 3 dependencies locked in overlay only: @fastify/multipart 9.4.0, yauzl 3.4.0, @types/yauzl 2.10.3.

- Task 4: complete — six missing-submission tests observed RED; full backend suite GREEN 75/75 and TypeScript build passed. Concurrent revisions, idempotent retry, late boundary, cancelled read-only and immutable files verified.
- Ruling: successful POST replay after cancellation returns the already-created record without writing; new submissions remain forbidden. Cost if wrong: callers see a read result rather than a new operation.
- Ruling: frontend teaching unit tests live in overlay/tests so the generated application resolves the exact existing dependencies; canonical source stays in the personal directory. Cost if wrong: only test tooling paths differ from the plan.

- Task 5: complete — missing adapter/scope modules observed RED; frontend suite GREEN 52/52 and vue-tsc passed. Authenticated upload, 401 handling, requestId preservation, stale response disposal and private object URL cleanup covered.

- Task 6: complete — browser test first failed on absent teaching entry, then passed after implementation; frontend 52/52, vue-tsc and H5 build passed. Full file-exchange/multi-width tests continue in Task 7.

- Task 7: Ruling: browser tests force a full reload when directly entering another uni-app hash URL, avoiding framework-cached route parameters; normal in-app teaching buttons are also exercised. Cost if wrong: direct hash-only navigation needs separate framework work.
- Task 7: fixed max Chinese JSON request size with route-local 128 KiB limits; other routes retain 32 KiB. Regression observed 413→200.
- Task 7: fixed stale 401 logout, cross-account pending requestId deletion and hidden-page restore races; each observed RED then GREEN.
- Task 7: crash orphan cleanup regression observed RED; cleanup now only touches old regular random-key files without DB owners.
- Ruling: scripts use fileURLToPath rather than import.meta.dirname to preserve the declared Node >=20 floor. Cost if wrong: script path resolution, covered by isolation and browser runs.

- Task 7: complete — full automatic verification passed: isolation 5/5, backend 79/79, frontend 56/56, existing B workflows 9/9, both type checks, backend/H5/mp-weixin builds, two browser cases and regeneration persistence.
- Ruling: each browser spec receives a fresh API/web lifecycle because the persistence spec intentionally restarts/stops its server. Cost if wrong: test startup time only.
- Final whole-branch independent review: completed, two Important findings accepted; no Critical. See CODE-REVIEW.md.
- Review fix pass: new booking-read stale-401 and durable-discard tests observed RED; fixed both within personal overlay. Browser regression exposed empty DELETE JSON framing; sent an explicit object and allowed PUT/DELETE CORS in the copied app only.
- Final fix validation: isolation 5/5, backend 80/80, frontend 58/58, existing B workflows 9/9, all types/builds, both browser cases, restart/regeneration persistence and scope checks passed. No second independent review requested.
- User feature review and integration approval remain pending; approvedForIntegration stays false.
