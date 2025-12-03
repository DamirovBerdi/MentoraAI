// Utility to scroll to a section if it exists
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// Simple flashcard rendering used only on flashcard page (guarded)
(function initFlashcards() {
  const cards = [
    { front: "What is HTML?", back: "HTML — veb sahifa tuzilmasi uchun til." },
    { front: "CSS nima?", back: "CSS — dizayn va bezatish uchun ishlatiladi." },
    { front: "JavaScript nima?", back: "JavaScript — saytga interaktivlik qo‘shadi." },
  ];

  const container = document.getElementById('flashcard-container');
  if (!container) return; // do nothing if we're not on flashcard page

  cards.forEach(data => {
    const card = document.createElement('div');
    card.className = 'flashcard';
    card.innerHTML = '<div class="front">' + escapeHtml(data.front) + '</div>' +
                     '<div class="back">' + escapeHtml(data.back) + '</div>';
    card.addEventListener('click', () => card.classList.toggle('flipped'));
    container.appendChild(card);
  });

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();

// Apply dark mode class on pages according to stored setting
document.addEventListener('DOMContentLoaded', () => {
  try {
    if (localStorage.getItem('darkMode') === 'on') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  } catch (e) {
    // ignore (e.g., localStorage not available)
  }
  // send simple heartbeat to backend if logged in
  try{
    async function sendHeartbeat(){
      try{
        // If page is opened via file:// then don't attempt to call backend (will cause CORS/file protocol errors)
        if (window.location && window.location.protocol === 'file:') return;
        // heuristic status: if URL contains game -> playing, else browsing
        const status = (window.location.pathname && window.location.pathname.indexOf('game')>=0) ? 'playing' : 'browsing';
        // allow an explicit API base to be set (e.g. window._apiBase = 'http://localhost:3000')
        const base = (window._apiBase && String(window._apiBase).replace(/\/$/, '')) || '';
        const url = base + '/api/activity/heartbeat';
        // Only send heartbeat when user appears authenticated locally (prevent unauthorized 401 spamming)
        const hasTokenInCookie = document.cookie && document.cookie.indexOf('mentora_token=') >= 0;
        // Fallback: session JSON or legacy currentUser
        let appearsLoggedIn = false;
        try{
          const sessionRaw = localStorage.getItem('session');
          if(sessionRaw){ const s = JSON.parse(sessionRaw); if(s && s.user) appearsLoggedIn = true; }
        }catch(e){}
        if(!appearsLoggedIn && localStorage.getItem('currentUser')) appearsLoggedIn = true;
        if(!appearsLoggedIn && !hasTokenInCookie) return; // skip heartbeat if not logged-in

        const resp = await fetch(url, { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status }) });
        if(resp && resp.status === 401){
          // stop scheduling further heartbeats if server rejects auth — avoid spamming the console
          try{ if(window._heartbeatIntervalId){ clearInterval(window._heartbeatIntervalId); window._heartbeatIntervalId = null; } }catch(e){}
        }
      }catch(e){ /* ignore */ }
    }
    sendHeartbeat();
    window._heartbeatIntervalId = setInterval(sendHeartbeat, 15000);
  }catch(e){}

  // Quick 'Go' button behavior: navigate to settings.html (use data-i18n on button for label)
  // (quick-go removed) no-op
});

// Sync dark mode across tabs/windows: respond to storage changes
try{
  window.addEventListener('storage', (ev) => {
    try{
      if (!ev) return;
      if (ev.key === 'darkMode'){
        const v = ev.newValue;
        if (v === 'on') document.body.classList.add('dark');
        else document.body.classList.remove('dark');
      }
    }catch(e){}
  });
}catch(e){}