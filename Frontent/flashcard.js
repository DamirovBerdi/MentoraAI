(async function(){
  const listEl = document.getElementById('flashcards-list');
  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  async function load(){
    listEl.innerHTML = '<div class="loading"><div class="spinner"></div><div>Loading...</div></div>';
    try{
      const res = await fetch('/api/flashcards');
      const j = await res.json().catch(()=>({ error:'invalid_json' }));
      if(!res.ok){ listEl.innerHTML = '<div class="card">Error loading flashcards</div>'; return; }
      const cards = j.cards || [];
      if(cards.length === 0){ listEl.innerHTML = '<div class="card">No flashcards yet</div>'; return; }
      listEl.innerHTML = '';
      cards.forEach(c=>{
        const card = document.createElement('div'); card.className='card';
        const head = document.createElement('div'); head.innerHTML = `<strong>${escapeHtml(c.front)}</strong>`;
        const back = document.createElement('div'); back.style.marginTop='8px'; back.style.whiteSpace='pre-wrap'; back.textContent = c.back || '';
        const actions = document.createElement('div'); actions.className='actions';
        const del = document.createElement('button'); del.className='action-btn'; del.textContent='Delete';
        const edit = document.createElement('button'); edit.className='action-btn'; edit.textContent='Edit';
        actions.appendChild(edit); actions.appendChild(del);
        del.addEventListener('click', async ()=>{
          if(!confirm('Delete this flashcard?')) return;
          const resp = await fetch('/api/flashcards/' + encodeURIComponent(c.id), { method: 'DELETE' });
          const jj = await resp.json().catch(()=>({}));
          if(resp.ok) load(); else alert('Delete failed');
        });
        edit.addEventListener('click', ()=>{ prompt('Edit not implemented yet'); });
        card.appendChild(head); card.appendChild(back); card.appendChild(actions);
        listEl.appendChild(card);
      });
    }catch(e){ listEl.innerHTML = '<div class="card">Network error</div>'; }
  }

  document.addEventListener('DOMContentLoaded', load);
  // If script runs after DOMContentLoaded
  if(document.readyState === 'complete' || document.readyState === 'interactive') load();
})();
