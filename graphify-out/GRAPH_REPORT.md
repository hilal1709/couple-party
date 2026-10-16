# Graph Report - bom-waktu  (2026-10-16)

## Corpus Check
- 386 files · ~1,077,980 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1924 nodes · 6095 edges · 74 communities (70 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 104 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dc9d258c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- UnoTable.tsx
- package.json
- App.tsx
- Demo.tsx
- DrawBoard.tsx
- Design System: Couple Party
- LudoBoard.tsx
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
- monopoly.py
- MonopolyBoard.tsx
- remi/types.ts
- SnakesBoard.tsx
- ludo.py
- audio.ts
- useRoom.ts
- ludo/board.ts
- Sheets.tsx
- snakes/engine.ts
- bom/engine.ts
- release.mjs
- devDependencies
- UpdateBanner.tsx
- capture.mjs
- scripts
- remi/cards.ts
- DominoTable.tsx
- monopoly/engine.ts
- RemiTable.tsx
- vite.config.ts
- capacitor.config.ts
- CardFace.tsx
- poker.ts
- remi.py
- monopoly/ui/copy.ts
- registry.ts
- poker.tsx
- bigtwo.ts
- monopoly/ui/art.tsx
- pathlib
- domino.py
- Banner.tsx
- mat
- domino/engine.ts
- games/types.ts
- ludo/engine.ts
- shade_smooth
- monopoly/types.ts
- BomBoard.tsx
- bom.py
- draw/engine.ts
- monopoly/engine.test.ts
- transport.ts
- domino/types.ts
- build.py
- bom/ui/copy.ts
- ludo/types.ts
- qiuqiu.ts
- evaluateQiu
- domino/ui/art.ts
- TileFace.tsx

## God Nodes (most connected - your core abstractions)
1. `add()` - 75 edges
2. `mat()` - 61 edges
3. `st()` - 57 edges
4. `Seat` - 57 edges
5. `react` - 55 edges
6. `anim()` - 48 edges
7. `layer()` - 47 edges
8. `doc()` - 45 edges
9. `stroke()` - 44 edges
10. `shade_smooth()` - 38 edges

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

## Communities (74 total, 4 thin omitted)

### Community 0 - "UnoTable.tsx"
Cohesion: 0.09
Nodes (22): @hugeicons/core-free-icons, @hugeicons/react, radix-ui, react, src_assets_lottie_burst, setSettings(), useAudioSettings(), CREDITS (+14 more)

### Community 1 - "package.json"
Cohesion: 0.10
Nodes (19): name, private, type, version, @capacitor/android, class-variance-authority, cn, @fontsource/dela-gothic-one (+11 more)

### Community 2 - "App.tsx"
Cohesion: 0.08
Nodes (20): App(), floor, Home(), HostControls(), load(), makeCode(), PickedGame(), RoomInfo (+12 more)

### Community 3 - "Demo.tsx"
Cohesion: 0.05
Nodes (87): react-dom, vitest, NAMES, UnoDemo(), CardFace, COLOR_NAME, cornerText(), DARK_SIDE (+79 more)

### Community 4 - "DrawBoard.tsx"
Cohesion: 0.08
Nodes (41): src_assets_lottie_draw_close, src_assets_lottie_draw_correct, src_assets_lottie_draw_pick, src_assets_lottie_draw_reveal, src_assets_lottie_draw_timeup, canGuess(), CANVAS, CHOOSE_SECONDS (+33 more)

### Community 5 - "Design System: Couple Party"
Cohesion: 0.06
Nodes (30): Buttons (Slab), Cards / Containers, Colors, Components, Design System: Couple Party, Discard Ring and Podium (signature), Do:, Do's and Don'ts (+22 more)

### Community 6 - "LudoBoard.tsx"
Cohesion: 0.08
Nodes (36): src_assets_lottie_ludo_bomb, src_assets_lottie_ludo_boost, src_assets_lottie_ludo_capture, src_assets_lottie_ludo_home, src_assets_lottie_ludo_portal, src_assets_lottie_ludo_six, src_assets_lottie_ludo_slip, src_assets_ludo_ludo_lose (+28 more)

### Community 7 - "add"
Cohesion: 0.22
Nodes (26): add(), pedestal(), squiggle_tube(), bevel(), card(), checkmark(), coil(), die() (+18 more)

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
Cohesion: 0.20
Nodes (5): Membangun kit logo Couple Party: simbol, wordmark (outline dari Dela Gothic…, fonttools_pens_svgpathpen, fonttools_pens_transformpen, fonttools_ttlib, math

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
Cohesion: 0.17
Nodes (76): anim(), banknote(), bomBoom(), bomCancel(), bomPass(), bomPower(), bomSpark(), burst() (+68 more)

### Community 21 - "monopoly.py"
Cohesion: 0.09
Nodes (63): arrow_go(), ball(), bevel(), bill_stack(), box(), bulb(), card(), card_chance() (+55 more)

### Community 22 - "MonopolyBoard.tsx"
Cohesion: 0.09
Nodes (31): src_assets_lottie_dice_roll, src_assets_lottie_monopoly_bankrupt, src_assets_lottie_monopoly_build, src_assets_lottie_monopoly_card, src_assets_lottie_monopoly_jackpot, src_assets_lottie_monopoly_jail, src_assets_lottie_monopoly_rent, src_assets_lottie_monopoly_sold (+23 more)

### Community 23 - "remi/types.ts"
Cohesion: 0.17
Nodes (24): BomDemo(), LudoDemo(), RemiDemo(), candidates(), lcg(), randomStep(), apply(), defaultOptions() (+16 more)

### Community 25 - "SnakesBoard.tsx"
Cohesion: 0.07
Nodes (39): gsap, @gsap/react, lottie-react, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_card_pop, src_assets_lottie_confetti, src_assets_lottie_item_pop (+31 more)

### Community 26 - "ludo.py"
Cohesion: 0.19
Nodes (28): no_lines(), ball(), bevel(), box(), cone_(), cyl(), die(), face() (+20 more)

### Community 27 - "audio.ts"
Cohesion: 0.12
Nodes (15): howler, AudioSettings, listeners, music, musicVolume(), playMusic(), settings, sfxCache (+7 more)

### Community 28 - "useRoom.ts"
Cohesion: 0.19
Nodes (15): Room(), useRoomToasts(), entryById(), gameById(), applyAction(), Pick, Session, SessionAction (+7 more)

### Community 29 - "ludo/board.ts"
Cohesion: 0.14
Nodes (29): apothem(), armAngle(), BOOST, cellPt(), circumR(), homePt(), innerR(), progPt() (+21 more)

### Community 30 - "Sheets.tsx"
Cohesion: 0.18
Nodes (23): MonopolyDemo(), groupOf(), ownable(), squareName(), botAction(), pick(), randomStep(), squares (+15 more)

### Community 31 - "snakes/engine.ts"
Cohesion: 0.06
Nodes (65): nextRand(), shuffle(), cellOf(), EFFECTS, int(), makeBoard(), DARES, QUIZ (+57 more)

### Community 32 - "bom/engine.ts"
Cohesion: 0.10
Nodes (46): fakeWord(), randomStep(), STEMS, aliveSeats(), BOOM_SECONDS, bump(), canAim(), canPower() (+38 more)

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

### Community 38 - "remi/cards.ts"
Cohesion: 0.07
Nodes (45): deal(), makeDeck(), RANK_LABEL, RED, removeIds(), shuffled(), sortHand(), SUIT_SORT (+37 more)

### Community 39 - "DominoTable.tsx"
Cohesion: 0.08
Nodes (44): src_assets_lottie_domino_blocked, src_assets_lottie_domino_chips, src_assets_lottie_domino_deal, src_assets_lottie_domino_score, src_assets_lottie_domino_slam, src_assets_lottie_domino_special, DominoDemo(), canPass() (+36 more)

### Community 40 - "monopoly/engine.ts"
Cohesion: 0.25
Nodes (20): nextOf(), advanceAuction(), afterMove(), alive(), charge(), Ctx, drawCard(), finish() (+12 more)

### Community 41 - "RemiTable.tsx"
Cohesion: 0.10
Nodes (31): src_assets_lottie_remi_bomb, src_assets_lottie_remi_bust, src_assets_lottie_remi_chips, src_assets_lottie_remi_deal, src_assets_lottie_remi_joker, src_assets_lottie_remi_liar, Effect, effectFor() (+23 more)

### Community 42 - "vite.config.ts"
Cohesion: 0.33
Nodes (5): ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, pkg

### Community 44 - "CardFace.tsx"
Cohesion: 0.10
Nodes (23): cardLabel(), rankLabel(), SUIT_NAME, awaitingOut(), bohong, BohongAction, BohongState, ModeState (+15 more)

### Community 45 - "poker.ts"
Cohesion: 0.24
Nodes (15): highAce(), nextWhere(), after(), BOARD_AT, canAct(), compareScores(), evaluate(), HAND_NAMES (+7 more)

### Community 46 - "remi.py"
Cohesion: 0.15
Nodes (35): bevel(), card(), chip(), chip_sprite(), chip_stack(), circle_outline(), dealer_btn(), deck_sprite() (+27 more)

### Community 47 - "monopoly/ui/copy.ts"
Cohesion: 0.20
Nodes (15): Card, CardFx, CARDS, DECK_TITLE, Deck, eventText(), money(), noteText() (+7 more)

### Community 48 - "registry.ts"
Cohesion: 0.08
Nodes (34): src_assets_bom_tile_bom, src_assets_domino_tile_domino, src_assets_draw_tile_draw, src_assets_ludo_tile_ludo, src_assets_monopoly_tile_monopoly, src_assets_remi_tile_remi, src_assets_snakes_tile_snakes, src_assets_snakes_tile_uno (+26 more)

### Community 49 - "poker.tsx"
Cohesion: 0.13
Nodes (23): active(), advance(), bjTotal(), blackjack, draw(), isBlackjack(), MIN_BET, settle() (+15 more)

### Community 50 - "bigtwo.ts"
Cohesion: 0.19
Nodes (15): beats(), bigtwo, bigTwoPenalty(), btRank(), btValue(), comboOf(), FIVE_ORDER, SUIT_V (+7 more)

### Community 51 - "monopoly/ui/art.tsx"
Cohesion: 0.12
Nodes (23): CODE, GROUP_HEX, GROUP_NAME, hasMonopoly(), rentOf(), HOTEL, Buildings(), C (+15 more)

### Community 52 - "pathlib"
Cohesion: 0.24
Nodes (8): datetime, json, pathlib, pil, main(), Ekspor render Blender per game (brand/illustrations/<game>/*.png) ke WebP untuk…, size_for(), sys

### Community 53 - "domino.py"
Cohesion: 0.16
Nodes (30): bevel(), bone_pile(), bone_sprite(), chain(), chip(), chip_sprite(), chip_stack(), coffee() (+22 more)

### Community 54 - "Banner.tsx"
Cohesion: 0.23
Nodes (13): RoomCode(), Props, dismissToast(), emit(), FeedbackTone, getToasts(), list, listeners (+5 more)

### Community 55 - "mat"
Cohesion: 0.25
Nodes (25): crown(), mat(), bevel(), bin_sprite(), centered(), crayon(), crayon_sprite(), draw_lose() (+17 more)

### Community 56 - "domino/engine.ts"
Cohesion: 0.17
Nodes (23): candidates(), lcg(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver() (+15 more)

### Community 57 - "games/types.ts"
Cohesion: 0.15
Nodes (17): cache, dots(), svgUrl(), terrazzo(), Tape(), BOARDS, Toggle, ENDS (+9 more)

### Community 58 - "ludo/engine.ts"
Cohesion: 0.15
Nodes (34): armsFor(), finishOf(), isSafe(), minArms(), specialAt(), trackIndex(), trackLen(), botAction() (+26 more)

### Community 59 - "shade_smooth"
Cohesion: 0.13
Nodes (23): bpy, mathutils, cheek(), cone(), eye(), ink_lines(), mochi(), mouth() (+15 more)

### Community 60 - "monopoly/types.ts"
Cohesion: 0.12
Nodes (17): AIRPORTS, BOARD, UTILITIES, Auction, Debt, GO_SALARY, Group, JAIL (+9 more)

### Community 61 - "BomBoard.tsx"
Cohesion: 0.09
Nodes (38): src_assets_lottie_bom_boom, src_assets_lottie_bom_cancel, src_assets_lottie_bom_pass, src_assets_lottie_bom_power, src_assets_lottie_bom_spark, fuseRange(), promptText(), Power (+30 more)

### Community 62 - "bom.py"
Cohesion: 0.16
Nodes (38): attach(), ball(), bean(), bevel(), big_eye(), bom_lose(), bom_win(), bomb() (+30 more)

### Community 63 - "draw/engine.ts"
Cohesion: 0.16
Nodes (25): advance(), copy(), deal(), defaultOptions(), distance(), DRAWER_POINTS, GUESS_POINTS, init() (+17 more)

### Community 64 - "monopoly/engine.test.ts"
Cohesion: 0.24
Nodes (10): GROUPS, defaultOptions(), init(), base(), simulate(), withDice(), monopoly, MonopolyAction (+2 more)

### Community 65 - "transport.ts"
Cohesion: 0.14
Nodes (10): @supabase/supabase-js, hasOnline, localTransport(), NetStatus, profile, store, SUPABASE_KEY, SUPABASE_URL (+2 more)

### Community 66 - "domino/types.ts"
Cohesion: 0.13
Nodes (22): chainEngine(), finish(), HAND_SIZE, lowest(), round5(), dealTiles(), handPips(), makeSet() (+14 more)

### Community 67 - "build.py"
Cohesion: 0.27
Nodes (19): ndarray, numpy, Path, bom_music(), domino_music(), draw_music(), ff(), load() (+11 more)

### Community 68 - "bom/ui/copy.ts"
Cohesion: 0.15
Nodes (15): CUT_MS, LONG_WORD, BomEvent, BomMode, LogEntry, Phase, Prompt, Review (+7 more)

### Community 69 - "ludo/types.ts"
Cohesion: 0.23
Nodes (12): ludo, LudoAction, LudoOptions, LudoState, Move, Note, Special, eventText() (+4 more)

### Community 70 - "qiuqiu.ts"
Cohesion: 0.22
Nodes (16): after(), canAct(), CAT_RANK, compareQiu(), live(), nextStreet(), qiuEngine(), qiuPot() (+8 more)

### Community 71 - "evaluateQiu"
Cohesion: 0.31
Nodes (10): endCount(), opener(), evaluateQiu(), pairValue(), tileKey(), isDouble(), pips(), tileLabel() (+2 more)

### Community 72 - "domino/ui/art.ts"
Cohesion: 0.40
Nodes (4): fitsMode(), modeArt(), SPRITES, Lobby()

### Community 73 - "TileFace.tsx"
Cohesion: 0.40
Nodes (3): DOTS, Props, TileFace

## Knowledge Gaps
- **335 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+330 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 561 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SnakesBoard()` connect `lottie.mjs` to `SnakesBoard.tsx`, `App.tsx`, `snakes/engine.ts`, `games/types.ts`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `Seat` connect `RemiTable.tsx` to `UnoTable.tsx`, `Demo.tsx`, `DrawBoard.tsx`, `LudoBoard.tsx`, `MonopolyBoard.tsx`, `remi/types.ts`, `SnakesBoard.tsx`, `audio.ts`, `useRoom.ts`, `Sheets.tsx`, `snakes/engine.ts`, `bom/engine.ts`, `remi/cards.ts`, `DominoTable.tsx`, `monopoly/engine.ts`, `CardFace.tsx`, `poker.ts`, `monopoly/ui/copy.ts`, `registry.ts`, `poker.tsx`, `domino/engine.ts`, `games/types.ts`, `ludo/engine.ts`, `monopoly/types.ts`, `BomBoard.tsx`, `draw/engine.ts`, `domino/types.ts`, `bom/ui/copy.ts`, `ludo/types.ts`, `qiuqiu.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `react` connect `UnoTable.tsx` to `package.json`, `App.tsx`, `Demo.tsx`, `DrawBoard.tsx`, `LudoBoard.tsx`, `MonopolyBoard.tsx`, `remi/types.ts`, `SnakesBoard.tsx`, `audio.ts`, `useRoom.ts`, `Sheets.tsx`, `snakes/engine.ts`, `bom/engine.ts`, `UpdateBanner.tsx`, `DominoTable.tsx`, `RemiTable.tsx`, `CardFace.tsx`, `registry.ts`, `poker.tsx`, `Banner.tsx`, `domino/engine.ts`, `games/types.ts`, `BomBoard.tsx`, `monopoly/engine.test.ts`, `bom/ui/copy.ts`, `ludo/types.ts`, `TileFace.tsx`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _335 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UnoTable.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08599290780141844 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08045977011494253 - nodes in this community are weakly interconnected._