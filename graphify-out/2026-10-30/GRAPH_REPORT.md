# Graph Report - game  (2026-10-30)

## Corpus Check
- 514 files · ~1,877,521 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 139 file(s) not represented in the graph (top: .glb 132, .hdr 3, (none) 2)

## Summary
- 2904 nodes · 9204 edges · 94 communities (91 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 223 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9ccf9e7c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- bigtwo.ts
- package.json
- kart_hd.py
- cyl
- Design System: Couple Party
- LudoBoard.tsx
- add
- components.json
- dependencies
- compilerOptions
- compilerOptions
- Product
- kart_lib.py
- 💞 Couple Party
- .oxlintrc.json
- Couple Party — logo
- tsconfig.json
- CLAUDE.md
- lottie.mjs
- CREDITS.md
- monopoly.py
- MonopolyBoard.tsx
- Seat
- nextWhere
- ludo.py
- KartBoard.tsx
- bom.py
- ludo/board.ts
- Sheets.tsx
- race.ts
- capture.mjs
- devDependencies
- kart/engine.ts
- BomBoard.tsx
- bom/engine.test.ts
- remi/bot.ts
- react
- monopoly/engine.ts
- RemiTable.tsx
- bom/types.ts
- emotes.ts
- remi/cards.ts
- games/types.ts
- remi.py
- monopoly/ui/copy.ts
- blackjack.ts
- bom/engine.ts
- kart_world.py
- domino.py
- kart.py
- draw.py
- kart_items.py
- audio.ts
- ludo/engine.ts
- emote.py
- monopoly/engine.test.ts
- SnakesBoard.tsx
- UnoTable.tsx
- world.ts
- monopoly/types.ts
- Race
- UpdateBanner.tsx
- spy.py
- SpyBoard.tsx
- ludo/types.ts
- DrawBoard.tsx
- spy/engine.ts
- models.ts
- sphere
- useRoom.ts
- build.py
- podium.ts
- domino/types.ts
- chain.ts
- bots.test.ts
- ludo/engine.test.ts
- snakes/types.ts
- snakes/engine.ts
- Demo.tsx
- registry.ts
- pbr
- qiuqiu.ts
- snakes/bot.ts
- domino/bot.ts
- draw/engine.ts
- spy/ui/Lobby.tsx
- pathlib
- spy/bot.ts
- cube
- DominoTable.tsx
- snakes/ui/copy.ts
- spy/engine.test.ts
- scripts

## God Nodes (most connected - your core abstractions)
1. `add()` - 94 edges
2. `Seat` - 72 edges
3. `st()` - 67 edges
4. `mat()` - 66 edges
5. `react` - 63 edges
6. `pbr()` - 63 edges
7. `anim()` - 58 edges
8. `layer()` - 57 edges
9. `doc()` - 55 edges
10. `Race` - 52 edges

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

## Communities (94 total, 3 thin omitted)

### Community 0 - "bigtwo.ts"
Cohesion: 0.17
Nodes (16): cardLabel(), bigtwo, bigTwoPenalty(), btRank(), btValue(), comboOf(), FIVE_ORDER, SUIT_V (+8 more)

### Community 1 - "package.json"
Cohesion: 0.06
Nodes (24): config, name, private, type, version, @capacitor/android, @capacitor/cli, class-variance-authority (+16 more)

### Community 3 - "kart_hd.py"
Cohesion: 0.16
Nodes (34): arch(), bev(), body_bajaj(), body_bebek(), body_gerobak(), chrome_pipe(), cube(), curve_tube() (+26 more)

### Community 4 - "cyl"
Cohesion: 0.08
Nodes (37): bola_salju(), gada_batu(), kristal(), pilar_runtuh(), Gada batu berduri tergantung (diayun di atas jalan)., cyl(), last(), batu tak beraturan: ico sphere dengan titik digeser acak lalu dihaluskan sedikit (+29 more)

### Community 5 - "Design System: Couple Party"
Cohesion: 0.06
Nodes (30): Buttons (Slab), Cards / Containers, Colors, Components, Design System: Couple Party, Discard Ring and Podium (signature), Do:, Do's and Don'ts (+22 more)

### Community 6 - "LudoBoard.tsx"
Cohesion: 0.08
Nodes (37): src_assets_lottie_ludo_bomb, src_assets_lottie_ludo_boost, src_assets_lottie_ludo_capture, src_assets_lottie_ludo_home, src_assets_lottie_ludo_portal, src_assets_lottie_ludo_six, src_assets_lottie_ludo_slip, src_assets_ludo_ludo_lose (+29 more)

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

### Community 13 - "kart_lib.py"
Cohesion: 0.13
Nodes (11): Membangun kit logo Couple Party: simbol, wordmark (outline dari Dela Gothic…, fonttools_pens_svgpathpen, fonttools_pens_transformpen, fonttools_ttlib, math, bev(), clear(), export() (+3 more)

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
Cohesion: 0.07
Nodes (46): src_assets_lottie_monopoly_bankrupt, src_assets_lottie_monopoly_build, src_assets_lottie_monopoly_card, src_assets_lottie_monopoly_jackpot, src_assets_lottie_monopoly_jail, src_assets_lottie_monopoly_rent, src_assets_lottie_monopoly_sold, src_assets_monopoly_monopoly_lose (+38 more)

### Community 23 - "Seat"
Cohesion: 0.12
Nodes (34): shuffled(), candidates(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver() (+26 more)

### Community 25 - "nextWhere"
Cohesion: 0.57
Nodes (7): nextWhere(), after(), canAct(), live(), nextStreet(), roundDone(), showdown()

### Community 26 - "ludo.py"
Cohesion: 0.19
Nodes (28): no_lines(), ball(), bevel(), box(), cone_(), cyl(), die(), face() (+20 more)

### Community 27 - "KartBoard.tsx"
Cohesion: 0.06
Nodes (47): howler, src_assets_lottie_kart_boost, src_assets_lottie_kart_box, src_assets_lottie_kart_finish, src_assets_lottie_kart_hit, src_assets_lottie_kart_lap, getSettings(), statsFor() (+39 more)

### Community 28 - "bom.py"
Cohesion: 0.16
Nodes (38): attach(), ball(), bean(), bevel(), big_eye(), bom_lose(), bom_win(), bomb() (+30 more)

### Community 29 - "ludo/board.ts"
Cohesion: 0.15
Nodes (27): apothem(), armAngle(), BOOST, cellPt(), circumR(), homePt(), innerR(), R0 (+19 more)

### Community 30 - "Sheets.tsx"
Cohesion: 0.19
Nodes (25): groupOf(), ownable(), completes(), decide(), monopolyBot(), pick(), priceOf(), proposal() (+17 more)

### Community 31 - "race.ts"
Cohesion: 0.06
Nodes (57): Stats, Controls, GRADE, Opts, Pose, Remote, SANITIZE, SHIELD_MAT (+49 more)

### Community 33 - "capture.mjs"
Cohesion: 0.09
Nodes (18): ref_node_child_process, ref_node_fs, ref_node_os, ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, { version } (+10 more)

### Community 34 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, @capacitor/cli, oxlint, @types/node, @types/react, @types/react-dom, @types/three, typescript (+3 more)

### Community 35 - "kart/engine.ts"
Cohesion: 0.06
Nodes (51): BODIES, BODY_IDS, CHARACTERS, CUPS, ITEM_INFO, LEVEL_INFO, MAX_RACERS, ODDS (+43 more)

### Community 36 - "BomBoard.tsx"
Cohesion: 0.07
Nodes (47): src_assets_lottie_bom_boom, src_assets_lottie_bom_cancel, src_assets_lottie_bom_pass, src_assets_lottie_bom_power, src_assets_lottie_bom_spark, BOOM_SECONDS, CUT_MS, fuseRange() (+39 more)

### Community 37 - "bom/engine.test.ts"
Cohesion: 0.20
Nodes (23): bankFor(), bomBot(), pickWord(), fakeWord(), randomStep(), STEMS, aliveSeats(), canAim() (+15 more)

### Community 38 - "remi/bot.ts"
Cohesion: 0.08
Nodes (53): best(), pickOne(), bigTwo(), bigTwoPlays(), blackjack(), bohong(), cangkulan(), CATEGORY_POWER (+45 more)

### Community 39 - "react"
Cohesion: 0.05
Nodes (63): lottie-react, radix-ui, react, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_confetti, src_assets_lottie_loader, CREDITS (+55 more)

### Community 40 - "monopoly/engine.ts"
Cohesion: 0.22
Nodes (22): nextOf(), advanceAuction(), afterMove(), alive(), charge(), Ctx, drawCard(), finish() (+14 more)

### Community 41 - "RemiTable.tsx"
Cohesion: 0.09
Nodes (33): src_assets_lottie_remi_bomb, src_assets_lottie_remi_bust, src_assets_lottie_remi_chips, src_assets_lottie_remi_deal, src_assets_lottie_remi_joker, src_assets_lottie_remi_liar, rankLabel(), MODE_INFO (+25 more)

### Community 42 - "bom/types.ts"
Cohesion: 0.15
Nodes (13): BomAction, BomEvent, BomOptions, LogEntry, Phase, Power, Prompt, Review (+5 more)

### Community 43 - "emotes.ts"
Cohesion: 0.07
Nodes (31): gsap, @gsap/react, vitest, src_assets_emote_kaget, src_assets_emote_kaget_anim, src_assets_emote_keren, src_assets_emote_keren_anim, src_assets_emote_naksir (+23 more)

### Community 44 - "remi/cards.ts"
Cohesion: 0.10
Nodes (32): makeDeck(), RANK_LABEL, RED, sortHand(), SUIT_NAME, SUIT_SORT, SUIT_SYMBOL, suitIndex() (+24 more)

### Community 45 - "games/types.ts"
Cohesion: 0.13
Nodes (16): SfxName, Bet, BetSpot, FxCue, FxName, SoundCue, Clue, Phase (+8 more)

### Community 46 - "remi.py"
Cohesion: 0.15
Nodes (35): bevel(), card(), chip(), chip_sprite(), chip_stack(), circle_outline(), dealer_btn(), deck_sprite() (+27 more)

### Community 47 - "monopoly/ui/copy.ts"
Cohesion: 0.36
Nodes (11): squareName(), eventText(), money(), noteText(), payee(), summary(), who(), AuctionPanel() (+3 more)

### Community 49 - "blackjack.ts"
Cohesion: 0.25
Nodes (14): active(), advance(), bjTotal(), blackjack, draw(), isBlackjack(), MIN_BET, settle() (+6 more)

### Community 51 - "bom/engine.ts"
Cohesion: 0.15
Nodes (21): bump(), defaultOptions(), explode(), FASTER_MIN, FASTER_STEP, FUSE_RANGE, giveRandomPower(), init() (+13 more)

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

### Community 56 - "kart_items.py"
Cohesion: 0.15
Nodes (13): fan(), istana_pasir(), kelapa_ayun(), kerang(), magnet(), perisai(), pisang(), Ikon perisai gelembung (di game memakai shader fresnel). (+5 more)

### Community 57 - "audio.ts"
Cohesion: 0.15
Nodes (17): Home(), AudioSettings, listeners, music, musicVolume(), playMusic(), setSettings(), settings (+9 more)

### Community 58 - "ludo/engine.ts"
Cohesion: 0.20
Nodes (28): finishOf(), isSafe(), specialAt(), trackIndex(), trackLen(), botAction(), ludoBot(), score() (+20 more)

### Community 59 - "emote.py"
Cohesion: 0.18
Nodes (33): arc(), ball(), beat(), blush(), box(), drop(), head(), heart_points() (+25 more)

### Community 60 - "monopoly/engine.test.ts"
Cohesion: 0.27
Nodes (10): botAction(), randomStep(), defaultOptions(), init(), base(), simulate(), withDice(), MonopolyAction (+2 more)

### Community 61 - "SnakesBoard.tsx"
Cohesion: 0.08
Nodes (31): src_assets_lottie_card_pop, src_assets_lottie_dice_roll, src_assets_lottie_item_pop, src_assets_lottie_ladder_up, src_assets_lottie_snake_bite, src_assets_snakes_snakes_lose, src_assets_snakes_snakes_win, ConfirmModal() (+23 more)

### Community 62 - "UnoTable.tsx"
Cohesion: 0.06
Nodes (91): src_assets_lottie_burst, hatch(), UnoDemo(), CardBack, CardFace, COLOR_NAME, cornerText(), DARK_SIDE (+83 more)

### Community 63 - "world.ts"
Cohesion: 0.13
Nodes (39): instanced(), placed(), variants(), vertexMaterial(), animateCrab(), animateWalker(), banner(), birds() (+31 more)

### Community 64 - "monopoly/types.ts"
Cohesion: 0.08
Nodes (27): AIRPORTS, BOARD, CODE, GROUP_HEX, GROUP_NAME, GROUPS, UTILITIES, Card (+19 more)

### Community 65 - "Race"
Cohesion: 0.10
Nodes (7): r2(), Race, withVariants(), Quality, World, driftLevel(), KartState

### Community 66 - "UpdateBanner.tsx"
Cohesion: 0.13
Nodes (26): @capacitor/core, @hugeicons/core-free-icons, @hugeicons/react, Banner(), Props, dismissToast(), emit(), FeedbackTone (+18 more)

### Community 67 - "spy.py"
Cohesion: 0.17
Nodes (38): attach(), ball(), bean(), bevel(), box(), card(), card_back(), card_word() (+30 more)

### Community 68 - "SpyBoard.tsx"
Cohesion: 0.09
Nodes (36): src_assets_lottie_spy_caught, src_assets_lottie_spy_escape, src_assets_lottie_spy_guess, src_assets_lottie_spy_reveal, src_assets_lottie_spy_stamp, canSpyGuess(), cuesFor(), Role (+28 more)

### Community 69 - "ludo/types.ts"
Cohesion: 0.22
Nodes (13): Arms, LudoAction, LudoOptions, LudoState, Move, Note, Special, eventText() (+5 more)

### Community 70 - "DrawBoard.tsx"
Cohesion: 0.09
Nodes (33): src_assets_lottie_draw_close, src_assets_lottie_draw_correct, src_assets_lottie_draw_pick, src_assets_lottie_draw_reveal, src_assets_lottie_draw_timeup, CANVAS, CHOOSE_SECONDS, INKS (+25 more)

### Community 71 - "spy/engine.ts"
Cohesion: 0.14
Nodes (23): afterOut(), BAD, bump(), CLUE_MAX, copy(), deal(), endRound(), giveClue() (+15 more)

### Community 72 - "models.ts"
Cohesion: 0.10
Nodes (27): ball(), BODY_FALLBACK, box(), build(), cache, clearModels(), compactCache, compactClone() (+19 more)

### Community 73 - "sphere"
Cohesion: 0.13
Nodes (29): jamur_pantul(), kerbau(), kumbang(), orang_orangan(), Jamur pantul: tudung lebar pink berbintik putih, batang pendek gemuk, tepi…, Kumbang biru mengilap: cangkang terbelah, sayap tipis bernama, tanduk, enam…, Kerbau abu: badan besar, tanduk melengkung, telinga, moncong pink, ekor, empat…, Orang-orangan sawah: tiang, baju kotak-kotak, topi caping, wajah karung… (+21 more)

### Community 74 - "useRoom.ts"
Cohesion: 0.09
Nodes (32): @supabase/supabase-js, Room(), useRoomToasts(), entryById(), gameById(), applyAction(), BOT_NAMES, MAX_ROOM (+24 more)

### Community 75 - "build.py"
Cohesion: 0.19
Nodes (26): ndarray, numpy, bom_music(), domino_music(), draw_music(), _env(), ff(), kart_music() (+18 more)

### Community 76 - "podium.ts"
Cohesion: 0.08
Nodes (15): three, glbUrl(), loadModels(), DRIFT_COLORS, DUST, KIND, ParticleKind, Particles (+7 more)

### Community 77 - "domino/types.ts"
Cohesion: 0.15
Nodes (26): candidates(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce(), startRound() (+18 more)

### Community 78 - "chain.ts"
Cohesion: 0.15
Nodes (22): chainEngine(), finish(), HAND_SIZE, lowest(), opener(), round5(), evaluateQiu(), pairValue() (+14 more)

### Community 79 - "bots.test.ts"
Cohesion: 0.11
Nodes (17): BY_CATEGORY, CATEGORY_WORDS, GENERAL_WORDS, WORD_MAX, after(), Any, bomHost(), cardCases (+9 more)

### Community 80 - "ludo/engine.test.ts"
Cohesion: 0.33
Nodes (9): armsFor(), minArms(), defaultOptions(), init(), teamsAllowed(), base(), roll(), withDie() (+1 more)

### Community 81 - "snakes/types.ts"
Cohesion: 0.27
Nodes (12): EFFECTS, makeBoard(), defaultOptions(), init(), table(), Board, Effect, GOAL (+4 more)

### Community 83 - "snakes/engine.ts"
Cohesion: 0.17
Nodes (18): nextRand(), shuffle(), int(), Draft, draw(), effect(), emit(), endTurn() (+10 more)

### Community 84 - "Demo.tsx"
Cohesion: 0.22
Nodes (10): BomDemo(), DominoDemo(), LudoDemo(), MonopolyDemo(), NAMES, RemiDemo(), SpyDemo(), BomMode (+2 more)

### Community 85 - "registry.ts"
Cohesion: 0.04
Nodes (47): react-dom, App(), BOT_LEVELS, BotPanel(), floor, HostControls(), load(), makeCode() (+39 more)

### Community 86 - "pbr"
Cohesion: 0.10
Nodes (30): akar_ayun(), arca(), batu_api(), batu_jatuh(), bola_api(), bola_permen(), es_ayun(), gulungan_semak() (+22 more)

### Community 87 - "qiuqiu.ts"
Cohesion: 0.23
Nodes (15): after(), canAct(), CAT_RANK, compareQiu(), live(), nextStreet(), qiuEngine(), roundDone() (+7 more)

### Community 89 - "snakes/bot.ts"
Cohesion: 0.24
Nodes (9): BEFORE_ROLL, snakesBot(), DARES, QUIZ, QuizQ, TRUTHS, canUseItem(), SnakesAction (+1 more)

### Community 90 - "domino/bot.ts"
Cohesion: 0.20
Nodes (21): betAction(), chainAction(), chainValue(), dominoBot(), placed(), qiuAction(), qiuPower(), canPass() (+13 more)

### Community 91 - "draw/engine.ts"
Cohesion: 0.06
Nodes (60): drawBot(), guess(), Plan, SILLY, advance(), canGuess(), copy(), deal() (+52 more)

### Community 92 - "spy/ui/Lobby.tsx"
Cohesion: 0.16
Nodes (16): MR_WHITE_MIN, roleCounts(), Pack, SpyMode, SpyOptions, castLine(), MODE_INFO, MR_WHITE_INFO (+8 more)

### Community 94 - "pathlib"
Cohesion: 0.11
Nodes (19): bpy, datetime, json, mathutils, pathlib, pil, main(), Satukan frame stiker emote (brand/illustrations/emote/frames) jadi WebP animasi… (+11 more)

### Community 95 - "spy/bot.ts"
Cohesion: 0.18
Nodes (19): distance(), isClose(), normalize(), cluePool(), decide(), deduce(), hits(), pickClue() (+11 more)

### Community 96 - "cube"
Cohesion: 0.14
Nodes (21): bus(), gerobak_padi(), lolipop(), papan_neon(), Bus kota hijau: jendela kaca, garis neon, lampu depan emisif, pintu, roda…, Papan reklame neon: tiang, bingkai, layar bernama `screen` (diwarnai/diganti di…, Lolipop raksasa: cakram pink dengan spiral putih timbul di kedua muka, pita…, item_box() (+13 more)

### Community 97 - "DominoTable.tsx"
Cohesion: 0.09
Nodes (32): src_assets_lottie_domino_blocked, src_assets_lottie_domino_chips, src_assets_lottie_domino_deal, src_assets_lottie_domino_score, src_assets_lottie_domino_slam, src_assets_lottie_domino_special, QIU_NAMES, qiuName() (+24 more)

### Community 101 - "snakes/ui/copy.ts"
Cohesion: 0.24
Nodes (10): BONUS, SETBACK, Item, Note, eventText(), FX_INFO, ITEM_INFO, noteText() (+2 more)

### Community 103 - "spy/engine.test.ts"
Cohesion: 0.22
Nodes (14): CLUES, randomStep(), aliveSeats(), canVoteFor(), defaultOptions(), guessMatches(), init(), reduce() (+6 more)

### Community 107 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, apk, build, dev, lint, preview, release, test

## Knowledge Gaps
- **438 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+433 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 829 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Seat` connect `Seat` to `LudoBoard.tsx`, `MonopolyBoard.tsx`, `KartBoard.tsx`, `Sheets.tsx`, `race.ts`, `kart/engine.ts`, `BomBoard.tsx`, `bom/engine.test.ts`, `remi/bot.ts`, `react`, `monopoly/engine.ts`, `RemiTable.tsx`, `bom/types.ts`, `remi/cards.ts`, `games/types.ts`, `monopoly/ui/copy.ts`, `blackjack.ts`, `bom/engine.ts`, `ludo/engine.ts`, `SnakesBoard.tsx`, `UnoTable.tsx`, `monopoly/types.ts`, `SpyBoard.tsx`, `ludo/types.ts`, `DrawBoard.tsx`, `spy/engine.ts`, `useRoom.ts`, `domino/types.ts`, `chain.ts`, `snakes/types.ts`, `snakes/engine.ts`, `qiuqiu.ts`, `domino/bot.ts`, `draw/engine.ts`, `spy/ui/Lobby.tsx`, `spy/bot.ts`, `DominoTable.tsx`, `snakes/ui/copy.ts`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `SnakesBoard()` connect `lottie.mjs` to `snakes/ui/copy.ts`, `react`, `snakes/bot.ts`, `SnakesBoard.tsx`, `audio.ts`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `package.json`, `LudoBoard.tsx`, `MonopolyBoard.tsx`, `Seat`, `KartBoard.tsx`, `Sheets.tsx`, `kart/engine.ts`, `BomBoard.tsx`, `RemiTable.tsx`, `bom/types.ts`, `emotes.ts`, `remi/cards.ts`, `games/types.ts`, `audio.ts`, `monopoly/engine.test.ts`, `SnakesBoard.tsx`, `UnoTable.tsx`, `UpdateBanner.tsx`, `SpyBoard.tsx`, `ludo/types.ts`, `DrawBoard.tsx`, `useRoom.ts`, `domino/types.ts`, `Demo.tsx`, `registry.ts`, `snakes/bot.ts`, `draw/engine.ts`, `spy/ui/Lobby.tsx`, `DominoTable.tsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _438 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05547652916073969 - nodes in this community are weakly interconnected._
- **Should `cyl` be split into smaller, more focused modules?**
  _Cohesion score 0.07681365576102418 - nodes in this community are weakly interconnected._
- **Should `Design System: Couple Party` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._