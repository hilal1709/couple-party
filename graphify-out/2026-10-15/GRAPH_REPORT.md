# Graph Report - game  (2026-10-15)

## Corpus Check
- 55 files · ~121,344 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 503 nodes · 948 edges · 25 communities (23 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `61eca270`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dialog.tsx
- package.json
- App.tsx
- engine.ts
- UnoTable.tsx
- Design System: Couple Party
- lottie.mjs
- scene.py
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
- capture.mjs
- Slab.tsx
- Lobby.tsx
- UpdateBanner.tsx
- RoundEnd.tsx

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 19 edges
2. `play()` - 18 edges
3. `react` - 17 edges
4. `reduce()` - 17 edges
5. `faceOf()` - 15 edges
6. `UnoTable()` - 15 edges
7. `compilerOptions` - 15 edges
8. `add()` - 12 edges
9. `canPlay()` - 11 edges
10. `mat()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `terrazzo()` --calls--> `nextRand()`  [EXTRACTED]
  src/components/memphis/patterns.ts → src/games/rng.ts
- `CardBack` --calls--> `terrazzo()`  [EXTRACTED]
  src/games/uno/art/CardArt.tsx → src/components/memphis/patterns.ts
- `UnoTable()` --calls--> `terrazzo()`  [EXTRACTED]
  src/games/uno/ui/UnoTable.tsx → src/components/memphis/patterns.ts
- `UnoTable()` --calls--> `squiggles()`  [EXTRACTED]
  src/games/uno/ui/UnoTable.tsx → src/components/memphis/patterns.ts
- `Hand()` --calls--> `hatch()`  [EXTRACTED]
  src/games/uno/ui/UnoTable.tsx → src/components/memphis/patterns.ts

## Import Cycles
- None detected.

## Communities (25 total, 2 thin omitted)

### Community 0 - "dialog.tsx"
Cohesion: 0.12
Nodes (8): class-variance-authority, @hugeicons/core-free-icons, @hugeicons/react, radix-ui, Button(), buttonVariants, Switch(), src_lib_utils_cn

### Community 1 - "package.json"
Cohesion: 0.04
Nodes (44): config, devDependencies, @capacitor/cli, oxlint, @types/node, @types/react, @types/react-dom, typescript (+36 more)

### Community 2 - "App.tsx"
Cohesion: 0.06
Nodes (36): App(), floor, Home(), load(), makeCode(), Room(), RoomInfo, SEAT_TONES (+28 more)

### Community 3 - "engine.ts"
Cohesion: 0.07
Nodes (70): react-dom, Demo(), NAMES, nextRand(), shuffle(), GameDef, faceLabel(), buildDeck() (+62 more)

### Community 4 - "UnoTable.tsx"
Cohesion: 0.12
Nodes (17): lottie-react, src_assets_lottie_burst, Seat, CardBack, CardFace, COLOR_NAME, cornerText(), DARK_SIDE (+9 more)

### Community 5 - "Design System: Couple Party"
Cohesion: 0.06
Nodes (30): Buttons (Slab), Cards / Containers, Colors, Components, Design System: Couple Party, Discard Ring and Podium (signature), Do:, Do's and Don'ts (+22 more)

### Community 6 - "lottie.mjs"
Cohesion: 0.34
Nodes (15): anim(), burst(), confetti(), doc(), ease, fill(), layer(), PALETTE (+7 more)

### Community 7 - "scene.py"
Cohesion: 0.17
Nodes (26): bpy, mathutils, add(), cheek(), cone(), crown(), eye(), mat() (+18 more)

### Community 8 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 9 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, @capacitor/android, @capacitor/core, class-variance-authority, cn, @fontsource/dela-gothic-one, @fontsource-variable/geist, gsap (+13 more)

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
Cohesion: 0.20
Nodes (5): Membangun kit logo Couple Party: simbol, wordmark (outline dari Dela Gothic…, fonttools_pens_svgpathpen, fonttools_pens_transformpen, fonttools_ttlib, math

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

### Community 19 - "capture.mjs"
Cohesion: 0.11
Nodes (13): ref_node_child_process, ref_node_fs, ref_node_os, { version }, chrome, pending, profile, send() (+5 more)

### Community 20 - "Slab.tsx"
Cohesion: 0.21
Nodes (13): cache, dots(), hatch(), squiggles(), svgUrl(), terrazzo(), Props, Slab() (+5 more)

### Community 21 - "Lobby.tsx"
Cohesion: 0.19
Nodes (6): Drawer(), DrawerContent(), DrawerDescription(), DrawerTitle(), SHOWCASE, STYLE

### Community 22 - "UpdateBanner.tsx"
Cohesion: 0.28
Nodes (11): @capacitor/core, Phase, UpdateBanner(), ApkUpdater, ApkUpdaterPlugin, APP_VERSION, compareVersions(), fetchLatest() (+3 more)

### Community 23 - "RoundEnd.tsx"
Cohesion: 0.24
Nodes (7): gsap, @gsap/react, react, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_confetti, Props

## Knowledge Gaps
- **200 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+195 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 266 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `RoundEnd.tsx` to `dialog.tsx`, `package.json`, `App.tsx`, `engine.ts`, `UnoTable.tsx`, `Slab.tsx`, `Lobby.tsx`, `UpdateBanner.tsx`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _200 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dialog.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12121212121212122 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.04440333024976873 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06079664570230608 - nodes in this community are weakly interconnected._
- **Should `engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0727036676403765 - nodes in this community are weakly interconnected._