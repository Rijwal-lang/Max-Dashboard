# Changelog

## ZIP audit fixes
- Fixed the Reset all action: it referenced a removed `STATE_LOCK` constant, which threw before saved data could be cleared.
- Fixed backup import replacement: `persistState(true)` now honors its force-replace option instead of merging imported data with the existing state.
- Removed an inline style assignment from the new-tab link helper to avoid conflicting with the dashboard's strict `style-src-attr 'none'` policy.
- Corrected the `_headers` note to point to the location note that is actually included in this ZIP.
- Cache-buster advanced to `app.js?v=22`; its Subresource Integrity hash was regenerated.

## Task-history pruning fix
- **Bug:** `taskHist` (per-task completion history, kept even after a task is deleted) was loaded with `Object.entries(...).slice(0, 1000)`. Once 1000 task ids had piled up, the *first* 1000 were kept and the *newest* were silently dropped. The cross-tab merge could also grow it past what the validator accepts.
- **Fix:** history is now trimmed by a single helper, `trimTaskHist()`:
  1. history of tasks that still exist is always kept;
  2. history of deleted tasks is dropped once its newest entry is older than 90 days (the same window `hist` uses, so no visible statistic changes);
  3. only if it is still over the limit (4000 ids = 3 lists x 1000 live tasks + headroom) are the *least recently active* deleted-task entries dropped. Newest always wins.
  The same helper runs on load, import, cross-tab merge, and every state reconcile.
- **Same class of bug, also fixed:** `pomoHist` used `slice(0, 400)` on days, which could drop the newest days (including today). It now keeps the newest 400 days.
- New limit `LIM.taskHist = 4000`; validator uses it instead of `LIM.items`.
- New test: `taskhist-prune-test.html` (4300 recent + 1200 ancient deleted tasks + 450 days of pomodoros). The three test pages are kept at the repository root; run them from the deployed site to verify behavior.
- Cache-buster `app.js?v=20`; SRI hashes regenerated.

## Max Dashboard v8 audit follow-up
- Per-task completion dates are retained for the same 90-day window used by visible statistics, including for live tasks.
- Cross-tab merge and validation enforce the same per-task date window to keep state size bounded.
- Cache-buster advanced to `app.js?v=18`.
- The localStorage lease remains best-effort, and state/revision remain separate keys. localStorage has no atomic compare-and-swap; these concurrency limitations are not claimed as fully solved.

## Concurrency and persistence hardening
- Replaced the best-effort localStorage lease with the Web Locks API exclusive lock for same-origin tabs. Saves fail visibly rather than silently falling back to an unsafe lock when Web Locks is unavailable.
- State and revision are now stored together in a single versioned record under the primary state key, avoiding split state/revision writes.
- Added legacy state-record reading for migration and made startup await its initial save. Timer completion and backup import await save confirmation before reporting success.
- Cross-tab synchronization now reads the revision from the atomic state record. Cache-buster advanced to `app.js?v=19`.

## Navigation fix
- Fixed duplicate navigation where `window.open(..., noopener)` could return `null` even when the browser opened the new tab, causing a second navigation in the dashboard tab.
- External URLs now open through a temporary anchor with `target=_blank` and `rel=noopener noreferrer`; failure no longer navigates the dashboard away. The URL search uses the same new-tab behavior when the selected browser is the current browser.
- Cache-buster advanced to `app.js?v=20`.

## Schedule tab
- Replaced the empty Schedule tab with a responsive day planner: add events with date/time/category/notes, mark complete, delete, navigate days, and jump to upcoming events.
- Schedule data is stored separately in browser localStorage; added storage-error feedback and refreshed asset integrity hashes.
- Preserved the state revision around sanitization before save conflict checks.
\n## Timer alarm fix\n- Reuse an AudioContext unlocked by a user gesture instead of creating a new context only when the timer ends (which browsers may block as autoplay).\n- Play a three-tone audible alarm at completion and add a Test sound button to verify browser audio before a session.\n- Start/resume also primes audio; browser/site mute settings can still silence audio.\n

## Personal Schedule tab
- Reframed Schedule as Max's study-build-reset plan, with direct brotherly copy instead of generic productivity advice.
- Added personal fill-in presets for homework/revision, GALACTO/UHLM, SR SMP/Minecraft, AI/LLM exploration, proper breaks, and helping with the family shop/business. Presets fill the form but never create an event without the user confirming the date/time and pressing Add.
- Improved persisted event validation, added explicit 500-item limit feedback, and made date/time validation stricter.
- Added responsive schedule styling and updated CSS/Schedule script cache-busters and SRI hashes.

## Schedule timed reminders

- Added per-event timed reminders (on by default) in the Schedule tab.
- Added a user-gesture browser-notification permission flow and service-worker notification display/click handling for supported secure browser contexts.
- Added periodic due-event checks, same-day overdue recovery on focus/visibility, cross-tab reminder claims, persistent per-event notification markers, and an in-page fallback when OS notifications are unavailable.
- Kept schedule reminders independent from the focus timer.
- Documented that reliable delivery while the entire browser is closed requires a push backend; this static build makes no such guarantee.

## Latest uploaded ZIP audit
- Confirmed task merge semantics and documented the actual three-way merge policy: a concurrent edit wins over a deletion of the same task when the other copy differs from the base; this is not deletion-wins.
- Gated the startup, audit-regression, and task-history-pruning test pages behind an explicit confirmation and added visible warnings because they temporarily replace same-origin localStorage values. Prefer an isolated browser profile or test origin.
- Verified the uploaded Schedule tab's notification limitation is documented: reminders are checked by the open page and are not guaranteed when the browser is closed.

## Dashboard-wide notifications, weekly schedule, and complete backup
- Added a dashboard notification center with unread count, mark-read, dismiss, clear, bounded local history, and cross-tab refresh.
- Schedule reminders and focus timer completion now publish entries into the notification center.
- Added a Monday-to-Sunday weekly Schedule view with week navigation and day labels while preserving the personalized day planner.
- Backup export now includes Schedule events and its checksum; import restores validated Schedule events as well as dashboard state and widget layout.
- Backup format version advanced to 6. Older backups without Schedule data remain importable.
- Notifications and schedule data remain browser-local. Schedule reminder checks still require the dashboard page to be open; this static site cannot guarantee alarms while closed.
