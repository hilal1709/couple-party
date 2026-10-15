# Graph Report - game  (2026-10-15)

## Corpus Check
- 251 files · ~650,560 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 1346 nodes · 3962 edges · 66 communities (60 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7de0f1aa`
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
- remi/engine.ts
- Slab.tsx
- draw/engine.ts
- audio.ts
- transport.ts
- draw/types.ts
- dialog.tsx
- SnakesBoard.tsx
- useRoom.ts
- release.mjs
- devDependencies
- UpdateBanner.tsx
- capture.mjs
- scripts
- remi/types.ts
- DominoTable.tsx
- cards.ts
- RemiTable.tsx
- vite.config.ts
- capacitor.config.ts
- poker.tsx
- poker.ts
- remi.py
- snakes/types.ts
- registry.ts
- blackjack.ts
- snakes/ui/copy.ts
- patterns.ts
- export.py
- domino.py
- qiuqiu.ts
- draw.py
- domino/engine.ts
- domino/ui/RoundEnd.tsx
- domino/types.ts
- common.py
- uno/ui/RoundEnd.tsx
- snakes/engine.test.ts
- DrawBoard
- useMusic
- pathlib
- canGuess

## God Nodes (most connected - your core abstractions)
1. `add()` - 51 edges
2. `react` - 45 edges
3. `mat()` - 45 edges
4. `Seat` - 41 edges
5. `st()` - 35 edges
6. `anim()` - 29 edges
7. `layer()` - 28 edges
8. `Slab()` - 27 edges
9. `doc()` - 26 edges
10. `stroke()` - 25 edges

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

## Communities (66 total, 6 thin omitted)

### Community 0 - "react"
Cohesion: 0.13
Nodes (12): react, Drawer(), DrawerContent(), DrawerDescription(), DrawerTitle(), Switch(), DOTS, Props (+4 more)

### Community 1 - "package.json"
Cohesion: 0.09
Nodes (21): name, private, type, version, @capacitor/android, class-variance-authority, cn, @fontsource/dela-gothic-one (+13 more)

### Community 2 - "App.tsx"
Cohesion: 0.11
Nodes (12): App(), floor, HostControls(), load(), makeCode(), PickedGame(), RoomInfo, SEAT_TONES (+4 more)

### Community 3 - "UnoTable.tsx"
Cohesion: 0.05
Nodes (95): react-dom, vitest, src_assets_lottie_burst, hatch(), terrazzo(), DominoDemo(), NAMES, RemiDemo() (+87 more)

### Community 4 - "DrawBoard.tsx"
Cohesion: 0.10
Nodes (31): src_assets_lottie_draw_close, src_assets_lottie_draw_correct, src_assets_lottie_draw_pick, src_assets_lottie_draw_reveal, src_assets_lottie_draw_timeup, CANVAS, INKS, WIDTHS (+23 more)

### Community 5 - "Design System: Couple Party"
Cohesion: 0.06
Nodes (30): Buttons (Slab), Cards / Containers, Colors, Components, Design System: Couple Party, Discard Ring and Podium (signature), Do:, Do's and Don'ts (+22 more)

### Community 6 - "build.py"
Cohesion: 0.28
Nodes (16): ndarray, numpy, Path, domino_music(), draw_music(), ff(), load(), music() (+8 more)

### Community 7 - "add"
Cohesion: 0.18
Nodes (37): add(), cheek(), cone(), crown(), eye(), mat(), mochi(), mouth() (+29 more)

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
Cohesion: 0.20
Nodes (53): anim(), burst(), cardBack(), cardPop(), chipShape(), confetti(), diceRoll(), doc() (+45 more)

### Community 21 - "snakes/engine.ts"
Cohesion: 0.20
Nodes (15): Draft, draw(), effect(), emit(), endTurn(), finish(), ITEMS, jumpTo() (+7 more)

### Community 22 - "Banner.tsx"
Cohesion: 0.19
Nodes (16): @hugeicons/core-free-icons, @hugeicons/react, RoomCode(), Banner(), Props, dismissToast(), emit(), FeedbackTone (+8 more)

### Community 23 - "remi/engine.ts"
Cohesion: 0.16
Nodes (23): candidates(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce() (+15 more)

### Community 25 - "Slab.tsx"
Cohesion: 0.18
Nodes (17): radix-ui, setSettings(), sfx(), useAudioSettings(), CREDITS, SoundButton(), SoundDrawer(), ConfirmProps (+9 more)

### Community 26 - "draw/engine.ts"
Cohesion: 0.16
Nodes (25): advance(), CHOOSE_SECONDS, copy(), deal(), defaultOptions(), distance(), DRAWER_POINTS, GUESS_POINTS (+17 more)

### Community 27 - "audio.ts"
Cohesion: 0.18
Nodes (10): howler, AudioSettings, listeners, music, musicVolume(), playMusic(), settings, sfxCache (+2 more)

### Community 28 - "transport.ts"
Cohesion: 0.15
Nodes (11): @supabase/supabase-js, hasOnline, localTransport(), NetStatus, openTransport(), profile, store, SUPABASE_KEY (+3 more)

### Community 29 - "draw/types.ts"
Cohesion: 0.13
Nodes (18): LEVEL_BONUS, draw, DrawAction, DrawOptions, DrawState, FeedItem, Level, Pack (+10 more)

### Community 31 - "SnakesBoard.tsx"
Cohesion: 0.08
Nodes (32): src_assets_lottie_card_pop, src_assets_lottie_confetti, src_assets_lottie_dice_roll, src_assets_lottie_item_pop, src_assets_lottie_ladder_up, src_assets_lottie_snake_bite, src_assets_snakes_snakes_lose, src_assets_snakes_snakes_win (+24 more)

### Community 32 - "useRoom.ts"
Cohesion: 0.21
Nodes (12): gameById(), applyAction(), Pick, Session, SessionAction, Peer, MAX_ROOM, Msg (+4 more)

### Community 33 - "release.mjs"
Cohesion: 0.20
Nodes (6): ref_node_child_process, ref_node_fs, { version }, [bump = 'patch', ...noteParts], [ma, mi, pa], pkg

### Community 34 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, @capacitor/cli, oxlint, @types/node, @types/react, @types/react-dom, typescript, vite (+2 more)

### Community 35 - "UpdateBanner.tsx"
Cohesion: 0.28
Nodes (11): @capacitor/core, Phase, UpdateBanner(), ApkUpdater, ApkUpdaterPlugin, APP_VERSION, compareVersions(), fetchLatest() (+3 more)

### Community 36 - "capture.mjs"
Cohesion: 0.22
Nodes (7): ref_node_os, chrome, pending, profile, send(), [url, out, w = '390', h = '844', scale = '2'], ws

### Community 37 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, apk, build, dev, lint, preview, release, test

### Community 38 - "remi/types.ts"
Cohesion: 0.08
Nodes (42): beats(), bigtwo, bigTwoPenalty(), btRank(), btValue(), comboOf(), FIVE_ORDER, SUIT_V (+34 more)

### Community 39 - "DominoTable.tsx"
Cohesion: 0.09
Nodes (36): src_assets_lottie_domino_blocked, src_assets_lottie_domino_chips, src_assets_lottie_domino_deal, src_assets_lottie_domino_score, src_assets_lottie_domino_slam, src_assets_lottie_domino_special, canPass(), chainPlayable() (+28 more)

### Community 40 - "cards.ts"
Cohesion: 0.09
Nodes (25): deal(), makeDeck(), RANK_LABEL, RED, removeIds(), shuffled(), SUIT_SORT, SUIT_SYMBOL (+17 more)

### Community 41 - "RemiTable.tsx"
Cohesion: 0.09
Nodes (36): src_assets_lottie_remi_bomb, src_assets_lottie_remi_bust, src_assets_lottie_remi_chips, src_assets_lottie_remi_deal, src_assets_lottie_remi_joker, src_assets_lottie_remi_liar, SfxName, ConfirmModal() (+28 more)

### Community 42 - "vite.config.ts"
Cohesion: 0.33
Nodes (5): ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, pkg

### Community 44 - "poker.tsx"
Cohesion: 0.19
Nodes (20): sortHand(), SUIT_NAME, suitIndex(), sprite(), CardBack, CardFace, who(), bigtwoView (+12 more)

### Community 45 - "poker.ts"
Cohesion: 0.22
Nodes (16): highAce(), nextWhere(), after(), BOARD_AT, canAct(), compareScores(), evaluate(), HAND_NAMES (+8 more)

### Community 46 - "remi.py"
Cohesion: 0.15
Nodes (35): bevel(), card(), chip(), chip_sprite(), chip_stack(), circle_outline(), dealer_btn(), deck_sprite() (+27 more)

### Community 47 - "snakes/types.ts"
Cohesion: 0.21
Nodes (13): nextRand(), shuffle(), EFFECTS, int(), Board, Effect, GOAL, Pending (+5 more)

### Community 48 - "registry.ts"
Cohesion: 0.11
Nodes (17): src_assets_domino_tile_domino, src_assets_draw_tile_draw, src_assets_remi_tile_remi, src_assets_snakes_tile_snakes, src_assets_snakes_tile_uno, domino, summary(), CATEGORIES (+9 more)

### Community 49 - "blackjack.ts"
Cohesion: 0.23
Nodes (15): active(), advance(), bjTotal(), blackjack, draw(), isBlackjack(), MIN_BET, settle() (+7 more)

### Community 50 - "snakes/ui/copy.ts"
Cohesion: 0.21
Nodes (11): BONUS, SETBACK, Note, eventText(), FX_INFO, ITEM_INFO, noteText(), OPTION_INFO (+3 more)

### Community 51 - "patterns.ts"
Cohesion: 0.33
Nodes (6): cache, dots(), svgUrl(), Lobby(), parseCustom(), LobbyProps

### Community 52 - "export.py"
Cohesion: 0.33
Nodes (6): datetime, json, pil, main(), Ekspor render Blender per game (brand/illustrations/<game>/*.png) ke WebP untuk…, size_for()

### Community 53 - "domino.py"
Cohesion: 0.16
Nodes (31): no_lines(), bevel(), bone_pile(), bone_sprite(), chain(), chip(), chip_sprite(), chip_stack() (+23 more)

### Community 54 - "qiuqiu.ts"
Cohesion: 0.18
Nodes (23): chainEngine(), opener(), after(), canAct(), CAT_RANK, compareQiu(), evaluateQiu(), live() (+15 more)

### Community 55 - "draw.py"
Cohesion: 0.25
Nodes (23): bevel(), bin_sprite(), centered(), crayon(), crayon_sprite(), draw_lose(), draw_win(), easel() (+15 more)

### Community 56 - "domino/engine.ts"
Cohesion: 0.21
Nodes (20): candidates(), lcg(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver() (+12 more)

### Community 57 - "domino/ui/RoundEnd.tsx"
Cohesion: 0.15
Nodes (18): fitsMode(), MODE_INFO, ModeInfo, MODES, QIU_NAMES, Mode, modeArt(), sprite() (+10 more)

### Community 58 - "domino/types.ts"
Cohesion: 0.12
Nodes (20): finish(), HAND_SIZE, lowest(), round5(), DealCtx, ModeEngine, Outcome, Step (+12 more)

### Community 59 - "common.py"
Cohesion: 0.16
Nodes (15): bpy, math, mathutils, ink_lines(), pedestal(), Garis tinta kartun (Freestyle) untuk semua objek kecuali koleksi NOLINES., Kamera ortho, matahari, dunia pink pucat, Eevee transparan., Garis miring dua warna (untuk silinder Memphis). (+7 more)

### Community 60 - "uno/ui/RoundEnd.tsx"
Cohesion: 0.20
Nodes (10): lottie-react, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_loader, floor, Loader(), LoadingScreen(), reduceMotion() (+2 more)

### Community 61 - "snakes/engine.test.ts"
Cohesion: 0.27
Nodes (9): makeBoard(), DARES, QUIZ, QuizQ, TRUTHS, canUseItem(), defaultOptions(), init() (+1 more)

### Community 62 - "DrawBoard"
Cohesion: 0.29
Nodes (8): hintCount(), maskWord(), totalTurns(), turnNo(), revealLine(), DrawBoard(), RevealPanel(), usePhaseClock()

### Community 63 - "useMusic"
Cohesion: 0.50
Nodes (5): Home(), Room(), useRoomToasts(), useMusic(), entryById()

### Community 65 - "canGuess"
Cohesion: 0.67
Nodes (3): canGuess(), guessPlaceholder(), GuessBox()

## Knowledge Gaps
- **281 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+276 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 444 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `package.json`, `App.tsx`, `UnoTable.tsx`, `DrawBoard.tsx`, `Banner.tsx`, `remi/engine.ts`, `Slab.tsx`, `audio.ts`, `draw/types.ts`, `dialog.tsx`, `SnakesBoard.tsx`, `useRoom.ts`, `UpdateBanner.tsx`, `DominoTable.tsx`, `cards.ts`, `RemiTable.tsx`, `poker.tsx`, `snakes/types.ts`, `registry.ts`, `snakes/ui/copy.ts`, `patterns.ts`, `domino/engine.ts`, `domino/ui/RoundEnd.tsx`, `uno/ui/RoundEnd.tsx`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `SnakesBoard()` connect `lottie.mjs` to `UnoTable.tsx`, `snakes/ui/copy.ts`, `Slab.tsx`, `SnakesBoard.tsx`, `snakes/engine.test.ts`, `useMusic`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `Seat` connect `RemiTable.tsx` to `UnoTable.tsx`, `DrawBoard.tsx`, `snakes/engine.ts`, `remi/engine.ts`, `draw/engine.ts`, `draw/types.ts`, `SnakesBoard.tsx`, `useRoom.ts`, `remi/types.ts`, `DominoTable.tsx`, `cards.ts`, `poker.tsx`, `poker.ts`, `snakes/types.ts`, `blackjack.ts`, `snakes/ui/copy.ts`, `qiuqiu.ts`, `domino/engine.ts`, `domino/ui/RoundEnd.tsx`, `domino/types.ts`, `uno/ui/RoundEnd.tsx`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _281 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.13043478260869565 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11255411255411256 - nodes in this community are weakly interconnected._