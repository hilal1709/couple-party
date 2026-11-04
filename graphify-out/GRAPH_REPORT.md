# Graph Report - masak  (2026-11-05)

## Corpus Check
- 700 files · ~2,816,668 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 175 file(s) not represented in the graph (top: .glb 162, (none) 3, .hdr 3)

## Summary
- 4957 nodes · 14554 edges · 201 communities (157 shown, 44 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 300 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7a015da1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- sphere
- package.json
- remi/types.ts
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
- remi/engine.ts
- poker.ts
- ludo.py
- KartBoard.tsx
- bom.py
- ludo/board.ts
- pbr
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
- UnoTable.tsx
- PetakBoard.tsx
- BowlingBoard.tsx
- kart_world.py
- domino.py
- kart.py
- chain.ts
- three
- Seat
- ludo/engine.ts
- emote.py
- monopoly/types.ts
- SnakesBoard.tsx
- uno/engine.ts
- kart/render/world.ts
- bigtwo.ts
- Race
- system_io
- spy.py
- SpyBoard.tsx
- ludo/types.ts
- games/types.ts
- system_linq
- models.ts
- Dapur
- domino/engine.ts
- pathlib
- render/scene.ts
- qiuqiu.ts
- PenaltyBoard.tsx
- bots.test.ts
- ludo/ui/Lobby.tsx
- mathutils
- racket/scene.ts
- uno/types.ts
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
- painter.ts
- spy/bot.ts
- tube
- utils.ts
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
- squiggles
- Map
- sport/types.ts
- kitchens.ts
- petak/engine.ts
- react
- sport_chars.py
- masak/round.ts
- system
- petak/render/world.ts
- build.py
- Painter
- sport/engine.ts
- Round
- bom/types.ts
- life.ts
- RacketScene
- petak_gang.py
- draw/engine.ts
- Stage
- remi/cards.ts
- Demo.tsx
- draw.py
- export.py
- abort
- petak_body.py
- petak_life.py
- ExceptionInfo
- Round
- monopoly/engine.test.ts
- petak-perf.mjs
- Kit
- petak-probe.mts
- createLazyFile
- spy/ui/Lobby.tsx
- petak-duo.mjs
- makeEntry
- bom/engine.test.ts
- init
- makeBlendState
- makeVertexAttributes
- draw/types.ts
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
- nav.ts
- UpdateBanner.tsx
- draw/bot.ts
- Particles
- shutil
- App.tsx
- vite.config.ts
- bom/engine.ts
- snakes/engine.ts
- spy/engine.test.ts
- snakes/types.ts
- audio.ts
- sport/ui/Lobby.tsx
- snakes/bot.ts
- monopoly/ui/copy.ts
- spy/types.ts
- draw/ui/art.ts
- ArcheryScene
- petak_kota.py
- bom/bot.ts
- snakes/ui/copy.ts
- dagangan

## God Nodes (most connected - your core abstractions)
1. `Seat` - 99 edges
2. `add()` - 94 edges
3. `pbr()` - 93 edges
4. `react` - 87 edges
5. `cyl()` - 77 edges
6. `st()` - 74 edges
7. `mat()` - 66 edges
8. `anim()` - 66 edges
9. `sphere()` - 65 edges
10. `layer()` - 65 edges

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

## Communities (201 total, 44 thin omitted)

### Community 0 - "sphere"
Cohesion: 0.08
Nodes (38): orang_orangan(), Orang-orangan sawah: tiang, baju kotak-kotak, topi caping, wajah karung…, fan(), istana_pasir(), item_box(), kelapa_ayun(), kerang(), magnet() (+30 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (39): config, devDependencies, @capacitor/cli, oxlint, @types/node, @types/react, @types/react-dom, @types/three (+31 more)

### Community 2 - "remi/types.ts"
Cohesion: 0.10
Nodes (34): cangkulan(), deal(), highAce(), bohong, advance(), cangkulan, cangkulPlayable(), mustDig() (+26 more)

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
Cohesion: 0.09
Nodes (32): src_assets_lottie_ludo_bomb, src_assets_lottie_ludo_boost, src_assets_lottie_ludo_capture, src_assets_lottie_ludo_home, src_assets_lottie_ludo_portal, src_assets_lottie_ludo_six, src_assets_lottie_ludo_slip, src_assets_ludo_ludo_lose (+24 more)

### Community 7 - "add"
Cohesion: 0.12
Nodes (50): bean(), add(), cheek(), cone(), crown(), eye(), ink_lines(), mat() (+42 more)

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
Cohesion: 0.11
Nodes (27): src_assets_lottie_monopoly_bankrupt, src_assets_lottie_monopoly_build, src_assets_lottie_monopoly_card, src_assets_lottie_monopoly_jackpot, src_assets_lottie_monopoly_jail, src_assets_lottie_monopoly_rent, src_assets_lottie_monopoly_sold, src_assets_monopoly_monopoly_lose (+19 more)

### Community 23 - "remi/engine.ts"
Cohesion: 0.17
Nodes (22): candidates(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce() (+14 more)

### Community 25 - "poker.ts"
Cohesion: 0.26
Nodes (14): nextWhere(), after(), BOARD_AT, canAct(), compareScores(), evaluate(), HAND_NAMES, straightHigh() (+6 more)

### Community 26 - "ludo.py"
Cohesion: 0.19
Nodes (28): no_lines(), ball(), bevel(), box(), cone_(), cyl(), die(), face() (+20 more)

### Community 27 - "KartBoard.tsx"
Cohesion: 0.07
Nodes (41): src_assets_lottie_kart_boost, src_assets_lottie_kart_box, src_assets_lottie_kart_finish, src_assets_lottie_kart_hit, src_assets_lottie_kart_lap, statsFor(), racerOf(), standings() (+33 more)

### Community 28 - "bom.py"
Cohesion: 0.16
Nodes (37): attach(), ball(), bevel(), big_eye(), bom_lose(), bom_win(), bomb(), boomerang() (+29 more)

### Community 29 - "ludo/board.ts"
Cohesion: 0.14
Nodes (28): apothem(), armAngle(), BOOST, cellPt(), circumR(), homePt(), innerR(), R0 (+20 more)

### Community 30 - "pbr"
Cohesion: 0.08
Nodes (50): akar_ayun(), arca(), batu_api(), batu_jatuh(), bola_api(), bola_permen(), bola_salju(), bus() (+42 more)

### Community 31 - "race.ts"
Cohesion: 0.05
Nodes (56): Stats, Controls, GRADE, Hud, Opts, Pose, Remote, SANITIZE (+48 more)

### Community 32 - "cube"
Cohesion: 0.10
Nodes (50): cube(), text3d(), arena(), bake_lightmap(), build_archery(), build_bowling(), build_boxing(), build_court() (+42 more)

### Community 33 - "release.mjs"
Cohesion: 0.20
Nodes (6): ref_node_child_process, ref_node_fs, { version }, [bump = 'patch', ...noteParts], [ma, mi, pa], pkg

### Community 34 - "DominoTable.tsx"
Cohesion: 0.10
Nodes (36): src_assets_lottie_domino_blocked, src_assets_lottie_domino_chips, src_assets_lottie_domino_deal, src_assets_lottie_domino_score, src_assets_lottie_domino_slam, src_assets_lottie_domino_special, DominoDemo(), chainAction() (+28 more)

### Community 35 - "kart/engine.ts"
Cohesion: 0.08
Nodes (46): BODIES, BODY_IDS, CHARACTERS, CUPS, ITEM_INFO, LEVEL_INFO, MAX_RACERS, ODDS (+38 more)

### Community 36 - "BomBoard.tsx"
Cohesion: 0.10
Nodes (37): src_assets_lottie_bom_boom, src_assets_lottie_bom_cancel, src_assets_lottie_bom_pass, src_assets_lottie_bom_power, src_assets_lottie_bom_spark, dots(), fuseRange(), promptText() (+29 more)

### Community 37 - "petak_pabrik.py"
Cohesion: 0.12
Nodes (10): ban(), garis(), gigi(), roda gigi menempel dinding; axis 'y' = menghadap sumbu y Blender, garis miring dua warna, berulang mulus, karet ban berjalan dengan permen tergambar di atasnya; digeser di shader, sirup menggenang: bercak merah muda mengilap, permen tongkat berkait di puncak (+2 more)

### Community 38 - "remi/bot.ts"
Cohesion: 0.12
Nodes (32): best(), pickOne(), bigTwo(), blackjack(), bohong(), CATEGORY_POWER, decide(), holePower() (+24 more)

### Community 39 - "monopoly/ui/art.tsx"
Cohesion: 0.16
Nodes (17): CODE, Buildings(), C, cellBox(), CORNER, Die(), label, parts() (+9 more)

### Community 40 - "monopoly/engine.ts"
Cohesion: 0.24
Nodes (21): nextOf(), advanceAuction(), afterMove(), alive(), charge(), Ctx, drawCard(), finish() (+13 more)

### Community 41 - "RemiTable.tsx"
Cohesion: 0.13
Nodes (20): src_assets_lottie_remi_bomb, src_assets_lottie_remi_bust, src_assets_lottie_remi_chips, src_assets_lottie_remi_deal, src_assets_lottie_remi_joker, src_assets_lottie_remi_liar, Effect, effectFor() (+12 more)

### Community 42 - "kitchen.ts"
Cohesion: 0.10
Nodes (34): advance(), BAKE_MS, BELT_MS, BURN_MS, CHOP_MS, COOK_MS, DOUSE_MS, Ext (+26 more)

### Community 43 - "emotes.ts"
Cohesion: 0.08
Nodes (28): src_assets_emote_kaget, src_assets_emote_kaget_anim, src_assets_emote_keren, src_assets_emote_keren_anim, src_assets_emote_naksir, src_assets_emote_naksir_anim, src_assets_emote_nangis, src_assets_emote_nangis_anim (+20 more)

### Community 44 - "remi/ui/copy.ts"
Cohesion: 0.12
Nodes (33): rankLabel(), sortHand(), SUIT_NAME, suitIndex(), BjResult, SEAT_HEX, sprite(), SPRITES (+25 more)

### Community 45 - "masak_props.py"
Cohesion: 0.05
Nodes (55): ball(), banana_peel(), banana_slices(), batter_bowl(), bowl(), bun_top(), chef_hat(), cucumber() (+47 more)

### Community 46 - "remi.py"
Cohesion: 0.15
Nodes (35): bevel(), card(), chip(), chip_sprite(), chip_stack(), circle_outline(), dealer_btn(), deck_sprite() (+27 more)

### Community 47 - "BowlCamera.tsx"
Cohesion: 0.13
Nodes (15): @mediapipe/tasks-vision, src_assets_lottie_sport_swing, closeCamera(), Delegate, loadModel(), openCamera(), PoseFrame, PoseTracker (+7 more)

### Community 48 - "kart_world2.py"
Cohesion: 0.09
Nodes (22): bendera_rp(), candi(), gapura_candi(), jamur_raksasa(), jembatan_layang(), kuil_obsidian(), legs_and_beam(), menara_pengawas() (+14 more)

### Community 49 - "UnoTable.tsx"
Cohesion: 0.09
Nodes (35): src_assets_lottie_burst, Banner(), hatch(), svgUrl(), terrazzo(), KartBoard(), Hand(), ItemButton() (+27 more)

### Community 50 - "PetakBoard.tsx"
Cohesion: 0.08
Nodes (24): src_assets_lottie_petak_ciprat, src_assets_lottie_petak_ketangkap, src_assets_lottie_petak_lolos, src_assets_lottie_petak_tutup, ConfirmModal(), actorOf(), ranking(), POSE_LABEL (+16 more)

### Community 51 - "BowlingBoard.tsx"
Cohesion: 0.05
Nodes (59): ref_assets_sport_models_bowling_glb_url, ref_assets_sport_models_bowling_lm_webp_url, ref_assets_sport_models_bowling_props_glb_url, src_assets_lottie_sport_gutter, src_assets_lottie_sport_spare, src_assets_lottie_sport_strike, cuesFor(), SoundCue (+51 more)

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
Cohesion: 0.17
Nodes (21): chainEngine(), endCount(), finish(), HAND_SIZE, lowest(), opener(), round5(), evaluateQiu() (+13 more)

### Community 56 - "three"
Cohesion: 0.09
Nodes (26): three, anchors(), bridgeSamples(), groundOf(), GroundShape, smooth(), WATER_Y, Fence (+18 more)

### Community 57 - "Seat"
Cohesion: 0.16
Nodes (12): Chunk, CHUNK_BYTES, CHUNK_GAP_MS, fromBase64(), Incoming, join(), Need, PaintSync (+4 more)

### Community 58 - "ludo/engine.ts"
Cohesion: 0.18
Nodes (29): finishOf(), isSafe(), trackIndex(), trackLen(), score(), threats(), applyMove(), canExit() (+21 more)

### Community 59 - "emote.py"
Cohesion: 0.18
Nodes (33): arc(), ball(), beat(), blush(), box(), drop(), head(), heart_points() (+25 more)

### Community 60 - "monopoly/types.ts"
Cohesion: 0.09
Nodes (26): AIRPORTS, BOARD, GROUP_HEX, GROUP_NAME, GROUPS, UTILITIES, Card, CardFx (+18 more)

### Community 61 - "SnakesBoard.tsx"
Cohesion: 0.09
Nodes (29): src_assets_lottie_card_pop, src_assets_lottie_dice_roll, src_assets_lottie_item_pop, src_assets_lottie_ladder_up, src_assets_lottie_snake_bite, src_assets_snakes_snakes_lose, src_assets_snakes_snakes_win, cellOf() (+21 more)

### Community 62 - "uno/engine.ts"
Cohesion: 0.17
Nodes (36): decide(), favoriteColor(), playCard(), score(), unoBot(), canPlay(), cardPoints(), checkMercy() (+28 more)

### Community 63 - "kart/render/world.ts"
Cohesion: 0.08
Nodes (72): alamSide(), banner(), batch(), cornerMarks(), crossings(), eachSide(), fascia(), gantry() (+64 more)

### Community 64 - "bigtwo.ts"
Cohesion: 0.18
Nodes (17): bigTwoPlays(), cardLabel(), beats(), bigtwo, bigTwoPenalty(), btRank(), btValue(), comboOf() (+9 more)

### Community 65 - "Race"
Cohesion: 0.09
Nodes (9): r2(), Race, KartRig, Quality, World, driftLevel(), hitKart(), isShielded() (+1 more)

### Community 67 - "spy.py"
Cohesion: 0.17
Nodes (38): attach(), ball(), bean(), bevel(), box(), card(), card_back(), card_word() (+30 more)

### Community 68 - "SpyBoard.tsx"
Cohesion: 0.09
Nodes (36): src_assets_lottie_spy_caught, src_assets_lottie_spy_escape, src_assets_lottie_spy_guess, src_assets_lottie_spy_reveal, src_assets_lottie_spy_stamp, clueProblem(), guesser(), Role (+28 more)

### Community 69 - "ludo/types.ts"
Cohesion: 0.23
Nodes (13): botAction(), ludoBot(), LudoAction, LudoOptions, LudoState, Move, Note, Special (+5 more)

### Community 70 - "games/types.ts"
Cohesion: 0.15
Nodes (22): Bet, betAction(), BetSpot, chainValue(), dominoBot(), placed(), qiuAction(), qiuPower() (+14 more)

### Community 72 - "models.ts"
Cohesion: 0.10
Nodes (26): ball(), BODY_FALLBACK, box(), build(), cache, clearModels(), compactCache, compactClone() (+18 more)

### Community 73 - "Dapur"
Cohesion: 0.15
Nodes (10): Dapur, lemari + peti kayu terbuka berisi bahan, loket saji: meja berwarna + rak atas berlampu hangat, oven pizza: lemari bata, lantai batu, kubah bata di separuh belakang dengan…, sabuk berjalan: rangka baja rendah, karet gelap di atas (tekstur bergeser di…, loket berlift: rana gulung di atas loket turun saat lift turun (bergerak di…, lantai ubin, dinding belakang & samping. Sisi depan terbuka untuk kamera.…, `theme` = nama material per bagian; diisi skrip tiap dapur (+2 more)

### Community 74 - "domino/engine.ts"
Cohesion: 0.16
Nodes (23): candidates(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce() (+15 more)

### Community 75 - "pathlib"
Cohesion: 0.06
Nodes (43): colorsys, contextlib, math, numpy, pathlib, random, isi_peti(), pola() (+35 more)

### Community 76 - "render/scene.ts"
Cohesion: 0.09
Nodes (21): ref_assets_masak_models_props_glb_url, ref_assets_sport_tex_langit_siang_hdr_url, DISH_OF, ING, Layout, foodMesh(), itemKey(), KitchenScene (+13 more)

### Community 77 - "qiuqiu.ts"
Cohesion: 0.19
Nodes (18): after(), canAct(), CAT_RANK, compareQiu(), live(), nextStreet(), qiuEngine(), qiuPot() (+10 more)

### Community 78 - "PenaltyBoard.tsx"
Cohesion: 0.07
Nodes (43): vitest, src_assets_lottie_sport_goal, LM, Pt, seen(), torsoLength(), torsoVisible(), BowGesture (+35 more)

### Community 79 - "bots.test.ts"
Cohesion: 0.12
Nodes (18): WORD_MAX, after(), Any, bomHost(), boxingHost(), cardCases, Case, cases (+10 more)

### Community 80 - "ludo/ui/Lobby.tsx"
Cohesion: 0.27
Nodes (11): armsFor(), minArms(), defaultOptions(), init(), teamsAllowed(), base(), Arms, OPTION_INFO (+3 more)

### Community 81 - "mathutils"
Cohesion: 0.19
Nodes (8): bpy, mathutils, bounds(), convert(), reset(), import_obj(), normalize(), Path

### Community 82 - "racket/scene.ts"
Cohesion: 0.04
Nodes (87): ref_assets_sport_models_archery_glb_url, ref_assets_sport_models_archery_lm_webp_url, ref_assets_sport_models_boxing_glb_url, ref_assets_sport_models_boxing_lm_webp_url, ref_assets_sport_models_chibi_glb_url, ref_assets_sport_models_court_glb_url, ref_assets_sport_models_court_lm_webp_url, ref_assets_sport_models_hall_glb_url (+79 more)

### Community 83 - "uno/types.ts"
Cohesion: 0.11
Nodes (30): react-dom, UnoDemo(), buildDeck(), classicFaces(), f(), flipDarkFaces(), flipLightFaces(), noMercyFaces() (+22 more)

### Community 84 - "masak/sim/bots.ts"
Cohesion: 0.14
Nodes (31): code(), finalCode(), layoutOf(), nextStep(), Bot, COOK_SPEED, dist(), frontOf() (+23 more)

### Community 85 - "registry.ts"
Cohesion: 0.06
Nodes (33): src_assets_bom_tile_bom, src_assets_domino_tile_domino, src_assets_draw_tile_draw, src_assets_ludo_tile_ludo, src_assets_masak_tile_masak, src_assets_monopoly_tile_monopoly, src_assets_petak_tile_petak, src_assets_remi_tile_remi (+25 more)

### Community 87 - "maps.ts"
Cohesion: 0.10
Nodes (22): src_assets_petak_maps_dapur, src_assets_petak_maps_gang, src_assets_petak_maps_kapal, src_assets_petak_maps_kota, src_assets_petak_maps_museum, src_assets_petak_maps_pabrik, src_assets_petak_maps_pasar, src_assets_petak_maps_stasiun (+14 more)

### Community 89 - "MasakBoard.tsx"
Cohesion: 0.06
Nodes (44): src_assets_lottie_masak_bintang, src_assets_lottie_masak_menang, src_assets_lottie_masak_saji, HoldButton(), Joystick(), actorOf(), defaultOptions(), init() (+36 more)

### Community 91 - "DrawBoard.tsx"
Cohesion: 0.11
Nodes (28): src_assets_lottie_draw_close, src_assets_lottie_draw_correct, src_assets_lottie_draw_pick, src_assets_lottie_draw_reveal, src_assets_lottie_draw_timeup, hintCount(), maskWord(), totalTurns() (+20 more)

### Community 92 - "petak/round.ts"
Cohesion: 0.09
Nodes (35): BODY_SCALE, Box, Spot, BOT_SHARP, Hud, Pose, Remote, REVEAL_EACH (+27 more)

### Community 94 - "painter.ts"
Cohesion: 0.09
Nodes (19): ref_assets_petak_models_bunglon_glb_url, loader, solidPaint(), Dab, DECODE_GLSL, encodeLinear(), NET_SIZE, PAINT_RANGE (+11 more)

### Community 95 - "spy/bot.ts"
Cohesion: 0.21
Nodes (15): cluePool(), decide(), deduce(), hits(), pickClue(), same(), spyBot(), suspicion() (+7 more)

### Community 96 - "tube"
Cohesion: 0.08
Nodes (32): gerobak_padi(), gulungan_semak(), kerbau(), kumbang(), Kumbang biru mengilap: cangkang terbelah, sayap tipis bernama, tanduk, enam…, Tumbleweed: bola ranting kering berongga., Kerbau abu: badan besar, tanduk melengkung, telinga, moncong pink, ekor, empat…, awan() (+24 more)

### Community 97 - "utils.ts"
Cohesion: 0.06
Nodes (27): class-variance-authority, @hugeicons/core-free-icons, @hugeicons/react, vaul, setSettings(), useAudioSettings(), CREDITS, SoundButton() (+19 more)

### Community 103 - "spy/engine.ts"
Cohesion: 0.15
Nodes (22): afterOut(), BAD, bump(), CLUE_MAX, copy(), deal(), endRound(), giveClue() (+14 more)

### Community 105 - "Sheets.tsx"
Cohesion: 0.19
Nodes (25): groupOf(), ownable(), completes(), decide(), monopolyBot(), pick(), priceOf(), proposal() (+17 more)

### Community 107 - "capture.mjs"
Cohesion: 0.25
Nodes (6): chrome, pending, profile, send(), [url, out, w = '390', h = '844', scale = '2', wait = '0', script = ''], ws

### Community 108 - "squiggles"
Cohesion: 0.12
Nodes (20): gsap, @gsap/react, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_confetti, squiggles(), QIU_NAMES, sprite() (+12 more)

### Community 109 - "Map"
Cohesion: 0.05
Nodes (22): Map, material beralpha dari larik tinggi × lebar × 4; nama `decal_*` membuat shader…, tempelan: axis 'z' = di lantai, 'x'/'y' = di dinding sepanjang sumbu itu,…, model Poly Haven: digabung, poligon disusutkan, tekstur diperkecil; disimpan…, salinan model scan. `height`/`width` menyamakan tinggi atau sisi terpanjang;…, serakan kecil: satu model disalin ke banyak titik, jadi satu objek `detail_*`…, material dari larik gambar buatan sendiri (tinggi × lebar × 3, nilai 0..1 sRGB), benda yang dibuat di dalam blok ini bergerak saat main: tidak ikut lightmap,… (+14 more)

### Community 110 - "sport/types.ts"
Cohesion: 0.07
Nodes (46): src_assets_lottie_sport_ko, SportDemo(), sportBot(), boxingBot(), DEFENSE, PUNCH_CHANCE, box(), land() (+38 more)

### Community 111 - "kitchens.ts"
Cohesion: 0.11
Nodes (19): out, AFTER, cache, CELL, COUNTER_TOP, Dish, finalState(), FoodState (+11 more)

### Community 112 - "petak/engine.ts"
Cohesion: 0.19
Nodes (21): finishHunt(), freeHiders(), hiders(), init(), isSeeker(), MAX_PLAYERS, MIN_PLAYERS, pickMap() (+13 more)

### Community 113 - "react"
Cohesion: 0.07
Nodes (55): lottie-react, radix-ui, react, src_assets_lottie_loader, src_assets_lottie_sport_ace, src_assets_lottie_sport_bullseye, sfx(), useMusic() (+47 more)

### Community 114 - "sport_chars.py"
Cohesion: 0.11
Nodes (39): last(), torus(), acc_1(), acc_2(), acc_3(), action(), animate(), attach() (+31 more)

### Community 115 - "masak/round.ts"
Cohesion: 0.10
Nodes (24): ids, secs, bots, id, k, L, n, secs (+16 more)

### Community 117 - "petak/render/world.ts"
Cohesion: 0.09
Nodes (19): mapData, ASSETS, clothShader(), cloudShade(), edgeA, edgeB, extend(), GRADE (+11 more)

### Community 118 - "build.py"
Cohesion: 0.10
Nodes (37): ndarray, bom_music(), domino_music(), draw_music(), _env(), ff(), kart_music(), kart_synth() (+29 more)

### Community 120 - "sport/engine.ts"
Cohesion: 0.06
Nodes (66): init(), initMatch(), reduce(), reduceMatch(), arc(), shoot(), start(), botShot() (+58 more)

### Community 121 - "Round"
Cohesion: 0.10
Nodes (7): loadBody(), Mover, decodePaint(), PoseId, blobShadow(), r2(), Round

### Community 122 - "bom/types.ts"
Cohesion: 0.09
Nodes (24): CUT_MS, LONG_WORD, FxCue, FxName, SoundCue, BomAction, BomEvent, BomMode (+16 more)

### Community 123 - "life.ts"
Cohesion: 0.09
Nodes (18): ref_assets_petak_models_ayam_glb_url, ref_assets_petak_models_kucing_glb_url, ref_assets_petak_models_merpati_glb_url, ref_assets_petak_models_warga_glb_url, MapInfo, Bird, Flock, fly (+10 more)

### Community 124 - "RacketScene"
Cohesion: 0.27
Nodes (3): RacketScene, RacketShot, RacketSport

### Community 125 - "petak_gang.py"
Cohesion: 0.08
Nodes (15): fasad(), gerobak(), house(), frame(), jendela(), pintu(), jemuran(), motor() (+7 more)

### Community 126 - "draw/engine.ts"
Cohesion: 0.15
Nodes (26): advance(), CHOOSE_SECONDS, copy(), deal(), defaultOptions(), distance(), DRAWER_POINTS, GUESS_POINTS (+18 more)

### Community 127 - "Stage"
Cohesion: 0.19
Nodes (3): Stage, BoxingScene, BoxingBoard()

### Community 128 - "remi/cards.ts"
Cohesion: 0.11
Nodes (18): makeDeck(), RANK_LABEL, RED, removeIds(), shuffled(), SUIT_SORT, SUIT_SYMBOL, SUITS (+10 more)

### Community 129 - "Demo.tsx"
Cohesion: 0.17
Nodes (10): BomDemo(), LudoDemo(), MonopolyDemo(), NAMES, RemiDemo(), SpyDemo(), randomStep(), lcg() (+2 more)

### Community 130 - "draw.py"
Cohesion: 0.25
Nodes (23): bevel(), bin_sprite(), centered(), crayon(), crayon_sprite(), draw_lose(), draw_win(), easel() (+15 more)

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
Cohesion: 0.24
Nodes (16): kosongkan adegan & cache material sebelum membangun model berikutnya, reset(), action(), ayam(), bind(), key(), kucing(), merpati() (+8 more)

### Community 136 - "Round"
Cohesion: 0.13
Nodes (4): Round, slip(), useKeyboard(), Walker

### Community 137 - "monopoly/engine.test.ts"
Cohesion: 0.27
Nodes (10): botAction(), randomStep(), defaultOptions(), init(), base(), simulate(), withDice(), MonopolyAction (+2 more)

### Community 138 - "petak-perf.mjs"
Cohesion: 0.24
Nodes (10): chrome, errors, js(), maps, pending, profile, ready(), send() (+2 more)

### Community 139 - "Kit"
Cohesion: 0.09
Nodes (11): decal_set(), Kit, roda torus; `jari` = jumlah jari-jari; `at` = titik tengah, tempelan prosedural: noda hujan, lumut, retak, tanah, noda oli, poster, dan…, gerobak kaki lima: lemari kaca, panci, payung, dan roda jari-jari, motor bebek parkir: rangka lengkung, tameng depan, jok, velg, spion, dan knalpot, bangku panjang kayu; `rot` 0 = memanjang di sumbu x, tali lampu: kabel melengkung dan bola menyala (+3 more)

### Community 140 - "petak-probe.mts"
Cohesion: 0.20
Nodes (7): @supabase/supabase-js, a, b, env, rx, seen, tx

### Community 141 - "createLazyFile"
Cohesion: 0.31
Nodes (7): createLazyFile(), stream_ops, writeChunks(), get_char(), mmap(), position(), read()

### Community 142 - "spy/ui/Lobby.tsx"
Cohesion: 0.15
Nodes (17): MR_WHITE_MIN, POINTS, roleCounts(), Pack, SpyMode, castLine(), MODE_INFO, MR_WHITE_INFO (+9 more)

### Community 143 - "petak-duo.mjs"
Cohesion: 0.38
Nodes (6): ref_node_os, chrome, page(), profile, sleep(), until()

### Community 144 - "makeEntry"
Cohesion: 0.33
Nodes (6): makeBufferEntry(), makeEntries(), makeEntry(), makeSamplerEntry(), makeStorageTextureEntry(), makeTextureEntry()

### Community 145 - "bom/engine.test.ts"
Cohesion: 0.23
Nodes (19): fakeWord(), randomStep(), STEMS, aliveSeats(), canAim(), canPower(), canProtest(), defaultOptions() (+11 more)

### Community 147 - "makeBlendState"
Cohesion: 0.40
Nodes (5): makeBlendComponent(), makeBlendState(), makeColorState(), makeColorStates(), makeFragmentState()

### Community 148 - "makeVertexAttributes"
Cohesion: 0.40
Nodes (5): makeVertexAttribute(), makeVertexAttributes(), makeVertexBuffer(), makeVertexBuffers(), makeVertexState()

### Community 149 - "draw/types.ts"
Cohesion: 0.16
Nodes (16): LEVEL_BONUS, DrawOptions, FeedItem, Level, Pack, Phase, RevealReason, Stroke (+8 more)

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

### Community 179 - "nav.ts"
Cohesion: 0.17
Nodes (18): map, nav, rows, SIZE, nextStop(), buildNav(), cache, cell() (+10 more)

### Community 180 - "UpdateBanner.tsx"
Cohesion: 0.14
Nodes (21): @capacitor/core, Home(), RoomCode(), dismissToast(), emit(), getToasts(), list, listeners (+13 more)

### Community 181 - "draw/bot.ts"
Cohesion: 0.14
Nodes (14): drawBot(), guess(), Plan, SILLY, canGuess(), dense(), [INK, PINK, GREEN, BLUE, YELLOW, ORANGE, , BROWN], Line (+6 more)

### Community 182 - "Particles"
Cohesion: 0.15
Nodes (8): glbUrl(), loadModels(), Particles, Champ, numberTex(), PLACE, Podium, PodiumView()

### Community 184 - "App.tsx"
Cohesion: 0.05
Nodes (48): App(), BOT_LEVELS, BotPanel(), floor, HostControls(), load(), makeCode(), PickedGame() (+40 more)

### Community 185 - "vite.config.ts"
Cohesion: 0.33
Nodes (5): ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, pkg

### Community 186 - "bom/engine.ts"
Cohesion: 0.13
Nodes (23): BOOM_SECONDS, bump(), copy(), FASTER_MIN, FASTER_STEP, FUSE_RANGE, giveRandomPower(), init() (+15 more)

### Community 187 - "snakes/engine.ts"
Cohesion: 0.20
Nodes (15): Draft, draw(), effect(), emit(), endTurn(), finish(), ITEMS, jumpTo() (+7 more)

### Community 188 - "spy/engine.test.ts"
Cohesion: 0.22
Nodes (14): CLUES, randomStep(), aliveSeats(), canVoteFor(), defaultOptions(), guessMatches(), init(), reduce() (+6 more)

### Community 189 - "snakes/types.ts"
Cohesion: 0.22
Nodes (14): EFFECTS, int(), makeBoard(), defaultOptions(), init(), table(), Board, Effect (+6 more)

### Community 190 - "audio.ts"
Cohesion: 0.11
Nodes (19): howler, AudioSettings, getSettings(), listeners, music, musicVolume(), playMusic(), settings (+11 more)

### Community 191 - "sport/ui/Lobby.tsx"
Cohesion: 0.17
Nodes (15): defaultOptions(), SportOptions, CALL_WORD, END_INFO, FRAME_INFO, POINT_INFO, ROUND_INFO, SPORT_INFO (+7 more)

### Community 192 - "snakes/bot.ts"
Cohesion: 0.22
Nodes (10): BEFORE_ROLL, snakesBot(), DARES, QUIZ, QuizQ, TRUTHS, canUseItem(), snakes (+2 more)

### Community 193 - "monopoly/ui/copy.ts"
Cohesion: 0.22
Nodes (16): squareName(), hasMonopoly(), rentOf(), eventText(), money(), noteText(), OPTION_INFO, payee() (+8 more)

### Community 194 - "spy/types.ts"
Cohesion: 0.21
Nodes (10): cuesFor(), FxCue, FxName, SoundCue, Clue, Phase, RoundResult, SpyAction (+2 more)

### Community 195 - "draw/ui/art.ts"
Cohesion: 0.21
Nodes (11): CANVAS, INKS, WIDTHS, INK_NAMES, paintAll(), paintStroke(), PAPER, SEAT_HEX (+3 more)

### Community 197 - "petak_kota.py"
Cohesion: 0.20
Nodes (6): gedung(), mobil_langit(), satu sisi gedung dari panel fasad 3×3 m, dipasang terbalik: kaki jendela…, berdiri di atas pucuk atapnya: atap di bawah, pintu dan pondasi di puncak, mobil menempel di jalan langit, rodanya ke atas, sisi()

### Community 198 - "bom/bot.ts"
Cohesion: 0.35
Nodes (9): bankFor(), bomBot(), pickWord(), BY_CATEGORY, CATEGORY_WORDS, GENERAL_WORDS, src_games_bom_engine_normalize, wordProblem() (+1 more)

### Community 199 - "snakes/ui/copy.ts"
Cohesion: 0.24
Nodes (10): BONUS, SETBACK, Item, Note, eventText(), FX_INFO, ITEM_INFO, noteText() (+2 more)

### Community 200 - "dagangan"
Cohesion: 0.33
Nodes (6): dagangan(), lapak(), tumpukan buah di atas peti: model kecil dibesarkan sedikit supaya terbaca dari…, isi meja lapak menurut jenis dagangan, lapak terbuka ke lorong: `arah` +1 = tubuh lapak ke utara dari garis depan, tumpuk()

## Knowledge Gaps
- **655 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+650 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1580 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Seat` connect `Seat` to `remi/cards.ts`, `remi/types.ts`, `LudoBoard.tsx`, `Round`, `spy/ui/Lobby.tsx`, `draw/types.ts`, `MonopolyBoard.tsx`, `remi/engine.ts`, `poker.ts`, `KartBoard.tsx`, `race.ts`, `DominoTable.tsx`, `kart/engine.ts`, `BomBoard.tsx`, `remi/bot.ts`, `monopoly/engine.ts`, `RemiTable.tsx`, `remi/ui/copy.ts`, `UnoTable.tsx`, `BowlingBoard.tsx`, `chain.ts`, `App.tsx`, `ludo/engine.ts`, `bom/engine.ts`, `monopoly/types.ts`, `snakes/engine.ts`, `snakes/types.ts`, `SnakesBoard.tsx`, `uno/engine.ts`, `monopoly/ui/copy.ts`, `spy/types.ts`, `SpyBoard.tsx`, `ludo/types.ts`, `games/types.ts`, `bom/bot.ts`, `snakes/ui/copy.ts`, `domino/engine.ts`, `qiuqiu.ts`, `uno/types.ts`, `MasakBoard.tsx`, `DrawBoard.tsx`, `petak/round.ts`, `spy/bot.ts`, `spy/engine.ts`, `Sheets.tsx`, `squiggles`, `sport/types.ts`, `petak/engine.ts`, `masak/round.ts`, `sport/engine.ts`, `Round`, `bom/types.ts`, `draw/engine.ts`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `remi/cards.ts`, `package.json`, `Demo.tsx`, `LudoBoard.tsx`, `monopoly/engine.test.ts`, `spy/ui/Lobby.tsx`, `draw/types.ts`, `MonopolyBoard.tsx`, `remi/engine.ts`, `KartBoard.tsx`, `DominoTable.tsx`, `kart/engine.ts`, `BomBoard.tsx`, `RemiTable.tsx`, `emotes.ts`, `remi/ui/copy.ts`, `BowlCamera.tsx`, `UnoTable.tsx`, `PetakBoard.tsx`, `BowlingBoard.tsx`, `UpdateBanner.tsx`, `draw/bot.ts`, `App.tsx`, `SnakesBoard.tsx`, `audio.ts`, `sport/ui/Lobby.tsx`, `snakes/bot.ts`, `uno/engine.ts`, `spy/types.ts`, `SpyBoard.tsx`, `ludo/types.ts`, `games/types.ts`, `domino/engine.ts`, `PenaltyBoard.tsx`, `ludo/ui/Lobby.tsx`, `racket/scene.ts`, `uno/types.ts`, `registry.ts`, `maps.ts`, `MasakBoard.tsx`, `DrawBoard.tsx`, `utils.ts`, `Sheets.tsx`, `squiggles`, `sport/types.ts`, `petak/engine.ts`, `bom/types.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `vitest` connect `PenaltyBoard.tsx` to `package.json`, `remi/types.ts`, `monopoly/engine.test.ts`, `bom/engine.test.ts`, `remi/engine.ts`, `race.ts`, `kart/engine.ts`, `kitchen.ts`, `emotes.ts`, `BowlingBoard.tsx`, `UpdateBanner.tsx`, `three`, `Seat`, `ludo/engine.ts`, `App.tsx`, `spy/engine.test.ts`, `snakes/types.ts`, `domino/engine.ts`, `bots.test.ts`, `uno/types.ts`, `sport/types.ts`, `petak/engine.ts`, `sport/engine.ts`, `draw/engine.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _655 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `sphere` be split into smaller, more focused modules?**
  _Cohesion score 0.07560975609756097 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `remi/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09639953542392567 - nodes in this community are weakly interconnected._