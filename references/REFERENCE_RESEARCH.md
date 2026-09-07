# Focused reference research — 7 September 2026

Sources below are developer/publisher pages, their gameplay galleries and official docs. Takeaways are our design interpretations, not claims that we played these commercial games. No external imagery is included. Original targets: [generated/visual-targets.png](generated/visual-targets.png), generated with the built-in image tool. Prompt: six consistent gameplay views of two craft apprentices, warm atelier, bridge, Shape, Bloom, giant vine and brass final seal; ivory/rust/sage clothing, walnut/brass/coral materials, constructed ivory spell geometry. The sheet succeeds at atmosphere and continuity but is too realistic/dense for runtime; simplify surface detail and retain silhouettes, arches and light.

| Reference / source | Design question | Useful principle and application | Do not copy |
|---|---|---|---|
| [Witch Hat Atelier / Kodansha](https://kodansha.us/series/witch-hat-atelier/) | How does learned magic feel like craft? | Apprentice fantasy, instruments and working materials; our tools resemble a compass and seed caliper. | Costumes, pointed hats, actual circles, characters, story. |
| [It Takes Two & Split Fiction / Hazelight](https://hazelight.se/games) and [Split Fiction gameplay / EA](https://www.ea.com/en/games/split-fiction/split-fiction) | How do temporary abilities invite conversation while retaining movement? | Teach one use, then transform its context; our continuous Shape/Bloom inputs become two-axis ferry control and vine steering. | Levels, compositions, characters, narrative. |
| [Portal 2 / Valve](https://store.steampowered.com/app/620/Portal_2/) | What makes a puzzle need two minds? | Dedicated cooperative situations; opposite final nodes, spatial ping, separate information. | Portals, test chambers, robot silhouettes, dialogue. |
| [Trine 4 / Frozenbyte](https://www.frozenbyte.com/games/trine-4-the-nightmare-prince/) | Where is object manipulation satisfying versus fiddly? | Physical environment transformation; restrict Shape to forgiving rails and broad angle targets. | Conjured boxes, characters, exact physics puzzles. |
| [Pode / Henchman & Goon](https://www.podegame.com/) | Can transformation itself be a reward? | Positive actions revive sleeping environments; Bloom dramatically changes silhouette and route. | Rock/star heroes, Norwegian cave designs. |
| [Degrees of Separation / publisher](https://store.steampowered.com/app/809880/Degrees_of_Separation/) | Can two consistent effects support a whole chapter? | Our two rules remain unchanged across increasingly dynamic contexts. | Heat/cold world split and characters. |
| [Unravel Two / EA gameplay gallery](https://www.ea.com/games/unravel/unravel-two) | How can assistance preserve both players' agency? | Forgiving shared traversal; wide ferry/ride surfaces, quick independent fall recovery. | Yarn tether, doll silhouettes, scenes. |
| [Mages of Mystralia / publisher](https://store.steampowered.com/app/529660/Mages_of_Mystralia/) | How can constructed spells remain immediate? | Understandable operations create effects; character traces automatically while player chooses. | Rune grammar, spell menus, characters. |
| [Magicka / publisher](https://store.steampowered.com/app/42910/Magicka/) | How can combining magic encourage experiments? | Shared sparks and harmless bouncing ceramics encourage playful interaction. | Combat, element keyboard, robes and humour. |
| [We Were Here / Total Mayhem](https://store.steampowered.com/app/582500/We_Were_Here/) | What information difference produces speech without tedium? | Three visible branch choices, one player sees living route, one steers structure. | Codebooks, castle, radio puzzles. |
| [Biped / publisher listing](https://store.steampowered.com/app/1071870/Biped/) | How can coordination be funny without awkward movement? | Two-axis flower controls create harmless overshoot; ordinary movement remains conventional. | Robot designs or limb-control scheme. |
| [Palm House / Royal Botanic Gardens Kew](https://www.kew.org/kew-gardens/whats-in-the-gardens/palm-house) | How does glass architecture frame enormous plants? | Repeated thin arches, layered foliage and central sightline; our greenhouse unfolds during the accident. | Exact building layout or photographs. |

## Current technical sources
- [Three.js installation](https://threejs.org/manual/en/installation.html), [GLTFLoader](https://threejs.org/docs/#GLTFLoader): Vite ES modules, native GLB loader.
- [Vite guide](https://vite.dev/guide/): current Vite 8 supports installed Node 22.14.
- [Rapier character controller](https://rapier.rs/docs/user_guides/javascript/character_controller/): capsule movement correction, auto-step, slope and ground snap.
- [Trystero current repository](https://github.com/dmotz/trystero): 0.25 action objects use .send/.onMessage and peer event properties; use explicit authority/admission above its discovery layer. Optional turnConfig and official ws-relay.
- [Blender glTF exporter](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html): applied transforms, glTF materials and named hierarchy.
- [glTF Transform](https://gltf-transform.dev/): dedup/prune and material merging; avoid lossy animation simplification.

Orbitals was optional and is not a design dependency. Research intentionally ends here to protect implementation/playtest time.
