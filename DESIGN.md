---
name: Couple Party
description: A two-player UNO table staged as a Memphis showroom, played between two Android phones.
colors:
  electric: "#5cf64a"
  grass: "#87e752"
  fern: "#43b929"
  petal: "#ffcae9"
  rose: "#ff37a6"
  ink: "#121212"
  paper: "#fff4fa"
  suit-red: "#ff3b5c"
  suit-yellow: "#ffcc1f"
  suit-green: "#43b929"
  suit-blue: "#2f7bff"
  suit-pink: "#ff37a6"
  suit-teal: "#13bfae"
  suit-orange: "#ff8a1c"
  suit-purple: "#8a55ff"
typography:
  display:
    fontFamily: "'Dela Gothic One', 'Geist Variable', sans-serif"
    fontSize: "54px"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "'Dela Gothic One', 'Geist Variable', sans-serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Dela Gothic One', 'Geist Variable', sans-serif"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.375
    fontFeature: "tnum"
  label:
    fontFamily: "'Dela Gothic One', 'Geist Variable', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-0.01em"
rounded:
  none: "0px"
  card: "10px"
  ring: "20px"
  dot: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "28px"
components:
  slab-primary:
    backgroundColor: "{colors.rose}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "48px"
  slab-primary-lg:
    backgroundColor: "{colors.rose}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 28px"
    height: "64px"
  slab-secondary:
    backgroundColor: "{colors.grass}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "48px"
  slab-quiet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "48px"
  slab-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.petal}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "36px"
  slab-selected:
    backgroundColor: "{colors.electric}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "36px"
  input-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "56px"
  tape-title:
    backgroundColor: "{colors.rose}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "0.15em 0.45em 0.2em"
  icon-button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    size: "40px"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "20px"
  playing-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    width: "84px"
    height: "123px"
---

# Design System: Couple Party

## Overview

**Creative North Star: "The Memphis Showroom"**

Couple Party is a toy showroom, not a card-game casino. Every control, pile, and panel is a flat geometric object cut from laminate, outlined in 3px ink, and set down on a Pastel Petal terrazzo floor with a hard ink shadow beneath it. Objects argue in color: Brilliant Rose against Electric Green, Radioactive Grass against Petal, all held together by one black ink that draws every outline, every letter, and every shadow. The reference the world rejects is the standard UNO app: green felt, glossy cards, soft drop shadows.

Density is phone-portrait and one-column. Personality concentrates at moments (the UNO! burst, the "caught" shake, the confetti at round end) while the table itself stays legible at a glance: whose turn, what color is live, which cards can be played. State is carried by pattern as well as color, so squiggles, terrazzo, hatching and dots are functional, not decoration.

Headings sit slightly tilted on strips of colored tape; controls are skewed parallelogram slabs that sink into their shadow when pressed. Nothing glows, nothing blurs, nothing is gradient.

**Key Characteristics:**
- Pastel Petal floor scattered with procedural terrazzo chips in Rose, Fern, Electric, Grass and ink.
- 3px ink outlines on every object; hard, zero-blur ink shadows offset down-right.
- Dela Gothic One uppercase for every label, title and button; Geist semibold for running text.
- Skewed (-6deg) slab buttons and tilted (-2deg / +1.5deg) tape titles.
- State shown by fill pattern (squiggle = active, hatch = disabled/unplayable, terrazzo = idle) as well as by color.
- Square corners everywhere except card stock, the discard ring, and presence dots.

## Colors

Five mandated brand colors at full saturation, one warm-black ink, one pink-tinted paper, and a separate eight-suit card palette tuned for distinguishability.

### Primary
- **Brilliant Rose** (`rose`): the main-action color. "Buat room", "Mulai main", "UNO!", "Tantang!", the active turn tape, the logo's C ring, your own score bar. Also the caret color in inputs.

### Secondary
- **Electric Green** (`electric`): the table podium, the "Party" tape on Home, selected options (target-point slab), playable-card underline, online presence dot, text selection, the app-icon tile.
- **Radioactive Grass** (`grass`): your hand tray at the bottom of the table, the opponent name tape, the "Gabung" slab.

### Tertiary
- **Bright Fern** (`fern`): focus rings (3px outline, 3px offset), checked switches, the "UNO aman" confirmation, the opponent's score bar. The darkest green, so it carries green text and edges where Electric would vanish.

### Neutral
- **Ink** (`ink`): all text, every outline, every shadow, scrollbar thumbs, and the dark-tone slab (destructive "Keluar", "Tangkap!"). On ink surfaces text flips to Petal.
- **Pastel Petal** (`petal`): the floor (page background) under every screen; text color on ink.
- **Paper** (`paper`): inputs, sheets/drawers, quiet slabs, the round-end receipt card, card faces, and the 90%-opacity backing behind body copy laid over terrazzo.

### Suit palette (card stock only)
- **Light side** Red (`suit-red`), Yellow (`suit-yellow`), Green (`suit-green`, identical to Fern), Blue (`suit-blue`).
- **Dark side (UNO Flip)** Pink (`suit-pink`, identical to Rose), Teal (`suit-teal`), Orange (`suit-orange`), Purple (`suit-purple`).
Each suit also carries its own motif (dots, triangles, squiggle, diagonal stripe) so cards stay readable without color.

### Named Rules
**The One Ink Rule.** There is exactly one dark: `ink`. Outlines, type, shadows, and dark surfaces all use it. No greys, no secondary dark; lighter text is ink at reduced opacity (70-80%).

**The Suits Stay On The Cards Rule.** Suit colors appear only on card art, the color-pick sheet, and the discard ring that names the live color. UI chrome uses the five brand colors.

## Typography

**Display Font:** Dela Gothic One (with Geist Variable, sans-serif)
**Body Font:** Geist Variable (with sans-serif)

**Character:** A single heavy, wide display weight shouted in uppercase against a calm, rounded sans at semibold. Display is set tight (line-height 0.95, -0.01em). All numerals use tabular figures.

### Hierarchy
- **Display** (400, 54px, 0.9): the Home wordmark only, each word on its own tape.
- **Headline** (400, 30px, 0.95): screen questions ("Main UNO versi apa?", "Kirim kode ini ke pasanganmu"); the 48px "+points" counter and 60px "UNO!" burst are moment-only enlargements of this role.
- **Title** (400, 24px, 0.95, uppercase): variant names, the turn tape, sheet titles, the round-end headline.
- **Body** (600, 13-15px, ~1.375): explanations and status lines, capped at 24-28ch when laid over terrazzo, always on a paper backing.
- **Label** (400 display, 11-14px, uppercase): form labels, slab button text, round/target meta, the "Warna ..." color tag.

### Named Rules
**The Display Is The Voice Rule.** Anything the player acts on or reads as a sign (buttons, names, turn state) is Dela Gothic One uppercase. Geist is only for sentences.

## Layout

Mobile portrait first. Home and room screens are a single column capped at 384px (`max-w-sm`) with 20px side padding; the game table is a full-height column capped at 560px with 16px side padding, so on desktop it sits centered on the endless terrazzo floor. Vertical rhythm steps 8 / 12 / 16 / 20 / 28px (`spacing.xs`-`xl`): 28px between Home blocks, 20px between Lobby blocks, 12px inside rows, 8px between label and field. All top and bottom edges respect `env(safe-area-inset-*)`.

The table reads top to bottom: back button and round meta, opponent tape and fanned card backs, the skewed Electric podium carrying draw pile and discard, the turn tape plus event line, the action row, then your hand tray anchored to the bottom edge. The hand fans its cards to fit the width and only scrolls horizontally when the step between cards would fall below 24px.

## Elevation & Depth

Depth is structural and flat: objects are lifted by hard ink offset shadows with zero blur, never by softness or tone. The shadow is the object's own slab thickness, which is why pressing a slab physically moves it into its shadow.

### Shadow Vocabulary
- **Slab** (`box-shadow: 4px 5px 0 0 var(--ink)`): resting buttons, room-code tiles, color-pick tiles, focused inputs.
- **Slab small** (`box-shadow: 2px 3px 0 0 var(--ink)`): inputs at rest, icon buttons, unselected variant cards, the pressed state of slabs.
- **Lift** (`box-shadow: 6px 8px 0 0 var(--ink)`): the table podium, the selected variant card (plus a 4px rise), the round-end receipt.

### Named Rules
**The Press-Into-Shadow Rule.** On press a slab translates (3px, 4px) and drops from Slab to Slab-small; disabled slabs sit fully pressed with no shadow and an ink hatch overlay.

**The No Blur Rule.** No blurred shadows, glows, gradients, or backdrop blur anywhere. The only translucency is the ink/70 scrim behind the round-end dialog and paper/90 behind copy.

## Shapes

Hard-edged laminate. Buttons, inputs, tapes, sheets, the podium and the hand tray are all square-cornered and outlined at 3px ink (2px for small tags, presence dots and the playable underline). Skew is the signature: slabs at -6deg (content counter-skewed back upright), the podium and score bars at -12deg, color tiles alternating ±6deg. Tapes rotate -2deg or +1.5deg; room-code tiles alternate ±3deg; badges like "Dipilih" and the stack counter sit at 12deg. Roundness is reserved for things that are round in the real world: playing cards (11% of card width, about 10px on an 84px hand card, with a 4px ink edge), the 20px discard ring, presence dots, and the decorative half-circles, cylinders and squiggles of the Home still life.

## Components

### Buttons (Slab)
Tactile toy blocks that click down.
- **Shape:** skewed -6deg parallelogram, square corners (0px), 3px ink border, Slab shadow.
- **Sizes:** sm 36px tall / 12px padding / 13px label; md 48px / 20px / 16px; lg 64px / 28px / 20px. Label is display, uppercase.
- **Tones:** Rose (primary action), Grass (join / secondary), Electric (selected option), Paper (quiet: cancel, copy code, accept), Ink with Petal text (leave, catch). Fern is available but unused.
- **Active (selected):** an ink squiggle pattern (Petal squiggle on Ink) fills the slab, so selection never relies on color alone.
- **Press / Disabled / Focus:** see The Press-Into-Shadow Rule; 150ms ease-out on transform and shadow; focus is a 3px Fern outline offset 4px.
- **Icon button:** 40px square paper tile, 3px border, Slab-small shadow, sinks 2px on press; holds a 20px Hugeicons SVG icon at stroke 2.4.

### Tape (title strip)
A strip of colored tape behind a display-font heading: padding 0.15em 0.45em 0.2em, rotated -2deg (or +1.5deg for the right tilt), any slab tone. Used for the wordmark, player names, variant titles, the turn indicator (Rose when it's your move, Paper-with-terrazzo when it's theirs; tilt flips with the turn) and round-end headlines.

### Inputs / Fields
- **Style:** Paper fill, 3px ink border, square, Slab-small shadow; name field 56px tall with 18px semibold text, room-code field 48px with 24px display letters tracked 0.3em.
- **Focus:** shadow grows to Slab; caret is Rose. Placeholders are ink at 65%.

### Cards / Containers
- **Variant cards (Lobby radio):** full-bleed tone with its own pattern (Classic: Rose + ink dots; Flip: Ink + terrazzo; No Mercy: Electric + squiggles), tilted ≤1deg, 16px padding, a fan of three real card faces. Selected = Lift shadow, 4px rise and a paper "Dipilih" sticker.
- **Sheets (drawers):** bottom drawers with Paper fill and a 3px ink border on three sides; display uppercase title, 20px padding, safe-area bottom padding. Used for house rules and the color picker.
- **Round-end receipt:** Paper card, 3px border, Lift shadow, 20px padding, a squiggled Rose tape stuck on its top edge; score bars are -12deg skewed Petal troughs filled Rose (you) or Fern (partner).

### Navigation
No nav bar. A 40px icon button (back arrow) at top-left on room and table screens; leaving a live game swaps the header for an inline confirm with Ink "Keluar" and Paper "Batal" slabs. Connection problems surface as an ink-on-petal skewed banner pinned to the top.

### Playing Card (signature)
Hand-drawn SVG card stock (100x146 viewBox): suit-colored body with its suit motif, 4px ink outline, a tilted Paper oval holding the value in Dela Gothic One, corner indices. Wilds show a four-quadrant suit wheel; Flip's dark side adds an inner ink frame. Card backs are Ink with terrazzo and a Rose "UNO" tape. In hand: playable cards rise 12px with an Electric underline bar; unplayable cards on your turn take an ink hatch.

### Discard Ring and Podium (signature)
The discard pile sits inside a 20px-radius ring with an 8px inset band in the live suit color (hatched paper when no color is set) and a small "Warna ..." tag. Both piles stand on an Electric podium skewed -12deg, squiggled in translucent ink, with the Lift shadow.

### Motion
GSAP throughout, all short and springy: cards fly to the discard in 0.38s (power3.out) and from the deck in 0.42s with a 0.05s stagger; Flip rotates every card face 90deg to 0 in 0.45s (back.out 1.6); round-end panels pop in with back.out(1.7) and count up the points; Home shapes bob on 2.6s+ sine yoyo. Lottie bursts and confetti are generated in-house from the brand palette (scripts/lottie.mjs). `prefers-reduced-motion` disables all of it.

## Do's and Don'ts

### Do:
- **Do** outline every object in 3px ink (`ink`) and seat it on a hard zero-blur ink shadow: Slab (4px 5px), Slab-small (2px 3px) or Lift (6px 8px).
- **Do** use Brilliant Rose (`rose`) for the one main action on a screen, and Paper or Grass slabs for everything else.
- **Do** signal state with pattern as well as color: squiggle for active/selected, ink hatch for disabled or unplayable, terrazzo for idle.
- **Do** set every label, button, name and title in Dela Gothic One uppercase, and back body copy over terrazzo with paper at 90%.
- **Do** keep all five mandated brand colors (electric, grass, fern, petal, rose) present across the app; they are a brand commitment.
- **Do** hand-make every illustration and animation (manual SVG, Blender renders, generated Lottie); none may be AI-generated.
- **Do** honor `prefers-reduced-motion` and the 3px Fern focus outline on every interactive element.

### Don't:
- **Don't** reintroduce green felt, glossy cards, or soft blurred drop shadows; that is the standard UNO app this world rejects.
- **Don't** use gradients, glows, or backdrop blur.
- **Don't** round buttons, inputs, sheets or panels; corner radius belongs to card stock, the discard ring and dots.
- **Don't** add greys or a second dark; lighten ink by opacity instead.
- **Don't** use suit colors for UI chrome, or brand colors as stand-ins for suits outside Green/Fern and Pink/Rose.
- **Don't** rotate the whole logo, straighten its -8deg P, change the wordmark font, or give the logo a shadow or gradient (brand/logo/GUIDELINES.md).

## Illustrations

Hand-modeled in Blender (`scripts/blender/scene.py`, Eevee + Freestyle ink outlines, transparent background); no generative AI. Two mascots stand in for the monogram's letters: **Mochi**, a Brilliant Rose sphere (the C), and **Pip**, an Electric Green capsule with a squiggle antenna (the P). They share the stage with Memphis props: a terrazzo pedestal, an ink/grass striped cylinder, cones and a squiggle tube.

| File | Used on |
|---|---|
| `src/assets/illustrations/hero.webp` | Home: the pair leaning on each other |
| `src/assets/illustrations/waiting.webp` | Waiting room: Pip alone |
| `src/assets/illustrations/win.webp` | Round end (you won): crowned on a podium |
| `src/assets/illustrations/lose.webp` | Round end (you lost): Mochi pouting |

Re-render with `blender --background --python scripts/blender/scene.py -- <hero|win|lose|waiting> <out.png>`, then trim and export to WebP. Provenance sidecars sit next to each WebP.
