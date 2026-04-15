# Report Improvement Suggestions

Based on a thorough review of your Cali Quigley / "My Bad" survey, the SAMS review form from Norm Behring, the Behring J/100 model survey, and your hull text library CSV.

---

## 1. Report Format and Structure

### What Behring does differently (and SAMS wants)

Your current report uses a "Safety Culture" table-based layout where every item gets its own colour-coded row with a rating badge. This produces a 58-page report for one vessel. Behring's J/100 report covers a comparable inspection in 27 pages using a prose-based, section-by-section narrative with inline finding codes.

**Norm's comment:** "The report could be reduced considerably by eliminating a lot of wasted space."

**Suggestion:** Consider a hybrid approach. Keep your colour-coded rating badges (they're visually clear and clients like them), but tighten the layout. Instead of giving every single checklist item its own full-width row with whitespace above and below, group related items into flowing prose paragraphs within each section. Items that are simply "serviceable" with no issues can be consolidated into a brief statement rather than each getting a separate row.

For example, instead of separate rows for "Helm seat — C - Serviceable" and "Seating — C - Serviceable" and "Table — C - Serviceable" each with a one-line description, Behring would write a single paragraph covering all flybridge furniture. Your app could offer a "prose mode" vs "table mode" toggle for the report output.

### Photo sizing

**Norm's comment:** "All photos too small along with photo of the HIN."

Your current layout shows three small photos per row. Photos should be large enough that a reader can actually identify what's being shown — especially the HIN plate, engine serial number plates, and any deficiency photos. Consider using two photos per row at minimum, or full-width for key documentation photos (HIN, compliance plate, engine plates, licence).

### Page numbering and report completion date

Already addressed in prior session (page headers, "Page X of Y" footers). However, Norm also flagged that the report was signed but had no date. The app should auto-fill the report completion date next to the surveyor's signature — this is now captured but double-check it renders.

---

## 2. Writing Style and Tone

### Your current style vs Behring's

Your writing is already clear and readable. Where Behring uses a terse, dash-separated telegraphic style ("FRP – good condition. Blue fabric cushions – good condition."), your descriptions read more like natural sentences. Both approaches are valid, but there are some adjustments worth making.

**Keep:** Your conversational-but-professional tone. Sentences like "The only areas of the hull with elevated moisture readings were in the lower transom" are clear and informative.

**Adjust:** Some descriptions could be more specific about *what it is*, *does it work*, and *what condition is it in* — the three questions Norm says every system needs to answer.

For example, your current text for propellers: "The Volvo IPS propellers were in good condition." Behring would add: make, model, material, number of blades, and any observations about edge nicks or fouling. A better version: "Twin Volvo IPS counter-rotating propellers were installed. Both sets appeared in serviceable condition with no visible edge damage, fouling, or abnormal wear. Propeller serial numbers were recorded (Photo 25)."

### Terminology changes Norm flagged

- **"Moisture meter"** → Use **"conductivity meter"** instead. Norm explicitly called this out: "High readings is not a certainty of underlying moisture, therefore, careful of recommendations." A conductivity meter detects changes in electrical conductivity which *may* indicate moisture, but could also indicate other factors. Using the correct term protects you legally.

- **"Sea trial"** → Use **"limited trial run"** instead. Unless you're running a full sea trial protocol (which includes specific RPM checks, speed runs, backing tests, etc.), calling it a "trial run" is more accurate and less liability-prone.

- **"Impact and resonance testing"** → Consider using **"percussion/sounding test"** or **"acoustic hammer testing"** — these are more precise descriptions of what you're actually doing (tapping with a phenolic or nylon hammer and listening for tonal changes).

### Below-waterline statements

**Norm's comment:** "Poor statements regarding type and condition below the waterline."

Behring's model is instructive here. For every through-hull and seacock, he specifies: location (port/starboard, forward/aft), valve type (ball-type, gate, etc.), material (Marelon, bronze, etc.), associated system (galley drain, head intake, engine cooling, etc.), and whether it was operated. Your report should include a clear statement about the type and condition of all through-hull fittings below the waterline, even if your app currently doesn't prompt for all this detail. Consider adding to the text library:

- "All wetted-surface seacocks were [material] [valve type] valves. All valves operated with [minimal/moderate/significant] force."
- "X through-hull fittings were located below the waterline. All were [material] and in [condition] condition."
- A note about hose connections: double-clamped with stainless steel hose clamps, or single-clamped, etc.

---

## 3. Missing Sections the SAMS Review Flagged

### Vessel description narrative

Already added in prior session, but ensure it covers: hull material, construction type, layout description (number of cabins, heads, berths), general arrangement (forward cabin, main salon, galley location, helm arrangement), and any notable features. Behring's example includes a concise but thorough paragraph at the front of the report describing the vessel from bow to stern.

### Persons present at time of inspection

Already added in prior session. Ensure this is being filled in consistently.

### How the vessel was observed

Already added in prior session (on land/in water dropdown). But also capture: was the vessel winterized, was it on a cradle, was it in travel lift slings, was the mast stepped or unstepped (for sailboats).

### Winter storage statement

**Norm's comment:** "Clear statement that vessel was laid up for winter storage not provided."

If a vessel is hauled out and winterized, the report should state this clearly: "At the time of inspection, the vessel was hauled out and in winter storage on a [type] cradle at [marina name]. The vessel had been winterized, with [engines/water systems/etc.] drained and anti-freeze applied." This helps explain why certain systems could not be tested.

### Mandatory and voluntary standards statement

**Norm's comment:** "Minimum number of mandatory and voluntary regulatory bodies stated."

Your report should include a clear statement early on (in the Purpose and Scope or Methodology section) listing which standards were referenced. Something like:

"This survey was conducted with reference to the following mandatory national standards and regulations: Canada Shipping Act (CSA 2001), Transport Canada TP 1332 (Construction Standards for Small Vessels), Transport Canada TP 511 (Safe Boating Guide), and applicable provisions of USCG 33 CFR 183 (where relevant to vessel construction). Voluntary standards referenced include: ABYC Standards and Technical Information Reports, NFPA 302 (Fire Protection Standard for Pleasure and Commercial Motor Craft), and applicable ISO standards."

### Engine and equipment serial numbers

**Norm's comment:** "Engine and major equipment serial numbers" were missing.

Behring's report includes: engine make, model, serial number, cylinders, horsepower rating, fuel type, cooling system type, and engine hours. Same for the transmission. Your report currently collects some of this via the specs auto-fill, but the engine/transmission serial number fields should be prominent in the data entry flow and the photos of data plates should be large enough to read. Consider adding dedicated fields for:

- Engine make/model/SN/hours/HP
- Transmission make/model/SN/type
- Generator make/model/SN/hours (if applicable)

### Storage cradle section

Behring includes: dimensions, type (steel/wood), number of pads, condition. Your app should prompt for this when the vessel is on land. A simple text like: "[Size] [type] cradle — [number] pads — [condition]. [Any notes about rust, stability, pad placement.]"

### Ground tackle detail

Behring covers: anchor type, weight, rode material and length, chain/rope mix, windlass make/model and operation, anchor roller condition. Your current checklist items cover some of these individually, but the text library could include more specific snippets for each component.

---

## 4. Findings and Recommendations

### Rating severity

**Norm's comment:** "Many deficiencies have been rated too severely and many that should only be noted within the report."

This is subjective, but the general principle is: A-Critical should be reserved for genuine safety hazards that could endanger life or cause serious damage (failed anodes on a vessel going in the water, corroded fuel hose near ignition source, missing fire extinguishers). B-Needs Attention is for items that need repair but aren't immediately dangerous. Many things you rated as A might be better as B, and some B items might be C.

For example, in the Cali Quigley report: "Hull anodes — A - Critical" for corroded anodes makes sense if the boat is about to go in the water, but if it's in winter storage, it's a B (needs to be done before launch, but not an imminent danger). Similarly, "Trim tabs — A - Critical" for corroded anodes on the tabs — again, B might be more appropriate.

Think of it this way: would you tell the owner to stop using the vessel immediately until this is fixed? If yes, A. If it should be done soon but the vessel can safely operate in the interim, B.

### Inline finding codes

Already added in prior session. Behring uses the format "(Finding B-1)" in orange text inline within the body text, then collects all findings at the end. This lets the reader see severity while reading the body, then get a consolidated action list at the end. Verify this is rendering well.

### Recommendation text

Already added in prior session (italicized recommendations under each finding). Behring's recommendations always cite the specific standard: "Recommend replacing both cockpit scupper hoses with marine rated hoses to minimize the risk of failure (ABYC H-4)." Make sure your text library snippets include standard references where applicable.

---

## 5. Valuation Section

**Norm's comment:** "Statement of method used for valuation, however, on used BUC. Not sufficient to provide a reasonable valuation."

Behring's valuation worksheet pulls from three sources: BUC Used Boat Price Guide, Soldboats.com (actual sale prices from the last 18 months), and current listings. He then averages across sources and applies a freshwater premium (10%). Your app already has the BUC database and a comparables section, but consider:

- Making the comparable sales section more prominent and easier to fill in (vessel year, selling price, listed price, percentage difference, location, date)
- Adding a field for current asking price of similar vessels (from YachtWorld, Boat Trader, etc.)
- Including the calculation methodology narrative: "Values were compiled from [X] sources and adjusted for model year, condition, and regional market factors"
- Adding a freshwater/saltwater adjustment field

---

## 6. Text Library Improvements

### Current state

Your hull CSV has 121 rows across 27 sections. The text is generally good — professional and specific. The placeholder format (######, [###-###]) works well for fill-in-the-blank values.

### Suggestions for the library

**Add more contextual detail.** Many of your current snippets are brief. Compare:

- Current: "The anti-fouling coat appeared to be newly applied and was in good condition."
- Better: "The anti-fouling paint appeared to be recently applied and was in serviceable condition. Paint type and brand were not identifiable. No excessive buildup, blistering, or bare spots were noted."

**Add standard references to B and A rated items.** When a finding references an ABYC standard, TC regulation, or USCG requirement, include the citation in the snippet. This was a key Norm criticism.

**Add "what it is / does it work / what condition" structure.** For each system, the snippet should naturally cover identification, operational status, and condition assessment. Example for a bilge pump: "One [make/model] electric bilge pump was installed in the [location]. The pump was tested and [operated/did not operate] properly. The float switch was located [position] and [activated at appropriate level/did not activate]. Wiring was [properly secured and connected/showing signs of corrosion]. Discharge hose was [proper marine grade/household type] and [secured with double hose clamps/single clamp]."

**Expand bilge pump section.** Norm specifically flagged this: "Found only one mention of a bilge pump (vessel would have several) and no info on location, rating, etc." A 42-foot vessel should have multiple bilge pumps. Your text library needs separate snippets for each pump location (main bilge, engine room, forward bilge) with fields for make, model, capacity (GPH), power source (manual/electric), float switch type, and discharge route.

---

## 7. Photo Requirements

### Four corners photos

**Norm's comment:** "Do not have photos of four corners of the vessel."

Behring's report ends with a dedicated photo page showing the vessel from all four corners (port bow, starboard bow, port stern, starboard stern) plus key detail shots. Your app should prompt for these four photos as mandatory items, separate from the per-section photos. Consider adding a "Vessel Overview Photos" section at the start of the survey with four labeled photo slots: "Port Bow," "Starboard Bow," "Port Stern," "Starboard Stern."

### Photo annotations

Behring uses red circles and arrows directly on photos to highlight problem areas (cracked hoses, corroded fittings, etc.). Your app has basic photo capture — consider adding annotation tools (draw circle, arrow, text label) that would make deficiency photos much more informative.

### Engine/transmission plate photos

**Norm's comment:** "Engine and transmission plate photos too small to see information and unable to decipher numbers on plates."

These should be captured as close-up, full-width photos. Consider dedicated photo capture fields (like the HIN photo) specifically for engine data plate, transmission data plate, and generator data plate.

---

## 8. Seacock/Thru-Hull Diagram

Behring includes a vessel outline diagram (page 13 of his J/100 report) showing the approximate location of every seacock and thru-hull, colour-coded by above/below waterline, with labels identifying the associated system. This is a powerful visual tool. Implementing this as an interactive SVG in the app where the surveyor taps to place markers would be a significant differentiator.

---

## 9. Recommended Auxiliary Safety Equipment

Behring includes a dedicated section listing safety equipment that's recommended but not legally required: CO detector (NFPA 302), high bilge water alarm, EPIRB, gas fume detector, etc. Your app should include this as a separate checklist section, distinct from the mandatory TC TP 511 items.

---

## Summary: Priority Order for Implementation

1. **Terminology fixes** (conductivity meter, limited trial run) — easy text changes
2. **Photo sizing in report** — make documentation photos larger
3. **Four corners photo prompts** — add mandatory vessel overview photos
4. **Standards statement** — add mandatory/voluntary standards paragraph
5. **Winter storage/vessel observation statement** — expand the observation dropdown
6. **Below-waterline detail** — expand text library for seacocks and thru-hulls
7. **Engine/transmission serial number fields** — add dedicated data entry
8. **Bilge pump section expansion** — multiple pump entries with full detail
9. **Rating calibration guidance** — add in-app hints about when to use A vs B vs C
10. **Text library expansion** — add standard citations, three-question structure
11. **Valuation multi-source methodology** — expand comparables workflow
12. **Seacock diagram** — interactive SVG placement tool
13. **Photo annotation tools** — circle, arrow, text overlay
14. **Prose mode for report output** — optional condensed narrative format
