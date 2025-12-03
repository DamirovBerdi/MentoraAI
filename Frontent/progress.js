// Only run progress loader if the expected DOM elements exist on the page
(async function(){
  const totalEl = document.getElementById('total-games');
  const avgEl = document.getElementById('avg-score');
  const flashEl = document.getElementById('flashcards-count');
  const recent = document.getElementById('recent-games');
  const review = document.getElementById('review-cards');

  if(!totalEl && !avgEl && !flashEl && !recent && !review) return; // nothing to do here

  function fmtDate(ts){ try{ return new Date(ts).toLocaleString(); }catch(e){ return String(ts); } }

  try{
    const [gRes, fRes] = await Promise.all([fetch('/api/games'), fetch('/api/flashcards')]);
    const gJson = await gRes.json().catch(()=>({}));
    const fJson = await fRes.json().catch(()=>({}));
    const sessions = gJson.sessions || [];
    const cards = fJson.cards || [];

    if(totalEl) totalEl.textContent = sessions.length;
    const avg = sessions.length ? (sessions.reduce((s,x)=>s+(x.score||0),0)/sessions.length).toFixed(2) : '0';
    if(avgEl) avgEl.textContent = avg;
    if(flashEl) flashEl.textContent = cards.length;

    // recent games list
    if(recent){
      recent.innerHTML = '';
      sessions.sort((a,b)=> (b.ts||0)-(a.ts||0)).slice(0,8).forEach(s=>{
        const el = document.createElement('div'); el.className='game-item';
        el.innerHTML = `<div style="text-align:left"><div style="font-weight:700">${escapeHtml(s.topic||s.type)}</div><div class="meta">${fmtDate(s.ts)} • ${s.score||0} pts • ${ (s.questions||[]).length } q</div></div><div style="align-self:center">View</div>`;
        el.addEventListener('click', ()=>{ alert(`Session ${s.id}\nTopic: ${s.topic}\nScore: ${s.score||0}\nQuestions: ${(s.questions||[]).length}`); });
        recent.appendChild(el);
      });
    }

    // review cards (show first 8)
    if(review){
      review.innerHTML = '';
      cards.slice(0,8).forEach(c=>{
        const card = document.createElement('div'); card.className='card'; card.style.minWidth='180px'; card.style.padding='10px';
        const head = document.createElement('div'); head.style.fontWeight = '700'; head.textContent = c.front || '';
        const backDiv = document.createElement('div'); backDiv.style.marginTop='6px'; backDiv.style.color='#556'; backDiv.className='meta'; backDiv.textContent = c.back || '';
        const actions = document.createElement('div'); actions.style.marginTop = '8px';
        const delBtn = document.createElement('button'); delBtn.className = 'small-btn'; delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', async ()=>{
          if(!confirm('Удалить эту флэшкарту?')) return;
          try{
            const resp = await fetch('/api/flashcards/' + encodeURIComponent(c.id), { method: 'DELETE' });
            if(resp.ok){ card.remove(); } else { alert('Delete failed'); }
          }catch(e){ alert('Delete failed'); }
        });
        actions.appendChild(delBtn);
        card.appendChild(head); card.appendChild(backDiv); card.appendChild(actions);
        review.appendChild(card);
      });
    }

  }catch(e){ console.error('Progress load error',e); }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
})();
