document.addEventListener('DOMContentLoaded', ()=>{
  const listEl = document.getElementById('history-items');
  const notLogged = document.getElementById('not-logged');
  const historyContainer = document.getElementById('history-list');
  const clearBtn = document.getElementById('clear-history');

  async function load(){
    try{
      const res = await fetch('/api/activity/search', { method: 'GET', credentials: 'include' });
      if(res.status === 401){ notLogged.style.display = ''; historyContainer.style.display = 'none'; return; }
      const data = await res.json();
      if(!data.ok){ notLogged.style.display = ''; historyContainer.style.display = 'none'; return; }
      notLogged.style.display = 'none'; historyContainer.style.display = '';
      listEl.innerHTML = '';
      (data.history || []).forEach(item => {
        const li = document.createElement('li');
        const ts = new Date(item.ts || 0).toLocaleString();
        li.textContent = `${item.query} \u2014 ${ts}`;
        listEl.appendChild(li);
      });
    }catch(e){ notLogged.style.display = ''; historyContainer.style.display = 'none'; }
  }

  clearBtn.addEventListener('click', async ()=>{
    if(!confirm('Clear your search history?')) return;
    try{
      const res = await fetch('/api/activity/search', { method: 'DELETE', credentials: 'include' });
      if(res.ok) load();
    }catch(e){}
  });

  load();
});
