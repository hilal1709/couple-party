# Graph Report - game  (2026-10-15)

## Corpus Check
- 51 files · ~117,794 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 462 nodes · 873 edges · 19 communities (18 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- UnoTable.tsx
- package.json
- App.tsx
- engine.ts
- uno/types.ts
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

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 19 edges
2. `faceOf()` - 17 edges
3. `react` - 16 edges
4. `reduce()` - 16 edges
5. `compilerOptions` - 15 edges
6. `play()` - 14 edges
7. `add()` - 12 edges
8. `UnoTable()` - 12 edges
9. `canPlay()` - 11 edges
10. `mat()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `UnoTable()` --calls--> `terrazzo()`  [EXTRACTED]
  src/games/uno/ui/UnoTable.tsx → src/components/memphis/patterns.ts
- `RoundEnd()` --calls--> `squiggles()`  [EXTRACTED]
  src/games/uno/ui/RoundEnd.tsx → src/components/memphis/patterns.ts
- `UnoTable()` --calls--> `squiggles()`  [EXTRACTED]
  src/games/uno/ui/UnoTable.tsx → src/components/memphis/patterns.ts
- `UnoTable()` --calls--> `hatch()`  [EXTRACTED]
  src/games/uno/ui/UnoTable.tsx → src/components/memphis/patterns.ts
- `buildDeck()` --calls--> `shuffle()`  [EXTRACTED]
  src/games/uno/deck.ts → src/games/rng.ts

## Import Cycles
- None detected.

## Communities (19 total, 1 thin omitted)

### Community 0 - "UnoTable.tsx"
Cohesion: 0.05
Nodes (50): class-variance-authority, gsap, @gsap/react, @hugeicons/core-free-icons, @hugeicons/react, lottie-react, radix-ui, react (+42 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (42): config, devDependencies, @capacitor/cli, oxlint, @types/node, @types/react, @types/react-dom, typescript (+34 more)

### Community 2 - "App.tsx"
Cohesion: 0.07
Nodes (32): react-dom, @supabase/supabase-js, App(), CODE_TONES, floor, Home(), load(), makeCode() (+24 more)

### Community 3 - "engine.ts"
Cohesion: 0.15
Nodes (36): Demo(), shuffle(), canPlay(), cardPoints(), checkMercy(), deal(), defaultOptions(), drawN() (+28 more)

### Community 4 - "uno/types.ts"
Cohesion: 0.11
Nodes (29): GAMES, AnyGame, GameDef, GameProps, Seat, buildDeck(), classicFaces(), f() (+21 more)

### Community 5 - "Design System: Couple Party"
Cohesion: 0.06
Nodes (30): Buttons (Slab), Cards / Containers, Colors, Components, Design System: Couple Party, Discard Ring and Podium (signature), Do:, Do's and Don'ts (+22 more)

### Community 6 - "lottie.mjs"
Cohesion: 0.14
Nodes (24): ref_node_child_process, ref_node_fs, ref_node_os, chrome, pending, profile, send(), [url, out, w = '390', h = '844', scale = '2'] (+16 more)

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
Cohesion: 0.29
Nodes (6): 💞 Couple Party, Game, Instal di HP, Perintah, Setup online (sekali saja), Struktur

### Community 15 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 16 - "Couple Party — logo"
Cohesion: 0.40
Nodes (4): Aturan, Couple Party — logo, File, Warna

### Community 17 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, paths, files, references

## Knowledge Gaps
- **190 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `config` (+185 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 247 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `UnoTable.tsx` to `package.json`, `App.tsx`, `engine.ts`, `uno/types.ts`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _190 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UnoTable.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.050543637966500146 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.046464646464646465 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07293868921775898 - nodes in this community are weakly interconnected._
- **Should `uno/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10810810810810811 - nodes in this community are weakly interconnected._