// Lightweight client-side auth demo using localStorage
// Cleaned profile.js: simplified messages and use i18n.t(key)
(function(){
  function $(id){ return document.getElementById(id); }

  function getUsers(){
    try{ return JSON.parse(localStorage.getItem('users')||'{}'); }catch(e){return{}};
  }
  function saveUsers(u){ localStorage.setItem('users', JSON.stringify(u)); }

  async function hash(password){
    if (!password) return '';
    // Prefer Web Crypto API when available (fast and secure)
    try{
      if(window.crypto && crypto.subtle && typeof crypto.subtle.digest === 'function'){
        const enc = new TextEncoder();
        const data = enc.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b=>b.toString(16).padStart(2,'0')).join('');
      }
    }catch(e){
      console.warn('crypto.subtle.digest failed', e && e.message);
    }

    // Fallback: simple non-cryptographic hash to avoid runtime errors in insecure contexts.
    // NOTE: this is NOT cryptographically secure. Use Web Crypto (HTTPS or localhost) for production.
    console.warn('Web Crypto API not available — using fallback hash (not secure)');
    let h = 2166136261 >>> 0; // FNV-1a 32-bit
    for(let i=0;i<password.length;i++){
      h ^= password.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    // expand to hex string
    const hex = ('00000000' + (h >>> 0).toString(16)).slice(-8);
    return hex + hex; // return 16-byte hex-ish string for compatibility
  }

  function currentUser(){
    try{
      if(window._auth && typeof window._auth.getCurrentUser === 'function') return window._auth.getCurrentUser();
      // fallback: try unified `session` JSON
      const raw = localStorage.getItem('session');
      if(raw){
        try{ const s = JSON.parse(raw); if(s && s.user) return s.user; }catch(e){}
      }
      // legacy fallback
      return localStorage.getItem('currentUser') || null;
    }catch(e){ return null; }
  }

  function setCurrentUser(u){
    if(window._auth && typeof window._auth.setCurrentUser === 'function'){ window._auth.setCurrentUser(u); return; }
    try{
      // write into session JSON as fallback
      const raw = localStorage.getItem('session');
      let s = { user: null, lastActivity: null };
      if(raw){ try{ s = JSON.parse(raw); }catch(e){} }
      s.user = u || null;
      s.lastActivity = u ? Date.now() : null;
      localStorage.setItem('session', JSON.stringify(s));
    }catch(e){
      // last-resort legacy key
      if(u) localStorage.setItem('currentUser', u); else localStorage.removeItem('currentUser');
    }
  }

  // --- backend detection & API helpers ---
  async function detectBackend(){
    try{
      const controller = new AbortController();
      const id = setTimeout(()=>controller.abort(), 1200);
      const resp = await fetch('/api/ping', { signal: controller.signal, credentials: 'include' });
      clearTimeout(id);
      if(resp && resp.ok) { window._backendAvailable = true; return true; }
    }catch(e){ }
    window._backendAvailable = false;
    return false;
  }

  async function apiRegister(username, password){
    try{
      const resp = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ username, password }), credentials: 'include' });
      // return structured response: { ok: true, user } or { error: 'code' }
      const j = await resp.json().catch(()=>({ error: 'invalid_json' }));
      // include HTTP status for better client handling
      return Object.assign({ status: resp.status, ok: !!j.ok }, j);
    }catch(e){ return { error: 'network' }; }
  }

  async function apiLogin(username, password){
    try{
      const resp = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ username, password }), credentials: 'include' });
      return await resp.json();
    }catch(e){ return { error: 'network' }; }
  }

  async function apiChangePassword(oldPassword, newPassword){
    try{
      const resp = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ oldPassword, newPassword }), credentials: 'include' });
      return await resp.json();
    }catch(e){ return { error: 'network' }; }
  }

  async function apiMe(){
    try{
      const resp = await fetch('/api/auth/me', { credentials: 'include' });
      return await resp.json();
    }catch(e){ return { error: 'network' }; }
  }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  const formsDiv = $('forms');
  const msg = $('message');

  function clearMessage(){ msg.textContent=''; msg.style.color='green'; }
  function showMessage(text, ok=true){ msg.textContent = text; msg.style.color = ok ? 'green' : 'red'; }

  function t(key){ return (window._i18n && typeof window._i18n.t === 'function') ? window._i18n.t(key) : key; }

  function showStatus(){
    const status = $('auth-status');
    const user = currentUser();
    if(user){
      status.innerHTML = `<strong>${escapeHtml(user)}</strong> — ${t('sign_in_success')}`;
    } else {
      status.textContent = t('not_signed_in');
    }
  }

  function renderCreateForm(){
    formsDiv.innerHTML = `
      <div style="border:1px solid #ddd;padding:12px;border-radius:10px;">
        <div style="margin-bottom:8px;"><label data-i18n="username_label">Username</label><br><input id="c-username" style="width:100%; padding:8px; border-radius:6px;"></div>
        <div style="margin-bottom:8px;"><label data-i18n="password_label">Password</label><br><input id="c-password" type="password" style="width:100%; padding:8px; border-radius:6px;"></div>
        <div style="margin-bottom:8px;"><label data-i18n="confirm_password_label">Confirm password</label><br><input id="c-confirm" type="password" style="width:100%; padding:8px; border-radius:6px;"></div>
        <button id="c-submit" class="nav-btn">${t('create_account')}</button>
      </div>
    `;
    const btn = $('c-submit');
      btn.addEventListener('click', async ()=>{
      clearMessage();
      const u = $('c-username').value.trim();
      const p = $('c-password').value;
      const cp = $('c-confirm').value;
      if(!u || !p || !cp){ showMessage(t('fill_fields'), false); return; }
      if(p.length < 6){ showMessage(t('pw_min_length'), false); return; }
      if(p !== cp){ showMessage(t('pw_mismatch'), false); return; }
      // if backend available, use it
      if(window._backendAvailable){
        const res = await apiRegister(u, p);
        if(res && res.ok){ setCurrentUser(res.user || u); showMessage(t('create_acc_success')); showStatus(); }
        else {
          // map server error codes to friendly messages
          const code = res && (res.error || res.status) ? (res.error || ('status_' + res.status)) : 'create_failed';
          const friendly = {
            user_exists: t('user_exists'),
            invalid_username: t('invalid_username') || 'Invalid username',
            weak_password: t('pw_min_length') || 'Weak password',
            missing_fields: t('fill_fields'),
            network: t('network_error') || 'Network error',
            invalid_json: 'Server returned invalid response',
          }[code] || code || 'create_failed';
          showMessage(friendly, false);
        }
        return;
      }
      // fallback: local storage
      const users = getUsers();
      if(users[u]){ showMessage(t('user_exists'), false); return; }
      const h = await hash(p);
      users[u] = {hash: h};
      saveUsers(users);
      setCurrentUser(u);
      showMessage(t('create_acc_success'));
      showStatus();
    });
    if (window._i18n) window._i18n.applyTranslations();
    // detect backend availability and populate session if possible
    detectBackend().then(async (ok)=>{
      if(ok){
        const me = await apiMe();
        if(me && me.ok && me.user){ setCurrentUser(me.user); }
        showStatus();
      }
    });
    // attach show/hide toggles for password fields
    addShowToggleToInput(document.getElementById('c-password'));
    addShowToggleToInput(document.getElementById('c-confirm'));
    // attach strength meter for create password
    attachPasswordStrength(document.getElementById('c-password'));
  }

  function renderSignInForm(){
    formsDiv.innerHTML = `
      <div style="border:1px solid #ddd;padding:12px;border-radius:10px;">
        <div style="margin-bottom:8px;"><label data-i18n="username_label">Username</label><br><input id="s-username" style="width:100%; padding:8px; border-radius:6px;"></div>
        <div style="margin-bottom:8px;"><label data-i18n="password_label">Password</label><br><input id="s-password" type="password" style="width:100%; padding:8px; border-radius:6px;"></div>
        <button id="s-submit" class="nav-btn">${t('sign_in')}</button>
      </div>
    `;
    const btn = $('s-submit');
    btn.addEventListener('click', async ()=>{
      clearMessage();
      const u = $('s-username').value.trim();
      const p = $('s-password').value;
      if(!u || !p){ showMessage(t('fill_fields'), false); return; }
      if(window._backendAvailable){
        const res = await apiLogin(u, p);
        if(res && res.ok){ setCurrentUser(u); showMessage(t('sign_in_success')); showStatus(); }
        else { showMessage(t(res && res.error ? res.error : 'login_failed'), false); }
        return;
      }
      const users = getUsers();
      if(!users[u]){ showMessage(t('no_such_user'), false); return; }
      const h = await hash(p);
      if(h !== users[u].hash){ showMessage(t('wrong_password'), false); return; }
      setCurrentUser(u);
      showMessage(t('sign_in_success'));
      showStatus();
    });
    if (window._i18n) window._i18n.applyTranslations();
    // attach show/hide toggle for sign-in password
    addShowToggleToInput(document.getElementById('s-password'));
  }

  function signOut(){ setCurrentUser(null); showMessage(t('sign_out_success')); showStatus(); }

  async function changePassword(){
    clearMessage();
    const user = currentUser();
    if(!user){ showMessage(t('not_signed_in'), false); return; }
    const oldP = $('old-password').value;
    const newP = $('new-password').value;
    const conf = $('confirm-password').value;
    if(!oldP || !newP || !conf){ showMessage(t('fill_fields'), false); return; }
    if(newP.length < 6){ showMessage(t('pw_min_length'), false); return; }
    if(newP !== conf){ showMessage(t('pw_mismatch'), false); return; }
    // disallow reusing the old password
    if(newP === oldP){ showMessage(t('pw_same_as_old'), false); return; }
    if(window._backendAvailable){
      const res = await apiChangePassword(oldP, newP);
      if(res && res.ok){ showMessage(t('change_pw_success')); }
      else { showMessage(t(res && res.error ? res.error : 'change_failed'), false); }
      return;
    }
    const users = getUsers();
    const hOld = await hash(oldP);
    if(!users[user] || users[user].hash !== hOld){ showMessage(t('wrong_current_password'), false); return; }
    users[user].hash = await hash(newP);
    saveUsers(users);
    showMessage(t('change_pw_success'));
  }

  // helper: attach a small show/hide toggle after a password input
  function addShowToggleToInput(input){
    if(!input || input.dataset.hasShowToggle) return;
    try{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'show-pw-toggle';
      btn.style.cssText = 'margin-left:8px;padding:6px;border-radius:6px;border:1px solid #ccc;background:#fff;cursor:pointer;';
      btn.setAttribute('aria-pressed','false');
      btn.title = t('show_password');
      btn.textContent = '👁';
      btn.addEventListener('click', ()=>{
        if(input.type === 'password'){
          input.type = 'text';
          btn.setAttribute('aria-pressed','true');
          btn.title = t('hide_password') || 'Hide';
          btn.textContent = '🙈';
        } else {
          input.type = 'password';
          btn.setAttribute('aria-pressed','false');
          btn.title = t('show_password') || 'Show';
          btn.textContent = '👁';
        }
      });
      // insert after input
      input.parentNode.insertBefore(btn, input.nextSibling);
      input.dataset.hasShowToggle = '1';
    }catch(e){}
  }

  // --- Password strength meter helpers ---
  function scorePassword(pw){
    if(!pw) return 0;
    let score = 0;
    // length
    if(pw.length >= 8) score += 2; else if(pw.length >= 6) score += 1;
    // variety
    if(/[a-z]/.test(pw)) score += 1;
    if(/[A-Z]/.test(pw)) score += 1;
    if(/[0-9]/.test(pw)) score += 1;
    if(/[^A-Za-z0-9]/.test(pw)) score += 1;
    // extra for long
    if(pw.length >= 12) score += 1;
    return Math.min(score, 7);
  }

  function strengthFromScore(score){
    // returns {label, pct, cls}
    if(score <= 1) return { label: 'Very weak', pct: 10, cls: 'weak' };
    if(score <= 3) return { label: 'Weak', pct: 35, cls: 'weak' };
    if(score <= 4) return { label: 'Medium', pct: 60, cls: 'medium' };
    if(score <= 5) return { label: 'Strong', pct: 80, cls: 'strong' };
    return { label: 'Very strong', pct: 100, cls: 'verystrong' };
  }

  function createStrengthUI(){
    const wrap = document.createElement('div');
    wrap.className = 'pw-strength-wrap';
    const bar = document.createElement('div'); bar.className = 'pw-strength';
    const inner = document.createElement('i'); bar.appendChild(inner);
    const label = document.createElement('div'); label.className = 'pw-strength-label'; label.textContent = '';
    wrap.appendChild(bar); wrap.appendChild(label);
    return { wrap, bar, inner, label };
  }

  function attachPasswordStrength(input){
    if(!input || input.dataset.hasStrength) return;
    try{
      const ui = createStrengthUI();
      input.parentNode.appendChild(ui.wrap);
      input.dataset.hasStrength = '1';
      const update = ()=>{
        const val = input.value || '';
        const sc = scorePassword(val);
        const st = strengthFromScore(sc);
        ui.inner.style.width = st.pct + '%';
        // color classes
        ui.inner.className = '';
        if(st.cls === 'weak') ui.inner.classList.add('pw-weak');
        if(st.cls === 'medium') ui.inner.classList.add('pw-medium');
        if(st.cls === 'strong') ui.inner.classList.add('pw-strong');
        if(st.cls === 'verystrong') ui.inner.classList.add('pw-verystrong');
        ui.label.textContent = val ? st.label : '';
        ui.label.className = 'pw-strength-label ' + (val ? st.cls : '');
      };
      input.addEventListener('input', update);
      // initial
      update();
    }catch(e){ }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    // apply saved dark mode setting to this page
    try {
      if (localStorage.getItem('darkMode') === 'on') document.body.classList.add('dark');
      else document.body.classList.remove('dark');
    } catch (e) {}

    // Wire static page forms (if present)
    const signinSubmit = document.getElementById('signin-submit');
    const signinGuest = document.getElementById('signin-guest');
    const signupSubmit = document.getElementById('signup-submit');
    const signupCancel = document.getElementById('signup-cancel');
    const btnSignout = document.getElementById('btn-signout');
    const btnChange = document.getElementById('btn-change');
    if(signinSubmit){
      signinSubmit.addEventListener('click', async (e)=>{
        e.preventDefault(); clearMessage();
        const u = document.getElementById('signin-username').value.trim();
        const p = document.getElementById('signin-password').value;
        if(!u || !p){ showMessage(t('fill_fields'), false); return; }
        if(window._backendAvailable){
          const res = await apiLogin(u, p);
          if(res && res.ok){ setCurrentUser(res.user || u); showMessage(t('sign_in_success')); showStatus(); }
          else { const err = res && (res.error || res.status) ? (res.error || ('status_' + res.status)) : 'login_failed'; showMessage(err, false); }
          return;
        }
        const users = getUsers();
        if(!users[u]){ showMessage(t('no_such_user'), false); return; }
        const h = await hash(p);
        if(h !== users[u].hash){ showMessage(t('wrong_password'), false); return; }
        setCurrentUser(u); showMessage(t('sign_in_success')); showStatus();
      });
    }
    if(signinGuest){ signinGuest.addEventListener('click', (e)=>{ e.preventDefault(); setCurrentUser('guest'); showMessage('Continuing as guest'); showStatus(); }); }
    if(signupSubmit){
      signupSubmit.addEventListener('click', async (e)=>{
        e.preventDefault(); clearMessage();
        const u = document.getElementById('signup-username').value.trim();
        const p = document.getElementById('signup-password').value;
        const cp = document.getElementById('signup-confirm').value;
        if(!u || !p || !cp){ showMessage(t('fill_fields'), false); return; }
        if(p.length < 6){ showMessage(t('pw_min_length'), false); return; }
        if(p !== cp){ showMessage(t('pw_mismatch'), false); return; }
        if(window._backendAvailable){
          const res = await apiRegister(u, p);
          if(res && res.ok){ setCurrentUser(res.user || u); showMessage(t('create_acc_success')); showStatus(); }
          else { const code = res && (res.error || res.status) ? (res.error || ('status_' + res.status)) : 'create_failed'; showMessage(code, false); }
          return;
        }
        const users = getUsers();
        if(users[u]){ showMessage(t('user_exists'), false); return; }
        users[u] = { hash: await hash(p) };
        saveUsers(users); setCurrentUser(u); showMessage(t('create_acc_success')); showStatus();
      });
    }
    // Google sign-in / sign-up handlers (opens backend OAuth endpoint if available)
    const signinGoogle = document.getElementById('signin-google');
    const signupGoogle = document.getElementById('signup-google');
    function openOAuthPopup(path){
      try{
        const w = window.open(path, 'google_oauth', 'width=600,height=700');
        if(!w) { showMessage('Popup blocked. Allow popups to sign in with Google.', false); }
      }catch(e){ showMessage('Unable to open Google sign-in', false); }
    }
    if(signinGoogle){ signinGoogle.addEventListener('click', ()=>{ openOAuthPopup('/api/auth/google?mode=signin'); }); }
    if(signupGoogle){ signupGoogle.addEventListener('click', ()=>{ openOAuthPopup('/api/auth/google?mode=signup'); }); }
    if(signupCancel){ signupCancel.addEventListener('click', (e)=>{ e.preventDefault(); document.getElementById('signup-username').value=''; document.getElementById('signup-password').value=''; document.getElementById('signup-confirm').value=''; clearMessage(); }); }
    if(btnSignout) btnSignout.addEventListener('click', ()=>{ signOut(); clearMessage(); });
    if(btnChange) btnChange.addEventListener('click', (e)=>{ e.preventDefault(); changePassword(); });
    // enforce session and react to session expiry
    if(window._auth && typeof window._auth.enforceSession === 'function'){
      const ok = window._auth.enforceSession();
      if(!ok){
        showMessage(t('auth_error'), false);
      }
    }
    showStatus();
    if (window._i18n) window._i18n.applyTranslations();
    window.addEventListener('languageChange', ()=>{ if (window._i18n) window._i18n.applyTranslations(); showStatus(); });
    // handle sessionExpired event
    window.addEventListener('sessionExpired', ()=>{
      showMessage(t('auth_error') + ': ' + t('not_signed_in'), false);
      showStatus();
    });
    // toggle reveal for change-password form
    const forgotToggle = $('forgot-toggle');
    const changeForm = document.getElementById('change-form');
    if (forgotToggle && changeForm) {
      forgotToggle.setAttribute('aria-expanded', 'false');
      forgotToggle.addEventListener('click', (e) => {
        e.preventDefault();
        const opened = changeForm.style.display !== 'none';
        changeForm.style.display = opened ? 'none' : 'block';
        forgotToggle.setAttribute('aria-expanded', String(!opened));
      });
    }
    // attach show toggles to change-password inputs (they exist in DOM)
    addShowToggleToInput(document.getElementById('old-password'));
    addShowToggleToInput(document.getElementById('new-password'));
    addShowToggleToInput(document.getElementById('confirm-password'));
  // attach password strength meters
  attachPasswordStrength(document.getElementById('new-password'));
  attachPasswordStrength(document.getElementById('confirm-password'));
    // attach toggles/strength meters to the static inputs and any legacy ones
    addShowToggleToInput(document.getElementById('signup-password'));
    addShowToggleToInput(document.getElementById('signup-confirm'));
    attachPasswordStrength(document.getElementById('signup-password'));
    addShowToggleToInput(document.getElementById('signin-password'));
    // keep legacy support (no-op if elements not present)
    addShowToggleToInput(document.getElementById('c-password'));
    addShowToggleToInput(document.getElementById('c-confirm'));
    attachPasswordStrength(document.getElementById('c-password'));
  });
})();
