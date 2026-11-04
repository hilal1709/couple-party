# Graph Report - masak  (2026-11-04)

## Corpus Check
- 679 files · ~2,731,638 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 168 file(s) not represented in the graph (top: .glb 155, (none) 3, .hdr 3)

## Summary
- 4818 nodes · 14189 edges · 186 communities (140 shown, 46 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 298 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7a015da1`
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
- remi/cards.ts
- ludo.py
- KartBoard.tsx
- bom.py
- ludo/board.ts
- DominoTable.tsx
- race.ts
- sport_world.py
- release.mjs
- bowling/scene.ts
- kart/engine.ts
- BomBoard.tsx
- bom/engine.ts
- remi/bot.ts
- monopoly/ui/art.tsx
- monopoly/engine.ts
- RemiTable.tsx
- racket/scene.ts
- emotes.ts
- CardFace.tsx
- masak_props.py
- remi.py
- sport/engine.ts
- MasakBoard.tsx
- blackjack.ts
- PetakBoard.tsx
- bowling/sim.ts
- kart_world.py
- domino.py
- kart.py
- archery/scene.ts
- hazards.ts
- penalty/engine.ts
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
- DrawBoard.tsx
- system_linq
- models.ts
- Dapur
- chain.ts
- pathlib
- render/scene.ts
- Painter
- vitest
- bots.test.ts
- ludo/engine.test.ts
- games/types.ts
- arena.ts
- react
- kitchen.ts
- registry.ts
- system_text
- domino/types.ts
- unityeditor
- masak/engine.ts
- unityeditor_build
- draw/engine.ts
- sim.test.ts
- unityeditor_build_reporting
- kart_props.py
- spy/bot.ts
- spy/types.ts
- domino/ui/RoundEnd.tsx
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
- Particles
- Map
- sport/types.ts
- kitchens.ts
- petak/engine.ts
- Slab.tsx
- sport_chars.py
- masak/round.ts
- system
- petak/render/world.ts
- build.py
- painter.ts
- archery/engine.ts
- Round
- RacketScene
- life.ts
- Chibi
- petak_gang.py
- penalty/scene.ts
- boxing/scene.ts
- domino/bot.ts
- Seat
- petak/round.ts
- export.py
- abort
- petak_body.py
- petak_life.py
- ExceptionInfo
- Round
- monopoly/engine.test.ts
- petak-perf.mjs
- racket/engine.ts
- petak-probe.mts
- createLazyFile
- petak.py
- petak-duo.mjs
- makeEntry
- house
- init
- makeBlendState
- makeVertexAttributes
- sport/ui/Lobby.tsx
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
- qiuqiu.ts
- hatch
- chibi.ts
- Stage
- shutil
- Demo.tsx
- vite.config.ts

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

## Communities (186 total, 46 thin omitted)

### Community 0 - "pbr"
Cohesion: 0.04
Nodes (130): akar_ayun(), arca(), batu_api(), batu_jatuh(), bola_api(), bola_permen(), bola_salju(), bus() (+122 more)

### Community 1 - "package.json"
Cohesion: 0.07
Nodes (25): config, name, private, type, version, @capacitor/android, @capacitor/cli, class-variance-authority (+17 more)

### Community 2 - "remi/types.ts"
Cohesion: 0.10
Nodes (33): deal(), removeIds(), bohong, advance(), cangkulan, trickWinner(), dropPairs(), joker (+25 more)

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
Nodes (37): src_assets_lottie_ludo_bomb, src_assets_lottie_ludo_boost, src_assets_lottie_ludo_capture, src_assets_lottie_ludo_home, src_assets_lottie_ludo_portal, src_assets_lottie_ludo_six, src_assets_lottie_ludo_slip, src_assets_ludo_ludo_lose (+29 more)

### Community 7 - "add"
Cohesion: 0.09
Nodes (73): bean(), add(), cheek(), cone(), crown(), eye(), ink_lines(), mat() (+65 more)

### Community 8 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 9 - "dependencies"
Cohesion: 0.04
Nodes (44): dependencies, @capacitor/android, @capacitor/core, class-variance-authority, cn, @fontsource/dela-gothic-one, @fontsource-variable/geist, gsap (+36 more)

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
Nodes (43): src_assets_lottie_dice_roll, src_assets_lottie_monopoly_bankrupt, src_assets_lottie_monopoly_build, src_assets_lottie_monopoly_card, src_assets_lottie_monopoly_jackpot, src_assets_lottie_monopoly_jail, src_assets_lottie_monopoly_rent, src_assets_lottie_monopoly_sold (+35 more)

### Community 23 - "remi/engine.ts"
Cohesion: 0.17
Nodes (23): BomDemo(), LudoDemo(), RemiDemo(), candidates(), lcg(), randomStep(), apply(), defaultOptions() (+15 more)

### Community 25 - "remi/cards.ts"
Cohesion: 0.15
Nodes (20): makeDeck(), nextWhere(), RANK_LABEL, RED, shuffled(), SUIT_SORT, after(), BOARD_AT (+12 more)

### Community 26 - "ludo.py"
Cohesion: 0.19
Nodes (28): no_lines(), ball(), bevel(), box(), cone_(), cyl(), die(), face() (+20 more)

### Community 27 - "KartBoard.tsx"
Cohesion: 0.06
Nodes (45): howler, src_assets_lottie_kart_boost, src_assets_lottie_kart_box, src_assets_lottie_kart_finish, src_assets_lottie_kart_hit, src_assets_lottie_kart_lap, AudioSettings, getSettings() (+37 more)

### Community 28 - "bom.py"
Cohesion: 0.16
Nodes (37): attach(), ball(), bevel(), big_eye(), bom_lose(), bom_win(), bomb(), boomerang() (+29 more)

### Community 29 - "ludo/board.ts"
Cohesion: 0.15
Nodes (27): apothem(), armAngle(), BOOST, cellPt(), circumR(), homePt(), innerR(), R0 (+19 more)

### Community 30 - "DominoTable.tsx"
Cohesion: 0.08
Nodes (31): src_assets_lottie_domino_blocked, src_assets_lottie_domino_chips, src_assets_lottie_domino_deal, src_assets_lottie_domino_score, src_assets_lottie_domino_slam, src_assets_lottie_domino_special, DominoDemo(), qiuName() (+23 more)

### Community 31 - "race.ts"
Cohesion: 0.05
Nodes (52): Stats, BOT_GRACE, COUNTDOWN, FINISH_GRACE, Controls, GRADE, Hud, Opts (+44 more)

### Community 32 - "sport_world.py"
Cohesion: 0.08
Nodes (59): export(), kosongkan adegan & cache material sebelum membangun model berikutnya, reset(), text3d(), to_meshes(), arena(), bake_lightmap(), build_archery() (+51 more)

### Community 33 - "release.mjs"
Cohesion: 0.20
Nodes (6): ref_node_child_process, ref_node_fs, { version }, [bump = 'patch', ...noteParts], [ma, mi, pa], pkg

### Community 34 - "bowling/scene.ts"
Cohesion: 0.09
Nodes (24): ref_assets_sport_models_bowling_glb_url, ref_assets_sport_models_bowling_lm_webp_url, ref_assets_sport_models_bowling_props_glb_url, Crowd, HAIRS, rowSeats(), seeded(), SHIRTS (+16 more)

### Community 35 - "kart/engine.ts"
Cohesion: 0.08
Nodes (50): BODIES, BODY_IDS, CHARACTERS, CUPS, ITEM_INFO, LEVEL_INFO, MAX_RACERS, ODDS (+42 more)

### Community 36 - "BomBoard.tsx"
Cohesion: 0.08
Nodes (40): src_assets_lottie_bom_boom, src_assets_lottie_bom_cancel, src_assets_lottie_bom_pass, src_assets_lottie_bom_power, src_assets_lottie_bom_spark, promptText(), cuesFor(), FxCue (+32 more)

### Community 37 - "bom/engine.ts"
Cohesion: 0.08
Nodes (55): fakeWord(), randomStep(), STEMS, aliveSeats(), BOOM_SECONDS, bump(), canAim(), canPower() (+47 more)

### Community 38 - "remi/bot.ts"
Cohesion: 0.13
Nodes (31): best(), Bet, betAction(), BetSpot, pickOne(), bigTwo(), bigTwoPlays(), blackjack() (+23 more)

### Community 39 - "monopoly/ui/art.tsx"
Cohesion: 0.16
Nodes (17): CODE, Buildings(), C, cellBox(), CORNER, Die(), label, parts() (+9 more)

### Community 40 - "monopoly/engine.ts"
Cohesion: 0.22
Nodes (22): nextOf(), advanceAuction(), afterMove(), alive(), charge(), Ctx, drawCard(), finish() (+14 more)

### Community 41 - "RemiTable.tsx"
Cohesion: 0.09
Nodes (29): src_assets_lottie_remi_bomb, src_assets_lottie_remi_bust, src_assets_lottie_remi_chips, src_assets_lottie_remi_deal, src_assets_lottie_remi_joker, src_assets_lottie_remi_liar, rankLabel(), Effect (+21 more)

### Community 42 - "racket/scene.ts"
Cohesion: 0.09
Nodes (16): ref_assets_sport_models_court_glb_url, ref_assets_sport_models_court_lm_webp_url, ref_assets_sport_models_hall_glb_url, ref_assets_sport_models_hall_lm_webp_url, ArenaSpec, Seat, KIND, ParticleKind (+8 more)

### Community 43 - "emotes.ts"
Cohesion: 0.08
Nodes (28): src_assets_emote_kaget, src_assets_emote_kaget_anim, src_assets_emote_keren, src_assets_emote_keren_anim, src_assets_emote_naksir, src_assets_emote_naksir_anim, src_assets_emote_nangis, src_assets_emote_nangis_anim (+20 more)

### Community 44 - "CardFace.tsx"
Cohesion: 0.11
Nodes (30): sortHand(), SUIT_NAME, SUIT_SYMBOL, suitIndex(), SUITS, sevenPenalty(), SevenState, Suit (+22 more)

### Community 45 - "masak_props.py"
Cohesion: 0.13
Nodes (17): ball(), bun_top(), chef_hat(), daging_tex(), disc(), lettuce_head(), lettuce_shred(), lumpy() (+9 more)

### Community 46 - "remi.py"
Cohesion: 0.15
Nodes (35): bevel(), card(), chip(), chip_sprite(), chip_stack(), circle_outline(), dealer_btn(), deck_sprite() (+27 more)

### Community 47 - "sport/engine.ts"
Cohesion: 0.13
Nodes (29): defaultOptions(), init(), initMatch(), reduce(), cleanLook(), start(), initBowling(), box() (+21 more)

### Community 48 - "MasakBoard.tsx"
Cohesion: 0.12
Nodes (20): Joystick(), starsOf(), RECIPES, starGoals(), Hud, Fx, Boil, FX_SOUND (+12 more)

### Community 49 - "blackjack.ts"
Cohesion: 0.25
Nodes (14): active(), advance(), bjTotal(), blackjack, draw(), isBlackjack(), MIN_BET, settle() (+6 more)

### Community 50 - "PetakBoard.tsx"
Cohesion: 0.08
Nodes (22): src_assets_lottie_petak_ciprat, src_assets_lottie_petak_ketangkap, src_assets_lottie_petak_lolos, src_assets_lottie_petak_tutup, actorOf(), ranking(), Hud, MISS_PENALTY (+14 more)

### Community 51 - "bowling/sim.ts"
Cohesion: 0.08
Nodes (38): botThrow(), noise(), WOBBLE, aimAt(), all, AUTO_THROW, callFor(), cleanThrow() (+30 more)

### Community 52 - "kart_world.py"
Cohesion: 0.20
Nodes (24): ball(), box(), camar(), cyl(), dermaga(), finish(), last(), mercusuar() (+16 more)

### Community 53 - "domino.py"
Cohesion: 0.16
Nodes (30): bevel(), bone_pile(), bone_sprite(), chain(), chip(), chip_sprite(), chip_stack(), coffee() (+22 more)

### Community 54 - "kart.py"
Cohesion: 0.12
Nodes (41): attach(), ball(), bevel(), body_bajaj(), body_bebek(), body_gerobak(), box(), cone_() (+33 more)

### Community 55 - "archery/scene.ts"
Cohesion: 0.11
Nodes (14): ref_assets_sport_models_archery_glb_url, ref_assets_sport_models_archery_lm_webp_url, makeCrowd(), makeGrass(), seeded(), tuft(), addWind(), ArcheryScene (+6 more)

### Community 56 - "hazards.ts"
Cohesion: 0.07
Nodes (37): anchors(), bridgeSamples(), groundOf(), GroundShape, smooth(), WATER_Y, blockPush(), BOX_RESPAWN (+29 more)

### Community 57 - "penalty/engine.ts"
Cohesion: 0.13
Nodes (22): sportBot(), boxingBot(), DIVES, penaltyBot(), WOBBLE, clamp(), decided(), fire() (+14 more)

### Community 58 - "ludo/engine.ts"
Cohesion: 0.20
Nodes (28): finishOf(), isSafe(), specialAt(), trackIndex(), trackLen(), botAction(), ludoBot(), score() (+20 more)

### Community 59 - "emote.py"
Cohesion: 0.18
Nodes (33): arc(), ball(), beat(), blush(), box(), drop(), head(), heart_points() (+25 more)

### Community 60 - "monopoly/types.ts"
Cohesion: 0.09
Nodes (26): AIRPORTS, BOARD, GROUP_HEX, GROUP_NAME, GROUPS, UTILITIES, Card, CardFx (+18 more)

### Community 61 - "SnakesBoard.tsx"
Cohesion: 0.05
Nodes (78): src_assets_lottie_card_pop, src_assets_lottie_item_pop, src_assets_lottie_ladder_up, src_assets_lottie_snake_bite, src_assets_snakes_snakes_lose, src_assets_snakes_snakes_win, nextRand(), shuffle() (+70 more)

### Community 62 - "uno/engine.ts"
Cohesion: 0.07
Nodes (79): UnoDemo(), faceLabel(), decide(), favoriteColor(), playCard(), score(), unoBot(), buildDeck() (+71 more)

### Community 63 - "kart/render/world.ts"
Cohesion: 0.07
Nodes (73): three, alamSide(), banner(), batch(), cornerMarks(), crossings(), eachSide(), fascia() (+65 more)

### Community 64 - "bigtwo.ts"
Cohesion: 0.17
Nodes (16): cardLabel(), bigtwo, bigTwoPenalty(), btRank(), btValue(), comboOf(), FIVE_ORDER, SUIT_V (+8 more)

### Community 65 - "Race"
Cohesion: 0.10
Nodes (8): r2(), Race, KartRig, recipeOf(), World, driftLevel(), Kart, magnetPull()

### Community 67 - "spy.py"
Cohesion: 0.17
Nodes (38): attach(), ball(), bean(), bevel(), box(), card(), card_back(), card_word() (+30 more)

### Community 68 - "SpyBoard.tsx"
Cohesion: 0.07
Nodes (48): src_assets_lottie_spy_caught, src_assets_lottie_spy_escape, src_assets_lottie_spy_guess, src_assets_lottie_spy_reveal, src_assets_lottie_spy_stamp, clueProblem(), guesser(), MR_WHITE_MIN (+40 more)

### Community 69 - "ludo/types.ts"
Cohesion: 0.22
Nodes (13): Arms, LudoAction, LudoOptions, LudoState, Move, Note, Special, eventText() (+5 more)

### Community 70 - "DrawBoard.tsx"
Cohesion: 0.08
Nodes (36): gsap, @gsap/react, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_confetti, src_assets_lottie_draw_close, src_assets_lottie_draw_correct, src_assets_lottie_draw_pick (+28 more)

### Community 72 - "models.ts"
Cohesion: 0.11
Nodes (25): ball(), BODY_FALLBACK, box(), build(), cache, clearModels(), compactCache, compactClone() (+17 more)

### Community 73 - "Dapur"
Cohesion: 0.20
Nodes (7): Dapur, lemari + peti kayu terbuka berisi bahan, loket saji: meja berwarna + rak atas berlampu hangat, lantai ubin, dinding belakang & samping. Sisi depan terbuka untuk kamera., `theme` = nama material per bagian; diisi skrip tiap dapur, sudut Z menghadap lantai (arah buka pertama), 0 = menghadap -Y Blender, lemari dapur: badan bertekstur, pintu bergaris, puncak tebal sedikit menjorok

### Community 74 - "chain.ts"
Cohesion: 0.17
Nodes (20): chainEngine(), finish(), HAND_SIZE, lowest(), opener(), round5(), evaluateQiu(), pairValue() (+12 more)

### Community 75 - "pathlib"
Cohesion: 0.03
Nodes (73): colorsys, contextlib, json, math, numpy, pathlib, random, isi_peti() (+65 more)

### Community 76 - "render/scene.ts"
Cohesion: 0.11
Nodes (19): ref_assets_masak_models_props_glb_url, ref_assets_sport_tex_langit_siang_hdr_url, ING, Layout, foodMesh(), itemKey(), KitchenScene, LAYER (+11 more)

### Community 78 - "vitest"
Cohesion: 0.08
Nodes (38): vitest, LM, Pt, seen(), torsoLength(), torsoVisible(), BowGesture, BowRead (+30 more)

### Community 79 - "bots.test.ts"
Cohesion: 0.11
Nodes (21): WORD_MAX, CATEGORIES, LETTERS, SYLLABLES, after(), Any, bomHost(), boxingHost() (+13 more)

### Community 80 - "ludo/engine.test.ts"
Cohesion: 0.33
Nodes (9): armsFor(), minArms(), defaultOptions(), init(), teamsAllowed(), base(), roll(), withDie() (+1 more)

### Community 81 - "games/types.ts"
Cohesion: 0.09
Nodes (25): cache, dots(), svgUrl(), terrazzo(), FEATURE_INFO, MODE_INFO, SPEED_INFO, Feature (+17 more)

### Community 82 - "arena.ts"
Cohesion: 0.19
Nodes (19): loadBody(), ADS, adTexture(), canvas(), dressArena(), glTexture(), MatSpec, scoreTexture() (+11 more)

### Community 83 - "react"
Cohesion: 0.06
Nodes (34): @hugeicons/react, radix-ui, react, src_assets_lottie_burst, setSettings(), useAudioSettings(), CREDITS, SoundButton() (+26 more)

### Community 84 - "kitchen.ts"
Cohesion: 0.12
Nodes (37): code(), finalCode(), nextStep(), Bot, COOK_SPEED, dist(), nearest(), Need (+29 more)

### Community 85 - "registry.ts"
Cohesion: 0.03
Nodes (77): App(), BOT_LEVELS, BotPanel(), floor, HostControls(), load(), makeCode(), PickedGame() (+69 more)

### Community 87 - "domino/types.ts"
Cohesion: 0.11
Nodes (35): candidates(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce() (+27 more)

### Community 89 - "masak/engine.ts"
Cohesion: 0.13
Nodes (22): actorOf(), defaultOptions(), init(), MAX_COOKS, MAX_PLAYERS, MIN_PLAYERS, reduce(), Actor (+14 more)

### Community 91 - "draw/engine.ts"
Cohesion: 0.05
Nodes (68): drawBot(), guess(), Plan, SILLY, advance(), canGuess(), CANVAS, CHOOSE_SECONDS (+60 more)

### Community 92 - "sim.test.ts"
Cohesion: 0.09
Nodes (43): map, nav, rows, SIZE, Box, Brain, CATCH_RANGE, CATCH_TOLERANCE (+35 more)

### Community 94 - "kart_props.py"
Cohesion: 0.19
Nodes (8): bpy, mathutils, bounds(), convert(), reset(), import_obj(), normalize(), Path

### Community 95 - "spy/bot.ts"
Cohesion: 0.16
Nodes (19): bankFor(), bomBot(), pickWord(), BY_CATEGORY, CATEGORY_WORDS, GENERAL_WORDS, src_games_bom_engine_normalize, wordProblem() (+11 more)

### Community 96 - "spy/types.ts"
Cohesion: 0.13
Nodes (16): spyBot(), spy, FxCue, FxName, SoundCue, Clue, Pack, Phase (+8 more)

### Community 97 - "domino/ui/RoundEnd.tsx"
Cohesion: 0.20
Nodes (12): QIU_NAMES, modeArt(), sprite(), SPRITES, eventText(), roundText(), who(), Chips() (+4 more)

### Community 103 - "spy/engine.ts"
Cohesion: 0.10
Nodes (42): SpyDemo(), decide(), CLUES, randomStep(), afterOut(), aliveSeats(), BAD, bump() (+34 more)

### Community 105 - "Sheets.tsx"
Cohesion: 0.18
Nodes (26): groupOf(), ownable(), completes(), decide(), monopolyBot(), pick(), priceOf(), proposal() (+18 more)

### Community 107 - "capture.mjs"
Cohesion: 0.25
Nodes (6): chrome, pending, profile, send(), [url, out, w = '390', h = '844', scale = '2', wait = '0', script = ''], ws

### Community 108 - "Particles"
Cohesion: 0.15
Nodes (8): glbUrl(), loadModels(), Particles, Champ, numberTex(), PLACE, Podium, PodiumView()

### Community 109 - "Map"
Cohesion: 0.05
Nodes (23): last(), Map, material beralpha dari larik tinggi × lebar × 4; nama `decal_*` membuat shader…, tempelan: axis 'z' = di lantai, 'x'/'y' = di dinding sepanjang sumbu itu,…, model Poly Haven: digabung, poligon disusutkan, tekstur diperkecil; disimpan…, salinan model scan. `height`/`width` menyamakan tinggi atau sisi terpanjang;…, serakan kecil: satu model disalin ke banyak titik, jadi satu objek `detail_*`…, material dari larik gambar buatan sendiri (tinggi × lebar × 3, nilai 0..1 sRGB) (+15 more)

### Community 110 - "sport/types.ts"
Cohesion: 0.11
Nodes (29): src_assets_lottie_sport_ko, DEFENSE, PUNCH_CHANCE, BREAK_MS, CAMERA_GRACE_MS, closeRound(), damage(), defend() (+21 more)

### Community 111 - "kitchens.ts"
Cohesion: 0.14
Nodes (16): out, AFTER, cache, CELL, COUNTER_TOP, finalState(), FoodState, KIND (+8 more)

### Community 112 - "petak/engine.ts"
Cohesion: 0.08
Nodes (37): src_assets_petak_maps_dapur, src_assets_petak_maps_gang, src_assets_petak_maps_kapal, src_assets_petak_maps_kota, src_assets_petak_maps_museum, src_assets_petak_maps_pabrik, src_assets_petak_maps_pasar, src_assets_petak_maps_stasiun (+29 more)

### Community 113 - "Slab.tsx"
Cohesion: 0.06
Nodes (62): lottie-react, @mediapipe/tasks-vision, src_assets_lottie_sport_ace, src_assets_lottie_sport_bullseye, src_assets_lottie_sport_goal, src_assets_lottie_sport_gutter, src_assets_lottie_sport_spare, src_assets_lottie_sport_strike (+54 more)

### Community 114 - "sport_chars.py"
Cohesion: 0.11
Nodes (38): acc_1(), acc_2(), acc_3(), action(), animate(), attach(), bake(), bow() (+30 more)

### Community 115 - "masak/round.ts"
Cohesion: 0.16
Nodes (18): ids, secs, layoutOf(), HAT_POS, Pose, r2(), Remote, RoundOptions (+10 more)

### Community 117 - "petak/render/world.ts"
Cohesion: 0.09
Nodes (20): mapData, ASSETS, clothShader(), cloudShade(), edgeA, edgeB, extend(), GRADE (+12 more)

### Community 118 - "build.py"
Cohesion: 0.10
Nodes (37): ndarray, bom_music(), domino_music(), draw_music(), _env(), ff(), kart_music(), kart_synth() (+29 more)

### Community 119 - "painter.ts"
Cohesion: 0.09
Nodes (20): ref_assets_petak_models_bunglon_glb_url, loader, solidPaint(), Dab, DECODE_GLSL, decodePaint(), encodeLinear(), NET_SIZE (+12 more)

### Community 120 - "archery/engine.ts"
Cohesion: 0.15
Nodes (23): arc(), shoot(), botShot(), noise(), WIND_READ, WOBBLE, ARROWS, AUTO_AIM (+15 more)

### Community 121 - "Round"
Cohesion: 0.11
Nodes (9): finishHunt(), freeHiders(), hiders(), isSeeker(), reduce(), Round, newBrain(), play() (+1 more)

### Community 122 - "RacketScene"
Cohesion: 0.21
Nodes (5): RacketScene, shuttle(), RacketShot, RacketSport, RacketBoard()

### Community 123 - "life.ts"
Cohesion: 0.09
Nodes (19): ref_assets_petak_models_ayam_glb_url, ref_assets_petak_models_kucing_glb_url, ref_assets_petak_models_merpati_glb_url, ref_assets_petak_models_warga_glb_url, MapInfo, Bird, Flock, fly (+11 more)

### Community 125 - "petak_gang.py"
Cohesion: 0.09
Nodes (11): fasad(), gerobak(), jemuran(), motor(), mural(), motor bebek: rangka lengkung, tameng depan, jok, velg jari-jari, spion, dan…, gerobak bakso: lemari kaca, panci berasap, payung bergaris, dan roda jari-jari, dua tiang + tali + kain yang bergoyang (+3 more)

### Community 126 - "penalty/scene.ts"
Cohesion: 0.18
Nodes (10): ref_assets_sport_models_pitch_glb_url, ref_assets_sport_models_pitch_lm_webp_url, loadChibi(), DETAIL, addStripes(), ballTexture(), PenaltyScene, SHOT_MS (+2 more)

### Community 127 - "boxing/scene.ts"
Cohesion: 0.13
Nodes (12): ref_assets_sport_models_boxing_glb_url, ref_assets_sport_models_boxing_lm_webp_url, lightShaft(), squareSeats(), Clip, BoxingScene, canvasTexture(), Fighter (+4 more)

### Community 128 - "domino/bot.ts"
Cohesion: 0.30
Nodes (15): chainAction(), chainValue(), dominoBot(), placed(), qiuAction(), qiuPower(), canPass(), chainPlayable() (+7 more)

### Community 129 - "Seat"
Cohesion: 0.16
Nodes (12): Chunk, CHUNK_BYTES, CHUNK_GAP_MS, fromBase64(), Incoming, join(), Need, PaintSync (+4 more)

### Community 130 - "petak/round.ts"
Cohesion: 0.14
Nodes (14): POSE_LABEL, PoseId, POSES, blobShadow(), BOT_SHARP, Pose, r2(), Remote (+6 more)

### Community 131 - "export.py"
Cohesion: 0.19
Nodes (9): datetime, pil, main(), Satukan frame stiker emote (brand/illustrations/emote/frames) jadi WebP animasi…, union_box(), main(), Ekspor render Blender per game (brand/illustrations/<game>/*.png) ke WebP untuk…, size_for() (+1 more)

### Community 132 - "abort"
Cohesion: 0.12
Nodes (18): abort(), assert(), assignWasmExports(), createWasm(), receiveInstance(), receiveInstantiationResult(), findWasmBinary(), forceLoadFile() (+10 more)

### Community 133 - "petak_body.py"
Cohesion: 0.20
Nodes (16): bmesh, action(), animate(), build_pupils(), build_rig(), build_skin(), key(), main() (+8 more)

### Community 134 - "petak_life.py"
Cohesion: 0.27
Nodes (14): action(), ayam(), bind(), key(), kucing(), merpati(), warga: satu kulit tanpa sambungan, baju dan celana dibagi dari wilayah badan,…, ayam kampung: badan bulat, jengger, ekor tegak; klip jalan dan mematuk (+6 more)

### Community 137 - "monopoly/engine.test.ts"
Cohesion: 0.25
Nodes (11): MonopolyDemo(), botAction(), randomStep(), defaultOptions(), init(), base(), simulate(), withDice() (+3 more)

### Community 138 - "petak-perf.mjs"
Cohesion: 0.24
Nodes (10): chrome, errors, js(), maps, pending, profile, ready(), send() (+2 more)

### Community 139 - "racket/engine.ts"
Cohesion: 0.20
Nodes (13): reduceMatch(), CAMERA_GRACE_MS, clamp(), flightMs(), KINDS, landBackupMs(), POINT_MS, reduceRacket() (+5 more)

### Community 140 - "petak-probe.mts"
Cohesion: 0.20
Nodes (7): @supabase/supabase-js, a, b, env, rx, seen, tx

### Community 141 - "createLazyFile"
Cohesion: 0.31
Nodes (7): createLazyFile(), stream_ops, writeChunks(), get_char(), mmap(), position(), read()

### Community 142 - "petak.py"
Cohesion: 0.60
Nodes (4): clear(), bunglon(), ember(), scene_tile()

### Community 143 - "petak-duo.mjs"
Cohesion: 0.38
Nodes (6): ref_node_os, chrome, page(), profile, sleep(), until()

### Community 144 - "makeEntry"
Cohesion: 0.33
Nodes (6): makeBufferEntry(), makeEntries(), makeEntry(), makeSamplerEntry(), makeStorageTextureEntry(), makeTextureEntry()

### Community 145 - "house"
Cohesion: 0.47
Nodes (5): house(), frame(), jendela(), pintu(), `front` = sisi ke gang. Dinding depan benar-benar berlubang: jendela dan pintu…

### Community 147 - "makeBlendState"
Cohesion: 0.40
Nodes (5): makeBlendComponent(), makeBlendState(), makeColorState(), makeColorStates(), makeFragmentState()

### Community 148 - "makeVertexAttributes"
Cohesion: 0.40
Nodes (5): makeVertexAttribute(), makeVertexAttributes(), makeVertexBuffer(), makeVertexBuffers(), makeVertexState()

### Community 149 - "sport/ui/Lobby.tsx"
Cohesion: 0.20
Nodes (12): CALL_WORD, END_INFO, FRAME_INFO, POINT_INFO, ROUND_INFO, SPORT_INFO, summary(), ENDS (+4 more)

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

### Community 179 - "qiuqiu.ts"
Cohesion: 0.36
Nodes (11): after(), canAct(), CAT_RANK, compareQiu(), live(), nextStreet(), qiuEngine(), qiuPot() (+3 more)

### Community 180 - "hatch"
Cohesion: 0.09
Nodes (34): @capacitor/core, @hugeicons/core-free-icons, Home(), RoomCode(), src_assets_lottie_loader, Banner(), Props, floor (+26 more)

### Community 181 - "chibi.ts"
Cohesion: 0.33
Nodes (7): ref_assets_sport_models_chibi_glb_url, ACCESSORIES, HAIR_STYLES, HAIRS, PANTS, SHIRTS, SKINS

### Community 184 - "Demo.tsx"
Cohesion: 0.22
Nodes (3): NAMES, SportId, SportBoard()

### Community 185 - "vite.config.ts"
Cohesion: 0.33
Nodes (5): ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, pkg

## Knowledge Gaps
- **639 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+634 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1532 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **46 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Seat` connect `Seat` to `domino/bot.ts`, `petak/round.ts`, `remi/types.ts`, `LudoBoard.tsx`, `Round`, `racket/engine.ts`, `MonopolyBoard.tsx`, `remi/engine.ts`, `remi/cards.ts`, `KartBoard.tsx`, `DominoTable.tsx`, `race.ts`, `kart/engine.ts`, `BomBoard.tsx`, `bom/engine.ts`, `remi/bot.ts`, `monopoly/engine.ts`, `RemiTable.tsx`, `CardFace.tsx`, `sport/engine.ts`, `blackjack.ts`, `qiuqiu.ts`, `bowling/sim.ts`, `penalty/engine.ts`, `ludo/engine.ts`, `monopoly/types.ts`, `SnakesBoard.tsx`, `uno/engine.ts`, `SpyBoard.tsx`, `ludo/types.ts`, `DrawBoard.tsx`, `chain.ts`, `games/types.ts`, `react`, `registry.ts`, `domino/types.ts`, `masak/engine.ts`, `draw/engine.ts`, `spy/bot.ts`, `spy/types.ts`, `domino/ui/RoundEnd.tsx`, `spy/engine.ts`, `Sheets.tsx`, `sport/types.ts`, `petak/engine.ts`, `masak/round.ts`, `archery/engine.ts`, `Round`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `Race` connect `Race` to `kart/engine.ts`, `Particles`, `hazards.ts`, `KartBoard.tsx`, `race.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `package.json`, `LudoBoard.tsx`, `monopoly/engine.test.ts`, `sport/ui/Lobby.tsx`, `MonopolyBoard.tsx`, `remi/engine.ts`, `KartBoard.tsx`, `DominoTable.tsx`, `kart/engine.ts`, `BomBoard.tsx`, `bom/engine.ts`, `RemiTable.tsx`, `emotes.ts`, `CardFace.tsx`, `sport/engine.ts`, `MasakBoard.tsx`, `PetakBoard.tsx`, `bowling/sim.ts`, `hatch`, `chibi.ts`, `Demo.tsx`, `SnakesBoard.tsx`, `uno/engine.ts`, `SpyBoard.tsx`, `ludo/types.ts`, `DrawBoard.tsx`, `games/types.ts`, `registry.ts`, `domino/types.ts`, `masak/engine.ts`, `draw/engine.ts`, `spy/types.ts`, `domino/ui/RoundEnd.tsx`, `Sheets.tsx`, `sport/types.ts`, `petak/engine.ts`, `Slab.tsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _639 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pbr` be split into smaller, more focused modules?**
  _Cohesion score 0.0434294691953765 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `remi/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09988385598141696 - nodes in this community are weakly interconnected._