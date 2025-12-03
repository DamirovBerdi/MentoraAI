// animated-bg.js
// Applies color variables for animated background based on theme (dark/light)

function applyAnimatedBgTheme(){
  const root = document.documentElement;
  // default (light) colors
  let blob1_1 = '#ffd166';
  let blob1_2 = '#ff8a65';
  let blob2_1 = '#9be7ff';
  let blob2_2 = '#60a5fa';

  if(document.body.classList.contains('dark')){
    // dark theme: cool blues
    blob1_1 = '#60a5fa';
    blob1_2 = '#2563eb';
    blob2_1 = '#7dd3fc';
    blob2_2 = '#075985';
  }

  root.style.setProperty('--blob1-1', blob1_1);
  root.style.setProperty('--blob1-2', blob1_2);
  root.style.setProperty('--blob2-1', blob2_1);
  root.style.setProperty('--blob2-2', blob2_2);
}

// observe changes to the body class (dark toggle)
const mo = new MutationObserver((mutations) => {
  for(const m of mutations){
    if(m.attributeName === 'class') applyAnimatedBgTheme();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  // insert animated bg container if not present
  if(!document.getElementById('animated-bg')){
    const div = document.createElement('div');
    div.id = 'animated-bg';
    div.innerHTML = '<div class="blob b1"></div><div class="blob b2"></div>';
    document.body.prepend(div);
  }
  applyAnimatedBgTheme();
  mo.observe(document.body, { attributes: true });
});

// also react to storage changes from other tabs (if theme changed elsewhere)
window.addEventListener('storage', (e) => {
  if(e.key === 'darkMode') applyAnimatedBgTheme();
});


