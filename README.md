# Pirate Battle

A 2D top-down naval shooter that runs entirely in the browser. Sail between
islands, sink Chaser and Shooter ships, and climb the ranking before the clock
runs out.

**▶ Play:** https://pirate-battle-fawn.vercel.app/

Built with **React 19**, **TypeScript** (strict), **PixiJS 8**, **TanStack Query
+ Axios**, **MSW**, **Playwright**, and **Vite 6**.

> The architecture and the reasoning behind every design decision are documented
> in **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## Features

- Heading-based ship movement with forward and broadside (three-shot) cannons.
- Two enemy AIs — **Chaser** (rams) and **Shooter** (keeps range and fires) —
  that **steer around islands** instead of grinding into them.
- Capsule-based island collision, a follow camera over a world larger than the
  screen, off-screen enemy spawning with a live cap.
- Full match loop: configurable duration, scoring, game over by time or death,
  pause (manual **and** automatic on focus/visibility loss), restart.
- Ranking and match history backed by TanStack Query + Axios over an MSW mock,
  with loading / empty / error states, idempotent submission, an offline retry
  queue, and recovery after failures.
- A selectable **demo network** that reproduces latency, timeouts, HTTP errors,
  out-of-order responses and outages on demand.
- Kit-based HUD and menus, on-screen touch controls, a responsive canvas, sound
  effects and ambience, and keyboard-accessible menus.

---

## Getting started

Requires **Node 18+** and npm.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default `http://localhost:5173`). The mock backend
(MSW) starts automatically — there is no separate server to run.

### Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR. |
| `npm run build` | Type-check the project references and build to `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run typecheck` | Type-check only (`tsc -b --noEmit`). |
| `npm run test:e2e` | Run the Playwright E2E + visual-regression suite. |

> **First Playwright run:** install the browser once with
> `npx playwright install chromium`. To refresh the visual baseline after an
> intentional UI change, run `npm run test:e2e -- --update-snapshots`.

The production build is fully functional on its own — the MSW mock runs in the
published build too, so the deployed site needs no backend.

---

## Controls

### Keyboard

| Keys | Action |
| --- | --- |
| `W` / `↑` | Sail forward |
| `A` `D` / `←` `→` | Turn left / right |
| `Space` | Fire forward |
| `Q` / `E` | Broadside left / right |
| `Esc` / `P` | Pause / resume |

### Touch

On touch devices (or a narrow window) on-screen **Move** and **Fire** buttons
appear and drive the same actions as the keyboard, so you can steer and fire at
the same time.

---

## Options

Open **Options** from the menu. Changes apply to your **next** match (a match
snapshots its settings when it starts).

- **Game session time** — match length, 60–180 s (validated, persisted).
- **Enemy spawn time** — seconds between enemy spawns, 1–10 s.
- **Audio** — toggle sound effects + ambience and set the master volume.
- **Demo network** — simulate a network condition for the ranking/history API
  (see below). **Reset demo data** clears your saved + pending matches.

---

## Demo network scenarios

The ranking and history talk to a mock API (MSW). The **Demo network** selector
in Options switches, live, between:

| Scenario | Behaviour |
| --- | --- |
| Success | Fast and reliable. |
| Empty lists | Reads succeed but return no data. |
| Slow responses | High latency on every request. |
| Variable latency | Latency swings request to request. |
| Out-of-order replies | Slow replies can land after newer ones. |
| Request timeout | Requests hang past the client timeout. |
| Connection failure | Every request fails to connect. |
| HTTP 400 / HTTP 500 | Every request returns that status. |
| Reads unavailable | Ranking/history fail; saving still works. |
| Commit then timeout | The save commits, then the reply times out — it recovers without duplicating. |
| Save unavailable | Saving fails; the result stays pending and retries later. |

A finished match is queued locally before it is sent, retried on reconnect, and
the server upserts by a client-generated id — so a retry, a double submit, or a
"commit then timeout" never creates a duplicate, and gameplay is never blocked by
a backend failure.

---

## Project structure

```
src/
  ui/        React screens, HUD, overlays, touch controls
  engine/    PixiJS simulation: game loop, entities, input, collision, steering
  audio/     dependency-free SFX + ambience
  data/      typed contracts, Axios client, TanStack Query hooks, pending queue
  mocks/     MSW handlers, deterministic fixtures, network scenarios
  styles/    HUD and screen CSS
e2e/         Playwright specs + fixtures
```

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for how these fit together.

---

## Testing

```bash
npm run test:e2e
```

The Playwright suite drives the real app (its own Vite server, MSW as the
backend) and covers navigation, the ranking data/empty/error states, the match
write path end-to-end (including idempotent recovery), a gameplay smoke test, and
a visual-regression snapshot of the menu. It runs single-worker because the
gameplay test uses a real WebGL context. An HTML report is written to
`playwright-report/`.

---

## Performance

The HUD is kept off the per-frame path (the engine pushes state to React only on
change), textures are shared and reused, dead entities are pooled out, and render
resolution is capped at 2× device pixel ratio. Target: 60 FPS.

Measured in Chrome (desktop) with the Frame Rendering Stats overlay, during a
live match:

- **Frame rate:** a steady **60 FPS** throughout gameplay (~16.7 ms/frame), with
  enemies, projectiles, steering and collisions all active.
- **GPU memory:** held at **~3 MB** — textures are loaded once and shared, so it
  stays flat across repeated matches (no growth, no leak).
- **Entities:** bounded by design — at most **14** enemy ships on screen
  (`config.spawn.maxEnemies`) plus the active projectiles and effects.

To reproduce: open DevTools → Rendering → _Frame Rendering Stats_ and play; or
paste a short `requestAnimationFrame` sampler into the console to log the average
FPS and 95th-percentile frame time.

---

## Credits & licenses

- **Art & audio:** [Kenney](https://kenney.nl) — Pirate Pack and UI/audio assets,
  released under **CC0 1.0** (public domain). No attribution required; credited
  here with thanks.
- **Libraries:** React, PixiJS, TanStack Query, Axios, MSW, Playwright and Vite,
  each under its own MIT (or equivalent) license.

This project was built as a technical challenge submission.
