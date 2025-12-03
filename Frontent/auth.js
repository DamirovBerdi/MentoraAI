// auth.js — small client-side session manager (demo only)
// auth.js — small client-side session manager (demo only)
(function(){
  const KEY_SESSION = 'session';
  const INACTIVITY_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

  // session object shape: { user: string|null, lastActivity: number }
  function readSession(){
    try{
      const raw = localStorage.getItem(KEY_SESSION);
      if(!raw) return { user: null, lastActivity: null };
      return JSON.parse(raw);
    }catch(e){
      return { user: null, lastActivity: null };
    }
  }

  function writeSession(session){
    try{ localStorage.setItem(KEY_SESSION, JSON.stringify(session)); }catch(e){}
  }

  // Migration: if old keys exist, move them into session
  function migrateOldKeys(){
    try{
      const oldUser = localStorage.getItem('currentUser');
      const oldLast = localStorage.getItem('currentUserLastActivity');
      if(oldUser || oldLast){
        const s = readSession();
        if(oldUser) s.user = oldUser;
        if(oldLast) s.lastActivity = Number(oldLast) || Date.now();
        writeSession(s);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentUserLastActivity');
      }
    }catch(e){}
  }

  function getCurrentUser(){ try{ return readSession().user || null; }catch(e){return null;} }
  function setCurrentUser(u){ try{ const s = readSession(); s.user = u || null; s.lastActivity = u ? Date.now() : null; writeSession(s); }catch(e){} }
  function clearCurrentUser(){ try{ writeSession({ user: null, lastActivity: null }); }catch(e){} }

  function updateLastActivity(){ try{ const s = readSession(); if(s.user){ s.lastActivity = Date.now(); writeSession(s); } }catch(e){} }
  function getLastActivity(){ try{ return readSession().lastActivity || null; }catch(e){return null;} }

  function isSessionExpired(){
    const session = readSession();
    if(!session.user) return true;
    const last = session.lastActivity;
    if(!last) return true;
    return (Date.now() - last) > INACTIVITY_MS;
  }

  function enforceSession(){
    // migrate old keys once on first run
    migrateOldKeys();
    if(getCurrentUser() && isSessionExpired()){
      clearCurrentUser();
      try{ window.dispatchEvent(new Event('sessionExpired')); }catch(e){}
      return false;
    }
    if(getCurrentUser()) updateLastActivity();
    return true;
  }

  // activity listeners to refresh lastActivity (throttled)
  let lastUpdate = 0;
  function activityHandler(){
    const now = Date.now();
    if(now - lastUpdate < 60*1000) return; // at most once per minute
    lastUpdate = now;
    if(getCurrentUser()) updateLastActivity();
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    enforceSession();
    document.addEventListener('click', activityHandler);
    document.addEventListener('keydown', activityHandler);
    document.addEventListener('mousemove', activityHandler);
    // listen to storage changes (other tabs)
    window.addEventListener('storage', (e)=>{
      if(e.key === KEY_SESSION){ enforceSession(); }
    });
  });

  window._auth = {
    getCurrentUser,
    setCurrentUser,
    clearCurrentUser,
    updateLastActivity,
    isSessionExpired,
    enforceSession,
  };
})();
