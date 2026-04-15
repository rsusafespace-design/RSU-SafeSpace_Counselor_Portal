// Helper to get initials from a name
export function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase();
}

// Helper to show user info (greeting, sidebar, avatar)
export async function showUserInfo(user) {
  console.log('showUserInfo called with user:', user?.uid);
  
  let displayName = "Counselor";
  let initials = "C";
  
  if (user && user.uid) {
    try {
      const q = query(ref(db, "counselors"), orderByChild("uid"), equalTo(user.uid));
      const qsnap = await get(q);
      
      if (qsnap.exists()) {
        // capture candidate profile fields to populate dropdown/avatar
        let profileImageUrl = null;
        let emailAddr = user.email || '';
        qsnap.forEach(child => {
          const val = child.val();
          console.log('Found counselor data:', val);

          // capture email if present
          if (val.email) emailAddr = val.email;

          // capture profile image candidates
          profileImageUrl = profileImageUrl || (val.profile_image || val.profileImage || val.photo_url || val.photoURL || val.avatar || val.picture || null);

          // Always prioritize username for consistent display
          if (val.username) {
            displayName = val.username;
            initials = getInitials(val.username);
          } else if (val.first_name && val.last_name) {
            displayName = `${val.first_name} ${val.last_name}`;
            initials = getInitials(displayName);
          } else if (val.name) {
            displayName = val.name;
            initials = getInitials(val.name);
          }
        });

        // Update the profile dropdown fields if present on the page
        try {
          const ddName = document.getElementById('profileDropdownName');
          const ddEmail = document.getElementById('profileDropdownEmail');
          const ddAvatar = document.getElementById('profileDropdownAvatar');
          if (ddName) ddName.textContent = displayName;
          if (ddEmail) ddEmail.textContent = emailAddr || (user && user.email ? user.email : '');
          if (ddAvatar) {
            const ddAvatarText = document.getElementById('profileDropdownAvatarText');
            if (profileImageUrl) {
              // test image quickly
              const testImg = new Image();
              testImg.onload = () => {
                ddAvatar.src = profileImageUrl; ddAvatar.style.display = 'block';
                if (ddAvatarText) ddAvatarText.style.display = 'none';
              };
              testImg.onerror = () => {
                ddAvatar.style.display = 'none'; if (ddAvatarText) { ddAvatarText.textContent = initials; ddAvatarText.style.display = 'flex'; }
              };
              testImg.src = profileImageUrl;
            } else {
              // show initials fallback in the avatar circle
              ddAvatar.style.display = 'none';
              if (ddAvatarText) { ddAvatarText.textContent = initials; ddAvatarText.style.display = 'flex'; }
            }
          }
        } catch (e) {
          console.warn('Failed to populate profile dropdown fields:', e);
        }
      } else {
        console.warn('No counselor data found for uid:', user.uid);
        // Try to use email as fallback
        if (user.email) {
          displayName = user.email.split('@')[0];
          initials = getInitials(displayName);
        }
      }
    } catch (error) {
      console.error('Error fetching counselor data:', error);
      // Use email as fallback
      if (user.email) {
        displayName = user.email.split('@')[0];
        initials = getInitials(displayName);
      }
    }
  }

  // Ensure dropdown fields are populated even if DB lookup failed or returned no record
  try {
    const ddName = document.getElementById('profileDropdownName');
    const ddEmail = document.getElementById('profileDropdownEmail');
    const ddAvatar = document.getElementById('profileDropdownAvatar');
    const ddAvatarText = document.getElementById('profileDropdownAvatarText');
    if (ddName && (!ddName.textContent || ddName.textContent.trim() === '')) ddName.textContent = displayName;
    if (ddEmail && (!ddEmail.textContent || ddEmail.textContent.trim() === '')) ddEmail.textContent = (user && user.email) ? user.email : '';
    if (ddAvatar && ddAvatar.style.display !== 'block') {
      if (ddAvatarText) { ddAvatarText.textContent = initials; ddAvatarText.style.display = 'flex'; }
    }
  } catch (e) { /* ignore */ }
  
  // Dynamic greeting based on time
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 18) return "Good Afternoon";
    return "Good Evening";
  }
  
  const greetingText = `${getGreeting()}, ${displayName} 👋`;
  
  // Update all greeting elements
  const greetingEl = document.getElementById("greeting");
  if (greetingEl) {
    greetingEl.textContent = greetingText;
    console.log('Updated greeting:', greetingText);
  }
  
  const greetingCard = document.getElementById("greetingCard");
  if (greetingCard) greetingCard.textContent = greetingText;
  
  const greetingName = document.getElementById("greetingName");
  if (greetingName) greetingName.textContent = greetingText;
  
  // Update profile header name in viewAccount.html - but only if no profile data is loaded yet
  const profileHeaderName = document.getElementById("profileHeaderName");
  if (profileHeaderName && profileHeaderName.textContent === 'Counselor') {
    // Only update if it's still showing the default "Counselor" text
    // Let populateProfileForm handle the full name display
    profileHeaderName.textContent = displayName;
    console.log('Updated profile header name (fallback):', displayName);
  }
  
  // Update sidebar with specific ID
  const sidebarUserName = document.getElementById("sidebarUserName");
  if (sidebarUserName) {
    sidebarUserName.textContent = displayName;
    console.log('Updated sidebar user name:', displayName);
  }
  
  // Fallback to old selector
  const sidebarLogged = document.querySelector(".logged strong");
  if (sidebarLogged) sidebarLogged.textContent = displayName;
  
  // Update avatar with profile image or initials
  updateUserAvatar(user, initials);
  
  // Update all other avatars (fallback for other pages)
  const avatarEls = document.querySelectorAll(".avatar");
  avatarEls.forEach(el => {
    if (el.id !== 'userAvatar') { // Skip the main avatar, it's handled separately
      el.textContent = initials;
      console.log('Updated avatar element:', initials);
    }
  });
  
  console.log('showUserInfo completed - displayName:', displayName, 'initials:', initials);
}

// Helper function to update user avatar with profile image or initials fallback
async function updateUserAvatar(user, initials) {
  const userAvatarImg = document.getElementById("userAvatarImg");
  const userAvatarText = document.getElementById("userAvatarText");
  const userAvatar = document.getElementById("userAvatar");
  
  if (!userAvatar) return;
  
  // Set initials first as fallback
  if (userAvatarText) {
    userAvatarText.textContent = initials;
  }
  
  // Try to load profile image from database
  if (user && user.uid) {
    try {
      const q = query(ref(db, "counselors"), orderByChild("uid"), equalTo(user.uid));
      const qsnap = await get(q);
      
      if (qsnap.exists()) {
        qsnap.forEach(child => {
          const val = child.val();
          
          // Check for profile image URL in various possible field names
          const profileImageUrl = val.profile_image || val.profileImage || val.photo_url || val.photoURL || val.avatar || val.picture;
          
          if (profileImageUrl && userAvatarImg && userAvatarText) {
            console.log('Loading profile image:', profileImageUrl);
            
            // Create a new image to test if URL is valid
            const testImg = new Image();
            testImg.onload = function() {
              // Image loaded successfully
              userAvatarImg.src = profileImageUrl;
              userAvatarImg.style.display = 'block';
              userAvatarText.style.display = 'none';
              console.log('Profile image loaded successfully');
            };
            testImg.onerror = function() {
              // Image failed to load, keep initials
              console.log('Profile image failed to load, using initials');
              userAvatarImg.style.display = 'none';
              userAvatarText.style.display = 'flex';
            };
            testImg.src = profileImageUrl;
          } else {
            // No profile image, use initials
            if (userAvatarImg && userAvatarText) {
              userAvatarImg.style.display = 'none';
              userAvatarText.style.display = 'flex';
            }
            console.log('No profile image found, using initials:', initials);
          }
        });
      }
    } catch (error) {
      console.error('Error loading profile image:', error);
      // Fallback to initials on error
      if (userAvatarImg && userAvatarText) {
        userAvatarImg.style.display = 'none';
        userAvatarText.style.display = 'flex';
      }
    }
  }
  
  console.log('Updated user avatar with initials:', initials);
}
// Initialize Firebase using centralized config in auth-db.js

/* FIREBASE IMPORTS (only DB helpers here) */
import { get, query, ref, orderByChild, equalTo, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
// Use auth-db.js for initialization and auth helpers
import { initFirebase, dbInstance, authInstance, login as authLogin, logout as authLogout, watchAuth as authWatchAuth, requireSignIn as authRequireSignIn, clearUserCache as authClearUserCache } from './auth-db.js';

// Initialize Firebase via shared module (uses centralized default config)
initFirebase();
export const db = dbInstance();
export const auth = authInstance();

// Enforce sign-in on protected pages. Skip pages that look like login pages.
try {
  const path = (window.location.pathname || '').toLowerCase();
  const filename = path.split('/').pop() || '';
  if (!filename.includes('login')) {
    // require sign-in and clear caches on user change; also refresh UI by calling showUserInfo
    authRequireSignIn({ loginPage: 'counselor_login.html', onUserChange: (user) => {
      try { showUserInfo(user); } catch (e) {}
    }});
  }
} catch (e) { console.warn('Auth enforcement init failed', e); }

// Re-export helpers for pages that want to call them explicitly
export const requireSignIn = authRequireSignIn;
export const clearUserCache = authClearUserCache;

/* GET USERNAME FOR WELCOME MESSAGE */
export async function getUsername(uid) {
  const q = query(ref(db, "counselors"), orderByChild("uid"), equalTo(uid));
  const qsnap = await get(q);
  if (qsnap.exists()) {
    let username = null;
    qsnap.forEach((child) => {
      if (child.val().username) {
        username = child.val().username;
      }
    });
    return username;
  }

  return null;
}

/* HELPER WRAPPERS */
// Re-export auth helpers from auth-db.js (single source)
export const login = authLogin;
export const logout = authLogout;
export const watchAuth = authWatchAuth;

/* attach to window for quick debugging */
window.firebaseAuth = auth;
window.login = login;
window.logout = logout;
window.watchAuth = watchAuth;
window.getUsername = getUsername;
window.getCounselorId = ensureAuth;

// --- Counselor Availability Firebase Helpers ---
// Save date exception slots for a specific date
export async function saveCounselorDateException(counselorId, dateIso, slotsArr) {
  // Save under /availabilities/{counselorId}/dateExceptions/{dateIso}
  return await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js').then(({ set }) =>
    set(ref(db, `availabilities/${counselorId}/dateExceptions/${dateIso}`), slotsArr)
  );
}
export async function ensureAuth() {
  return new Promise((resolve, reject) => {
    const unsub = watchAuth(user => {
      try {
        if (user && user.uid) {
          try { if (typeof unsub === 'function') unsub(); } catch(e) {}
          resolve(user);
        } else {
          try { if (typeof unsub === 'function') unsub(); } catch(e) {}
          reject(new Error("Not authenticated"));
        }
      } catch (err) {
        try { if (typeof unsub === 'function') unsub(); } catch(e) {}
        reject(err);
      }
    });
  });
}

export async function getCounselorWeeklyAvailability(counselorId) {
  const snap = await get(ref(db, `availabilities/${counselorId}/weeklyAvailability`));
  return snap.exists() ? snap.val() : null;
}

export async function saveCounselorWeeklyAvailability(counselorId, weeklyObj) {
  // Save under /availabilities/{counselorId}/weeklyAvailability
  return await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js').then(({ set }) =>
    set(ref(db, `availabilities/${counselorId}/weeklyAvailability`), weeklyObj)
  );
}

// New: support multiple weekly availability ranges stored as an array
export async function getCounselorWeeklyRanges(counselorId) {
  const snap = await get(ref(db, `availabilities/${counselorId}/weeklyRanges`));
  if (!snap.exists()) return null;
  const val = snap.val();
  // Ensure array output (RTDB may store arrays as object-like when sparse)
  if (Array.isArray(val)) return val;
  try {
    return Object.values(val || {});
  } catch {
    return [];
  }
}

export async function saveCounselorWeeklyRanges(counselorId, rangesArray) {
  // Persist array under /availabilities/{counselorId}/weeklyRanges
  return await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js').then(({ set }) =>
    set(ref(db, `availabilities/${counselorId}/weeklyRanges`), rangesArray)
  );
}

export async function getCounselorAvailability(counselorId) {
  const snap = await get(ref(db, `availabilities/${counselorId}`));
  return snap.exists() ? snap.val() : null;
}

export async function updateCounselorAvailability(counselorId, obj) {
  // Update under /availabilities/{counselorId}
  return await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js').then(({ update }) =>
    update(ref(db, `availabilities/${counselorId}`), obj)
  );
}

// Realtime subscription for counselor availability tree
export function subscribeCounselorData(counselorId, onChange) {
  const cid = typeof counselorId === 'object' && counselorId?.uid ? counselorId.uid : counselorId;
  const r = ref(db, `availabilities/${cid}`);
  // onValue returns an unsubscribe function in the modular SDK
  const unsubscribe = onValue(r, (snap) => {
    try {
      const val = snap.exists() ? snap.val() : null;
      if (typeof onChange === 'function') onChange(val);
    } catch (e) {
      console.warn('subscribeCounselorData callback error', e);
    }
  });
  return typeof unsubscribe === 'function' ? unsubscribe : (() => {});
}

// attach to window for easier access in pages using <script type="module">
window.subscribeCounselorData = subscribeCounselorData;

// --- Disabled Account Guard ---
let __disabledGuard = { unsub: null, triggered: false };

function showDisabledOverlay(message) {
  if (document.getElementById('disabled-account-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'disabled-account-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0,0,0,0.5)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '99999';

  const box = document.createElement('div');
  box.style.background = '#fff';
  box.style.padding = '20px';
  box.style.borderRadius = '12px';
  box.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
  box.style.maxWidth = '420px';
  box.style.width = '92%';
  box.style.textAlign = 'center';

  const title = document.createElement('h3');
  title.textContent = 'Access Disabled';
  title.style.margin = '0 0 8px';
  title.style.fontSize = '20px';
  title.style.color = '#111827';

  const msg = document.createElement('p');
  msg.textContent = message || 'You are currently disabled by the admin. Please contact them or try again later.';
  msg.style.margin = '0 0 16px';
  msg.style.color = '#374151';
  msg.style.fontSize = '14px';

  const btn = document.createElement('button');
  btn.textContent = 'OK';
  btn.style.background = '#10B981';
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.padding = '10px 16px';
  btn.style.borderRadius = '8px';
  btn.style.cursor = 'pointer';
  btn.addEventListener('click', async () => {
    try {
      btn.disabled = true;
      btn.style.opacity = '0.7';
      btn.style.cursor = 'not-allowed';
      btn.textContent = 'Signing out...';
      await logout();
    } catch {}
    try { window.location.href = 'counselor_login.html'; } catch {}
  });

  box.appendChild(title);
  box.appendChild(msg);
  box.appendChild(btn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

export function startDisabledAccountGuard() {
  watchAuth((user) => {
    if (typeof __disabledGuard.unsub === 'function') {
      try { __disabledGuard.unsub(); } catch {}
      __disabledGuard.unsub = null;
    }
    __disabledGuard.triggered = false;

    if (user && user.uid) {
      const q = query(ref(db, 'counselors'), orderByChild('uid'), equalTo(user.uid));
      const unsub = onValue(q, (snap) => {
        try {
          let disabled = false;
          if (snap.exists()) {
            snap.forEach((child) => {
              const v = child.val() || {};
              const status = String(v.status || '').toLowerCase();
              const loginFlag = String(v.login || '').toLowerCase();
              const loginAccess = v.login_access;
              if (loginAccess === false || loginFlag === 'disable' || status !== 'active') {
                disabled = true;
              }
            });
          }
          if (disabled && !__disabledGuard.triggered) {
            __disabledGuard.triggered = true;
            showDisabledOverlay('You are currently disabled by the admin. Please contact them or try again later.');
          }
        } catch (e) {
          // ignore guard errors
        }
      });
      __disabledGuard.unsub = typeof unsub === 'function' ? unsub : null;
    }
  });
}

// Auto-start the guard across pages that import main.js
startDisabledAccountGuard();

// Centralized recordActivity helper available to all pages that import main.js
export async function recordActivity(entry = {}, uid = null) {
  try {
    // Determine target uid (explicit param > entry.uid > window.currentUser > auth.currentUser)
    const targetUid = uid || entry.uid || (typeof window !== 'undefined' && window.currentUser && window.currentUser.uid) || (auth && auth.currentUser && auth.currentUser.uid) || null;
    if (!targetUid) {
      // Try to wait for auth if possible
      try {
        const user = await ensureAuth();
        if (user && user.uid) {
          // proceed with user
        }
      } catch (_) {
        console.warn('recordActivity: no authenticated user available, skipping activity write');
        return null;
      }
    }

    const payload = {
      icon: entry.icon || 'ℹ️',
      title: entry.title || '',
      subtitle: entry.subtitle || '',
      meta: entry.meta || '',
      ts: typeof entry.ts === 'number' ? entry.ts : Date.now(),
      // include any debugging payload if present (avoid circulars by stringifying when needed)
      details: (function(d){ try { if (!d) return null; if (typeof d === 'string') return d; return JSON.parse(JSON.stringify(d)); } catch(_) { try { return String(d); } catch(_) { return null; } } })(entry.details || entry.savedReport || null)
    };

    // dynamic import to keep top-level small
    const { push, ref, set } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js');
    const actRef = push(ref(db, `activity/${targetUid}`));
    if (typeof window !== 'undefined' && typeof window.safeSet === 'function') {
      await window.safeSet(actRef, payload);
    } else {
      await set(actRef, payload);
    }
    return true;
  } catch (e) {
    console.warn('recordActivity failed', e);
    return false;
  }
}

// expose globally for legacy pages that call window.recordActivity
try { window.recordActivity = window.recordActivity || recordActivity; } catch (e) { /* ignore */ }