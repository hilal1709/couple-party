# Graph Report - game  (2026-10-15)

## Corpus Check
- 358 files · ~976,093 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 1757 nodes · 5490 edges · 70 communities (66 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 99 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a1f08b79`
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
- Slab.tsx
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
- remi/ui/copy.ts
- remi/types.ts
- monopoly/ui/art.tsx
- pathlib
- domino.py
- hatch
- mat
- qiuqiu.ts
- react
- ludo/engine.ts
- shade_smooth
- monopoly/types.ts
- snakes/engine.ts
- games/types.ts
- snakes/engine.test.ts
- monopoly/engine.test.ts
- transport.ts
- toast.ts
- ludo/ui/Lobby.tsx
- trackIndex
- ludo/ui/copy.ts

## God Nodes (most connected - your core abstractions)
1. `add()` - 67 edges
2. `mat()` - 59 edges
3. `react` - 52 edges
4. `st()` - 52 edges
5. `Seat` - 52 edges
6. `anim()` - 43 edges
7. `layer()` - 42 edges
8. `doc()` - 40 edges
9. `stroke()` - 39 edges
10. `shade_smooth()` - 33 edges

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

## Communities (70 total, 4 thin omitted)

### Community 0 - "utils.ts"
Cohesion: 0.10
Nodes (13): radix-ui, setSettings(), useAudioSettings(), CREDITS, SoundButton(), SoundDrawer(), Button(), buttonVariants (+5 more)

### Community 1 - "package.json"
Cohesion: 0.10
Nodes (20): name, private, type, version, @capacitor/android, class-variance-authority, cn, @fontsource/dela-gothic-one (+12 more)

### Community 2 - "App.tsx"
Cohesion: 0.11
Nodes (13): App(), floor, HostControls(), load(), makeCode(), PickedGame(), RoomInfo, SEAT_TONES (+5 more)

### Community 3 - "uno/engine.ts"
Cohesion: 0.06
Nodes (81): react-dom, vitest, DominoDemo(), LudoDemo(), MonopolyDemo(), NAMES, RemiDemo(), UnoDemo() (+73 more)

### Community 4 - "DrawBoard.tsx"
Cohesion: 0.05
Nodes (84): src_assets_lottie_draw_close, src_assets_lottie_draw_correct, src_assets_lottie_draw_pick, src_assets_lottie_draw_reveal, src_assets_lottie_draw_timeup, advance(), canGuess(), CANVAS (+76 more)

### Community 5 - "Design System: Couple Party"
Cohesion: 0.06
Nodes (30): Buttons (Slab), Cards / Containers, Colors, Components, Design System: Couple Party, Discard Ring and Podium (signature), Do:, Do's and Don'ts (+22 more)

### Community 6 - "LudoBoard.tsx"
Cohesion: 0.09
Nodes (35): src_assets_lottie_dice_roll, src_assets_lottie_ludo_bomb, src_assets_lottie_ludo_boost, src_assets_lottie_ludo_capture, src_assets_lottie_ludo_home, src_assets_lottie_ludo_portal, src_assets_lottie_ludo_six, src_assets_lottie_ludo_slip (+27 more)

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
Cohesion: 0.18
Nodes (70): anim(), banknote(), burst(), cardBack(), cardPop(), chipShape(), coin(), confetti() (+62 more)

### Community 21 - "monopoly.py"
Cohesion: 0.07
Nodes (81): ndarray, numpy, Path, domino_music(), draw_music(), ff(), load(), ludo_music() (+73 more)

### Community 22 - "MonopolyBoard.tsx"
Cohesion: 0.09
Nodes (31): src_assets_lottie_monopoly_bankrupt, src_assets_lottie_monopoly_build, src_assets_lottie_monopoly_card, src_assets_lottie_monopoly_jackpot, src_assets_lottie_monopoly_jail, src_assets_lottie_monopoly_rent, src_assets_lottie_monopoly_sold, src_assets_monopoly_monopoly_lose (+23 more)

### Community 23 - "remi/engine.ts"
Cohesion: 0.15
Nodes (24): candidates(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce() (+16 more)

### Community 25 - "Slab.tsx"
Cohesion: 0.12
Nodes (27): gsap, @gsap/react, lottie-react, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_confetti, src_assets_lottie_loader, sfx() (+19 more)

### Community 26 - "ludo.py"
Cohesion: 0.19
Nodes (28): no_lines(), ball(), bevel(), box(), cone_(), cyl(), die(), face() (+20 more)

### Community 27 - "audio.ts"
Cohesion: 0.18
Nodes (10): howler, AudioSettings, listeners, music, musicVolume(), playMusic(), settings, sfxCache (+2 more)

### Community 28 - "useRoom.ts"
Cohesion: 0.18
Nodes (16): Room(), useRoomToasts(), entryById(), gameById(), applyAction(), Pick, Session, SessionAction (+8 more)

### Community 29 - "ludo/board.ts"
Cohesion: 0.14
Nodes (29): apothem(), armAngle(), armsFor(), BOOST, cellPt(), circumR(), homePt(), innerR() (+21 more)

### Community 30 - "Sheets.tsx"
Cohesion: 0.21
Nodes (21): groupOf(), ownable(), squareName(), botAction(), pick(), squares, allowed(), canBuild() (+13 more)

### Community 31 - "SnakesBoard.tsx"
Cohesion: 0.08
Nodes (34): src_assets_lottie_card_pop, src_assets_lottie_item_pop, src_assets_lottie_ladder_up, src_assets_lottie_snake_bite, src_assets_snakes_snakes_lose, src_assets_snakes_snakes_win, useMusic(), cellOf() (+26 more)

### Community 32 - "UnoTable.tsx"
Cohesion: 0.09
Nodes (23): src_assets_lottie_burst, terrazzo(), Drawer(), DrawerContent(), DrawerDescription(), DrawerTitle(), CardBack, CardFace (+15 more)

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

### Community 38 - "remi/cards.ts"
Cohesion: 0.09
Nodes (34): deal(), makeDeck(), RANK_LABEL, RED, removeIds(), shuffled(), sortHand(), SUIT_SORT (+26 more)

### Community 39 - "DominoTable.tsx"
Cohesion: 0.10
Nodes (28): src_assets_lottie_domino_blocked, src_assets_lottie_domino_chips, src_assets_lottie_domino_deal, src_assets_lottie_domino_score, src_assets_lottie_domino_slam, src_assets_lottie_domino_special, qiuName(), toCall() (+20 more)

### Community 40 - "monopoly/engine.ts"
Cohesion: 0.25
Nodes (20): nextOf(), advanceAuction(), afterMove(), alive(), charge(), Ctx, drawCard(), finish() (+12 more)

### Community 41 - "RemiTable.tsx"
Cohesion: 0.12
Nodes (22): src_assets_lottie_remi_bomb, src_assets_lottie_remi_bust, src_assets_lottie_remi_chips, src_assets_lottie_remi_deal, src_assets_lottie_remi_joker, src_assets_lottie_remi_liar, ConfirmModal(), Effect (+14 more)

### Community 42 - "vite.config.ts"
Cohesion: 0.33
Nodes (5): ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, pkg

### Community 44 - "CardFace.tsx"
Cohesion: 0.12
Nodes (27): cardLabel(), rankLabel(), SUIT_NAME, toCall(), PokerState, sprite(), CardBack, CardFace (+19 more)

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
Cohesion: 0.10
Nodes (19): src_assets_domino_tile_domino, src_assets_draw_tile_draw, src_assets_ludo_tile_ludo, src_assets_monopoly_tile_monopoly, src_assets_remi_tile_remi, src_assets_snakes_tile_snakes, src_assets_snakes_tile_uno, domino (+11 more)

### Community 49 - "remi/ui/copy.ts"
Cohesion: 0.14
Nodes (22): active(), advance(), bjTotal(), blackjack, draw(), isBlackjack(), MIN_BET, settle() (+14 more)

### Community 50 - "remi/types.ts"
Cohesion: 0.09
Nodes (31): beats(), bigtwo, btRank(), btValue(), comboOf(), FIVE_ORDER, SUIT_V, awaitingOut() (+23 more)

### Community 51 - "monopoly/ui/art.tsx"
Cohesion: 0.09
Nodes (30): AIRPORTS, BOARD, CODE, GROUP_HEX, GROUP_NAME, GROUPS, UTILITIES, hasMonopoly() (+22 more)

### Community 52 - "pathlib"
Cohesion: 0.24
Nodes (8): datetime, json, pathlib, pil, main(), Ekspor render Blender per game (brand/illustrations/<game>/*.png) ke WebP untuk…, size_for(), sys

### Community 53 - "domino.py"
Cohesion: 0.16
Nodes (30): bevel(), bone_pile(), bone_sprite(), chain(), chip(), chip_sprite(), chip_stack(), coffee() (+22 more)

### Community 54 - "hatch"
Cohesion: 0.22
Nodes (12): @hugeicons/core-free-icons, @hugeicons/react, Banner(), Props, FeedbackTone, useToasts(), Toaster(), TONE_CLASS (+4 more)

### Community 55 - "mat"
Cohesion: 0.25
Nodes (25): crown(), mat(), bevel(), bin_sprite(), centered(), crayon(), crayon_sprite(), draw_lose() (+17 more)

### Community 56 - "qiuqiu.ts"
Cohesion: 0.06
Nodes (80): candidates(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce() (+72 more)

### Community 57 - "react"
Cohesion: 0.18
Nodes (13): react, cache, dots(), svgUrl(), Switch(), fitsMode(), modeArt(), SPRITES (+5 more)

### Community 58 - "ludo/engine.ts"
Cohesion: 0.18
Nodes (24): botAction(), randomStep(), applyMove(), canExit(), doneAll(), Draft, emit(), endTurn() (+16 more)

### Community 59 - "shade_smooth"
Cohesion: 0.13
Nodes (24): bpy, math, mathutils, cheek(), cone(), eye(), ink_lines(), mochi() (+16 more)

### Community 60 - "monopoly/types.ts"
Cohesion: 0.14
Nodes (15): monopoly, Auction, Debt, GO_SALARY, JAIL, JAIL_FINE, MonopolyAction, MonopolyEvent (+7 more)

### Community 61 - "snakes/engine.ts"
Cohesion: 0.17
Nodes (17): DARES, QUIZ, QuizQ, TRUTHS, Draft, draw(), effect(), emit() (+9 more)

### Community 62 - "games/types.ts"
Cohesion: 0.17
Nodes (17): SETBACK, BAG, Deck, Note, Pending, SnakesAction, SnakesEvent, SnakesOptions (+9 more)

### Community 63 - "snakes/engine.test.ts"
Cohesion: 0.19
Nodes (14): rand(), nextRand(), EFFECTS, int(), makeBoard(), BONUS, defaultOptions(), init() (+6 more)

### Community 64 - "monopoly/engine.test.ts"
Cohesion: 0.42
Nodes (7): lcg(), randomStep(), defaultOptions(), init(), base(), simulate(), withDice()

### Community 65 - "transport.ts"
Cohesion: 0.15
Nodes (9): hasOnline, localTransport(), NetStatus, profile, store, SUPABASE_KEY, SUPABASE_URL, supabaseTransport() (+1 more)

### Community 66 - "toast.ts"
Cohesion: 0.33
Nodes (8): Home(), RoomCode(), dismissToast(), emit(), getToasts(), list, listeners, toast

### Community 67 - "ludo/ui/Lobby.tsx"
Cohesion: 0.42
Nodes (8): minArms(), defaultOptions(), init(), teamsAllowed(), base(), BOARDS, Lobby(), Toggle

### Community 68 - "trackIndex"
Cohesion: 0.46
Nodes (8): finishOf(), isSafe(), trackIndex(), trackLen(), capture(), enemiesAt(), sendHome(), special()

### Community 69 - "ludo/ui/copy.ts"
Cohesion: 0.36
Nodes (7): Special, eventText(), noteText(), OPTION_INFO, SPECIAL_INFO, TEAM_NAME, who()

## Knowledge Gaps
- **317 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+312 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 528 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SnakesBoard()` connect `SnakesBoard.tsx` to `UnoTable.tsx`, `Slab.tsx`, `lottie.mjs`, `games/types.ts`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `utils.ts`, `package.json`, `App.tsx`, `uno/engine.ts`, `DrawBoard.tsx`, `LudoBoard.tsx`, `MonopolyBoard.tsx`, `remi/engine.ts`, `Slab.tsx`, `audio.ts`, `useRoom.ts`, `Sheets.tsx`, `SnakesBoard.tsx`, `UnoTable.tsx`, `UpdateBanner.tsx`, `DominoTable.tsx`, `RemiTable.tsx`, `CardFace.tsx`, `registry.ts`, `hatch`, `qiuqiu.ts`, `ludo/engine.ts`, `monopoly/types.ts`, `games/types.ts`, `toast.ts`, `ludo/ui/Lobby.tsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `Seat` connect `games/types.ts` to `uno/engine.ts`, `DrawBoard.tsx`, `LudoBoard.tsx`, `MonopolyBoard.tsx`, `remi/engine.ts`, `Slab.tsx`, `useRoom.ts`, `Sheets.tsx`, `SnakesBoard.tsx`, `UnoTable.tsx`, `remi/cards.ts`, `DominoTable.tsx`, `monopoly/engine.ts`, `RemiTable.tsx`, `CardFace.tsx`, `poker.ts`, `monopoly/ui/copy.ts`, `remi/ui/copy.ts`, `remi/types.ts`, `qiuqiu.ts`, `ludo/engine.ts`, `monopoly/types.ts`, `snakes/engine.ts`, `ludo/ui/copy.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _317 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `utils.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09885057471264368 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1067193675889328 - nodes in this community are weakly interconnected._