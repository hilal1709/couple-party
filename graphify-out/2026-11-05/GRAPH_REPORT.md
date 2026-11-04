# Graph Report - masak  (2026-11-05)

## Corpus Check
- 695 files · ~2,794,047 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 175 file(s) not represented in the graph (top: .glb 162, (none) 3, .hdr 3)

## Summary
- 4947 nodes · 14531 edges · 181 communities (139 shown, 42 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 300 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7a015da1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pbr
- package.json
- remi/cards.ts
- kart_hd.py
- vision_wasm_internal.js
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
- poker.ts
- ludo.py
- KartBoard.tsx
- bom.py
- ludo/board.ts
- cyl
- race.ts
- cube
- release.mjs
- DominoTable.tsx
- kart/engine.ts
- BomBoard.tsx
- petak_pabrik.py
- remi/bot.ts
- monopoly/ui/art.tsx
- monopoly/engine.ts
- RemiTable.tsx
- kitchen.ts
- emotes.ts
- remi/ui/copy.ts
- masak_props.py
- remi.py
- BowlCamera.tsx
- kart_world2.py
- blackjack.ts
- PetakBoard.tsx
- BowlingBoard.tsx
- kart_world.py
- domino.py
- kart.py
- chain.ts
- track.ts
- Seat
- ludo/engine.ts
- emote.py
- monopoly/types.ts
- snakes/engine.ts
- UnoTable.tsx
- kart/render/world.ts
- bigtwo.ts
- Race
- system_io
- spy.py
- SpyBoard.tsx
- ludo/types.ts
- domino/bot.ts
- system_linq
- models.ts
- pathlib
- domino/types.ts
- math
- render/scene.ts
- qiuqiu.ts
- vitest
- bots.test.ts
- ludo/engine.test.ts
- mathutils
- racket/scene.ts
- dialog.tsx
- masak/sim/bots.ts
- registry.ts
- system_text
- maps.ts
- unityeditor
- MasakBoard.tsx
- unityeditor_build
- DrawBoard.tsx
- petak/round.ts
- unityeditor_build_reporting
- PaintSurface
- spy/bot.ts
- devDependencies
- games/types.ts
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
- domino/ui/art.ts
- Map
- sport/types.ts
- kitchens.ts
- petak/engine.ts
- Demo.tsx
- sport_chars.py
- masak-trace.mts
- system
- petak/render/world.ts
- build.py
- Painter
- ArcheryBoard.tsx
- Round
- spy/ui/art.ts
- life.ts
- Chibi
- petak_gang.py
- Stage
- ludo/bot.ts
- kart_lib.py
- export.py
- abort
- petak_body.py
- petak_life.py
- ExceptionInfo
- Round
- monopoly/engine.test.ts
- petak-perf.mjs
- petak-probe.mts
- createLazyFile
- petak-duo.mjs
- makeEntry
- init
- makeBlendState
- makeVertexAttributes
- requestFullscreen
- run
- ___syscall_ioctl
- makeColorAttachments
- close
- write
- syncfs
- BindingError
- convertReturnValue
- custom_emscripten_dbgn
- EmscriptenEH
- ExitStatus
- fromWireType
- readlink
- makeDepthStencilState
- registerType
- statfs
- getUserMedia
- ioctl
- link
- llseek
- lookup
- mknod
- mount
- readdir
- rename
- rmdir
- symlink
- unlink
- App.tsx
- shutil
- useRoom.ts
- vite.config.ts
- bom/engine.ts
- masak/round.ts
- monopoly/ui/copy.ts
- scripts

## God Nodes (most connected - your core abstractions)
1. `Seat` - 99 edges
2. `add()` - 94 edges
3. `pbr()` - 92 edges
4. `react` - 87 edges
5. `cyl()` - 76 edges
6. `st()` - 74 edges
7. `mat()` - 66 edges
8. `anim()` - 66 edges
9. `layer()` - 65 edges
10. `sphere()` - 64 edges

## Surprising Connections (you probably didn't know these)
- `fullscreenChange()` --indirect_call--> `canvas()`  [INFERRED]
  public/pose/vision_wasm_internal.js → src/games/sport/render/arena.ts
- `SnakesBoard()` --indirect_call--> `ladderUp()`  [INFERRED]
  src/games/snakes/ui/SnakesBoard.tsx → scripts/lottie.mjs
- `SnakesBoard()` --indirect_call--> `snakeBite()`  [INFERRED]
  src/games/snakes/ui/SnakesBoard.tsx → scripts/lottie.mjs
- `SnakesBoard()` --indirect_call--> `itemPop()`  [INFERRED]
  src/games/snakes/ui/SnakesBoard.tsx → scripts/lottie.mjs
- `SnakesBoard()` --indirect_call--> `cardPop()`  [INFERRED]
  src/games/snakes/ui/SnakesBoard.tsx → scripts/lottie.mjs

## Import Cycles
- None detected.

## Communities (181 total, 42 thin omitted)

### Community 0 - "pbr"
Cohesion: 0.07
Nodes (60): akar_ayun(), arca(), gulungan_semak(), jamur_pantul(), kerbau(), kumbang(), orang_orangan(), palang_parkir() (+52 more)

### Community 1 - "package.json"
Cohesion: 0.07
Nodes (25): config, name, private, type, version, @capacitor/android, @capacitor/cli, cn (+17 more)

### Community 2 - "remi/cards.ts"
Cohesion: 0.09
Nodes (35): deal(), makeDeck(), RANK_LABEL, RED, removeIds(), shuffled(), SUIT_SORT, SUITS (+27 more)

### Community 3 - "kart_hd.py"
Cohesion: 0.16
Nodes (34): arch(), bev(), body_bajaj(), body_bebek(), body_gerobak(), chrome_pipe(), cube(), curve_tube() (+26 more)

### Community 4 - "vision_wasm_internal.js"
Cohesion: 0.01
Nodes (17): RFC-2279, RFC-3629, NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),, NOTE: This is also used as the process return code in shell environments, TODO: check for O_SEARCH? (== search for dir only), NOTE: None of the defaults here are true. We're just returning safe and, TODO: Use mozResponseArrayBuffer, responseStream, etc. if available., TODO: Due to Closure regression https://github.com/google/closure-… (+9 more)

### Community 5 - "Design System: Couple Party"
Cohesion: 0.06
Nodes (30): Buttons (Slab), Cards / Containers, Colors, Components, Design System: Couple Party, Discard Ring and Podium (signature), Do:, Do's and Don'ts (+22 more)

### Community 6 - "LudoBoard.tsx"
Cohesion: 0.08
Nodes (34): src_assets_lottie_dice_roll, src_assets_lottie_ludo_bomb, src_assets_lottie_ludo_boost, src_assets_lottie_ludo_capture, src_assets_lottie_ludo_home, src_assets_lottie_ludo_portal, src_assets_lottie_ludo_six, src_assets_lottie_ludo_slip (+26 more)

### Community 7 - "add"
Cohesion: 0.09
Nodes (73): bean(), add(), cheek(), cone(), crown(), eye(), ink_lines(), mat() (+65 more)

### Community 8 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 9 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, @capacitor/android, @capacitor/core, class-variance-authority, cn, @fontsource/dela-gothic-one, @fontsource-variable/geist, gsap (+17 more)

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
Cohesion: 0.14
Nodes (95): anim(), banknote(), bomBoom(), bomCancel(), bomPass(), bomPower(), bomSpark(), burst() (+87 more)

### Community 21 - "monopoly.py"
Cohesion: 0.09
Nodes (63): arrow_go(), ball(), bevel(), bill_stack(), box(), bulb(), card(), card_chance() (+55 more)

### Community 22 - "MonopolyBoard.tsx"
Cohesion: 0.10
Nodes (28): src_assets_lottie_monopoly_bankrupt, src_assets_lottie_monopoly_build, src_assets_lottie_monopoly_card, src_assets_lottie_monopoly_jackpot, src_assets_lottie_monopoly_jail, src_assets_lottie_monopoly_rent, src_assets_lottie_monopoly_sold, src_assets_monopoly_monopoly_lose (+20 more)

### Community 23 - "remi/types.ts"
Cohesion: 0.14
Nodes (28): BomDemo(), LudoDemo(), MonopolyDemo(), RemiDemo(), candidates(), lcg(), randomStep(), apply() (+20 more)

### Community 25 - "poker.ts"
Cohesion: 0.28
Nodes (13): nextWhere(), after(), BOARD_AT, canAct(), compareScores(), evaluate(), HAND_NAMES, straightHigh() (+5 more)

### Community 26 - "ludo.py"
Cohesion: 0.19
Nodes (28): no_lines(), ball(), bevel(), box(), cone_(), cyl(), die(), face() (+20 more)

### Community 27 - "KartBoard.tsx"
Cohesion: 0.06
Nodes (44): src_assets_lottie_kart_boost, src_assets_lottie_kart_box, src_assets_lottie_kart_finish, src_assets_lottie_kart_hit, src_assets_lottie_kart_lap, BODIES, statsFor(), racerOf() (+36 more)

### Community 28 - "bom.py"
Cohesion: 0.16
Nodes (37): attach(), ball(), bevel(), big_eye(), bom_lose(), bom_win(), bomb(), boomerang() (+29 more)

### Community 29 - "ludo/board.ts"
Cohesion: 0.19
Nodes (24): apothem(), armAngle(), cellPt(), circumR(), homePt(), innerR(), progPt(), R0 (+16 more)

### Community 30 - "cyl"
Cohesion: 0.08
Nodes (41): batu_api(), batu_jatuh(), bola_api(), bola_permen(), bola_salju(), bus(), es_ayun(), gada_batu() (+33 more)

### Community 31 - "race.ts"
Cohesion: 0.05
Nodes (59): Stats, BOT_GRACE, COUNTDOWN, FINISH_GRACE, Controls, GRADE, Opts, Pose (+51 more)

### Community 32 - "cube"
Cohesion: 0.09
Nodes (58): cube(), kosongkan adegan & cache material sebelum membangun model berikutnya, reset(), text3d(), arena(), bake_lightmap(), build_archery(), build_bowling() (+50 more)

### Community 33 - "release.mjs"
Cohesion: 0.20
Nodes (6): ref_node_child_process, ref_node_fs, { version }, [bump = 'patch', ...noteParts], [ma, mi, pa], pkg

### Community 34 - "DominoTable.tsx"
Cohesion: 0.07
Nodes (35): src_assets_lottie_domino_blocked, src_assets_lottie_domino_chips, src_assets_lottie_domino_deal, src_assets_lottie_domino_score, src_assets_lottie_domino_slam, src_assets_lottie_domino_special, QIU_NAMES, qiuName() (+27 more)

### Community 35 - "kart/engine.ts"
Cohesion: 0.09
Nodes (41): BODY_IDS, CHARACTERS, CUPS, ITEM_INFO, LEVEL_INFO, MAX_RACERS, ODDS, POINTS (+33 more)

### Community 36 - "BomBoard.tsx"
Cohesion: 0.07
Nodes (51): src_assets_lottie_bom_boom, src_assets_lottie_bom_cancel, src_assets_lottie_bom_pass, src_assets_lottie_bom_power, src_assets_lottie_bom_spark, fuseRange(), LONG_WORD, promptText() (+43 more)

### Community 37 - "petak_pabrik.py"
Cohesion: 0.08
Nodes (18): pola(), checker(), ubin dua warna bernat, dengan noda halus: satu gambar = n × n keping, pori(), decal_set(), tempelan prosedural: noda hujan, lumut, retak, tanah, noda oli, poster, dan…, noise(), derau halus berulang, 0..1, untuk decal dan kotoran (+10 more)

### Community 38 - "remi/bot.ts"
Cohesion: 0.14
Nodes (29): best(), Bet, betAction(), BetSpot, pickOne(), bigTwo(), bigTwoPlays(), blackjack() (+21 more)

### Community 39 - "monopoly/ui/art.tsx"
Cohesion: 0.13
Nodes (22): BOARD, CODE, GROUP_HEX, GROUP_NAME, HOTEL, Buildings(), C, cellBox() (+14 more)

### Community 40 - "monopoly/engine.ts"
Cohesion: 0.21
Nodes (23): nextOf(), advanceAuction(), afterMove(), alive(), charge(), Ctx, drawCard(), finish() (+15 more)

### Community 41 - "RemiTable.tsx"
Cohesion: 0.06
Nodes (45): howler, src_assets_lottie_remi_bomb, src_assets_lottie_remi_bust, src_assets_lottie_remi_chips, src_assets_lottie_remi_deal, src_assets_lottie_remi_joker, src_assets_lottie_remi_liar, AudioSettings (+37 more)

### Community 42 - "kitchen.ts"
Cohesion: 0.09
Nodes (33): BAKE_MS, BELT_MS, BURN_MS, CHOP_MS, COOK_MS, DOUSE_MS, Ext, FLOUR_MS (+25 more)

### Community 43 - "emotes.ts"
Cohesion: 0.09
Nodes (20): src_assets_emote_kaget, src_assets_emote_kaget_anim, src_assets_emote_keren, src_assets_emote_keren_anim, src_assets_emote_naksir, src_assets_emote_naksir_anim, src_assets_emote_nangis, src_assets_emote_nangis_anim (+12 more)

### Community 44 - "remi/ui/copy.ts"
Cohesion: 0.08
Nodes (42): rankLabel(), sortHand(), SUIT_NAME, SUIT_SYMBOL, suitIndex(), MIN_BET, sevenPenalty(), BjResult (+34 more)

### Community 45 - "masak_props.py"
Cohesion: 0.05
Nodes (55): ball(), banana_peel(), banana_slices(), batter_bowl(), bowl(), bun_top(), chef_hat(), cucumber() (+47 more)

### Community 46 - "remi.py"
Cohesion: 0.15
Nodes (35): bevel(), card(), chip(), chip_sprite(), chip_stack(), circle_outline(), dealer_btn(), deck_sprite() (+27 more)

### Community 47 - "BowlCamera.tsx"
Cohesion: 0.13
Nodes (17): @mediapipe/tasks-vision, src_assets_lottie_sport_swing, closeCamera(), Delegate, loadModel(), openCamera(), PoseFrame, PoseTracker (+9 more)

### Community 48 - "kart_world2.py"
Cohesion: 0.07
Nodes (28): bendera_rp(), candi(), gapura_candi(), gapura_sawah(), gunung_api(), jamur_raksasa(), jembatan_batu(), jembatan_layang() (+20 more)

### Community 49 - "blackjack.ts"
Cohesion: 0.44
Nodes (9): active(), advance(), bjTotal(), blackjack, draw(), isBlackjack(), settle(), startPlay() (+1 more)

### Community 50 - "PetakBoard.tsx"
Cohesion: 0.07
Nodes (29): src_assets_lottie_petak_ciprat, src_assets_lottie_petak_ketangkap, src_assets_lottie_petak_lolos, src_assets_lottie_petak_tutup, actorOf(), ranking(), MAP_INFO, POSE_LABEL (+21 more)

### Community 51 - "BowlingBoard.tsx"
Cohesion: 0.05
Nodes (66): ref_assets_sport_models_bowling_glb_url, ref_assets_sport_models_bowling_lm_webp_url, ref_assets_sport_models_bowling_props_glb_url, src_assets_lottie_sport_gutter, src_assets_lottie_sport_spare, src_assets_lottie_sport_strike, cuesFor(), SoundCue (+58 more)

### Community 52 - "kart_world.py"
Cohesion: 0.20
Nodes (24): ball(), box(), camar(), cyl(), dermaga(), finish(), last(), mercusuar() (+16 more)

### Community 53 - "domino.py"
Cohesion: 0.16
Nodes (30): bevel(), bone_pile(), bone_sprite(), chain(), chip(), chip_sprite(), chip_stack(), coffee() (+22 more)

### Community 54 - "kart.py"
Cohesion: 0.12
Nodes (41): attach(), ball(), bevel(), body_bajaj(), body_bebek(), body_gerobak(), box(), cone_() (+33 more)

### Community 55 - "chain.ts"
Cohesion: 0.14
Nodes (23): chainEngine(), finish(), HAND_SIZE, lowest(), opener(), round5(), evaluateQiu(), pairValue() (+15 more)

### Community 56 - "track.ts"
Cohesion: 0.09
Nodes (24): anchors(), bridgeSamples(), groundOf(), GroundShape, smooth(), WATER_Y, Fence, Recipe (+16 more)

### Community 57 - "Seat"
Cohesion: 0.16
Nodes (12): Chunk, CHUNK_BYTES, CHUNK_GAP_MS, fromBase64(), Incoming, join(), Need, PaintSync (+4 more)

### Community 58 - "ludo/engine.ts"
Cohesion: 0.20
Nodes (22): BOOST, SLIP, applyMove(), canExit(), capture(), doneAll(), Draft, emit() (+14 more)

### Community 59 - "emote.py"
Cohesion: 0.18
Nodes (33): arc(), ball(), beat(), blush(), box(), drop(), head(), heart_points() (+25 more)

### Community 60 - "monopoly/types.ts"
Cohesion: 0.12
Nodes (17): AIRPORTS, GROUPS, UTILITIES, Auction, Debt, GO_SALARY, Group, JAIL (+9 more)

### Community 61 - "snakes/engine.ts"
Cohesion: 0.06
Nodes (67): nextRand(), shuffle(), cellOf(), EFFECTS, int(), makeBoard(), BEFORE_ROLL, snakesBot() (+59 more)

### Community 62 - "UnoTable.tsx"
Cohesion: 0.06
Nodes (90): src_assets_lottie_burst, terrazzo(), UnoDemo(), CardBack, CardFace, COLOR_NAME, cornerText(), DARK_SIDE (+82 more)

### Community 63 - "kart/render/world.ts"
Cohesion: 0.08
Nodes (70): alamSide(), banner(), batch(), cornerMarks(), crossings(), eachSide(), fascia(), gantry() (+62 more)

### Community 64 - "bigtwo.ts"
Cohesion: 0.18
Nodes (15): cardLabel(), bigtwo, bigTwoPenalty(), btRank(), btValue(), comboOf(), FIVE_ORDER, SUIT_V (+7 more)

### Community 65 - "Race"
Cohesion: 0.09
Nodes (9): r2(), Race, recipeOf(), Skids, World, driftLevel(), Kart, KartState (+1 more)

### Community 67 - "spy.py"
Cohesion: 0.17
Nodes (38): attach(), ball(), bean(), bevel(), box(), card(), card_back(), card_word() (+30 more)

### Community 68 - "SpyBoard.tsx"
Cohesion: 0.09
Nodes (38): src_assets_lottie_spy_caught, src_assets_lottie_spy_escape, src_assets_lottie_spy_guess, src_assets_lottie_spy_reveal, src_assets_lottie_spy_stamp, canSpyGuess(), canVoteFor(), clueProblem() (+30 more)

### Community 69 - "ludo/types.ts"
Cohesion: 0.18
Nodes (15): ludo, LudoAction, LudoOptions, LudoState, Move, Note, Prog, Special (+7 more)

### Community 70 - "domino/bot.ts"
Cohesion: 0.25
Nodes (18): chainAction(), chainValue(), dominoBot(), placed(), qiuAction(), qiuPower(), canPass(), chainPlayable() (+10 more)

### Community 72 - "models.ts"
Cohesion: 0.07
Nodes (35): ball(), BODY_FALLBACK, box(), build(), cache, clearModels(), compactCache, compactClone() (+27 more)

### Community 73 - "pathlib"
Cohesion: 0.11
Nodes (19): numpy, pathlib, isi_peti(), bahan yang menyembul dari peti; titik tengah dibiarkan rendah supaya barang…, es_tex(), es biru pucat dengan retakan putih dan gelembung, isi_umum(), pola() (+11 more)

### Community 74 - "domino/types.ts"
Cohesion: 0.14
Nodes (29): DominoDemo(), candidates(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver() (+21 more)

### Community 75 - "math"
Cohesion: 0.04
Nodes (46): colorsys, contextlib, math, random, lentera(), Kit, roda torus; `jari` = jumlah jari-jari; `at` = titik tengah, gerobak kaki lima: lemari kaca, panci, payung, dan roda jari-jari (+38 more)

### Community 76 - "render/scene.ts"
Cohesion: 0.08
Nodes (21): ref_assets_masak_models_props_glb_url, ref_assets_sport_tex_langit_siang_hdr_url, Particles, Tier, DISH_OF, ING, Layout, foodMesh() (+13 more)

### Community 77 - "qiuqiu.ts"
Cohesion: 0.23
Nodes (15): after(), canAct(), CAT_RANK, compareQiu(), live(), nextStreet(), qiuPot(), roundDone() (+7 more)

### Community 78 - "vitest"
Cohesion: 0.08
Nodes (39): vitest, LM, Pt, seen(), torsoLength(), torsoVisible(), BowGesture, BowRead (+31 more)

### Community 79 - "bots.test.ts"
Cohesion: 0.11
Nodes (20): BY_CATEGORY, CATEGORY_WORDS, GENERAL_WORDS, after(), Any, bomHost(), boxingHost(), cardCases (+12 more)

### Community 80 - "ludo/engine.test.ts"
Cohesion: 0.33
Nodes (9): armsFor(), minArms(), defaultOptions(), init(), teamsAllowed(), base(), roll(), withDie() (+1 more)

### Community 81 - "mathutils"
Cohesion: 0.19
Nodes (8): bpy, mathutils, bounds(), convert(), reset(), import_obj(), normalize(), Path

### Community 82 - "racket/scene.ts"
Cohesion: 0.04
Nodes (84): ref_assets_sport_models_archery_glb_url, ref_assets_sport_models_archery_lm_webp_url, ref_assets_sport_models_boxing_glb_url, ref_assets_sport_models_boxing_lm_webp_url, ref_assets_sport_models_chibi_glb_url, ref_assets_sport_models_court_glb_url, ref_assets_sport_models_court_lm_webp_url, ref_assets_sport_models_hall_glb_url (+76 more)

### Community 83 - "dialog.tsx"
Cohesion: 0.15
Nodes (3): class-variance-authority, Button(), buttonVariants

### Community 84 - "masak/sim/bots.ts"
Cohesion: 0.17
Nodes (32): code(), finalCode(), layoutOf(), nextStep(), itemKey(), dist(), frontOf(), moveCook() (+24 more)

### Community 85 - "registry.ts"
Cohesion: 0.07
Nodes (27): src_assets_bom_tile_bom, src_assets_domino_tile_domino, src_assets_draw_tile_draw, src_assets_ludo_tile_ludo, src_assets_monopoly_tile_monopoly, src_assets_petak_tile_petak, src_assets_remi_tile_remi, src_assets_snakes_tile_snakes (+19 more)

### Community 87 - "maps.ts"
Cohesion: 0.17
Nodes (11): src_assets_petak_maps_dapur, src_assets_petak_maps_gang, src_assets_petak_maps_kapal, src_assets_petak_maps_kota, src_assets_petak_maps_museum, src_assets_petak_maps_pabrik, src_assets_petak_maps_pasar, src_assets_petak_maps_stasiun (+3 more)

### Community 89 - "MasakBoard.tsx"
Cohesion: 0.07
Nodes (43): HoldButton(), Joystick(), LoadingScreen(), actorOf(), defaultOptions(), init(), MAX_COOKS, MAX_PLAYERS (+35 more)

### Community 91 - "DrawBoard.tsx"
Cohesion: 0.04
Nodes (95): src_assets_lottie_draw_close, src_assets_lottie_draw_correct, src_assets_lottie_draw_pick, src_assets_lottie_draw_reveal, src_assets_lottie_draw_timeup, drawBot(), guess(), Plan (+87 more)

### Community 92 - "petak/round.ts"
Cohesion: 0.07
Nodes (54): w, map, nav, rows, SIZE, Spot, BOT_SHARP, Pose (+46 more)

### Community 94 - "PaintSurface"
Cohesion: 0.20
Nodes (3): PaintSurface, projectPaint(), target()

### Community 95 - "spy/bot.ts"
Cohesion: 0.24
Nodes (13): cluePool(), decide(), deduce(), hits(), pickClue(), same(), spyBot(), suspicion() (+5 more)

### Community 96 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, @capacitor/cli, oxlint, @types/node, @types/react, @types/react-dom, @types/three, typescript (+3 more)

### Community 97 - "games/types.ts"
Cohesion: 0.05
Nodes (69): gsap, @gsap/react, lottie-react, radix-ui, react, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_card_pop (+61 more)

### Community 103 - "spy/engine.ts"
Cohesion: 0.07
Nodes (61): SpyDemo(), CLUES, randomStep(), afterOut(), aliveSeats(), BAD, bump(), CLUE_MAX (+53 more)

### Community 105 - "Sheets.tsx"
Cohesion: 0.19
Nodes (25): groupOf(), ownable(), completes(), decide(), monopolyBot(), pick(), priceOf(), proposal() (+17 more)

### Community 107 - "capture.mjs"
Cohesion: 0.25
Nodes (6): chrome, pending, profile, send(), [url, out, w = '390', h = '844', scale = '2', wait = '0', script = ''], ws

### Community 108 - "domino/ui/art.ts"
Cohesion: 0.40
Nodes (5): modeArt(), sprite(), SPRITES, Chips(), QiuCenter()

### Community 109 - "Map"
Cohesion: 0.05
Nodes (22): Map, material beralpha dari larik tinggi × lebar × 4; nama `decal_*` membuat shader…, tempelan: axis 'z' = di lantai, 'x'/'y' = di dinding sepanjang sumbu itu,…, model Poly Haven: digabung, poligon disusutkan, tekstur diperkecil; disimpan…, salinan model scan. `height`/`width` menyamakan tinggi atau sisi terpanjang;…, serakan kecil: satu model disalin ke banyak titik, jadi satu objek `detail_*`…, material dari larik gambar buatan sendiri (tinggi × lebar × 3, nilai 0..1 sRGB), benda yang dibuat di dalam blok ini bergerak saat main: tidak ikut lightmap,… (+14 more)

### Community 110 - "sport/types.ts"
Cohesion: 0.05
Nodes (88): src_assets_lottie_sport_ko, sportBot(), init(), initMatch(), reduce(), reduceMatch(), start(), initArchery() (+80 more)

### Community 111 - "kitchens.ts"
Cohesion: 0.11
Nodes (19): out, AFTER, cache, CELL, COUNTER_TOP, Dish, finalState(), FoodState (+11 more)

### Community 112 - "petak/engine.ts"
Cohesion: 0.12
Nodes (26): BODY_SCALE, defaultOptions(), finishHunt(), freeHiders(), init(), isSeeker(), MAX_ACTORS, MAX_PLAYERS (+18 more)

### Community 113 - "Demo.tsx"
Cohesion: 0.07
Nodes (44): src_assets_lottie_sport_ace, src_assets_lottie_sport_goal, useMusic(), NAMES, SportDemo(), KartBoard(), MasakBoard(), PetakBoard() (+36 more)

### Community 114 - "sport_chars.py"
Cohesion: 0.11
Nodes (38): acc_1(), acc_2(), acc_3(), action(), animate(), attach(), bake(), bow() (+30 more)

### Community 115 - "masak-trace.mts"
Cohesion: 0.18
Nodes (12): ids, secs, bots, id, k, L, n, secs (+4 more)

### Community 117 - "petak/render/world.ts"
Cohesion: 0.09
Nodes (20): mapData, ASSETS, clothShader(), cloudShade(), edgeA, edgeB, extend(), GRADE (+12 more)

### Community 118 - "build.py"
Cohesion: 0.10
Nodes (37): ndarray, bom_music(), domino_music(), draw_music(), _env(), ff(), kart_music(), kart_synth() (+29 more)

### Community 119 - "Painter"
Cohesion: 0.07
Nodes (23): ref_assets_petak_models_bunglon_glb_url, Body, loadBody(), loader, solidPaint(), Dab, DECODE_GLSL, decodePaint() (+15 more)

### Community 120 - "ArcheryBoard.tsx"
Cohesion: 0.09
Nodes (27): src_assets_lottie_sport_bullseye, arc(), shoot(), botShot(), noise(), WIND_READ, WOBBLE, ARROWS (+19 more)

### Community 121 - "Round"
Cohesion: 0.11
Nodes (4): hiders(), Mover, r2(), Round

### Community 122 - "spy/ui/art.ts"
Cohesion: 0.33
Nodes (5): PAPER, ROLE_ALT, ROLE_SPRITE, SEAT_HEX, SPRITES

### Community 123 - "life.ts"
Cohesion: 0.09
Nodes (18): ref_assets_petak_models_ayam_glb_url, ref_assets_petak_models_kucing_glb_url, ref_assets_petak_models_merpati_glb_url, ref_assets_petak_models_warga_glb_url, MapInfo, Bird, Flock, fly (+10 more)

### Community 124 - "Chibi"
Cohesion: 0.11
Nodes (7): Chibi, addRim(), RacketScene, Look, RacketShot, RacketSport, RacketBoard()

### Community 125 - "petak_gang.py"
Cohesion: 0.08
Nodes (16): fasad(), gerobak(), house(), frame(), jendela(), pintu(), jemuran(), motor() (+8 more)

### Community 127 - "Stage"
Cohesion: 0.18
Nodes (5): Stage, BoxingScene, BoxingBoard(), CharacterMaker(), useSceneStage()

### Community 129 - "ludo/bot.ts"
Cohesion: 0.38
Nodes (11): finishOf(), isSafe(), specialAt(), trackIndex(), trackLen(), botAction(), ludoBot(), score() (+3 more)

### Community 130 - "kart_lib.py"
Cohesion: 0.33
Nodes (7): bev(), clear(), export(), to_meshes(), bunglon(), ember(), scene_tile()

### Community 131 - "export.py"
Cohesion: 0.14
Nodes (13): datetime, json, pil, main(), Satukan frame stiker emote (brand/illustrations/emote/frames) jadi WebP animasi…, union_box(), main(), Ekspor render Blender per game (brand/illustrations/<game>/*.png) ke WebP untuk… (+5 more)

### Community 132 - "abort"
Cohesion: 0.12
Nodes (18): abort(), assert(), assignWasmExports(), createWasm(), receiveInstance(), receiveInstantiationResult(), findWasmBinary(), forceLoadFile() (+10 more)

### Community 133 - "petak_body.py"
Cohesion: 0.20
Nodes (16): bmesh, action(), animate(), build_pupils(), build_rig(), build_skin(), key(), main() (+8 more)

### Community 134 - "petak_life.py"
Cohesion: 0.27
Nodes (14): action(), ayam(), bind(), key(), kucing(), merpati(), warga: satu kulit tanpa sambungan, baju dan celana dibagi dari wilayah badan,…, ayam kampung: badan bulat, jengger, ekor tegak; klip jalan dan mematuk (+6 more)

### Community 136 - "Round"
Cohesion: 0.18
Nodes (3): Round, prank(), slip()

### Community 137 - "monopoly/engine.test.ts"
Cohesion: 0.27
Nodes (10): botAction(), randomStep(), defaultOptions(), init(), base(), simulate(), withDice(), MonopolyAction (+2 more)

### Community 138 - "petak-perf.mjs"
Cohesion: 0.24
Nodes (10): chrome, errors, js(), maps, pending, profile, ready(), send() (+2 more)

### Community 140 - "petak-probe.mts"
Cohesion: 0.20
Nodes (7): @supabase/supabase-js, a, b, env, rx, seen, tx

### Community 141 - "createLazyFile"
Cohesion: 0.31
Nodes (7): createLazyFile(), stream_ops, writeChunks(), get_char(), mmap(), position(), read()

### Community 143 - "petak-duo.mjs"
Cohesion: 0.38
Nodes (6): ref_node_os, chrome, page(), profile, sleep(), until()

### Community 144 - "makeEntry"
Cohesion: 0.33
Nodes (6): makeBufferEntry(), makeEntries(), makeEntry(), makeSamplerEntry(), makeStorageTextureEntry(), makeTextureEntry()

### Community 147 - "makeBlendState"
Cohesion: 0.40
Nodes (5): makeBlendComponent(), makeBlendState(), makeColorState(), makeColorStates(), makeFragmentState()

### Community 148 - "makeVertexAttributes"
Cohesion: 0.40
Nodes (5): makeVertexAttribute(), makeVertexAttributes(), makeVertexBuffer(), makeVertexBuffers(), makeVertexState()

### Community 150 - "requestFullscreen"
Cohesion: 0.50
Nodes (4): getFullscreenElement(), requestFullscreen(), fullscreenChange(), updateCanvasDimensions()

### Community 151 - "run"
Cohesion: 0.50
Nodes (4): initRuntime(), postRun(), preRun(), run()

### Community 152 - "___syscall_ioctl"
Cohesion: 0.50
Nodes (4): ioctl_tcgets(), ioctl_tcsets(), ioctl_tiocgwinsz(), ___syscall_ioctl()

### Community 153 - "makeColorAttachments"
Cohesion: 0.50
Nodes (4): makeColorAttachment(), makeColorAttachments(), makeDepthStencilAttachment(), makeRenderPassDescriptor()

### Community 154 - "close"
Cohesion: 0.67
Nodes (3): close(), fsync(), notifyListeners()

### Community 155 - "write"
Cohesion: 0.67
Nodes (3): msync(), put_char(), write()

### Community 156 - "syncfs"
Cohesion: 1.00
Nodes (3): syncfs(), doCallback(), done()

### Community 180 - "App.tsx"
Cohesion: 0.05
Nodes (51): @capacitor/core, @hugeicons/core-free-icons, @hugeicons/react, App(), BOT_LEVELS, BotPanel(), floor, Home() (+43 more)

### Community 184 - "useRoom.ts"
Cohesion: 0.09
Nodes (31): Room(), useRoomToasts(), entryById(), gameById(), applyAction(), BOT_NAMES, MAX_ROOM, Pick (+23 more)

### Community 185 - "vite.config.ts"
Cohesion: 0.33
Nodes (5): ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, pkg

### Community 186 - "bom/engine.ts"
Cohesion: 0.09
Nodes (56): bankFor(), bomBot(), pickWord(), fakeWord(), randomStep(), STEMS, aliveSeats(), BOOM_SECONDS (+48 more)

### Community 190 - "masak/round.ts"
Cohesion: 0.12
Nodes (14): HAT_POS, Op, Pose, r2(), Remote, RoundOptions, Wire, Bot (+6 more)

### Community 193 - "monopoly/ui/copy.ts"
Cohesion: 0.18
Nodes (18): squareName(), Card, CardFx, CARDS, DECK_TITLE, Deck, eventText(), money() (+10 more)

### Community 197 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, apk, build, dev, lint, preview, release, test

## Knowledge Gaps
- **655 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+650 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1575 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Seat` connect `Seat` to `remi/cards.ts`, `LudoBoard.tsx`, `Round`, `MonopolyBoard.tsx`, `remi/types.ts`, `poker.ts`, `KartBoard.tsx`, `race.ts`, `DominoTable.tsx`, `kart/engine.ts`, `BomBoard.tsx`, `remi/bot.ts`, `monopoly/engine.ts`, `RemiTable.tsx`, `remi/ui/copy.ts`, `blackjack.ts`, `BowlingBoard.tsx`, `chain.ts`, `useRoom.ts`, `ludo/engine.ts`, `bom/engine.ts`, `monopoly/types.ts`, `snakes/engine.ts`, `masak/round.ts`, `UnoTable.tsx`, `monopoly/ui/copy.ts`, `SpyBoard.tsx`, `ludo/types.ts`, `domino/bot.ts`, `domino/types.ts`, `qiuqiu.ts`, `MasakBoard.tsx`, `DrawBoard.tsx`, `petak/round.ts`, `spy/bot.ts`, `games/types.ts`, `spy/engine.ts`, `Sheets.tsx`, `sport/types.ts`, `petak/engine.ts`, `Painter`, `ArcheryBoard.tsx`, `Round`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `react` connect `games/types.ts` to `package.json`, `LudoBoard.tsx`, `monopoly/engine.test.ts`, `MonopolyBoard.tsx`, `remi/types.ts`, `KartBoard.tsx`, `DominoTable.tsx`, `kart/engine.ts`, `BomBoard.tsx`, `RemiTable.tsx`, `remi/ui/copy.ts`, `BowlCamera.tsx`, `PetakBoard.tsx`, `BowlingBoard.tsx`, `App.tsx`, `useRoom.ts`, `bom/engine.ts`, `snakes/engine.ts`, `UnoTable.tsx`, `SpyBoard.tsx`, `ludo/types.ts`, `domino/types.ts`, `racket/scene.ts`, `dialog.tsx`, `registry.ts`, `MasakBoard.tsx`, `DrawBoard.tsx`, `spy/engine.ts`, `Sheets.tsx`, `sport/types.ts`, `petak/engine.ts`, `Demo.tsx`, `ArcheryBoard.tsx`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `SnakesBoard()` connect `lottie.mjs` to `games/types.ts`, `RemiTable.tsx`, `Demo.tsx`, `snakes/engine.ts`, `UnoTable.tsx`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _655 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pbr` be split into smaller, more focused modules?**
  _Cohesion score 0.07049180327868852 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `remi/cards.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09292929292929293 - nodes in this community are weakly interconnected._