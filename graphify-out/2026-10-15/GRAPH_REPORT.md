# Graph Report - game  (2026-10-15)

## Corpus Check
- 316 files · ~836,616 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 1587 nodes · 4847 edges · 65 communities (61 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e3b7dc20`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- react
- package.json
- App.tsx
- uno/engine.ts
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
- monopoly.py
- MonopolyBoard.tsx
- remi/engine.ts
- SnakesBoard.tsx
- draw/engine.ts
- audio.ts
- useRoom.ts
- draw/ui/Lobby.tsx
- Sheets.tsx
- snakes/engine.ts
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
- CardFace.tsx
- remi/cards.ts
- remi.py
- monopoly/ui/copy.ts
- games/types.ts
- blackjack.ts
- bigtwo.ts
- monopoly/board.ts
- export.py
- domino.py
- qiuqiu.ts
- mat
- domino/types.ts
- Seat
- chain.ts
- common.py
- monopoly/types.ts
- draw/ui/art.ts
- Demo.tsx
- remi/ui/copy.ts
- monopoly/engine.test.ts

## God Nodes (most connected - your core abstractions)
1. `add()` - 58 edges
2. `mat()` - 55 edges
3. `react` - 49 edges
4. `Seat` - 47 edges
5. `st()` - 44 edges
6. `anim()` - 36 edges
7. `layer()` - 35 edges
8. `stroke()` - 33 edges
9. `doc()` - 33 edges
10. `Slab()` - 30 edges

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

## Communities (65 total, 4 thin omitted)

### Community 0 - "react"
Cohesion: 0.08
Nodes (17): radix-ui, react, CREDITS, Button(), buttonVariants, Drawer(), DrawerContent(), DrawerDescription() (+9 more)

### Community 1 - "package.json"
Cohesion: 0.10
Nodes (19): name, private, type, version, @capacitor/android, class-variance-authority, cn, @fontsource/dela-gothic-one (+11 more)

### Community 2 - "App.tsx"
Cohesion: 0.08
Nodes (28): @hugeicons/core-free-icons, @hugeicons/react, App(), floor, Home(), HostControls(), load(), makeCode() (+20 more)

### Community 3 - "uno/engine.ts"
Cohesion: 0.07
Nodes (75): react-dom, vitest, UnoDemo(), shuffle(), buildDeck(), classicFaces(), f(), flipDarkFaces() (+67 more)

### Community 4 - "DrawBoard.tsx"
Cohesion: 0.10
Nodes (31): src_assets_lottie_draw_close, src_assets_lottie_draw_correct, src_assets_lottie_draw_pick, src_assets_lottie_draw_reveal, src_assets_lottie_draw_timeup, useMusic(), canGuess(), hintCount() (+23 more)

### Community 5 - "Design System: Couple Party"
Cohesion: 0.06
Nodes (30): Buttons (Slab), Cards / Containers, Colors, Components, Design System: Couple Party, Discard Ring and Podium (signature), Do:, Do's and Don'ts (+22 more)

### Community 6 - "build.py"
Cohesion: 0.27
Nodes (17): ndarray, numpy, Path, domino_music(), draw_music(), ff(), load(), monopoly_music() (+9 more)

### Community 7 - "add"
Cohesion: 0.17
Nodes (35): add(), cheek(), cone(), eye(), mochi(), mouth(), pedestal(), pip() (+27 more)

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
Cohesion: 0.18
Nodes (63): anim(), banknote(), burst(), cardBack(), cardPop(), chipShape(), coin(), confetti() (+55 more)

### Community 21 - "monopoly.py"
Cohesion: 0.09
Nodes (63): arrow_go(), ball(), bevel(), bill_stack(), box(), bulb(), card(), card_chance() (+55 more)

### Community 22 - "MonopolyBoard.tsx"
Cohesion: 0.07
Nodes (45): src_assets_lottie_dice_roll, src_assets_lottie_monopoly_bankrupt, src_assets_lottie_monopoly_build, src_assets_lottie_monopoly_card, src_assets_lottie_monopoly_jackpot, src_assets_lottie_monopoly_jail, src_assets_lottie_monopoly_rent, src_assets_lottie_monopoly_sold (+37 more)

### Community 23 - "remi/engine.ts"
Cohesion: 0.21
Nodes (19): candidates(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce() (+11 more)

### Community 25 - "SnakesBoard.tsx"
Cohesion: 0.08
Nodes (38): gsap, @gsap/react, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_card_pop, src_assets_lottie_confetti, src_assets_lottie_item_pop, src_assets_lottie_ladder_up (+30 more)

### Community 26 - "draw/engine.ts"
Cohesion: 0.16
Nodes (25): advance(), CHOOSE_SECONDS, copy(), deal(), defaultOptions(), distance(), DRAWER_POINTS, GUESS_POINTS (+17 more)

### Community 27 - "audio.ts"
Cohesion: 0.15
Nodes (14): howler, AudioSettings, listeners, music, musicVolume(), playMusic(), setSettings(), settings (+6 more)

### Community 28 - "useRoom.ts"
Cohesion: 0.10
Nodes (26): @supabase/supabase-js, Room(), useRoomToasts(), entryById(), gameById(), applyAction(), Pick, Session (+18 more)

### Community 29 - "draw/ui/Lobby.tsx"
Cohesion: 0.16
Nodes (17): LEVEL_BONUS, DrawAction, DrawOptions, DrawState, FeedItem, Level, Pack, Phase (+9 more)

### Community 30 - "Sheets.tsx"
Cohesion: 0.21
Nodes (21): groupOf(), ownable(), squareName(), botAction(), pick(), squares, allowed(), canBuild() (+13 more)

### Community 31 - "snakes/engine.ts"
Cohesion: 0.06
Nodes (65): rollDie(), nextRand(), cellOf(), EFFECTS, int(), makeBoard(), DARES, QUIZ (+57 more)

### Community 32 - "UnoTable.tsx"
Cohesion: 0.14
Nodes (16): src_assets_lottie_burst, terrazzo(), CardBack, CardFace, COLOR_NAME, cornerText(), DARK_SIDE, DARK_WHEEL (+8 more)

### Community 33 - "release.mjs"
Cohesion: 0.20
Nodes (6): ref_node_child_process, ref_node_fs, { version }, [bump = 'patch', ...noteParts], [ma, mi, pa], pkg

### Community 34 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, @capacitor/cli, oxlint, @types/node, @types/react, @types/react-dom, typescript, vite (+2 more)

### Community 35 - "UpdateBanner.tsx"
Cohesion: 0.16
Nodes (17): @capacitor/core, lottie-react, src_assets_lottie_loader, floor, Loader(), LoadingScreen(), reduceMotion(), Phase (+9 more)

### Community 36 - "capture.mjs"
Cohesion: 0.22
Nodes (7): ref_node_os, chrome, pending, profile, send(), [url, out, w = '390', h = '844', scale = '2'], ws

### Community 37 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, apk, build, dev, lint, preview, release, test

### Community 38 - "remi/types.ts"
Cohesion: 0.08
Nodes (43): deal(), removeIds(), awaitingOut(), bohong, advance(), cangkulan, cangkulPlayable(), mustDig() (+35 more)

### Community 39 - "DominoTable.tsx"
Cohesion: 0.10
Nodes (34): src_assets_lottie_domino_blocked, src_assets_lottie_domino_chips, src_assets_lottie_domino_deal, src_assets_lottie_domino_score, src_assets_lottie_domino_slam, src_assets_lottie_domino_special, canPass(), chainPlayable() (+26 more)

### Community 40 - "monopoly/engine.ts"
Cohesion: 0.25
Nodes (20): nextOf(), advanceAuction(), afterMove(), alive(), charge(), Ctx, drawCard(), finish() (+12 more)

### Community 41 - "RemiTable.tsx"
Cohesion: 0.13
Nodes (20): src_assets_lottie_remi_bomb, src_assets_lottie_remi_bust, src_assets_lottie_remi_chips, src_assets_lottie_remi_deal, src_assets_lottie_remi_joker, src_assets_lottie_remi_liar, SfxName, Effect (+12 more)

### Community 42 - "vite.config.ts"
Cohesion: 0.33
Nodes (5): ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, pkg

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
Cohesion: 0.18
Nodes (16): Card, CardFx, CARDS, DECK_TITLE, Deck, eventText(), money(), noteText() (+8 more)

### Community 48 - "games/types.ts"
Cohesion: 0.08
Nodes (32): src_assets_domino_tile_domino, src_assets_draw_tile_draw, src_assets_monopoly_tile_monopoly, src_assets_remi_tile_remi, src_assets_snakes_tile_snakes, src_assets_snakes_tile_uno, cache, dots() (+24 more)

### Community 49 - "blackjack.ts"
Cohesion: 0.18
Nodes (18): active(), advance(), bjTotal(), blackjack, draw(), isBlackjack(), MIN_BET, settle() (+10 more)

### Community 50 - "bigtwo.ts"
Cohesion: 0.18
Nodes (16): cardLabel(), beats(), bigtwo, bigTwoPenalty(), btRank(), btValue(), comboOf(), FIVE_ORDER (+8 more)

### Community 51 - "monopoly/board.ts"
Cohesion: 0.15
Nodes (14): AIRPORTS, BOARD, CODE, GROUP_HEX, GROUP_NAME, GROUPS, UTILITIES, hasMonopoly() (+6 more)

### Community 52 - "export.py"
Cohesion: 0.33
Nodes (6): datetime, json, pil, main(), Ekspor render Blender per game (brand/illustrations/<game>/*.png) ke WebP untuk…, size_for()

### Community 53 - "domino.py"
Cohesion: 0.16
Nodes (31): no_lines(), bevel(), bone_pile(), bone_sprite(), chain(), chip(), chip_sprite(), chip_stack() (+23 more)

### Community 54 - "qiuqiu.ts"
Cohesion: 0.17
Nodes (22): endCount(), opener(), after(), canAct(), CAT_RANK, evaluateQiu(), live(), nextStreet() (+14 more)

### Community 55 - "mat"
Cohesion: 0.25
Nodes (25): crown(), mat(), bevel(), bin_sprite(), centered(), crayon(), crayon_sprite(), draw_lose() (+17 more)

### Community 56 - "domino/types.ts"
Cohesion: 0.15
Nodes (27): candidates(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce(), startRound() (+19 more)

### Community 57 - "Seat"
Cohesion: 0.16
Nodes (16): MODE_INFO, ModeInfo, MODES, qiuName(), modeArt(), sprite(), SPRITES, eventText() (+8 more)

### Community 58 - "chain.ts"
Cohesion: 0.18
Nodes (15): chainEngine(), finish(), HAND_SIZE, lowest(), round5(), dealTiles(), handPips(), makeSet() (+7 more)

### Community 59 - "common.py"
Cohesion: 0.13
Nodes (17): bpy, math, mathutils, pathlib, ink_lines(), Garis tinta kartun (Freestyle) untuk semua objek kecuali koleksi NOLINES., Kamera ortho, matahari, dunia pink pucat, Eevee transparan., Garis miring dua warna (untuk silinder Memphis). (+9 more)

### Community 60 - "monopoly/types.ts"
Cohesion: 0.15
Nodes (14): Auction, Debt, GO_SALARY, JAIL, JAIL_FINE, MonopolyAction, MonopolyEvent, MonopolyOptions (+6 more)

### Community 61 - "draw/ui/art.ts"
Cohesion: 0.19
Nodes (12): CANVAS, INKS, WIDTHS, Stroke, INK_NAMES, paintAll(), paintStroke(), PAPER (+4 more)

### Community 62 - "Demo.tsx"
Cohesion: 0.31
Nodes (7): DominoDemo(), MonopolyDemo(), NAMES, RemiDemo(), randomStep(), randomStep(), lcg()

### Community 63 - "remi/ui/copy.ts"
Cohesion: 0.31
Nodes (8): rankLabel(), BjResult, eventText(), pokerNote(), roundText(), STREET, streetName(), summary()

### Community 64 - "monopoly/engine.test.ts"
Cohesion: 0.46
Nodes (6): lcg(), defaultOptions(), init(), base(), simulate(), withDice()

## Knowledge Gaps
- **303 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+298 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 495 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `package.json`, `App.tsx`, `uno/engine.ts`, `DrawBoard.tsx`, `MonopolyBoard.tsx`, `remi/engine.ts`, `SnakesBoard.tsx`, `audio.ts`, `useRoom.ts`, `draw/ui/Lobby.tsx`, `Sheets.tsx`, `snakes/engine.ts`, `UnoTable.tsx`, `UpdateBanner.tsx`, `DominoTable.tsx`, `RemiTable.tsx`, `CardFace.tsx`, `games/types.ts`, `domino/types.ts`, `Seat`, `monopoly/types.ts`, `Demo.tsx`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `Seat` connect `Seat` to `uno/engine.ts`, `DrawBoard.tsx`, `MonopolyBoard.tsx`, `remi/engine.ts`, `SnakesBoard.tsx`, `draw/engine.ts`, `useRoom.ts`, `draw/ui/Lobby.tsx`, `Sheets.tsx`, `snakes/engine.ts`, `UnoTable.tsx`, `remi/types.ts`, `DominoTable.tsx`, `monopoly/engine.ts`, `RemiTable.tsx`, `CardFace.tsx`, `remi/cards.ts`, `monopoly/ui/copy.ts`, `games/types.ts`, `blackjack.ts`, `qiuqiu.ts`, `domino/types.ts`, `chain.ts`, `monopoly/types.ts`, `remi/ui/copy.ts`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `SnakesBoard()` connect `lottie.mjs` to `UnoTable.tsx`, `SnakesBoard.tsx`, `DrawBoard.tsx`, `snakes/engine.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _303 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.08416389811738649 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08305647840531562 - nodes in this community are weakly interconnected._