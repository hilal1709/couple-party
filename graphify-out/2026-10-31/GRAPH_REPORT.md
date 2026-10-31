# Graph Report - game  (2026-10-31)

## Corpus Check
- 523 files · ~2,183,748 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 136 file(s) not represented in the graph (top: .glb 132, (none) 2, .example 1)

## Summary
- 2971 nodes · 9412 edges · 113 communities (94 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 223 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b19dca97`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- sphere
- package.json
- Seat
- kart_hd.py
- SnakesBoard.tsx
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
- views/types.ts
- poker.ts
- ludo.py
- KartBoard.tsx
- bom.py
- ludo/board.ts
- DominoTable
- race.ts
- cube
- release.mjs
- devDependencies
- kart/engine.ts
- BomBoard.tsx
- bom/engine.ts
- remi/bot.ts
- monopoly/ui/art.tsx
- monopoly/engine.ts
- RemiTable.tsx
- EmoteLayer.tsx
- emotes.ts
- remi/cards.ts
- domino/bot.ts
- remi.py
- monopoly/ui/copy.ts
- dialog.tsx
- blackjack.ts
- monopoly/engine.test.ts
- Demo.tsx
- kart_world.py
- domino.py
- kart.py
- draw.py
- hazards.ts
- scripts
- ludo/engine.ts
- emote.py
- monopoly/types.ts
- snakes/engine.ts
- uno/engine.ts
- world.ts
- bigtwo.ts
- Race
- system_io
- spy.py
- SpyBoard.tsx
- ludo/types.ts
- DrawBoard.tsx
- system_linq
- models.ts
- pbr
- useRoom.ts
- build.py
- podium.ts
- domino/engine.ts
- tiles.ts
- bots.test.ts
- ludo/engine.test.ts
- games/types.ts
- UpdateBanner.tsx
- UnoTable.tsx
- ludo/bot.ts
- registry.ts
- system_text
- qiuqiu.ts
- unityeditor
- draw/ui/art.ts
- unityeditor_build
- draw/engine.ts
- remi/ui/copy.ts
- unityeditor_build_reporting
- pathlib
- spy/bot.ts
- cyl
- DominoTable.tsx
- system_collections_generic
- unityeditor_scenemanagement
- unityengine
- unityengine_rendering
- unityengine_rendering_universal
- spy/engine.ts
- unityengine_ui
- Sheets.tsx
- nunit_framework
- capture.mjs
- vite.config.ts
- capacitor.config.ts
- domino/types.ts
- system
- kart_items.py

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
- `Panel()` --calls--> `squiggles()`  [EXTRACTED]
  src/games/monopoly/ui/MonopolyBoard.tsx → src/components/memphis/patterns.ts

## Import Cycles
- None detected.

## Communities (113 total, 19 thin omitted)

### Community 0 - "sphere"
Cohesion: 0.13
Nodes (29): jamur_pantul(), kerbau(), kumbang(), orang_orangan(), Jamur pantul: tudung lebar pink berbintik putih, batang pendek gemuk, tepi…, Kumbang biru mengilap: cangkang terbelah, sayap tipis bernama, tanduk, enam…, Kerbau abu: badan besar, tanduk melengkung, telinga, moncong pink, ekor, empat…, Orang-orangan sawah: tiang, baju kotak-kotak, topi caping, wajah karung… (+21 more)

### Community 1 - "package.json"
Cohesion: 0.10
Nodes (20): name, private, type, version, @capacitor/android, class-variance-authority, cn, @fontsource/dela-gothic-one (+12 more)

### Community 2 - "Seat"
Cohesion: 0.12
Nodes (34): deal(), removeIds(), shuffled(), bohong, advance(), cangkulan, trickWinner(), dropPairs() (+26 more)

### Community 3 - "kart_hd.py"
Cohesion: 0.16
Nodes (34): arch(), bev(), body_bajaj(), body_bebek(), body_gerobak(), chrome_pipe(), cube(), curve_tube() (+26 more)

### Community 4 - "SnakesBoard.tsx"
Cohesion: 0.10
Nodes (20): src_assets_lottie_card_pop, src_assets_lottie_item_pop, src_assets_lottie_ladder_up, src_assets_lottie_snake_bite, src_assets_snakes_snakes_lose, src_assets_snakes_snakes_win, Banner(), ConfirmModal() (+12 more)

### Community 5 - "Design System: Couple Party"
Cohesion: 0.06
Nodes (30): Buttons (Slab), Cards / Containers, Colors, Components, Design System: Couple Party, Discard Ring and Podium (signature), Do:, Do's and Don'ts (+22 more)

### Community 6 - "LudoBoard.tsx"
Cohesion: 0.08
Nodes (34): src_assets_lottie_dice_roll, src_assets_lottie_ludo_bomb, src_assets_lottie_ludo_boost, src_assets_lottie_ludo_capture, src_assets_lottie_ludo_home, src_assets_lottie_ludo_portal, src_assets_lottie_ludo_six, src_assets_lottie_ludo_slip (+26 more)

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
Cohesion: 0.09
Nodes (30): src_assets_lottie_monopoly_bankrupt, src_assets_lottie_monopoly_build, src_assets_lottie_monopoly_card, src_assets_lottie_monopoly_jackpot, src_assets_lottie_monopoly_jail, src_assets_lottie_monopoly_rent, src_assets_lottie_monopoly_sold, src_assets_monopoly_monopoly_lose (+22 more)

### Community 23 - "views/types.ts"
Cohesion: 0.17
Nodes (17): candidates(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce(), startRound() (+9 more)

### Community 25 - "poker.ts"
Cohesion: 0.33
Nodes (11): nextWhere(), after(), BOARD_AT, canAct(), compareScores(), live(), nextStreet(), pokerEngine() (+3 more)

### Community 26 - "ludo.py"
Cohesion: 0.19
Nodes (28): no_lines(), ball(), bevel(), box(), cone_(), cyl(), die(), face() (+20 more)

### Community 27 - "KartBoard.tsx"
Cohesion: 0.06
Nodes (45): howler, src_assets_lottie_kart_boost, src_assets_lottie_kart_box, src_assets_lottie_kart_finish, src_assets_lottie_kart_hit, src_assets_lottie_kart_lap, getSettings(), statsFor() (+37 more)

### Community 28 - "bom.py"
Cohesion: 0.16
Nodes (38): attach(), ball(), bean(), bevel(), big_eye(), bom_lose(), bom_win(), bomb() (+30 more)

### Community 29 - "ludo/board.ts"
Cohesion: 0.19
Nodes (24): apothem(), armAngle(), cellPt(), circumR(), homePt(), innerR(), progPt(), R0 (+16 more)

### Community 30 - "DominoTable"
Cohesion: 0.15
Nodes (16): QIU_NAMES, toCall(), DRAW, Effect, effectFor(), isTense(), PLACE, SoundCue (+8 more)

### Community 31 - "race.ts"
Cohesion: 0.06
Nodes (42): three, vitest, Stats, BOT_GRACE, COUNTDOWN, FINISH_GRACE, Controls, GRADE (+34 more)

### Community 32 - "cube"
Cohesion: 0.14
Nodes (21): bus(), gerobak_padi(), lolipop(), papan_neon(), Bus kota hijau: jendela kaca, garis neon, lampu depan emisif, pintu, roda…, Papan reklame neon: tiang, bingkai, layar bernama `screen` (diwarnai/diganti di…, Lolipop raksasa: cakram pink dengan spiral putih timbul di kedua muka, pita…, item_box() (+13 more)

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
Cohesion: 0.08
Nodes (44): src_assets_lottie_bom_boom, src_assets_lottie_bom_cancel, src_assets_lottie_bom_pass, src_assets_lottie_bom_power, src_assets_lottie_bom_spark, fuseRange(), promptText(), cuesFor() (+36 more)

### Community 37 - "bom/engine.ts"
Cohesion: 0.07
Nodes (57): fakeWord(), randomStep(), STEMS, aliveSeats(), BOOM_SECONDS, bump(), canAim(), canPower() (+49 more)

### Community 38 - "remi/bot.ts"
Cohesion: 0.14
Nodes (28): bigTwo(), bigTwoPlays(), blackjack(), bohong(), cangkulan(), CATEGORY_POWER, decide(), holePower() (+20 more)

### Community 39 - "monopoly/ui/art.tsx"
Cohesion: 0.12
Nodes (24): AIRPORTS, BOARD, CODE, GROUP_HEX, GROUP_NAME, UTILITIES, HOTEL, Buildings() (+16 more)

### Community 40 - "monopoly/engine.ts"
Cohesion: 0.22
Nodes (22): nextOf(), advanceAuction(), afterMove(), alive(), charge(), Ctx, drawCard(), finish() (+14 more)

### Community 41 - "RemiTable.tsx"
Cohesion: 0.08
Nodes (32): Home(), src_assets_lottie_remi_bomb, src_assets_lottie_remi_bust, src_assets_lottie_remi_chips, src_assets_lottie_remi_deal, src_assets_lottie_remi_joker, src_assets_lottie_remi_liar, AudioSettings (+24 more)

### Community 42 - "EmoteLayer.tsx"
Cohesion: 0.19
Nodes (12): gsap, @gsap/react, Bubble(), EmoteLayer(), Picker(), reduceMotion(), seatRect(), Shown (+4 more)

### Community 43 - "emotes.ts"
Cohesion: 0.10
Nodes (18): src_assets_emote_kaget, src_assets_emote_kaget_anim, src_assets_emote_keren, src_assets_emote_keren_anim, src_assets_emote_naksir, src_assets_emote_naksir_anim, src_assets_emote_nangis, src_assets_emote_nangis_anim (+10 more)

### Community 44 - "remi/cards.ts"
Cohesion: 0.09
Nodes (39): cardLabel(), makeDeck(), RANK_LABEL, rankLabel(), RED, sortHand(), SUIT_NAME, SUIT_SORT (+31 more)

### Community 45 - "domino/bot.ts"
Cohesion: 0.25
Nodes (17): betAction(), chainAction(), chainValue(), dominoBot(), placed(), qiuAction(), qiuPower(), canPass() (+9 more)

### Community 46 - "remi.py"
Cohesion: 0.15
Nodes (35): bevel(), card(), chip(), chip_sprite(), chip_stack(), circle_outline(), dealer_btn(), deck_sprite() (+27 more)

### Community 47 - "monopoly/ui/copy.ts"
Cohesion: 0.19
Nodes (17): squareName(), Card, CardFx, CARDS, DECK_TITLE, Deck, eventText(), money() (+9 more)

### Community 49 - "blackjack.ts"
Cohesion: 0.33
Nodes (11): active(), advance(), bjTotal(), blackjack, draw(), isBlackjack(), MIN_BET, settle() (+3 more)

### Community 50 - "monopoly/engine.test.ts"
Cohesion: 0.23
Nodes (12): GROUPS, botAction(), randomStep(), defaultOptions(), init(), base(), simulate(), withDice() (+4 more)

### Community 51 - "Demo.tsx"
Cohesion: 0.24
Nodes (9): BomDemo(), DominoDemo(), LudoDemo(), MonopolyDemo(), NAMES, RemiDemo(), SpyDemo(), lcg() (+1 more)

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

### Community 56 - "hazards.ts"
Cohesion: 0.06
Nodes (40): anchors(), bridgeSamples(), groundOf(), GroundShape, smooth(), WATER_Y, Fence, Recipe (+32 more)

### Community 57 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, apk, build, dev, lint, preview, release, test

### Community 58 - "ludo/engine.ts"
Cohesion: 0.20
Nodes (22): BOOST, SLIP, applyMove(), canExit(), capture(), doneAll(), Draft, emit() (+14 more)

### Community 59 - "emote.py"
Cohesion: 0.18
Nodes (33): arc(), ball(), beat(), blush(), box(), drop(), head(), heart_points() (+25 more)

### Community 60 - "monopoly/types.ts"
Cohesion: 0.13
Nodes (14): Auction, Debt, GO_SALARY, Group, JAIL, JAIL_FINE, MonopolyEvent, Note (+6 more)

### Community 61 - "snakes/engine.ts"
Cohesion: 0.06
Nodes (64): cellOf(), EFFECTS, int(), makeBoard(), BEFORE_ROLL, snakesBot(), DARES, QUIZ (+56 more)

### Community 62 - "uno/engine.ts"
Cohesion: 0.08
Nodes (67): react-dom, UnoDemo(), decide(), favoriteColor(), playCard(), score(), unoBot(), buildDeck() (+59 more)

### Community 63 - "world.ts"
Cohesion: 0.08
Nodes (69): alamSide(), banner(), batch(), cornerMarks(), crossings(), eachSide(), fascia(), gantry() (+61 more)

### Community 64 - "bigtwo.ts"
Cohesion: 0.19
Nodes (14): bigtwo, bigTwoPenalty(), btRank(), btValue(), comboOf(), FIVE_ORDER, SUIT_V, BigTwoAction (+6 more)

### Community 65 - "Race"
Cohesion: 0.09
Nodes (11): r2(), Race, Quality, recipeOf(), World, hazardContact(), onPad(), bounce() (+3 more)

### Community 67 - "spy.py"
Cohesion: 0.17
Nodes (38): attach(), ball(), bean(), bevel(), box(), card(), card_back(), card_word() (+30 more)

### Community 68 - "SpyBoard.tsx"
Cohesion: 0.06
Nodes (53): src_assets_lottie_spy_caught, src_assets_lottie_spy_escape, src_assets_lottie_spy_guess, src_assets_lottie_spy_reveal, src_assets_lottie_spy_stamp, sfx(), SfxName, Modal() (+45 more)

### Community 69 - "ludo/types.ts"
Cohesion: 0.18
Nodes (15): ludo, LudoAction, LudoOptions, LudoState, Move, Note, Prog, Special (+7 more)

### Community 70 - "DrawBoard.tsx"
Cohesion: 0.12
Nodes (26): src_assets_lottie_draw_close, src_assets_lottie_draw_correct, src_assets_lottie_draw_pick, src_assets_lottie_draw_reveal, src_assets_lottie_draw_timeup, hintCount(), maskWord(), totalTurns() (+18 more)

### Community 72 - "models.ts"
Cohesion: 0.10
Nodes (28): ball(), BODY_FALLBACK, box(), build(), cache, clearModels(), compactCache, compactClone() (+20 more)

### Community 73 - "pbr"
Cohesion: 0.10
Nodes (30): akar_ayun(), arca(), batu_api(), batu_jatuh(), bola_api(), bola_permen(), es_ayun(), gulungan_semak() (+22 more)

### Community 74 - "useRoom.ts"
Cohesion: 0.09
Nodes (30): @supabase/supabase-js, LiveChannel, applyAction(), BOT_NAMES, MAX_ROOM, Pick, Session, SessionAction (+22 more)

### Community 75 - "build.py"
Cohesion: 0.19
Nodes (26): ndarray, numpy, bom_music(), domino_music(), draw_music(), _env(), ff(), kart_music() (+18 more)

### Community 76 - "podium.ts"
Cohesion: 0.15
Nodes (8): glbUrl(), loadModels(), Particles, Champ, numberTex(), PLACE, Podium, PodiumView()

### Community 77 - "domino/engine.ts"
Cohesion: 0.27
Nodes (15): candidates(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce() (+7 more)

### Community 78 - "tiles.ts"
Cohesion: 0.33
Nodes (8): chainEngine(), opener(), dealTiles(), isDouble(), makeSet(), shuffledSet(), tileLabel(), Tile

### Community 79 - "bots.test.ts"
Cohesion: 0.10
Nodes (21): BY_CATEGORY, CATEGORY_WORDS, GENERAL_WORDS, WORD_MAX, CATEGORIES, LETTERS, SYLLABLES, after() (+13 more)

### Community 80 - "ludo/engine.test.ts"
Cohesion: 0.33
Nodes (9): armsFor(), minArms(), defaultOptions(), init(), teamsAllowed(), base(), roll(), withDie() (+1 more)

### Community 81 - "games/types.ts"
Cohesion: 0.10
Nodes (39): radix-ui, react, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_confetti, ConfirmProps, ModalProps, cache (+31 more)

### Community 82 - "UpdateBanner.tsx"
Cohesion: 0.13
Nodes (25): @capacitor/core, @hugeicons/core-free-icons, RoomCode(), Props, dismissToast(), emit(), FeedbackTone, getToasts() (+17 more)

### Community 83 - "UnoTable.tsx"
Cohesion: 0.08
Nodes (38): @hugeicons/react, src_assets_lottie_burst, setSettings(), useAudioSettings(), CREDITS, SoundButton(), SoundDrawer(), terrazzo() (+30 more)

### Community 84 - "ludo/bot.ts"
Cohesion: 0.38
Nodes (11): finishOf(), isSafe(), specialAt(), trackIndex(), trackLen(), botAction(), ludoBot(), score() (+3 more)

### Community 85 - "registry.ts"
Cohesion: 0.05
Nodes (42): lottie-react, App(), BOT_LEVELS, BotPanel(), floor, HostControls(), load(), makeCode() (+34 more)

### Community 87 - "qiuqiu.ts"
Cohesion: 0.25
Nodes (16): after(), canAct(), CAT_RANK, compareQiu(), evaluateQiu(), live(), nextStreet(), pairValue() (+8 more)

### Community 89 - "draw/ui/art.ts"
Cohesion: 0.21
Nodes (11): CANVAS, INKS, WIDTHS, INK_NAMES, paintAll(), paintStroke(), PAPER, SEAT_HEX (+3 more)

### Community 91 - "draw/engine.ts"
Cohesion: 0.06
Nodes (59): drawBot(), guess(), Plan, SILLY, advance(), canGuess(), CHOOSE_SECONDS, copy() (+51 more)

### Community 92 - "remi/ui/copy.ts"
Cohesion: 0.21
Nodes (10): HAND_NAMES, straightHigh(), BjResult, Card, BJ_TEXT, eventText(), pokerNote(), roundText() (+2 more)

### Community 94 - "pathlib"
Cohesion: 0.11
Nodes (19): bpy, datetime, json, mathutils, pathlib, pil, main(), Satukan frame stiker emote (brand/illustrations/emote/frames) jadi WebP animasi… (+11 more)

### Community 95 - "spy/bot.ts"
Cohesion: 0.14
Nodes (29): bankFor(), bomBot(), pickWord(), src_games_bom_engine_normalize, wordProblem(), best(), Bet, BetSpot (+21 more)

### Community 96 - "cyl"
Cohesion: 0.08
Nodes (37): bola_salju(), gada_batu(), kristal(), pilar_runtuh(), Gada batu berduri tergantung (diayun di atas jalan)., cyl(), last(), batu tak beraturan: ico sphere dengan titik digeser acak lalu dihaluskan sedikit (+29 more)

### Community 97 - "DominoTable.tsx"
Cohesion: 0.08
Nodes (29): src_assets_lottie_domino_blocked, src_assets_lottie_domino_chips, src_assets_lottie_domino_deal, src_assets_lottie_domino_score, src_assets_lottie_domino_slam, src_assets_lottie_domino_special, fitsMode(), MODE_INFO (+21 more)

### Community 103 - "spy/engine.ts"
Cohesion: 0.08
Nodes (49): CLUES, randomStep(), afterOut(), aliveSeats(), BAD, bump(), canVoteFor(), CLUE_MAX (+41 more)

### Community 105 - "Sheets.tsx"
Cohesion: 0.19
Nodes (25): groupOf(), ownable(), completes(), decide(), monopolyBot(), pick(), priceOf(), proposal() (+17 more)

### Community 107 - "capture.mjs"
Cohesion: 0.22
Nodes (7): ref_node_os, chrome, pending, profile, send(), [url, out, w = '390', h = '844', scale = '2', wait = '0'], ws

### Community 108 - "vite.config.ts"
Cohesion: 0.33
Nodes (5): ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, pkg

### Community 115 - "domino/types.ts"
Cohesion: 0.10
Nodes (25): domino, finish(), HAND_SIZE, lowest(), round5(), DealCtx, ModeEngine, Outcome (+17 more)

### Community 140 - "kart_items.py"
Cohesion: 0.15
Nodes (13): fan(), istana_pasir(), kelapa_ayun(), kerang(), magnet(), perisai(), pisang(), Ikon perisai gelembung (di game memakai shader fresnel). (+5 more)

## Knowledge Gaps
- **441 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+436 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 846 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Seat` connect `Seat` to `SnakesBoard.tsx`, `LudoBoard.tsx`, `MonopolyBoard.tsx`, `views/types.ts`, `poker.ts`, `KartBoard.tsx`, `DominoTable`, `race.ts`, `kart/engine.ts`, `BomBoard.tsx`, `bom/engine.ts`, `remi/bot.ts`, `monopoly/engine.ts`, `RemiTable.tsx`, `remi/cards.ts`, `domino/bot.ts`, `monopoly/ui/copy.ts`, `blackjack.ts`, `ludo/engine.ts`, `monopoly/types.ts`, `snakes/engine.ts`, `uno/engine.ts`, `SpyBoard.tsx`, `ludo/types.ts`, `DrawBoard.tsx`, `useRoom.ts`, `domino/engine.ts`, `tiles.ts`, `games/types.ts`, `UnoTable.tsx`, `qiuqiu.ts`, `draw/engine.ts`, `remi/ui/copy.ts`, `spy/bot.ts`, `DominoTable.tsx`, `spy/engine.ts`, `Sheets.tsx`, `domino/types.ts`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `SnakesBoard()` connect `lottie.mjs` to `SnakesBoard.tsx`, `SpyBoard.tsx`, `RemiTable.tsx`, `UnoTable.tsx`, `snakes/engine.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `react` connect `games/types.ts` to `package.json`, `SnakesBoard.tsx`, `LudoBoard.tsx`, `MonopolyBoard.tsx`, `views/types.ts`, `KartBoard.tsx`, `kart/engine.ts`, `BomBoard.tsx`, `bom/engine.ts`, `RemiTable.tsx`, `EmoteLayer.tsx`, `remi/cards.ts`, `dialog.tsx`, `monopoly/engine.test.ts`, `Demo.tsx`, `snakes/engine.ts`, `uno/engine.ts`, `SpyBoard.tsx`, `ludo/types.ts`, `DrawBoard.tsx`, `useRoom.ts`, `UpdateBanner.tsx`, `UnoTable.tsx`, `registry.ts`, `draw/engine.ts`, `DominoTable.tsx`, `spy/engine.ts`, `Sheets.tsx`, `domino/types.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _441 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `sphere` be split into smaller, more focused modules?**
  _Cohesion score 0.1330049261083744 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Seat` be split into smaller, more focused modules?**
  _Cohesion score 0.11733615221987315 - nodes in this community are weakly interconnected._