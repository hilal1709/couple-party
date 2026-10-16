# Graph Report - bom-waktu  (2026-10-16)

## Corpus Check
- 416 files · ~1,179,382 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 2095 nodes · 6719 edges · 81 communities (78 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 109 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fd499b66`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dialog.tsx
- package.json
- App.tsx
- UnoTable.tsx
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
- Demo.tsx
- remi/ui/copy.ts
- ludo.py
- audio.ts
- bom.py
- ludo/board.ts
- Sheets.tsx
- SnakesBoard.tsx
- utils.ts
- capture.mjs
- devDependencies
- UpdateBanner.tsx
- BomBoard.tsx
- bom/engine.ts
- games/types.ts
- DominoTable.tsx
- monopoly/engine.ts
- RemiTable.tsx
- bom/ui/copy.ts
- bom/engine.test.ts
- CardFace.tsx
- poker.ts
- remi.py
- monopoly/ui/copy.ts
- registry.ts
- blackjack.ts
- bigtwo.ts
- monopoly/ui/art.tsx
- pathlib
- domino.py
- snakes/types.ts
- mat
- domino/types.ts
- react
- ludo/engine.ts
- shade_smooth
- monopoly/types.ts
- snakes/engine.ts
- snakes/ui/copy.ts
- shuffle
- monopoly/engine.test.ts
- DrawBoard
- sfx
- spy.py
- SpyBoard.tsx
- ludo/types.ts
- draw/engine.ts
- spy/engine.ts
- spy/engine.test.ts
- spy/ui/Lobby.tsx
- draw/types.ts
- build.py
- bom/ui/art.ts
- domino/engine.ts
- qiuqiu.ts
- domino/ui/RoundEnd.tsx
- spy/types.ts

## God Nodes (most connected - your core abstractions)
1. `add()` - 83 edges
2. `mat()` - 63 edges
3. `st()` - 62 edges
4. `Seat` - 62 edges
5. `react` - 58 edges
6. `anim()` - 53 edges
7. `layer()` - 52 edges
8. `doc()` - 50 edges
9. `stroke()` - 49 edges
10. `shade_smooth()` - 42 edges

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

## Communities (81 total, 3 thin omitted)

### Community 0 - "dialog.tsx"
Cohesion: 0.14
Nodes (5): class-variance-authority, @hugeicons/react, radix-ui, Button(), buttonVariants

### Community 1 - "package.json"
Cohesion: 0.08
Nodes (21): config, name, private, type, version, @capacitor/android, @capacitor/cli, @fontsource/dela-gothic-one (+13 more)

### Community 2 - "App.tsx"
Cohesion: 0.07
Nodes (29): @supabase/supabase-js, App(), floor, load(), makeCode(), Room(), RoomInfo, SEAT_TONES (+21 more)

### Community 3 - "UnoTable.tsx"
Cohesion: 0.05
Nodes (91): react-dom, src_assets_lottie_burst, hatch(), terrazzo(), UnoDemo(), CardBack, CardFace, COLOR_NAME (+83 more)

### Community 4 - "DrawBoard.tsx"
Cohesion: 0.09
Nodes (34): src_assets_lottie_draw_close, src_assets_lottie_draw_correct, src_assets_lottie_draw_pick, src_assets_lottie_draw_reveal, src_assets_lottie_draw_timeup, canGuess(), CANVAS, INKS (+26 more)

### Community 5 - "Design System: Couple Party"
Cohesion: 0.06
Nodes (30): Buttons (Slab), Cards / Containers, Colors, Components, Design System: Couple Party, Discard Ring and Podium (signature), Do:, Do's and Don'ts (+22 more)

### Community 6 - "LudoBoard.tsx"
Cohesion: 0.08
Nodes (37): src_assets_lottie_ludo_bomb, src_assets_lottie_ludo_boost, src_assets_lottie_ludo_capture, src_assets_lottie_ludo_home, src_assets_lottie_ludo_portal, src_assets_lottie_ludo_six, src_assets_lottie_ludo_slip, src_assets_ludo_ludo_lose (+29 more)

### Community 7 - "add"
Cohesion: 0.22
Nodes (26): add(), pedestal(), squiggle_tube(), bevel(), card(), checkmark(), coil(), die() (+18 more)

### Community 8 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 9 - "dependencies"
Cohesion: 0.06
Nodes (31): dependencies, @capacitor/android, @capacitor/core, class-variance-authority, cn, @fontsource/dela-gothic-one, @fontsource-variable/geist, gsap (+23 more)

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
Nodes (81): anim(), banknote(), bomBoom(), bomCancel(), bomPass(), bomPower(), bomSpark(), burst() (+73 more)

### Community 21 - "monopoly.py"
Cohesion: 0.09
Nodes (63): arrow_go(), ball(), bevel(), bill_stack(), box(), bulb(), card(), card_chance() (+55 more)

### Community 22 - "MonopolyBoard.tsx"
Cohesion: 0.09
Nodes (29): src_assets_lottie_monopoly_bankrupt, src_assets_lottie_monopoly_build, src_assets_lottie_monopoly_card, src_assets_lottie_monopoly_jackpot, src_assets_lottie_monopoly_jail, src_assets_lottie_monopoly_rent, src_assets_lottie_monopoly_sold, src_assets_monopoly_monopoly_lose (+21 more)

### Community 23 - "Demo.tsx"
Cohesion: 0.11
Nodes (32): BomDemo(), DominoDemo(), LudoDemo(), MonopolyDemo(), NAMES, RemiDemo(), SpyDemo(), candidates() (+24 more)

### Community 25 - "remi/ui/copy.ts"
Cohesion: 0.26
Nodes (10): BjResult, eventText(), pokerNote(), roundText(), STREET, streetName(), who(), Props (+2 more)

### Community 26 - "ludo.py"
Cohesion: 0.19
Nodes (28): no_lines(), ball(), bevel(), box(), cone_(), cyl(), die(), face() (+20 more)

### Community 27 - "audio.ts"
Cohesion: 0.16
Nodes (12): howler, Home(), AudioSettings, listeners, music, musicVolume(), playMusic(), settings (+4 more)

### Community 28 - "bom.py"
Cohesion: 0.16
Nodes (37): attach(), ball(), bevel(), big_eye(), bom_lose(), bom_win(), bomb(), boomerang() (+29 more)

### Community 29 - "ludo/board.ts"
Cohesion: 0.14
Nodes (29): apothem(), armAngle(), BOOST, cellPt(), circumR(), homePt(), innerR(), progPt() (+21 more)

### Community 30 - "Sheets.tsx"
Cohesion: 0.18
Nodes (22): groupOf(), ownable(), botAction(), pick(), squares, allowed(), canBuild(), canMortgage() (+14 more)

### Community 31 - "SnakesBoard.tsx"
Cohesion: 0.08
Nodes (32): src_assets_lottie_card_pop, src_assets_lottie_confetti, src_assets_lottie_dice_roll, src_assets_lottie_item_pop, src_assets_lottie_ladder_up, src_assets_lottie_snake_bite, src_assets_snakes_snakes_lose, src_assets_snakes_snakes_win (+24 more)

### Community 32 - "utils.ts"
Cohesion: 0.11
Nodes (15): cn, setSettings(), useAudioSettings(), CREDITS, SoundButton(), SoundDrawer(), Drawer(), DrawerContent() (+7 more)

### Community 33 - "capture.mjs"
Cohesion: 0.09
Nodes (18): ref_node_child_process, ref_node_fs, ref_node_os, ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, { version } (+10 more)

### Community 34 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, @capacitor/cli, oxlint, @types/node, @types/react, @types/react-dom, typescript, vite (+2 more)

### Community 35 - "UpdateBanner.tsx"
Cohesion: 0.16
Nodes (17): @capacitor/core, lottie-react, src_assets_lottie_loader, floor, Loader(), LoadingScreen(), reduceMotion(), Phase (+9 more)

### Community 36 - "BomBoard.tsx"
Cohesion: 0.10
Nodes (35): src_assets_lottie_bom_boom, src_assets_lottie_bom_cancel, src_assets_lottie_bom_pass, src_assets_lottie_bom_power, src_assets_lottie_bom_spark, fuseRange(), promptText(), cuesFor() (+27 more)

### Community 37 - "bom/engine.ts"
Cohesion: 0.12
Nodes (25): BOOM_SECONDS, bump(), copy(), defaultOptions(), FASTER_MIN, FASTER_STEP, giveRandomPower(), init() (+17 more)

### Community 38 - "games/types.ts"
Cohesion: 0.08
Nodes (49): deal(), makeDeck(), RANK_LABEL, RED, removeIds(), shuffled(), SUIT_SORT, SUITS (+41 more)

### Community 39 - "DominoTable.tsx"
Cohesion: 0.09
Nodes (36): src_assets_lottie_domino_blocked, src_assets_lottie_domino_chips, src_assets_lottie_domino_deal, src_assets_lottie_domino_score, src_assets_lottie_domino_slam, src_assets_lottie_domino_special, canPass(), chainPlayable() (+28 more)

### Community 40 - "monopoly/engine.ts"
Cohesion: 0.22
Nodes (22): nextOf(), advanceAuction(), afterMove(), alive(), charge(), Ctx, drawCard(), finish() (+14 more)

### Community 41 - "RemiTable.tsx"
Cohesion: 0.13
Nodes (21): src_assets_lottie_remi_bomb, src_assets_lottie_remi_bust, src_assets_lottie_remi_chips, src_assets_lottie_remi_deal, src_assets_lottie_remi_joker, src_assets_lottie_remi_liar, Effect, effectFor() (+13 more)

### Community 42 - "bom/ui/copy.ts"
Cohesion: 0.12
Nodes (20): SfxName, FxCue, FxName, SoundCue, BomAction, BomEvent, BomMode, BomOptions (+12 more)

### Community 43 - "bom/engine.test.ts"
Cohesion: 0.18
Nodes (22): fakeWord(), randomStep(), STEMS, aliveSeats(), canAim(), canPower(), canProtest(), CUT_MS (+14 more)

### Community 44 - "CardFace.tsx"
Cohesion: 0.14
Nodes (24): cardLabel(), rankLabel(), sortHand(), SUIT_NAME, SUIT_SYMBOL, suitIndex(), Remi41State, sprite() (+16 more)

### Community 45 - "poker.ts"
Cohesion: 0.21
Nodes (17): highAce(), nextWhere(), after(), BOARD_AT, canAct(), compareScores(), evaluate(), HAND_NAMES (+9 more)

### Community 46 - "remi.py"
Cohesion: 0.15
Nodes (35): bevel(), card(), chip(), chip_sprite(), chip_stack(), circle_outline(), dealer_btn(), deck_sprite() (+27 more)

### Community 47 - "monopoly/ui/copy.ts"
Cohesion: 0.38
Nodes (11): squareName(), eventText(), money(), noteText(), OPTION_INFO, payee(), summary(), who() (+3 more)

### Community 48 - "registry.ts"
Cohesion: 0.07
Nodes (34): vitest, HostControls(), PickedGame(), src_assets_bom_tile_bom, src_assets_domino_tile_domino, src_assets_draw_tile_draw, src_assets_ludo_tile_ludo, src_assets_monopoly_tile_monopoly (+26 more)

### Community 49 - "blackjack.ts"
Cohesion: 0.25
Nodes (14): active(), advance(), bjTotal(), blackjack, draw(), isBlackjack(), MIN_BET, settle() (+6 more)

### Community 50 - "bigtwo.ts"
Cohesion: 0.19
Nodes (15): beats(), bigtwo, bigTwoPenalty(), btRank(), btValue(), comboOf(), FIVE_ORDER, SUIT_V (+7 more)

### Community 51 - "monopoly/ui/art.tsx"
Cohesion: 0.12
Nodes (23): AIRPORTS, BOARD, CODE, GROUP_HEX, GROUP_NAME, UTILITIES, Buildings(), C (+15 more)

### Community 52 - "pathlib"
Cohesion: 0.24
Nodes (8): datetime, json, pathlib, pil, main(), Ekspor render Blender per game (brand/illustrations/<game>/*.png) ke WebP untuk…, size_for(), sys

### Community 53 - "domino.py"
Cohesion: 0.16
Nodes (30): bevel(), bone_pile(), bone_sprite(), chain(), chip(), chip_sprite(), chip_stack(), coffee() (+22 more)

### Community 54 - "snakes/types.ts"
Cohesion: 0.24
Nodes (9): snakes, BAG, Deck, Item, Pending, SnakesAction, SnakesEvent, SnakesOptions (+1 more)

### Community 55 - "mat"
Cohesion: 0.25
Nodes (25): crown(), mat(), bevel(), bin_sprite(), centered(), crayon(), crayon_sprite(), draw_lose() (+17 more)

### Community 56 - "domino/types.ts"
Cohesion: 0.12
Nodes (20): finish(), HAND_SIZE, lowest(), round5(), DealCtx, ModeEngine, Outcome, Step (+12 more)

### Community 57 - "react"
Cohesion: 0.12
Nodes (31): react, src_assets_illustrations_lose, src_assets_illustrations_win, ConfirmProps, Modal(), ModalProps, cache, dots() (+23 more)

### Community 58 - "ludo/engine.ts"
Cohesion: 0.16
Nodes (33): armsFor(), finishOf(), isSafe(), minArms(), trackIndex(), trackLen(), botAction(), randomStep() (+25 more)

### Community 59 - "shade_smooth"
Cohesion: 0.12
Nodes (25): bpy, math, mathutils, bean(), cheek(), cone(), eye(), ink_lines() (+17 more)

### Community 60 - "monopoly/types.ts"
Cohesion: 0.12
Nodes (17): Auction, Debt, GO_SALARY, Group, JAIL, JAIL_FINE, MonopolyAction, MonopolyEvent (+9 more)

### Community 61 - "snakes/engine.ts"
Cohesion: 0.19
Nodes (16): DARES, QUIZ, QuizQ, TRUTHS, Draft, draw(), effect(), emit() (+8 more)

### Community 62 - "snakes/ui/copy.ts"
Cohesion: 0.27
Nodes (9): BONUS, SETBACK, Note, eventText(), FX_INFO, ITEM_INFO, noteText(), OPTION_INFO (+1 more)

### Community 63 - "shuffle"
Cohesion: 0.21
Nodes (14): nextRand(), shuffle(), EFFECTS, int(), makeBoard(), canUseItem(), defaultOptions(), init() (+6 more)

### Community 64 - "monopoly/engine.test.ts"
Cohesion: 0.20
Nodes (12): GROUPS, Card, CardFx, CARDS, DECK_TITLE, randomStep(), defaultOptions(), init() (+4 more)

### Community 65 - "DrawBoard"
Cohesion: 0.29
Nodes (8): hintCount(), maskWord(), totalTurns(), turnNo(), revealLine(), DrawBoard(), RevealPanel(), usePhaseClock()

### Community 66 - "sfx"
Cohesion: 0.19
Nodes (16): @hugeicons/core-free-icons, RoomCode(), sfx(), Banner(), Props, dismissToast(), emit(), FeedbackTone (+8 more)

### Community 67 - "spy.py"
Cohesion: 0.17
Nodes (38): attach(), ball(), bean(), bevel(), box(), card(), card_back(), card_word() (+30 more)

### Community 68 - "SpyBoard.tsx"
Cohesion: 0.09
Nodes (37): src_assets_lottie_spy_caught, src_assets_lottie_spy_escape, src_assets_lottie_spy_guess, src_assets_lottie_spy_reveal, src_assets_lottie_spy_stamp, canSpyGuess(), guesser(), cuesFor() (+29 more)

### Community 69 - "ludo/types.ts"
Cohesion: 0.23
Nodes (12): LudoAction, LudoOptions, LudoState, Move, Note, Special, eventText(), noteText() (+4 more)

### Community 70 - "draw/engine.ts"
Cohesion: 0.17
Nodes (23): advance(), CHOOSE_SECONDS, copy(), deal(), defaultOptions(), DRAWER_POINTS, GUESS_POINTS, init() (+15 more)

### Community 71 - "spy/engine.ts"
Cohesion: 0.14
Nodes (23): distance(), afterOut(), BAD, bump(), CLUE_MAX, deal(), endRound(), giveClue() (+15 more)

### Community 72 - "spy/engine.test.ts"
Cohesion: 0.18
Nodes (17): CLUES, randomStep(), aliveSeats(), canVoteFor(), clueProblem(), copy(), defaultOptions(), init() (+9 more)

### Community 73 - "spy/ui/Lobby.tsx"
Cohesion: 0.16
Nodes (16): MR_WHITE_MIN, roleCounts(), Pack, SpyMode, SpyOptions, castLine(), MODE_INFO, MR_WHITE_INFO (+8 more)

### Community 74 - "draw/types.ts"
Cohesion: 0.13
Nodes (18): LEVEL_BONUS, draw, DrawAction, DrawOptions, DrawState, FeedItem, Level, Pack (+10 more)

### Community 75 - "build.py"
Cohesion: 0.27
Nodes (20): ndarray, numpy, Path, bom_music(), domino_music(), draw_music(), ff(), load() (+12 more)

### Community 76 - "bom/ui/art.ts"
Cohesion: 0.33
Nodes (5): Power, PAPER, POWER_SPRITE, SEAT_HEX, SPRITES

### Community 77 - "domino/engine.ts"
Cohesion: 0.21
Nodes (20): candidates(), lcg(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver() (+12 more)

### Community 78 - "qiuqiu.ts"
Cohesion: 0.18
Nodes (23): chainEngine(), opener(), after(), canAct(), CAT_RANK, compareQiu(), evaluateQiu(), live() (+15 more)

### Community 79 - "domino/ui/RoundEnd.tsx"
Cohesion: 0.15
Nodes (18): fitsMode(), MODE_INFO, ModeInfo, MODES, QIU_NAMES, Mode, modeArt(), sprite() (+10 more)

### Community 82 - "spy/types.ts"
Cohesion: 0.24
Nodes (8): FxCue, FxName, SoundCue, Clue, Phase, RoundResult, SpyAction, SpyState

## Knowledge Gaps
- **348 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+343 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 592 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Seat` connect `games/types.ts` to `App.tsx`, `UnoTable.tsx`, `DrawBoard.tsx`, `LudoBoard.tsx`, `MonopolyBoard.tsx`, `Demo.tsx`, `remi/ui/copy.ts`, `Sheets.tsx`, `SnakesBoard.tsx`, `BomBoard.tsx`, `bom/engine.ts`, `DominoTable.tsx`, `monopoly/engine.ts`, `RemiTable.tsx`, `bom/ui/copy.ts`, `CardFace.tsx`, `poker.ts`, `monopoly/ui/copy.ts`, `registry.ts`, `blackjack.ts`, `snakes/types.ts`, `domino/types.ts`, `react`, `ludo/engine.ts`, `monopoly/types.ts`, `snakes/engine.ts`, `snakes/ui/copy.ts`, `SpyBoard.tsx`, `ludo/types.ts`, `draw/engine.ts`, `spy/engine.ts`, `spy/ui/Lobby.tsx`, `draw/types.ts`, `domino/engine.ts`, `qiuqiu.ts`, `domino/ui/RoundEnd.tsx`, `spy/types.ts`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `dialog.tsx`, `package.json`, `App.tsx`, `UnoTable.tsx`, `DrawBoard.tsx`, `LudoBoard.tsx`, `MonopolyBoard.tsx`, `Demo.tsx`, `remi/ui/copy.ts`, `audio.ts`, `Sheets.tsx`, `SnakesBoard.tsx`, `utils.ts`, `UpdateBanner.tsx`, `BomBoard.tsx`, `games/types.ts`, `DominoTable.tsx`, `RemiTable.tsx`, `bom/ui/copy.ts`, `CardFace.tsx`, `registry.ts`, `snakes/types.ts`, `monopoly/types.ts`, `sfx`, `SpyBoard.tsx`, `ludo/types.ts`, `spy/ui/Lobby.tsx`, `draw/types.ts`, `domino/engine.ts`, `domino/ui/RoundEnd.tsx`, `spy/types.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `SnakesBoard()` connect `lottie.mjs` to `sfx`, `UnoTable.tsx`, `audio.ts`, `SnakesBoard.tsx`, `snakes/ui/copy.ts`, `shuffle`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _348 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dialog.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13970588235294118 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._