/* YETI basic client-side access gate.
 * This is a convenience barrier only: credentials are visible in this public repository.
 * Replace with server-verified authentication before using this application for sensitive data.
 */
(() => {
 'use strict';
 const CONFIG = Object.freeze({
  adminIds: ['1297', '1636'],
  adminPassword: '12971636',
  userId: 'idea_YETI',
  userPassword: '000000',
  inactivityMs: 15 * 60 * 1000,
  sessionKey: 'yetiTabAuthSessionV1'
 });
 const overlay = document.getElementById('yetiAuthOverlay');
 const form = document.getElementById('yetiAuthForm');
 const roleButtons = [...document.querySelectorAll('[data-yeti-auth-role]')];
 const roleTitle = document.getElementById('yetiAuthRoleTitle');
 const userIdInput = document.getElementById('yetiAuthUserId');
 const passwordInput = document.getElementById('yetiAuthPassword');
 const error = document.getElementById('yetiAuthError');
 const logoutButton = document.getElementById('yetiLogoutBtn');
 const sessionLabel = document.getElementById('yetiSessionRole');
 const appRegions = [...document.querySelectorAll('body > header, body > main, body > footer')];
 let selectedRole = '';
 let session = null;
 let timer = null;

 function readSession() {
  try {
   const value = JSON.parse(sessionStorage.getItem(CONFIG.sessionKey) || 'null');
   if (!value || !['admin', 'user'].includes(value.role) || typeof value.lastActivity !== 'number') return null;
   return value;
  } catch (_) { return null; }
 }
 function saveSession() {
  try { sessionStorage.setItem(CONFIG.sessionKey, JSON.stringify(session)); }
  catch (_) { lock('Your browser is blocking tab storage. Please enable site storage and sign in again.'); }
 }
 function setAppLocked(locked) {
  document.body.classList.toggle('yeti-authenticated', !locked);
  document.body.classList.toggle('yeti-auth-locked', locked);
  appRegions.forEach(region => {
   region.inert = locked;
   if (locked) region.setAttribute('aria-hidden', 'true');
   else region.removeAttribute('aria-hidden');
  });
  overlay.hidden = !locked;
  if (logoutButton) logoutButton.hidden = locked;
  if (sessionLabel) sessionLabel.hidden = locked;
 }
 function lock(message) {
  session = null;
  try { sessionStorage.removeItem(CONFIG.sessionKey); } catch (_) {}
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  setAppLocked(true);
  if (message && error) { error.textContent = message; error.hidden = false; }
  if (passwordInput) passwordInput.value = '';
 }
 function unlock() {
  setAppLocked(false);
  if (sessionLabel) sessionLabel.textContent = session.role === 'admin' ? 'ADMIN SESSION' : 'USER SESSION';
  document.body.dataset.yetiAuthRole = session.role;
  if (error) { error.hidden = true; error.textContent = ''; }
  if (timer !== null) window.clearInterval(timer);
  timer = window.setInterval(checkInactivity, 1000);
 }
 function checkInactivity() {
  if (!session) return;
  if (Date.now() - session.lastActivity >= CONFIG.inactivityMs) {
   lock('Your session expired after 15 minutes of inactivity. Please sign in again.');
  }
 }
 function recordActivity() {
  if (!session) return;
  checkInactivity();
  if (!session) return;
  session.lastActivity = Date.now();
  saveSession();
 }
 function chooseRole(role) {
  if (!['admin', 'user'].includes(role)) return;
  selectedRole = role;
  roleButtons.forEach(button => {
   const active = button.dataset.yetiAuthRole === role;
   button.classList.toggle('is-selected', active);
   button.setAttribute('aria-pressed', String(active));
  });
  roleTitle.textContent = role === 'admin' ? 'Admin Login' : 'User Login';
  userIdInput.value = '';
  passwordInput.value = '';
  error.hidden = true;
  error.textContent = '';
  form.hidden = false;
  userIdInput.focus();
 }
 roleButtons.forEach(button => button.addEventListener('click', () => chooseRole(button.dataset.yetiAuthRole)));
 form.addEventListener('submit', event => {
  event.preventDefault();
  if (!selectedRole) return;
  const enteredId = userIdInput.value.trim();
  const enteredPassword = passwordInput.value;
  const valid = selectedRole === 'admin'
   ? CONFIG.adminIds.includes(enteredId) && enteredPassword === CONFIG.adminPassword
   : enteredId === CONFIG.userId && enteredPassword === CONFIG.userPassword;
  if (!valid) {
   error.textContent = 'Incorrect User ID or Password. Please try again.';
   error.hidden = false;
   passwordInput.value = '';
   passwordInput.focus();
   return;
  }
  session = { role: selectedRole, userId: enteredId, lastActivity: Date.now() };
  saveSession();
  if (session) unlock();
 });
 logoutButton?.addEventListener('click', () => lock('You have been logged out.'));
 ['pointerdown', 'keydown', 'click', 'scroll', 'touchstart', 'wheel'].forEach(type => {
  document.addEventListener(type, recordActivity, { passive: true, capture: true });
 });
 document.addEventListener('visibilitychange', checkInactivity);
 window.addEventListener('pageshow', checkInactivity);

 const existing = readSession();
 if (existing && Date.now() - existing.lastActivity < CONFIG.inactivityMs) {
  session = existing;
  unlock();
 } else {
  lock(existing ? 'Your session expired after 15 minutes of inactivity. Please sign in again.' : '');
 }
})();
