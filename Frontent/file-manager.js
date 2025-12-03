async function listFiles(){
  const tableBody = document.querySelector('#filesTable tbody');
  if(!tableBody) return; // nothing to do on pages without file table
  try{
    const res = await fetch('/api/files');
    const data = await res.json();
    tableBody.innerHTML = '';
    if(!data.ok) return;
    for(const f of data.files){
      const tr = document.createElement('tr');
      const nameTd = document.createElement('td');
      nameTd.textContent = f.name;
      const sizeTd = document.createElement('td');
      sizeTd.textContent = f.size;
      const actionsTd = document.createElement('td');
      const dl = document.createElement('a');
      dl.href = '/api/files/download/' + encodeURIComponent(f.name);
      dl.textContent = 'Скачать';
      dl.style.marginRight = '8px';
      const del = document.createElement('button');
      del.textContent = 'Удалить';
      del.onclick = async () => {
        if(!confirm('Удалить ' + f.name + '?')) return;
        const r = await fetch('/api/files/' + encodeURIComponent(f.name), { method: 'DELETE' });
        const j = await r.json();
        if(j.ok) listFiles(); else alert('Ошибка: ' + (j.error||''));
      };
      actionsTd.appendChild(dl);
      actionsTd.appendChild(del);
      tr.appendChild(nameTd);
      tr.appendChild(sizeTd);
      tr.appendChild(actionsTd);
      tableBody.appendChild(tr);
    }
  }catch(e){ console.error('listFiles error', e && e.message); }
}

// Only wire upload handler if the upload form exists on the page
window.addEventListener('DOMContentLoaded', ()=>{
  const uploadForm = document.getElementById('uploadForm');
  const fileInput = document.getElementById('fileInput');
  if(uploadForm && fileInput){
    uploadForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const f = fileInput.files[0];
      if(!f) return alert('Выберите файл');
      const form = new FormData();
      form.append('file', f);
      try{
        const res = await fetch('/api/files/upload', { method: 'POST', body: form });
        const data = await res.json();
        if(data.ok){
          fileInput.value = '';
          listFiles();
        } else {
          alert('Ошибка: ' + (data.error||''));
        }
      }catch(e){ alert('Ошибка загрузки'); }
    });
  }

  // Populate list if table exists
  listFiles();
});
