# Graph Report - game  (2026-10-15)

## Corpus Check
- 123 files · ~300,098 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 747 nodes · 1731 edges · 44 communities (40 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0f725150`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- uno/ui/Lobby.tsx
- package.json
- App.tsx
- uno/engine.ts
- CardArt.tsx
- Design System: Couple Party
- build.py
- common.py
- components.json
- dependencies
- compilerOptions
- compilerOptions
- Product
- build_logo.py
- 💞 Couple Party
- .oxlintrc.json
- Couple Party — logo
- tsconfig.json
- CLAUDE.md
- lottie.mjs
- CREDITS.md
- SnakesBoard.tsx
- UpdateBanner.tsx
- uno/types.ts
- UnoTable.tsx
- snakes/types.ts
- audio.ts
- transport.ts
- snakes/engine.ts
- dialog.tsx
- snakes/engine.test.ts
- session.ts
- release.mjs
- devDependencies
- snakes/ui/copy.ts
- capture.mjs
- scripts
- useRoom.ts
- export.py
- Loader.tsx
- react
- vite.config.ts
- capacitor.config.ts

## God Nodes (most connected - your core abstractions)
1. `react` - 29 edges
2. `add()` - 23 edges
3. `mat()` - 21 edges
4. `faceOf()` - 19 edges
5. `compilerOptions` - 19 edges
6. `reduce()` - 18 edges
7. `play()` - 18 edges
8. `UnoTable()` - 18 edges
9. `st()` - 16 edges
10. `compilerOptions` - 15 edges

## Surprising Connections (you probably didn't know these)
- `SnakesBoard()` --indirect_call--> `ladderUp()`  [INFERRED]
  src/games/snakes/ui/SnakesBoard.tsx → scripts/lottie.mjs
- `SnakesBoard()` --indirect_call--> `snakeBite()`  [INFERRED]
  src/games/snakes/ui/SnakesBoard.tsx → scripts/lottie.mjs
- `SnakesBoard()` --indirect_call--> `itemPop()`  [INFERRED]
  src/games/snakes/ui/SnakesBoard.tsx → scripts/lottie.mjs
- `SnakesBoard()` --indirect_call--> `cardPop()`  [INFERRED]
  src/games/snakes/ui/SnakesBoard.tsx → scripts/lottie.mjs
- `withRoll()` --calls--> `reduce()`  [EXTRACTED]
  src/games/snakes/engine.test.ts → src/games/snakes/engine.ts

## Import Cycles
- None detected.

## Communities (44 total, 4 thin omitted)

### Community 0 - "uno/ui/Lobby.tsx"
Cohesion: 0.13
Nodes (16): @hugeicons/core-free-icons, @hugeicons/react, setSettings(), useAudioSettings(), CREDITS, SoundButton(), SoundDrawer(), Drawer() (+8 more)

### Community 1 - "package.json"
Cohesion: 0.10
Nodes (19): name, private, type, version, @capacitor/android, cn, @fontsource/dela-gothic-one, @fontsource-variable/geist (+11 more)

### Community 2 - "App.tsx"
Cohesion: 0.09
Nodes (13): App(), floor, load(), makeCode(), RoomInfo, SEAT_TONES, src_assets_illustrations_hero, src_assets_illustrations_waiting (+5 more)

### Community 3 - "uno/engine.ts"
Cohesion: 0.09
Nodes (59): Demo(), faceLabel(), buildDeck(), classicFaces(), f(), flipDarkFaces(), flipLightFaces(), noMercyFaces() (+51 more)

### Community 4 - "CardArt.tsx"
Cohesion: 0.14
Nodes (13): cache, dots(), svgUrl(), terrazzo(), CardBack, CardFace, cornerText(), DARK_SIDE (+5 more)

### Community 5 - "Design System: Couple Party"
Cohesion: 0.06
Nodes (30): Buttons (Slab), Cards / Containers, Colors, Components, Design System: Couple Party, Discard Ring and Podium (signature), Do:, Do's and Don'ts (+22 more)

### Community 6 - "build.py"
Cohesion: 0.25
Nodes (13): ndarray, numpy, Path, ff(), load(), music(), Olah audio CC0 (sumber di D:/dev/audio-src) menjadi aset app di public/audio/.…, Normalisasi loudness lalu simpan OGG Vorbis. (+5 more)

### Community 7 - "common.py"
Cohesion: 0.10
Nodes (55): bpy, math, mathutils, pathlib, add(), cheek(), cone(), crown() (+47 more)

### Community 8 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 9 - "dependencies"
Cohesion: 0.09
Nodes (23): dependencies, @capacitor/android, @capacitor/core, class-variance-authority, cn, @fontsource/dela-gothic-one, @fontsource-variable/geist, gsap (+15 more)

### Community 10 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+12 more)

### Community 11 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 12 - "Product"
Cohesion: 0.18
Nodes (10): Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product, Product Principles (+2 more)

### Community 13 - "build_logo.py"
Cohesion: 0.22
Nodes (4): Membangun kit logo Couple Party: simbol, wordmark (outline dari Dela Gothic…, fonttools_pens_svgpathpen, fonttools_pens_transformpen, fonttools_ttlib

### Community 14 - "💞 Couple Party"
Cohesion: 0.22
Nodes (8): 💞 Couple Party, Game, Instal di HP, Menambah game, Perintah, Rilis & update dari dalam aplikasi, Setup online (sekali saja), Struktur

### Community 15 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 16 - "Couple Party — logo"
Cohesion: 0.40
Nodes (4): Aturan, Couple Party — logo, File, Warna

### Community 17 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, paths, files, references

### Community 19 - "lottie.mjs"
Cohesion: 0.30
Nodes (27): anim(), burst(), cardPop(), confetti(), diceRoll(), doc(), ease, fade() (+19 more)

### Community 21 - "SnakesBoard.tsx"
Cohesion: 0.08
Nodes (32): src_assets_lottie_card_pop, src_assets_lottie_confetti, src_assets_lottie_dice_roll, src_assets_lottie_item_pop, src_assets_lottie_ladder_up, src_assets_lottie_snake_bite, src_assets_snakes_snakes_lose, src_assets_snakes_snakes_win (+24 more)

### Community 22 - "UpdateBanner.tsx"
Cohesion: 0.11
Nodes (29): @capacitor/core, vitest, RoomCode(), Banner(), Props, dismissToast(), emit(), FeedbackTone (+21 more)

### Community 23 - "uno/types.ts"
Cohesion: 0.12
Nodes (24): src_assets_snakes_tile_snakes, src_assets_snakes_tile_uno, snakes, SnakesOptions, Toggle, AnyGame, GameDef, LobbyProps (+16 more)

### Community 25 - "UnoTable.tsx"
Cohesion: 0.15
Nodes (20): gsap, @gsap/react, radix-ui, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_burst, sfx(), ConfirmModal() (+12 more)

### Community 26 - "snakes/types.ts"
Cohesion: 0.18
Nodes (14): nextRand(), shuffle(), EFFECTS, int(), BAG, Board, Deck, Effect (+6 more)

### Community 27 - "audio.ts"
Cohesion: 0.15
Nodes (13): howler, Home(), AudioSettings, listeners, music, musicVolume(), playMusic(), settings (+5 more)

### Community 28 - "transport.ts"
Cohesion: 0.16
Nodes (10): @supabase/supabase-js, hasOnline, localTransport(), openTransport(), Peer, profile, SUPABASE_KEY, SUPABASE_URL (+2 more)

### Community 29 - "snakes/engine.ts"
Cohesion: 0.26
Nodes (12): Draft, draw(), effect(), emit(), endTurn(), finish(), ITEMS, jumpTo() (+4 more)

### Community 30 - "dialog.tsx"
Cohesion: 0.15
Nodes (3): class-variance-authority, Button(), buttonVariants

### Community 31 - "snakes/engine.test.ts"
Cohesion: 0.22
Nodes (11): makeBoard(), DARES, QUIZ, QuizQ, TRUTHS, canUseItem(), defaultOptions(), init() (+3 more)

### Community 32 - "session.ts"
Cohesion: 0.26
Nodes (9): Room(), useRoomToasts(), entryById(), gameById(), applyAction(), Session, SessionAction, guest (+1 more)

### Community 33 - "release.mjs"
Cohesion: 0.20
Nodes (6): ref_node_child_process, ref_node_fs, { version }, [bump = 'patch', ...noteParts], [ma, mi, pa], pkg

### Community 34 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, @capacitor/cli, oxlint, @types/node, @types/react, @types/react-dom, typescript, vite (+2 more)

### Community 35 - "snakes/ui/copy.ts"
Cohesion: 0.27
Nodes (9): BONUS, SETBACK, Item, Note, eventText(), ITEM_INFO, noteText(), OPTION_INFO (+1 more)

### Community 36 - "capture.mjs"
Cohesion: 0.22
Nodes (7): ref_node_os, chrome, pending, profile, send(), [url, out, w = '390', h = '844', scale = '2'], ws

### Community 37 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, apk, build, dev, lint, preview, release, test

### Community 38 - "useRoom.ts"
Cohesion: 0.29
Nodes (7): Pick, NetStatus, store, MAX_ROOM, Msg, storeKey(), useRoom()

### Community 39 - "export.py"
Cohesion: 0.33
Nodes (6): datetime, json, pil, main(), Ekspor render Blender Ular Tangga (brand/illustrations/snakes/*.png) ke WebP…, size_for()

### Community 40 - "Loader.tsx"
Cohesion: 0.33
Nodes (6): lottie-react, src_assets_lottie_loader, floor, Loader(), LoadingScreen(), reduceMotion()

### Community 41 - "react"
Cohesion: 0.43
Nodes (5): react, NAMES, Variant, src_index, Demo

### Community 42 - "vite.config.ts"
Cohesion: 0.33
Nodes (5): ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, pkg

## Knowledge Gaps
- **232 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+227 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 336 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `uno/ui/Lobby.tsx`, `package.json`, `App.tsx`, `CardArt.tsx`, `useRoom.ts`, `SnakesBoard.tsx`, `UpdateBanner.tsx`, `uno/types.ts`, `UnoTable.tsx`, `audio.ts`, `dialog.tsx`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `SnakesBoard()` connect `lottie.mjs` to `snakes/ui/copy.ts`, `CardArt.tsx`, `SnakesBoard.tsx`, `UnoTable.tsx`, `audio.ts`, `snakes/engine.test.ts`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _232 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `uno/ui/Lobby.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13227513227513227 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._