# The Glasshouse Lesson

Two apprentice mages restore their atelier's irrigation spell, accidentally unleash it, and ride a runaway vine to put things right. A short, original, exactly-two-player third-person co-op chapter: shared movement and small magic, complementary **Shape** and **Bloom**, seven authored scenes, a final paired seal, and rematch.

## Run

Node.js **22.12+** (tested with 22.14), npm, a current desktop browser with WebGL 2, keyboard and mouse.

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. Create a lesson, copy its invite, and open it in a second browser/window. Choose or swap disciplines, both ready up, then the creator starts. There is no solo replacement for your partner.

The dev command also starts a tiny **signaling-only** relay on port 8787. The clients still exchange game data over real WebRTC; there is no WebSocket game-state fallback or BroadcastChannel multiplayer. Both peers must use the same discovery mode.

## Controls

| Input | Action |
|---|---|
| WASD | Camera-relative run |
| Space | Jump, with coyote time and input buffering |
| Shift | Dash |
| Right mouse drag | Orbit the camera |
| Left mouse / R | Spark: chimes, droplets, mechanisms, paired seals |
| Hold E | Channel your discipline near its target |
| E + A / D | Shaper: guide, rotate, or slide |
| E + W / S | Warden on the flower: grow higher / settle lower |
| Q | Pick up / toss a nearby small ceramic |
| F | Magical partner ping |
| Escape | Field notes, sound volume, safe-ground recovery, lobby |

The flower needs both people aboard. Shape controls its horizontal position and Bloom controls its height. On the vine, Shaper steers while Warden holds E to grow and releases to wait. Incorrect directions pause growth safely. Final nodes belong to the two characters: Ivo/creator left, Nell/guest right, regardless of discipline. Paired Sparks allow three seconds.

## Online rooms and production

```sh
npm run build
npm run preview
```

`dist/` is a static site suitable for HTTPS hosting, including Cloudflare Pages or Workers Assets. Nothing has been deployed. Serve the **same build** to both people. Production uses Trystero's public Nostr discovery automatically; all gameplay travels peer-to-peer. Append `?online=1` during development to exercise that production discovery path. Room links contain `?room=ABCDEF`; the code is an invitation, not a user account.

Local production QA uses `http://localhost:4173/?local=1&debug=1` while `npm run dev` supplies port 8787. For different devices, use an HTTPS origin accessible to both; plain HTTP on a LAN IP does not provide all browser secure-context APIs. Public discovery and direct NAT traversal depend on the networks involved.

**Optional TURN:** set `VITE_TURN_ENDPOINT` to your credential endpoint before building. It should return `{ "iceServers": [...] }`. `tools/turn-worker.ts` is an optional Cloudflare Worker using the current `generate-ice-servers` API and one-hour credentials. Configure server-side secrets `TURN_KEY_ID`, `TURN_API_TOKEN`, `ALLOWED_ORIGIN`, and a `RATE_LIMITER` binding. Never put long-lived TURN secrets in a `VITE_*` variable. No TURN configuration is needed for local or direct connections. The Worker is provided separately and has not been deployed or tested with paid credentials.

## Architecture / assets

- `src/simulation/`: serializable host-authoritative rules, admission, roles, puzzles, checkpoints and chapter state.
- `src/multiplayer/`: Trystero 0.25 action objects, reliable intents, 10 Hz snapshots, 20 Hz locally simulated player transforms, interpolated remote avatar, peer admission and disconnects.
- `src/physics/`: Rapier capsule controller, authored surfaces, moving-platform carry, slope/step forgiveness.
- `src/render/`: Three.js, GLB loading, procedural character motion, splines, particle effects, merged static scenery, instanced tiles.
- `src/input/`, `src/ui/`, `src/audio/`: explicit keyboard/mouse state, restrained DOM menus/HUD, original synthesized music and feedback. Fonts ship locally.
- `tools/blender/build.py`: original reproducible character/environment kit; `assets/source/glasshouse-kit.blend` is the editable Blender source.
- `public/assets/glasshouse-kit.glb`: optimized runtime kit (~2.1 MB), metre scale, Y up, ground pivots, stable named limb nodes.
- `references/REFERENCE_RESEARCH.md`, `references/DESIGN.md`, `references/generated/visual-targets.png`: research, design and original generated concept sheet. External reference imagery does not ship.

Regenerate with Blender installed (auto-detected on Windows, otherwise on PATH):

```sh
npm run assets
npm run assets:optimize
```

## Tests / diagnostics

```sh
npm test
npx playwright install chromium
# Keep dev + production preview running, then:
npm run test:e2e
```

The browser test creates **independent contexts and actual RTC connections**, rejects a third peer, drives movement and casts using keyboard input, plays each puzzle through authoritative transitions, captures both screens, and checks replay/disconnects. It uses explicit teleports to set up focused traversal/puzzle situations; it is not a claim of a human first-play duration. Screenshots and machine-readable results are in ignored `test-results/`.

`window.__MAGIC_GAME__` exposes read-only phase, roles, connection, transforms, checkpoint, puzzles, set-piece, seal and renderer diagnostics. Development or `?debug=1` adds host checkpoint selection (`movement`, `combined`, `flower`, `wheel`, `split`, `vine`, `seal`), safe respawn, puzzle reset, return-to-lobby, test intents and teleport. F3 toggles performance display. No secrets are exposed.

## Practical limits

Desktop keyboard/mouse only; no gamepad, mobile touch, built-in voice chat, account saving or host migration. Use your usual voice call. A disconnect freezes shared progression; return to the room and re-invite. Public relays have no service guarantee; TURN may be necessary behind restrictive NAT/firewalls. Target first-play length is roughly 12 minutes, but pacing/enjoyment have not been validated by a human pair. The visual style is deliberately compact stylized 3D, not the concept sheet's illustration fidelity.

## Credits / licenses

All game models, animation logic, geometry, spell motifs, sounds and music are original to this project. Concept sheet generated for this project using the built-in image-generation tool. No franchise art or soundtrack is included. Three.js, Vite, Trystero and glTF Transform: MIT; Rapier: Apache-2.0; DM Sans and Fraunces: SIL Open Font License (distributed through Fontsource). See `THIRD_PARTY_NOTICES.md` and the dependency packages for notices.
