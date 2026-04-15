# Changelog

All notable changes to the Kiki Marine Survey PWA are documented here.

Each entry is grouped under a version number. The format loosely follows
[Keep a Changelog](https://keepachangelog.com/). Version numbers match
`APP_VERSION` in `app.js` and `CACHE_NAME` in `sw.js`.

When making any user-visible change, add an entry here **before** pushing
the commit. This gives future-you a searchable history of decisions, and
lets you roll back to a specific version with confidence.

---

## v2190 — 2026-04-14

### Changed — ALL component builders retired; every item uses the chip picker

The remaining `COMPONENT_BUILDERS` entries (bow thruster, stern
thruster, sail drive, IPS pod drive, engine general condition,
generator, bowsprit/deck impact-and-resonance) were still rendering
the old dropdown-driven UI on Ahoy Vey. `COMPONENT_BUILDERS` is now
an empty object — every item in the survey falls through to the
chip picker using the library entries (which v2186 already tagged
with `phase` + `severity` metadata).

Net ~445-line reduction in app.js. Consistent UX across the entire
survey. Items without explicit curated chips use the auto-classifier
output from v2186's batch pass.

### Added — Strip "limited trial run" text when header setting isn't Yes

`applyWritingFixups` now reads `survey.seaTrial` and, when it isn't
"Yes", drops trial-run-referring sentences from already-saved notes
on load + save. 16 library entries mention trial run; they get
scrubbed for any survey where the intro page's Limited Trial Run
dropdown is blank or "No".

Applies to both the textarea initial value and the save path, so
existing text containing "…tested under load during the limited trial
run" becomes "…tested under load" automatically.

### Changed — Cards show FULL saved notes (no 80-char truncation)

Notes preview on the item card is no longer cut off. Font bumped to
13px, `white-space: pre-wrap` preserves paragraph breaks, content
HTML-escaped for safety. Tap the card still opens the notes sheet
for editing.

### Added — Neutral "No trim tab anodes fitted" chip for all A/B/C

Some boats ship without trim-tab anodes by design — it's a
manufacturer choice, not a deficiency. Added the same observed-phase
chip to all three trim tab ratings:
  "No anodes were fitted on the trim tabs — this varies by manufacturer
   and is not a deficiency."

### Fixed — Component-builder bypass for N/A and Not-tested ratings

Even when a builder existed, rating = Not applicable or Not tested
now skips the builder and shows the N/A chip ("No bow thruster was
fitted on this vessel.") or the NT chips. The dropdown builder only
renders for actual A/B/C ratings on the items that still have
builders — and after this release, that's zero items.

### Fixed — "The both anodes" grammar (side=both)

`[side]` → "both" now strips the preceding article, so "The [side]
anodes were more than 50% depleted." becomes "Both anodes were more
than 50% depleted." Port and starboard still read "The port anodes
…" / "The starboard anodes …" as before.

---

## v2197 — 2026-04-14

### Removed — Redundant standalone "Conductivity readings were taken" chips

Ticking both "Conductivity readings were taken on a relative 0 to 999
scale." AND any actual finding chip produced awkward double-
introduction prose. Deleted 15 of these standalone boilerplate chips
from conductivity sections across the library. The remaining
observation chips are self-describing (e.g. "The hull returned
elevated readings of [low to high]." / "Conductivity testing of the
cockpit, on a relative 0 to 999 scale, did not detect concerning
readings.") — ticking one chip yields a clean, complete sentence.

### Rewritten — Cockpit conductivity testing A/B/C self-contained chips

Every chip now works standalone — the 0-to-999 scale reference is
inlined where it adds context ("Conductivity testing of the cockpit,
on a relative 0 to 999 scale, did not detect concerning readings.")
and omitted where it would be verbose. No chip requires a companion
"readings were taken" chip. 26 chips total across A (6) / B (9) /
C (8) / Not tested (3).

### Fixed — Bracket placeholder bugs

- `[[insert value]]` (double brackets) → `[insert reading range]`
  (picker recognizes this form and renders as low-to-high inputs)
- `[insert reading]` (singular, missing "range") →
  `[insert reading range]`

Fixed 5 such placeholders across the library.

---

## v2196 — 2026-04-14

### Changed — Area photo sections now offer both Take and Import buttons

Area photo sections (cockpit photos, deck photos, cabin photos, etc.)
had a single "Add More" button that went straight to the camera. The
per-item media sheet has offered both Take + Import since v2163 — area
sections now match that UX.

- 📷 Take Photos (primary, filled) — launches the batch camera
- 🖼️ Import photos from library / files (outlined) — file picker,
  multi-select, converts HEIC to JPEG automatically
- Helper caption: "Both buttons support selecting multiple photos at
  once. On desktop, you can also drag photo files onto any item card."

Also wired `attachPhotosToItem` to refresh the area-photo grid when
the label has one, so imports into cockpit/deck/etc. sections show
the new thumbnails immediately without reload.

---

## v2195 — 2026-04-14

### Added — Confirm dialog when skipping an item that has saved notes

Tapping ⊘ (exclude from report) on an item with notes now prompts:
"This item has saved notes. Skipping will mark it excluded from the
report and clear the text. Continue?" — with **Skip and clear** /
**Cancel** buttons. Confirming clears the notes text AND marks the
item excluded in one atomic save. Cancel keeps the notes intact.

Unskipping (toggling exclude OFF) is always safe and doesn't prompt.
Skipping an item with no notes (nothing to lose) also skips silently
without a prompt.

---

## v2194 — 2026-04-14

### Changed — Conductivity range input now reads "low to high" + yellow pill styling

The `[insert reading range]` placeholder previously rendered as two
number inputs separated by a bare en-dash — when unfilled, output
looked like "readings of – were noted". Clarified:

- The two inputs now have an explicit "to" label between them (not
  "–"), each with a tooltip reading "low reading (0–999 scale)" /
  "high reading (0–999 scale)".
- Inputs rendered on a soft yellow pill background so the slot is
  visually distinct from surrounding text.
- Placeholder when unfilled reads "[low to high]" so the surveyor
  sees at a glance what the field expects.
- Output text now reads "readings of 50 to 125" (using "to", not
  en-dash) for better prose flow in the completed note.

### Added — Missing `[insert reading range]` injected into 11 conductivity chips

Audited every library entry containing "elevated" + "conductivity";
11 chips described elevated readings without any range input.
Injected `[insert reading range]` into each so the surveyor can
specify low-to-high readings every time elevated conductivity is
mentioned:

- "… elevated in [describe area(s)] with readings of [low to high]."
- "Areas of elevated conductivity were present with readings of …"
- "Spider cracks or minor signs of elevated conductivity with readings
  of … were visible"
- "minor cracking or elevated conductivity with readings of … was
  detected"
- …plus 7 more similar patterns across hull/deck/coaming/locker/etc.

---

## v2193 — 2026-04-14

### Changed — "Other" catch-all items get rating + free notes only (no picker)

18 template items labeled "… - other" or "other features" / "other
gauges and instrumentation" / "other, additional features" are
miscellaneous-observation fields by design — the structured chip
picker doesn't fit. `showNotesSheet` now detects these patterns and
skips the picker rendering entirely. Surveyor gets the rating badge,
textarea, and Save/Cancel — nothing else.

Applies to: Hull exterior and propulsion - other, Deck and
coachroof/pilot house - other features, Aft deck - other features,
Spars and rigging - other, Cockpit - other features, Pilot house -
other features, Flybridge - other features, Flybridge - other
gauges and instrumentation, Pilot house - other gauges and
instrumentation, Cockpit - other gauges and instrumentation, Cabin
and conveniences - other features, Fuel, water and waste - other
features, Outboard engine - other features, Engines and drives -
other features, Steering and trim mechanics - other features,
Electrical - other features, Electrical, other, additional features,
Sails - other.

### Changed — Dropped "for continued use" filler phrase

"The X was in sound condition for continued use" → "The X was in
sound condition." The phrase was redundant filler — the rating +
surrounding context already imply continued use. Fixed 4 entries
across the library.

---

## v2192 — 2026-04-14

### Rewritten — Swim platform and ladder A/B/C with conductivity chips across all ratings

Old chips read: "The swim ladder was solidly mounted and in proper
condition" / "in without deficiency condition" / multiple near-
duplicates of the same sentence. Curated both section names
("Swim platform and ladder" + "Swim platform and ladder - condition
and conductivity readings") with a single canonical set per rating,
including conductivity language:

- **A (Critical)** — 11 chips. Structural damage, delamination/soft
  spots, failed ladder hardware, readings at/near 999, saturated
  core moisture. Moisture-ingress means. Haul for exploratory work.
- **B (Needs Attention)** — 15 chips. Localized damage, elevated
  conductivity of [range], generally-acceptable-but-elevated,
  minor-corrosion / stiff-ladder, localized wear with loose fittings
  (non-awkward grammar). Warrant-monitoring means + moisture-
  absorption interpretation. Recheck at next haul-out + repair
  actions.
- **C (Serviceable)** — 10 chips. Integrated with transom, dry, no
  visible damage, ladder secure + smooth + protected feet, no
  elevated conductivity, no deficiencies. Sound-condition means.
  No action / routine program.

All chips past tense, no "proper condition" / "without deficiency
condition" / "shows wear" present-tense grammar. Verified both
section names render identically since the template item uses the
long form.

---

## v2191 — 2026-04-14

### Rewritten — Hull exterior above the waterline A/B/C with non-mechanical vocabulary

The section's chips were using mechanical phrasing ("in good working
order", "functioning as intended") inappropriate for a structural,
non-mechanical item, plus "serviceable" which the user is avoiding.
Replaced all existing entries with curated A/B/C chips using
structural/cosmetic vocabulary:

- **A (Critical)** — 8 chips. Significant damage, structural cracking,
  impact penetration. Structural-concern means. Immediate professional
  assessment actions.
- **B (Needs Attention)** — 12 chips. Cosmetic scratches, gelcoat
  crazing, surface cracking, chalking/UV degradation. Means chips
  cover cosmetic vs gelcoat protection. Actions: buff/wax, sand/fair,
  compound polish, gelcoat refinish.
- **C (Serviceable)** — 11 chips. Good overall condition, recently
  buffed/waxed, gelcoat in good condition, cosmetic scratches only.
  Sound-condition means. Routine wash/polish/wax actions.

Improved phrasing on the scratches-and-oxidation sentence:
  old: "The hull showed minor scratches and oxidation typical of a
        boat of this age."
  new: "Minor scratches and light oxidation were noted on the hull,
        consistent with a vessel of this age and use."

---

## v2189 — 2026-04-14

### Changed — Survey cards now display the FULL completed note (no truncation)

The item cards on the survey page were cutting notes off at 80
characters with "…". Surveyor wants to read the completed notes in
full from the card view without tapping in. Removed the truncation,
increased font to 13px, set `white-space: pre-wrap` to preserve
paragraph breaks, and HTML-escaped the content so punctuation in
notes can't break card markup.

### Added — Neutral "no trim tab anodes fitted" chip for A/B/C

Some boats have trim tab anodes, others don't — it's a manufacturer
choice, not a deficiency. Added the same observed-phase chip to all
three ratings for "Trim tabs (exterior tabs, actuators, mounts and
anodes)":
  "No anodes were fitted on the trim tabs — this varies by
   manufacturer and is not a deficiency."

Surveyor can tick this on any rating (including C Serviceable) when
documenting the trim tab inspection without implying a finding.

---

## v2188 — 2026-04-14

### Fixed — "The both anodes" → "Both anodes" (grammar for side=both)

`[side]` replacement produced "The both anodes were more than 50%
depleted." when the surveyor picked Both. Updated the rebuild
handler to special-case side=both: strip preceding article and
capitalize when at sentence start.

- "The [side] anodes were …"      → side=both → "Both anodes were …"
- "the [side] lower seals"        → side=both → "both lower seals"
- "on [side] sides"               → side=both → "on both sides"
- Port/starboard still work the standard way.

---

## v2187 — 2026-04-14

### Added — Drive-count-aware pluralization + port/starboard/both side selector

Twin-outdrive vessels were reading singular prose ("The outdrive unit
was visually inspected") even when `driveLineCount === 2`. Two
additions:

1. **`{drives:singular|plural}` token** — resolves against
   `driveLineCount` in `contextFromSurvey`. Works identically to
   `{count:...}` but driven by drive count rather than rudder count,
   so it applies to outdrive / shaft / saildrive / IPS regardless
   of rudder presence. Applied to 44 curated outdrive chips.
   Examples on a twin-drive survey:
   - "The outdrive {drives:unit was|units were} visually inspected."
     → "The outdrive units were visually inspected."
   - "Minor blade damage was noted on the {drives:propeller|propellers}."
     → "Minor blade damage was noted on the propellers."

2. **`[side]` placeholder** — renders as a Port / Starboard / Both
   selector inline in the chip. Only renders when the survey has
   2+ drive lines (single-drive vessels don't need a side qualifier
   — the placeholder is collapsed to empty on render). Applied to 12
   outdrive chips where side-specific findings are common:
   - "Moderate corrosion was observed on the [side] drive housings in [area]."
   - "A minor oil weep was visible at the [side] lower seals."
   - "The [side] anodes were more than 50% depleted."

Both the drives token and the side selector are extensible — future
curation for any twin-drive system (twin shafts, twin saildrives, IPS
pods) can reuse them without code changes.

---

## v2186 — 2026-04-14

### Added — Phase + severity metadata on every library entry (batch-tagged)

Every entry in `text_library.json` now carries `phase` and `severity`
fields. Multi-sentence entries were split into one entry per sentence,
each tagged individually. Process:

1. **Split**: entries containing 2+ sentences → one entry per sentence,
   preserving section + rating. 1789 multi-sentence entries split.
2. **Phase classification** (expanded from v2173 heuristic):
   - Starts with `Monitor/Recheck/Recommend/Haul/Investigate/Professional/
     Immediate/Schedule/Replace/Service/Repair/Strip/Sand/Clean/Install/
     Address/Reseal/Retighten/Tighten/Fair/Refinish/Inspect/Verify/Test/
     Consult/Check/Confirm/Consider/Ensure/Apply/Fill/Refresh/Continue/
     Restore` → **action**
   - Contains interpretive verbs
     (`indicates/suggests/consistent/considered/abnormal/warrants/
     implies/represents/compromises`) or modal-recommendation patterns
     (`should be`, `must be`, `will cause`, `can mask`, etc.) → **means**
   - Otherwise → **observed**
3. **Severity estimation** 1–5 based on keyword patterns
   (severe/critical → 5, mild/routine → 1).
4. Entries with unexpanded `{any:...}` / `{specify:...}` tokens get a
   single conservative phase/severity — the picker still decomposes
   them per-option at render time.

Result: **2,419 total entries, every one tagged.** Phase distribution:
1754 observed / 264 means / 401 action. Skew toward observed reflects
the library's descriptive-prose style — individual sections can be
rebalanced by explicit re-curation when the surveyor hits any case
where the heuristic misclassified.

The 6 sections with full hand-curation (Hull conductivity, Hull
below-waterline damage, Primer/barrier/anti-fouling, Hull percussion,
Hull anodes, Outdrive) stay as authored — this pass skipped entries
that already had `phase` and `severity` set.

### Fixed — Outdrive chip picker empty due to map mismatch

`ITEM_SNIPPET_MAP` redirected the outdrive label to a section name
(`Outdrive(s) corrosion, anodes, propeller(s), boots and bellows`)
that didn't exist in the library after v2181's rewrite. Fixed to
point at the same long-form section name used by the stored entries
(`Outdrive(s) - (external), corrosion, anodes, propeller(s), boots
and bellows`).

---

## v2185 — 2026-04-14

### Fixed (urgent) — Outdrive chip picker was silently empty due to section-name mismatch

`ITEM_SNIPPET_MAP['Outdrive(s) - (external), corrosion, anodes,
propeller(s), boots and bellows']` mapped to the SHORTER legacy
section name, but v2181's curated library entries were stored under
the FULL long form. `findTextVariants` couldn't find any section
match, returned zero entries, so the picker never rendered — only
the manufacturer/model dropdowns showed above an empty textarea.
Fixed the map so the lookup section equals the stored section.
After push, the Outdrive(s) item will show the 15 A + 19 B + 11 C
chips with 3-phase grouping.

---

## v2184 — 2026-04-14

### Added — Inline count, location, and area inputs on chips

Three new placeholder types supported in library text:
- `[insert count]` — renders as a small number input (0-99). The
  picker interpolates the typed number on rebuild.
- `[insert location(s)]` / `[insert location]` — renders as a text
  input (~180 px) for typing a location phrase.
- `[describe area(s)]` — renders as a text input for area descriptions
  (replaces the hand-fill-after placeholder).

All inputs stop click-propagation so typing doesn't toggle the
checkbox, and fire `oninput` rebuild so the textarea updates live as
the surveyor types.

### Rewritten — Hull anodes A/B/C

23 total chips across the three ratings. Each rating's observed phase
starts with a count + location chip: "[N] hull anodes were fitted on
this vessel, located at [location(s)]." The surveyor types the
count + the location freehand.

- **A (Critical)**: severe depletion, missing entirely, galvanic-
  protection-lost means, per-ABYC-E-2 replacement required.
- **B (Needs Attention)**: >50% depleted, degradation, approaching
  end-of-life, replace-before-relaunch or at-next-haul actions.
  Removed the transom-specific language — B chips now cover any
  mounting location.
- **C (Serviceable)**: securely mounted, >50% material remaining, new
  or recently replaced, **"Although not a hull anode, a bonding
  plate was present and without deficiency."** for the bonding-plate-
  instead case.

---

## v2183 — 2026-04-14

### Changed — N/A produces a single canonical chip

Cut the N/A synthesizer from 3 chips per item to 1. The sole chip
reads "No [item] was/were fitted on this vessel." with verb agreement
based on the plural detection from v2182. The other two phrasings
("This vessel was not equipped with …" and "[Item] was not applicable
to this vessel") were surplus — user preference is a single clean
statement.

Not-tested ratings still produce 3 chips (observed x2 + action x1)
since the distinction between "not tested" and "operation not
verified" carries different nuances.

---

## v2182 — 2026-04-14

### Fixed — Grammar for auto-synthesized N/A chips

Items with plural labels ("Hull anodes", "Stanchions", "Lifelines/safety
rail") were producing grammatically wrong chips:
  "A hull anodes was not fitted on this vessel." ← wrong
  "This vessel was not equipped with a hull anodes." ← wrong
  "The hull anodes was not applicable to this vessel." ← wrong verb

Rewrote the N/A and Not-tested synthesizer with proper English:

1. **Plural detection**: original had `(s)` token, label contains a
   known plural noun (anodes, stanchions, lifelines, rudders,
   propellers, shafts, chainplates, rails, cables, gauges, tanks,
   etc.), or ends in plural-sounding "s" (excluding "ss"/"us"/"is"/
   "ness"/"ous" which are singular).
2. **Uncountable detection**: labels containing "lighting",
   "plumbing", "heating", "steering", "wiring", "instrumentation",
   etc. get no article.
3. **Article choice**: "a" vs "an" based on first vowel.
4. **`(s)` → "s"** expansion so "Fuel tank(s)" renders as "Fuel
   tanks" (not "Fuel tank" which would produce "No fuel tank were
   fitted").
5. **Trailing periods stripped** so labels like "Propane valve,
   regulator, gauge, storage compartment and vent." no longer
   produce doubled periods.

Examples after the fix:
- "Hull anodes" → "No hull anodes were fitted on this vessel." /
  "This vessel was not equipped with hull anodes." / "Hull anodes
  were not applicable to this vessel."
- "Binnacle" → "No binnacle was fitted on this vessel." / "This
  vessel was not equipped with a binnacle." / "The binnacle was not
  applicable to this vessel."
- "Lighting (cabin)" → "No lighting (cabin) was fitted on this
  vessel." / "This vessel was not equipped with lighting (cabin)." /
  "Lighting (cabin) was not applicable to this vessel."
- "Fuel tank(s)" → "No fuel tanks were fitted on this vessel." /
  "This vessel was not equipped with fuel tanks." / "Fuel tanks were
  not applicable to this vessel."

Not-tested chips get parallel grammar treatment (was/were agreement,
article handling, "(s)" expansion).

---

## v2181 — 2026-04-14

### Changed — Outdrive now uses the chip picker (retired dropdown builder)

Removed `COMPONENT_BUILDERS['Outdrive(s) - (external), corrosion,
anodes, propeller(s), boots and bellows']`. This item now uses the
standard chip picker with curated library entries.

Scope cleanups baked into the rewrite:
- **Trim tab mentions removed** — trim tabs have their own dedicated
  item ("Trim tabs (exterior tabs, actuators, mounts and anodes)").
  The outdrive chips no longer mention trim tab anodes.
- **Gimbal bearing mentions removed** — belongs in a separate inboard-
  drive context, not the outdrive external inspection.
- **0-anode case covered** — new C chip reads "No anodes were fitted
  on this outdrive." Surveyor can pick this when the vessel has no
  sacrificial anodes on the drive.

### Rewritten — Outdrive(s) - (external) library (A/B/C)

15 A chips, 19 B chips, 16 C chips — all past tense, 3-phase pattern,
severity sorted:

- **A**: severe corrosion, impact damage, cracked bellows, active oil
  leak, significant propeller damage, missing anodes. Sinking-hazard
  and must-remediate-before-service actions.
- **B**: moderate corrosion, hardening bellows, minor oil weep, minor
  prop damage, 50%-depleted anodes, peeling paint, stiff tilt/trim.
  Service / replace / strip-and-repaint / recondition actions.
- **C**: no damage / no corrosion / minor surface only, pliable
  bellows, no leaks, good prop, adequate or recently-replaced anodes,
  OR no anodes fitted, intact paint, smooth tilt/trim. No action /
  continue seasonal program / monitor anodes.

---

## v2180 — 2026-04-14

### Changed — Primer/barrier/anti-fouling now uses the chip picker (retired dropdown builder)

Removed the `COMPONENT_BUILDERS['Primer, barrier coat, anti-fouling']`
entry. This item now falls through to the standard sentence picker
powered by v2177's curated library entries (A/B/C with phase
structure, severity sort, no "Rudder Anti-fouling" dropdown that
didn't apply to outdrive boats). UX is now consistent with every
other curated item.

### Hidden — "Keel and keel joint" + "Keel bolts" on power boats

Power vessels don't have external ballast keels or keel bolts.
Added the two items to a `SAIL_ONLY_ITEM_LABELS` filter in the three
`shouldShowItem` / `itemApplies` / `shouldShowHeaderItem` hooks so
they're hidden from any survey with `vesselType === 'power'`.

### Added — Auto-synthesized chips for "Not applicable" / "Not tested" ratings

The library has no entries for non-A/B/C ratings, so setting an item
to "Not applicable" previously showed an empty picker. v2180
synthesizes phase-structured chips on the fly using the item's
transformed display label:

- **Not applicable** → 3 observed-phase chips:
  - "A [item] was not fitted on this vessel."
  - "This vessel was not equipped with a [item]."
  - "The [item] was not applicable to this vessel."
- **Not tested / Not verified** → 2 observed + 1 action chip:
  - "The [item] was not tested at the time of survey."
  - "Operation of the [item] was not verified at the time of survey."
  - "Recommend testing the [item] under operational conditions."

All sentences past tense, grammatically sensible, and use
`displayItemLabel` so rudder-stripped labels flow through correctly
on no-rudder vessels.

### Fixed — Picker renders with 1 or more chips

Lowered the threshold from `>= 2` to `>= 1` so every item with at
least one chip shows the picker (was blocking Hull percussion C
which collapsed to a single chip after dedupe).

---

## v2179 — 2026-04-14

### Fixed — Picker now renders even with just 1 unique chip

Hull percussion testing C had only one library entry that, after
rudder-token expansion + dedupe, collapsed to a single sentence.
Threshold was `_pickerSentences.length >= 2`, so zero chips rendered
and the surveyor saw only "Change template ▸". Lowered to >= 1 so
every item with at least one chip shows the picker.

### Rewritten — Hull percussion testing (Hull and rudder(s) impact and resonance testing) A/B/C

Full 3-phase curation:
- **A (Critical)** — 9 chips. Dull thud across significant areas,
  ringing tone indicating voids/delamination. Structural-concern means.
  Immediate haul + professional assessment.
- **B (Needs Attention)** — 9 chips. Localized variations, slight
  dullness, isolated hollow spots. Warrant-monitoring means. Monitor +
  moisture-test follow-up.
- **C (Serviceable)** — 7 chips. Clear and even tone, no hollow/dull
  areas. Sound-laminate means. No action / continue seasonal program.

All chips past tense, no "serviceable" verbiage, no `always` flags.

---

## v2178 — 2026-04-14

### Changed — Writing conventions enforced: past tense + "program" + no "serviceable" + no auto-included sentence

Three user-preference changes that shape every future chip curation:

1. **Past tense** for observed + means phases. Rewrote 22 curated
   library entries that were present-tense ("the damage is cosmetic"
   → "the damage was cosmetic"). Action phase stays imperative
   ("should be sanded").

2. **"program"** not "programme" — explicit exception to the
   otherwise-Canadian-English rule. Library scan + rewrite converted
   all existing uses.

3. **Avoid "serviceable"** — Dave is consciously differentiating
   Kiki's output from stock SAMS prose. Rewrote 3 curated-section
   uses of "the hull was serviceable overall" to "no evident damage
   was observed on the hull" and similar alternatives. 50 remaining
   uses in non-curated sections will get rewritten as Dave touches
   those sections.

4. **"Always" locked-chip concept removed.** Previously the top of
   each picker showed a pre-checked, disabled "boilerplate" sentence
   (e.g. "Conductivity readings were taken on a relative 0 to 999
   scale"). Removed the green "always" badge, the disabled state, and
   the row tinting. All chips are now optional and equal. Dropped the
   `always: true` flag from 9 library entries.

### Added — `applyWritingFixups` runs on note load AND save

Known present-tense snippet fragments + "programme" → "program" get
rewritten every time a note is opened (display-side fix) and saved
(persistence fix). This progressively cleans up already-saved
observations as the surveyor works through the items. Surveyor does
not need to re-pick chips to get the corrected text — it appears
automatically when the item is opened.

### Saved — Writing style feedback memory

Persisted these writing conventions to `.auto-memory/feedback_writing_style.md`
so future conversations remember them.

---

## v2177 — 2026-04-14

### Changed — Scope split between Hull damage vs Primer/barrier coat/anti-fouling

Two separate template items exist:
- "Evident damage or repairs to hull and rudder(s) (if applicable) below
  the waterline" — structural damage/repair concerns
- "Primer, barrier coat, anti-fouling" — coating-system condition

Anti-fouling chips were bleeding into the damage section, overlapping
scope with the dedicated coating item. Removed 12 anti-fouling-related
chips from the hull damage section across all 3 ratings and replaced
the B-rating action chips with damage-focused treatments (sand to
gelcoat, fair with compound, recoat with epoxy barrier) that stop at
the barrier coat layer. Anti-fouling recommendations now live only in
the coating section.

### Rewritten — Primer, barrier coat, anti-fouling library (A/B/C)

Full 3-phase curation with severity sorting:
- **A (Critical)**: 8 chips. Failed/missing anti-fouling, compromised
  barrier coat, extensive primer flaking. Immediate coating restoration.
- **B (Needs Attention)**: 11 chips. Worn thin / worn off anti-fouling,
  accumulated legacy coats, localized barrier-coat issues. Monitor +
  spot-repair / full recoat recommendations.
- **C (Serviceable)**: 9 chips. Intact coating system in good order,
  normal seasonal wear. Routine touch-ups, seasonal refresh, or no
  action required.

All chips use coating-system vocabulary only — no reference to hull
structural damage, which lives in the other item.

---

## v2176 — 2026-04-14

### Fixed — `{specify:opt1|opt2|...}` tokens now decompose into chips

The picker's sentence decomposer only handled `{any:...}` tokens.
`{specify:...}` tokens (single-select inline lists) leaked raw into
chip previews. v2176 decomposes them the same way: for each option,
graft the surrounding sentence context so each chip reads as a
complete sentence.
  "The hull was {specify:good|fair|poor}." →
  "The hull was good." / "The hull was fair." / "The hull was poor."

### Added — Marine-surveyor vocabulary supplements the spell dictionary

Inspection notes were flagging common trade terms ("recoated",
"fibreglass", "gelcoat", "delamination", "stanchion", "saildrive",
etc.) as unknown words. Added ~60 marine/surveyor terms as a
MARINE_EXTRAS list that augments `SPELL_DICT` after the base
dictionary loads. Covers finishes, structures, rigging, hardware,
and common abbreviations (ABYC, TP1332, NMMA, SOLAS).

### Rewritten — Hull(s) condition (below the waterline) A and C ratings

Curated both A and C with the 3-phase pattern:
- **A (Critical)**: 5 observed chips covering structural damage,
  blistering, delamination, impact penetration. 2 means chips on
  seaworthiness and remediation. 3 action chips for immediate
  professional response.
- **C (Serviceable)**: 7 observed chips for "good order / cosmetic
  wear / acceptable condition" variants + anti-fouling state. 3
  means chips for reassurance. 3 action chips for "no action / routine
  maintenance / seasonal inspection".

All three ratings (A, B, C) for this section now follow the same
phase-structured, severity-ordered pattern.

---

## v2175 — 2026-04-14

### Added — Severity-sorted chips within each phase + rating badge in header

Chips within each phase section (Observed / Means / Action) now sort
by severity ascending — mild findings first, severe last. This
matches the natural SAMS writing flow where you mention the lightest
applicable issues before escalating to the most serious.

Library entries can set `severity: 1-5` (1 = mild, 5 = severe). When
unset, the picker estimates severity from keyword patterns:
- 5 (severe): "severe", "critical", "structural", "compromise",
  "delamination", "catastrophic", "replace immediately"
- 4: "exposed", "gouging", "fairing compound", "epoxy barrier", "haul"
- 3: "blistering", "cracking", "moisture", "elevated", "sanded to"
- 2: "worn thin", "cosmetic", "scrape", "ding", "lightly sand"
- 1 (mild): "serviceable", "no concerns", "no softness", "no signs",
  "consistent with proper condition", "within normal range"

Applied explicit severity to 47 chips across the three curated sections
(Hull conductivity A/B/C + Hull condition below-waterline B).

### Changed — Rating letter shown in modal header + picker header

The notes modal title now displays a coloured rating badge (A red,
B amber, C green, etc.) inline with the item label, so the surveyor
always sees which rating they're writing for. The "Build observation"
picker header also shows the same badge.

---

## v2174 — 2026-04-14

### Fixed — `{any:opt1|opt2|...}` tokens now decompose into individual chips

The sentence-splitter in the picker was treating the whole
`{any:...}` token as one "sentence", producing a giant raw-text chip
with all options concatenated by `|` (unusable). v2174 preprocesses
text by:

1. Scanning for `{any:...}` tokens
2. Splitting prose before/after each token as its own sentence
3. Splitting each option inside the token as its own sentence (with
   `^CITATION` tags stripped)
4. Then applying the normal sentence splitter

This means every non-curated item with `{any:...}` options now renders
each option as a separate tickable chip, auto-classified by phase via
the heuristic. Surveyor can tick the specific findings that apply
without reading a wall of pipe-separated text.

### Rewritten — Hull(s) condition (below the waterline) B rating

Replaced the single `{any:...}` pipe-encoded entry with 18 curated
chips split into observed (9) / means (3) / action (6). Each chip is
one discrete finding or recommendation:

- **Observed**: anti-fouling worn thin / worn off, surface cracking,
  blistering, gouging, scrapes and dings, cosmetic scoring, exposed
  fibreglass — each with `[describe area(s)]` placeholder for
  hand-fill.
- **Means**: damage is cosmetic / localized / consistent with age.
- **Action**: range of treatments from light sand-and-recoat up to
  fairing compound + epoxy barrier + gelcoat + anti-fouling.

Surveyor ticks the observations that apply + the matching treatment
action. Always-on "Below the waterline, the hull was serviceable
overall." anchors the paragraph.

---

## v2173 — 2026-04-14

### Added — Observed/Means/Action 3-phase grouping in sentence picker + rating-aware severity

Baked the SAMS observation pattern into the picker UI:
1. **What was observed** — findings (the measurements / what you saw)
2. **What it means for this vessel** — interpretation in context
3. **What should be done** — recommendation / next step

Library entries can set `phase: "observed" | "means" | "action"`.
Entries without a phase fall back to a heuristic classifier:
- Starts with Monitor/Recheck/Recommend/Haul/Investigate/Professional/
  Immediate/Schedule → action
- Contains indicates/suggests/consistent/considered/abnormal/warrants/
  evidences/implies → means
- Otherwise → observed

Chips render grouped under phase headers (gray section bars). `always`
boilerplate stays pinned at the top of its phase.

### Rewritten — Hull conductivity A/B/C with rating-appropriate severity

Each rating's chips now strictly match its severity:
- **A (Critical)** — 10 chips. Severe findings only ("readings at or near
  999 across large areas", "softness/delamination detected"),
  structural-compromise interpretations, immediate-action
  recommendations. No "age-appropriate" reassurance language.
- **B (Needs Attention)** — 11 chips. Moderate elevated readings,
  "warrants monitoring", proactive actions. No "immediate" language.
- **C (Serviceable)** — 8 chips. Clean/baseline findings, "within normal
  range for vessel age", routine monitoring only. No "warrants action"
  language.

Pattern reference for future curation: A-observed chips describe
severe measurements; A-means chips interpret as structural risk;
A-action chips are urgent. B-means describe concerns to track;
B-action is "monitor" / "recheck" / "address proactively". C-means
is reassuring; C-action is "no action required" / "routine check".

---

## v2172 — 2026-04-14

### Added — "always" boilerplate + inline range inputs in sentence picker

Two picker upgrades driven by the Ahoy Vey conductivity workflow:

1. Library entries can set `"always": true`. Those sentences render
   pre-checked and disabled at the top of the picker with a green
   "always" badge, and always appear in the rebuilt textarea. Used for
   the "Conductivity readings were taken on a relative 0 to 999 scale"
   boilerplate that the surveyor said is always part of the sentence.

2. Any `[insert reading range]` placeholder in a chip renders as two
   inline number inputs (low–high, 0-999). Typing numbers triggers the
   rebuild and interpolates them as an en-dash pair (e.g., "150–275")
   into the output sentence. Click events on the inputs don't bubble
   up to the label, so typing doesn't toggle the checkbox.

### Rewritten — Hull and rudder(s) conductivity testing library (A/B/C)

Replaced the 6 existing pre-written paragraph variants with 19
single-sentence entries across A, B, and C ratings. Each rating now
has one `always` boilerplate sentence + a curated set of distinct
follow-ups the surveyor can tick:

- A (Critical): 5 chips covering severity descriptors + remediation asks
- B (Needs Attention): 6 chips covering range readings, findings,
  monitoring recommendations
- C (Serviceable): 5 chips covering clean readings, elevated-but-normal
  readings, and monitor/recheck follow-ups

All rudder verbiage stripped — the rudder/bronze/saildrive branches
don't apply to Ahoy Vey (outdrive) and would have been token-scrubbed
anyway, so they're removed from the source for cleaner chips.

This pattern (always + tickable sentences, optional inline inputs)
should be extended to other sections as the surveyor encounters them.

---

## v2171 — 2026-04-14

### Added — Sentence-level picker ("chips") for fast observation composition

Multi-variant rating cards are pre-written paragraphs; the surveyor had
to read all of them to pick one. New UI breaks every variant into
sentences, dedupes across all variants, and renders each unique
sentence as a checkbox row above the card list. Ticking sentences
rebuilds the Notes textarea in the original sentence order with a
single space separator. Untick to remove.

Behaviour:
- If 2+ unique sentences exist, the picker renders at the top of the
  Quick Insert area.
- The full-paragraph card list collapses to "Full paragraph templates ▸"
  since the picker satisfies the same need faster.
- Picker is per-item: `window._sentencePicker[sanitizedLabel]` stores
  the sentence array; `_kkRebuildFromSentencePicker(sanitizedLabel)`
  is the onchange handler attached to each chip.
- Downstream chip-strip (`{any:...}`, `{specify:...}` token builder)
  still works on the rebuilt text via a dispatched `input` event.

For outdrive / IPS surveys this combines with v2169's token expansion
so the chip picker's sentence options are already rudder-stripped —
no manual cleanup needed.

---

## v2170 — 2026-04-14

### Fixed — Dedupe identical snippet variants on no-rudder vessels + strip "rudder" from rating badges

On outdrive / IPS surveys the library's "C - one rudder" and
"C - two rudders" variants produce identical cleaned text after rudder
token expansion, so the surveyor was seeing two apparently identical
cards with confusing rudder-count badges. Two changes in
`showNotesSheet`:

1. After token expansion, dedupe any variants whose `.text` collapses
   to the same string. Keep the first. Card list now shows one card
   instead of two.
2. If the remaining variant's `rating` field mentions "rudder"
   (e.g. "C - one rudder"), collapse the badge to the base rating
   letter (e.g. "C") when the vessel has no rudder.

Sail / shaft-drive vessels are unaffected — both variants produce
different expanded text, so both cards continue to show.

---

## v2169 — 2026-04-14

### Fixed (urgent) — Snippet card preview now shows expanded text on no-rudder vessels

Cards in the Quick Insert panel were showing raw tokens like
`{if-rudder: and {count:rudder|rudders}}` on outdrive surveys because
`highlightSnippetDiffs` operated on `v.text` directly — never running
the rudder-gating token expansion before diffing. The surveyor saw
the literal placeholder text on the card face even though insertion
into the textarea would have produced clean prose.

Fix in `showNotesSheet`: before diffing, build a parallel
`sheetVariantsForDisplay` array with each `.text` field pre-expanded
through `expandSnippetTokens` (using the survey's
`KikiSnippetTokens.contextFromSurvey` context). The originals stay on
`sheetVariants` so insertion-time expansion still runs on the raw
template.

---

## v2168 — 2026-04-14

### Fixed (urgent) — Snippet cards / chip-builder now appear for renamed hull+rudder + Hydraulic steering items

`ITEM_SNIPPET_MAP` only had the OLD label forms (pre-v2162), so items
with the current template labels had no snippet section match —
`findTextVariants` returned zero, no cards appeared, and the
check-off-chip builder never activated. Added mappings:

- `Evident damage or repairs to hull and rudder(s) (if applicable) below the waterline`
  → `Hull(s) condition (below the waterline)`
- `Hydraulic steering (hoses, fittings, steering cylinder, tiller arm / tiller bolt or tie-bar, rudder post and stuffing box, etc.)`
  → `Hydraulic steering (hoses, fittings, steering cylinder, tiller arm or tie bar, rudder post and stuffing box, etc.)`

The three other renamed rudder labels (percussion testing, conductivity
testing, impact-and-resonance testing) were already mapped correctly.

---

## v2167 — 2026-04-14

### Fixed (urgent) — Firestore listener will no longer overwrite richer local surveys

Root cause of the Ahoy Vey data loss: when the user ran a manual
DevTools migration that wrote directly to IndexedDB via
`objectStore.put()`, it bypassed the `saveSurvey` wrapper that bumps
`lastModified` and pushes to Firebase. Cloud kept its older copy with
the older timestamp. On next page load the Firestore real-time listener
saw `remote.lastModified > local.lastModified` (because cloud had been
pushed by an earlier in-app save with `lastModified=now`, while local's
was unchanged from the SC import) and called `saveSurvey(remoteSurvey)`,
silently overwriting the merged data — losing 135ch of observation
text and 6 of the 12 photos on the hull/rudder item.

Defensive guard added in the Firestore `onSnapshot` listener: before
overwriting local with remote, score both surveys for content density
(text length, photo count, rated-item count). If local has
substantially MORE content than remote, the listener REFUSES the
overwrite and instead pushes the local copy back to Firebase to repair
the cloud. Threshold: local wins if it has > remote.text * 1.2 + 50
chars of text, OR more photos, OR more rated items.

This protects against any future scenario — manual migrations, race
conditions on multi-device sync, or a corrupted cloud copy — where a
naive timestamp comparison would silently regress data.

Console will print a clear warning whenever the guard fires:
`[Sync] REFUSED overwrite of "Ahoy Vey" — local is richer (...). Pushing local to cloud instead.`

---

## v2166 — 2026-04-14

### Fixed — Card labels now strip rudder text on outdrive/IPS surveys

Two latent bugs combined to make v2165's transform invisible on cards:

1. `displayItemLabel(itemLabel)` in `buildCompactItemHTML` was called
   without a `survey` argument, so it fell back to
   `window._currentSurveyCache` — which was READ in two places but
   never WRITTEN anywhere in the codebase. The transform always saw
   a null survey and returned the raw label unchanged.
2. `contextFromSurvey` defaulted `hasRudder` to true unless the
   survey had `hasRudder === false` saved explicitly. The
   SafetyCulture import never sets `hasRudder` (the B-09 logic that
   derives it only fires inside `saveSurveyDetails`), so Ahoy Vey
   had `hasRudder === undefined` and resolved to true.

Fixes:

1. `renderInspection` now sets
   `window._currentSurveyCache = survey` at entry. All
   `displayItemLabel(label)` calls (cards, finding lists, anywhere
   the survey isn't passed in) now see the right context.
2. `contextFromSurvey` derives hasRudder from `driveType` when the
   explicit field isn't saved: outdrive / IPS / saildrive →
   `hasRudder=false`, shaft / sail → `hasRudder=true`. Explicit
   `survey.hasRudder` still wins if set.

Verified: Ahoy Vey-shaped survey (vesselType=power, driveType=outdrive,
no `hasRudder` field) now correctly transforms all 4 rudder labels to
the no-rudder form. Sailboats unaffected.

---

## v2165 — 2026-04-14

### Fixed — Strip naked rudder mentions from snippets and Hydraulic steering label on no-rudder vessels

Outdrive / IPS / saildrive vessels (`hasRudder=false`) were still seeing
"rudder" in inserted snippet text and on the Hydraulic steering item
label. Root cause: 37 of the 49 rudder-mentioning snippets in
`text_library.json` are legacy content that predates the
`{if-rudder:...}` token system, so they passed through expansion
unchanged. The Hydraulic steering label has "rudder post and stuffing
box" inline in the parenthetical — components that don't exist on
outdrive boats.

Fix in `src/core/snippet_tokens.js`:

1. `expandTokens` now calls `scrubNakedRudderRefs` whenever
   `ctx.hasRudder === false`. Conservative pattern set:
   - Drops any sentence whose subject is rudder
     ("Rudder(s) condition was good.", "The rudders showed wear.")
   - Drops sentences led by `{specify:rudder|rudders}` token
   - Special-case verb-agreement fix: "the hull and rudder were/are X"
     → "the hull was/is X" (avoids "The hull were percussion tested.")
   - Strips inline " and rudder(s)" / " and the rudder" / " and rudders"
   - Strips leading "rudder(s) and " before another noun
   - Drops any leftover `{specify:rudder|rudders}` tokens
2. `transformLabelForDisplay` now collapses "Hydraulic steering
   (... rudder post and stuffing box ...)" → "Hydraulic steering"
   when `hasRudder=false`.

Sail and shaft-drive power vessels (hasRudder=true) are unaffected —
all original text passes through unchanged.

Tested with 5 representative snippet patterns + both rudder labels;
all behaved as expected. Surveyor can still hand-edit textarea text
for any edge cases the scrubber misses (the 49 known rudder snippets
mostly use stable patterns the scrubber covers).

---

## v2164 — 2026-04-14

### Added — "Spotlight/searchlight" item in Cockpit gauges category

Inserted into `insurance_survey_template.json` under "Cockpit gauges,
instrumentation and entertainment" between "Flood lights/deck lights"
and "Cockpit - other gauges and instrumentation". Options match the
existing Flybridge/Pilot house Searchlight items
(A–C, Powered up only, Not applicable, Not tested/not verified).

Reason: SafetyCulture import for Ahoy Vey had a "Spotlight/searchlight"
item with 2 photos and a C rating. The existing template only had
flybridge- and pilot-house-specific versions, which don't apply to a
cockpit-layout outdrive boat. Added the generic item so the orphaned
data can migrate cleanly onto a real template key.

### Fixed — HEIC attach failures now log actual error

`attachPhotosToItem` caught heic2any errors but `console.error('heicToJpegDataUrl
failed:', err)` emitted `[Object]` in DevTools, making diagnosis hard.
No code change needed for this thread — the `sips` conversion bypass
on Mac proved reliable. Noting here so future-me remembers the pattern.

---

## v2163 — 2026-04-14

### Fixed — HEIC photos now convert to JPEG on import (MacBook / iPhone)

Surveyor imported 6 photos from MacBook Finder into the "Evident damage
or repairs to hull and rudder below the waterline" item and all 6
rendered as broken-image placeholders in the media sheet. Root cause:
HEIC is Apple's default format for iPhone / Mac Photos, and Chrome
cannot decode HEIC in a standard `<img>` tag. The old import pipeline
ran `img.src = dataUrl`, `img.onerror` fired, and the canvas path
returned the original HEIC dataUrl unchanged — which then got saved to
IndexedDB and could never be rendered.

Fix:
1. `attachPhotosToItem` now detects HEIC by MIME type
   (`image/heic`, `image/heif`) or filename (`.heic`, `.heif`).
2. On detection, `heic2any` is dynamically loaded from CDN
   (cdnjs, cached after first use) and the file is converted to a
   JPEG blob before entering the date-stamp / canvas pipeline.
3. A final guard rejects anything that is not a renderable image MIME
   (`jpeg`, `png`, `webp`, `gif`) so we can never save a non-renderable
   format to IndexedDB again, even if future formats slip through.
4. Drag-drop and file picker also accept files with a `.heic`/`.heif`
   extension when the browser reports an empty MIME type (Finder DnD
   case).
5. Toast messaging: "Converting N HEIC photos…" on start,
   per-file failure count reported on completion.

Any photo already saved in HEIC format from v2162 will still show as a
broken placeholder — those need to be re-imported after pulling v2163.

---

## v2162 — 2026-04-14

### Changed — Snippet cards now APPEND on tap (multi-sentence composition)
- Tapping a second snippet card in the Notes sheet now **appends** the
  new snippet to the existing textarea text with a space separator,
  instead of replacing. This lets you tap 2–3 snippet cards to compose
  a multi-sentence observation per item. Empty textarea → normal insert;
  non-empty textarea → append. Shipped tonight for the Ahoy Vey
  lawyer-review deadline where each item benefits from richer prose
  than a single-snippet pick.

### Added — Import photos from library / files (MacBook + iPhone)

Shipped urgently to support the Ahoy Vey report deadline. Surveyor can
now attach existing photos (Camera Roll on iPhone, Files / iCloud Drive
anywhere, Finder on MacBook) to any checklist item. Multi-select
enabled so a batch of 10-20 photos can be attached in one picker
session.

- **Media sheet redesign:** the single "📷 Capture Photos" button is
  replaced by two clearly-labeled buttons:
  - **📷 Take photos** — camera (existing live-capture flow).
  - **🖼️ Import photos from library / files** — opens the OS file
    picker with `accept="image/*" multiple`. No `capture` attribute,
    so iOS shows the library/files chooser and macOS shows Finder.
- **Sortable thumbnails:** existing photos in the media sheet grid
  can be reordered by dragging one onto another. Order persists to
  IndexedDB.
- **Shared import helper** (`attachPhotosToItem`): FileReader → date
  stamp → savePhoto → survey.items[label].photos.push → saveSurvey →
  refresh compact card. One code path for all import sources.

### Present but not yet wired (defer to v2163)

The v2162 work originally included drag-and-drop onto checklist items.
The helper functions (`setupChecklistDragDrop`) are in app.js but NOT
yet invoked from `renderInspection`. Shipping without wiring them is
intentional — lower risk the night of a hard deadline. Will wire in
v2163 tomorrow with proper testing.

### Process
- Triple-checked: 106 tests pass, app.js syntax valid, versions
  consistent, pre-commit hook green in no-node simulated environment.
- Backlog item B-10 (category-level area photos, e.g. "Deck and
  coachroof area photos") logged for a future release.

---

## v2161 — 2026-04-14

### Changed — B-03 Firebase download (attempt 4)

v2160 diagnostic confirmed the SW's internal `fetch(event.request)`
throws the same `TypeError: Load failed` as page-context fetch. That
proves the SW is not causing nor can it fix the problem. v2161:

- **Reverted the SW Firebase-cloud proxy** — passive return again.
  Keeping the proxy was only wrapping the failure in a 599 without
  helping. Weather and Nominatim fetches already work via passive
  return, so Firebase should have the same opportunity.
- **Explicit fetch options** on the app-side Firebase Storage
  download: `mode:'cors'`, `credentials:'omit'`, `cache:'no-store'`,
  `redirect:'follow'`. Strips default cookies/credentials that iOS
  WKWebView standalone (PWA) mode may reject cross-origin. This is
  the last code-level attempt; if it still fails the remaining path
  is Firebase Storage bucket CORS configuration (admin task, not app
  code).

### If this still fails — the likely remaining cause
Firebase Storage bucket needs explicit CORS config allowing the
GitHub Pages PWA origin. To check and fix (requires Google Cloud
shell or `gsutil` locally):

```
gsutil cors get gs://<your-bucket>
# If empty or restrictive, set:
echo '[{"origin":["https://daveseagrim.github.io"],"method":["GET"],"maxAgeSeconds":3600}]' > cors.json
gsutil cors set cors.json gs://<your-bucket>
```

The bucket name is visible in Firebase Console → Storage → "gs://..."
header.

### Process
- Triple-checked: 106 tests pass, versions consistent, pre-commit hook
  green in no-node simulated environment.

---

## v2160 — 2026-04-14

### Fixed — B-03 Firebase download (attempt 3)

Dave's v2159 diagnostic showed my SW proxy also failed (returned the
custom HTTP 599 I used to signal SW fetch failure). This proves the
transport problem is deeper than which context originates the fetch —
both page fetch and SW-context fetch hit the same iOS PWA / WKWebView
cross-origin restriction. v2160 adds two more attack vectors:

1. **Firebase SDK's native `ref.getBlob()` / `ref.getBytes()`** as the
   primary download transport. Firebase's own SDK uses internal
   plumbing that may bypass the iOS WKWebView fetch restriction.
   Falls back to fetch/XHR if the method isn't available.
2. **SW proxy passes the real error message** through to the response
   body, and the app reads that body on non-OK status. So "HTTP 599"
   will no longer be opaque — the log will show something like
   `[xhr] ... HTTP 599: SW proxy (TypeError): Load failed` which
   pinpoints whether the SW's internal fetch failed with the same
   TypeError or something else.

### Other
- v2159's SW Firebase-cloud proxy retained (it doesn't hurt; if
  getBlob works via SDK internals the SW proxy never fires for that
  request path).

### Process
- Triple-checked: 106 tests pass, versions consistent, pre-commit
  hook green in no-node simulated environment.

### If v2160 still fails
- Next step is bucket-level Firebase Storage CORS config check.
  That's an admin task on the Firebase console, not a code fix.
- Workaround remains: Chrome on iPhone (regular tab) downloads the
  same photos successfully.

---

## v2159 — 2026-04-14

### Fixed — B-03 Firebase download (attempt 2) + token leak belt-and-suspenders
- **B-03 (Firebase download on iOS Safari PWA).** Dave's diagnostic
  screenshot showed both fetch and XHR failing with transport-level
  errors (`TypeError "Load failed"` + `XHR network error`) on the same
  URL. That rules out CORS, auth, timeout, and HTTP-status causes;
  the symptoms match a known iOS Safari PWA issue where the service
  worker's passive "return" from a cross-origin fetch event is not
  reliably honored. v2159's fix: `sw.js` now **explicitly proxies**
  requests to `firebasestorage.googleapis.com`, `firestore.googleapis.com`,
  and `*.firebaseapp.com` / `*.firebaseio.com` via
  `event.respondWith(fetch(event.request))`. The SW acts as a proxy
  layer that iOS PWA treats as a same-origin request, bypassing the
  cross-origin transport restriction.
- **Token leak belt-and-suspenders.** v2158's token-expansion fix for
  the Notes sheet textarea should have resolved the raw `{if-rudder:}`
  display bug, but Dave's screenshot on v2158 showed the tokens still
  visible. Cause unclear (possibly stale SW-cached code). v2159 adds a
  second cleanup pass **after the overlay is mounted** in the DOM —
  scans the textarea value for any residual `{if-rudder:...}` /
  `{if-no-rudder:...}` tokens and replaces them with the expanded form,
  then re-saves the cleaned value so the item's saved state is also
  migrated.

### Process
- Triple-checked: 106 tests pass, versions consistent, pre-commit hook
  green in no-node simulated environment.
- Belt-and-suspenders pattern noted: when a display fix isn't reliable
  (maybe due to stale caching), add a DOM-level cleanup that runs after
  mount to catch whatever slipped through.

---

## v2158 — 2026-04-14

### Fixed — raw `{if-rudder:...}` tokens leaking into the UI
- **Bug reported by Dave** on v2154 surveying Ahoy Vey: the Notes sheet
  for the Hull and rudder percussion testing item showed raw
  `{if-rudder: and rudder}` tokens in three places:
  1. **The snippet template cards** rendered the unexpanded template.
  2. **The textarea** showed saved text that still contained tokens.
  3. **The sheet title** showed the raw "(if applicable)" label.
- **Root cause:** v2153's token expansion only ran at snippet-insert
  time. Card rendering, textarea initial content, and the sheet title
  never passed through the expander, so raw tokens leaked into display.
- **Fix:** Expand rudder-gating tokens at every display point:
  - Template cards in the Notes sheet now expand
    `{if-rudder:...}` / `{count:rudder|rudders}` based on survey.hasRudder
    before rendering. No more raw braces in cards.
  - Textarea initial content (loaded from `survey.items[label].text`)
    expands tokens on sheet open, so previously-saved text with tokens
    is cleaned up on display.
  - The Notes sheet title uses `displayItemLabel()` so
    "Hull and rudder(s) (if applicable) percussion testing" becomes
    "Hull percussion testing" / "Hull and rudder percussion testing" /
    "Hull and rudders percussion testing" based on vessel rudder state.
- Consequence: the chip-strip builder no longer sees `{if-rudder:}`
  as a placeholder, so the empty "Choose one" panel that confused
  Dave earlier should be populated correctly based on actual
  placeholders in the expanded snippet (or hidden if none remain).

### About version packing
This push combines v2155 through v2158 since Dave was surveying between
my releases. CHANGELOG preserves per-version detail; git commit message
notes the version range.

### Process
- Triple-checked: 106 tests pass, version consistency confirmed,
  pre-commit hook green in no-node simulated environment.

---

## v2157 — 2026-04-14

### Changed — SAMS vocabulary + simplified method
- **Method simplified to Phenolic hammer only.** Dave confirmed this is
  the only tool used for percussion testing on deck/coachroof. The other
  options (sounding hammer, rubber mallet, brass hammer, plastic mallet)
  are removed from the Method checkbox group.
- **SAMS-compliant finding vocabulary** applied across all rating tiers:
  - "Soft area" / "soft spot" language removed — not SAMS vocabulary.
  - **B-rated findings rewritten** using the correct SAMS pattern:
    - "An area at {location} sounded as a **dull thud**, indicating
      possible moisture in the core."
    - "An area at {location} sounded **ringing**, which may indicate
      delamination, core separation, lack of resin, or a void beneath
      the skin."
  - **A-rated findings** escalate the same language: "extensive dull
    thuds" (widespread moisture), "widespread ringing" (widespread
    delamination / voids), combined pattern, structural separation at
    high-load fitting.
  - **C-rated findings** use "no dull thuds or ringing tones were
    detected" as the SAMS-appropriate positive finding.

### Scope
- This release updates the "Bowsprit, deck and coachroof/pilothouse
  impact and resonance testing" builder only. Same pattern will be
  applied to hull percussion and conductivity testing once this is
  validated on Ahoy Vey.

### Process
- Triple-checked: 106 tests pass, version consistency confirmed,
  pre-commit hook green in no-node simulated environment.

---

## v2156 — 2026-04-14

### Added — per-option location + Phenolic hammer (B-07 pt 2 progress)
- **Each ticked finding checkbox now reveals a free-text Location input.**
  Type where the issue was observed ("forward starboard stanchion base",
  "port coachroof corner", "amidships side deck, 18 inches aft of the
  rubrail") and the location flows into the composed finding.
- **Fragments with `{location}` placeholder** substitute the text inline
  so the sentence reads naturally: "A possible soft area was detected
  at the forward starboard stanchion base."
- **Fragments without `{location}`** (e.g. general observations) get the
  location appended in parentheses, nothing is lost.
- **B-rated findings rewritten** to use `{location}` placeholders where
  granular location matters. Added paired **Possible / Confirmed soft
  area** options so surveyor can express certainty level.
- **Phenolic hammer** added to the Method multi-select (alongside
  sounding hammer, rubber mallet, brass hammer, plastic mallet).

### Changed — internal refactor
- `app.js` `buildComponentFindings` now **delegates to the pure
  `src/core/component_builder.js` module** instead of duplicating the
  logic. Single source of truth; easier to extend; covered by the 25
  composition tests (including 5 new ones for per-option location).
  Total tests: 106.

### Scope note — testing before full rollout
- This release targets **only** the "Bowsprit, deck and coachroof/pilothouse
  impact and resonance testing" item. Try it on Ahoy Vey and report back
  before the same pattern is applied to hull percussion, conductivity
  testing, and other categories.

### Coming next (deferred to v2157+)
- Slot-based sentence templates (Certainty dropdown × Finding-type
  dropdown × Location text × Cause dropdown) for even more flexible
  sentence composition from a compact palette.
- Hull percussion / conductivity builders with rudder gating.

### Process
- Triple-checked: 106 tests pass, version consistency confirmed,
  pre-commit hook green in no-node simulated environment.

---

## v2155 — 2026-04-14

### Added — B-07 part 2: checkbox component builder for deck/coachroof percussion testing
- **First fully checkbox-driven component builder** ships against the
  "Bowsprit, deck and coachroof/pilothouse impact and resonance testing"
  checklist item.
- Three components: **Areas tested** (multi-select, joined as Oxford-comma
  list), **Method** (multi-select, joined as list), and **Findings**
  (multi-select, filtered by the item's current rating).
- **Granular options per rating tier** — 5 A-rated scenarios, 8 B-rated,
  4 C-rated, 3 Not-Tested limitations, and 3 always-available context
  add-ons (limited by coatings, areas not accessible, further
  investigation recommended). Surveyor ticks every observation that
  applies; the builder composes a multi-sentence finding.
- **Rating-aware option filtering** — when the item is rated B, only
  B-tier findings appear in the Findings checklist (plus the always-
  include context add-ons). Same for A, C, NT.
- **Pure composition logic** extracted to `src/core/component_builder.js`
  with 20 new tests in `tests/component_builder.test.js` covering
  single-select, multi-select, join=list with prefix/suffix,
  alwaysInclude options, multi-component composition, and ABYC citation
  dedup. Total tests now: 101.
- The existing dropdown-based component builders (outdrives, winches,
  generators, etc.) are unchanged — multi-select is opt-in per
  component via `multiSelect: true`.

### How the new builder works (workflow)
1. On the deck/coachroof percussion item, tap the rating badge (A / B /
   C / NT). The rating defines which Findings checkboxes appear.
2. Tap the 📝 (notes) icon. The bottom sheet opens with the builder
   panel instead of snippet cards.
3. Tick the areas tested (deck, coachroof, side decks, etc.).
4. Tick the methods used (sounding hammer, mallet, etc.).
5. Tick the granular findings that apply for your chosen rating.
6. Optionally tick context add-ons (limited by coatings, etc.).
7. Tap "Generate Finding Text" — the composed multi-sentence finding
   lands in the textarea with the correct rating set automatically.

### Coming next (deferred)
- Same builder pattern applied to: Bowsprit/deck/coachroof
  conductivity testing, Hull and rudder impact and resonance testing
  (with hasRudder gating via rudderOnly options), Hull and rudder
  conductivity testing.
- Hull/rudder/antifouling snippet split (B-06).
- B-04 (OCR HIN), B-02 (delete sync), SAMS 3.9 + 6.3, B-08.

### Process
- Triple-checked: 101 tests pass, version consistency confirmed,
  pre-commit hook green in no-node simulated environment.

---

## v2154 — 2026-04-14

### Added — Persistent Save Status indicator
- New **SaveStatus** pill in the top-right corner of every survey page
  (inspection + Edit Intro). Always visible, always current.
- Shows: green dot + "✓ Saved Xs ago · NN 📷" — the seconds-ago counter
  refreshes every 2 seconds, and the photo counter recounts after every
  photo capture.
- Goes amber + "Saving…" while a write is in progress, red + "Save error"
  if the IndexedDB write fails (with the error message in the tooltip).
- **Tap reveals a detail panel** with full sync status: photos in
  IndexedDB on this device, last data save time, Firebase backup state
  (connected? backed up? queued?), Drive backup state.
- Hooked into every save site: `savePhoto`, `autoSaveItemText`,
  `selectRating`, and the Edit Intro debounced auto-save. So whether
  you rate an item, type a note, take a photo, or change a form field,
  the pill blinks amber → green within a second to confirm the write.
- Pill auto-hides on the home page (it's per-survey).

### Other (deferred from B-07 part 2 → ships in a later release)
- Internal: `buildComponentFindings`, `renderComponentBuilder`, and
  `onComponentBuilderChange` extended with **multi-select checkbox
  support** for component builders. The plumbing is in place but no
  schema yet uses `multiSelect: true`, so no behaviour change for
  Dave. The percussion-testing and deck/coachroof checkbox builder
  schemas will land in v2155 with their own tests.

### Backlog additions
- **B-08** logged: cannot un-skip an item back to a rated state. Low
  priority per Dave's request.

### Process
- Triple-checked: 81 tests pass, version consistency confirmed,
  pre-commit hook green in no-node simulated environment.

---

## v2153 — 2026-04-14

### Added (B-07 part 1 — rudder gating)
- **New pure module** `src/core/snippet_tokens.js` with token-expansion and
  label-transformation functions, plus 26 tests (`snippet_tokens.test.js`).
  Now at 81 tests total.
- **`{if-rudder:...}` / `{if-no-rudder:...}` / `{count:rudder|rudders}`
  tokens** supported in snippet text. Expanded automatically at snippet
  insert time based on `survey.hasRudder` and `survey.driveLineCount`.
- **`transformLabelForDisplay()` helper** detects the legacy
  "and rudder(s) (if applicable)" phrase in checklist item labels and
  rewrites it based on the current survey:
  - hasRudder = false: drops the clause entirely. "Hull and rudder(s)
    (if applicable) impact and resonance testing" → "Hull impact and
    resonance testing"
  - hasRudder = true, rudderCount = 1: "Hull and rudder impact..."
  - hasRudder = true, rudderCount >= 2: "Hull and rudders impact..."
  Applied at three display sites: the compact checklist card, the
  single-item expanded view, and the report (both the checklist summary
  table and the Findings & Recommendations section).
- **Tokenised 12 hull-and-rudder snippets** in `text_library.json`
  (impact/resonance + conductivity testing). On no-rudder vessels the
  snippets now render as hull-only text, no awkward rudder mentions.

### Fixed
- **Percussion/conductivity testing items no longer hidden on
  non-rudder vessels.** Previous behaviour: `rudderItem: true` in
  the template caused these items to disappear on outdrive/IPS vessels,
  which meant they couldn't be rated at all. Now the items show for
  every vessel, and rudder-related wording is suppressed on no-rudder
  cases via the token system.

### Deferred (B-07 part 2 → v2154)
- Checkbox-driven percussion testing builder. The existing component
  builder pattern is dropdown-based; extending it to checkboxes for
  method/areas/findings is a UX design problem best tackled in its own
  focused release. Tracked in the backlog.

### Process
- Triple-checked: 81 tests, hook green in both node-present and no-node
  environments, version files consistent.

---

## v2152 — 2026-04-14

### Fixed
- **B-05** — Removed unused "Hull exterior photos" and "Rudder photo(s)"
  media items from `survey_template.json`. Dave doesn't use them; they
  were taking up space at the top of the Hull category. Changes apply
  to in-progress surveys (including Ahoy Vey) on next page load because
  the template is re-read each session.
  - JSON validated.
  - No orphaned references in app.js (the `rudderItem` flag is still
    used on the two percussion/conductivity testing items, which is
    the scope of B-07).
  - If any old survey captured photos under these now-removed items,
    the photo data remains in IndexedDB (nothing deleted) but won't
    display in the UI.

### Note on in-progress survey compatibility
- All Edit Intro field additions from v2151 (TC Licence expiry,
  Independent Surveys, new dropdown options) and Check-function
  changes apply to existing surveys automatically. Template changes
  like this one (removed items) also apply on next open. The only
  data preserved across template changes is item-level ratings,
  notes, and photos.

---

## v2151 — 2026-04-14

### Added
- **B-01 complete** — Drive backup now resumes where it left off instead
  of re-uploading every photo from scratch.
  - New `listExistingFilenamesInFolder(folderId)` queries Drive once per
    backup (with pagination for folders over 1000 files) and builds a
    Set of filenames already present.
  - `backupSurvey` now skips any photo whose deterministic filename
    already exists on Drive. Same-day JSON snapshot also skipped on
    repeat runs.
  - `src/core/drive_backup.js` is wired into `index.html` and the service
    worker; tests/drive_backup.test.js (14 tests) now run against the
    live module.
  - Progress dialog now distinguishes skipped vs uploaded photos in both
    step label (`Skipping 17 of 202 (already on Drive)`) and detail log
    (`⏭ hull_portside_01.jpg`).
  - Summary subtitle reads `N new + M already on Drive = T total` when
    any photos were skipped.
- **SAMS 2.4** — TC Licence expiry date field added to Edit Intro.
  Report now shows "(expires YYYY-MM-DD)" next to the licence number
  when populated.
- **SAMS 3.7** — Two new "laid up for winter storage" options in the
  on-land/in-water dropdown, matching SAMS's preferred phrasing.
- **SAMS 4.3** — Check function now warns when valuation uses fewer
  than 2 sources. The MY Bad review flagged BUC-only as insufficient;
  this makes the omission visible before you generate the report.

### Confirmed already-done (rubric updated)
- **SAMS 1.4** — TP 1332 is already referenced in Conduct of Survey
  and the Definitions table. Rubric status flipped to ✅.

### Backlog additions (not yet fixed, logged for future work)
- **B-04** — OCR the HIN photo to auto-populate the HIN number field.
  Implementation sketch includes using the existing Gemini integration.
- **B-05** — Remove unused "Hull exterior photos" and "Rudder photos"
  options above Vessel Type (cleanup).

### Process
- Triple-checked (intent, regression, Dave's environment). All 55 tests
  pass; pre-commit hook green in both node-available and no-node
  environments.

---

## v2150 — 2026-04-14

### Fixed
- **B-03** — Firebase photo download failing with "Load failed" on iOS
  Safari PWA. Rewrote `_downloadOneFirebasePhoto` with staged error
  reporting and an XMLHttpRequest fallback path:
  - Stage 1 (`getDownloadURL`) — errors now tagged `[url]`
  - Stage 2 (byte download) — tries `fetch()` first; on failure, falls
    back to `XMLHttpRequest`. XHR has historically succeeded in iOS
    Safari PWA contexts where `fetch()` throws `TypeError: Load failed`.
    Errors from this combined path are tagged `[fetch]` or `[xhr]`.
  - Stage 3 (read blob as data URL) — errors tagged `[blob-read]`.
  - Each per-photo failure shown in the progress dialog now includes
    the stage tag so we can see exactly which step broke. Example:
    `✗ Riverdance — 1775831...: [fetch] fetch: TypeError "Load failed"
    · xhr: XHR HTTP 403`.

### Added (parked)
- `src/core/drive_backup.js` + `tests/drive_backup.test.js` — pure
  helpers and 14 tests for the B-01 Drive-backup resume fix. Module
  is on disk and its tests pass, but it is **not yet wired** into
  `index.html` or `app.js` — we paused B-01 mid-way to address B-03
  first. Wire-up and the resume logic itself will ship in a later
  release. This file is safe to carry in-tree because no script tag
  loads it, so it has no runtime effect yet.

### Process
- Triple-checked by simulating the production environment before
  handing the commit command.

---

## v2149 — 2026-04-14

### Fixed
- **Pre-commit hook** now works on machines that don't have Node.js
  installed. Tests are skipped with a clear warning when `node` is
  missing; the version-consistency check and CHANGELOG check still
  run (both are bash-only and required). This unblocks commits from
  MacBook machines without Node, while preserving the critical gates.
- `scripts/release.sh` also handles missing Node gracefully — prints
  a skip message instead of failing.
- Expanded PATH search in both scripts to include MacPorts
  (`/opt/local/bin`), asdf shims (`~/.asdf/shims`), and `~/.local/bin`.

### Process
- Established "triple-check" methodology: before handing any push
  command to the user, verify (1) the code does what we intend,
  (2) it doesn't break anything that worked before, and (3) it works
  in the user's actual environment — not just the Claude sandbox.
  This standard caught the Node-missing issue that v2148's hook
  had in production.

---

## v2148 — 2026-04-14

### Added
- **Independent Surveys** field in Edit Intro — free-text list of any
  engine / electrical / ultrasonic surveys conducted alongside the
  inspection. Report shows a default "No independent surveys…" statement
  if blank. Addresses **SAMS 3.11**.
- `scripts/release.sh` — atomic version bumper. Updates `APP_VERSION`
  in app.js, `CACHE_NAME` in sw.js, and every `?v=` cache-buster in
  index.html in a single step. Runs tests and version check afterward.
- `scripts/check_versions.sh` — verifies all three versions agree and
  that CHANGELOG has an entry for the current version.
- `.githooks/pre-commit` — blocks commits when tests fail, versions are
  mis-aligned, or CHANGELOG is missing an entry. Enable with
  `git config core.hooksPath .githooks`.
- `DEVELOPMENT_PROCESS.md` — the north star document. Rules, workflow,
  quick-reference card for every change going forward.

### Changed
- All 15 snippet-library occurrences of "sea trial" replaced with
  "limited trial run" for SAMS / legal protection. Check-function label
  updated. Addresses **SAMS 8.2**. Report glossary retains the term
  "sea trial" in the definition of "Limited Trial Run" where it is
  deliberately distinguishing.

### Process
- Git hooks now enforce the process. Version-skew blank-page bugs
  (like v2147) can no longer happen — the hook checks version
  consistency before accepting the commit.
- Pre-commit hook and `release.sh` prepend common Node install paths
  (`/opt/homebrew/bin`, `/usr/local/bin`, `$HOME/.nvm/...`) so `node`
  is findable even when git runs hooks with a stripped-down PATH.
  Fallback error message gives install instructions instead of a
  cryptic "node: command not found".

---

## v2147 — 2026-04-14

### Fixed
- **Blank page on refresh** caused by `const` name collision between the
  new `src/core/*.js` modules and `app.js`. Both files declared
  `RATING_COLORS`, `getRatingShortLabel`, etc. with `const` at the top
  level, which classic-script semantics treat as a SyntaxError, blocking
  `app.js` from parsing. Wrapped each core module in an IIFE and exposed
  its API under a namespace (`window.KikiRatings`, `window.KikiPlaceholders`,
  `window.KikiSkipLogic`) so there's no conflict. `app.js` continues to
  work unchanged.

---

## v2146 — 2026-04-14

### Added
- `src/core/` folder with extracted pure functions for ratings, placeholder
  detection, and skip logic. These modules load in both the browser
  (via `<script>` tag) and Node.js (for testing).
- `tests/` folder with a minimal test runner and 41 unit tests covering
  the extracted core functions. Run with `node tests/run_tests.js`.
- `tests/README.md` explaining how to run and add tests.
- `CHANGELOG.md` (this file).
- `docs/sams_rubric.md` — formal SAMS compliance checklist derived from
  the SAMS review of the "MY Bad" survey.
- `docs/manual_regression.md` — 30-step pre-release checklist of user
  flows to verify before shipping each version.

### Changed
- Service worker now caches the new core JS files so they work offline.

---

## v2145 — 2026-04-14

### Fixed
- Firebase photo downloads no longer crash Safari on iOS with large
  photo counts. Rewrote `pullPhotosFromFirebase` to:
  - Download one photo at a time with explicit memory release between each
  - Retry each photo once on transient network failures (2-second gap)
  - Pause 300 ms between photos so iOS can reclaim memory
  - Show per-photo success/failure in the progress dialog
  - Surface a persistent progress bar instead of a vanishing toast
- Per-survey "Recover Photos" button now uses the same robust pattern.

---

## v2144 — 2026-04-14

### Added
- Persistent progress dialog for Drive backup — stays on screen through
  the whole upload with live progress bar, elapsed timer, per-photo detail
  log, and a Cancel button.

### Changed
- `backupSurvey()` and `backupAll()` now accept an `onProgress` callback
  and a `checkCancelled` function, allowing UI layers to drive the dialog.

---

## v2143 — 2026-04-14

### Added
- Friendly dialog when the Google Drive API hasn't been enabled on the
  Google Cloud project. Includes direct link to the Cloud Console, a
  copy-link button, and numbered steps for the one-time setup.

### Changed
- `backupAll()` stops at the first SERVICE_DISABLED 403 instead of
  retrying every survey against the same broken endpoint.

---

## v2142 — 2026-04-14

### Changed
- Skipped sections are now treated as dealt-with in the Check function:
  - Entire-category skip → single info acknowledgement, not per-item warnings
  - Many-item skip (>3) → summarized with preview and count
  - Few-item skip (≤3) → listed individually
- Skipped items auto-resolve in the Check list (no more "Force OK" needed).

---

## v2141 — 2026-04-14

### Added
- `✅ Check` button on the inspection bottom bar (replaces former `📝 Desc`).
- `✅ Check` button in the home page survey dropdown.
- Auto-description generation on Back to Inspection — if the description
  is empty or was auto-generated, it regenerates from current form data.
  Manual edits disable auto-regeneration.
- `[PLACEHOLDER]` text now highlighted with yellow background in the report.
- Placeholder count shown below the description textarea.

### Changed
- Rating buttons show short labels (A / B / C / NA / Not Tested / PO)
  instead of full strings.
- Compact action row on checklist items now shows icons only with larger
  44×44 touch targets. Labels removed; counts still visible as badges.

---

## v2140 — 2026-04-13

### Changed (Six Sigma button cleanup)
- Removed "Open" button from home survey dropdown (tap card to open).
- Replaced "Export" and "Import" home buttons with overflow (⋯) menu.
- Removed `↻ Update` dev button from inspection and Edit Intro bars.
- Removed "Cancel" button from Edit Intro form actions (auto-save is on).
- Simplified `backToHome()` to instant save + navigate (no double-confirm).
- Gemini API Key button only shows when no key is set.

### Removed
- Redundant buttons across home, inspection, and Edit Intro screens.

---

## Earlier versions

Earlier versions (pre-v2140) are recorded in git log only. Key milestones:

- **v2120** — Bulletproof auto-backup: Firebase on every photo, Drive every 5.
- **v2119** — Photo recovery — Firebase Storage pull to IndexedDB.
- **v2118** — Depersonalise filter, specs auto-save on Edit Intro.
- **v2111** — Desc button fix, home button brand consistency.
- **v2105** — Transmission photo sync, reliable service worker updates.

Run `git log --oneline` in the repo for the full history.

---

## How to add a new entry

1. Bump `APP_VERSION` in `app.js` and `CACHE_NAME` in `sw.js`.
2. Add a new section at the top of this file using today's date.
3. Group changes under **Added / Changed / Fixed / Removed**.
4. Reference specific SAMS rubric items by number when the change
   addresses one (e.g. "Fixes SAMS rubric item 3.4 — survey report date").
5. Commit and push.
