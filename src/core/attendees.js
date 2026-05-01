// ============================================================================
// core/attendees.js — Normalize Persons in Attendance text
// ============================================================================

(function () {
  'use strict';

  function normalizeWhitespace(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function cleanAttendancePart(part) {
    let value = normalizeWhitespace(part);
    value = value.replace(/\s*\(([^)]*)\)\s*/g, ' ($1) ');
    value = normalizeWhitespace(value);
    value = value.replace(
      /^(.+?)\s*\((Owner|Broker|Client|Purchaser|Mechanic|Representative)\)\s*\1$/i,
      '$1 ($2)'
    );
    return normalizeWhitespace(value);
  }

  function attendeeIdentity(part) {
    return cleanAttendancePart(part)
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(/[^a-z0-9]+/gi, ' ')
      .replace(/\b(sams|surveyor|associate|abyc|master|advisor|owner|broker|client|purchaser|mechanic|representative)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function formatPersonsInAttendance(raw) {
    const text = normalizeWhitespace(raw);
    if (!text) return '';

    const parts = text
      .split(/\s*,\s*(?=[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+)*(?:\s*\(|\s*$))/)
      .map(cleanAttendancePart)
      .filter(Boolean);

    const out = [];
    const seen = new Set();
    for (const part of parts) {
      const id = attendeeIdentity(part) || part.toLowerCase();
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      out.push(part);
    }
    return out.join(', ');
  }

  const API = { formatPersonsInAttendance };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  } else if (typeof window !== 'undefined') {
    window.KikiAttendees = API;
  }
})();
