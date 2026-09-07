# The Glasshouse Lesson

Original chapter: apprentice Ivo (cropped ivory jacket, rust split apron, drafting instrument) and apprentice Nell (sage capelet, cream overalls, copper curls, seed satchel). Disciplines are chosen independently of identity. A lesson in watering plants gets gloriously out of hand.

## Contract
Exactly two real players; creator owns serializable puzzles/progression. Both simulate their own Rapier capsule at 60 Hz; transforms 20 Hz, remote interpolation. Reliable spell intents, validated by host role and proximity; state snapshots 10 Hz. Trystero WebRTC with public Nostr discovery for static production; the official WebSocket discovery relay runs alongside Vite for deterministic local/LAN tests. It carries signaling only. No game server, accounts, database, or BroadcastChannel substitute.

## Chapter / active work for each player
1. Atelier: shared toybox, three chimes and levitating ceramics; Shaper aligns a teaching ring and Warden opens its botanical channel; both Spark opposite pads. Explore, jump and dash before leaving.
2. Rootwright bridge: Warden grows two huge branches while Shaper guides their direction to different sockets. Both traverse the resulting leaves across the void; second anchor is reached on the bridge.
3. Flower ferry: both board a flower. Shaper translates its planter on a broad lateral rail; Warden controls height through growth. Together reach three suspended irrigation droplets (either Sparks to collect) and the far landing.
4. Waterwheel: Shaper rotates the broken wheel to each of three braces; Warden grows structural roots through the aligned brace; both traverse newly repaired machinery and Spark the pressure valves. The experiment escapes.
5. Split gallery: players occupy separate balconies. Warden sees which root channel is alive; Shaper sees numbered structural arches. Communicate three routes, guide and bloom. No codebook; wrong choices wobble and reset only that route.
6. Runaway vine: both ride its broad head through six authored gates. Shaper steers with A/D; Warden holds E to grow, releasing to wait. A wrong alignment stalls gently. Both can Spark floating seed bells. Moving arches, wind, streaming leaves, rising sky and camera widening deliver spectacle.
7. Final seal: three concentric broken rings; Shape aligns and Bloom binds each. Players occupy opposite nodes and Spark within a generous three-second window. A bright wave settles the architecture; enormous flowers remain. Teacher's note: 'Good. Now, the small watering can.' Ending and same-room rematch with swap.

## Input and feel
WASD camera-relative locomotion; Space buffered/coyote jump; Shift dash; mouse drag (RMB) orbit, optional click pointer lock; E hold discipline; A/D manipulate while channeling (W/S adds elevation where applicable); LMB or R Spark; Q Arcane Hand; F world ping; Escape menu. No freehand gestures. Generous target magnetism, soft alignment, visible guide/goal silhouettes, contextual hints. Frequent checkpoints; falls return in about one second. No lives.

## Art and rendering
Honey, walnut, jade, parchment, terracotta, coral petals and ivory constructed magic. Generated contact sheet is a composition/material reference, not a promise of its photorealistic detail. Runtime deliberately simplifies toward faceted, illustrated forms and broad silhouettes. Original Blender kit: articulated characters, pot/plant/books/workbench/lantern, arch and structural seal. Procedural splines and petal growth adapt this kit. One unit = one metre, Y up runtime, forward -Z, ground-level pivots. Dynamic key light + hemisphere, fog, restrained bloom, reusable geometry/materials and instanced foliage. No external art ships.

## Verification
Use actual independent Playwright browser contexts, actual RTCDataChannels, both screen captures, keyboard movement/casts and host state assertions. Deterministic checkpoint/debug API available only in development or explicit ?debug=1 builds. Test complete chapter, third admission, swapping, replay and both disconnect paths. Performance measured from browser frames/renderer.info. First-play duration remains an estimate until human pairs play; never imply automation measures enjoyment.
