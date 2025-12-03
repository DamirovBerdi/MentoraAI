// auth-ui.js — provides simple login/register modal and login state in header
document.addEventListener('DOMContentLoaded', ()=>{
  const loginBtn = document.getElementById('login-btn');
  const navUser = document.getElementById('nav-user');
  if(!loginBtn) return;

  // create modal
  const modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.style = 'position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:none;align-items:center;justify-content:center;z-index:9999;';
  const box = document.createElement('div');
  box.style = 'background:#fff;padding:18px;border-radius:8px;max-width:420px;width:100%;box-shadow:0 6px 24px rgba(0,0,0,0.2);';
  box.innerHTML = `
    <h3 id="auth-title">Login</h3>
    <div id="auth-forms">
      <div id="login-form">
        <input id="login-username" placeholder="Username" style="width:100%;padding:8px;margin:6px 0;" />
        <input id="login-password" type="password" placeholder="Password" style="width:100%;padding:8px;margin:6px 0;" />
        <button id="login-submit" style="padding:8px 12px;margin-top:6px;">Login</button>
        <div style="margin-top:8px;">No account? <a href="#" id="show-register">Register</a></div>
      </div>
      <div id="register-form" style="display:none;">
        <input id="reg-username" placeholder="Username" style="width:100%;padding:8px;margin:6px 0;" />
        <input id="reg-password" type="password" placeholder="Password" style="width:100%;padding:8px;margin:6px 0;" />
        <button id="reg-submit" style="padding:8px 12px;margin-top:6px;">Register</button>
        <div style="margin-top:8px;">Have an account? <a href="#" id="show-login">Login</a></div>
      </div>
    </div>
    <div id="auth-msg" style="color:red;margin-top:8px;display:none"></div>
    <div style="margin-top:12px;text-align:right;"><button id="auth-close">Close</button></div>
  `;
  modal.appendChild(box);
  document.body.appendChild(modal);

  // helpers
  function showModal(mode){
    modal.style.display = 'flex';
    document.getElementById('auth-msg').style.display = 'none';
    if(mode === 'login'){
      document.getElementById('auth-title').textContent = 'Login';
      document.getElementById('login-form').style.display = '';
      document.getElementById('register-form').style.display = 'none';
    }else{
      document.getElementById('auth-title').textContent = 'Register';
      document.getElementById('login-form').style.display = 'none';
      document.getElementById('register-form').style.display = '';
    }
  }
  function hideModal(){ modal.style.display = 'none'; }
  function showMsg(m){ const el = document.getElementById('auth-msg'); el.textContent = m; el.style.display = ''; }

  // wire links
  document.getElementById('show-register').addEventListener('click', (e)=>{ e.preventDefault(); showModal('register'); });
  document.getElementById('show-login').addEventListener('click', (e)=>{ e.preventDefault(); showModal('login'); });
  document.getElementById('auth-close').addEventListener('click', ()=>hideModal());

  async function apiPost(path, body){
    try{
      const res = await fetch(path, { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const data = await res.json().catch(()=>({error:'invalid_json'}));
      return { status: res.status, ok: res.ok, data };
    }catch(e){ return { status: 0, ok:false, data: { error: e.message } }; }
  }

  document.getElementById('login-submit').addEventListener('click', async ()=>{
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    if(!u || !p) return showMsg('Enter username and password');
    const r = await apiPost('/api/auth/login', { username: u, password: p });
    if(r.ok && r.data && r.data.ok){
      window._auth && window._auth.setCurrentUser(u);
      updateNav(u);
      hideModal();
    }else{
      showMsg(r.data && r.data.error ? r.data.error : 'Login failed');
    }
  });

  document.getElementById('reg-submit').addEventListener('click', async ()=>{
    const u = document.getElementById('reg-username').value.trim();
    const p = document.getElementById('reg-password').value;
    if(!u || !p) return showMsg('Enter username and password');
    const r = await apiPost('/api/auth/register', { username: u, password: p });
    if(r.ok && r.data && r.data.ok){
      window._auth && window._auth.setCurrentUser(u);
      updateNav(u);
      hideModal();
    }else{
      showMsg(r.data && r.data.error ? r.data.error : 'Register failed');
    }
  });

  async function updateNav(username){
    if(!username){
      navUser.textContent = '';
      loginBtn.textContent = 'Login';
      loginBtn.onclick = ()=>showModal('login');
      return;
    }
    navUser.textContent = username;
    loginBtn.textContent = 'Logout';
    loginBtn.onclick = async (e)=>{
      e.preventDefault();
      try{ await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); }catch(e){}
      window._auth && window._auth.clearCurrentUser();
      updateNav(null);
    };
  }

  // initialize state: check /api/auth/me
  (async ()=>{
    try{
      const res = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' });
      if(res.ok){ const d = await res.json(); if(d && d.ok && d.user){ window._auth && window._auth.setCurrentUser(d.user); updateNav(d.user); return; } }
    }catch(e){}
    // no session
    updateNav(null);
  })();

  // wire main login button
  loginBtn.addEventListener('click', (e)=>{ e.preventDefault(); showModal('login'); });
});
