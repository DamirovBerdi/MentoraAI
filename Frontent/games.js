(function(){
  const topicEl = document.getElementById('game-topic');
  const dateEl = document.getElementById('game-date');
  const typeEl = document.getElementById('game-type');
  const startBtn = document.getElementById('start-game');
  const status = document.getElementById('start-status');
  const list = document.getElementById('games-list');
  const filterTopic = document.getElementById('filter-topic');
  const btnRefresh = document.getElementById('btn-refresh');

  function fmtDate(ts){ try{ return new Date(ts).toLocaleString(); }catch(e){ return String(ts); } }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  async function loadGames(){
    list.innerHTML = '<div class="loading"><div class="spinner"></div><div>Loading...</div></div>';
    try{
      const res = await fetch('/api/games');
      const j = await res.json().catch(()=>({}));
      if(!res.ok){ list.innerHTML = '<div class="card">Error loading games</div>'; return; }
      let sessions = j.sessions || [];
      const filter = (filterTopic && filterTopic.value||'').trim().toLowerCase();
      if(filter){ sessions = sessions.filter(s => (s.topic||'').toLowerCase().includes(filter) ); }
      if(sessions.length === 0){ list.innerHTML = '<div class="card">No saved games yet</div>'; return; }
      list.innerHTML = '';
      sessions.sort((a,b)=> (b.ts||0)-(a.ts||0));
      sessions.forEach(s=>{
        const el = document.createElement('div'); el.className = 'game-item';
        const left = document.createElement('div');
        left.innerHTML = `<div style="font-weight:700">${escapeHtml(s.topic||s.type||'Game')}</div><div class="meta">${escapeHtml(s.type)} • ${fmtDate(s.ts)}</div>`;
        const right = document.createElement('div'); right.style.display='flex'; right.style.gap='8px';
        const info = document.createElement('div'); info.style.marginRight='8px'; info.style.color='#5b6b73'; info.style.fontSize='13px'; info.textContent = `${(s.questions||[]).length} q • ${s.score||0} pts`;
        const play = document.createElement('button'); play.className='small-btn'; play.textContent='Play';
        const view = document.createElement('button'); view.className='small-btn'; view.textContent='View';
        const del = document.createElement('button'); del.className='small-btn'; del.textContent='Delete'; del.style.background='#fff4f4';
        play.addEventListener('click', ()=>{ startPlayback(s); });
        view.addEventListener('click', ()=>{ viewSession(s); });
        del.addEventListener('click', ()=>{ deleteSession(s); });
        right.appendChild(info); right.appendChild(play); right.appendChild(view); right.appendChild(del);
        el.appendChild(left); el.appendChild(right);
        list.appendChild(el);
      });
    }catch(e){ list.innerHTML = '<div class="card">Network error</div>'; }
  }

  async function deleteSession(s){
    if(!confirm('Delete this session?')) return;
    try{
      const res = await fetch('/api/games/' + encodeURIComponent(s.id), { method: 'DELETE' });
      if(!res.ok){ alert('Delete failed'); return; }
      loadGames();
    }catch(e){ alert('Network error'); }
  }

  async function startNewGame(){
    const topic = (topicEl.value||'').trim();
    if(!topic){ status.textContent = 'Enter a topic'; return; }
    status.textContent = 'Generating questions...';
    try{
      const res = await fetch('/api/search', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ query: topic }) });
      const j = await res.json().catch(()=>({}));
      if(!res.ok){ status.textContent = 'AI error: ' + (j && j.error ? j.error : res.status); return; }
      const kps = j.keyPoints && j.keyPoints.length ? j.keyPoints : (j.mainThings ? String(j.mainThings).split(/\n/).filter(Boolean) : []);
      const questions = [];
      for(let i=0;i<10;i++){
        const kp = kps[i] || `What is ${topic} (part ${i+1})?`;
        questions.push({ q: `Explain: ${kp}`, correct: kp });
      }
      const payload = { type: typeEl.value || 'quick', topic, date: dateEl.value || null, questions, answers: [], score: 0, analysis: null };
      const save = await fetch('/api/games', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if(!save.ok){ const sj = await save.json().catch(()=>({})); status.textContent = 'Save failed: ' + (sj && sj.error ? sj.error : save.status); return; }
      status.textContent = 'Game created'; topicEl.value=''; dateEl.value='';
      loadGames();
    }catch(e){ status.textContent = 'Network error generating game'; }
  }

  function startPlayback(session){
    if(!session || !(session.questions||[]).length){ alert('No questions in session'); return; }
    openPlayModal(session);
  }

  // Play modal implementation
  let playState = null;
  function openPlayModal(session){
    const modal = document.getElementById('play-modal');
    const header = document.getElementById('play-header');
    const qEl = document.getElementById('play-question');
    const aEl = document.getElementById('play-answer');
    const prog = document.getElementById('play-progress');
    const footer = document.getElementById('play-footer');
    playState = { session: JSON.parse(JSON.stringify(session)), idx: 0 };
    // ensure answers array exists
    playState.session.answers = playState.session.answers || [];
    modal.style.display = 'block';
    header.textContent = `Playing: ${session.topic || session.type}`;
    footer.textContent = 'Write short answers. Use Next to move forward.';
    renderPlay();

    document.getElementById('play-close').onclick = ()=>{ modal.style.display='none'; playState=null; };
    document.getElementById('play-prev').onclick = ()=>{ if(!playState) return; saveCurrentAnswer(); if(playState.idx>0){ playState.idx--; renderPlay(); } };
    document.getElementById('play-next').onclick = ()=>{ if(!playState) return; saveCurrentAnswer(); if(playState.idx < playState.session.questions.length-1){ playState.idx++; renderPlay(); } else { alert('End of questions. Click Finish to submit.'); } };
    document.getElementById('play-finish').onclick = ()=>{ if(!playState) return; saveCurrentAnswer(); finishPlay(); };

    function renderPlay(){
      const cur = playState.session.questions[playState.idx];
      qEl.textContent = `${playState.idx+1}. ${cur.q}`;
      const existing = playState.session.answers[playState.idx];
      aEl.value = existing ? (existing.given||'') : '';
      prog.textContent = `${playState.idx+1} / ${playState.session.questions.length}`;
    }

    function saveCurrentAnswer(){
      const val = (aEl.value||'').trim();
      const q = playState.session.questions[playState.idx];
      const ok = simpleCheckAnswer(val, q.correct || '');
      playState.session.answers[playState.idx] = { q: q.q, given: val, ok };
    }

    function simpleCheckAnswer(given, correct){
      if(!given) return false;
      try{ const g = given.toLowerCase().replace(/[^a-z0-9 ]/g,''); const c = String(correct||'').toLowerCase().replace(/[^a-z0-9 ]/g,''); return g.includes(c.split(' ')[0]) || c.split(' ').some(w=> g.includes(w)); }catch(e){ return false; }
    }

    async function finishPlay(){
      // compute score
      const answers = playState.session.answers || [];
      let score = 0; answers.forEach(a=>{ if(a && a.ok) score += 1; });
      playState.session.score = score;
      playState.session.ts = Date.now();
      // send PUT to update session
        try{
          const res = await fetch('/api/games/' + encodeURIComponent(playState.session.id), { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ answers: playState.session.answers, score: playState.session.score, analysis: playState.session.analysis || null }) });
          if(!res.ok){ alert('Failed to save session'); return; }
          const j = await res.json().catch(()=>({}));
          // After saving the session, request AI analysis for incorrect answers
          try{
            const anaRes = await fetch('/api/games/' + encodeURIComponent(playState.session.id) + '/analyze', { method: 'POST' });
            if(anaRes && anaRes.ok){ const ajson = await anaRes.json().catch(()=>({})); if(ajson && ajson.analysis){ alert('Analysis:\n' + ajson.analysis); } }
          }catch(e){ console.warn('Analysis request failed', e); }
          document.getElementById('play-modal').style.display='none';
          playState = null;
          loadGames();
          alert('Session saved. Score: ' + score);
        }catch(e){ alert('Network error saving session'); }
    }
  }

  function viewSession(session){
    const lines = [];
    lines.push(`Session: ${session.topic || session.type} — ${fmtDate(session.ts)}`);
    lines.push(`Score: ${session.score || 0}`);
    lines.push('Questions:');
    (session.questions||[]).forEach((q,i)=>{ lines.push(`${i+1}. ${q.q}`); });
    if(session.analysis){ lines.push('\nAnalysis:\n' + session.analysis); }
    alert(lines.join('\n'));
  }

  startBtn.addEventListener('click', startNewGame);
  btnRefresh && btnRefresh.addEventListener('click', ()=> loadGames());
  document.addEventListener('DOMContentLoaded', ()=>{
    const today = new Date().toISOString().slice(0,10);
    dateEl.value = today;
    loadGames();
  });
})();
