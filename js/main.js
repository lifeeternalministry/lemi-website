/* Life Eternal Ministry International: menu, header, hero motion, copy buttons, forms. */
(function(){
  var root=document.documentElement;
  var nav=document.getElementById('nav'), menuBtn=document.getElementById('menuBtn');
  if(menuBtn&&nav){
    menuBtn.addEventListener('click',function(){
      var open=nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded',open?'true':'false');
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&nav.classList.contains('open')){nav.classList.remove('open');menuBtn.setAttribute('aria-expanded','false');menuBtn.focus();}});
    nav.addEventListener('click',function(e){if(e.target.tagName==='A'){nav.classList.remove('open');menuBtn.setAttribute('aria-expanded','false');}});
  }
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var header=document.querySelector('.site-header');
  var hero=document.querySelector('.hero');
  var ticking=false;
  function onScroll(){
    var y=window.pageYOffset||root.scrollTop||0;
    if(header){header.classList.toggle('scrolled',y>24);}
    if(hero&&!reduce){var h=hero.offsetHeight||800;hero.style.setProperty('--p',Math.max(0,Math.min(1,y/h)).toFixed(3));}
    ticking=false;
  }
  window.addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(onScroll);}},{passive:true});
  onScroll();
  if(hero&&!reduce){
    hero.addEventListener('pointermove',function(e){
      var r=hero.getBoundingClientRect();
      hero.style.setProperty('--mx',(((e.clientX-r.left)/r.width)*2-1).toFixed(3));
      hero.style.setProperty('--my',(((e.clientY-r.top)/r.height)*2-1).toFixed(3));
    });
  }
  // spotlight
  document.querySelectorAll('.spot').forEach(function(el){
    el.addEventListener('pointermove',function(e){
      var r=el.getBoundingClientRect();
      el.style.setProperty('--sx',(e.clientX-r.left)+'px');
      el.style.setProperty('--sy',(e.clientY-r.top)+'px');
    });
  });
  // timeline nodes light as they pass the middle of the screen
  var steps=document.querySelectorAll('.step');
  if(steps.length){
    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('lit');}});},{rootMargin:'0px 0px -40% 0px'});
      steps.forEach(function(s){io.observe(s);});
    } else {steps.forEach(function(s){s.classList.add('lit');});}
  }
  // drifting gold motes in the hero
  var cv=document.getElementById('motes');
  if(cv&&!reduce&&cv.getContext){
    var ctx=cv.getContext('2d'),W=0,H=0,dpr=Math.min(window.devicePixelRatio||1,2),ps=[],live=true;
    function size(){W=cv.clientWidth;H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
    size();window.addEventListener('resize',size);
    var N=W<700?34:64;
    for(var i=0;i<N;i++){ps.push({x:Math.random(),y:Math.random(),r:.6+Math.random()*1.9,s:.012+Math.random()*.04,d:Math.random()*6.28,a:.25+Math.random()*.6});}
    if('IntersectionObserver' in window){new IntersectionObserver(function(es){live=es[0].isIntersecting;if(live){requestAnimationFrame(tick);}}).observe(cv);}
    var last=0;
    function tick(t){
      if(!live){return;}
      var dt=Math.min(50,t-last||16);last=t;
      ctx.clearRect(0,0,W,H);
      for(var i=0;i<ps.length;i++){
        var p=ps[i];p.y-=p.s*dt/1000;p.d+=dt/1800;if(p.y<-.02){p.y=1.02;p.x=Math.random();}
        var x=(p.x+Math.sin(p.d)*.012)*W,y=p.y*H,tw=.55+.45*Math.sin(p.d*2.3);
        var g=ctx.createRadialGradient(x,y,0,x,y,p.r*5);
        g.addColorStop(0,'rgba(255,240,190,'+(p.a*tw)+')');g.addColorStop(1,'rgba(236,217,154,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,p.r*5,0,6.283);ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  document.querySelectorAll('button[data-target]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var el=document.getElementById(btn.getAttribute('data-target'));
      function done(t){btn.textContent=t;setTimeout(function(){btn.textContent='Copy';},1800);}
      function select(){var r=document.createRange();r.selectNodeContents(el);var s=window.getSelection();s.removeAllRanges();s.addRange(r);done('Selected');}
      try{navigator.clipboard.writeText(el.textContent.trim()).then(function(){done('Copied');},select);}catch(e){select();}
    });
  });
  var LIVE=location.protocol!=='file:'&&!/^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname)&&!/(^|\.)claude\.ai$|claudeusercontent\.com$/.test(location.hostname);
  document.querySelectorAll('form[data-preview]').forEach(function(f){
    var s=f.querySelector('.status');
    f.addEventListener('submit',function(e){
      if(LIVE&&f.checkValidity()){return;}
      e.preventDefault();
      if(!f.checkValidity()){f.reportValidity();return;}
      if(s){s.textContent='Preview only: this form is not connected yet, so nothing was sent.';}
    });
  });
})();
