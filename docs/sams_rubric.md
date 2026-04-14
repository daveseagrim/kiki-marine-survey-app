# SAMS Compliance Rubric

**Source:** SAMS Survey Review of the "MY Bad" survey, reviewed by Norm Behring
on 10 February 2026. Verdict: **does not meet SAMS standards.**

This rubric turns every checkbox and comment in that review into a pass/fail
item. Before submitting any survey externally, run through this list for the
generated report. Each item has:

- **ID** — stable identifier for cross-referencing in CHANGELOG / commits.
- **Requirement** — what SAMS expects.
- **Where it lives in the report** — which section the reviewer will look in.
- **Test** — what "pass" looks like in concrete terms.
- **MY Bad result** — what the SAMS reviewer said about Dave's submitted survey.
- **Status in app** — whether the app currently produces this correctly.

Status legend:
- ✅ Done — the app produces this correctly as of v2146
- 🟡 Partial — produces it but with gaps
- ❌ Missing — not yet produced by the app
- 🔍 Manual — surveyor must enter/verify; app can only prompt

---

## 1. Scope and Standards

### 1.1 Scope statement
- **Requirement:** Clear statement of how the survey was or will be conducted
  and what was and was not done.
- **Where:** Purpose and Scope section, top of report.
- **Test:** Report contains a numbered Purpose & Scope section with an
  explicit list of what was and was not inspected.
- **MY Bad result:** ✅ present (checked box, no negative comment).
- **Status:** ✅ Done

### 1.2 Mandatory national standards cited
- **Requirement:** Statement of which mandatory national standards and
  regulations (Canada Shipping Act, Transport Canada, ABYC, USCG, FCC, CE,
  OSHA, etc.) were referenced in findings.
- **Where:** Standards list in Purpose & Scope, plus per-finding citations.
- **Test:** Report names at least Canada Shipping Act 2001 and Transport
  Canada TP 1332 / TP 511 up front. Each A-rated finding cites a specific
  standard.
- **MY Bad result:** ❌ SAMS comment: "Minimum number of mandatory and
  voluntary regulatory bodies stated."
- **Status:** 🟡 Partial — app cites ABYC and some TC standards but reviewer
  specifically flagged missing TP 1332. **See rubric 1.4.**

### 1.3 Voluntary standards cited
- **Requirement:** Statement of which voluntary standards (ABYC, NFPA, ISO
  etc.) are referenced.
- **Where:** Standards list in Purpose & Scope.
- **Test:** Report lists ABYC, NFPA, ISO, TC TP 511 as applicable.
- **MY Bad result:** ❌ Same comment as 1.2.
- **Status:** 🟡 Partial — should audit that every category has standards
  available in the standards-by-category map.

### 1.4 TP 1332 explicitly referenced
- **Requirement:** SAMS reviewer specifically called out missing TP 1332.
- **Where:** Standards list and where applicable in findings.
- **Test:** Search report for "TP 1332" or "Transport Canada Small Vessel
  Construction Standards" and confirm at least one mention.
- **MY Bad result:** ❌ Missing.
- **Status:** ✅ Done — Report mentions "TP 1332 — Construction Standards
  for Small Vessels" in both the Conduct of Survey paragraph and the
  Definitions of Terms table. Confirmed during v2151 audit.

---

## 2. Vessel Identification

### 2.1 Name / Manufacturer / Year / Dimensions
- **Where:** General Vessel Info table.
- **Test:** All four fields present and non-empty.
- **MY Bad result:** ✅ present.
- **Status:** ✅ Done

### 2.2 Appropriate vessel photos
- **Requirement:** Clear, usable photos of the vessel.
- **Where:** Cover page and Four Corners section.
- **Test:** Cover photo present. Four Corners section has port bow,
  starboard bow, port stern, starboard stern photos.
- **MY Bad result:** ❌ SAMS comment: "All photos too small along with
  photo of the HIN. Do not have photos of four corners of the vessel."
- **Status:** ✅ Done (cover photo added; Four Corners section added).
  **Must verify image sizes are legible in generated report.**

### 2.3 HIN / builder's plate photo legible
- **Where:** Vessel Documentation section.
- **Test:** HIN photo embedded at readable size (SAMS comment said "too
  small"); every character of the HIN is identifiable in the photo.
- **MY Bad result:** ❌ photo too small.
- **Status:** 🟡 Partial — verify current report uses `max-width:500px`
  and `max-height:350px` which should be legible. Add zoom capability?

### 2.4 Government documentation / registration / licence
- **Where:** Vessel Documentation section.
- **Test:** TC Licence Type + Number + papers-viewed Y/N + expiry date
  all populated in the report.
- **MY Bad result:** ❌ SAMS comment: "No photo of vessel licence and no
  information of expiry."
- **Status:** ✅ Done (v2151) — `tcLicenseExpiry` date field added to
  Edit Intro. Report shows "(expires YYYY-MM-DD)" after the licence
  number when populated.

### 2.5 Engine and major equipment serial numbers
- **Where:** Vessel Specifications table + engine photo thumbnails.
- **Test:** Engine serial, transmission serial, and associated plate photos
  all present and the text in the plate photos is legible.
- **MY Bad result:** ❌ SAMS comment: "Engine and transmission plate
  photos too small to see information and reader unable to decipher
  numbers on plates."
- **Status:** 🟡 Partial — fields exist; verify photo sizing in report.

---

## 3. Survey Details

### 3.1 Purpose of survey
- **Requirement:** Pre-purchase, insurance, appraisal etc.
- **Test:** Survey type stated on cover and in intro paragraph.
- **Status:** ✅ Done

### 3.2 Name of party survey was conducted for
- **Test:** Client name present in report.
- **Status:** ✅ Done

### 3.3 Name of party requesting the survey
- **Test:** Requester name present (may be same as client or agent).
- **Status:** ✅ Done

### 3.4 Date of survey inspection
- **Test:** Inspection date on cover and in details.
- **Status:** ✅ Done

### 3.5 Date report completed
- **Requirement:** SAMS flagged this specifically — report date missing.
- **Where:** Cover page or Surveyor's Certificate.
- **Test:** Report date shown, different from inspection date if applicable.
- **MY Bad result:** ❌ "Date that report completed not shown."
- **Status:** ✅ Done — app has `reportDate` field.

### 3.6 Location of inspection
- **Test:** Location clearly stated.
- **Status:** ✅ Done

### 3.7 How vessel was observed (in water / on cradle / travel lift)
- **Requirement:** Clear statement of vessel position at time of inspection.
- **Where:** Survey Conditions table.
- **Test:** `onLandOrWater` field populated with full descriptive sentence.
  SAMS also noted: state lay-up-for-winter-storage if applicable.
- **MY Bad result:** ❌ "Clear statement that vessel was laid up for
  winter storage not provided."
- **Status:** ✅ Done (v2151) — two explicit SAMS-worded options added
  to the dropdown: "Vessel was laid up for winter storage on a cradle"
  and "Vessel was laid up for winter storage on blocks".

### 3.8 Parties present during survey
- **Where:** Survey Conditions or intro.
- **Test:** `personsInAttendance` populated.
- **MY Bad result:** ❌ "No statement of who was present at time of the
  inspection."
- **Status:** ✅ Done — field exists. Verify it's required and shown in report.

### 3.9 Below-waterline through-hull fittings statement
- **Requirement:** Statement on type and condition of all below-the-waterline
  or below-the-maximum-heeled-waterline through-hulls.
- **Where:** Hull section or dedicated Through-Hulls section of findings.
- **Test:** Report has a clearly-labelled section or paragraph specifically
  addressing below-waterline fittings, enumerated.
- **MY Bad result:** ❌ "Poor statements regarding type and condition below
  the waterline."
- **Status:** ❌ Missing — no dedicated through-hulls narrative. **Priority
  fix.** Checklist should include seacock count and condition as a
  structured field.

### 3.10 Per-system detail (what it is, does it work, overall condition)
- **Requirement:** SAMS overall note: "Report missing a lot of detail
  pertaining to most systems. Remember: What is it; does it work; what is
  overall condition."
- **Where:** Detailed Survey Findings section.
- **Test:** Every category has at least one narrative paragraph that
  describes the system (what it is), an observation (does it work), and
  a condition statement (overall condition).
- **MY Bad result:** ❌ Lacking detail.
- **Status:** 🟡 Partial — snippet library addresses this but coverage is
  uneven. Audit snippet coverage by category.

### 3.11 Independent surveys listed
- **Requirement:** If engine / electrical / ultrasonic / other independent
  surveys were done, list them.
- **Where:** General Vessel Info or Purpose & Scope.
- **Test:** `independentSurveys` field present in report, or explicit
  statement of "No independent surveys conducted" if none.
- **MY Bad result:** ❌ Not addressed.
- **Status:** ✅ Done (v2148) — `independentSurveys` field in Edit Intro;
  report shows the value or defaults to "No independent surveys (engine,
  electrical, ultrasonic gauging, etc.) were conducted in conjunction
  with this inspection."

---

## 4. Valuation

### 4.1 Current / Fair Market Value
- **Test:** Low and high FMV stated in Canadian dollars.
- **Status:** ✅ Done

### 4.2 Estimated Replacement Value
- **Test:** Replacement cost stated.
- **Status:** ✅ Done

### 4.3 Method of valuation
- **Requirement:** Soldboats / BUC / NADA etc.
- **MY Bad result:** ❌ "Statement of method used for valuation, however,
  only used BUC. Not sufficient to provide a reasonable valuation."
- **Test:** At least TWO valuation sources cited (e.g. BUC plus comparable
  sold vessels plus replacement cost analysis).
- **Status:** ✅ Done (v2151) — Check function warns when only 1 source
  is cited, with specific suggestions (comparable sold vessels,
  replacement-cost analysis). Also warns if valuation is entered with
  no source selected.

### 4.4 Comparable vessels listed
- **Test:** At least 2 comparables with vessel, year, price, source.
- **Status:** ✅ Done (Comparables section exists). Verify minimum count.

---

## 5. Recommendations

### 5.1 Mandatory standards deficiencies flagged
- **Requirement:** Systems/equipment failing Canada Shipping Act, ABYC
  mandatory, etc., listed as findings.
- **Test:** All A-rated findings cite at least one mandatory standard.
- **Status:** ✅ Done — app's A-rating requires a standard checkbox.

### 5.2 Voluntary standards deficiencies flagged
- **Test:** B-rated findings may cite voluntary standards with opinion.
- **Status:** ✅ Done

### 5.3 Upgrade / additional equipment recommendations
- **Test:** Recommendations section includes "consider adding X" items
  where applicable.
- **Status:** ✅ Done

### 5.4 Deviation photos
- **Test:** Findings include inline photos showing the deficiency.
- **Status:** ✅ Done

### 5.5 Maintenance / damage / repair-quality summary
- **Test:** Summary of Vessel Condition section includes surveyor's
  opinion on overall maintenance, evidence of previous damage or
  submersion, quality of repairs.
- **Status:** ✅ Done — Summary of Vessel Condition section exists.

---

## 6. Safety Equipment

### 6.1 Mandatory safety equipment for size / use
- **Requirement:** TC TP 511 or equivalent equipment list auto-configured
  by vessel length and type.
- **MY Bad result:** ❌ "Missing statements of minimum mandatory safety
  equipment for vessel size."
- **Test:** Safety Equipment TC TP 511 section present and complete.
- **Status:** ✅ Done — TC TP 511 checklist auto-configured.

### 6.2 Detectors installed (CO, gasoline, propane, smoke)
- **Test:** Each detector type has a rated item in the checklist.
- **Status:** ✅ Done

### 6.3 Auxiliary / recommended safety equipment
- **Requirement:** Equipment beyond the mandatory minimum — jacklines,
  harnesses, life raft, EPIRB, etc.
- **MY Bad result:** ❌ "Safety equipment carried over and above mandatory
  items" not addressed.
- **Status:** ❌ Missing — **add Recommended Auxiliary Safety Equipment
  section to report after TC TP 511.**

### 6.4 Bilge pump description (location / serviceability / alarm / tested)
- **Requirement:** Bilge pumps enumerated with specifics.
- **MY Bad result:** ❌ "Found only one mention of a bilge pump (vessel
  would have several) and no info on location, rating, etc."
- **Status:** 🟡 Partial — bilge pump rating items exist. **Need structured
  fields for count, location, rating, test status.**

---

## 7. Report Format

### 7.1 Written in simple, concise language
- **MY Bad result:** ❌ "The report could be reduced considerably by
  eliminating a lot of wasted space." Also "Many deficiencies have been
  rated too severely and many that should only be noted within the report."
- **Test:** No repetitive boilerplate. Rating guidance followed
  (A = safety hazard; B = needs repair soon; C = serviceable).
- **Status:** 🟡 Partial — ongoing prose quality improvements.

### 7.2 Easy to follow with logical indexing
- **Test:** Table of contents present; sections numbered; order matches
  SAMS-expected flow.
- **Status:** 🟡 Partial — TOC exists; verify order is logical.

### 7.3 Standard 8.5 × 11 format
- **Status:** ✅ Done — @page rule uses letter size.

### 7.4 Page numbering "Page N of M"
- **MY Bad result:** ❌ "Some pages numbered; all must be numbered."
- **Test:** Every page of the PDF/print shows "Page N of M".
- **Status:** 🟡 Partial — @page rule exists; verify Word export also
  numbers pages.

### 7.5 Surveyor signed and dated
- **MY Bad result:** ❌ "Report was signed but no date added; particularly
  when completed."
- **Test:** Surveyor's Certificate shows signature image plus explicit
  date of completion.
- **Status:** 🟡 Partial — signature image added in a previous version;
  **verify the report completion date is present next to the signature.**

### 7.6 SAMS membership disclosed with class
- **Test:** Footer or certificate shows "SAMS Surveyor Associate, SA-1".
- **Status:** ✅ Done

### 7.7 Deficiencies compiled and organised by importance at end
- **Requirement:** Findings grouped by A / B / C / Not Tested.
- **MY Bad result:** ❌ "Does the report have the deficiencies compiled
  and organized to importance at the end of the report?" — unchecked.
- **Test:** Findings & Recommendations section appears AFTER main body
  and groups findings by severity.
- **Status:** ✅ Done — Findings & Recommendations grouped by A/B/C/NT.

### 7.8 Surveyor's Certification included
- **Requirement:** "I certify that, to the best of my knowledge and
  belief, the statements of fact contained in this report..."
- **MY Bad result:** ❌ Not checked.
- **Test:** Certificate section present with full statement.
- **Status:** ✅ Done — Surveyor's Certificate section exists.

### 7.9 Overall vessel description (layout, type, etc.)
- **MY Bad result:** ❌ "Missing description of the overall vessel, such
  as, layout, type of vessel, etc."
- **Test:** Vessel Description section present with narrative paragraph
  covering type, construction, rig, engine, layout, accommodations.
- **Status:** ✅ Done — Vessel Description section exists and auto-populates
  from form fields since v2141.

---

## 8. Terminology and Language

### 8.1 Avoid "moisture meter"; use "conductivity meter"
- **Requirement:** SAMS recommended this for legal protection — high
  readings are not certainty of underlying moisture.
- **Test:** Search report text for "moisture meter" — should be zero hits.
  Use "conductivity meter" instead.
- **Status:** ✅ Done (v2148) — audit confirmed no "moisture meter"
  references in app.js, text_library.json, or survey_template.json.
  Only present in internal docs (rubric + reference notes), not in any
  user-facing output.

### 8.2 Avoid "sea trial"; use "limited trial run"
- **Test:** Search report for "sea trial" — zero user-facing hits. Use
  "limited trial run" instead.
- **Status:** ✅ Done (v2148) — 15 snippet-library occurrences replaced;
  Check-function label updated. Only remaining reference is in the
  glossary definition of "Limited Trial Run" where it is deliberately
  distinguishing the terms.

### 8.3 Canadian English spelling
- **Test:** No "fiberglass", "color", "center", "license (noun)", etc.
- **Status:** 🟡 Partial — Check function catches these in freeform text.

### 8.4 Lithium battery caution
- **Requirement:** SAMS noted insurance companies are particular.
- **Test:** If lithium batteries present, notes reference appropriate
  standards (ABYC TE-13 / relevant).
- **Status:** 🟡 Partial — add snippet to text library.

---

## Summary Scorecard (v2151)

- **Done:** 26 items (+4 from v2148)
- **Partial:** 10 items
- **Missing:** 2 items
- **Manual-only:** 0 items

### Priority to-fix list

1. **3.9** Below-waterline through-hull fittings statement — ❌
2. **6.3** Recommended Auxiliary Safety Equipment section — ❌
3. **6.4** Structured bilge pump fields (count, location, rating) — 🟡
4. Remaining partial items — minor polish (see status lines above)

### Recently fixed (v2151)

- ✅ **1.4** TP 1332 in standards list (confirmed already present)
- ✅ **2.4** TC Licence expiry date field
- ✅ **3.7** "Laid up for winter storage" dropdown options
- ✅ **4.3** Check warns when <2 valuation sources

### Fixed earlier (v2148)

- ✅ **3.11** Independent Surveys field
- ✅ **8.1** "Moisture meter" audit (none found in user-facing code)
- ✅ **8.2** "Sea trial" → "limited trial run" in snippet library

---

## How to re-run this rubric

Read top-to-bottom against a freshly generated report. Tick off each item
manually. Any ❌ or 🟡 item should block external submission. Update this
file whenever:

- SAMS provides new review feedback.
- You fix an item — change its status icon.
- A new SAMS criterion is published.
