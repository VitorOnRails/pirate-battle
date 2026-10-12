# Architecture

Pirate Battle is a single-player, browser-only 2D top-down naval shooter. This
document explains how the pieces fit together, how the simulation is driven, and
the reasoning behind the design decisions — especially the non-obvious ones.

- **Rendering:** PixiJS 8 (WebGL)
- **UI / menus:** React 19
- **Language:** TypeScript (strict)
- **Remote state:** TanStack Query + Axios
- **Mock backend:** MSW (Mock Service Worker)
- **E2E + visual regression:** Playwright
- **Build:** Vite 6

---

## 1. Layering and boundaries

The codebase is split into four layers with a strict dependency direction. The
**engine never imports React**; React never reaches into the simulation loop.

```
          ┌───────────────────────────────────────────────┐
          │  UI (React)        src/ui, src/main.tsx       │
          │  screens, HUD, overlays, touch controls       │
          └───────────────┬────────────────┬──────────────┘
                          │ callbacks      │ hooks
                          ▼                ▼
      ┌───────────────────────────┐   ┌────────────────────────────┐
      │  Engine (PixiJS)          │   │  Data (remote state)       │
      │  src/engine, src/audio    │   │  src/data, src/mocks       │
      │  simulation, render,      │   │  contracts, Axios, TanStack│
      │  input                    │   │  Query, MSW handlers       │
      └───────────────────────────┘   └────────────────────────────┘
```

- **UI → Engine:** React creates one `Game`, hands it a set of callbacks, and
  calls imperative methods (`pause`, `resume`, `reset`, `setInput`). It never
  reads engine internals per frame.
- **Engine → UI:** the engine pushes state out through those callbacks only when
  a value changes (inversion of control). It has no knowledge of React.
- **UI → Data:** React consumes ranking/history through TanStack Query hooks and
  submits finished matches through a mutation.
- **Engine ↛ Data:** the simulation does not talk to the network. A finished
  match is reported to React via a callback; React owns persistence and
  submission. A backend failure can never block or crash gameplay.

```
src/
  main.tsx                 app bootstrap: MSW start, providers, render
  ui/
    App.tsx                screen state machine (menu/options/playing/…)
    GameCanvas.tsx         mounts the engine, owns HUD + overlays + touch
    screens/               Menu, Options, Ranking, History
  engine/
    game.ts                owns the Pixi app, entities, loop, match state
    config.ts              single typed balancing table
    input.ts               keyboard + external (touch) → action set
    steering.ts            enemy obstacle-avoidance
    collision.ts           circle / circle-rect / push-out helpers
    assets.ts              texture manifest + loader
    settings.ts            match settings + bounds + persistence
    entities/              player, enemy (+ chaser, shooter), projectile,
                           island, explosion
  audio/sounds.ts          dependency-free SFX + ambience layer
  data/
    contracts.ts           shared typed API contracts
    api.ts                 Axios client
    queries.ts             QueryClient + useRanking/useHistory/useSubmitMatch
    player.ts              local player identity
    pending.ts             offline submission queue
    useRetryPending.ts     flush the queue on mount / reconnect
  mocks/
    scenarios.ts           network-condition catalog
    db.ts                  in-memory store + deterministic fixtures
    handlers.ts            REST handlers
    browser.ts             service worker bootstrap
  styles/                  hud.css, screens.css
```

---

## 2. React ↔ PixiJS integration

### Inversion of control

The engine is React-agnostic. `GameCanvas` constructs the `Game` with a
`GameCallbacks` object:

```ts
new Game(
  { onScoreChange, onHealthChange, onTimeChange, onGameOver, onPauseChange },
  settings,
);
```

The engine calls these when state changes; React's `setState` functions are the
callbacks. This keeps a hard wall between simulation and view and means the
engine could be driven by any front-end.

### The HUD does not re-render per frame

A naive binding would push the score/time/health into React every frame (60×/s)
and thrash the virtual DOM. Instead the engine tracks the last value it emitted
and **only calls a callback when the value actually changes** (`emitChanges`).
The clock is emitted once per whole second (`Math.ceil`). Result: the HUD
re-renders roughly once per second plus on discrete events (a kill, a hit), not
per frame. The continuous combat state lives entirely in the simulation.

### Lifecycle and React Strict Mode

In development, Strict Mode mounts effects twice (mount → unmount → mount) to
surface unsafe side effects. Creating a WebGL context is exactly such a side
effect, so `Game` is written to survive it:

- `init()` is async (`app.init()` awaits WebGL setup). A `destroyed` flag is
  checked after the await; if the component unmounted mid-init, it tears down
  immediately instead of attaching a dead canvas.
- `teardown()` is idempotent (`tornDown` guard) and releases everything it owns:
  the ticker, the `blur` / `visibilitychange` / `keydown` listeners, the input
  listeners, the ambience loop, and `app.destroy(true, { children: true })`.
- Textures are **not** destroyed on teardown (`texture: false`). They belong to
  the shared `Assets` cache and are reused across a Strict-Mode remount; freeing
  them would blank the second instance.

`GameCanvas`'s effect returns a cleanup that sets `cancelled`, clears the ref and
calls `game.destroy()`. The effect re-runs (fresh match) when `settings` or a
`reloadKey` changes.

---

## 3. The simulation

### Frame-rate independence

Everything that moves is integrated against **delta time in seconds**
(`ticker.deltaMS / 1000`), never per frame. Speeds in `config` are therefore in
units/second and behave identically at 30, 60 or 144 Hz.

### Delta clamping

A pause/resume, a tab switch, a breakpoint or a GC pause can leave a huge gap
since the last frame. `dt` is clamped to `MAX_DELTA = 0.05` so the simulation
never "teleports" forward on resume and can't enter a spiral. This is also what
enforces the rule that a paused match accumulates no time.

### One frame, in phases

`update(ticker)` early-returns unless `status === "playing"`, then runs fixed
phases so ordering is explicit and deterministic:

```
tick clock → updateEntities → resolveCollisions → cleanup → detect game over → emit changes
```

- `updateEntities` advances the player, enemies, both projectile pools, effects
  and the water drift, keeps ships out of islands and inside the world, moves the
  camera, and ticks the spawner.
- `resolveCollisions` handles shots-vs-ships, ship-vs-ship contact and island
  absorption.
- `cleanup` removes dead entities, iterating **backwards** so in-place `splice`
  is safe, and destroys their display objects.

### Pause: manual and automatic

`status` is `"playing" | "paused" | "over"`. Pause is triggered by the HUD
button, the `Esc`/`P` key, window `blur`, or `visibilitychange` (tab hidden).
Each source passes a `PauseReason`, which the overlay turns into a fitting
message. **Automatic pause never auto-resumes** — resuming always requires a
deliberate user action, as the spec requires. Because the loop is frozen and
`dt` is clamped, cooldowns and the clock simply hold.

---

## 4. Gameplay systems

### Config as the single source of truth

`config.ts` is one typed table: arena, player, projectile, weapons, enemy
tuning, spawning, scoring, match duration and the island layout. Nothing in the
logic hard-codes a balance number. A match **snapshots** the relevant settings
at construction (`MatchSettings`), so editing options mid-match only affects the
next match — consistent with how a finished record stores the config it was
played with.

### Ships: heading-based movement

Both the player and enemies move by a **heading** (facing angle), not by axis.
Movement is `(cos θ, sin θ) · speed · dt`; the sprite is drawn at
`heading + SHIP_SPRITE_OFFSET` (the art points "up", hence the −90° offset). The
player rotates with `A`/`D` and thrusts with `W`; it fires a single forward shot
(`Space`) and a three-shot broadside to either side (`Q`/`E`), each weapon on its
own cooldown.

### Enemy AI and obstacle avoidance (`steering.ts`)

Two enemy types extend a shared abstract `Enemy` (health bar, aiming, movement,
damage). `Chaser` drives at the player and rams (explodes on contact, no score
for self-destruction). `Shooter` holds a preferred range and fires on a cooldown.

The hard part is **not grinding into islands**. The chosen approach is
**steering with look-ahead obstacle avoidance**, not grid A\*:

> Each frame, a ship computes the heading it *wants* (toward/away from the
> player), then `steerAround` samples candidate headings offset from it —
> smallest offset first (`0, ±0.3, ±0.6 … ±2.1` rad) — and picks the first whose
> "feeler" (5 points sampled up to `LOOKAHEAD = 160` px ahead) is clear of every
> island, expanded by the ship's radius. So a ship goes straight when it can and
> turns only as much as it must to round a corner.

**Why steering and not A\*:** the map is a handful of **convex rectangular**
islands and the target (player) moves every frame, which would force constant
A\* re-planning. Ships also rotate rather than teleporting between grid cells, so
a path would need a steering layer to be followed anyway. Look-ahead steering is
lighter, produces smooth naval motion, and fits the movement model directly. Its
known weakness — concave traps — does not exist on this map. The capsule
push-out (below) remains as a last-resort guarantee that a ship can never end up
inside an island even if steering is briefly imperfect.

The `Shooter` steers its *movement* around islands but always **fires straight at
the player** (`atan2`), independent of where the hull turned to avoid an
obstacle.

### Collision

`collision.ts` has three primitives: `circlesOverlap`, `circleRectOverlap`, and
`pushOutOfRect` (resolves along the least-penetration axis).

- **Shots vs ships:** circle-vs-circle; a shot deals damage once, then dies.
- **Islands vs shots:** any shot overlapping an island rect is absorbed.
- **Islands vs ships — capsule:** a long hull is tested as a **capsule** (two
  circles, bow and stern, placed along the heading) rather than one big circle.
  A single circle either lets the bow cross the shore or leaves a gap when the
  ship lies parallel to the coast; two circles stop the ship cleanly both
  nose-first and side-on. Islands are axis-aligned rectangles (`halfW`/`halfH`),
  so `pushOutOfRect` is exact and cheap.

### Camera and world

The world (`arena`, 2200×1400) is larger than the viewport; a `world` container
is translated so the player stays centered, clamped to the map edges (and
centered on an axis if the window is larger than the world there). The canvas
itself tracks the window (`resizeTo: window`), so the view fills any screen with
no letterboxing and the camera reads the live screen size each frame.

### Spawning and match rules

Enemies spawn on an interval (configurable in Options), always **off-screen**
(checked against the live camera window + a buffer) and clear of islands, up to a
cap (`maxEnemies`). The match ends on health ≤ 0 (death) or the clock reaching
zero (time); ending freezes everything and surfaces a result. `reset()` starts a
fresh match in place (entities cleared, ship/score/clock reset) — islands persist
as fixed terrain.

---

## 5. Rendering, assets, audio

### Assets (`assets.ts`)

A typed manifest maps aliases to URLs under `public/assets`. `loadAssets`
registers them once (a guard makes it Strict-Mode-safe) and loads with progress
reported to the loading overlay. A load failure is caught and shown as a retry
screen rather than a blank canvas. Textures live in the shared `Assets` cache and
are reused across matches/remounts.

### Responsive canvas and density

`app.init` uses `resizeTo: window` + `autoDensity: true` +
`resolution: min(devicePixelRatio, 2)`, so the canvas fills the screen and stays
crisp on high-DPI/mobile without inflating the fill rate unboundedly. The HUD and
touch controls are DOM layers on top of the canvas (not drawn in Pixi), which
keeps them semantic and accessible.

### Audio (`sounds.ts`)

A small dependency-free layer over the kit's WAV files. SFX are one-shot (cloned
per play so they overlap); the ocean ambience is a single loop. A master volume
and mute are persisted and exposed in Options. Browsers block audio until the
first user gesture, so any `play()` rejection before the first click is swallowed
(the menu's Play click unlocks it). Combat/event sounds are triggered from the
engine; a single delegated listener plays the UI click for the React kit buttons.

---

## 6. Data layer: ranking and history

### Contracts first

`contracts.ts` defines the shapes shared by the Axios client, the TanStack hooks
and the MSW handlers, so client and mock can never drift. A `MatchRecord` carries
a **client-generated `id`** that is the idempotency key, plus player id/name,
score, duration, end reason, the config it was played with, and an ISO date.

### Reads (TanStack Query + Axios)

`useRanking(page)` and `useHistory(playerId, page)` wrap Axios calls. They use
`placeholderData: keepPrevious` so paging shows the previous page while the next
loads instead of flashing a spinner, `retry: 2`, and a short `staleTime`. The
screens render all states explicitly: loading, empty, error (with a retry), and
data. Query keys are per-page, so an out-of-order/late response for one page can
never overwrite a newer one.

### Writes, idempotency and offline recovery

This is the spec's core consistency requirement, solved with three pieces:

1. **Pending queue (`pending.ts`):** when a match ends, `GameCanvas` builds the
   record **once** (guarded by a ref) and immediately enqueues it in
   `localStorage` before attempting the network. A record is therefore never
   lost to a failed request, a crash or a refresh.
2. **Mutation (`useSubmitMatch`):** submits the record; on success it removes it
   from the queue and invalidates both `ranking` and `history` so the two tabs
   refresh. On failure the record simply stays queued.
3. **Retry (`useRetryPending`):** on app mount and on the `online` event, every
   queued record is resubmitted.

Because the server **upserts by `id`**, resubmitting — whether from a retry, a
double click, or the "commit then timeout" case where the write landed but the
reply was lost — never creates a duplicate. The player can start another match
while a record is still pending. A failed submission shows a status on the result
screen with a manual retry, but never blocks play.

### Identity and persistence

`player.ts` holds a stable local identity (`id` + captain name) in
`localStorage`; the id ties a player's records together across sessions, while
the name is editable from the menu ("Play as guest" rerolls it). Persistence
summary (all `localStorage`):

| Key | Owner | Contents |
| --- | --- | --- |
| `pirate-battle:settings` | `settings.ts` | match session time + spawn interval |
| `pirate-battle:player` | `player.ts` | player id + name |
| `pirate-battle:pending` | `pending.ts` | unconfirmed match records |
| `pirate-battle:records` | `mocks/db.ts` | the local player's confirmed matches |
| `pirate-battle:scenario` | `mocks/scenarios.ts` | selected demo network |
| `pirate-battle:audio` | `audio/sounds.ts` | muted + volume |

Every read/write is wrapped in try/catch so blocked storage degrades gracefully.

---

## 7. Mock network (MSW)

MSW is the backend in both development **and** the published build (started in
`main.tsx` before the first render). `db.ts` seeds **40 deterministic fixtures**
(a seeded `mulberry32` PRNG) for the other captains, so the ranking is identical
on every load; the local player's confirmed matches are layered on top and
persisted. Ranking sorts by score with a deterministic tie-break (date, then id);
history filters by player, newest first; both paginate.

### Scenario catalog (`scenarios.ts`)

A single declarative table drives every network condition the challenge asks for,
selectable from Options and persisted:

`success`, `empty`, `slow`, `variable-latency`, `out-of-order`, `timeout`,
`offline` (connection failure), `http-400`, `http-500`, `reads-fail`
(reads fail, writing still works), `submit-timeout` (commit **then** time out),
`submit-fail` (saving unavailable, record stays pending). A "Reset demo data"
action clears confirmed + pending records and returns to `success`.

Each scenario describes a latency profile and a per-operation `Fault`
(`ok | connection | timeout | commit-timeout | http+status`). The handlers apply
latency, then the fault; `commit-timeout` is special — it persists the record
and only then hangs, which is exactly how idempotent recovery is demonstrated.
`out-of-order` hands out decreasing delays so later requests can resolve before
earlier ones, exercising the per-page query-key protection.

---

## 8. UI, accessibility, responsiveness

- **Screen routing** is a plain state machine in `App.tsx` (`menu | options |
  playing | ranking | history`). For a single-player app this is clearer and
  lighter than a router library.
- **Theming** uses the challenge's own UI kit: panels and buttons are 9-sliced
  (`border-image`) so the ornate frames scale to any size without distorting
  their corners.
- **Responsive / touch:** the canvas fills the viewport; on coarse-pointer or
  narrow screens, on-screen Move/Fire buttons appear and feed the **same** input
  action set as the keyboard via `Game.setInput`, so the engine has one unified
  notion of intent. On precise-pointer desktops the touch layer is hidden.
- **Accessibility:** all controls are semantic `<button>`s with labels and a
  visible `:focus-visible` outline; the HUD exposes score via a polite live
  region (not per-frame); game keys are only captured while a match is mounted.

---

## 9. Testing

Playwright drives the real app (its own Vite server; MSW is the backend) across:

- **navigation** between every screen,
- **ranking** data / empty / offline-error states and paging,
- **history write path** end-to-end: a seeded pending record is flushed through
  the real retry queue and appears in history; a reload re-submits the same id
  and the count stays at one (idempotency); and the `commit-then-timeout`
  scenario records exactly one match,
- **gameplay**: the engine mounts (canvas + HUD), pause/resume, exit,
- **visual regression** of the menu (baseline committed).

The suite runs single-worker: the gameplay test uses a real WebGL context that
the headless software renderer starves — and the page crashes — if another worker
competes for the CPU. Serial keeps it deterministic. Tests seed `localStorage`
via `addInitScript`, so scenarios and the pending queue are driven **without any
test-only hooks in production code**.

---

## 10. Key decisions at a glance

| Decision | Why |
| --- | --- |
| Engine has zero React imports; IoC via callbacks | Hard separation; HUD never re-renders per frame |
| Emit on change, clock per second | Keeps React off the 60 Hz path |
| `dt` in seconds, clamped at 0.05 | Frame-rate independence; no leap on resume |
| Steering avoidance, not A\* | Convex islands + moving target + rotating ships |
| Capsule (two circles) vs island rects | Long hulls stop cleanly bow-on and side-on |
| Client-generated id + server upsert | Idempotent submission; no duplicates ever |
| Pending queue in `localStorage` + retry | Records survive failure/refresh; play never blocked |
| MSW in the published build | The demo is fully functional offline of any real server |
| Single typed `config` + per-match snapshot | Balance without touching logic; consistent records |
| Touch + keyboard share one action set | One engine notion of intent; no branching |

---

## 11. Performance notes

- The HUD is off the per-frame path (section 2), so React is idle during play.
- Textures are shared and reused; teardown never frees them.
- Dead entities are pooled out with backward `splice` + display destroy.
- Render resolution is capped at 2× DPR to bound fill rate on high-DPI screens.
- Steering is a few hundred cheap arithmetic checks per enemy per frame, well
  within budget for the enemy cap (14).

See the README for how to capture FPS / frame-time / memory figures on a given
machine.

---

## 12. Known limitations

- **PixiJS teardown warning.** Destroying a match logs two PixiJS v8 warnings
  (`[BindGroup] a 'textureSource'/'textureSampler' was destroyed while still bound
  to a shader`). They come from PixiJS freeing the renderer's GPU resources on
  `Application.destroy()` while the last rendered frame's texture is still bound —
  an internal ordering in the library, not a leak or an error. It fires only on
  match exit and has no effect on gameplay, rendering, or data. Shared textures
  are preserved (`texture: false`), so nothing the app owns is lost. It was left
  as a documented, benign warning rather than silenced with a `console.warn`
  filter; the honest fix (keeping a single long-lived `Application` and clearing
  the scene instead of destroying the renderer per match) is a deliberate future
  improvement, not worth a teardown hack here.
- **Enemy steering** uses look-ahead avoidance, which is ideal for the convex
  rectangular islands on this map but could get stuck in a concave trap on a
  different layout; the capsule push-out is the safety net (see section 4).
