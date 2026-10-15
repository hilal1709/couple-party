# Graph Report - game  (2026-10-15)

## Corpus Check
- 155 files · ~409,971 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 883 nodes · 2221 edges · 44 communities (39 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1dca33e9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- uno/ui/Lobby.tsx
- package.json
- App.tsx
- UnoTable.tsx
- DrawBoard.tsx
- Design System: Couple Party
- build.py
- add
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
- snakes/engine.ts
- react
- registry.ts
- Slab.tsx
- draw/engine.ts
- audio.ts
- transport.ts
- draw/ui/Lobby.tsx
- dialog.tsx
- SnakesBoard.tsx
- entryById
- release.mjs
- devDependencies
- UpdateBanner.tsx
- capture.mjs
- scripts
- games/types.ts
- art.ts
- Loader.tsx
- useRoom.test.ts
- vite.config.ts
- capacitor.config.ts

## God Nodes (most connected - your core abstractions)
1. `add()` - 33 edges
2. `react` - 32 edges
3. `mat()` - 31 edges
4. `st()` - 23 edges
5. `faceOf()` - 19 edges
6. `compilerOptions` - 19 edges
7. `reduce()` - 18 edges
8. `play()` - 18 edges
9. `UnoTable()` - 18 edges
10. `anim()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `SnakesBoard()` --indirect_call--> `ladderUp()`  [INFERRED]
  src/games/snakes/ui/SnakesBoard.tsx → scripts/lottie.mjs
- `SnakesBoard()` --indirect_call--> `snakeBite()`  [INFERRED]
  src/games/snakes/ui/SnakesBoard.tsx → scripts/lottie.mjs
- `SnakesBoard()` --indirect_call--> `itemPop()`  [INFERRED]
  src/games/snakes/ui/SnakesBoard.tsx → scripts/lottie.mjs
- `SnakesBoard()` --indirect_call--> `cardPop()`  [INFERRED]
  src/games/snakes/ui/SnakesBoard.tsx → scripts/lottie.mjs
- `ToolButton()` --calls--> `squiggles()`  [EXTRACTED]
  src/games/draw/ui/DrawBoard.tsx → src/components/memphis/patterns.ts

## Import Cycles
- None detected.

## Communities (44 total, 5 thin omitted)

### Community 0 - "uno/ui/Lobby.tsx"
Cohesion: 0.14
Nodes (12): CREDITS, Drawer(), DrawerContent(), DrawerDescription(), DrawerTitle(), Slider(), HouseRules, HOUSE_INFO (+4 more)

### Community 1 - "package.json"
Cohesion: 0.10
Nodes (19): name, private, type, version, @capacitor/android, class-variance-authority, cn, @fontsource/dela-gothic-one (+11 more)

### Community 2 - "App.tsx"
Cohesion: 0.11
Nodes (9): App(), floor, load(), makeCode(), RoomInfo, SEAT_TONES, src_assets_illustrations_hero, src_assets_illustrations_waiting (+1 more)

### Community 3 - "UnoTable.tsx"
Cohesion: 0.05
Nodes (89): react-dom, vitest, src_assets_lottie_burst, SfxName, terrazzo(), NAMES, UnoDemo(), CardBack (+81 more)

### Community 4 - "DrawBoard.tsx"
Cohesion: 0.09
Nodes (33): src_assets_lottie_draw_close, src_assets_lottie_draw_correct, src_assets_lottie_draw_pick, src_assets_lottie_draw_reveal, src_assets_lottie_draw_timeup, useMusic(), canGuess(), CHOOSE_SECONDS (+25 more)

### Community 5 - "Design System: Couple Party"
Cohesion: 0.06
Nodes (30): Buttons (Slab), Cards / Containers, Colors, Components, Design System: Couple Party, Discard Ring and Podium (signature), Do:, Do's and Don'ts (+22 more)

### Community 6 - "build.py"
Cohesion: 0.14
Nodes (22): datetime, json, ndarray, numpy, Path, pathlib, pil, draw_music() (+14 more)

### Community 7 - "add"
Cohesion: 0.09
Nodes (76): bpy, math, mathutils, add(), cheek(), cone(), crown(), eye() (+68 more)

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
Cohesion: 0.27
Nodes (35): anim(), burst(), cardPop(), confetti(), diceRoll(), doc(), drawClose(), drawCorrect() (+27 more)

### Community 21 - "snakes/engine.ts"
Cohesion: 0.05
Nodes (66): dots(), cellOf(), EFFECTS, int(), makeBoard(), DARES, QUIZ, QuizQ (+58 more)

### Community 22 - "react"
Cohesion: 0.19
Nodes (17): @hugeicons/core-free-icons, @hugeicons/react, react, Home(), RoomCode(), Props, dismissToast(), emit() (+9 more)

### Community 23 - "registry.ts"
Cohesion: 0.18
Nodes (10): src_assets_draw_tile_draw, src_assets_snakes_tile_snakes, src_assets_snakes_tile_uno, draw, CATEGORIES, Category, GameEntry, GAMES (+2 more)

### Community 25 - "Slab.tsx"
Cohesion: 0.18
Nodes (18): src_assets_illustrations_lose, src_assets_illustrations_win, sfx(), ConfirmModal(), ConfirmProps, Modal(), ModalProps, cache (+10 more)

### Community 26 - "draw/engine.ts"
Cohesion: 0.17
Nodes (25): advance(), copy(), deal(), defaultOptions(), distance(), DRAWER_POINTS, GUESS_POINTS, init() (+17 more)

### Community 27 - "audio.ts"
Cohesion: 0.15
Nodes (14): howler, AudioSettings, listeners, music, musicVolume(), playMusic(), setSettings(), settings (+6 more)

### Community 28 - "transport.ts"
Cohesion: 0.15
Nodes (11): @supabase/supabase-js, hasOnline, localTransport(), NetStatus, openTransport(), profile, store, SUPABASE_KEY (+3 more)

### Community 29 - "draw/ui/Lobby.tsx"
Cohesion: 0.13
Nodes (20): Switch(), LEVEL_BONUS, DrawAction, DrawOptions, DrawState, FeedItem, Level, Pack (+12 more)

### Community 30 - "dialog.tsx"
Cohesion: 0.16
Nodes (3): radix-ui, Button(), buttonVariants

### Community 31 - "SnakesBoard.tsx"
Cohesion: 0.10
Nodes (17): gsap, @gsap/react, src_assets_lottie_card_pop, src_assets_lottie_confetti, src_assets_lottie_dice_roll, src_assets_lottie_item_pop, src_assets_lottie_ladder_up, src_assets_lottie_snake_bite (+9 more)

### Community 32 - "entryById"
Cohesion: 0.43
Nodes (7): Room(), useRoomToasts(), entryById(), gameById(), applyAction(), storeKey(), useRoom()

### Community 33 - "release.mjs"
Cohesion: 0.20
Nodes (6): ref_node_child_process, ref_node_fs, { version }, [bump = 'patch', ...noteParts], [ma, mi, pa], pkg

### Community 34 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, @capacitor/cli, oxlint, @types/node, @types/react, @types/react-dom, typescript, vite (+2 more)

### Community 35 - "UpdateBanner.tsx"
Cohesion: 0.25
Nodes (12): @capacitor/core, Banner(), Phase, UpdateBanner(), ApkUpdater, ApkUpdaterPlugin, APP_VERSION, compareVersions() (+4 more)

### Community 36 - "capture.mjs"
Cohesion: 0.22
Nodes (7): ref_node_os, chrome, pending, profile, send(), [url, out, w = '390', h = '844', scale = '2'], ws

### Community 37 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, apk, build, dev, lint, preview, release, test

### Community 38 - "games/types.ts"
Cohesion: 0.27
Nodes (9): AnyGame, GameProps, Seat, Pick, Session, SessionAction, Peer, MAX_ROOM (+1 more)

### Community 39 - "art.ts"
Cohesion: 0.19
Nodes (12): CANVAS, INKS, WIDTHS, Stroke, INK_NAMES, paintAll(), paintStroke(), PAPER (+4 more)

### Community 40 - "Loader.tsx"
Cohesion: 0.33
Nodes (6): lottie-react, src_assets_lottie_loader, floor, Loader(), LoadingScreen(), reduceMotion()

### Community 42 - "vite.config.ts"
Cohesion: 0.33
Nodes (5): ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, pkg

## Knowledge Gaps
- **240 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+235 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 359 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `uno/ui/Lobby.tsx`, `package.json`, `App.tsx`, `UnoTable.tsx`, `DrawBoard.tsx`, `UpdateBanner.tsx`, `games/types.ts`, `snakes/engine.ts`, `registry.ts`, `Slab.tsx`, `audio.ts`, `draw/ui/Lobby.tsx`, `dialog.tsx`, `SnakesBoard.tsx`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `SnakesBoard()` connect `lottie.mjs` to `UnoTable.tsx`, `DrawBoard.tsx`, `snakes/engine.ts`, `Slab.tsx`, `SnakesBoard.tsx`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _240 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `uno/ui/Lobby.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14492753623188406 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10952380952380952 - nodes in this community are weakly interconnected._