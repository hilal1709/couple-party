# Graph Report - game  (2026-10-15)

## Corpus Check
- 62 files · ~124,023 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 557 nodes · 1095 edges · 23 communities (20 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `61eca270`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Lobby.tsx
- package.json
- App.tsx
- engine.ts
- UnoTable.tsx
- Design System: Couple Party
- build.py
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
- lottie.mjs
- CREDITS.md
- UpdateBanner.tsx

## God Nodes (most connected - your core abstractions)
1. `react` - 20 edges
2. `faceOf()` - 19 edges
3. `UnoTable()` - 19 edges
4. `compilerOptions` - 19 edges
5. `reduce()` - 18 edges
6. `play()` - 18 edges
7. `compilerOptions` - 15 edges
8. `add()` - 12 edges
9. `canPlay()` - 11 edges
10. `mat()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Home()` --calls--> `useMusic()`  [EXTRACTED]
  src/App.tsx → src/audio/audio.ts
- `Room()` --calls--> `useMusic()`  [EXTRACTED]
  src/App.tsx → src/audio/audio.ts
- `UnoTable()` --calls--> `sfx()`  [EXTRACTED]
  src/games/uno/ui/UnoTable.tsx → src/audio/audio.ts
- `Slab()` --calls--> `hatch()`  [EXTRACTED]
  src/components/memphis/Slab.tsx → src/components/memphis/patterns.ts
- `Slab()` --calls--> `squiggles()`  [EXTRACTED]
  src/components/memphis/Slab.tsx → src/components/memphis/patterns.ts

## Import Cycles
- None detected.

## Communities (23 total, 3 thin omitted)

### Community 0 - "Lobby.tsx"
Cohesion: 0.06
Nodes (38): howler, @hugeicons/core-free-icons, @hugeicons/react, radix-ui, react, AudioSettings, listeners, music (+30 more)

### Community 1 - "package.json"
Cohesion: 0.04
Nodes (44): config, devDependencies, @capacitor/cli, oxlint, @types/node, @types/react, @types/react-dom, typescript (+36 more)

### Community 2 - "App.tsx"
Cohesion: 0.06
Nodes (40): @supabase/supabase-js, App(), floor, Home(), load(), makeCode(), Room(), RoomInfo (+32 more)

### Community 3 - "engine.ts"
Cohesion: 0.08
Nodes (63): react-dom, vitest, Demo(), NAMES, nextRand(), shuffle(), buildDeck(), classicFaces() (+55 more)

### Community 4 - "UnoTable.tsx"
Cohesion: 0.08
Nodes (43): gsap, @gsap/react, lottie-react, src_assets_illustrations_lose, src_assets_illustrations_win, src_assets_lottie_burst, src_assets_lottie_confetti, useMusic() (+35 more)

### Community 5 - "Design System: Couple Party"
Cohesion: 0.06
Nodes (30): Buttons (Slab), Cards / Containers, Colors, Components, Design System: Couple Party, Discard Ring and Podium (signature), Do:, Do's and Don'ts (+22 more)

### Community 6 - "build.py"
Cohesion: 0.21
Nodes (15): ndarray, numpy, Path, pathlib, ff(), load(), music(), Olah audio CC0 (sumber di D:/dev/audio-src) menjadi aset app di public/audio/.… (+7 more)

### Community 7 - "scene.py"
Cohesion: 0.19
Nodes (25): bpy, mathutils, add(), cheek(), cone(), crown(), eye(), mat() (+17 more)

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

### Community 19 - "lottie.mjs"
Cohesion: 0.10
Nodes (28): ref_node_child_process, ref_node_fs, ref_node_os, { version }, chrome, pending, profile, send() (+20 more)

### Community 22 - "UpdateBanner.tsx"
Cohesion: 0.28
Nodes (11): @capacitor/core, Phase, UpdateBanner(), ApkUpdater, ApkUpdaterPlugin, APP_VERSION, compareVersions(), fetchLatest() (+3 more)

## Knowledge Gaps
- **212 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+207 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 287 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Lobby.tsx` to `package.json`, `App.tsx`, `engine.ts`, `UnoTable.tsx`, `UpdateBanner.tsx`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _212 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Lobby.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.057342657342657345 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.04440333024976873 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.056107539450613676 - nodes in this community are weakly interconnected._
- **Should `engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.076103500761035 - nodes in this community are weakly interconnected._