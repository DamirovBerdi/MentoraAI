// Settings controls: guard element access so scripts don't throw on pages without the controls
window.addEventListener('DOMContentLoaded', () => {
  const darkModeCheckbox = document.getElementById('darkMode');
  const languageSelect = document.getElementById('language');
  const notificationsCheckbox = document.getElementById('notifications');

  // Load settings safely
  try{
    if(localStorage.getItem('darkMode') === 'on'){
      document.body.classList.add('dark');
      if(darkModeCheckbox) darkModeCheckbox.checked = true;
    }

    if(localStorage.getItem('language')){
      if(languageSelect) languageSelect.value = localStorage.getItem('language');
    }

    if(localStorage.getItem('notifications') === 'on'){
      if(notificationsCheckbox) notificationsCheckbox.checked = true;
    }
  }catch(e){ /* ignore storage errors */ }

  // Dark Mode toggle (only if element exists)
  if(darkModeCheckbox){
    darkModeCheckbox.addEventListener('change', () => {
      if(darkModeCheckbox.checked){
        document.body.classList.add('dark');
        try{ localStorage.setItem('darkMode', 'on'); }catch(e){}
      } else {
        document.body.classList.remove('dark');
        try{ localStorage.setItem('darkMode', 'off'); }catch(e){}
      }
    });
  }

  // Language select (only if exists)
  if(languageSelect){
    languageSelect.addEventListener('change', () => {
      try{ localStorage.setItem('language', languageSelect.value); }catch(e){}
      if (window._i18n && typeof window._i18n.setLang === 'function') {
        window._i18n.setLang(languageSelect.value);
      }
    });
  }

  // Notifications toggle
  if(notificationsCheckbox){
    notificationsCheckbox.addEventListener('change', () => {
      try{
        if(notificationsCheckbox.checked){
          localStorage.setItem('notifications', 'on');
        } else {
          localStorage.setItem('notifications', 'off');
        }
      }catch(e){}
    });
  }
});
