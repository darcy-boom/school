# CAU Information Hub Implementation Plan

> **Execution note:** Follow the project-local `writing-plans`, `firecrawl`, `claude-design`, and `popular-web-designs` skills. The selected visual reference is the Vercel design system, adapted into a monochrome editorial dashboard.

**Goal:** Build a verified, locally previewable HTML information hub for current China Agricultural University notices, activities, competitions, hot topics, and campus services.

**Architecture:** A static HTML shell loads a local JavaScript data registry. Rendering, filtering, sorting, search, dialog details, and coverage auditing run entirely in the browser with no build step. Research evidence is kept in a human-readable source ledger next to the page.

**Tech Stack:** Semantic HTML5, CSS custom properties, vanilla JavaScript, local static assets.

---

## Task 1: Freeze scope and evidence

**Files:**
- Create: `docs/spec/cau-info-hub-spec.md`
- Create: `data/source-ledger.md`
- Create: `data/items.js`

**Step 1:** Record the 2026-08-23 snapshot boundary, public-source limitation, and verification hierarchy.

**Step 2:** For every displayed item, record title, official URL, publication date, relevant deadline, evidence level, and caution notes.

**Step 3:** Exclude entries whose actionable details cannot be confirmed, and downgrade title-only findings to `官方索引`.

**Verification:** Open every URL stored in `items.js` or confirm it was returned by the research surface; ensure no unsupported deadline is added.

## Task 2: Build the semantic page shell

**Files:**
- Create: `index.html`

**Step 1:** Add accessible landmarks: header, main results region, deadline rail, source audit section, footer, and modal dialog.

**Step 2:** Add category and verification filters as real buttons with pressed states.

**Step 3:** Add search input, sort control, result counter, empty state, and a no-JavaScript notice.

**Verification:** Inspect the DOM and confirm controls have labels, dialog semantics, and logical tab order.

## Task 3: Implement the monochrome design system

**Files:**
- Create: `styles.css`

**Step 1:** Define black, paper-white, and gray tokens, typography, border, shadow, spacing, and motion variables.

**Step 2:** Implement a desktop three-column information layout with a compact black masthead.

**Step 3:** Add mobile breakpoints, visible focus states, high contrast, and reduced-motion handling.

**Step 4:** Perform a visual-slop audit: no gradients, no decorative pills, no excessive rounding, no oversized title, no fake metrics, no unsupported visual claims.

**Verification:** Render at 1440×1000 and 390×844; inspect for clipping, overflow, contrast, hierarchy, and awkward line breaks.

## Task 4: Implement data-driven interaction

**Files:**
- Create: `app.js`
- Consume: `data/items.js`

**Step 1:** Normalize dates against the snapshot date and compute upcoming, ongoing, archived, and undated states.

**Step 2:** Render filtered cards and the nearest deadlines without injecting untrusted HTML.

**Step 3:** Implement combined query/category/verification/status filters and deterministic sorting.

**Step 4:** Populate and control the details dialog, including source links and caution notes.

**Step 5:** Render the channel coverage ledger and current filter summary.

**Verification:** Exercise every filter combination, search for known titles, open/close the dialog with mouse and Escape, and verify external links use safe attributes.

## Task 5: Validate content and handoff

**Files:**
- Create: `README.md`
- Modify as needed: `index.html`, `styles.css`, `app.js`, `data/items.js`

**Step 1:** Run static checks for missing local files, duplicate IDs, malformed URLs, and JavaScript syntax errors.

**Step 2:** Use the in-app browser to test the local page and collect desktop/mobile screenshots.

**Step 3:** Compare every visible date and source count with `data/source-ledger.md`.

**Step 4:** Document how to open the preview and how to update the snapshot later.

**Expected output:** A self-contained local website whose information cards are traceable to explicit sources and whose inaccessible channels are clearly disclosed rather than silently treated as complete.
