#!/usr/bin/env python3
"""
v2429 — Rebuild conductivity chip set across Hull, Deck, Aft Deck, Flybridge.

Replaces all existing chips for these 5 sections with the unified set defined
in reference-docs/CONDUCTIVITY_CHIP_AUDIT.md (Dave-approved 2026-04-20):

  - Hull category > "Hull and rudder(s) conductivity testing"
  - Deck category > "Deck and coachroof/pilothouse conductivity testing"
  - Aft Deck category > "Aft deck conductivity testing"
  - Aft Deck category > "Conductivity testing"  (alias — DELETED, mapped via SHEET_MAPPING)
  - Flybridge category > "Flybridge conductivity testing"

Cockpit conductivity testing is intentionally untouched (different surface,
not part of Dave's request).

Hull rudder branching is handled in app.js at expand-time via
isPowerBoatHullRudderTest + scrubNakedRudderRefs (renamed + broadened in
v2429 to match conductivity items as well as resonance/percussion). Library
text always contains "and rudder(s)" form; scrubber strips rudder verbiage
for power boats.

Lead chip wording chosen in v2429: "Conductivity testing was carried out
on the {LOC} using a relative scale of 0 to 999." This reads naturally
regardless of whether the location is a compound subject ("hull and
rudder(s)") or singular ("aft deck", "flybridge"), so no verb-agreement
workaround is needed inside the lead sentence itself.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIB_PATH = ROOT / "text_library.json"

# ─── target sections to rebuild ─────────────────────────────────────────────
TARGETS = {
    "Hull": ["Hull and rudder(s) conductivity testing"],
    "Deck": ["Deck and coachroof/pilothouse conductivity testing"],
    "Aft Deck": ["Aft deck conductivity testing", "Conductivity testing"],
    "Flybridge": ["Flybridge conductivity testing"],
}

# ─── per-section configuration ──────────────────────────────────────────────
# section_name -> dict with:
#   loc       : the {LOC} substitution for lead chips
#   nt_reasons: list of NT reason chips (between lead and means)
#   nt_action : list of NT action chips (after means)
SECTION_CFG = {
    "Hull and rudder(s) conductivity testing": {
        "loc": "hull and rudder(s)",
        "nt_reasons": [
            "Conductivity testing was not possible because the vessel was in the water at the time of survey.",
        ],
        "nt_action": [
            "Recommend conductivity testing be carried out when the vessel is hauled out.",
        ],
    },
    "Deck and coachroof/pilothouse conductivity testing": {
        "loc": "deck and coachroof",
        "nt_reasons": [],   # Dave will hand-type a reason if needed
        "nt_action": [],
    },
    "Aft deck conductivity testing": {
        "loc": "aft deck",
        "nt_reasons": [
            "Testing was not possible because the surface was covered with PE / EVA foam material.",
            "Testing was not possible because the surface was covered with wood.",
        ],
        "nt_action": [],
    },
    "Flybridge conductivity testing": {
        "loc": "flybridge",
        "nt_reasons": [
            "Testing was not possible because the surface was covered with PE / EVA foam material.",
            "Testing was not possible because the surface was covered with wood.",
        ],
        "nt_action": [],
    },
}

# ─── location-neutral chip text (shared across all 4 sections) ──────────────
OBSERVED = {
    "C": [
        "Readings were low and generally consistent throughout the section.",
        "Readings were within an expected range for a vessel of similar age and construction.",
        "No materially elevated readings were obtained.",
        "Readings were generally uniform, with no notable anomalies detected.",
    ],
    "B": [
        "Localised elevated readings were noted in [insert location].",
        "Moderately elevated readings were obtained in isolated areas of the section.",
        "Elevated readings were noted in limited areas of the section.",
        "Conductivity testing identified suspect areas with readings above the surrounding structure.",
    ],
    "A": [
        "Widespread elevated readings were obtained throughout the section.",
        "Significantly elevated readings were noted over a broad area.",
        "High readings were recorded in multiple areas of the section.",
        "Conductivity testing identified extensive elevated readings within the section.",
    ],
}

MEANS = {
    "C": [
        "These findings suggested the section remained serviceable, with no clear indication of significant moisture intrusion or concealed deterioration.",
        "The results did not indicate a material defect requiring immediate corrective action.",
        "The pattern of readings was consistent with a section that remained fit for continued service.",
        "No evidence was found to suggest a significant concealed defect within the tested area.",
    ],
    "B": [
        "These findings suggested localised moisture intrusion or developing concealed deterioration in the affected area.",
        "The elevated readings suggested the need for closer investigation to rule out moisture retention or deterioration within the structure.",
        "The results indicated a developing defect that warranted further review and repair as required.",
        "The affected area appeared to warrant further investigation to determine the extent and significance of the condition.",
    ],
    "A": [
        "These findings strongly suggested significant moisture intrusion or serious concealed deterioration within the section.",
        "The extent of the elevated readings raised concern for advanced deterioration in the affected area.",
        "The pattern and extent of the readings suggested a condition requiring prompt corrective action.",
    ],
}

ACTION = {
    "C": [
        "No immediate corrective work was considered necessary beyond routine monitoring and maintenance.",
        "No immediate repairs were recommended, though the area should continue to be monitored during normal maintenance.",
        "Routine maintenance of seams, fittings, and penetrations should be continued to help prevent future moisture intrusion.",
    ],
    "B": [
        "The affected area should be further investigated and repaired as necessary by a qualified marine repair facility.",
        "Suspect areas should be opened up as required to determine the extent of the defect, and repairs should be carried out accordingly.",
        "Associated seams, fittings, and penetrations in way of the affected area should be inspected and made watertight as necessary.",
        "Further investigation was recommended in order to determine the full extent of the condition prior to repair.",
    ],
    "A": [
        "The affected area should be investigated and repaired without delay by a qualified marine repair facility.",
        "The source of moisture intrusion should be identified and corrected, and damaged material should be repaired as necessary.",
        "Repairs were considered necessary before the vessel was returned to regular service.",
        "Prompt corrective action was recommended to prevent further deterioration.",
    ],
}

# Severity per rating/phase — matches existing library conventions.
SEVERITY = {
    "C": {"observed": 1, "means": 1, "action": 1},
    "B": {"observed": 3, "means": 3, "action": 3},
    "A": {"observed": 5, "means": 5, "action": 5},
    "NT": {"observed": 3, "means": 3, "action": 3},
}


def build_section(section_name: str) -> list:
    """Return the unified chip list for a single section, in display order."""
    cfg = SECTION_CFG[section_name]
    loc = cfg["loc"]
    out = []

    # Standard opening — first 2 chips on every A/B/C rating.
    # v2429: reworded from "The {loc} was checked..." → "Conductivity testing
    # was carried out on the {loc}..." so the verb agrees with the subject
    # ("testing was") regardless of whether {loc} is a compound subject
    # ("hull and rudder(s)") or singular ("aft deck"). Old wording produced
    # "The hull and rudder(s) was checked..." which fails subject/verb
    # agreement on sailboats.
    lead_1 = f"Conductivity testing was carried out on the {loc} using a relative scale of 0 to 999."
    lead_2 = "Readings were found to be between [insert low reading] and [insert high reading]."

    for rating in ("C", "B", "A"):
        # Lead 1 + Lead 2 (observed phase)
        out.append({
            "section": section_name,
            "rating": rating,
            "phase": "observed",
            "text": lead_1,
            "severity": 1,
        })
        out.append({
            "section": section_name,
            "rating": rating,
            "phase": "observed",
            "text": lead_2,
            "severity": 1,
        })
        # Body observed chips
        for txt in OBSERVED[rating]:
            out.append({
                "section": section_name,
                "rating": rating,
                "phase": "observed",
                "text": txt,
                "severity": SEVERITY[rating]["observed"],
            })
        # Means chips
        for txt in MEANS[rating]:
            out.append({
                "section": section_name,
                "rating": rating,
                "phase": "means",
                "text": txt,
                "severity": SEVERITY[rating]["means"],
            })
        # Action chips
        for txt in ACTION[rating]:
            out.append({
                "section": section_name,
                "rating": rating,
                "phase": "action",
                "text": txt,
                "severity": SEVERITY[rating]["action"],
            })

    # NT block — lead, reasons, means, action.
    # v2429: "Conductivity testing of the {loc} was not carried out." reads
    # correctly for all locs because the subject is "testing", not "{loc}".
    nt_lead = f"Process / limitation: Conductivity testing of the {loc} was not carried out."
    nt_means = "What that means: No opinion could be formed regarding moisture intrusion or concealed deterioration in the untested area."

    out.append({
        "section": section_name,
        "rating": "Not tested",
        "phase": "observed",
        "text": nt_lead,
        "severity": SEVERITY["NT"]["observed"],
    })
    for reason in cfg["nt_reasons"]:
        out.append({
            "section": section_name,
            "rating": "Not tested",
            "phase": "observed",
            "text": reason,
            "severity": SEVERITY["NT"]["observed"],
        })
    out.append({
        "section": section_name,
        "rating": "Not tested",
        "phase": "means",
        "text": nt_means,
        "severity": SEVERITY["NT"]["means"],
    })
    for action in cfg["nt_action"]:
        out.append({
            "section": section_name,
            "rating": "Not tested",
            "phase": "action",
            "text": action,
            "severity": SEVERITY["NT"]["action"],
        })

    return out


def main():
    data = json.loads(LIB_PATH.read_text(encoding="utf-8"))

    summary = []
    for category, sections in TARGETS.items():
        if category not in data:
            print(f"WARN: category {category!r} missing", file=sys.stderr)
            continue
        before = len(data[category])
        # 1. Strip ALL existing entries for the target sections in this category
        targets_lower = {s.lower() for s in sections}
        data[category] = [
            e for e in data[category]
            if not (isinstance(e, dict) and e.get("section", "").lower() in targets_lower)
        ]
        # 2. Append the new unified set for each REAL section (alias dropped)
        appended = 0
        for section_name in sections:
            if section_name not in SECTION_CFG:
                # alias section — skip; gets routed via SHEET_MAPPING
                continue
            new_chips = build_section(section_name)
            data[category].extend(new_chips)
            appended += len(new_chips)
        after = len(data[category])
        summary.append((category, sections, before, after, appended))

    LIB_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print("Conductivity chip rebuild complete.")
    print(f"{'Category':<14} {'Before':>8} {'After':>8} {'Δ':>6}  Sections")
    print("-" * 80)
    for cat, secs, before, after, appended in summary:
        delta = after - before
        print(f"{cat:<14} {before:>8} {after:>8} {delta:>+6}  {', '.join(secs)}")
    total_new = sum(appended for *_, appended in summary)
    print(f"\n{total_new} new chip entries written.")


if __name__ == "__main__":
    main()
