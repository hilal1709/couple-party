# Graph Report - game  (2026-10-27)

## Corpus Check
- 464 files · ~1,305,585 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .glb 28, (none) 2, .example 1)

## Summary
- 2385 nodes · 7564 edges · 85 communities (80 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 127 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `124c7d63`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dialog.tsx
- package.json
- useRoom.ts
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
- remi/engine.ts
- remi/ui/copy.ts
- ludo.py
- KartBoard.tsx
- bom.py
- ludo/board.ts
- monopoly/dev.ts
- race.ts
- audio.ts
- release.mjs
- devDependencies
- kart/engine.ts
- BomBoard.tsx
- bom/engine.ts
- remi/types.ts
- DominoTable.tsx
- monopoly/engine.ts
- SnakesBoard.tsx
- bom/ui/copy.ts
- bom/engine.test.ts
- CardFace.tsx
- remi/cards.ts
- remi.py
- monopoly/ui/copy.ts
- registry.ts
- blackjack.ts
- bigtwo.ts
- monopoly/ui/art.tsx
- export.py
- domino.py
- kart.py
- draw.py
- qiuqiu.ts
- games/types.ts
- ludo/engine.ts
- pathlib
- monopoly/types.ts
- snakes/engine.ts
- uno/engine.ts
- world.ts
- Sheets.tsx
- Race
- UpdateBanner.tsx
- spy.py
- SpyBoard.tsx
- ludo/types.ts
- draw/engine.ts
- spy/engine.ts
- models.ts
- play
- Demo.tsx
- build.py
- sounds.test.ts
- domino/types.ts
- chain.ts
- Seat
- uno/engine.test.ts
- capture.mjs
- scripts
- vite.config.ts
- capacitor.config.ts

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
- `Panel()` --calls--> `squiggles()`  [EXTRACTED]
  src/games/monopoly/ui/MonopolyBoard.tsx → src/components/memphis/patterns.ts

## Import Cycles
- None detected.

## Communities (85 total, 5 thin omitted)

### Community 1 - "package.json"
Cohesion: 0.09
Nodes (21): name, private, type, version, @capacitor/android, class-variance-authority, cn, @fontsource/dela-gothic-one (+13 more)

### Community 2 - "useRoom.ts"
Cohesion: 0.08
Nodes (30): @supabase/supabase-js, HostControls(), PickedGame(), Room(), useRoomToasts(), entryById(), gameById(), playerRange() (+22 more)

### Community 3 - "UnoTable.tsx"
Cohesion: 0.12
Nodes (26): src_assets_lottie_burst, CardBack, CardFace, COLOR_NAME, cornerText(), DARK_SIDE, DARK_WHEEL, faceLabel() (+18 more)

### Community 4 - "DrawBoard.tsx"
Cohesion: 0.08
Nodes (40): src_assets_lottie_draw_close, src_assets_lottie_draw_correct, src_assets_lottie_draw_pick, src_assets_lottie_draw_reveal, src_assets_lottie_draw_timeup, CANVAS, hintCount(), INKS (+32 more)

### Community 5 - "Design System: Couple Party"
Cohesion: 0.06
Nodes (30): Buttons (Slab), Cards / Containers, Colors, Components, Design System: Couple Party, Discard Ring and Podium (signature), Do:, Do's and Don'ts (+22 more)

### Community 6 - "LudoBoard.tsx"
Cohesion: 0.08
Nodes (37): src_assets_lottie_dice_roll, src_assets_lottie_ludo_bomb, src_assets_lottie_ludo_boost, src_assets_lottie_ludo_capture, src_assets_lottie_ludo_home, src_assets_lottie_ludo_portal, src_assets_lottie_ludo_six, src_assets_lottie_ludo_slip (+29 more)

### Community 7 - "add"
Cohesion: 0.12
Nodes (49): add(), cheek(), cone(), crown(), eye(), ink_lines(), mat(), mochi() (+41 more)

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
Nodes (27): src_assets_lottie_monopoly_bankrupt, src_assets_lottie_monopoly_build, src_assets_lottie_monopoly_card, src_assets_lottie_monopoly_jackpot, src_assets_lottie_monopoly_jail, src_assets_lottie_monopoly_rent, src_assets_lottie_monopoly_sold, src_assets_monopoly_monopoly_lose (+19 more)

### Community 23 - "remi/engine.ts"
Cohesion: 0.21
Nodes (19): candidates(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce() (+11 more)

### Community 25 - "remi/ui/copy.ts"
Cohesion: 0.31
Nodes (8): rankLabel(), BjResult, eventText(), pokerNote(), roundText(), STREET, streetName(), summary()

### Community 26 - "ludo.py"
Cohesion: 0.19
Nodes (28): no_lines(), ball(), bevel(), box(), cone_(), cyl(), die(), face() (+20 more)

### Community 27 - "KartBoard.tsx"
Cohesion: 0.07
Nodes (38): howler, src_assets_lottie_kart_boost, src_assets_lottie_kart_box, src_assets_lottie_kart_finish, src_assets_lottie_kart_hit, src_assets_lottie_kart_lap, getSettings(), statsFor() (+30 more)

### Community 28 - "bom.py"
Cohesion: 0.16
Nodes (38): attach(), ball(), bean(), bevel(), big_eye(), bom_lose(), bom_win(), bomb() (+30 more)

### Community 29 - "ludo/board.ts"
Cohesion: 0.14
Nodes (29): apothem(), armAngle(), BOOST, cellPt(), circumR(), homePt(), innerR(), progPt() (+21 more)

### Community 30 - "monopoly/dev.ts"
Cohesion: 0.18
Nodes (21): lcg(), groupOf(), botAction(), pick(), randomStep(), squares, allowed(), canBuild() (+13 more)

### Community 31 - "race.ts"
Cohesion: 0.07
Nodes (41): three, Stats, Controls, Opts, Pose, Remote, World, BotBrain (+33 more)

### Community 32 - "audio.ts"
Cohesion: 0.09
Nodes (24): AudioSettings, listeners, music, musicVolume(), playMusic(), setSettings(), settings, sfx() (+16 more)

### Community 33 - "release.mjs"
Cohesion: 0.20
Nodes (6): ref_node_child_process, ref_node_fs, { version }, [bump = 'patch', ...noteParts], [ma, mi, pa], pkg

### Community 34 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, @capacitor/cli, oxlint, @types/node, @types/react, @types/react-dom, @types/three, typescript (+3 more)

### Community 35 - "kart/engine.ts"
Cohesion: 0.08
Nodes (43): BODIES, BODY_IDS, CHARACTERS, CUPS, ITEM_INFO, LEVEL_INFO, MAX_RACERS, ODDS (+35 more)

### Community 36 - "BomBoard.tsx"
Cohesion: 0.10
Nodes (34): src_assets_lottie_bom_boom, src_assets_lottie_bom_cancel, src_assets_lottie_bom_pass, src_assets_lottie_bom_power, src_assets_lottie_bom_spark, fuseRange(), promptText(), cuesFor() (+26 more)

### Community 37 - "bom/engine.ts"
Cohesion: 0.13
Nodes (24): BOOM_SECONDS, bump(), copy(), defaultOptions(), FASTER_MIN, FASTER_STEP, giveRandomPower(), init() (+16 more)

### Community 38 - "remi/types.ts"
Cohesion: 0.08
Nodes (43): deal(), removeIds(), awaitingOut(), bohong, advance(), cangkulan, cangkulPlayable(), mustDig() (+35 more)

### Community 39 - "DominoTable.tsx"
Cohesion: 0.08
Nodes (38): src_assets_lottie_domino_blocked, src_assets_lottie_domino_chips, src_assets_lottie_domino_deal, src_assets_lottie_domino_score, src_assets_lottie_domino_slam, src_assets_lottie_domino_special, DominoDemo(), canPass() (+30 more)

### Community 40 - "monopoly/engine.ts"
Cohesion: 0.22
Nodes (22): nextOf(), advanceAuction(), afterMove(), alive(), charge(), Ctx, drawCard(), finish() (+14 more)

### Community 41 - "SnakesBoard.tsx"
Cohesion: 0.06
Nodes (43): gsap, @gsap/react, Home(), src_assets_lottie_card_pop, src_assets_lottie_item_pop, src_assets_lottie_ladder_up, src_assets_lottie_remi_bomb, src_assets_lottie_remi_bust (+35 more)

### Community 42 - "bom/ui/copy.ts"
Cohesion: 0.09
Nodes (25): SfxName, CUT_MS, LONG_WORD, FxCue, FxName, SoundCue, BomAction, BomEvent (+17 more)

### Community 43 - "bom/engine.test.ts"
Cohesion: 0.21
Nodes (20): fakeWord(), randomStep(), STEMS, aliveSeats(), canAim(), canPower(), canProtest(), explode() (+12 more)

### Community 44 - "CardFace.tsx"
Cohesion: 0.13
Nodes (25): sortHand(), SUIT_NAME, SUIT_SYMBOL, suitIndex(), SUITS, sevenPenalty(), CardBack, CardFace (+17 more)

### Community 45 - "remi/cards.ts"
Cohesion: 0.17
Nodes (20): highAce(), makeDeck(), nextWhere(), RANK_LABEL, RED, shuffled(), SUIT_SORT, after() (+12 more)

### Community 46 - "remi.py"
Cohesion: 0.15
Nodes (35): bevel(), card(), chip(), chip_sprite(), chip_stack(), circle_outline(), dealer_btn(), deck_sprite() (+27 more)

### Community 47 - "monopoly/ui/copy.ts"
Cohesion: 0.15
Nodes (19): ownable(), Card, CardFx, CARDS, DECK_TITLE, Deck, Note, Payee (+11 more)

### Community 48 - "registry.ts"
Cohesion: 0.05
Nodes (37): lottie-react, App(), floor, load(), makeCode(), RoomInfo, SEAT_TONES, src_assets_bom_tile_bom (+29 more)

### Community 49 - "blackjack.ts"
Cohesion: 0.18
Nodes (18): active(), advance(), bjTotal(), blackjack, draw(), isBlackjack(), MIN_BET, settle() (+10 more)

### Community 50 - "bigtwo.ts"
Cohesion: 0.18
Nodes (16): cardLabel(), beats(), bigtwo, bigTwoPenalty(), btRank(), btValue(), comboOf(), FIVE_ORDER (+8 more)

### Community 51 - "monopoly/ui/art.tsx"
Cohesion: 0.17
Nodes (17): Buildings(), C, cellBox(), cellCenter(), CORNER, Die(), label, parts() (+9 more)

### Community 52 - "export.py"
Cohesion: 0.33
Nodes (6): datetime, json, pil, main(), Ekspor render Blender per game (brand/illustrations/<game>/*.png) ke WebP untuk…, size_for()

### Community 53 - "domino.py"
Cohesion: 0.15
Nodes (31): math, bevel(), bone_pile(), bone_sprite(), chain(), chip(), chip_sprite(), chip_stack() (+23 more)

### Community 54 - "kart.py"
Cohesion: 0.12
Nodes (41): attach(), ball(), bevel(), body_bajaj(), body_bebek(), body_gerobak(), box(), cone_() (+33 more)

### Community 55 - "draw.py"
Cohesion: 0.25
Nodes (23): bevel(), bin_sprite(), centered(), crayon(), crayon_sprite(), draw_lose(), draw_win(), easel() (+15 more)

### Community 56 - "qiuqiu.ts"
Cohesion: 0.23
Nodes (15): after(), canAct(), CAT_RANK, compareQiu(), live(), nextStreet(), qiuPot(), roundDone() (+7 more)

### Community 57 - "games/types.ts"
Cohesion: 0.10
Nodes (37): radix-ui, react, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_confetti, ConfirmProps, Modal(), ModalProps (+29 more)

### Community 58 - "ludo/engine.ts"
Cohesion: 0.16
Nodes (33): armsFor(), finishOf(), isSafe(), minArms(), trackIndex(), trackLen(), botAction(), randomStep() (+25 more)

### Community 59 - "pathlib"
Cohesion: 0.22
Nodes (7): bpy, mathutils, pathlib, import_obj(), normalize(), Path, sys

### Community 60 - "monopoly/types.ts"
Cohesion: 0.18
Nodes (12): Auction, Debt, GO_SALARY, JAIL, JAIL_FINE, MonopolyAction, MonopolyEvent, MonopolyOptions (+4 more)

### Community 61 - "snakes/engine.ts"
Cohesion: 0.05
Nodes (66): kart, nextRand(), shuffle(), cellOf(), EFFECTS, int(), makeBoard(), DARES (+58 more)

### Community 62 - "uno/engine.ts"
Cohesion: 0.13
Nodes (24): canPlay(), cardPoints(), HAND_SIZE, isDrawFace(), isWild(), MERCY_LIMIT, playable(), topFace() (+16 more)

### Community 63 - "world.ts"
Cohesion: 0.17
Nodes (23): geometry(), buildWorld(), canvasTex(), groundMesh(), markings(), props(), roadMesh(), seeded() (+15 more)

### Community 64 - "Sheets.tsx"
Cohesion: 0.13
Nodes (19): AIRPORTS, BOARD, CODE, GROUP_HEX, GROUP_NAME, GROUPS, squareName(), UTILITIES (+11 more)

### Community 65 - "Race"
Cohesion: 0.17
Nodes (4): r2(), Race, driftLevel(), KartState

### Community 66 - "UpdateBanner.tsx"
Cohesion: 0.12
Nodes (27): @capacitor/core, @hugeicons/core-free-icons, @hugeicons/react, RoomCode(), Banner(), Props, dismissToast(), emit() (+19 more)

### Community 67 - "spy.py"
Cohesion: 0.17
Nodes (38): attach(), ball(), bean(), bevel(), box(), card(), card_back(), card_word() (+30 more)

### Community 68 - "SpyBoard.tsx"
Cohesion: 0.08
Nodes (38): src_assets_lottie_spy_caught, src_assets_lottie_spy_escape, src_assets_lottie_spy_guess, src_assets_lottie_spy_reveal, src_assets_lottie_spy_stamp, canSpyGuess(), guesser(), cuesFor() (+30 more)

### Community 69 - "ludo/types.ts"
Cohesion: 0.23
Nodes (12): LudoAction, LudoOptions, LudoState, Move, Note, Special, eventText(), noteText() (+4 more)

### Community 70 - "draw/engine.ts"
Cohesion: 0.09
Nodes (44): advance(), canGuess(), CHOOSE_SECONDS, copy(), deal(), defaultOptions(), distance(), DRAWER_POINTS (+36 more)

### Community 71 - "spy/engine.ts"
Cohesion: 0.06
Nodes (64): CLUES, randomStep(), afterOut(), aliveSeats(), BAD, bump(), canVoteFor(), CLUE_MAX (+56 more)

### Community 72 - "models.ts"
Cohesion: 0.15
Nodes (19): ball(), BODY_FALLBACK, box(), build(), cache, cone(), cyl(), FALLBACK (+11 more)

### Community 73 - "play"
Cohesion: 0.27
Nodes (18): checkMercy(), deal(), drawN(), drawUntil(), emit(), endRound(), handPoints(), nextSeat() (+10 more)

### Community 74 - "Demo.tsx"
Cohesion: 0.20
Nodes (10): BomDemo(), LudoDemo(), MonopolyDemo(), NAMES, RemiDemo(), SpyDemo(), lcg(), Variant (+2 more)

### Community 75 - "build.py"
Cohesion: 0.19
Nodes (26): ndarray, numpy, bom_music(), domino_music(), draw_music(), _env(), ff(), kart_music() (+18 more)

### Community 76 - "sounds.test.ts"
Cohesion: 0.29
Nodes (9): vitest, UnoDemo(), defaultOptions(), init(), table(), c(), filler(), table() (+1 more)

### Community 77 - "domino/types.ts"
Cohesion: 0.16
Nodes (26): candidates(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce() (+18 more)

### Community 78 - "chain.ts"
Cohesion: 0.15
Nodes (22): chainEngine(), endCount(), finish(), HAND_SIZE, lowest(), opener(), round5(), evaluateQiu() (+14 more)

### Community 79 - "Seat"
Cohesion: 0.14
Nodes (20): fitsMode(), MODE_INFO, ModeInfo, MODES, qiuName(), Mode, modeArt(), sprite() (+12 more)

### Community 80 - "uno/engine.test.ts"
Cohesion: 0.45
Nodes (8): buildDeck(), classicFaces(), f(), flipDarkFaces(), flipLightFaces(), noMercyFaces(), Card, Face

### Community 81 - "capture.mjs"
Cohesion: 0.22
Nodes (7): ref_node_os, chrome, pending, profile, send(), [url, out, w = '390', h = '844', scale = '2'], ws

### Community 82 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, apk, build, dev, lint, preview, release, test

### Community 83 - "vite.config.ts"
Cohesion: 0.33
Nodes (5): ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, pkg

## Knowledge Gaps
- **392 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+387 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 661 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Seat` connect `Seat` to `useRoom.ts`, `UnoTable.tsx`, `DrawBoard.tsx`, `LudoBoard.tsx`, `MonopolyBoard.tsx`, `remi/engine.ts`, `remi/ui/copy.ts`, `KartBoard.tsx`, `race.ts`, `kart/engine.ts`, `BomBoard.tsx`, `bom/engine.ts`, `remi/types.ts`, `DominoTable.tsx`, `monopoly/engine.ts`, `SnakesBoard.tsx`, `bom/ui/copy.ts`, `CardFace.tsx`, `remi/cards.ts`, `monopoly/ui/copy.ts`, `blackjack.ts`, `qiuqiu.ts`, `games/types.ts`, `ludo/engine.ts`, `monopoly/types.ts`, `snakes/engine.ts`, `uno/engine.ts`, `Sheets.tsx`, `SpyBoard.tsx`, `ludo/types.ts`, `draw/engine.ts`, `spy/engine.ts`, `domino/types.ts`, `chain.ts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `SnakesBoard()` connect `lottie.mjs` to `audio.ts`, `SnakesBoard.tsx`, `snakes/engine.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `react` connect `games/types.ts` to `dialog.tsx`, `package.json`, `useRoom.ts`, `UnoTable.tsx`, `DrawBoard.tsx`, `LudoBoard.tsx`, `MonopolyBoard.tsx`, `remi/engine.ts`, `KartBoard.tsx`, `audio.ts`, `BomBoard.tsx`, `DominoTable.tsx`, `SnakesBoard.tsx`, `bom/ui/copy.ts`, `CardFace.tsx`, `registry.ts`, `monopoly/types.ts`, `snakes/engine.ts`, `uno/engine.ts`, `Sheets.tsx`, `UpdateBanner.tsx`, `SpyBoard.tsx`, `ludo/types.ts`, `draw/engine.ts`, `spy/engine.ts`, `Demo.tsx`, `domino/types.ts`, `Seat`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _392 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `useRoom.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `UnoTable.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12299465240641712 - nodes in this community are weakly interconnected._