// Simple notifications API module (client-side) that reads notifications from Firebase Realtime Database
// Exports: fetchNotifications(uid) -> Promise<Array<notification>>

import { initFirebase, dbInstance } from './auth-db.js';
import { get, ref } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Ensure Firebase initialized (other modules also call initFirebase; this is idempotent)
initFirebase();
const db = dbInstance();

export async function fetchNotifications(uid) {
  if (!uid) return [];
  try {
    const snap = await get(ref(db, `notifications/${uid}`));
    if (!snap.exists()) return [];
    const val = snap.val();
    let arr = [];
    if (Array.isArray(val)) arr = val;
    else arr = Object.values(val || {});

    // Normalize items to the UI shape expected by template.js
    arr = arr.map((n, idx) => ({
      id: n.id ?? n._id ?? idx,
      type: n.type ?? 'info',
      title: n.title ?? n.subject ?? 'Notification',
      message: n.message ?? n.body ?? '',
      time: n.time ?? n.created_at ?? '',
      unread: n.unread === undefined ? !!n.is_unread : !!n.unread
    }));

    return arr;
  } catch (err) {
    console.error('notifications-api.fetchNotifications error', err);
    return [];
  }
}

// Parse a notification `time` field into a numeric timestamp (ms since epoch).
export function parseToTimestamp(item) {
  try {
    if (!item) return 0;
    const t = item.time;
    if (!t) return 0;
    if (typeof t === 'number' && Number.isFinite(t)) return Number(t);
    const maybeNum = Number(String(t).trim());
    if (!Number.isNaN(maybeNum) && maybeNum > 0) return maybeNum;

    // Handle YYYY-MM-DD or ranges like "2025-12-01 10:00 - 11:00"
    const dateRangeMatch = String(t).match(/(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}:\d{2}))?/);
    if (dateRangeMatch) {
      const datePart = dateRangeMatch[1];
      const timePart = dateRangeMatch[2] || '00:00';
      const iso = `${datePart}T${timePart}:00`;
      const parsedIso = Date.parse(iso);
      if (!Number.isNaN(parsedIso) && parsedIso > 0) return parsedIso;
    }

    // Try direct Date.parse
    const parsed = Date.parse(String(t));
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;

    // Relative formats
    const s = String(t).trim().toLowerCase();
    if (s === 'just now' || s === 'now') return Date.now();
    const m = s.match(/(\d+)\s*min|(?:(\d+)m\b)/i);
    if (m && (m[1] || m[2])) return Date.now() - (Number(m[1]||m[2]) * 60000);
    const h = s.match(/(\d+)\s*h(?:ours?)?|(?:(\d+)h\b)/i);
    if (h && (h[1] || h[2])) return Date.now() - (Number(h[1]||h[2]) * 3600000);
    const ago = s.match(/(\d+)\s*(seconds|secs|s)\b/i);
    if (ago && ago[1]) return Date.now() - (Number(ago[1]) * 1000);
    const minsAgo = s.match(/(\d+)\s*min(?:utes)?\s*ago/i);
    if (minsAgo && minsAgo[1]) return Date.now() - (Number(minsAgo[1]) * 60000);

    return 0;
  } catch (e) { return 0; }
}

// Sort notifications array in-place: newest first, unread preferred on ties.
export function sortNotifications(arr) {
  if (!Array.isArray(arr)) return arr;
  arr.sort((a, b) => {
    const ta = parseToTimestamp(a);
    const tb = parseToTimestamp(b);
    if (ta !== tb) return tb - ta;
    if ((a.unread ? 1 : 0) !== (b.unread ? 1 : 0)) return (b.unread ? 1 : 0) - (a.unread ? 1 : 0);
    return 0;
  });
  return arr;
}
