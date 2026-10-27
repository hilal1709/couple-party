# Graph Report - game  (2026-10-27)

## Corpus Check
- 473 files · ~1,521,720 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 90 file(s) not represented in the graph (top: .glb 83, .hdr 3, (none) 2)

## Summary
- 2576 nodes · 8070 edges · 98 communities (93 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 152 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb53efc4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dialog.tsx
- package.json
- games/types.ts
- kart_hd.py
- UnoTable.tsx
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
- remi/cards.ts
- ludo.py
- KartBoard.tsx
- bom.py
- ludo/board.ts
- Sheets.tsx
- race.ts
- uno/ui/Lobby.tsx
- release.mjs
- devDependencies
- kart/engine.ts
- BomBoard.tsx
- bom/engine.ts
- remi/types.ts
- DominoTable.tsx
- monopoly/engine.ts
- RemiTable.tsx
- bom/types.ts
- bom/engine.test.ts
- remi/ui/copy.ts
- poker.ts
- remi.py
- monopoly/ui/copy.ts
- registry.ts
- blackjack.ts
- bigtwo.ts
- monopoly/ui/art.tsx
- kart_world.py
- domino.py
- kart.py
- draw.py
- kart_items.py
- SnakesBoard.tsx
- ludo/engine.ts
- export.py
- monopoly/dev.ts
- snakes/engine.ts
- uno/engine.ts
- world.ts
- monopoly/types.ts
- Race
- @hugeicons/core-free-icons
- spy.py
- SpyBoard.tsx
- ludo/types.ts
- DrawBoard.tsx
- spy/engine.ts
- models.ts
- tracks.ts
- App.tsx
- build.py
- podium.ts
- domino/engine.ts
- qiuqiu.ts
- bom/ui/copy.ts
- init
- capture.mjs
- scripts
- vite.config.ts
- capacitor.config.ts
- UpdateBanner.tsx
- uno/types.ts
- domino/types.ts
- spy/engine.test.ts
- spy/ui/Lobby.tsx
- Demo.tsx
- terrazzo
- spy/types.ts
- sounds.test.ts
- audio.ts
- domino/ui/art.ts
- pathlib
- Seat

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

## Communities (98 total, 5 thin omitted)

### Community 0 - "dialog.tsx"
Cohesion: 0.16
Nodes (3): radix-ui, Button(), buttonVariants

### Community 1 - "package.json"
Cohesion: 0.10
Nodes (19): name, private, type, version, @capacitor/android, class-variance-authority, cn, @fontsource/dela-gothic-one (+11 more)

### Community 2 - "games/types.ts"
Cohesion: 0.13
Nodes (23): react, cache, dots(), svgUrl(), Tape(), Switch(), fitsMode(), Lobby() (+15 more)

### Community 3 - "kart_hd.py"
Cohesion: 0.16
Nodes (34): arch(), bev(), body_bajaj(), body_bebek(), body_gerobak(), chrome_pipe(), cube(), curve_tube() (+26 more)

### Community 4 - "UnoTable.tsx"
Cohesion: 0.20
Nodes (20): src_assets_lottie_burst, hatch(), COLOR_NAME, faceLabel(), activeSeats(), faceOf(), needsSwapTarget(), topCard() (+12 more)

### Community 5 - "Design System: Couple Party"
Cohesion: 0.06
Nodes (30): Buttons (Slab), Cards / Containers, Colors, Components, Design System: Couple Party, Discard Ring and Podium (signature), Do:, Do's and Don'ts (+22 more)

### Community 6 - "LudoBoard.tsx"
Cohesion: 0.08
Nodes (36): src_assets_lottie_ludo_bomb, src_assets_lottie_ludo_boost, src_assets_lottie_ludo_capture, src_assets_lottie_ludo_home, src_assets_lottie_ludo_portal, src_assets_lottie_ludo_six, src_assets_lottie_ludo_slip, src_assets_ludo_ludo_lose (+28 more)

### Community 7 - "add"
Cohesion: 0.12
Nodes (50): bean(), add(), cheek(), cone(), crown(), eye(), ink_lines(), mat() (+42 more)

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
Cohesion: 0.09
Nodes (63): arrow_go(), ball(), bevel(), bill_stack(), box(), bulb(), card(), card_chance() (+55 more)

### Community 22 - "MonopolyBoard.tsx"
Cohesion: 0.10
Nodes (30): src_assets_lottie_monopoly_bankrupt, src_assets_lottie_monopoly_build, src_assets_lottie_monopoly_card, src_assets_lottie_monopoly_jackpot, src_assets_lottie_monopoly_jail, src_assets_lottie_monopoly_rent, src_assets_lottie_monopoly_sold, src_assets_monopoly_monopoly_lose (+22 more)

### Community 23 - "remi/engine.ts"
Cohesion: 0.18
Nodes (21): candidates(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce() (+13 more)

### Community 25 - "remi/cards.ts"
Cohesion: 0.14
Nodes (13): cardLabel(), RANK_LABEL, rankLabel(), RED, SUIT_SORT, SUIT_SYMBOL, SUITS, sevenPenalty() (+5 more)

### Community 26 - "ludo.py"
Cohesion: 0.19
Nodes (28): no_lines(), ball(), bevel(), box(), cone_(), cyl(), die(), face() (+20 more)

### Community 27 - "KartBoard.tsx"
Cohesion: 0.06
Nodes (43): howler, src_assets_lottie_kart_boost, src_assets_lottie_kart_box, src_assets_lottie_kart_finish, src_assets_lottie_kart_hit, src_assets_lottie_kart_lap, getSettings(), statsFor() (+35 more)

### Community 28 - "bom.py"
Cohesion: 0.16
Nodes (37): attach(), ball(), bevel(), big_eye(), bom_lose(), bom_win(), bomb(), boomerang() (+29 more)

### Community 29 - "ludo/board.ts"
Cohesion: 0.14
Nodes (29): apothem(), armAngle(), BOOST, cellPt(), circumR(), homePt(), innerR(), progPt() (+21 more)

### Community 30 - "Sheets.tsx"
Cohesion: 0.20
Nodes (17): GROUP_HEX, groupOf(), allowed(), canMortgage(), canSell(), canUnmortgage(), mortgageValue(), tradable() (+9 more)

### Community 31 - "race.ts"
Cohesion: 0.06
Nodes (45): three, Stats, COUNTDOWN, FINISH_GRACE, Controls, GRADE, Opts, Pose (+37 more)

### Community 32 - "uno/ui/Lobby.tsx"
Cohesion: 0.11
Nodes (17): vaul, setSettings(), useAudioSettings(), CREDITS, SoundButton(), SoundDrawer(), Drawer(), DrawerContent() (+9 more)

### Community 33 - "release.mjs"
Cohesion: 0.20
Nodes (6): ref_node_child_process, ref_node_fs, { version }, [bump = 'patch', ...noteParts], [ma, mi, pa], pkg

### Community 34 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, @capacitor/cli, oxlint, @types/node, @types/react, @types/react-dom, @types/three, typescript (+3 more)

### Community 35 - "kart/engine.ts"
Cohesion: 0.08
Nodes (44): BODIES, BODY_IDS, CHARACTERS, CUPS, ITEM_INFO, LEVEL_INFO, MAX_RACERS, ODDS (+36 more)

### Community 36 - "BomBoard.tsx"
Cohesion: 0.10
Nodes (35): src_assets_lottie_bom_boom, src_assets_lottie_bom_cancel, src_assets_lottie_bom_pass, src_assets_lottie_bom_power, src_assets_lottie_bom_spark, useMusic(), fuseRange(), promptText() (+27 more)

### Community 37 - "bom/engine.ts"
Cohesion: 0.11
Nodes (24): BOOM_SECONDS, bump(), copy(), explode(), FASTER_MIN, FASTER_STEP, FUSE_RANGE, giveRandomPower() (+16 more)

### Community 38 - "remi/types.ts"
Cohesion: 0.10
Nodes (37): deal(), makeDeck(), removeIds(), shuffled(), bohong, advance(), cangkulan, cangkulPlayable() (+29 more)

### Community 39 - "DominoTable.tsx"
Cohesion: 0.09
Nodes (37): src_assets_lottie_domino_blocked, src_assets_lottie_domino_chips, src_assets_lottie_domino_deal, src_assets_lottie_domino_score, src_assets_lottie_domino_slam, src_assets_lottie_domino_special, canPass(), chainPlayable() (+29 more)

### Community 40 - "monopoly/engine.ts"
Cohesion: 0.25
Nodes (20): nextOf(), advanceAuction(), afterMove(), alive(), charge(), Ctx, drawCard(), finish() (+12 more)

### Community 41 - "RemiTable.tsx"
Cohesion: 0.13
Nodes (21): src_assets_lottie_remi_bomb, src_assets_lottie_remi_bust, src_assets_lottie_remi_chips, src_assets_lottie_remi_deal, src_assets_lottie_remi_joker, src_assets_lottie_remi_liar, Effect, effectFor() (+13 more)

### Community 42 - "bom/types.ts"
Cohesion: 0.12
Nodes (16): cuesFor(), FxCue, FxName, SoundCue, BomAction, BomEvent, BomState, LogEntry (+8 more)

### Community 43 - "bom/engine.test.ts"
Cohesion: 0.24
Nodes (19): fakeWord(), randomStep(), STEMS, aliveSeats(), canAim(), canPower(), canProtest(), defaultOptions() (+11 more)

### Community 44 - "remi/ui/copy.ts"
Cohesion: 0.11
Nodes (34): sortHand(), SUIT_NAME, suitIndex(), awaitingOut(), jokerTarget(), toCall(), BjResult, BohongState (+26 more)

### Community 45 - "poker.ts"
Cohesion: 0.26
Nodes (14): highAce(), nextWhere(), after(), BOARD_AT, canAct(), compareScores(), evaluate(), HAND_NAMES (+6 more)

### Community 46 - "remi.py"
Cohesion: 0.15
Nodes (35): bevel(), card(), chip(), chip_sprite(), chip_stack(), circle_outline(), dealer_btn(), deck_sprite() (+27 more)

### Community 47 - "monopoly/ui/copy.ts"
Cohesion: 0.23
Nodes (16): squareName(), Card, CardFx, CARDS, DECK_TITLE, rentOf(), Deck, eventText() (+8 more)

### Community 48 - "registry.ts"
Cohesion: 0.07
Nodes (28): src_assets_bom_tile_bom, src_assets_domino_tile_domino, src_assets_draw_tile_draw, src_assets_ludo_tile_ludo, src_assets_monopoly_tile_monopoly, src_assets_remi_tile_remi, src_assets_snakes_tile_snakes, src_assets_snakes_tile_uno (+20 more)

### Community 49 - "blackjack.ts"
Cohesion: 0.33
Nodes (11): active(), advance(), bjTotal(), blackjack, draw(), isBlackjack(), MIN_BET, settle() (+3 more)

### Community 50 - "bigtwo.ts"
Cohesion: 0.19
Nodes (15): beats(), bigtwo, bigTwoPenalty(), btRank(), btValue(), comboOf(), FIVE_ORDER, SUIT_V (+7 more)

### Community 51 - "monopoly/ui/art.tsx"
Cohesion: 0.16
Nodes (17): CODE, Buildings(), C, cellBox(), CORNER, Die(), label, parts() (+9 more)

### Community 52 - "kart_world.py"
Cohesion: 0.12
Nodes (33): bmesh, bpy, mathutils, bounds(), convert(), reset(), import_obj(), normalize() (+25 more)

### Community 53 - "domino.py"
Cohesion: 0.15
Nodes (31): math, bevel(), bone_pile(), bone_sprite(), chain(), chip(), chip_sprite(), chip_stack() (+23 more)

### Community 54 - "kart.py"
Cohesion: 0.12
Nodes (41): attach(), ball(), bevel(), body_bajaj(), body_bebek(), body_gerobak(), box(), cone_() (+33 more)

### Community 55 - "draw.py"
Cohesion: 0.25
Nodes (23): bevel(), bin_sprite(), centered(), crayon(), crayon_sprite(), draw_lose(), draw_win(), easel() (+15 more)

### Community 56 - "kart_items.py"
Cohesion: 0.13
Nodes (40): awan(), bev(), cube(), cyl(), empty(), export(), eyes_on(), fan() (+32 more)

### Community 57 - "SnakesBoard.tsx"
Cohesion: 0.07
Nodes (44): gsap, @gsap/react, lottie-react, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_card_pop, src_assets_lottie_confetti, src_assets_lottie_dice_roll (+36 more)

### Community 58 - "ludo/engine.ts"
Cohesion: 0.19
Nodes (27): finishOf(), isSafe(), specialAt(), trackIndex(), trackLen(), botAction(), randomStep(), applyMove() (+19 more)

### Community 59 - "export.py"
Cohesion: 0.33
Nodes (6): datetime, json, pil, main(), Ekspor render Blender per game (brand/illustrations/<game>/*.png) ke WebP untuk…, size_for()

### Community 60 - "monopoly/dev.ts"
Cohesion: 0.21
Nodes (14): BOARD, ownable(), botAction(), pick(), randomStep(), squares, canBuild(), defaultOptions() (+6 more)

### Community 61 - "snakes/engine.ts"
Cohesion: 0.06
Nodes (62): nextRand(), shuffle(), cellOf(), EFFECTS, int(), makeBoard(), DARES, QUIZ (+54 more)

### Community 62 - "uno/engine.ts"
Cohesion: 0.21
Nodes (27): canPlay(), cardPoints(), checkMercy(), deal(), drawN(), drawUntil(), emit(), endRound() (+19 more)

### Community 63 - "world.ts"
Cohesion: 0.15
Nodes (35): instanced(), placed(), variants(), vertexMaterial(), animateCrab(), banner(), birds(), buildWorld() (+27 more)

### Community 64 - "monopoly/types.ts"
Cohesion: 0.10
Nodes (20): AIRPORTS, GROUP_NAME, GROUPS, UTILITIES, Auction, Debt, GO_SALARY, Group (+12 more)

### Community 65 - "Race"
Cohesion: 0.11
Nodes (5): r2(), Race, Skids, driftLevel(), RaceScreen()

### Community 66 - "@hugeicons/core-free-icons"
Cohesion: 0.19
Nodes (16): @hugeicons/core-free-icons, @hugeicons/react, Home(), RoomCode(), Props, dismissToast(), emit(), FeedbackTone (+8 more)

### Community 67 - "spy.py"
Cohesion: 0.17
Nodes (38): attach(), ball(), bean(), bevel(), box(), card(), card_back(), card_word() (+30 more)

### Community 68 - "SpyBoard.tsx"
Cohesion: 0.08
Nodes (39): src_assets_lottie_spy_caught, src_assets_lottie_spy_escape, src_assets_lottie_spy_guess, src_assets_lottie_spy_reveal, src_assets_lottie_spy_stamp, canSpyGuess(), guesser(), cuesFor() (+31 more)

### Community 69 - "ludo/types.ts"
Cohesion: 0.25
Nodes (11): LudoAction, LudoOptions, LudoState, Move, Note, Special, eventText(), noteText() (+3 more)

### Community 70 - "DrawBoard.tsx"
Cohesion: 0.05
Nodes (84): src_assets_lottie_draw_close, src_assets_lottie_draw_correct, src_assets_lottie_draw_pick, src_assets_lottie_draw_reveal, src_assets_lottie_draw_timeup, advance(), canGuess(), CANVAS (+76 more)

### Community 71 - "spy/engine.ts"
Cohesion: 0.16
Nodes (21): afterOut(), BAD, bump(), CLUE_MAX, deal(), endRound(), giveClue(), GUESS_SECONDS (+13 more)

### Community 72 - "models.ts"
Cohesion: 0.12
Nodes (22): ball(), BODY_FALLBACK, box(), build(), cache, cone(), cyl(), FALLBACK (+14 more)

### Community 73 - "tracks.ts"
Cohesion: 0.11
Nodes (18): newBrain(), spawnKart(), stepKart(), buildTrack(), indexAt(), Near, nearest(), Corner (+10 more)

### Community 74 - "App.tsx"
Cohesion: 0.06
Nodes (37): @supabase/supabase-js, App(), floor, HostControls(), load(), makeCode(), PickedGame(), Room() (+29 more)

### Community 75 - "build.py"
Cohesion: 0.19
Nodes (26): ndarray, numpy, bom_music(), domino_music(), draw_music(), _env(), ff(), kart_music() (+18 more)

### Community 76 - "podium.ts"
Cohesion: 0.15
Nodes (8): glbUrl(), loadModels(), Particles, Champ, numberTex(), PLACE, Podium, PodiumView()

### Community 77 - "domino/engine.ts"
Cohesion: 0.19
Nodes (22): candidates(), lcg(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver() (+14 more)

### Community 78 - "qiuqiu.ts"
Cohesion: 0.17
Nodes (24): chainEngine(), opener(), after(), canAct(), CAT_RANK, compareQiu(), evaluateQiu(), live() (+16 more)

### Community 79 - "bom/ui/copy.ts"
Cohesion: 0.19
Nodes (12): CUT_MS, LONG_WORD, BomMode, BomOptions, Speed, FEATURE_INFO, MODE_INFO, POWER_INFO (+4 more)

### Community 80 - "init"
Cohesion: 0.48
Nodes (7): armsFor(), minArms(), defaultOptions(), init(), teamsAllowed(), base(), Lobby()

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
Cohesion: 0.16
Nodes (17): @capacitor/core, src_assets_lottie_loader, Banner(), floor, Loader(), LoadingScreen(), reduceMotion(), Phase (+9 more)

### Community 86 - "uno/types.ts"
Cohesion: 0.15
Nodes (21): buildDeck(), classicFaces(), f(), flipDarkFaces(), flipLightFaces(), noMercyFaces(), Card, DARK (+13 more)

### Community 87 - "domino/types.ts"
Cohesion: 0.12
Nodes (21): finish(), HAND_SIZE, lowest(), round5(), DealCtx, ModeEngine, Outcome, Step (+13 more)

### Community 88 - "spy/engine.test.ts"
Cohesion: 0.18
Nodes (17): CLUES, randomStep(), aliveSeats(), canVoteFor(), clueProblem(), copy(), defaultOptions(), guessMatches() (+9 more)

### Community 89 - "spy/ui/Lobby.tsx"
Cohesion: 0.17
Nodes (15): MR_WHITE_MIN, roleCounts(), Pack, SpyMode, SpyOptions, castLine(), MODE_INFO, MR_WHITE_INFO (+7 more)

### Community 90 - "Demo.tsx"
Cohesion: 0.18
Nodes (12): react-dom, BomDemo(), DominoDemo(), LudoDemo(), MonopolyDemo(), NAMES, RemiDemo(), SpyDemo() (+4 more)

### Community 91 - "terrazzo"
Cohesion: 0.15
Nodes (11): terrazzo(), KartBoard(), CardBack, CardFace, cornerText(), DARK_SIDE, DARK_WHEEL, LIGHT_WHEEL (+3 more)

### Community 92 - "spy/types.ts"
Cohesion: 0.21
Nodes (9): SfxName, FxCue, FxName, SoundCue, Clue, Phase, RoundResult, SpyAction (+1 more)

### Community 93 - "sounds.test.ts"
Cohesion: 0.29
Nodes (9): vitest, UnoDemo(), defaultOptions(), init(), table(), c(), filler(), table() (+1 more)

### Community 94 - "audio.ts"
Cohesion: 0.22
Nodes (9): AudioSettings, listeners, music, musicVolume(), playMusic(), settings, sfxCache, Track (+1 more)

### Community 95 - "domino/ui/art.ts"
Cohesion: 0.40
Nodes (5): modeArt(), sprite(), SPRITES, Chips(), QiuCenter()

### Community 97 - "Seat"
Cohesion: 0.67
Nodes (3): eventText(), who(), Seat

## Knowledge Gaps
- **407 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+402 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 718 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Seat` connect `Seat` to `games/types.ts`, `UnoTable.tsx`, `LudoBoard.tsx`, `MonopolyBoard.tsx`, `remi/engine.ts`, `remi/cards.ts`, `KartBoard.tsx`, `Sheets.tsx`, `race.ts`, `kart/engine.ts`, `BomBoard.tsx`, `bom/engine.ts`, `remi/types.ts`, `DominoTable.tsx`, `monopoly/engine.ts`, `RemiTable.tsx`, `bom/types.ts`, `remi/ui/copy.ts`, `poker.ts`, `monopoly/ui/copy.ts`, `blackjack.ts`, `SnakesBoard.tsx`, `ludo/engine.ts`, `snakes/engine.ts`, `uno/engine.ts`, `monopoly/types.ts`, `SpyBoard.tsx`, `ludo/types.ts`, `DrawBoard.tsx`, `spy/engine.ts`, `App.tsx`, `domino/engine.ts`, `qiuqiu.ts`, `bom/ui/copy.ts`, `uno/types.ts`, `domino/types.ts`, `spy/ui/Lobby.tsx`, `spy/types.ts`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `SnakesBoard()` connect `lottie.mjs` to `SnakesBoard.tsx`, `terrazzo`, `BomBoard.tsx`, `snakes/engine.ts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `react` connect `games/types.ts` to `dialog.tsx`, `package.json`, `UnoTable.tsx`, `LudoBoard.tsx`, `MonopolyBoard.tsx`, `remi/engine.ts`, `remi/cards.ts`, `KartBoard.tsx`, `Sheets.tsx`, `uno/ui/Lobby.tsx`, `kart/engine.ts`, `BomBoard.tsx`, `DominoTable.tsx`, `RemiTable.tsx`, `bom/types.ts`, `remi/ui/copy.ts`, `registry.ts`, `SnakesBoard.tsx`, `snakes/engine.ts`, `monopoly/types.ts`, `@hugeicons/core-free-icons`, `SpyBoard.tsx`, `ludo/types.ts`, `DrawBoard.tsx`, `App.tsx`, `domino/engine.ts`, `bom/ui/copy.ts`, `UpdateBanner.tsx`, `uno/types.ts`, `spy/ui/Lobby.tsx`, `Demo.tsx`, `terrazzo`, `spy/types.ts`, `audio.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _407 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `games/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13368983957219252 - nodes in this community are weakly interconnected._
- **Should `Design System: Couple Party` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._