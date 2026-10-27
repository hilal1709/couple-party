# Graph Report - game  (2026-10-27)

## Corpus Check
- 472 files · ~1,516,407 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 84 file(s) not represented in the graph (top: .glb 77, .hdr 3, (none) 2)

## Summary
- 2529 nodes · 7946 edges · 87 communities (82 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 142 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `868ae9a3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dialog.tsx
- package.json
- useRoom.ts
- kart_hd.py
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
- remi/engine.ts
- remi/ui/copy.ts
- ludo.py
- KartBoard.tsx
- bom.py
- ludo/board.ts
- Sheets.tsx
- race.ts
- UnoTable.tsx
- release.mjs
- devDependencies
- kart/engine.ts
- BomBoard.tsx
- bom/engine.ts
- remi/cards.ts
- DominoTable.tsx
- monopoly/engine.ts
- Seat
- bom/types.ts
- bom/engine.test.ts
- CardFace.tsx
- poker.ts
- remi.py
- monopoly/ui/copy.ts
- registry.ts
- blackjack.ts
- remi/types.ts
- monopoly/ui/art.tsx
- kart_world.py
- domino.py
- kart.py
- draw.py
- shade_smooth
- games/types.ts
- ludo/engine.ts
- pathlib
- monopoly/engine.test.ts
- snakes/engine.ts
- uno/engine.ts
- world.ts
- monopoly/types.ts
- Race
- Banner.tsx
- spy.py
- SpyBoard.tsx
- ludo/types.ts
- draw/engine.ts
- Demo.tsx
- models.ts
- cyl
- App.tsx
- build.py
- podium.ts
- qiuqiu.ts
- transport.ts
- bom/ui/copy.ts
- ludo/engine.test.ts
- capture.mjs
- scripts
- vite.config.ts
- capacitor.config.ts
- UpdateBanner.tsx
- die

## God Nodes (most connected - your core abstractions)
1. `add()` - 88 edges
2. `st()` - 67 edges
3. `Seat` - 66 edges
4. `mat()` - 65 edges
5. `react` - 61 edges
6. `anim()` - 58 edges
7. `layer()` - 57 edges
8. `doc()` - 55 edges
9. `stroke()` - 50 edges
10. `shade_smooth()` - 46 edges

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

## Communities (87 total, 5 thin omitted)

### Community 1 - "package.json"
Cohesion: 0.10
Nodes (20): name, private, type, version, @capacitor/android, class-variance-authority, cn, @fontsource/dela-gothic-one (+12 more)

### Community 2 - "useRoom.ts"
Cohesion: 0.17
Nodes (16): vitest, Room(), useRoomToasts(), entryById(), gameById(), LiveChannel, applyAction(), Pick (+8 more)

### Community 3 - "kart_hd.py"
Cohesion: 0.16
Nodes (34): arch(), bev(), body_bajaj(), body_bebek(), body_gerobak(), chrome_pipe(), cube(), curve_tube() (+26 more)

### Community 4 - "DrawBoard.tsx"
Cohesion: 0.07
Nodes (33): src_assets_lottie_card_pop, src_assets_lottie_draw_close, src_assets_lottie_draw_correct, src_assets_lottie_draw_pick, src_assets_lottie_draw_reveal, src_assets_lottie_draw_timeup, src_assets_lottie_item_pop, src_assets_lottie_ladder_up (+25 more)

### Community 5 - "Design System: Couple Party"
Cohesion: 0.06
Nodes (30): Buttons (Slab), Cards / Containers, Colors, Components, Design System: Couple Party, Discard Ring and Podium (signature), Do:, Do's and Don'ts (+22 more)

### Community 6 - "LudoBoard.tsx"
Cohesion: 0.09
Nodes (35): src_assets_lottie_dice_roll, src_assets_lottie_ludo_bomb, src_assets_lottie_ludo_boost, src_assets_lottie_ludo_capture, src_assets_lottie_ludo_home, src_assets_lottie_ludo_portal, src_assets_lottie_ludo_six, src_assets_lottie_ludo_slip (+27 more)

### Community 7 - "add"
Cohesion: 0.23
Nodes (28): add(), crown(), mat(), pedestal(), squiggle_tube(), bevel(), card(), checkmark() (+20 more)

### Community 8 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 9 - "dependencies"
Cohesion: 0.08
Nodes (24): dependencies, @capacitor/android, @capacitor/core, class-variance-authority, cn, @fontsource/dela-gothic-one, @fontsource-variable/geist, gsap (+16 more)

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
Cohesion: 0.16
Nodes (86): anim(), banknote(), bomBoom(), bomCancel(), bomPass(), bomPower(), bomSpark(), burst() (+78 more)

### Community 21 - "monopoly.py"
Cohesion: 0.13
Nodes (36): arrow_go(), bevel(), bill_stack(), box(), card(), card_chance(), card_chest(), chest() (+28 more)

### Community 22 - "MonopolyBoard.tsx"
Cohesion: 0.09
Nodes (31): src_assets_lottie_monopoly_bankrupt, src_assets_lottie_monopoly_build, src_assets_lottie_monopoly_card, src_assets_lottie_monopoly_jackpot, src_assets_lottie_monopoly_jail, src_assets_lottie_monopoly_rent, src_assets_lottie_monopoly_sold, src_assets_monopoly_monopoly_lose (+23 more)

### Community 23 - "remi/engine.ts"
Cohesion: 0.21
Nodes (19): candidates(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce() (+11 more)

### Community 25 - "remi/ui/copy.ts"
Cohesion: 0.36
Nodes (7): rankLabel(), BjResult, eventText(), pokerNote(), roundText(), STREET, streetName()

### Community 26 - "ludo.py"
Cohesion: 0.19
Nodes (28): no_lines(), ball(), bevel(), box(), cone_(), cyl(), die(), face() (+20 more)

### Community 27 - "KartBoard.tsx"
Cohesion: 0.06
Nodes (44): howler, src_assets_lottie_kart_boost, src_assets_lottie_kart_box, src_assets_lottie_kart_finish, src_assets_lottie_kart_hit, src_assets_lottie_kart_lap, getSettings(), statsFor() (+36 more)

### Community 28 - "bom.py"
Cohesion: 0.16
Nodes (37): attach(), ball(), bevel(), big_eye(), bom_lose(), bom_win(), bomb(), boomerang() (+29 more)

### Community 29 - "ludo/board.ts"
Cohesion: 0.14
Nodes (29): apothem(), armAngle(), BOOST, cellPt(), circumR(), homePt(), innerR(), progPt() (+21 more)

### Community 30 - "Sheets.tsx"
Cohesion: 0.20
Nodes (21): BOARD, groupOf(), ownable(), botAction(), pick(), squares, allowed(), canBuild() (+13 more)

### Community 31 - "race.ts"
Cohesion: 0.05
Nodes (60): three, Stats, Controls, GRADE, Hud, Opts, Pose, Remote (+52 more)

### Community 32 - "UnoTable.tsx"
Cohesion: 0.08
Nodes (32): @hugeicons/core-free-icons, @hugeicons/react, src_assets_lottie_burst, setSettings(), sfx(), useAudioSettings(), CREDITS, SoundButton() (+24 more)

### Community 33 - "release.mjs"
Cohesion: 0.20
Nodes (6): ref_node_child_process, ref_node_fs, { version }, [bump = 'patch', ...noteParts], [ma, mi, pa], pkg

### Community 34 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, @capacitor/cli, oxlint, @types/node, @types/react, @types/react-dom, @types/three, typescript (+3 more)

### Community 35 - "kart/engine.ts"
Cohesion: 0.08
Nodes (45): BODIES, BODY_IDS, CHARACTERS, CUPS, ITEM_INFO, LEVEL_INFO, MAX_RACERS, ODDS (+37 more)

### Community 36 - "BomBoard.tsx"
Cohesion: 0.10
Nodes (36): src_assets_lottie_bom_boom, src_assets_lottie_bom_cancel, src_assets_lottie_bom_pass, src_assets_lottie_bom_power, src_assets_lottie_bom_spark, fuseRange(), promptText(), wordProblem() (+28 more)

### Community 37 - "bom/engine.ts"
Cohesion: 0.13
Nodes (22): BOOM_SECONDS, bump(), copy(), FASTER_MIN, FASTER_STEP, giveRandomPower(), init(), makePrompt() (+14 more)

### Community 38 - "remi/cards.ts"
Cohesion: 0.07
Nodes (45): deal(), makeDeck(), RANK_LABEL, RED, removeIds(), shuffled(), SUIT_SORT, bigTwoPenalty() (+37 more)

### Community 39 - "DominoTable.tsx"
Cohesion: 0.07
Nodes (37): src_assets_lottie_domino_blocked, src_assets_lottie_domino_chips, src_assets_lottie_domino_deal, src_assets_lottie_domino_score, src_assets_lottie_domino_slam, src_assets_lottie_domino_special, QIU_NAMES, qiuName() (+29 more)

### Community 40 - "monopoly/engine.ts"
Cohesion: 0.22
Nodes (22): nextOf(), advanceAuction(), afterMove(), alive(), charge(), Ctx, drawCard(), finish() (+14 more)

### Community 41 - "Seat"
Cohesion: 0.08
Nodes (35): src_assets_lottie_remi_bomb, src_assets_lottie_remi_bust, src_assets_lottie_remi_chips, src_assets_lottie_remi_deal, src_assets_lottie_remi_joker, src_assets_lottie_remi_liar, AudioSettings, listeners (+27 more)

### Community 42 - "bom/types.ts"
Cohesion: 0.11
Nodes (17): bom, FxCue, FxName, SoundCue, BomAction, BomEvent, BomState, LogEntry (+9 more)

### Community 43 - "bom/engine.test.ts"
Cohesion: 0.20
Nodes (20): fakeWord(), randomStep(), STEMS, aliveSeats(), canAim(), canPower(), canProtest(), CUT_MS (+12 more)

### Community 44 - "CardFace.tsx"
Cohesion: 0.13
Nodes (25): sortHand(), SUIT_NAME, SUIT_SYMBOL, suitIndex(), SUITS, sevenPenalty(), CardBack, CardFace (+17 more)

### Community 45 - "poker.ts"
Cohesion: 0.21
Nodes (17): highAce(), nextWhere(), after(), BOARD_AT, canAct(), compareScores(), evaluate(), HAND_NAMES (+9 more)

### Community 46 - "remi.py"
Cohesion: 0.15
Nodes (35): bevel(), card(), chip(), chip_sprite(), chip_stack(), circle_outline(), dealer_btn(), deck_sprite() (+27 more)

### Community 47 - "monopoly/ui/copy.ts"
Cohesion: 0.20
Nodes (18): squareName(), Card, CardFx, CARDS, DECK_TITLE, Deck, HOTEL, eventText() (+10 more)

### Community 48 - "registry.ts"
Cohesion: 0.08
Nodes (23): src_assets_bom_tile_bom, src_assets_domino_tile_domino, src_assets_draw_tile_draw, src_assets_ludo_tile_ludo, src_assets_monopoly_tile_monopoly, src_assets_remi_tile_remi, src_assets_snakes_tile_snakes, src_assets_snakes_tile_uno (+15 more)

### Community 49 - "blackjack.ts"
Cohesion: 0.18
Nodes (18): active(), advance(), bjTotal(), blackjack, draw(), isBlackjack(), MIN_BET, settle() (+10 more)

### Community 50 - "remi/types.ts"
Cohesion: 0.18
Nodes (17): cardLabel(), beats(), bigtwo, btRank(), btValue(), comboOf(), FIVE_ORDER, SUIT_V (+9 more)

### Community 51 - "monopoly/ui/art.tsx"
Cohesion: 0.18
Nodes (16): Buildings(), C, cellBox(), CORNER, Die(), label, parts(), PAWN_HEX (+8 more)

### Community 52 - "kart_world.py"
Cohesion: 0.19
Nodes (25): bmesh, ball(), box(), camar(), cyl(), dermaga(), finish(), last() (+17 more)

### Community 53 - "domino.py"
Cohesion: 0.16
Nodes (30): bevel(), bone_pile(), bone_sprite(), chain(), chip(), chip_sprite(), chip_stack(), coffee() (+22 more)

### Community 54 - "kart.py"
Cohesion: 0.12
Nodes (41): attach(), ball(), bevel(), body_bajaj(), body_bebek(), body_gerobak(), box(), cone_() (+33 more)

### Community 55 - "draw.py"
Cohesion: 0.25
Nodes (23): bevel(), bin_sprite(), centered(), crayon(), crayon_sprite(), draw_lose(), draw_win(), easel() (+15 more)

### Community 56 - "shade_smooth"
Cohesion: 0.14
Nodes (23): math, bean(), cheek(), cone(), eye(), ink_lines(), mochi(), mouth() (+15 more)

### Community 57 - "games/types.ts"
Cohesion: 0.07
Nodes (51): gsap, @gsap/react, lottie-react, radix-ui, react, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_confetti (+43 more)

### Community 58 - "ludo/engine.ts"
Cohesion: 0.22
Nodes (24): finishOf(), isSafe(), trackIndex(), trackLen(), botAction(), randomStep(), applyMove(), canExit() (+16 more)

### Community 59 - "pathlib"
Cohesion: 0.13
Nodes (16): bpy, datetime, json, mathutils, pathlib, pil, main(), Ekspor render Blender per game (brand/illustrations/<game>/*.png) ke WebP untuk… (+8 more)

### Community 60 - "monopoly/engine.test.ts"
Cohesion: 0.29
Nodes (9): randomStep(), defaultOptions(), init(), base(), simulate(), withDice(), MonopolyOptions, MonopolyState (+1 more)

### Community 61 - "snakes/engine.ts"
Cohesion: 0.06
Nodes (60): cellOf(), EFFECTS, makeBoard(), DARES, QUIZ, QuizQ, TRUTHS, BONUS (+52 more)

### Community 62 - "uno/engine.ts"
Cohesion: 0.08
Nodes (68): UnoDemo(), buildDeck(), classicFaces(), f(), flipDarkFaces(), flipLightFaces(), noMercyFaces(), activeSeats() (+60 more)

### Community 63 - "world.ts"
Cohesion: 0.16
Nodes (33): instanced(), placed(), variants(), vertexMaterial(), banner(), birds(), buildWorld(), canvasTex() (+25 more)

### Community 64 - "monopoly/types.ts"
Cohesion: 0.10
Nodes (20): AIRPORTS, CODE, GROUP_HEX, GROUP_NAME, GROUPS, UTILITIES, Auction, Debt (+12 more)

### Community 65 - "Race"
Cohesion: 0.11
Nodes (6): r2(), Race, Skids, driftLevel(), KartState, RaceScreen()

### Community 66 - "Banner.tsx"
Cohesion: 0.19
Nodes (15): Home(), RoomCode(), Banner(), Props, dismissToast(), emit(), FeedbackTone, getToasts() (+7 more)

### Community 67 - "spy.py"
Cohesion: 0.17
Nodes (38): attach(), ball(), bean(), bevel(), box(), card(), card_back(), card_word() (+30 more)

### Community 68 - "SpyBoard.tsx"
Cohesion: 0.10
Nodes (35): src_assets_lottie_spy_caught, src_assets_lottie_spy_escape, src_assets_lottie_spy_guess, src_assets_lottie_spy_reveal, src_assets_lottie_spy_stamp, canSpyGuess(), canVoteFor(), clueProblem() (+27 more)

### Community 69 - "ludo/types.ts"
Cohesion: 0.23
Nodes (12): LudoAction, LudoOptions, LudoState, Move, Note, Special, eventText(), noteText() (+4 more)

### Community 70 - "draw/engine.ts"
Cohesion: 0.06
Nodes (69): advance(), canGuess(), CANVAS, CHOOSE_SECONDS, copy(), deal(), defaultOptions(), distance() (+61 more)

### Community 71 - "Demo.tsx"
Cohesion: 0.05
Nodes (69): BomDemo(), DominoDemo(), LudoDemo(), MonopolyDemo(), NAMES, RemiDemo(), SpyDemo(), lcg() (+61 more)

### Community 72 - "models.ts"
Cohesion: 0.12
Nodes (21): ball(), BODY_FALLBACK, box(), build(), cache, cone(), cyl(), FALLBACK (+13 more)

### Community 73 - "cyl"
Cohesion: 0.17
Nodes (24): ball(), bulb(), cone_(), cyl(), drop(), hexmat(), icon_tax(), last() (+16 more)

### Community 74 - "App.tsx"
Cohesion: 0.09
Nodes (16): react-dom, App(), floor, HostControls(), load(), makeCode(), PickedGame(), RoomInfo (+8 more)

### Community 75 - "build.py"
Cohesion: 0.19
Nodes (26): ndarray, numpy, bom_music(), domino_music(), draw_music(), _env(), ff(), kart_music() (+18 more)

### Community 76 - "podium.ts"
Cohesion: 0.15
Nodes (8): glbUrl(), loadModels(), Particles, Champ, numberTex(), PLACE, Podium, PodiumView()

### Community 77 - "qiuqiu.ts"
Cohesion: 0.06
Nodes (80): candidates(), lcg(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver() (+72 more)

### Community 78 - "transport.ts"
Cohesion: 0.15
Nodes (11): @supabase/supabase-js, hasOnline, localTransport(), NetStatus, openTransport(), Peer, profile, SUPABASE_KEY (+3 more)

### Community 79 - "bom/ui/copy.ts"
Cohesion: 0.20
Nodes (12): defaultOptions(), start(), BomMode, BomOptions, Speed, FEATURE_INFO, MODE_INFO, POWER_INFO (+4 more)

### Community 80 - "ludo/engine.test.ts"
Cohesion: 0.24
Nodes (12): armsFor(), minArms(), defaultOptions(), init(), teamsAllowed(), base(), roll(), withDie() (+4 more)

### Community 81 - "capture.mjs"
Cohesion: 0.22
Nodes (7): ref_node_os, chrome, pending, profile, send(), [url, out, w = '390', h = '844', scale = '2', wait = '0'], ws

### Community 82 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, apk, build, dev, lint, preview, release, test

### Community 83 - "vite.config.ts"
Cohesion: 0.33
Nodes (5): ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, pkg

### Community 85 - "UpdateBanner.tsx"
Cohesion: 0.28
Nodes (11): @capacitor/core, Phase, UpdateBanner(), ApkUpdater, ApkUpdaterPlugin, APP_VERSION, compareVersions(), fetchLatest() (+3 more)

### Community 86 - "die"
Cohesion: 0.33
Nodes (3): die(), face(), die_sprite()

## Knowledge Gaps
- **404 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+399 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 702 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Seat` connect `Seat` to `useRoom.ts`, `DrawBoard.tsx`, `LudoBoard.tsx`, `MonopolyBoard.tsx`, `remi/engine.ts`, `remi/ui/copy.ts`, `KartBoard.tsx`, `Sheets.tsx`, `race.ts`, `UnoTable.tsx`, `kart/engine.ts`, `BomBoard.tsx`, `bom/engine.ts`, `remi/cards.ts`, `DominoTable.tsx`, `monopoly/engine.ts`, `bom/types.ts`, `CardFace.tsx`, `poker.ts`, `monopoly/ui/copy.ts`, `blackjack.ts`, `remi/types.ts`, `games/types.ts`, `ludo/engine.ts`, `snakes/engine.ts`, `uno/engine.ts`, `monopoly/types.ts`, `SpyBoard.tsx`, `ludo/types.ts`, `draw/engine.ts`, `Demo.tsx`, `qiuqiu.ts`, `bom/ui/copy.ts`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Why does `SnakesBoard()` connect `lottie.mjs` to `UnoTable.tsx`, `Seat`, `DrawBoard.tsx`, `snakes/engine.ts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `react` connect `games/types.ts` to `dialog.tsx`, `package.json`, `useRoom.ts`, `DrawBoard.tsx`, `LudoBoard.tsx`, `MonopolyBoard.tsx`, `remi/engine.ts`, `KartBoard.tsx`, `Sheets.tsx`, `UnoTable.tsx`, `kart/engine.ts`, `BomBoard.tsx`, `DominoTable.tsx`, `Seat`, `bom/types.ts`, `CardFace.tsx`, `registry.ts`, `monopoly/engine.test.ts`, `snakes/engine.ts`, `uno/engine.ts`, `Banner.tsx`, `SpyBoard.tsx`, `ludo/types.ts`, `draw/engine.ts`, `Demo.tsx`, `App.tsx`, `qiuqiu.ts`, `bom/ui/copy.ts`, `ludo/engine.test.ts`, `UpdateBanner.tsx`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _404 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `DrawBoard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06685633001422475 - nodes in this community are weakly interconnected._
- **Should `Design System: Couple Party` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._