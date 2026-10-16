# Graph Report - game  (2026-10-15)

## Corpus Check
- 388 files · ~1,077,495 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 1928 nodes · 6114 edges · 85 communities (81 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 104 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dc9d258c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- utils.ts
- package.json
- App.tsx
- uno/engine.ts
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
- squiggles
- ludo.py
- audio.ts
- useRoom.ts
- ludo/board.ts
- Sheets.tsx
- SnakesBoard.tsx
- UnoTable.tsx
- release.mjs
- devDependencies
- UpdateBanner.tsx
- capture.mjs
- scripts
- remi/types.ts
- DominoTable.tsx
- monopoly/engine.ts
- RemiTable.tsx
- vite.config.ts
- capacitor.config.ts
- remi/ui/copy.ts
- poker.ts
- remi.py
- monopoly/ui/copy.ts
- registry.ts
- blackjack.ts
- bigtwo.ts
- monopoly/ui/art.tsx
- pathlib
- domino.py
- evaluateQiu
- mat
- domino/types.ts
- games/types.ts
- ludo/engine.ts
- shade_smooth
- monopoly/types.ts
- snakes/engine.ts
- snakes/ui/copy.ts
- shuffle
- monopoly/engine.test.ts
- transport.ts
- toast.ts
- spy.py
- SpyBoard.tsx
- ludo/types.ts
- draw/engine.ts
- spy/engine.ts
- spy/engine.test.ts
- spy/ui/Lobby.tsx
- draw/types.ts
- build.py
- Demo.tsx
- domino/engine.ts
- qiuqiu.ts
- domino/ui/RoundEnd.tsx
- draw/ui/art.ts
- Loader.tsx
- spy/sounds.ts
- TileFace.tsx
- canGuess

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
10. `fill()` - 38 edges

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

## Communities (85 total, 4 thin omitted)

### Community 0 - "utils.ts"
Cohesion: 0.11
Nodes (14): class-variance-authority, @hugeicons/core-free-icons, @hugeicons/react, radix-ui, Props, FeedbackTone, useToasts(), Toaster() (+6 more)

### Community 1 - "package.json"
Cohesion: 0.11
Nodes (18): name, private, type, version, @capacitor/android, cn, @fontsource/dela-gothic-one, @fontsource-variable/geist (+10 more)

### Community 2 - "App.tsx"
Cohesion: 0.09
Nodes (17): App(), floor, HostControls(), load(), makeCode(), PickedGame(), RoomInfo, SEAT_TONES (+9 more)

### Community 3 - "uno/engine.ts"
Cohesion: 0.07
Nodes (71): react-dom, UnoDemo(), buildDeck(), classicFaces(), f(), flipDarkFaces(), flipLightFaces(), noMercyFaces() (+63 more)

### Community 4 - "DrawBoard.tsx"
Cohesion: 0.11
Nodes (28): src_assets_lottie_draw_close, src_assets_lottie_draw_correct, src_assets_lottie_draw_pick, src_assets_lottie_draw_reveal, src_assets_lottie_draw_timeup, useMusic(), hintCount(), maskWord() (+20 more)

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
Cohesion: 0.17
Nodes (76): anim(), banknote(), burst(), cardBack(), cardPop(), chipShape(), coin(), confetti() (+68 more)

### Community 21 - "monopoly.py"
Cohesion: 0.09
Nodes (63): arrow_go(), ball(), bevel(), bill_stack(), box(), bulb(), card(), card_chance() (+55 more)

### Community 22 - "MonopolyBoard.tsx"
Cohesion: 0.10
Nodes (29): src_assets_lottie_monopoly_bankrupt, src_assets_lottie_monopoly_build, src_assets_lottie_monopoly_card, src_assets_lottie_monopoly_jackpot, src_assets_lottie_monopoly_jail, src_assets_lottie_monopoly_rent, src_assets_lottie_monopoly_sold, src_assets_monopoly_monopoly_lose (+21 more)

### Community 23 - "remi/engine.ts"
Cohesion: 0.22
Nodes (18): candidates(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce() (+10 more)

### Community 25 - "squiggles"
Cohesion: 0.13
Nodes (18): gsap, @gsap/react, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_confetti, Modal(), squiggles(), pokerNote() (+10 more)

### Community 26 - "ludo.py"
Cohesion: 0.19
Nodes (28): no_lines(), ball(), bevel(), box(), cone_(), cyl(), die(), face() (+20 more)

### Community 27 - "audio.ts"
Cohesion: 0.12
Nodes (14): howler, AudioSettings, listeners, music, musicVolume(), playMusic(), settings, sfxCache (+6 more)

### Community 28 - "useRoom.ts"
Cohesion: 0.20
Nodes (14): Room(), useRoomToasts(), entryById(), gameById(), applyAction(), Pick, Session, SessionAction (+6 more)

### Community 29 - "ludo/board.ts"
Cohesion: 0.14
Nodes (29): apothem(), armAngle(), BOOST, cellPt(), circumR(), homePt(), innerR(), progPt() (+21 more)

### Community 30 - "Sheets.tsx"
Cohesion: 0.20
Nodes (21): BOARD, groupOf(), ownable(), botAction(), pick(), squares, allowed(), canBuild() (+13 more)

### Community 31 - "SnakesBoard.tsx"
Cohesion: 0.09
Nodes (30): src_assets_lottie_card_pop, src_assets_lottie_dice_roll, src_assets_lottie_item_pop, src_assets_lottie_ladder_up, src_assets_lottie_snake_bite, src_assets_snakes_snakes_lose, src_assets_snakes_snakes_win, cellOf() (+22 more)

### Community 32 - "UnoTable.tsx"
Cohesion: 0.08
Nodes (30): src_assets_lottie_burst, setSettings(), sfx(), useAudioSettings(), CREDITS, SoundButton(), SoundDrawer(), svgUrl() (+22 more)

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
Nodes (49): deal(), makeDeck(), RANK_LABEL, RED, removeIds(), shuffled(), SUIT_SORT, SUITS (+41 more)

### Community 39 - "DominoTable.tsx"
Cohesion: 0.10
Nodes (34): src_assets_lottie_domino_blocked, src_assets_lottie_domino_chips, src_assets_lottie_domino_deal, src_assets_lottie_domino_score, src_assets_lottie_domino_slam, src_assets_lottie_domino_special, canPass(), chainPlayable() (+26 more)

### Community 40 - "monopoly/engine.ts"
Cohesion: 0.24
Nodes (21): nextOf(), advanceAuction(), afterMove(), alive(), charge(), Ctx, drawCard(), finish() (+13 more)

### Community 41 - "RemiTable.tsx"
Cohesion: 0.11
Nodes (24): src_assets_lottie_remi_bomb, src_assets_lottie_remi_bust, src_assets_lottie_remi_chips, src_assets_lottie_remi_deal, src_assets_lottie_remi_joker, src_assets_lottie_remi_liar, Banner(), hatch() (+16 more)

### Community 42 - "vite.config.ts"
Cohesion: 0.33
Nodes (5): ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, pkg

### Community 44 - "remi/ui/copy.ts"
Cohesion: 0.10
Nodes (36): cardLabel(), rankLabel(), sortHand(), SUIT_NAME, SUIT_SYMBOL, suitIndex(), MIN_BET, BjResult (+28 more)

### Community 45 - "poker.ts"
Cohesion: 0.21
Nodes (17): highAce(), nextWhere(), advance(), trickWinner(), after(), BOARD_AT, canAct(), compareScores() (+9 more)

### Community 46 - "remi.py"
Cohesion: 0.15
Nodes (35): bevel(), card(), chip(), chip_sprite(), chip_stack(), circle_outline(), dealer_btn(), deck_sprite() (+27 more)

### Community 47 - "monopoly/ui/copy.ts"
Cohesion: 0.20
Nodes (17): squareName(), hasMonopoly(), rentOf(), eventText(), money(), noteText(), OPTION_INFO, payee() (+9 more)

### Community 48 - "registry.ts"
Cohesion: 0.11
Nodes (22): src_assets_domino_tile_domino, src_assets_draw_tile_draw, src_assets_ludo_tile_ludo, src_assets_monopoly_tile_monopoly, src_assets_remi_tile_remi, src_assets_snakes_tile_snakes, src_assets_snakes_tile_uno, src_assets_spy_tile_spy (+14 more)

### Community 49 - "blackjack.ts"
Cohesion: 0.44
Nodes (9): active(), advance(), bjTotal(), blackjack, draw(), isBlackjack(), settle(), startPlay() (+1 more)

### Community 50 - "bigtwo.ts"
Cohesion: 0.19
Nodes (15): beats(), bigtwo, bigTwoPenalty(), btRank(), btValue(), comboOf(), FIVE_ORDER, SUIT_V (+7 more)

### Community 51 - "monopoly/ui/art.tsx"
Cohesion: 0.19
Nodes (15): Buildings(), C, cellBox(), CORNER, Die(), label, parts(), PAWN_HEX (+7 more)

### Community 52 - "pathlib"
Cohesion: 0.24
Nodes (8): datetime, json, pathlib, pil, main(), Ekspor render Blender per game (brand/illustrations/<game>/*.png) ke WebP untuk…, size_for(), sys

### Community 53 - "domino.py"
Cohesion: 0.16
Nodes (30): bevel(), bone_pile(), bone_sprite(), chain(), chip(), chip_sprite(), chip_stack(), coffee() (+22 more)

### Community 54 - "evaluateQiu"
Cohesion: 0.31
Nodes (10): endCount(), opener(), evaluateQiu(), pairValue(), tileKey(), isDouble(), pips(), tileLabel() (+2 more)

### Community 55 - "mat"
Cohesion: 0.25
Nodes (25): crown(), mat(), bevel(), bin_sprite(), centered(), crayon(), crayon_sprite(), draw_lose() (+17 more)

### Community 56 - "domino/types.ts"
Cohesion: 0.13
Nodes (22): chainEngine(), finish(), HAND_SIZE, lowest(), round5(), dealTiles(), handPips(), makeSet() (+14 more)

### Community 57 - "games/types.ts"
Cohesion: 0.16
Nodes (21): react, cache, dots(), Props, Slab(), Tape(), TONE, Switch() (+13 more)

### Community 58 - "ludo/engine.ts"
Cohesion: 0.15
Nodes (34): armsFor(), finishOf(), isSafe(), minArms(), specialAt(), trackIndex(), trackLen(), botAction() (+26 more)

### Community 59 - "shade_smooth"
Cohesion: 0.13
Nodes (24): bpy, math, mathutils, cheek(), cone(), eye(), ink_lines(), mochi() (+16 more)

### Community 60 - "monopoly/types.ts"
Cohesion: 0.10
Nodes (21): AIRPORTS, CODE, GROUP_HEX, GROUP_NAME, GROUPS, UTILITIES, Auction, Debt (+13 more)

### Community 61 - "snakes/engine.ts"
Cohesion: 0.15
Nodes (20): DARES, QUIZ, QuizQ, TRUTHS, canUseItem(), Draft, draw(), effect() (+12 more)

### Community 62 - "snakes/ui/copy.ts"
Cohesion: 0.24
Nodes (10): BONUS, SETBACK, Item, Note, eventText(), FX_INFO, ITEM_INFO, noteText() (+2 more)

### Community 63 - "shuffle"
Cohesion: 0.19
Nodes (18): nextRand(), shuffle(), EFFECTS, int(), makeBoard(), defaultOptions(), init(), table() (+10 more)

### Community 64 - "monopoly/engine.test.ts"
Cohesion: 0.22
Nodes (11): Card, CardFx, CARDS, DECK_TITLE, randomStep(), defaultOptions(), init(), base() (+3 more)

### Community 65 - "transport.ts"
Cohesion: 0.15
Nodes (11): @supabase/supabase-js, hasOnline, localTransport(), NetStatus, openTransport(), profile, store, SUPABASE_KEY (+3 more)

### Community 66 - "toast.ts"
Cohesion: 0.29
Nodes (9): vitest, Home(), RoomCode(), dismissToast(), emit(), getToasts(), list, listeners (+1 more)

### Community 67 - "spy.py"
Cohesion: 0.17
Nodes (38): attach(), ball(), bean(), bevel(), box(), card(), card_back(), card_word() (+30 more)

### Community 68 - "SpyBoard.tsx"
Cohesion: 0.09
Nodes (34): src_assets_lottie_spy_caught, src_assets_lottie_spy_escape, src_assets_lottie_spy_guess, src_assets_lottie_spy_reveal, src_assets_lottie_spy_stamp, canSpyGuess(), guesser(), cuesFor() (+26 more)

### Community 69 - "ludo/types.ts"
Cohesion: 0.23
Nodes (12): ludo, LudoAction, LudoOptions, LudoState, Move, Note, Special, eventText() (+4 more)

### Community 70 - "draw/engine.ts"
Cohesion: 0.15
Nodes (27): advance(), CHOOSE_SECONDS, copy(), deal(), defaultOptions(), distance(), DRAWER_POINTS, GUESS_POINTS (+19 more)

### Community 71 - "spy/engine.ts"
Cohesion: 0.14
Nodes (23): afterOut(), BAD, bump(), CLUE_MAX, deal(), endRound(), giveClue(), GUESS_SECONDS (+15 more)

### Community 72 - "spy/engine.test.ts"
Cohesion: 0.16
Nodes (19): CLUES, randomStep(), aliveSeats(), canVoteFor(), clueProblem(), copy(), defaultOptions(), guessMatches() (+11 more)

### Community 73 - "spy/ui/Lobby.tsx"
Cohesion: 0.16
Nodes (18): MR_WHITE_MIN, roleCounts(), Pack, Phase, Role, SpyMode, SpyOptions, castLine() (+10 more)

### Community 74 - "draw/types.ts"
Cohesion: 0.13
Nodes (18): LEVEL_BONUS, draw, DrawAction, DrawOptions, DrawState, FeedItem, Level, Pack (+10 more)

### Community 75 - "build.py"
Cohesion: 0.27
Nodes (19): ndarray, numpy, Path, domino_music(), draw_music(), ff(), load(), ludo_music() (+11 more)

### Community 76 - "Demo.tsx"
Cohesion: 0.16
Nodes (15): DominoDemo(), LudoDemo(), MonopolyDemo(), NAMES, RemiDemo(), SpyDemo(), randomStep(), QIU_NAMES (+7 more)

### Community 77 - "domino/engine.ts"
Cohesion: 0.26
Nodes (16): candidates(), lcg(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce() (+8 more)

### Community 78 - "qiuqiu.ts"
Cohesion: 0.24
Nodes (14): after(), canAct(), CAT_RANK, compareQiu(), live(), nextStreet(), roundDone(), showdown() (+6 more)

### Community 79 - "domino/ui/RoundEnd.tsx"
Cohesion: 0.24
Nodes (10): MODE_INFO, ModeInfo, MODES, modeArt(), sprite(), SPRITES, roundText(), Props (+2 more)

### Community 80 - "draw/ui/art.ts"
Cohesion: 0.21
Nodes (11): CANVAS, INKS, WIDTHS, INK_NAMES, paintAll(), paintStroke(), PAPER, SEAT_HEX (+3 more)

### Community 81 - "Loader.tsx"
Cohesion: 0.33
Nodes (6): lottie-react, src_assets_lottie_loader, floor, Loader(), LoadingScreen(), reduceMotion()

### Community 82 - "spy/sounds.ts"
Cohesion: 0.33
Nodes (5): SfxName, FxCue, FxName, SoundCue, SpyState

### Community 83 - "TileFace.tsx"
Cohesion: 0.40
Nodes (3): DOTS, Props, TileFace

### Community 84 - "canGuess"
Cohesion: 0.67
Nodes (3): canGuess(), guessPlaceholder(), GuessBox()

## Knowledge Gaps
- **330 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+325 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 559 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SnakesBoard()` connect `lottie.mjs` to `UnoTable.tsx`, `DrawBoard.tsx`, `snakes/engine.ts`, `snakes/ui/copy.ts`, `SnakesBoard.tsx`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `Seat` connect `remi/types.ts` to `uno/engine.ts`, `DrawBoard.tsx`, `LudoBoard.tsx`, `MonopolyBoard.tsx`, `remi/engine.ts`, `squiggles`, `useRoom.ts`, `Sheets.tsx`, `SnakesBoard.tsx`, `UnoTable.tsx`, `DominoTable.tsx`, `monopoly/engine.ts`, `RemiTable.tsx`, `remi/ui/copy.ts`, `poker.ts`, `monopoly/ui/copy.ts`, `blackjack.ts`, `domino/types.ts`, `games/types.ts`, `ludo/engine.ts`, `monopoly/types.ts`, `snakes/engine.ts`, `snakes/ui/copy.ts`, `shuffle`, `SpyBoard.tsx`, `ludo/types.ts`, `draw/engine.ts`, `spy/engine.ts`, `spy/ui/Lobby.tsx`, `draw/types.ts`, `Demo.tsx`, `domino/engine.ts`, `qiuqiu.ts`, `domino/ui/RoundEnd.tsx`, `spy/sounds.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `react` connect `games/types.ts` to `utils.ts`, `package.json`, `App.tsx`, `uno/engine.ts`, `DrawBoard.tsx`, `LudoBoard.tsx`, `MonopolyBoard.tsx`, `squiggles`, `audio.ts`, `useRoom.ts`, `Sheets.tsx`, `SnakesBoard.tsx`, `UnoTable.tsx`, `UpdateBanner.tsx`, `DominoTable.tsx`, `RemiTable.tsx`, `remi/ui/copy.ts`, `registry.ts`, `shuffle`, `toast.ts`, `SpyBoard.tsx`, `ludo/types.ts`, `spy/ui/Lobby.tsx`, `draw/types.ts`, `Demo.tsx`, `domino/ui/RoundEnd.tsx`, `TileFace.tsx`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _330 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `utils.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10752688172043011 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08831908831908832 - nodes in this community are weakly interconnected._