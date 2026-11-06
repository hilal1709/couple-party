# Graph Report - game  (2026-11-06)

## Corpus Check
- 851 files · ~4,615,644 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 238 file(s) not represented in the graph (top: .glb 223, .blend 4, .hdr 3)

## Summary
- 6951 nodes · 20343 edges · 227 communities (182 shown, 45 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 449 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `edbd46cc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- bom/engine.ts
- petak/engine.ts
- rules.test.ts
- kart_hd.py
- vision_wasm_internal.js
- puncak_tex.py
- DrawBoard.tsx
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
- three
- monopoly.py
- nextRand
- remi/engine.ts
- vite-env.d.ts
- package.json
- ludo.py
- registry.ts
- bom.py
- jinak.py
- pbr
- race.ts
- cube
- kart/render/quality.ts
- games/types.ts
- KartBoard.tsx
- BomBoard.tsx
- petak_lib.py
- remi/bot.ts
- draw/types.ts
- monopoly/engine.ts
- masak_koki.py
- draw/engine.ts
- emotes.ts
- remi/ui/copy.ts
- masak_props.py
- remi.py
- puncak/render/scene.ts
- MasakBoard.tsx
- tali_kit.py
- PetakBoard.tsx
- BowlingBoard.tsx
- kart_world.py
- domino.py
- kart.py
- Round
- spy/ui/Lobby.tsx
- paintSync.ts
- ludo/engine.ts
- emote.py
- TaliBoard.tsx
- puncak/render/models.ts
- UnoTable.tsx
- kart/render/world.ts
- remi/cards.ts
- Race
- system_io
- spy.py
- RemiTable.tsx
- tali/sim/physics.ts
- modules.ts
- system_linq
- kart/render/models.ts
- World
- puncak/round.ts
- pathlib
- masak/render/scene.ts
- Course
- vitest
- bots.test.ts
- tali_songs.py
- sunyi/engine.ts
- kitchen.test.ts
- boxing/scene.ts
- mathutils
- useRoom.ts
- system_text
- puncak/sim/hazards.ts
- unityeditor
- tracks.ts
- unityeditor_build
- SpyBoard.tsx
- particles.ts
- unityeditor_build_reporting
- Painter
- sport/types.ts
- monopoly/sounds.ts
- monopoly/bot.ts
- system_collections_generic
- unityeditor_scenemanagement
- unityengine
- unityengine_rendering
- unityengine_rendering_universal
- spy/engine.ts
- unityengine_ui
- Sheets.tsx
- nunit_framework
- sim/terrain.ts
- runner.ts
- Map
- PenaltyBoard.tsx
- kitchens.ts
- bomb.ts
- BowlCamera.tsx
- sport_chars.py
- remi/types.ts
- system
- petak/render/world.ts
- build.py
- sunyi/render/world.ts
- dialog.tsx
- Round
- tali/round.ts
- petak/render/life.ts
- transport.ts
- petak_gang.py
- monopoly/types.ts
- petak-duo.mjs
- blackjack.ts
- Climber
- audio.py
- export.py
- abort
- petak_body.py
- petak_life.py
- ExceptionInfo
- Round
- monopoly/engine.test.ts
- ref_node_fs
- Kit
- draw/ui/copy.ts
- createLazyFile
- monopoly/ui/art.tsx
- BoxingScene
- makeEntry
- sunyi/round.ts
- init
- makeBlendState
- makeVertexAttributes
- tali_chars.py
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
- BombScene
- jinak/engine.ts
- climb.ts
- snakes/engine.ts
- shutil
- App.tsx
- sunyi/sim/nav.ts
- masak_luar.py
- kart_lib.py
- SunyiBoard.tsx
- build.ts
- masak/round.ts
- Round
- petak_museum.py
- monopoly/ui/copy.ts
- spy/bot.ts
- petak-perf.mjs
- ArcheryBoard.tsx
- sphere
- petak-probe.mts
- masak-calibrate.mts
- kitchen.ts
- bake_mods
- jinak_ill.py
- jinak/render/stage.ts
- MountainScene
- petak/round.ts
- VoiceLink
- devDependencies
- tali/render/fx.ts
- react
- poker.ts
- audio.ts
- ManualView.tsx
- tali-duo.mjs
- racket/scene.ts
- actor.ts
- jinak-shot.mjs
- sketches.ts
- tali_lib.py
- Stage
- extract-tex.mjs
- jinak/ui/copy.ts
- scripts
- Skids
- Demo.tsx
- RopeView
- kerang

## God Nodes (most connected - your core abstractions)
1. `Seat` - 121 edges
2. `react` - 103 edges
3. `add()` - 94 edges
4. `pbr()` - 94 edges
5. `cyl()` - 86 edges
6. `st()` - 74 edges
7. `sphere()` - 72 edges
8. `mat()` - 66 edges
9. `anim()` - 66 edges
10. `layer()` - 65 edges

## Surprising Connections (you probably didn't know these)
- `Neutral` --references--> `paper()`  [INFERRED]
  DESIGN.md → scripts/blender/jinak.py
- `Secondary` --references--> `grass()`  [INFERRED]
  DESIGN.md → scripts/puncak_tex.py
- `Kredit audio Couple Party` --references--> `puncak_synth()`  [INFERRED]
  public/audio/CREDITS.md → scripts/audio/build.py
- `Kredit audio Couple Party` --references--> `puncak_music()`  [INFERRED]
  public/audio/CREDITS.md → scripts/audio/build.py
- `Kredit audio Couple Party` --references--> `tali_synth()`  [INFERRED]
  public/audio/CREDITS.md → scripts/audio/build.py

## Import Cycles
- None detected.

## Communities (227 total, 45 thin omitted)

### Community 0 - "bom/engine.ts"
Cohesion: 0.09
Nodes (56): bankFor(), bomBot(), pickWord(), fakeWord(), randomStep(), STEMS, aliveSeats(), BOOM_SECONDS (+48 more)

### Community 1 - "petak/engine.ts"
Cohesion: 0.08
Nodes (38): src_assets_petak_maps_dapur, src_assets_petak_maps_gang, src_assets_petak_maps_kapal, src_assets_petak_maps_kota, src_assets_petak_maps_museum, src_assets_petak_maps_pabrik, src_assets_petak_maps_pasar, src_assets_petak_maps_stasiun (+30 more)

### Community 2 - "rules.test.ts"
Cohesion: 0.10
Nodes (25): SUIT_NAME, bohong, advance(), cangkulan, cangkulPlayable(), mustDig(), trickWinner(), dropPairs() (+17 more)

### Community 3 - "kart_hd.py"
Cohesion: 0.16
Nodes (34): arch(), bev(), body_bajaj(), body_bebek(), body_gerobak(), chrome_pipe(), cube(), curve_tube() (+26 more)

### Community 4 - "vision_wasm_internal.js"
Cohesion: 0.01
Nodes (17): RFC-2279, RFC-3629, NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),, NOTE: This is also used as the process return code in shell environments, TODO: check for O_SEARCH? (== search for dir only), NOTE: None of the defaults here are true. We're just returning safe and, TODO: Use mozResponseArrayBuffer, responseStream, etc. if available., TODO: Due to Closure regression https://github.com/google/closure-… (+9 more)

### Community 5 - "puncak_tex.py"
Cohesion: 0.06
Nodes (65): Buttons (Slab), Cards / Containers, Colors, Components, Design System: Couple Party, Discard Ring and Podium (signature), Do:, Do's and Don'ts (+57 more)

### Community 6 - "DrawBoard.tsx"
Cohesion: 0.09
Nodes (37): src_assets_lottie_draw_close, src_assets_lottie_draw_correct, src_assets_lottie_draw_pick, src_assets_lottie_draw_reveal, src_assets_lottie_draw_timeup, CANVAS, CHOOSE_SECONDS, hintCount() (+29 more)

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

### Community 20 - "three"
Cohesion: 0.06
Nodes (71): ref_assets_tali_models_kit_glb_url, ref_assets_tali_models_klepon_glb_url, ref_assets_tali_models_onde_glb_url, three, cache, cloneKit(), gltf, KART (+63 more)

### Community 21 - "monopoly.py"
Cohesion: 0.09
Nodes (63): arrow_go(), ball(), bevel(), bill_stack(), box(), bulb(), card(), card_chance() (+55 more)

### Community 22 - "nextRand"
Cohesion: 0.08
Nodes (43): ref_assets_puncak_models_pendaki_glb_url, actorOf(), defaultOptions(), init(), MAX_CLIMBERS, MAX_PLAYERS, MIN_PLAYERS, pickMountain() (+35 more)

### Community 23 - "remi/engine.ts"
Cohesion: 0.22
Nodes (18): candidates(), randomStep(), apply(), defaultOptions(), engineFor(), init(), matchOver(), reduce() (+10 more)

### Community 25 - "package.json"
Cohesion: 0.06
Nodes (34): config, name, private, type, version, @capacitor/android, @capacitor/cli, cn (+26 more)

### Community 26 - "ludo.py"
Cohesion: 0.19
Nodes (28): no_lines(), ball(), bevel(), box(), cone_(), cyl(), die(), face() (+20 more)

### Community 27 - "registry.ts"
Cohesion: 0.05
Nodes (36): src_assets_bom_tile_bom, src_assets_domino_tile_domino, src_assets_draw_tile_draw, src_assets_jinak_tile_jinak, src_assets_ludo_tile_ludo, src_assets_masak_tile_masak, src_assets_monopoly_tile_monopoly, src_assets_petak_tile_petak (+28 more)

### Community 28 - "bom.py"
Cohesion: 0.16
Nodes (37): attach(), ball(), bevel(), big_eye(), bom_lose(), bom_win(), bomb(), boomerang() (+29 more)

### Community 29 - "jinak.py"
Cohesion: 0.10
Nodes (51): active(), apply_mods(), bake(), run(), box(), brass(), build_battery(), build_blank() (+43 more)

### Community 30 - "pbr"
Cohesion: 0.04
Nodes (115): akar_ayun(), arca(), batu_api(), batu_jatuh(), bola_api(), bola_permen(), bola_salju(), bus() (+107 more)

### Community 31 - "race.ts"
Cohesion: 0.06
Nodes (56): Stats, statsFor(), BOT_GRACE, COUNTDOWN, FINISH_GRACE, Controls, GRADE, Opts (+48 more)

### Community 32 - "cube"
Cohesion: 0.07
Nodes (66): papan_neon(), Papan reklame neon: tiang, bingkai, layar bernama `screen` (diwarnai/diganti di…, cube(), kosongkan adegan & cache material sebelum membangun model berikutnya, reset(), text3d(), gapura_sawah(), jembatan_layang() (+58 more)

### Community 33 - "kart/render/quality.ts"
Cohesion: 0.36
Nodes (7): detectQuality(), initialTier(), probeQuality(), Quality, QUALITY_INFO, savedQuality(), TIERS

### Community 34 - "games/types.ts"
Cohesion: 0.04
Nodes (130): src_assets_lottie_domino_blocked, src_assets_lottie_domino_chips, src_assets_lottie_domino_deal, src_assets_lottie_domino_score, src_assets_lottie_domino_slam, src_assets_lottie_domino_special, DominoDemo(), Bet (+122 more)

### Community 35 - "KartBoard.tsx"
Cohesion: 0.05
Nodes (76): src_assets_lottie_kart_boost, src_assets_lottie_kart_box, src_assets_lottie_kart_finish, src_assets_lottie_kart_hit, src_assets_lottie_kart_lap, BODIES, BODY_IDS, CHARACTERS (+68 more)

### Community 36 - "BomBoard.tsx"
Cohesion: 0.08
Nodes (46): src_assets_lottie_bom_cancel, src_assets_lottie_bom_pass, src_assets_lottie_bom_power, src_assets_lottie_bom_spark, promptText(), cuesFor(), FxCue, FxName (+38 more)

### Community 37 - "petak_lib.py"
Cohesion: 0.05
Nodes (34): bmesh, contextlib, random, pori(), street_lamp(), lentera(), decal_set(), tempelan prosedural: noda hujan, lumut, retak, tanah, noda oli, poster, dan… (+26 more)

### Community 38 - "remi/bot.ts"
Cohesion: 0.17
Nodes (25): best(), pickOne(), bigTwo(), bigTwoPlays(), blackjack(), bohong(), cangkulan(), CATEGORY_POWER (+17 more)

### Community 39 - "draw/types.ts"
Cohesion: 0.18
Nodes (15): drawBot(), guess(), Plan, SILLY, draw, DrawAction, DrawOptions, DrawState (+7 more)

### Community 40 - "monopoly/engine.ts"
Cohesion: 0.20
Nodes (24): nextOf(), advanceAuction(), afterMove(), alive(), charge(), Ctx, drawCard(), finish() (+16 more)

### Community 41 - "masak_koki.py"
Cohesion: 0.15
Nodes (40): action(), animate(), at_head(), ayam(), bake(), ball(), bebek(), beruang() (+32 more)

### Community 42 - "draw/engine.ts"
Cohesion: 0.18
Nodes (21): advance(), copy(), deal(), defaultOptions(), DRAWER_POINTS, GUESS_POINTS, init(), isCorrect() (+13 more)

### Community 43 - "emotes.ts"
Cohesion: 0.09
Nodes (19): src_assets_emote_kaget, src_assets_emote_kaget_anim, src_assets_emote_keren, src_assets_emote_keren_anim, src_assets_emote_naksir, src_assets_emote_naksir_anim, src_assets_emote_nangis, src_assets_emote_nangis_anim (+11 more)

### Community 44 - "remi/ui/copy.ts"
Cohesion: 0.09
Nodes (36): cardLabel(), rankLabel(), sortHand(), suitIndex(), BjResult, modeArt(), SEAT_HEX, sprite() (+28 more)

### Community 45 - "masak_props.py"
Cohesion: 0.04
Nodes (57): ball(), banana_peel(), banana_slices(), batter_bowl(), bowl(), bun_top(), chef_hat(), cucumber() (+49 more)

### Community 46 - "remi.py"
Cohesion: 0.15
Nodes (35): bevel(), card(), chip(), chip_sprite(), chip_stack(), circle_outline(), dealer_btn(), deck_sprite() (+27 more)

### Community 47 - "puncak/render/scene.ts"
Cohesion: 0.06
Nodes (68): Tex, texIndex(), clouds(), heightTexture(), lava(), water(), waterfall(), bat() (+60 more)

### Community 48 - "MasakBoard.tsx"
Cohesion: 0.04
Nodes (61): lottie-react, src_assets_lottie_loader, src_assets_lottie_ludo_bomb, src_assets_lottie_ludo_boost, src_assets_lottie_ludo_capture, src_assets_lottie_ludo_home, src_assets_lottie_ludo_portal, src_assets_lottie_ludo_six (+53 more)

### Community 49 - "tali_kit.py"
Cohesion: 0.12
Nodes (49): antena(), arca(), baju(), build(), candi_jauh(), cerobong(), finish(), gapura() (+41 more)

### Community 50 - "PetakBoard.tsx"
Cohesion: 0.07
Nodes (28): src_assets_lottie_petak_ciprat, src_assets_lottie_petak_ketangkap, src_assets_lottie_petak_lolos, src_assets_lottie_petak_tutup, actorOf(), ranking(), POSE_LABEL, POSES (+20 more)

### Community 51 - "BowlingBoard.tsx"
Cohesion: 0.05
Nodes (68): ref_assets_sport_models_bowling_glb_url, ref_assets_sport_models_bowling_lm_webp_url, ref_assets_sport_models_bowling_props_glb_url, src_assets_lottie_sport_gutter, src_assets_lottie_sport_spare, src_assets_lottie_sport_strike, cuesFor(), SoundCue (+60 more)

### Community 52 - "kart_world.py"
Cohesion: 0.20
Nodes (24): ball(), box(), camar(), cyl(), dermaga(), finish(), last(), mercusuar() (+16 more)

### Community 53 - "domino.py"
Cohesion: 0.16
Nodes (30): bevel(), bone_pile(), bone_sprite(), chain(), chip(), chip_sprite(), chip_stack(), coffee() (+22 more)

### Community 54 - "kart.py"
Cohesion: 0.12
Nodes (41): attach(), ball(), bevel(), body_bajaj(), body_bebek(), body_gerobak(), box(), cone_() (+33 more)

### Community 55 - "Round"
Cohesion: 0.09
Nodes (11): r2(), Round, routeIndexNear(), BodyEvent, maxStamina(), Sky, stormAt(), windAt() (+3 more)

### Community 56 - "spy/ui/Lobby.tsx"
Cohesion: 0.12
Nodes (24): MR_WHITE_MIN, POINTS, roleCounts(), Clue, Pack, Phase, Role, RoundResult (+16 more)

### Community 57 - "paintSync.ts"
Cohesion: 0.15
Nodes (11): Chunk, CHUNK_BYTES, CHUNK_GAP_MS, fromBase64(), Incoming, join(), Need, PaintSync (+3 more)

### Community 58 - "ludo/engine.ts"
Cohesion: 0.05
Nodes (100): apothem(), armAngle(), armsFor(), BOOST, cellPt(), circumR(), finishOf(), homePt() (+92 more)

### Community 59 - "emote.py"
Cohesion: 0.18
Nodes (33): arc(), ball(), beat(), blush(), box(), drop(), head(), heart_points() (+25 more)

### Community 60 - "TaliBoard.tsx"
Cohesion: 0.08
Nodes (42): setMusicRate(), better(), defaultOptions(), freshLevel(), init(), PLAYERS, reduce(), scoreLevel() (+34 more)

### Community 61 - "puncak/render/models.ts"
Cohesion: 0.11
Nodes (25): cache, inkInstanced(), inkMaterial(), inkSkinned(), cache, decor(), decorFor(), GLB (+17 more)

### Community 62 - "UnoTable.tsx"
Cohesion: 0.06
Nodes (87): src_assets_lottie_burst, UnoDemo(), shuffle(), CardFace, COLOR_NAME, cornerText(), DARK_SIDE, DARK_WHEEL (+79 more)

### Community 63 - "kart/render/world.ts"
Cohesion: 0.08
Nodes (71): alamSide(), banner(), batch(), cornerMarks(), crossings(), eachSide(), fascia(), gantry() (+63 more)

### Community 64 - "remi/cards.ts"
Cohesion: 0.13
Nodes (20): deal(), makeDeck(), RANK_LABEL, RED, removeIds(), shuffled(), SUIT_SORT, SUIT_SYMBOL (+12 more)

### Community 65 - "Race"
Cohesion: 0.10
Nodes (9): r2(), Race, recipeOf(), World, driftLevel(), hitKart(), isShielded(), Kart (+1 more)

### Community 67 - "spy.py"
Cohesion: 0.17
Nodes (38): attach(), ball(), bean(), bevel(), box(), card(), card_back(), card_word() (+30 more)

### Community 68 - "RemiTable.tsx"
Cohesion: 0.12
Nodes (22): src_assets_lottie_remi_bomb, src_assets_lottie_remi_bust, src_assets_lottie_remi_chips, src_assets_lottie_remi_deal, src_assets_lottie_remi_joker, src_assets_lottie_remi_liar, terrazzo(), KartBoard() (+14 more)

### Community 69 - "tali/sim/physics.ts"
Cohesion: 0.06
Nodes (41): CANDY_REACH, Client, GOAL_HALF, spawnPoint(), bits(), CRUMBLE_BACK, CRUMBLE_SHAKE, groupsOn() (+33 more)

### Community 70 - "modules.ts"
Cohesion: 0.06
Nodes (47): BIT, BUTTON_COLORS, BUTTON_LABELS, buttonHold(), COLUMN_LETTERS, count(), firstOf(), hasSticker() (+39 more)

### Community 72 - "kart/render/models.ts"
Cohesion: 0.10
Nodes (27): ball(), BODY_FALLBACK, box(), build(), cache, clearModels(), compactCache, compactClone() (+19 more)

### Community 74 - "puncak/round.ts"
Cohesion: 0.06
Nodes (55): ANISO, puncakTier(), Action, Hud, MODES, Op, Pop, Pose (+47 more)

### Community 75 - "pathlib"
Cohesion: 0.09
Nodes (24): math, numpy, pathlib, isi_peti(), bahan yang menyembul dari peti; titik tengah dibiarkan rendah supaya barang…, es_tex(), es biru pucat dengan retakan putih dan gelembung, isi_umum() (+16 more)

### Community 76 - "masak/render/scene.ts"
Cohesion: 0.07
Nodes (32): ref_assets_masak_models_props_glb_url, ref_assets_sport_tex_langit_siang_hdr_url, Layout, bakeIcons(), Perf, Bubble, bubbleKey(), foodMesh() (+24 more)

### Community 77 - "Course"
Cohesion: 0.11
Nodes (27): apungExtra, atapExtra, bromoExtra, candiExtra, Course, guaExtra, block(), door() (+19 more)

### Community 78 - "vitest"
Cohesion: 0.08
Nodes (39): vitest, LM, Pt, seen(), torsoLength(), torsoVisible(), BowGesture, BowRead (+31 more)

### Community 79 - "bots.test.ts"
Cohesion: 0.09
Nodes (24): BY_CATEGORY, CATEGORY_WORDS, GENERAL_WORDS, WORD_MAX, CATEGORIES, LETTERS, SYLLABLES, after() (+16 more)

### Community 80 - "tali_songs.py"
Cohesion: 0.13
Nodes (37): angklung(), apung(), atap(), bass(), bell(), bromo(), candi(), cents_hz() (+29 more)

### Community 81 - "sunyi/engine.ts"
Cohesion: 0.16
Nodes (19): allCollected(), deal(), defaultOptions(), init(), ITEM_KINDS, MAX_PLAYERS, MIN_PLAYERS, nextId() (+11 more)

### Community 82 - "kitchen.test.ts"
Cohesion: 0.19
Nodes (17): moveCook(), stepBot(), BELT_MS, GAP_CYCLE_MS, gapOpen(), gimmickOf(), LAVA_CYCLE_MS, lavaOn() (+9 more)

### Community 83 - "boxing/scene.ts"
Cohesion: 0.05
Nodes (59): ref_assets_sport_models_archery_glb_url, ref_assets_sport_models_archery_lm_webp_url, ref_assets_sport_models_boxing_glb_url, ref_assets_sport_models_boxing_lm_webp_url, ref_assets_sport_models_pitch_glb_url, ref_assets_sport_models_pitch_lm_webp_url, ADS, adTexture() (+51 more)

### Community 84 - "mathutils"
Cohesion: 0.16
Nodes (11): bpy, mathutils, bounds(), convert(), reset(), import_obj(), normalize(), Path (+3 more)

### Community 85 - "useRoom.ts"
Cohesion: 0.14
Nodes (23): Room(), useRoomToasts(), entryById(), gameById(), applyAction(), BOT_NAMES, MAX_ROOM, Pick (+15 more)

### Community 87 - "puncak/sim/hazards.ts"
Cohesion: 0.16
Nodes (18): dropMesh(), Env, batAt(), CHANCE, crabAt(), HazardHit, hitHazards(), knock() (+10 more)

### Community 89 - "tracks.ts"
Cohesion: 0.12
Nodes (18): anchors(), bridgeSamples(), groundOf(), GroundShape, smooth(), WATER_Y, Fence, Recipe (+10 more)

### Community 91 - "SpyBoard.tsx"
Cohesion: 0.09
Nodes (37): src_assets_lottie_spy_caught, src_assets_lottie_spy_escape, src_assets_lottie_spy_guess, src_assets_lottie_spy_reveal, src_assets_lottie_spy_stamp, cuesFor(), FxCue, FxName (+29 more)

### Community 92 - "particles.ts"
Cohesion: 0.15
Nodes (12): glbUrl(), loadModels(), DRIFT_COLORS, DUST, KIND, ParticleKind, Pool, Champ (+4 more)

### Community 94 - "Painter"
Cohesion: 0.06
Nodes (24): ref_assets_petak_models_bunglon_glb_url, Body, loadBody(), loader, solidPaint(), Dab, DECODE_GLSL, decodePaint() (+16 more)

### Community 95 - "sport/types.ts"
Cohesion: 0.05
Nodes (80): src_assets_lottie_sport_ko, sportBot(), init(), initMatch(), reduce(), reduceMatch(), cleanLook(), start() (+72 more)

### Community 96 - "monopoly/sounds.ts"
Cohesion: 0.29
Nodes (6): cuesFor(), FxCue, FxName, isTense(), SoundCue, STEP_MS

### Community 97 - "monopoly/bot.ts"
Cohesion: 0.27
Nodes (17): groupOf(), ownable(), completes(), decide(), monopolyBot(), pick(), priceOf(), proposal() (+9 more)

### Community 103 - "spy/engine.ts"
Cohesion: 0.11
Nodes (35): CLUES, randomStep(), afterOut(), aliveSeats(), BAD, bump(), canVoteFor(), CLUE_MAX (+27 more)

### Community 105 - "Sheets.tsx"
Cohesion: 0.26
Nodes (13): allowed(), canBuild(), canSell(), canUnmortgage(), mortgageValue(), unmortgageCost(), validTrade(), ALL (+5 more)

### Community 107 - "sim/terrain.ts"
Cohesion: 0.10
Nodes (30): seed, Z, Creature, Hazard, Mountain, MOUNTAIN_IDS, MOUNTAINS, PALETTE (+22 more)

### Community 108 - "runner.ts"
Cohesion: 0.19
Nodes (9): play(), view(), Cmd, DuoLike, Who, overlaps(), Runner, RunnerView (+1 more)

### Community 109 - "Map"
Cohesion: 0.05
Nodes (22): Map, material beralpha dari larik tinggi × lebar × 4; nama `decal_*` membuat shader…, tempelan: axis 'z' = di lantai, 'x'/'y' = di dinding sepanjang sumbu itu,…, model Poly Haven: digabung, poligon disusutkan, tekstur diperkecil; disimpan…, salinan model scan. `height`/`width` menyamakan tinggi atau sisi terpanjang;…, serakan kecil: satu model disalin ke banyak titik, jadi satu objek `detail_*`…, material dari larik gambar buatan sendiri (tinggi × lebar × 3, nilai 0..1 sRGB), benda yang dibuat di dalam blok ini bergerak saat main: tidak ikut lightmap,… (+14 more)

### Community 110 - "PenaltyBoard.tsx"
Cohesion: 0.07
Nodes (44): ref_assets_sport_models_chibi_glb_url, src_assets_lottie_sport_ace, src_assets_lottie_sport_goal, SportDemo(), defaultOptions(), ACCESSORIES, HAIR_STYLES, HAIRS (+36 more)

### Community 111 - "kitchens.ts"
Cohesion: 0.05
Nodes (54): out, saveQuality(), AFTER, cache, CELL, COOK_SCALE, COUNTER_TOP, Dish (+46 more)

### Community 112 - "bomb.ts"
Cohesion: 0.12
Nodes (14): Callbacks, HEX, Hit, HOLD_MS, ModAction, MODELS, moduleSlots(), ModView (+6 more)

### Community 113 - "BowlCamera.tsx"
Cohesion: 0.13
Nodes (17): @mediapipe/tasks-vision, src_assets_lottie_sport_swing, closeCamera(), Delegate, loadModel(), openCamera(), PoseFrame, PoseTracker (+9 more)

### Community 114 - "sport_chars.py"
Cohesion: 0.08
Nodes (59): torus(), animate(), attach(), backpack(), build_body(), build_rig(), dome(), face_1() (+51 more)

### Community 115 - "remi/types.ts"
Cohesion: 0.21
Nodes (15): bigtwo, bigTwoPenalty(), btRank(), btValue(), comboOf(), FIVE_ORDER, SUIT_V, BigTwoAction (+7 more)

### Community 117 - "petak/render/world.ts"
Cohesion: 0.09
Nodes (19): mapData, ASSETS, clothShader(), cloudShade(), edgeA, edgeB, extend(), GRADE (+11 more)

### Community 118 - "build.py"
Cohesion: 0.06
Nodes (56): ndarray, Kredit audio Couple Party, bom_music(), domino_music(), draw_music(), _env(), ff(), kart_music() (+48 more)

### Community 119 - "sunyi/render/world.ts"
Cohesion: 0.08
Nodes (36): HALF, LAMPS, animateSmoke(), brass(), clay(), ghostModel(), GhostRig, itemModel() (+28 more)

### Community 120 - "dialog.tsx"
Cohesion: 0.15
Nodes (3): class-variance-authority, Button(), buttonVariants

### Community 121 - "Round"
Cohesion: 0.11
Nodes (5): freeHiders(), hiders(), isSeeker(), clamp(), Round

### Community 122 - "tali/round.ts"
Cohesion: 0.09
Nodes (19): hermite(), syncClock(), clock, Hud, pack(), Packet, Round, RoundOpts (+11 more)

### Community 123 - "petak/render/life.ts"
Cohesion: 0.09
Nodes (19): ref_assets_petak_models_ayam_glb_url, ref_assets_petak_models_kucing_glb_url, ref_assets_petak_models_merpati_glb_url, ref_assets_petak_models_warga_glb_url, MapInfo, Bird, Flock, fly (+11 more)

### Community 124 - "transport.ts"
Cohesion: 0.16
Nodes (8): hasOnline, localTransport(), NetStatus, profile, SUPABASE_KEY, SUPABASE_URL, supabaseTransport(), Transport

### Community 125 - "petak_gang.py"
Cohesion: 0.11
Nodes (8): gerobak(), jemuran(), motor(), mural(), motor bebek: rangka lengkung, tameng depan, jok, velg jari-jari, spion, dan…, gerobak bakso: lemari kaca, panci berasap, payung bergaris, dan roda jari-jari, dua tiang + tali + kain yang bergoyang, dinding gambar warga: bentuk Memphis ditempel tipis

### Community 126 - "monopoly/types.ts"
Cohesion: 0.15
Nodes (14): Auction, Debt, GO_SALARY, JAIL, JAIL_FINE, MonopolyAction, MonopolyEvent, MonopolyOptions (+6 more)

### Community 127 - "petak-duo.mjs"
Cohesion: 0.18
Nodes (11): ref_node_os, ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, chrome, page(), profile (+3 more)

### Community 128 - "blackjack.ts"
Cohesion: 0.33
Nodes (11): active(), advance(), bjTotal(), blackjack, draw(), isBlackjack(), MIN_BET, settle() (+3 more)

### Community 129 - "Climber"
Cohesion: 0.15
Nodes (6): PuncakTile(), renderTile(), PuncakLook, Climber, loadClimber(), pick()

### Community 130 - "audio.py"
Cohesion: 0.13
Nodes (33): ambience(), bandpass(), bell(), drone(), env(), fast_bp(), fast_lp(), footstep() (+25 more)

### Community 131 - "export.py"
Cohesion: 0.14
Nodes (13): datetime, json, pil, main(), Satukan frame stiker emote (brand/illustrations/emote/frames) jadi WebP animasi…, union_box(), main(), Ekspor render Blender per game (brand/illustrations/<game>/*.png) ke WebP untuk… (+5 more)

### Community 132 - "abort"
Cohesion: 0.12
Nodes (18): abort(), assert(), assignWasmExports(), createWasm(), receiveInstance(), receiveInstantiationResult(), findWasmBinary(), forceLoadFile() (+10 more)

### Community 133 - "petak_body.py"
Cohesion: 0.22
Nodes (15): action(), animate(), build_pupils(), build_rig(), build_skin(), key(), main(), wilayah tiap tulang: kepala besar dan dekat bahu, jadi jarak saja membuat… (+7 more)

### Community 134 - "petak_life.py"
Cohesion: 0.27
Nodes (14): action(), ayam(), bind(), key(), kucing(), merpati(), warga: satu kulit tanpa sambungan, baju dan celana dibagi dari wilayah badan,…, ayam kampung: badan bulat, jengger, ekor tegak; klip jalan dan mematuk (+6 more)

### Community 136 - "Round"
Cohesion: 0.07
Nodes (12): Koki, loadKoki(), r2(), Round, Bot, chop(), cloneKit(), CookPose (+4 more)

### Community 137 - "monopoly/engine.test.ts"
Cohesion: 0.21
Nodes (11): Card, CardFx, CARDS, DECK_TITLE, defaultOptions(), init(), base(), simulate() (+3 more)

### Community 138 - "ref_node_fs"
Cohesion: 0.12
Nodes (12): ref_node_child_process, ref_node_fs, { version }, chrome, pending, profile, send(), [url, out, w = '390', h = '844', scale = '2', wait = '0', script = ''] (+4 more)

### Community 139 - "Kit"
Cohesion: 0.07
Nodes (15): Kit, roda torus; `jari` = jumlah jari-jari; `at` = titik tengah, gerobak kaki lima: lemari kaca, panci, payung, dan roda jari-jari, motor bebek parkir: rangka lengkung, tameng depan, jok, velg, spion, dan knalpot, bangku panjang kayu; `rot` 0 = memanjang di sumbu x, tali lampu: kabel melengkung dan bola menyala, model scan berukuran kecil; `rot` kosong = diputar acak supaya deretan tidak…, noda hujan, retak, lumut, dan poster sepanjang dinding; `f` = letak bidang… (+7 more)

### Community 140 - "draw/ui/copy.ts"
Cohesion: 0.17
Nodes (12): canGuess(), LEVEL_BONUS, FeedItem, feedLine(), guessPlaceholder(), LEVEL_INFO, OPTION_HINT, PACK_INFO (+4 more)

### Community 141 - "createLazyFile"
Cohesion: 0.31
Nodes (7): createLazyFile(), stream_ops, writeChunks(), get_char(), mmap(), position(), read()

### Community 142 - "monopoly/ui/art.tsx"
Cohesion: 0.09
Nodes (30): AIRPORTS, BOARD, CODE, GROUP_HEX, GROUP_NAME, GROUPS, UTILITIES, Group (+22 more)

### Community 143 - "BoxingScene"
Cohesion: 0.19
Nodes (3): BoxingScene, BoxHand, BoxingBoard()

### Community 144 - "makeEntry"
Cohesion: 0.33
Nodes (6): makeBufferEntry(), makeEntries(), makeEntry(), makeSamplerEntry(), makeStorageTextureEntry(), makeTextureEntry()

### Community 145 - "sunyi/round.ts"
Cohesion: 0.06
Nodes (48): Box, blocked(), BOXES, CEILINGS, GATE, GATE_BOX, GHOST_SPAWN, GRAVE (+40 more)

### Community 147 - "makeBlendState"
Cohesion: 0.40
Nodes (5): makeBlendComponent(), makeBlendState(), makeColorState(), makeColorStates(), makeFragmentState()

### Community 148 - "makeVertexAttributes"
Cohesion: 0.40
Nodes (5): makeVertexAttribute(), makeVertexAttributes(), makeVertexBuffer(), makeVertexBuffers(), makeVertexState()

### Community 149 - "tali_chars.py"
Cohesion: 0.15
Nodes (26): house(), frame(), jendela(), panel(), pintu(), `front` = sisi ke gang. Dinding depan benar-benar berlubang: jendela dan pintu…, action(), animate() (+18 more)

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

### Community 179 - "BombScene"
Cohesion: 0.15
Nodes (7): clockText(), BombScene, Canvas, facePlane(), lcd(), model(), JinakState

### Community 180 - "jinak/engine.ts"
Cohesion: 0.15
Nodes (27): emit(), finish(), init(), MAX_PLAYERS, mazePath(), MIN_PLAYERS, newBomb(), reduce() (+19 more)

### Community 181 - "climb.ts"
Cohesion: 0.09
Nodes (32): Buffs, CLIMB, DOWN_DROP, drain(), Fatigue, FATIGUE_KEYS, floorAt(), GRAVITY (+24 more)

### Community 182 - "snakes/engine.ts"
Cohesion: 0.06
Nodes (64): cellOf(), EFFECTS, int(), makeBoard(), BEFORE_ROLL, snakesBot(), DARES, QUIZ (+56 more)

### Community 184 - "App.tsx"
Cohesion: 0.06
Nodes (49): @capacitor/core, @hugeicons/core-free-icons, @hugeicons/react, App(), BOT_LEVELS, BotPanel(), floor, Home() (+41 more)

### Community 185 - "sunyi/sim/nav.ts"
Cohesion: 0.19
Nodes (17): buildNav(), cache, CELL, cellOf(), center(), clearLine(), DIRS, findPath() (+9 more)

### Community 186 - "masak_luar.py"
Cohesion: 0.15
Nodes (28): burger(), car_templates(), es(), facade(), kapal(), lane_free(), lava(), leaf_tex() (+20 more)

### Community 187 - "kart_lib.py"
Cohesion: 0.27
Nodes (9): bev(), clear(), export(), last(), smooth(), to_meshes(), bunglon(), ember() (+1 more)

### Community 188 - "SunyiBoard.tsx"
Cohesion: 0.08
Nodes (34): collected(), savedSens(), saveSens(), clock(), DIFF_INFO, DOWN_LINE, INTRO, ITEM_INFO (+26 more)

### Community 189 - "build.ts"
Cohesion: 0.09
Nodes (43): ref_assets_kart_models_pohon_glb_url, Tier, Block, BLOCKS, Mat, PATHS, Prop, Roof (+35 more)

### Community 190 - "masak/round.ts"
Cohesion: 0.06
Nodes (45): ref_assets_masak_models_koki_glb_url, actorOf(), defaultOptions(), fillKoki(), init(), MAX_COOKS, MAX_PLAYERS, MIN_PLAYERS (+37 more)

### Community 191 - "Round"
Cohesion: 0.11
Nodes (8): zoneAt(), Ring, r2(), Round, Ghost, Listener, Nav, needle()

### Community 192 - "petak_museum.py"
Cohesion: 0.13
Nodes (13): colorsys, lis(), lukisan(), panel_bebas(), rantai(), pajangan benda berharga di alas kayu, dengan rangka kuningan, plint, panel kursi, dan lis plafon di sepanjang dinding, tiang pembatas beludru, hiasan: tidak menghalangi jalan (+5 more)

### Community 193 - "monopoly/ui/copy.ts"
Cohesion: 0.27
Nodes (15): squareName(), eventText(), lastCard(), money(), noteText(), OPTION_INFO, payee(), summary() (+7 more)

### Community 194 - "spy/bot.ts"
Cohesion: 0.17
Nodes (21): distance(), isClose(), normalize(), cluePool(), decide(), deduce(), hits(), pickClue() (+13 more)

### Community 195 - "petak-perf.mjs"
Cohesion: 0.24
Nodes (10): chrome, errors, js(), maps, pending, profile, ready(), send() (+2 more)

### Community 196 - "ArcheryBoard.tsx"
Cohesion: 0.11
Nodes (29): src_assets_lottie_sport_bullseye, arc(), shoot(), botShot(), noise(), WIND_READ, WOBBLE, ARROWS (+21 more)

### Community 197 - "sphere"
Cohesion: 0.13
Nodes (26): bendera(), bianglala(), bunga(), kait(), kelapa(), kelelawar(), lampion(), lampu() (+18 more)

### Community 198 - "petak-probe.mts"
Cohesion: 0.20
Nodes (7): @supabase/supabase-js, a, b, env, rx, seen, tx

### Community 199 - "masak-calibrate.mts"
Cohesion: 0.10
Nodes (28): mean(), NS, out, ratio, run(), seeds, bots, id (+20 more)

### Community 200 - "kitchen.ts"
Cohesion: 0.08
Nodes (64): code(), finalCode(), layoutOf(), nextStep(), itemKey(), dist(), frontOf(), nearest() (+56 more)

### Community 201 - "bake_mods"
Cohesion: 0.20
Nodes (14): batu_besar(), gunung(), kamboja(), permen(), pohon(), permen kapas di tusuk; asal = tengah gumpalan, pohon rindang bulat; asal = kaki, gunung jauh berlekuk; asal = kaki tengah (+6 more)

### Community 202 - "jinak_ill.py"
Cohesion: 0.33
Nodes (19): bomb(), camera(), emissive(), lin(), load(), lose(), main(), nolines() (+11 more)

### Community 203 - "jinak/render/stage.ts"
Cohesion: 0.15
Nodes (10): GRADE, QUALITIES, Quality, QUALITY_TITLE, savedQuality(), saveQuality(), Stage, Tier (+2 more)

### Community 204 - "MountainScene"
Cohesion: 0.10
Nodes (8): Particles, Flyer, Life, rnd(), wingGeo(), PropMats, MountainScene, WeatherNow

### Community 205 - "petak/round.ts"
Cohesion: 0.06
Nodes (69): map, nav, rows, SIZE, BODY_SCALE, blobShadow(), BOT_SHARP, CATCH_COS (+61 more)

### Community 206 - "VoiceLink"
Cohesion: 0.20
Nodes (8): gathered(), check(), done(), iceServers(), VoiceLink, VoiceLinkOptions, VoiceState, Wire

### Community 207 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, @capacitor/cli, oxlint, @types/node, @types/react, @types/react-dom, @types/three, typescript (+3 more)

### Community 208 - "tali/render/fx.ts"
Cohesion: 0.15
Nodes (6): dot(), Fx, FxKind, Pool, Spec, SPECS

### Community 209 - "react"
Cohesion: 0.04
Nodes (73): radix-ui, react, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_card_pop, src_assets_lottie_confetti, src_assets_lottie_dice_roll, src_assets_lottie_item_pop (+65 more)

### Community 210 - "poker.ts"
Cohesion: 0.25
Nodes (13): nextWhere(), after(), BOARD_AT, canAct(), compareScores(), HAND_NAMES, straightHigh(), live() (+5 more)

### Community 211 - "audio.ts"
Cohesion: 0.07
Nodes (29): howler, AudioSettings, getSettings(), listeners, music, musicVolume(), playMusic(), setSettings() (+21 more)

### Community 212 - "ManualView.tsx"
Cohesion: 0.10
Nodes (17): src_assets_jinak_tex_paper, BUTTON_RULES, LOCK_LAMPS, LOCK_RULES, LOCK_SHAPES, LOCK_TABLE, RELEASE_DIGIT, WIRE_RULES (+9 more)

### Community 213 - "tali-duo.mjs"
Cohesion: 0.20
Nodes (7): { chromium }, drift0, drift1, gap, sleep(), tabs, until()

### Community 214 - "racket/scene.ts"
Cohesion: 0.07
Nodes (38): ref_assets_sport_models_court_glb_url, ref_assets_sport_models_court_lm_webp_url, ref_assets_sport_models_hall_glb_url, ref_assets_sport_models_hall_lm_webp_url, ArenaSpec, Clip, chaseLoad(), courtMeters() (+30 more)

### Community 215 - "actor.ts"
Cohesion: 0.29
Nodes (4): Actor, blobTexture(), Clip, patchRim()

### Community 216 - "jinak-shot.mjs"
Cohesion: 0.22
Nodes (5): ref_node_module, ref_playwright, { chromium }, errors, require

### Community 217 - "sketches.ts"
Cohesion: 0.18
Nodes (8): dense(), [INK, PINK, GREEN, BLUE, YELLOW, ORANGE, , BROWN], Line, RAW, Sketch, SKETCH_WORDS, sketchStrokes(), Stroke

### Community 218 - "tali_lib.py"
Cohesion: 0.16
Nodes (16): at_origin(), bevel(), clear_scene(), export(), hexrgb(), Path, geser titik asal objek ke `pivot` (koordinat dunia), lalu taruh objek di (0,0,0), load() (+8 more)

### Community 220 - "extract-tex.mjs"
Cohesion: 0.33
Nodes (5): ref_fs, EXACT, found, MAPS, WANT

### Community 221 - "jinak/ui/copy.ts"
Cohesion: 0.27
Nodes (9): defaultOptions(), LEVELS, JinakOptions, Level, LEVEL_INFO, MODULE_TITLE, STRIKE_INFO, summary() (+1 more)

### Community 222 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, apk, build, dev, lint, preview, release, test

### Community 224 - "Demo.tsx"
Cohesion: 0.07
Nodes (29): react-dom, src_assets_lottie_bom_boom, BomDemo(), LudoDemo(), MonopolyDemo(), NAMES, RemiDemo(), SpyDemo() (+21 more)

### Community 228 - "kerang"
Cohesion: 0.50
Nodes (4): fan(), kerang(), Satu keping kerang simping: kipas bergerigi dari engsel, dibuat dari bmesh., Kerang simping raksasa: dua keping bergerigi terbuka + mutiara berkilau.

## Knowledge Gaps
- **928 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+923 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2067 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Seat` connect `games/types.ts` to `bom/engine.ts`, `petak/engine.ts`, `Climber`, `blackjack.ts`, `rules.test.ts`, `DrawBoard.tsx`, `Round`, `draw/ui/copy.ts`, `sunyi/round.ts`, `nextRand`, `remi/engine.ts`, `race.ts`, `KartBoard.tsx`, `BomBoard.tsx`, `remi/bot.ts`, `draw/types.ts`, `monopoly/engine.ts`, `draw/engine.ts`, `remi/ui/copy.ts`, `MasakBoard.tsx`, `BowlingBoard.tsx`, `jinak/engine.ts`, `snakes/engine.ts`, `spy/ui/Lobby.tsx`, `paintSync.ts`, `ludo/engine.ts`, `TaliBoard.tsx`, `masak/round.ts`, `Round`, `remi/cards.ts`, `monopoly/ui/copy.ts`, `spy/bot.ts`, `UnoTable.tsx`, `RemiTable.tsx`, `ArcheryBoard.tsx`, `modules.ts`, `tali/sim/physics.ts`, `puncak/round.ts`, `petak/round.ts`, `VoiceLink`, `react`, `poker.ts`, `audio.ts`, `sunyi/engine.ts`, `useRoom.ts`, `racket/scene.ts`, `SpyBoard.tsx`, `jinak/ui/copy.ts`, `sport/types.ts`, `monopoly/sounds.ts`, `monopoly/bot.ts`, `spy/engine.ts`, `Sheets.tsx`, `remi/types.ts`, `Round`, `tali/round.ts`, `monopoly/types.ts`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `three` connect `three` to `Climber`, `nextRand`, `package.json`, `race.ts`, `puncak/render/scene.ts`, `BowlingBoard.tsx`, `puncak/render/models.ts`, `masak/round.ts`, `kart/render/world.ts`, `build.ts`, `kart/render/models.ts`, `puncak/round.ts`, `jinak/render/stage.ts`, `masak/render/scene.ts`, `petak/round.ts`, `MountainScene`, `tali/render/fx.ts`, `boxing/scene.ts`, `racket/scene.ts`, `actor.ts`, `tracks.ts`, `particles.ts`, `Painter`, `Skids`, `PenaltyBoard.tsx`, `kitchens.ts`, `bomb.ts`, `petak/render/world.ts`, `sunyi/render/world.ts`, `tali/round.ts`, `petak/render/life.ts`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `vitest` connect `vitest` to `bom/engine.ts`, `rules.test.ts`, `monopoly/engine.test.ts`, `sunyi/round.ts`, `remi/engine.ts`, `package.json`, `race.ts`, `games/types.ts`, `KartBoard.tsx`, `draw/engine.ts`, `emotes.ts`, `BowlingBoard.tsx`, `jinak/engine.ts`, `snakes/engine.ts`, `App.tsx`, `paintSync.ts`, `ludo/engine.ts`, `TaliBoard.tsx`, `SunyiBoard.tsx`, `masak/round.ts`, `UnoTable.tsx`, `ArcheryBoard.tsx`, `puncak/round.ts`, `petak/round.ts`, `bots.test.ts`, `kitchen.test.ts`, `useRoom.ts`, `puncak/sim/hazards.ts`, `tracks.ts`, `sport/types.ts`, `spy/engine.ts`, `sim/terrain.ts`, `tali/round.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _928 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `bom/engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08831306187202538 - nodes in this community are weakly interconnected._
- **Should `petak/engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0797979797979798 - nodes in this community are weakly interconnected._
- **Should `rules.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1028225806451613 - nodes in this community are weakly interconnected._