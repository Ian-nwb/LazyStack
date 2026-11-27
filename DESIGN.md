---
name: LazyStack Showcase
description: The Swiss poster system of the public showcase page, black sheet, white type, a visible 12-column module grid.
colors:
  ink: "#050505"
  paper: "#ffffff"
  rule: "#3f3f46"
  rule-unfilled: "#2a2a2e"
  mute: "#a1a1aa"
  unlit: "#8a8a93"
  mute-ink: "#52525b"
  output-text: "#e4e4e7"
  module-line: "#1c1c1c"
  hot: "#121212"
  lit: "#141414"
  row-hover: "#0e0e0f"
typography:
  numeral:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(9rem, 24vw, 25rem)"
    fontWeight: 800
    lineHeight: 0.76
    letterSpacing: "-0.06em"
    fontVariation: "'wdth' 96"
  display:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(4rem, 13.5vw, 14rem)"
    fontWeight: 800
    lineHeight: 0.8
    letterSpacing: "-0.06em"
    fontVariation: "'wdth' 96"
  headline:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(3.25rem, 7.4vw, 7.5rem)"
    fontWeight: 800
    lineHeight: 0.86
    letterSpacing: "-0.045em"
  title:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2rem, 3.6vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  statement:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.125rem, 1.45vw, 1.375rem)"
    fontWeight: 400
    lineHeight: 1.42
  body:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "'tnum' 1"
  label:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
  action:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.375rem, 1.9vw, 1.75rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
  mono:
    fontFamily: "ui-monospace, SF Mono, Cascadia Mono, DejaVu Sans Mono, Menlo, Consolas, monospace"
    fontSize: "clamp(0.6875rem, 0.86vw, 0.875rem)"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: "0px"
spacing:
  margin: "clamp(20px, 2.8vw, 44px)"
  gutter: "clamp(8px, 0.9vw, 14px)"
  rule-indent: "36px"
  section: "clamp(72px, 11vh, 140px)"
  section-close: "clamp(80px, 13vh, 160px)"
  row: "14px"
  cell: "16px"
components:
  button-download:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.none}"
    padding: "16px 20px"
    height: "92px"
  button-download-hover:
    backgroundColor: "{colors.output-text}"
    textColor: "{colors.ink}"
  button-alt:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "16px 18px"
    height: "92px"
  button-alt-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  button-copy:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "9px 12px"
  button-copy-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  output-panel:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.output-text}"
    typography: "{typography.mono}"
    rounded: "{rounded.none}"
    padding: "22px 24px"
  stage-mark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    size: "40px"
  ruled-row:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    padding: "16px 16px 16px 0"
  ruled-row-hover:
    backgroundColor: "{colors.row-hover}"
---

# Design System: LazyStack Showcase

Scope: this system governs the public showcase page (`showcase/index.html`) only. The Electron desktop app UI in `src/` has its own separate zinc UI and is out of scope; do not apply these rules there, and do not pull that UI's cards, radii or accents into the showcase. `showcase/index.legacy.html` is an archived earlier page and is not this system.

## Overview

**Creative North Star: "The Swiss Poster at Night"**

The page is an International Typographic Style poster printed white on a black sheet. A visible 12-column module grid stands behind everything, numbers are the headlines, type sits flush left in one grotesk at extreme scale contrast, and the only pictures are objective records: real app screenshots and real CLI output, numbered as figures. Composition comes from ruled full-width rows and grid placement, never from boxes.

Every section is black. White is reserved for type, the mark, rules that carry structure, and the one action block per viewport. Grey exists only in the zinc family, for captions, hairlines and states. There is no hue anywhere on the page, which is a binding brand commitment.

One continuous vertical rule runs down the lifecycle stages (Pick, Generate, Run, Host, Upgrade) and fills as the reader scrolls; each stage's numbered square mark sits on it. Motion is a printing process: things are drawn, wiped, imprinted and printed line by line, and the whole page is complete without it.

**Key Characteristics:**
- Black sheet throughout; white only for type, the mark, structural rules and the single action block.
- Visible 12-column module grid, fixed behind the content.
- One family (Archivo variable) from 0.8125rem labels to 25rem numerals; system mono only for real code and output.
- Ruled rows and ruled tables instead of cards; square corners everywhere.
- Figures are real screenshots and real CLI output, captioned "Fig. n".
- Motion gated behind `html.motion`; the static page is the complete page.

## Colors

A strictly achromatic palette: near-black ink, pure white paper, and a short zinc ramp that only ever describes structure or state.

### Primary
- **Poster White** (paper): all type on the sheet, the mark, the 2px heavy rules under table heads and over ordered lists, the lifecycle rule's filled part, and the fill of the one action block per viewport. Also the selection highlight and the reading-progress bar.

### Neutral
- **Night Sheet** (ink): the background of every section, output panels and stage marks. Also the text colour on the white action block.
- **Zinc Hairline** (rule): every 1px structural line: header and section top borders, table row rules, figure frames, output panel borders, the hosting type cells.
- **Zinc Caption** (mute): captions, ledes, secondary table columns, nav links at rest, the `$` prompt.
- **Unlit Grey** (unlit): lifecycle timeline steps not yet reached, comment lines in output panels.
- **Zinc Ink** (mute-ink): the secondary line inside the white action block (and inside the outlined block on hover), where it sits on white.
- **Output White** (output-text): body text inside output panels, and the pressed tone of the white action block on hover.
- **Module Line** (module-line): the lamp tint flashed in the hosting types keyframe. (The visible module grid overlay was removed in 3.0; the grid stays a layout system, not a drawing.)
- **Lit Cell** (lit): the hosting type cell the walking lamp currently sits on.
- **Row Hover** (row-hover): the hover tint of a ruled table row.
- **Unfilled Rule** (rule-unfilled): the not-yet-read part of the lifecycle rule.

### Named Rules
**The Black Sheet Rule.** Every section background is ink. There are no white or grey section bands; the earlier alternating-sheet idea was dropped by the user.

**The One White Block Rule.** At most one filled white block per viewport, and it is the primary action (Download). Secondary actions are outlined, never filled.

**The No Hue Rule.** No colour outside black, white and zinc, including in states, diffs and status: emphasis is weight and white, de-emphasis is grey or strike-through.

## Typography

**Display Font:** Archivo variable, self-hosted (`assets/fonts/archivo-latin.woff2`, weight 100–900, stretch 62–125%), with Helvetica Neue and Arial as fallbacks.
**Body Font:** Archivo, same file.
**Label/Mono Font:** the system mono stack (ui-monospace, SF Mono, Cascadia Mono, DejaVu Sans Mono, Menlo, Consolas), only for real commands, file names and recorded output.

**Character:** One grotesk carries the whole poster; hierarchy comes from scale and weight alone, with display sizes tightly tracked and very short line heights so numerals and stage names read as shapes. Tabular figures are on for the whole page.

### Hierarchy
- **Numeral** (800, stretch 96%): the monumental count that is the hero headline ("142"). Shrinks to clamp(7.5rem, 44vw, 11rem) under 640px. Counts up from zero on load.
- **Display** (800, stretch 96%): the closing call, full width.
- **Headline**: stage and section names ("Pick.", "The catalog."), always a single word or short phrase with a full stop.
- **Title**: the hero sentence beneath the numeral.
- **Statement**: the paragraph that sits opposite each headline, bottom-aligned to it, max 36ch.
- **Body**: running text and table cells, 1.0625rem/1.55; sub-paragraphs in Zinc Caption, max 44ch.
- **Label**: table heads, list heads, the "Fig. n" figure labels, the Copy button.
- **Action**: the primary line of the download block.
- **Mono**: output panels, `code`, `kbd` keys (700, 0.8125rem, outlined).

### Named Rules
**The Number Is The Headline Rule.** Counts from the real catalog are set as display type, not decorated; never invent a number to fill the slot.

**The Real Mono Rule.** Mono appears only for text a user would type or a program printed. Labels, captions and navigation are never mono.

## Layout

A 12-column module grid (`repeat(12, 1fr)`) with an outer margin of clamp(20px, 2.8vw, 44px) and a gutter of clamp(8px, 0.9vw, 14px). Every section and row places content on these columns. The grid is a layout system only; it is not drawn on the page.

The first viewport splits six and six: numeral, title, lede and actions on the left; the App Stack screenshot on the right, bleeding off the right edge, with its caption on the shared baseline. The action group is its own six-column subgrid: download block spans 4, the outlined Windows block spans 2, the npx line spans 6 under a hairline.

Lifecycle stages share one layout: column 1 holds the vertical rule and the stage mark; the headline spans 2–7 indented 36px off the rule; the statement spans 8–12, bottom-aligned. Bodies below keep the 36px rule indent. Plain sections (catalog, CLI) drop the rule and run 1–8 / 9–12.

Vertical rhythm: sections are separated by a 1px top hairline and padded clamp(72px, 11vh, 140px) top and bottom; the close gets clamp(80px, 13vh, 160px). Ruled rows run 11–16px vertical padding.

Breakpoints:
- **≤1100px**: nav hides; hero stacks to full width with the screenshot below the actions; statements drop beneath headlines; bodies span 2–12 with the 36px indent; hosting types reflow to 4 columns; closing actions go full width.
- **≤640px**: the lifecycle rule moves to the margin (marks shrink to 32px) and content indents 34px; tables become stacked rows with inline `data-label`s; hosting types go to 2 columns; lists go single column.

## Elevation & Depth

Flat. There are no shadows, gradients or layered surfaces; depth is conveyed only by rule weight (1px Zinc Hairline for rows and frames, 2px white for heads and the lifecycle rule) and by the few dark tints for state. The one box-shadow in the page is the expanding ring of the "now" marker in the Run timeline, which is motion, not elevation.

### Named Rules
**The Rule Not Box Rule.** Structure is drawn with lines on the sheet. A region earns a border only when it frames a real artifact (a screenshot or an output panel).

## Shapes

Square corners everywhere (0px); there is no radius token. Recurring geometry: full-width horizontal rules, the 2px vertical lifecycle rule, 40px square stage marks, 1px framed figures whose right border is removed where the figure bleeds off the page edge, and the 8px square "now" marker. The mark itself is two chevrons under a 2×2 rhombus grid, white only.

## Components

### Buttons
Blunt, poster-like blocks; the primary is the only filled white shape in the viewport.
- **Shape:** square (0px).
- **Primary (download block):** white fill, ink text, 92px minimum height, 16px 20px padding; action-weight title with a Zinc Ink detail line below and a 28px drawn download arrow at bottom right. Spans 4 of 6 columns in the hero, 5 of 12 at the close.
- **Hover / Focus:** fill drops to Output White, a faint diagonal sheen sweeps across, the arrow drops 4px; press scales to 0.98. Focus is a 2px currentColor outline offset 4px, page-wide.
- **Secondary (outlined block):** 1px white outline on ink, same 92px height, title over a Zinc Caption line; on hover it inverts to white fill with ink text.
- **Copy / Replay:** small outlined label buttons (1px currentColor, 9px 12px, 76px min width), inverting on hover; text swaps to "Copied" for 1.6s.

### The npx line
The command `npx lazystack` in mono with a Zinc Caption `$ ` prompt, a Copy button at the right, sitting under a 1px hairline across the action group. At the close it becomes a fully outlined block at the same 92px height. With motion on, the command types itself and leaves a blinking block caret.

### Ruled tables and lists
Rows are the composition. Heads are Label weight over a 2px white rule; rows are separated by 1px Zinc Hairline; the first column is bold; secondary columns are Zinc Caption. Row hover tints to Row Hover; list rows nudge 8px right on hover. Numbered step lists use the same 2px-top, 1px-between grammar with a fixed first column.

### Figures
Real screenshots inside a 1px Zinc Hairline frame, bleeding off the right page margin where placed at the edge. The caption below reads "Fig. n" in bold followed by a plain sentence in Zinc Caption; numbering runs continuously down the page and also labels output panels.

### Output panels
Recorded terminal output and generated files in mono on ink with a 1px hairline border and 22px 24px padding; body in Output White, comments in Unlit Grey, emphasis in bold white. Diffs show deletions in Zinc Caption with a strike-through and additions in bold white. Panels scroll horizontally rather than wrap.

### Lifecycle rule and stage marks (signature)
A 2px vertical rule through every lifecycle stage, centred in the first gutter, filling white from top as the reader scrolls (Unfilled Rule below the fill). Each stage carries a 40px ink square with a 1px white outline and its stage number in 800 weight; the square pops in when the fill reaches it.

### Run timeline
An ordered list of timed steps beside the recorded `lazystack dev` panel; both are driven by one frame list. Steps not yet reached are Unlit Grey, reached steps turn white, and the current step carries an 8px white square that blinks three times, then stays.

### Hosting types strip
A single ruled strip of cells (11 across, 4 at ≤1100px, 2 at ≤640px), Zinc Caption text, with a lamp that walks along them every 650ms while on screen (Lit Cell tint, white text).

### Navigation
A top row ruled underneath: the mark and wordmark at left, section links in Zinc Caption that turn white and draw a 1px underline from the left on hover, version and GitHub at right. A 2px white reading-progress bar runs along the very top.

### Motion grammar
Motion is opt-in: a head script adds `html.motion` only when reduced motion is not requested and IntersectionObserver exists, and every hidden state is scoped under `.motion`, so the page is complete without JavaScript. Reveal targets get `.rv`, and an IntersectionObserver (threshold 0.18) adds `.in` once. Easing is `cubic-bezier(.16, 1, .3, 1)` for most motion, `cubic-bezier(.77, 0, .18, 1)` for wipes and imprints. Keyframes and roles:
- `drop`: module columns draw down on load, staggered 60ms per column.
- `dash` / `pop`: the mark draws its chevrons and pops its four cells.
- `imprint`: the hero numeral is revealed bottom-up as if pressed.
- `rise`: headline letters (and hero words) rise out of a blur, staggered 26ms.
- `lift`: the general entrance for statements, captions, rows, nav and secondary actions.
- `reveal`: the white download block wipes in from the left.
- `wipe` / `show` / `settle`: a zinc (#3f3f46) block sweeps across a figure and leaves the screenshot behind, which settles from 1.08 scale. Never white: the action block stays the only white block.
- `print`: output panels print top-down in 24 steps.
- `lamp`: hosting type cells light up in sequence.
- `markpop`: a stage mark pops onto the lifecycle rule.
- `nudge`: the download arrow nudges down twice, then rests.
- `blink` on the current Run step's square: three blinks, then solid.
- `blink`: the typing caret, eight blinks, then solid. Every loop on the page is finite except the hosting-types lamp, which walks only while that row is on screen.

Under `prefers-reduced-motion: reduce` every animation and transition is removed.

## Do's and Don'ts

### Do:
- **Do** keep every section on the ink sheet and reserve white for type, the mark, structural rules and one action block per viewport.
- **Do** place everything on the 12-column grid using the margin and gutter clamps. **Don't** draw the grid as visible lines: the overlay was removed at the user's request.
- **Do** build sections from ruled rows: 2px white rule under heads, 1px Zinc Hairline between rows.
- **Do** show only real screenshots and real CLI output, framed in 1px hairlines and captioned "Fig. n" with continuous numbering.
- **Do** set catalog counts and stage names as display type with tight tracking (-0.045em to -0.06em) and short line heights (0.76–0.86).
- **Do** gate every hidden state behind `.motion` so the static page is complete, and keep the reduced-motion kill switch.
- **Do** use mono only for commands, file names and recorded output.

### Don't:
- **Don't** add white or grey section bands; every section is black.
- **Don't** use cards: no boxed tiles, feature grids, rounded containers or drop shadows.
- **Don't** introduce any hue, including for success, error, diff or status states.
- **Don't** put eyebrows or kickers (small uppercase labels) above headlines; the headline stands alone.
- **Don't** add a second filled white block to a viewport; secondary actions are outlined.
- **Don't** round corners; the system has no radius.
- **Don't** apply this system to the Electron app UI in `src/`, which has its own zinc UI.
