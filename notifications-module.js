// notifications-module.js
// Lightweight shared notification utilities.
// This module re-exports the existing fetchNotifications helper
// and provides a few DOM/time helpers that pages can reuse.

import { fetchNotifications } from './notifications-api.js';

export { fetchNotifications };

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatTime(ts) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleString(); } catch(e) { return String(ts); }
}

export function getNotificationIcon(type) {
  // returns { bg, color, label }
  if (type === 'alert') return { bg: '#fff7ed', color: '#92400e', label: '!' };
  if (type === 'appointment') return { bg: '#eef2ff', color: '#1e3a8a', label: 'A' };
  return { bg: '#eef2ff', color: '#1e3a8a', label: 'N' };
}

export async function loadExplicitNotifications(uid) {
  if (!uid) return [];
  try {
    const list = await fetchNotifications(uid);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn('loadExplicitNotifications failed', err);
    return [];
  }
}

// Small wrappers that attempt to call existing window helpers where present
export async function pushTestNotificationWrapper(opts = {}) {
  if (typeof window.pushTestNotification === 'function') return window.pushTestNotification(opts);
  // fallback: attempt to write to notifications via notifications-api if available
  throw new Error('pushTestNotification not implemented in this environment');
}

export async function markAllAsReadWrapper(uid) {
  if (!uid) throw new Error('missing uid');
  if (typeof window.markAllNotificationsRead === 'function') return window.markAllNotificationsRead(uid);
  throw new Error('markAllNotificationsRead not available');
}

export async function clearAllNotificationsWrapper(uid) {
  if (!uid) throw new Error('missing uid');
  if (typeof window.clearAllNotifications === 'function') return window.clearAllNotifications(uid);
  throw new Error('clearAllNotifications not available');
}

// Utility to render a normalized list into a container element
export function renderNotificationListInto(container, list = []) {
  if (!container) return;
  container.innerHTML = '';
  if (!list || !list.length) {
    const empty = document.createElement('div');
    empty.className = 'notif-empty';
    empty.textContent = 'No notifications';
    container.appendChild(empty);
    return;
  }

  list.forEach(n => {
    const li = document.createElement('div');
    li.className = 'notif-item';
    li.tabIndex = 0;
    const icon = getNotificationIcon(n.type);
    li.innerHTML = `<div style="width:44px;height:44px;border-radius:8px;flex-shrink:0;background:${icon.bg};display:flex;align-items:center;justify-content:center;font-weight:700;color:${icon.color}">${escapeHtml((n.title||'').slice(0,1) || icon.label)}</div><div style="flex:1;min-width:0;margin-left:10px"><div style="font-weight:700;font-size:13px;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(n.title||'')}</div><div style="font-size:13px;color:#6b7280;margin-top:4px;white-space:normal">${escapeHtml(n.message||'')}</div><div style="font-size:11px;color:#9ca3af;margin-top:6px">${formatTime(n.time)}</div></div>`;
    li.dataset.id = n.id || '';
    container.appendChild(li);
  });
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
