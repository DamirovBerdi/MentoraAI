// search.js — call AI search and save history
document.addEventListener('DOMContentLoaded', ()=>{
  const box = document.querySelector('.search-box');
  const results = document.getElementById('search-results');
  if(!box) return;

  function renderBlocks(blocks){
    if(!results) return;
    results.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'ai-results';
    // Block 1: show the main answer or key points (concise main answer)
    const mainAnswer = blocks.answer || blocks.mainThings || blocks.block1_main_ideas || blocks.block1 || '';
    const kpFrom = (Array.isArray(blocks.keyPoints) && blocks.keyPoints.length) ? blocks.keyPoints.join('\n') : '';
    const b1Content = mainAnswer || kpFrom || '';
    const b1 = document.createElement('div'); b1.className='ai-block'; b1.innerHTML = `<h3>Блок 1: Основной ответ</h3><pre>${escapeHtml(b1Content)}</pre>`;

    // Block 2: additional info (hidden by default, show on demand or automatically when long/contains formulas)
    const block2Text = blocks.block2_formulas || blocks.block2 || blocks.info || '';
    const b2 = document.createElement('div'); b2.className='ai-block';
    b2.innerHTML = `<h3>Блок 2: Подробности</h3><pre>${escapeHtml(block2Text)}</pre>`;
    b2.style.display = 'none';
    const toggle2 = document.createElement('button'); toggle2.className = 'small-btn'; toggle2.textContent = 'Показать подробности';
    toggle2.style.marginTop = '8px';
    toggle2.addEventListener('click', ()=>{
      if(b2.style.display === 'none'){ b2.style.display = ''; toggle2.textContent = 'Скрыть подробности'; }
      else { b2.style.display = 'none'; toggle2.textContent = 'Показать подробности'; }
    });
    // Auto-open if content seems substantial or contains formula keywords
    try{
      const autoOpen = (String(block2Text||'').trim().length > 120) || /formula|формул|уровень|equation|=/.test(String(block2Text||''));
      if(autoOpen){ b2.style.display = ''; toggle2.textContent = 'Скрыть подробности'; }
    }catch(e){}
    const b3 = document.createElement('div'); b3.className='ai-block'; b3.innerHTML = `<h3>Blok 3: Examples</h3><pre>${escapeHtml(blocks.block3_examples || blocks.block3 || '')}</pre>`;
    const b4 = document.createElement('div'); b4.className='ai-block'; b4.innerHTML = `<h3>Blok 4: Diagramma/Infografika</h3><pre>${escapeHtml(blocks.block4_diagram || blocks.block4 || '')}</pre>`;
    wrap.appendChild(b1);
    // attach toggle for block 2 before showing the block
    wrap.appendChild(toggle2);
    wrap.appendChild(b2);
    wrap.appendChild(b3); wrap.appendChild(b4);
    results.appendChild(wrap);
    // If backend returned generated flashcards, render them as concise-front + detailed-back
    if(Array.isArray(blocks.flashcards) && blocks.flashcards.length){
      const fcWrap = document.createElement('div');
      fcWrap.className = 'ai-flashcards';
      fcWrap.innerHTML = `<h3>Flashcards (generated)</h3>`;
      const table = document.createElement('div');
      table.style.display = 'grid';
      table.style.gridTemplateColumns = '1fr 2fr';
      table.style.gap = '12px';
      table.style.marginTop = '12px';
      blocks.flashcards.forEach((c, idx)=>{
        const front = document.createElement('div');
        front.className = 'fc-front';
        front.style.padding = '12px'; front.style.border = '1px solid #ddd'; front.style.borderRadius='6px'; front.style.background='#fff';
        front.innerHTML = `<strong>${escapeHtml(c.front || '')}</strong>`;

        const backWrap = document.createElement('div');
        backWrap.className = 'fc-back';
        backWrap.style.padding = '12px'; backWrap.style.border = '1px solid #eee'; backWrap.style.borderRadius='6px'; backWrap.style.background='#fafafa';
        const backContent = document.createElement('div'); backContent.style.whiteSpace='pre-wrap'; backContent.textContent = c.back || '';
        const actions = document.createElement('div'); actions.style.marginTop='8px';
        const saveBtn = document.createElement('button'); saveBtn.textContent = 'Save to my flashcards'; saveBtn.style.marginRight='8px';
        const copyBtn = document.createElement('button'); copyBtn.textContent = 'Copy front';
        actions.appendChild(saveBtn); actions.appendChild(copyBtn);
        backWrap.appendChild(backContent); backWrap.appendChild(actions);

        saveBtn.addEventListener('click', async ()=>{
          try{
            const resp = await fetch('/api/flashcards', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ front: c.front || '', back: c.back || '' }) });
            const jj = await resp.json().catch(()=>({}));
            if(resp.ok && jj.ok && jj.card){
              saveBtn.textContent = 'Saved'; saveBtn.disabled = true;
              // store card id for possible deletion
              saveBtn.dataset.cardId = jj.card.id;
              // create a delete button next to save
              let delBtn = backWrap.querySelector('.fc-delete-btn');
              if(!delBtn){
                delBtn = document.createElement('button'); delBtn.className = 'fc-delete-btn'; delBtn.textContent = 'Delete from my flashcards'; delBtn.style.marginLeft = '8px';
                backWrap.appendChild(delBtn);
                delBtn.addEventListener('click', async ()=>{
                  const id = saveBtn.dataset.cardId;
                  if(!id) return alert('No card id');
                  if(!confirm('Удалить эту карточку из ваших флэшкарт?')) return;
                  try{
                    const r = await fetch('/api/flashcards/' + encodeURIComponent(id), { method: 'DELETE' });
                    if(r.ok){
                      // restore save button
                      saveBtn.textContent = 'Save to my flashcards'; saveBtn.disabled = false; delete saveBtn.dataset.cardId;
                      delBtn.remove();
                    } else { alert('Delete failed'); }
                  }catch(e){ alert('Delete failed'); }
                });
              }
            }
            else alert('Save failed');
          }catch(e){ alert('Save failed'); }
        });
        copyBtn.addEventListener('click', ()=>{ navigator.clipboard && navigator.clipboard.writeText((c.front||'').toString()); copyBtn.textContent='Copied'; setTimeout(()=>copyBtn.textContent='Copy front',1200); });

        table.appendChild(front); table.appendChild(backWrap);
      });
      fcWrap.appendChild(table);
      results.appendChild(fcWrap);
    }
  }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  box.addEventListener('keydown', async (e)=>{
    if(e.key !== 'Enter') return;
    const q = box.value && box.value.trim();
    if(!q) return;
    // call AI search endpoint
    try{
      const res = await fetch('/api/search', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ query: q }) });
      if(res.ok){
        const data = await res.json();
        if(data && data.blocks){ renderBlocks(data.blocks); }
      }else if(res.status === 401){
        // not authenticated: show a small message
        if(results) results.innerHTML = '<p>Please login to use AI search (use API /auth endpoints).</p>';
      }
    }catch(e){ if(results) results.innerHTML = '<p>AI search failed.</p>'; }
    // also save to activity history (best-effort) only if user appears logged in
    try{
      const hasTokenInCookie = document.cookie && document.cookie.indexOf('mentora_token=') >= 0;
      let appearsLoggedIn = false;
      try{ const sessionRaw = localStorage.getItem('session'); if(sessionRaw){ const s = JSON.parse(sessionRaw); if(s && s.user) appearsLoggedIn = true; } }catch(e){}
      if(!appearsLoggedIn && localStorage.getItem('currentUser')) appearsLoggedIn = true;
      if(hasTokenInCookie || appearsLoggedIn){
        await fetch('/api/activity/search', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ query: q }) });
      }
    }catch(e){}
    box.value = '';
  });
});
