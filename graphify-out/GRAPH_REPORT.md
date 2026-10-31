# Graph Report - game  (2026-10-31)

## Corpus Check
- 657 files · ~2,707,726 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 165 file(s) not represented in the graph (top: .glb 153, .hdr 3, (none) 2)

## Summary
- 4569 nodes · 13429 edges · 179 communities (135 shown, 44 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 288 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `de781748`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pbr
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
- Demo.tsx
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
- Seat
- racket/scene.ts
- emotes.ts
- CardFace.tsx
- qiuAction
- remi.py
- monopoly/ui/copy.ts
- dialog.tsx
- blackjack.ts
- monopoly/engine.test.ts
- BowlingBoard.tsx
- kart_world.py
- domino.py
- kart.py
- draw.py
- tracks.ts
- scripts
- ludo/engine.ts
- emote.py
- monopoly/types.ts
- snakes/engine.ts
- uno/engine.ts
- kart/render/world.ts
- bigtwo.ts
- Race
- system_io
- spy.py
- SpyBoard.tsx
- ludo/types.ts
- DrawBoard.tsx
- system_linq
- models.ts
- cyl
- useRoom.ts
- pathlib
- podium.ts
- domino/engine.ts
- vitest
- bots.test.ts
- ludo/engine.test.ts
- games/types.ts
- App.tsx
- terrazzo
- ludo/bot.ts
- registry.ts
- system_text
- qiuqiu.ts
- unityeditor
- draw/ui/art.ts
- unityeditor_build
- draw/engine.ts
- sim.test.ts
- unityeditor_build_reporting
- kart_props.py
- spy/bot.ts
- kart_world2.py
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
- Map
- sport/types.ts
- sport/engine.ts
- PetakBoard.tsx
- PenaltyBoard.tsx
- sport_chars.py
- domino/types.ts
- system
- petak/render/world.ts
- petak/engine.ts
- round.ts
- archery/engine.ts
- Round
- RacketBoard.tsx
- life.ts
- Look
- petak_gang.py
- spy/ui/Lobby.tsx
- Stage
- Kit
- Painter
- tracker.ts
- export.py
- abort
- petak_body.py
- petak_life.py
- ExceptionInfo
- PaintSurface
- petak_kota.py
- petak-perf.mjs
- sketches.ts
- petak-probe.mts
- createLazyFile
- kart_lib.py
- petak-duo.mjs
- makeEntry
- dagangan
- init
- makeBlendState
- makeVertexAttributes
- TileFace.tsx
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

## God Nodes (most connected - your core abstractions)
1. `Seat` - 95 edges
2. `add()` - 94 edges
3. `pbr()` - 92 edges
4. `react` - 82 edges
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

## Communities (179 total, 44 thin omitted)

### Community 0 - "pbr"
Cohesion: 0.07
Nodes (60): akar_ayun(), arca(), gulungan_semak(), jamur_pantul(), kerbau(), kumbang(), orang_orangan(), palang_parkir() (+52 more)

### Community 1 - "package.json"
Cohesion: 0.08
Nodes (22): config, name, private, type, version, @capacitor/android, @capacitor/cli, class-variance-authority (+14 more)

### Community 2 - "remi/types.ts"
Cohesion: 0.09
Nodes (43): deal(), makeDeck(), RANK_LABEL, RED, removeIds(), shuffled(), SUIT_SORT, bohong (+35 more)

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
Nodes (34): src_assets_lottie_dice_roll, src_assets_lottie_ludo_bomb, src_assets_lottie_ludo_boost, src_assets_lottie_ludo_capture, src_assets_lottie_ludo_home, src_assets_lottie_ludo_portal, src_assets_lottie_ludo_six, src_assets_lottie_ludo_slip (+26 more)

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
Cohesion: 0.08
Nodes (29): src_assets_lottie_monopoly_bankrupt, src_assets_lottie_monopoly_build, src_assets_lottie_monopoly_card, src_assets_lottie_monopoly_jackpot, src_assets_lottie_monopoly_jail, src_assets_lottie_monopoly_rent, src_assets_lottie_monopoly_sold, src_assets_monopoly_monopoly_lose (+21 more)

### Community 23 - "remi/engine.ts"
Cohesion: 0.13
Nodes (28): BomDemo(), MonopolyDemo(), RemiDemo(), SpyDemo(), candidates(), lcg(), randomStep(), apply() (+20 more)

### Community 25 - "poker.ts"
Cohesion: 0.26
Nodes (13): nextWhere(), after(), BOARD_AT, canAct(), compareScores(), HAND_NAMES, straightHigh(), live() (+5 more)

### Community 26 - "ludo.py"
Cohesion: 0.19
Nodes (28): no_lines(), ball(), bevel(), box(), cone_(), cyl(), die(), face() (+20 more)

### Community 27 - "KartBoard.tsx"
Cohesion: 0.06
Nodes (45): howler, src_assets_lottie_kart_boost, src_assets_lottie_kart_box, src_assets_lottie_kart_finish, src_assets_lottie_kart_hit, src_assets_lottie_kart_lap, statsFor(), racerOf() (+37 more)

### Community 28 - "bom.py"
Cohesion: 0.16
Nodes (37): attach(), ball(), bevel(), big_eye(), bom_lose(), bom_win(), bomb(), boomerang() (+29 more)

### Community 29 - "ludo/board.ts"
Cohesion: 0.19
Nodes (23): apothem(), armAngle(), cellPt(), circumR(), homePt(), innerR(), R0, SLOTS (+15 more)

### Community 30 - "Demo.tsx"
Cohesion: 0.13
Nodes (12): DominoDemo(), NAMES, DRAW, Effect, effectFor(), isTense(), PLACE, SoundCue (+4 more)

### Community 31 - "race.ts"
Cohesion: 0.06
Nodes (58): Stats, Controls, GRADE, Opts, Pose, Remote, SANITIZE, SHIELD_MAT (+50 more)

### Community 32 - "cube"
Cohesion: 0.09
Nodes (58): cube(), kosongkan adegan & cache material sebelum membangun model berikutnya, reset(), text3d(), arena(), bake_lightmap(), build_archery(), build_bowling() (+50 more)

### Community 33 - "release.mjs"
Cohesion: 0.20
Nodes (6): ref_node_child_process, ref_node_fs, { version }, [bump = 'patch', ...noteParts], [ma, mi, pa], pkg

### Community 34 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, @capacitor/cli, oxlint, @types/node, @types/react, @types/react-dom, @types/three, typescript (+3 more)

### Community 35 - "kart/engine.ts"
Cohesion: 0.08
Nodes (46): BODIES, BODY_IDS, CHARACTERS, CUPS, ITEM_INFO, LEVEL_INFO, MAX_RACERS, ODDS (+38 more)

### Community 36 - "BomBoard.tsx"
Cohesion: 0.07
Nodes (45): src_assets_lottie_bom_boom, src_assets_lottie_bom_cancel, src_assets_lottie_bom_pass, src_assets_lottie_bom_power, src_assets_lottie_bom_spark, BOOM_SECONDS, POWERS, promptText() (+37 more)

### Community 37 - "bom/engine.ts"
Cohesion: 0.08
Nodes (59): bankFor(), bomBot(), pickWord(), fakeWord(), randomStep(), STEMS, aliveSeats(), bump() (+51 more)

### Community 38 - "remi/bot.ts"
Cohesion: 0.14
Nodes (30): best(), Bet, betAction(), BetSpot, pickOne(), bigTwo(), bigTwoPlays(), blackjack() (+22 more)

### Community 39 - "monopoly/ui/art.tsx"
Cohesion: 0.12
Nodes (23): AIRPORTS, BOARD, CODE, GROUP_HEX, GROUP_NAME, UTILITIES, HOTEL, Buildings() (+15 more)

### Community 40 - "monopoly/engine.ts"
Cohesion: 0.22
Nodes (22): nextOf(), advanceAuction(), afterMove(), alive(), charge(), Ctx, drawCard(), finish() (+14 more)

### Community 41 - "Seat"
Cohesion: 0.10
Nodes (31): src_assets_lottie_remi_bomb, src_assets_lottie_remi_bust, src_assets_lottie_remi_chips, src_assets_lottie_remi_deal, src_assets_lottie_remi_joker, src_assets_lottie_remi_liar, rankLabel(), Effect (+23 more)

### Community 42 - "racket/scene.ts"
Cohesion: 0.04
Nodes (89): ref_assets_sport_models_archery_glb_url, ref_assets_sport_models_archery_lm_webp_url, ref_assets_sport_models_boxing_glb_url, ref_assets_sport_models_boxing_lm_webp_url, ref_assets_sport_models_chibi_glb_url, ref_assets_sport_models_court_glb_url, ref_assets_sport_models_court_lm_webp_url, ref_assets_sport_models_hall_glb_url (+81 more)

### Community 43 - "emotes.ts"
Cohesion: 0.08
Nodes (28): src_assets_emote_kaget, src_assets_emote_kaget_anim, src_assets_emote_keren, src_assets_emote_keren_anim, src_assets_emote_naksir, src_assets_emote_naksir_anim, src_assets_emote_nangis, src_assets_emote_nangis_anim (+20 more)

### Community 44 - "CardFace.tsx"
Cohesion: 0.13
Nodes (25): sortHand(), SUIT_NAME, SUIT_SYMBOL, suitIndex(), SUITS, sevenPenalty(), sprite(), CardBack (+17 more)

### Community 45 - "qiuAction"
Cohesion: 0.33
Nodes (7): dominoBot(), qiuAction(), qiuPower(), minRaiseTo(), toCall(), QiuActions(), qiuStatus()

### Community 46 - "remi.py"
Cohesion: 0.15
Nodes (35): bevel(), card(), chip(), chip_sprite(), chip_stack(), circle_outline(), dealer_btn(), deck_sprite() (+27 more)

### Community 47 - "monopoly/ui/copy.ts"
Cohesion: 0.23
Nodes (17): squareName(), MonopolyOptions, eventText(), lastCard(), money(), noteText(), OPTION_INFO, payee() (+9 more)

### Community 49 - "blackjack.ts"
Cohesion: 0.25
Nodes (14): active(), advance(), bjTotal(), blackjack, draw(), isBlackjack(), MIN_BET, settle() (+6 more)

### Community 50 - "monopoly/engine.test.ts"
Cohesion: 0.26
Nodes (10): GROUPS, botAction(), randomStep(), defaultOptions(), init(), base(), simulate(), withDice() (+2 more)

### Community 51 - "BowlingBoard.tsx"
Cohesion: 0.05
Nodes (60): ref_assets_sport_models_bowling_glb_url, ref_assets_sport_models_bowling_lm_webp_url, ref_assets_sport_models_bowling_props_glb_url, src_assets_lottie_sport_gutter, src_assets_lottie_sport_spare, src_assets_lottie_sport_strike, SfxName, cuesFor() (+52 more)

### Community 52 - "kart_world.py"
Cohesion: 0.20
Nodes (24): ball(), box(), camar(), cyl(), dermaga(), finish(), last(), mercusuar() (+16 more)

### Community 53 - "domino.py"
Cohesion: 0.16
Nodes (30): bevel(), bone_pile(), bone_sprite(), chain(), chip(), chip_sprite(), chip_stack(), coffee() (+22 more)

### Community 54 - "kart.py"
Cohesion: 0.06
Nodes (74): ndarray, bom_music(), domino_music(), draw_music(), _env(), ff(), kart_music(), kart_synth() (+66 more)

### Community 55 - "draw.py"
Cohesion: 0.25
Nodes (23): bevel(), bin_sprite(), centered(), crayon(), crayon_sprite(), draw_lose(), draw_win(), easel() (+15 more)

### Community 56 - "tracks.ts"
Cohesion: 0.13
Nodes (17): anchors(), bridgeSamples(), groundOf(), GroundShape, smooth(), WATER_Y, Fence, Recipe (+9 more)

### Community 57 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, apk, build, dev, lint, preview, release, test

### Community 58 - "ludo/engine.ts"
Cohesion: 0.24
Nodes (19): BOOST, SLIP, applyMove(), canExit(), doneAll(), Draft, emit(), endTurn() (+11 more)

### Community 59 - "emote.py"
Cohesion: 0.18
Nodes (33): arc(), ball(), beat(), blush(), box(), drop(), head(), heart_points() (+25 more)

### Community 60 - "monopoly/types.ts"
Cohesion: 0.10
Nodes (19): Card, CardFx, CARDS, DECK_TITLE, Auction, Debt, Deck, GO_SALARY (+11 more)

### Community 61 - "snakes/engine.ts"
Cohesion: 0.06
Nodes (64): cellOf(), EFFECTS, int(), makeBoard(), BEFORE_ROLL, snakesBot(), DARES, QUIZ (+56 more)

### Community 62 - "uno/engine.ts"
Cohesion: 0.08
Nodes (70): react-dom, UnoDemo(), decide(), favoriteColor(), playCard(), score(), unoBot(), buildDeck() (+62 more)

### Community 63 - "kart/render/world.ts"
Cohesion: 0.08
Nodes (71): alamSide(), banner(), batch(), cornerMarks(), crossings(), eachSide(), fascia(), gantry() (+63 more)

### Community 64 - "bigtwo.ts"
Cohesion: 0.17
Nodes (16): cardLabel(), bigtwo, bigTwoPenalty(), btRank(), btValue(), comboOf(), FIVE_ORDER, SUIT_V (+8 more)

### Community 65 - "Race"
Cohesion: 0.09
Nodes (6): r2(), Race, recipeOf(), Skids, World, driftLevel()

### Community 67 - "spy.py"
Cohesion: 0.17
Nodes (38): attach(), ball(), bean(), bevel(), box(), card(), card_back(), card_word() (+30 more)

### Community 68 - "SpyBoard.tsx"
Cohesion: 0.08
Nodes (43): src_assets_lottie_spy_caught, src_assets_lottie_spy_escape, src_assets_lottie_spy_guess, src_assets_lottie_spy_reveal, src_assets_lottie_spy_stamp, sfx(), Modal(), dots() (+35 more)

### Community 69 - "ludo/types.ts"
Cohesion: 0.13
Nodes (20): LudoDemo(), botAction(), ludoBot(), randomStep(), ludo, LudoAction, LudoEvent, LudoOptions (+12 more)

### Community 70 - "DrawBoard.tsx"
Cohesion: 0.07
Nodes (37): Home(), src_assets_lottie_draw_close, src_assets_lottie_draw_correct, src_assets_lottie_draw_pick, src_assets_lottie_draw_reveal, src_assets_lottie_draw_timeup, AudioSettings, listeners (+29 more)

### Community 72 - "models.ts"
Cohesion: 0.10
Nodes (27): ball(), BODY_FALLBACK, box(), build(), cache, clearModels(), compactCache, compactClone() (+19 more)

### Community 73 - "cyl"
Cohesion: 0.08
Nodes (41): batu_api(), batu_jatuh(), bola_api(), bola_permen(), bola_salju(), bus(), es_ayun(), gada_batu() (+33 more)

### Community 74 - "useRoom.ts"
Cohesion: 0.06
Nodes (42): Room(), useRoomToasts(), Chunk, CHUNK_BYTES, CHUNK_GAP_MS, fromBase64(), Incoming, join() (+34 more)

### Community 75 - "pathlib"
Cohesion: 0.05
Nodes (42): colorsys, contextlib, math, numpy, pathlib, random, pori(), street_lamp() (+34 more)

### Community 76 - "podium.ts"
Cohesion: 0.11
Nodes (13): glbUrl(), loadModels(), DRIFT_COLORS, DUST, KIND, ParticleKind, Particles, Pool (+5 more)

### Community 77 - "domino/engine.ts"
Cohesion: 0.16
Nodes (24): candidates(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce() (+16 more)

### Community 78 - "vitest"
Cohesion: 0.08
Nodes (40): vitest, LM, Pt, seen(), torsoLength(), torsoVisible(), BowGesture, BowRead (+32 more)

### Community 79 - "bots.test.ts"
Cohesion: 0.10
Nodes (23): BY_CATEGORY, CATEGORY_WORDS, GENERAL_WORDS, CATEGORIES, LETTERS, SYLLABLES, after(), Any (+15 more)

### Community 80 - "ludo/engine.test.ts"
Cohesion: 0.33
Nodes (9): armsFor(), minArms(), defaultOptions(), init(), teamsAllowed(), base(), roll(), withDie() (+1 more)

### Community 81 - "games/types.ts"
Cohesion: 0.05
Nodes (70): gsap, @gsap/react, lottie-react, radix-ui, react, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_burst (+62 more)

### Community 82 - "App.tsx"
Cohesion: 0.06
Nodes (42): @capacitor/core, @hugeicons/core-free-icons, @hugeicons/react, App(), BOT_LEVELS, BotPanel(), floor, HostControls() (+34 more)

### Community 83 - "terrazzo"
Cohesion: 0.12
Nodes (18): terrazzo(), CardBack, CardFace, COLOR_NAME, cornerText(), DARK_SIDE, DARK_WHEEL, faceLabel() (+10 more)

### Community 84 - "ludo/bot.ts"
Cohesion: 0.44
Nodes (11): finishOf(), isSafe(), specialAt(), trackIndex(), trackLen(), score(), threats(), capture() (+3 more)

### Community 85 - "registry.ts"
Cohesion: 0.06
Nodes (32): src_assets_bom_tile_bom, src_assets_domino_tile_domino, src_assets_draw_tile_draw, src_assets_ludo_tile_ludo, src_assets_monopoly_tile_monopoly, src_assets_petak_tile_petak, src_assets_remi_tile_remi, src_assets_snakes_tile_snakes (+24 more)

### Community 87 - "qiuqiu.ts"
Cohesion: 0.17
Nodes (24): chainEngine(), opener(), after(), canAct(), CAT_RANK, compareQiu(), evaluateQiu(), live() (+16 more)

### Community 89 - "draw/ui/art.ts"
Cohesion: 0.21
Nodes (11): CANVAS, INKS, WIDTHS, INK_NAMES, paintAll(), paintStroke(), PAPER, SEAT_HEX (+3 more)

### Community 91 - "draw/engine.ts"
Cohesion: 0.07
Nodes (56): drawBot(), guess(), Plan, SILLY, advance(), canGuess(), CHOOSE_SECONDS, copy() (+48 more)

### Community 92 - "sim.test.ts"
Cohesion: 0.08
Nodes (52): map, nav, rows, SIZE, finishHunt(), freeHiders(), isSeeker(), reduce() (+44 more)

### Community 94 - "kart_props.py"
Cohesion: 0.19
Nodes (8): bpy, mathutils, bounds(), convert(), reset(), import_obj(), normalize(), Path

### Community 95 - "spy/bot.ts"
Cohesion: 0.19
Nodes (19): normalize(), cluePool(), decide(), deduce(), hits(), pickClue(), same(), spyBot() (+11 more)

### Community 96 - "kart_world2.py"
Cohesion: 0.07
Nodes (28): bendera_rp(), candi(), gapura_candi(), gapura_sawah(), gunung_api(), jamur_raksasa(), jembatan_batu(), jembatan_layang() (+20 more)

### Community 97 - "DominoTable.tsx"
Cohesion: 0.10
Nodes (34): src_assets_lottie_domino_blocked, src_assets_lottie_domino_chips, src_assets_lottie_domino_deal, src_assets_lottie_domino_score, src_assets_lottie_domino_slam, src_assets_lottie_domino_special, chainAction(), canPass() (+26 more)

### Community 103 - "spy/engine.ts"
Cohesion: 0.10
Nodes (40): nextRand(), shuffle(), CLUES, randomStep(), afterOut(), aliveSeats(), BAD, bump() (+32 more)

### Community 105 - "Sheets.tsx"
Cohesion: 0.18
Nodes (26): groupOf(), ownable(), completes(), decide(), monopolyBot(), pick(), priceOf(), proposal() (+18 more)

### Community 107 - "capture.mjs"
Cohesion: 0.25
Nodes (6): chrome, pending, profile, send(), [url, out, w = '390', h = '844', scale = '2', wait = '0'], ws

### Community 108 - "vite.config.ts"
Cohesion: 0.33
Nodes (5): ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, pkg

### Community 109 - "Map"
Cohesion: 0.05
Nodes (22): Map, material beralpha dari larik tinggi × lebar × 4; nama `decal_*` membuat shader…, tempelan: axis 'z' = di lantai, 'x'/'y' = di dinding sepanjang sumbu itu,…, model Poly Haven: digabung, poligon disusutkan, tekstur diperkecil; disimpan…, salinan model scan. `height`/`width` menyamakan tinggi atau sisi terpanjang;…, serakan kecil: satu model disalin ke banyak titik, jadi satu objek `detail_*`…, material dari larik gambar buatan sendiri (tinggi × lebar × 3, nilai 0..1 sRGB), benda yang dibuat di dalam blok ini bergerak saat main: tidak ikut lightmap,… (+14 more)

### Community 110 - "sport/types.ts"
Cohesion: 0.08
Nodes (42): src_assets_lottie_sport_ko, sportBot(), boxingBot(), DEFENSE, PUNCH_CHANCE, box(), land(), send() (+34 more)

### Community 111 - "sport/engine.ts"
Cohesion: 0.09
Nodes (40): defaultOptions(), init(), initMatch(), reduce(), reduceMatch(), cleanLook(), start(), initBowling() (+32 more)

### Community 112 - "PetakBoard.tsx"
Cohesion: 0.07
Nodes (29): src_assets_lottie_petak_ciprat, src_assets_lottie_petak_ketangkap, src_assets_lottie_petak_lolos, src_assets_lottie_petak_tutup, getSettings(), actorOf(), ranking(), POSE_LABEL (+21 more)

### Community 113 - "PenaltyBoard.tsx"
Cohesion: 0.08
Nodes (32): src_assets_lottie_sport_bullseye, src_assets_lottie_sport_goal, SportDemo(), saveQuality(), ARROWS, AIM_MAX, ArcheryBoard(), CALL_WORD (+24 more)

### Community 114 - "sport_chars.py"
Cohesion: 0.11
Nodes (38): acc_1(), acc_2(), acc_3(), action(), animate(), attach(), bake(), bow() (+30 more)

### Community 115 - "domino/types.ts"
Cohesion: 0.12
Nodes (24): chainValue(), placed(), endCount(), finish(), HAND_SIZE, lowest(), round5(), DealCtx (+16 more)

### Community 117 - "petak/render/world.ts"
Cohesion: 0.09
Nodes (21): Tier, mapData, ASSETS, clothShader(), cloudShade(), edgeA, edgeB, extend() (+13 more)

### Community 118 - "petak/engine.ts"
Cohesion: 0.09
Nodes (32): src_assets_petak_maps_dapur, src_assets_petak_maps_gang, src_assets_petak_maps_kapal, src_assets_petak_maps_kota, src_assets_petak_maps_museum, src_assets_petak_maps_pabrik, src_assets_petak_maps_pasar, src_assets_petak_maps_stasiun (+24 more)

### Community 119 - "round.ts"
Cohesion: 0.07
Nodes (31): ref_assets_petak_models_bunglon_glb_url, BODY_SCALE, loadBody(), loader, solidPaint(), Dab, DECODE_GLSL, decodePaint() (+23 more)

### Community 120 - "archery/engine.ts"
Cohesion: 0.10
Nodes (24): arc(), shoot(), botShot(), noise(), WIND_READ, WOBBLE, AUTO_AIM, clamp() (+16 more)

### Community 121 - "Round"
Cohesion: 0.12
Nodes (3): hiders(), PoseId, Round

### Community 122 - "RacketBoard.tsx"
Cohesion: 0.12
Nodes (18): src_assets_lottie_sport_ace, CAMERA_GRACE_MS, clamp(), flightMs(), KINDS, landBackupMs(), POINT_MS, SERVE_MS (+10 more)

### Community 123 - "life.ts"
Cohesion: 0.09
Nodes (19): ref_assets_petak_models_ayam_glb_url, ref_assets_petak_models_kucing_glb_url, ref_assets_petak_models_merpati_glb_url, ref_assets_petak_models_warga_glb_url, MapInfo, Bird, Flock, fly (+11 more)

### Community 124 - "Look"
Cohesion: 0.14
Nodes (7): Chibi, loadChibi(), ballTexture(), PenaltyScene, Look, PenaltyResult, CharacterMaker()

### Community 125 - "petak_gang.py"
Cohesion: 0.08
Nodes (15): fasad(), gerobak(), house(), frame(), jendela(), pintu(), jemuran(), motor() (+7 more)

### Community 126 - "spy/ui/Lobby.tsx"
Cohesion: 0.14
Nodes (20): MR_WHITE_MIN, roleCounts(), Pack, Phase, Role, SpyAction, SpyMode, SpyOptions (+12 more)

### Community 127 - "Stage"
Cohesion: 0.16
Nodes (5): savedQuality(), Stage, BoxingScene, BoxingBoard(), useSceneStage()

### Community 128 - "Kit"
Cohesion: 0.09
Nodes (11): decal_set(), Kit, roda torus; `jari` = jumlah jari-jari; `at` = titik tengah, tempelan prosedural: noda hujan, lumut, retak, tanah, noda oli, poster, dan…, gerobak kaki lima: lemari kaca, panci, payung, dan roda jari-jari, motor bebek parkir: rangka lengkung, tameng depan, jok, velg, spion, dan knalpot, bangku panjang kayu; `rot` 0 = memanjang di sumbu x, tali lampu: kabel melengkung dan bola menyala (+3 more)

### Community 130 - "tracker.ts"
Cohesion: 0.15
Nodes (11): @mediapipe/tasks-vision, closeCamera(), Delegate, loadModel(), openCamera(), PoseTracker, squareUp(), usePoseCamera() (+3 more)

### Community 131 - "export.py"
Cohesion: 0.13
Nodes (14): datetime, json, pil, main(), Satukan frame stiker emote (brand/illustrations/emote/frames) jadi WebP animasi…, union_box(), main(), Ekspor render Blender per game (brand/illustrations/<game>/*.png) ke WebP untuk… (+6 more)

### Community 132 - "abort"
Cohesion: 0.12
Nodes (18): abort(), assert(), assignWasmExports(), createWasm(), receiveInstance(), receiveInstantiationResult(), findWasmBinary(), forceLoadFile() (+10 more)

### Community 133 - "petak_body.py"
Cohesion: 0.20
Nodes (16): bmesh, action(), animate(), build_pupils(), build_rig(), build_skin(), key(), main() (+8 more)

### Community 134 - "petak_life.py"
Cohesion: 0.27
Nodes (14): action(), ayam(), bind(), key(), kucing(), merpati(), warga: satu kulit tanpa sambungan, baju dan celana dibagi dari wilayah badan,…, ayam kampung: badan bulat, jengger, ekor tegak; klip jalan dan mematuk (+6 more)

### Community 137 - "petak_kota.py"
Cohesion: 0.20
Nodes (6): gedung(), mobil_langit(), satu sisi gedung dari panel fasad 3×3 m, dipasang terbalik: kaki jendela…, berdiri di atas pucuk atapnya: atap di bawah, pintu dan pondasi di puncak, mobil menempel di jalan langit, rodanya ke atas, sisi()

### Community 138 - "petak-perf.mjs"
Cohesion: 0.24
Nodes (10): chrome, errors, js(), maps, pending, profile, ready(), send() (+2 more)

### Community 139 - "sketches.ts"
Cohesion: 0.20
Nodes (7): dense(), [INK, PINK, GREEN, BLUE, YELLOW, ORANGE, , BROWN], Line, RAW, Sketch, SKETCH_WORDS, sketchStrokes()

### Community 140 - "petak-probe.mts"
Cohesion: 0.20
Nodes (7): @supabase/supabase-js, a, b, env, rx, seen, tx

### Community 141 - "createLazyFile"
Cohesion: 0.31
Nodes (7): createLazyFile(), stream_ops, writeChunks(), get_char(), mmap(), position(), read()

### Community 142 - "kart_lib.py"
Cohesion: 0.33
Nodes (7): bev(), clear(), export(), to_meshes(), bunglon(), ember(), scene_tile()

### Community 143 - "petak-duo.mjs"
Cohesion: 0.38
Nodes (6): ref_node_os, chrome, page(), profile, sleep(), until()

### Community 144 - "makeEntry"
Cohesion: 0.33
Nodes (6): makeBufferEntry(), makeEntries(), makeEntry(), makeSamplerEntry(), makeStorageTextureEntry(), makeTextureEntry()

### Community 145 - "dagangan"
Cohesion: 0.33
Nodes (6): dagangan(), lapak(), tumpukan buah di atas peti: model kecil dibesarkan sedikit supaya terbaca dari…, isi meja lapak menurut jenis dagangan, lapak terbuka ke lorong: `arah` +1 = tubuh lapak ke utara dari garis depan, tumpuk()

### Community 147 - "makeBlendState"
Cohesion: 0.40
Nodes (5): makeBlendComponent(), makeBlendState(), makeColorState(), makeColorStates(), makeFragmentState()

### Community 148 - "makeVertexAttributes"
Cohesion: 0.40
Nodes (5): makeVertexAttribute(), makeVertexAttributes(), makeVertexBuffer(), makeVertexBuffers(), makeVertexState()

### Community 149 - "TileFace.tsx"
Cohesion: 0.40
Nodes (3): DOTS, Props, TileFace

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

## Knowledge Gaps
- **595 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+590 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1455 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Seat` connect `Seat` to `remi/types.ts`, `LudoBoard.tsx`, `MonopolyBoard.tsx`, `remi/engine.ts`, `poker.ts`, `KartBoard.tsx`, `Demo.tsx`, `race.ts`, `kart/engine.ts`, `BomBoard.tsx`, `bom/engine.ts`, `remi/bot.ts`, `monopoly/engine.ts`, `CardFace.tsx`, `monopoly/ui/copy.ts`, `blackjack.ts`, `BowlingBoard.tsx`, `ludo/engine.ts`, `monopoly/types.ts`, `snakes/engine.ts`, `uno/engine.ts`, `SpyBoard.tsx`, `ludo/types.ts`, `DrawBoard.tsx`, `useRoom.ts`, `domino/engine.ts`, `games/types.ts`, `terrazzo`, `qiuqiu.ts`, `draw/engine.ts`, `sim.test.ts`, `spy/bot.ts`, `DominoTable.tsx`, `spy/engine.ts`, `Sheets.tsx`, `sport/types.ts`, `sport/engine.ts`, `domino/types.ts`, `petak/engine.ts`, `round.ts`, `archery/engine.ts`, `Round`, `RacketBoard.tsx`, `spy/ui/Lobby.tsx`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `react` connect `games/types.ts` to `package.json`, `LudoBoard.tsx`, `TileFace.tsx`, `MonopolyBoard.tsx`, `remi/engine.ts`, `KartBoard.tsx`, `Demo.tsx`, `kart/engine.ts`, `BomBoard.tsx`, `bom/engine.ts`, `Seat`, `racket/scene.ts`, `emotes.ts`, `CardFace.tsx`, `monopoly/ui/copy.ts`, `dialog.tsx`, `monopoly/engine.test.ts`, `BowlingBoard.tsx`, `snakes/engine.ts`, `uno/engine.ts`, `SpyBoard.tsx`, `ludo/types.ts`, `DrawBoard.tsx`, `useRoom.ts`, `domino/engine.ts`, `App.tsx`, `terrazzo`, `registry.ts`, `draw/engine.ts`, `DominoTable.tsx`, `Sheets.tsx`, `sport/types.ts`, `PetakBoard.tsx`, `PenaltyBoard.tsx`, `petak/engine.ts`, `RacketBoard.tsx`, `spy/ui/Lobby.tsx`, `Stage`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `three` connect `racket/scene.ts` to `package.json`, `Race`, `models.ts`, `podium.ts`, `BowlingBoard.tsx`, `petak/render/world.ts`, `round.ts`, `tracks.ts`, `life.ts`, `race.ts`, `kart/render/world.ts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _595 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pbr` be split into smaller, more focused modules?**
  _Cohesion score 0.07049180327868852 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `remi/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0859538784067086 - nodes in this community are weakly interconnected._