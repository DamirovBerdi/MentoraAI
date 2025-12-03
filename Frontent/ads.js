document.addEventListener('DOMContentLoaded', function(){
  const banners = document.querySelectorAll('.ad-banner');
  banners.forEach(b => {
    // Always show banners (ignore any previously saved dismissed flags)
    try{ b.style.display = ''; }catch(e){}

    const cta = b.querySelector('.ad-cta');
    if(cta){
      cta.addEventListener('click', function(ev){
        ev.preventDefault(); ev.stopPropagation();
        const href = b.getAttribute('href') || '#';
        if(href && href !== '#') window.open(href, '_blank');
        else alert('CTA clicked — link not configured.');
      });
    }

    // subtle entrance animation
    b.style.opacity = '0'; b.style.transform = 'translateY(8px)';
    requestAnimationFrame(()=>{ setTimeout(()=>{ b.style.transition = 'opacity .25s ease, transform .25s ease'; b.style.opacity = '1'; b.style.transform = 'translateY(0)'; }, 50); });
  });
});
