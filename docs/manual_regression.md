# Manual Regression Checklist

Run this every time before pushing a new version to production. Takes about
10 minutes. If any step fails, fix it or revert before shipping.

Each test has:
- **Setup** — what state to start in
- **Action** — what to do
- **Expected** — what should happen
- **Pass / Fail** — tick the box

Use an existing survey with a handful of photos for tests that need data.
Open the iPhone Safari PWA unless a specific browser is called out.

---

## A. App startup and offline

### 1. Cold start (no cache)
- **Setup:** Clear Safari website data, or use a fresh browser profile.
- **Action:** Open the PWA URL.
- **Expected:** Loads within 10 seconds. Home page renders. Version number
  at top matches latest.
- [ ] Pass

### 2. Warm start
- **Setup:** PWA already installed.
- **Action:** Tap the home-screen icon.
- **Expected:** Home page loads in under 2 seconds. No blank flash.
- [ ] Pass

### 3. Offline launch
- **Setup:** Put device in airplane mode.
- **Action:** Open the PWA from home-screen icon.
- **Expected:** Home page loads. Existing surveys visible. Banner may
  warn about offline but app is functional.
- [ ] Pass

### 4. Service worker update
- **Setup:** Previous version of app is running.
- **Action:** Open app after a new version has been deployed.
- **Expected:** Eventually shows updated version number. Force Update
  option in overflow menu works if not automatic.
- [ ] Pass

---

## B. Creating a new survey

### 5. New survey from home FAB
- **Setup:** Home page.
- **Action:** Tap the yellow + button, fill in vessel name, year/make/model.
- **Expected:** Survey is created with unique timestamp ID, opens in
  inspection view.
- [ ] Pass

### 6. Specs auto-fill on Year/Make/Model blur
- **Setup:** Edit Intro form.
- **Action:** Type "1988 Silverton 34C" in Year/Make/Model and tap outside.
- **Expected:** Yellow banner appears offering to auto-fill dimensions.
  Vessel type set to "power" without banner click. Tap Apply → dimensions
  populate.
- [ ] Pass

### 7. Draft variant selection
- **Setup:** A sailboat with multiple keel options (e.g. Beneteau Oceanis 38).
- **Action:** Enter Year/Make/Model, apply specs.
- **Expected:** Radio buttons for keel/draft variants appear. Selecting
  one populates draft and keel type.
- [ ] Pass

---

## C. Checklist inspection

### 8. Rate an item via compact badge
- **Setup:** Inspection view, category expanded.
- **Action:** Tap the small rating badge on a checklist item.
- **Expected:** Bottom sheet opens with all rating options labeled
  (A / B / C / NA / NT / PO). Tapping one closes sheet and rating shows
  as short label on the item.
- [ ] Pass

### 9. Add note via 📝 icon
- **Setup:** Inspection view.
- **Action:** Tap the 📝 icon (no text label) on an item.
- **Expected:** Bottom sheet opens with snippet cards above and notes
  textarea below. Snippet cards match the item's category.
- [ ] Pass

### 10. Insert snippet (tap to append)
- **Setup:** Notes sheet open on an item.
- **Action:** Tap a snippet card, then tap another.
- **Expected:** First tap inserts snippet text. Second tap appends (does
  not replace). Ratings on the snippet cards match available options.
- [ ] Pass

### 11. Capture photo via 📷 icon
- **Setup:** Inspection view.
- **Action:** Tap 📷 icon, take a photo.
- **Expected:** Photo count badge appears. Thumbnail visible. Photo
  persists after navigating away and back.
- [ ] Pass

### 12. Flag for follow-up
- **Setup:** Any item.
- **Action:** Tap the 🏳️ flag icon.
- **Expected:** Icon changes to 🚩. Item shows in category's flagged
  summary bar. Unflag returns to 🏳️.
- [ ] Pass

### 13. Skip single item
- **Setup:** Any unrated item.
- **Action:** Tap ⊘ Skip.
- **Expected:** Item is struck through in inspection view. Shows ⊘ badge.
  "N skipped" badge appears in category title.
- [ ] Pass

### 14. Skip entire category
- **Setup:** Category expanded.
- **Action:** Tap "⊘ Skip Entire Category" button. Confirm dialog.
- **Expected:** Every item in that category is marked excluded. Accordion
  collapses. Category header shows "Skipped" instead of percentage.
- [ ] Pass

### 15. Unskip single item
- **Setup:** An excluded item.
- **Action:** Tap ⊘ icon again.
- **Expected:** Item returns to normal state.
- [ ] Pass

---

## D. Check function

### 16. Check from inspection bar
- **Setup:** A partially-complete survey.
- **Action:** Tap ✅ Check on bottom bar.
- **Expected:** Pre-flight dialog opens with issues grouped by severity.
  Completion percentage shown at top.
- [ ] Pass

### 17. Check treats skipped sections as handled
- **Setup:** Survey with an entire-category skip.
- **Action:** Tap ✅ Check.
- **Expected:** Skipped section shows as single info item "Entire 'X'
  section skipped — excluded from report", NOT as individual warnings.
- [ ] Pass

### 18. Check from home page dropdown
- **Setup:** Home page, survey dropdown expanded.
- **Action:** Tap ✅ Check.
- **Expected:** Same Check dialog opens for that survey.
- [ ] Pass

### 19. Check catches unrated items
- **Setup:** Survey with several unrated items.
- **Action:** Tap ✅ Check.
- **Expected:** "Unrated: X" warnings listed. Count capped at 20 with
  "and N more" message.
- [ ] Pass

---

## E. Vessel description auto-generation

### 20. Description auto-generates on save
- **Setup:** New survey with empty description.
- **Action:** Fill Edit Intro fields, tap ← Back to Inspection.
- **Expected:** Vessel description is populated automatically using form
  data. Placeholders like [COLOUR] remain where data is missing.
- [ ] Pass

### 21. Manual edit disables auto-regen
- **Setup:** Auto-generated description present.
- **Action:** Edit description manually, wait 3 seconds, return to
  Inspection, then back to Edit Intro, edit a spec field, go back.
- **Expected:** Description does NOT get overwritten. Manual edits preserved.
- [ ] Pass

### 22. Placeholder count shown
- **Setup:** Edit Intro with auto-generated description.
- **Action:** Look below description textarea.
- **Expected:** "⚠️ N placeholders still need attention" warning visible
  when placeholders exist. Hidden when zero.
- [ ] Pass

---

## F. Report generation

### 23. Generate report from inspection bar
- **Setup:** A reasonably-complete survey.
- **Action:** Tap 📄 Report.
- **Expected:** Report opens in new tab. Cover page, TOC, all sections
  present. No console errors. Page numbers visible.
- [ ] Pass

### 24. Placeholders highlighted in report
- **Setup:** Survey with description containing [COLOUR] etc.
- **Action:** Generate report.
- **Expected:** Placeholders appear with yellow background in Vessel
  Description section. Impossible to miss.
- [ ] Pass

### 25. Word export works
- **Setup:** Report open.
- **Action:** Tap "Export to Word".
- **Expected:** .docx file downloads. Opens in Word. Formatting intact.
- [ ] Pass

### 26. Print / PDF works
- **Setup:** Report open.
- **Action:** Tap "Print / PDF".
- **Expected:** Browser print dialog opens. Letter size. Page numbers
  shown. No clipped content.
- [ ] Pass

---

## G. Backup and sync

### 27. Drive backup single survey — progress dialog
- **Setup:** Signed into Drive, current survey selected.
- **Action:** Tap 💾 Backup.
- **Expected:** Progress dialog appears, fills as photos upload, shows
  elapsed time and per-photo detail. Ends with green "✓ Backup complete".
- [ ] Pass

### 28. Drive backup handles disabled API
- **Setup:** Google Cloud project does NOT have Drive API enabled.
- **Action:** Tap 💾 Backup.
- **Expected:** Friendly dialog shows "Drive API not enabled" with direct
  link to enable page. No raw JSON shown.
- [ ] Pass

### 29. Firebase download from banner
- **Setup:** This browser has 0 photos locally but Firebase has photos.
- **Action:** Yellow "photos on another device" banner appears. Tap
  "Download from Firebase".
- **Expected:** Progress dialog shows, downloads one-at-a-time with 300ms
  pauses, ends with green "✓ Download complete" without crashing Safari.
- [ ] Pass

---

## H. Navigation and data durability

### 30. App survives device reload
- **Setup:** Survey in progress with photos, notes, ratings.
- **Action:** Force-close Safari, reopen the PWA.
- **Expected:** All data intact. Last-opened survey state preserved.
- [ ] Pass

---

## After running

If any item failed:
1. Note the version and step in `CHANGELOG.md` under Fixed.
2. Add a new automated test in `tests/` if one would have caught it.
3. Ship the fix in the next version.

If everything passed: ship with confidence.
