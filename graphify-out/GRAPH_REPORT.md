# Graph Report - game  (2026-10-15)

## Corpus Check
- 215 files · ~541,693 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 1155 nodes · 3267 edges · 55 communities (50 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `794dbbef`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- react
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
- Banner.tsx
- registry.ts
- Slab.tsx
- draw/engine.ts
- audio.ts
- transport.ts
- draw/ui/Lobby.tsx
- dialog.tsx
- SnakesBoard.tsx
- useRoom.ts
- release.mjs
- devDependencies
- UpdateBanner.tsx
- capture.mjs
- scripts
- remi/types.ts
- art.ts
- cards.ts
- RemiTable.tsx
- vite.config.ts
- capacitor.config.ts
- rules.test.ts
- poker.ts
- remi/ui/copy.ts
- snakes/engine.test.ts
- snakes/types.ts
- blackjack.ts
- snakes/ui/copy.ts
- patterns.ts
- export.py
- main.tsx
- gsap

## God Nodes (most connected - your core abstractions)
1. `add()` - 43 edges
2. `react` - 40 edges
3. `mat()` - 40 edges
4. `Seat` - 31 edges
5. `st()` - 29 edges
6. `Slab()` - 24 edges
7. `anim()` - 23 edges
8. `layer()` - 22 edges
9. `shade_smooth()` - 21 edges
10. `card()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `SnakesBoard()` --indirect_call--> `ladderUp()`  [INFERRED]
  src/games/snakes/ui/SnakesBoard.tsx → scripts/lottie.mjs
- `SnakesBoard()` --indirect_call--> `snakeBite()`  [INFERRED]
  src/games/snakes/ui/SnakesBoard.tsx → scripts/lottie.mjs
- `SnakesBoard()` --indirect_call--> `itemPop()`  [INFERRED]
  src/games/snakes/ui/SnakesBoard.tsx → scripts/lottie.mjs
- `SnakesBoard()` --indirect_call--> `cardPop()`  [INFERRED]
  src/games/snakes/ui/SnakesBoard.tsx → scripts/lottie.mjs
- `RoomCode()` --calls--> `toast`  [EXTRACTED]
  src/App.tsx → src/components/feedback/toast.ts

## Import Cycles
- None detected.

## Communities (55 total, 5 thin omitted)

### Community 0 - "react"
Cohesion: 0.17
Nodes (11): react, CREDITS, Drawer(), DrawerContent(), DrawerDescription(), DrawerTitle(), Slider(), Switch() (+3 more)

### Community 1 - "package.json"
Cohesion: 0.10
Nodes (19): name, private, type, version, @capacitor/android, class-variance-authority, cn, @fontsource/dela-gothic-one (+11 more)

### Community 2 - "App.tsx"
Cohesion: 0.08
Nodes (21): App(), floor, Home(), HostControls(), load(), makeCode(), PickedGame(), RoomCode() (+13 more)

### Community 3 - "UnoTable.tsx"
Cohesion: 0.06
Nodes (88): src_assets_lottie_burst, hatch(), UnoDemo(), GameDef, CardBack, CardFace, COLOR_NAME, cornerText() (+80 more)

### Community 4 - "DrawBoard.tsx"
Cohesion: 0.09
Nodes (32): src_assets_lottie_draw_close, src_assets_lottie_draw_correct, src_assets_lottie_draw_pick, src_assets_lottie_draw_reveal, src_assets_lottie_draw_timeup, canGuess(), CHOOSE_SECONDS, hintCount() (+24 more)

### Community 5 - "Design System: Couple Party"
Cohesion: 0.06
Nodes (30): Buttons (Slab), Cards / Containers, Colors, Components, Design System: Couple Party, Discard Ring and Podium (signature), Do:, Do's and Don'ts (+22 more)

### Community 6 - "build.py"
Cohesion: 0.28
Nodes (15): ndarray, numpy, Path, draw_music(), ff(), load(), music(), Olah audio CC0 (sumber di D:/dev/audio-src) menjadi aset app di public/audio/.… (+7 more)

### Community 7 - "add"
Cohesion: 0.06
Nodes (113): bpy, math, mathutils, pathlib, add(), cheek(), cone(), crown() (+105 more)

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
Cohesion: 0.23
Nodes (43): anim(), burst(), cardBack(), cardPop(), chipShape(), confetti(), diceRoll(), doc() (+35 more)

### Community 21 - "snakes/engine.ts"
Cohesion: 0.19
Nodes (16): DARES, QUIZ, QuizQ, TRUTHS, Draft, draw(), effect(), emit() (+8 more)

### Community 22 - "Banner.tsx"
Cohesion: 0.21
Nodes (15): @hugeicons/core-free-icons, @hugeicons/react, vitest, Props, dismissToast(), emit(), FeedbackTone, getToasts() (+7 more)

### Community 23 - "registry.ts"
Cohesion: 0.11
Nodes (33): src_assets_draw_tile_draw, src_assets_remi_tile_remi, src_assets_snakes_tile_snakes, src_assets_snakes_tile_uno, NAMES, RemiDemo(), candidates(), lcg() (+25 more)

### Community 25 - "Slab.tsx"
Cohesion: 0.14
Nodes (20): lottie-react, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_loader, sfx(), floor, Loader(), reduceMotion() (+12 more)

### Community 26 - "draw/engine.ts"
Cohesion: 0.17
Nodes (24): advance(), copy(), deal(), defaultOptions(), distance(), DRAWER_POINTS, GUESS_POINTS, init() (+16 more)

### Community 27 - "audio.ts"
Cohesion: 0.15
Nodes (14): howler, AudioSettings, listeners, music, musicVolume(), playMusic(), setSettings(), settings (+6 more)

### Community 28 - "transport.ts"
Cohesion: 0.14
Nodes (10): @supabase/supabase-js, hasOnline, localTransport(), NetStatus, profile, store, SUPABASE_KEY, SUPABASE_URL (+2 more)

### Community 29 - "draw/ui/Lobby.tsx"
Cohesion: 0.15
Nodes (18): draw, DrawAction, DrawOptions, DrawState, FeedItem, Level, Pack, Phase (+10 more)

### Community 30 - "dialog.tsx"
Cohesion: 0.16
Nodes (3): radix-ui, Button(), buttonVariants

### Community 31 - "SnakesBoard.tsx"
Cohesion: 0.08
Nodes (31): src_assets_lottie_card_pop, src_assets_lottie_confetti, src_assets_lottie_dice_roll, src_assets_lottie_item_pop, src_assets_lottie_ladder_up, src_assets_lottie_snake_bite, src_assets_snakes_snakes_lose, src_assets_snakes_snakes_win (+23 more)

### Community 32 - "useRoom.ts"
Cohesion: 0.19
Nodes (15): Room(), useRoomToasts(), entryById(), gameById(), applyAction(), Pick, Session, SessionAction (+7 more)

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

### Community 38 - "remi/types.ts"
Cohesion: 0.12
Nodes (24): deal(), removeIds(), awaitingOut(), advance(), cangkulan, trickWinner(), dropPairs(), joker (+16 more)

### Community 39 - "art.ts"
Cohesion: 0.19
Nodes (12): CANVAS, INKS, WIDTHS, Stroke, INK_NAMES, paintAll(), paintStroke(), PAPER (+4 more)

### Community 40 - "cards.ts"
Cohesion: 0.07
Nodes (48): cardLabel(), makeDeck(), RANK_LABEL, rankLabel(), RED, shuffled(), sortHand(), SUIT_NAME (+40 more)

### Community 41 - "RemiTable.tsx"
Cohesion: 0.11
Nodes (23): src_assets_lottie_remi_bomb, src_assets_lottie_remi_bust, src_assets_lottie_remi_chips, src_assets_lottie_remi_deal, src_assets_lottie_remi_joker, src_assets_lottie_remi_liar, SfxName, Effect (+15 more)

### Community 42 - "vite.config.ts"
Cohesion: 0.33
Nodes (5): ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, pkg

### Community 44 - "rules.test.ts"
Cohesion: 0.14
Nodes (21): beats(), bigtwo, bigTwoPenalty(), btRank(), btValue(), comboOf(), FIVE_ORDER, SUIT_V (+13 more)

### Community 45 - "poker.ts"
Cohesion: 0.24
Nodes (15): highAce(), nextWhere(), after(), BOARD_AT, canAct(), compareScores(), evaluate(), HAND_NAMES (+7 more)

### Community 46 - "remi/ui/copy.ts"
Cohesion: 0.18
Nodes (14): BjResult, SEAT_HEX, sprite(), SPRITES, BJ_TEXT, eventText(), pokerNote(), roundText() (+6 more)

### Community 47 - "snakes/engine.test.ts"
Cohesion: 0.21
Nodes (14): nextRand(), shuffle(), EFFECTS, int(), makeBoard(), canUseItem(), defaultOptions(), init() (+6 more)

### Community 48 - "snakes/types.ts"
Cohesion: 0.24
Nodes (9): snakes, BAG, Deck, Item, Pending, SnakesAction, SnakesEvent, SnakesOptions (+1 more)

### Community 49 - "blackjack.ts"
Cohesion: 0.44
Nodes (9): active(), advance(), bjTotal(), blackjack, draw(), isBlackjack(), settle(), startPlay() (+1 more)

### Community 50 - "snakes/ui/copy.ts"
Cohesion: 0.27
Nodes (9): BONUS, SETBACK, Note, eventText(), FX_INFO, ITEM_INFO, noteText(), OPTION_INFO (+1 more)

### Community 51 - "patterns.ts"
Cohesion: 0.39
Nodes (6): cache, dots(), svgUrl(), terrazzo(), Lobby(), Toggle

### Community 52 - "export.py"
Cohesion: 0.33
Nodes (6): datetime, json, pil, main(), Ekspor render Blender per game (brand/illustrations/<game>/*.png) ke WebP untuk…, size_for()

### Community 53 - "main.tsx"
Cohesion: 0.40
Nodes (4): react-dom, Variant, src_index, Demo

## Knowledge Gaps
- **265 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+260 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 406 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `package.json`, `App.tsx`, `UnoTable.tsx`, `DrawBoard.tsx`, `Banner.tsx`, `registry.ts`, `Slab.tsx`, `audio.ts`, `draw/ui/Lobby.tsx`, `dialog.tsx`, `SnakesBoard.tsx`, `useRoom.ts`, `UpdateBanner.tsx`, `cards.ts`, `RemiTable.tsx`, `remi/ui/copy.ts`, `snakes/types.ts`, `patterns.ts`, `main.tsx`, `gsap`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `SnakesBoard()` connect `lottie.mjs` to `App.tsx`, `snakes/engine.test.ts`, `snakes/ui/copy.ts`, `patterns.ts`, `Slab.tsx`, `SnakesBoard.tsx`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `Seat` connect `remi/types.ts` to `useRoom.ts`, `UnoTable.tsx`, `DrawBoard.tsx`, `cards.ts`, `RemiTable.tsx`, `poker.ts`, `remi/ui/copy.ts`, `snakes/types.ts`, `blackjack.ts`, `snakes/ui/copy.ts`, `snakes/engine.ts`, `registry.ts`, `Slab.tsx`, `draw/engine.ts`, `draw/ui/Lobby.tsx`, `SnakesBoard.tsx`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _265 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07741935483870968 - nodes in this community are weakly interconnected._
- **Should `UnoTable.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05675877520537715 - nodes in this community are weakly interconnected._