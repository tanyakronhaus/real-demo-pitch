(function(){
  'use strict';
  const W=1600,H=900,PW=760;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const icon=(id,cls='ic')=>'<svg class="'+cls+'"><use href="#i-'+id+'"/></svg>';
  const ago=m=>m<60?'לפני '+m+' דק׳':'לפני '+Math.round(m/60)+' ש׳';

  /* ── Maps: vector art, neighbourhood labels and pins ──
     data-pins: "x,y,type,…" (x/y in % from the left/top), separated by ';'
       m,photo,ageMin[,size]  moment (fades as it ages)   c,count  cluster
       q,radiusPx             request with radius ring     b,icon[,open]  business   me  my location */
  const HOODS=[[16,40,'בת גלים'],[44,26,'עיר תחתית'],[58,50,'הדר'],[33,56,'המושבה הגרמנית'],[62,82,'כרמל'],[86,64,'נווה שאנן']];
  $$('.map').forEach(m=>{
    m.insertAdjacentHTML('afterbegin','<svg class="art" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><use href="#mapart"/></svg>');
    if(m.dataset.hoods!=='none'&&!m.closest('.phone'))HOODS.forEach(([x,y,n])=>m.insertAdjacentHTML('beforeend','<span class="hood" style="left:'+x+'%;top:'+y+'%">'+n+'</span>'));
    (m.dataset.pins||'').split(';').filter(Boolean).forEach((d,i)=>{
      const [x,y,t,a,b,c]=d.split(',');
      const p=document.createElement('span');p.className='pin '+t;p.style.left=x+'%';p.style.top=y+'%';p.style.setProperty('--i',i);
      if(t==='m'){const age=+b;const o=age<=5?1:age<=20?.85:age<=60?.7:age<=180?.5:.4;
        p.style.setProperty('--o',o);if(c)p.style.setProperty('--s',c+'px');if(age<=5)p.classList.add('fresh');
        p.innerHTML='<i class="ph '+a+'"></i>'+(age<=15?'<span class="ago">'+ago(age)+'</span>':'');}
      else if(t==='c')p.innerHTML='<b>'+a+'</b>';
      else if(t==='q'){p.style.setProperty('--rad',a+'px');p.innerHTML='<span class="ring"></span><b>?</b>';}
      else if(t==='b'){p.innerHTML='<b>'+icon(a)+'</b>';if(b==='open')p.classList.add('open');}
      else if(t==='me')p.innerHTML='<b></b>';
      m.appendChild(p);
    });
  });

  /* ── Segmented controls with a sliding knob ── */
  const segs=[];
  function seg(el,onPick){
    const btns=$$('button',el),knob=$('.knob',el);
    const place=()=>{const b=btns.find(x=>x.classList.contains('sel'))||btns[0];
      knob.style.width=b.offsetWidth+'px';knob.style.right=(el.clientWidth-b.offsetLeft-b.offsetWidth)+'px';};
    const pick=(b,silent)=>{btns.forEach(x=>x.classList.toggle('sel',x===b));place();if(!silent&&onPick)onPick(b,btns.indexOf(b));};
    btns.forEach(b=>b.addEventListener('click',()=>pick(b)));
    segs.push(place);
    return {pick:i=>pick(btns[i],true),place};
  }

  /* ── Slides ── */
  const slides=$$('.slide'),N=slides.length;
  const chapters=[['החזון','spark'],['אפיון מוצר','layers'],['אפיון ממשק','mobile'],['עסק וצמיחה','coin']];
  const strip=$('#strip'),vp=$('#viewport');
  let cur=-1,target=0,portrait=false,pageH=0,moving=false,moveT=null,lockUntil=0;
  const pages=slides.map(s=>{const p=document.createElement('div');p.className='page';const f=document.createElement('div');f.className='frame';s.parentNode.insertBefore(p,s);f.appendChild(s);p.appendChild(f);return p;});

  const tabs=chapters.map(([name,ic],c)=>{
    const i=slides.findIndex(s=>+s.dataset.ch===c);
    const b=document.createElement('button');b.className='tab';b.innerHTML=icon(ic)+'<span>'+name+'</span>';
    b.setAttribute('aria-label','מעבר אל '+name);b.addEventListener('click',()=>go(i));$('#tabs').appendChild(b);return b;
  });

  const hooks={};const leaves={};
  function setActive(i){
    if(i===cur)return;
    if(cur>=0){slides[cur].classList.remove('on');const l=leaves[slides[cur].id];if(l)l();}
    cur=i;const s=slides[i];void s.offsetWidth;s.classList.add('on');
    const near=portrait?2:1;pages.forEach((p,k)=>p.classList.toggle('far',Math.abs(k-i)>near));
    const f=N>1?i/(N-1):0;
    $('#fill').style.width=(f*100)+'%';$('#head').style.right=(f*100)+'%';
    const ch=+s.dataset.ch;tabs.forEach((t,c)=>t.classList.toggle('cur',c===ch));
    $('#chapname').textContent=chapters[ch][0];
    $('#idx').innerHTML=String(i+1).padStart(2,'0')+' <i>/ '+N+'</i>';
    document.body.dataset.bg=s.dataset.bg||'aurora';
    const h=hooks[s.id];if(h)h(s);
    try{history.replaceState(null,'','#'+s.id);}catch(e){}
  }
  function place(i,anim){
    strip.style.transition=anim&&!reduce?'transform .95s cubic-bezier(.7,0,.2,1)':'none';
    strip.style.transform='translate3d(0,'+(-i*pageH)+'px,0)';
  }
  function go(i,instant){
    i=Math.max(0,Math.min(N-1,i));
    if(portrait){target=i;lockUntil=performance.now()+900;setActive(i);
      window.scrollTo({top:Math.max(0,pages[i].getBoundingClientRect().top+scrollY-12),behavior:instant||reduce?'auto':'smooth'});return;}
    if(i===target&&cur===i&&!instant)return;
    target=i;setActive(i);
    if(instant||reduce){place(i,false);moving=false;return;}
    moving=true;place(i,true);clearTimeout(moveT);moveT=setTimeout(()=>moving=false,960);
  }
  function fit(){
    const vw=innerWidth,vh=innerHeight;
    portrait=vw<760||(vw<1000&&vh>vw);
    document.body.classList.toggle('portrait',portrait);
    if(portrait){
      const scale=Math.min(1,(vw-24)/PW);
      pages.forEach(p=>{const fr=p.firstChild;fr.style.transform='scale('+scale+')';p.style.width=Math.floor(PW*scale)+'px';p.style.height=Math.ceil(fr.offsetHeight*scale)+'px';});
    }else{
      pageH=vp.clientHeight;const scale=Math.min(vp.clientWidth/W,pageH/H);
      pages.forEach(p=>{p.style.height=pageH+'px';p.style.width='';p.firstChild.style.transform='translate(-50%,-50%) scale('+scale+')';});
      place(target,false);
    }
    segs.forEach(f=>f());
    if(cur>=0){const near=portrait?2:1;pages.forEach((p,k)=>p.classList.toggle('far',Math.abs(k-cur)>near));}
  }

  /* input */
  let lastWheel=0,lastAbs=0,acc=0;
  addEventListener('wheel',e=>{
    if(portrait||e.ctrlKey)return;e.preventDefault();
    const now=performance.now(),abs=Math.abs(e.deltaY),gap=now-lastWheel;lastWheel=now;
    const fresh=gap>180||abs>lastAbs*1.6+4;lastAbs=abs;
    if(moving||!fresh){acc=0;return;}
    acc+=e.deltaY;if(Math.abs(acc)>24){const d=acc>0?1:-1;acc=0;stopAuto();go(target+d);}
  },{passive:false});
  let ty=null;
  addEventListener('touchstart',e=>{if(!portrait)ty=e.touches[0].clientY;},{passive:true});
  addEventListener('touchmove',e=>{if(!portrait&&e.cancelable)e.preventDefault();},{passive:false});
  addEventListener('touchend',e=>{if(portrait||ty===null)return;const dy=ty-e.changedTouches[0].clientY;ty=null;if(Math.abs(dy)>40&&!moving){stopAuto();go(target+(dy>0?1:-1));}},{passive:true});
  addEventListener('keydown',e=>{
    if((e.key===' '||e.key==='Enter')&&e.target.closest&&e.target.closest('button,[tabindex]'))return;
    if(['ArrowDown','PageDown',' ','ArrowLeft'].includes(e.key)){e.preventDefault();stopAuto();go(target+1);}
    else if(['ArrowUp','PageUp','ArrowRight'].includes(e.key)){e.preventDefault();stopAuto();go(target-1);}
    else if(e.key==='Home'){e.preventDefault();go(0);}else if(e.key==='End'){e.preventDefault();go(N-1);}
    else if(e.key==='f'||e.key==='F')toggleFs();
  });
  const nextBtn=$('#next');
  nextBtn.addEventListener('click',()=>{nextBtn.classList.remove('flash');void nextBtn.offsetWidth;nextBtn.classList.add('flash');stopAuto();go(target+1>=N?0:target+1);});
  $('#prev').addEventListener('click',()=>{stopAuto();go(target-1);});
  function toggleFs(){try{if(!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{});else document.exitFullscreen().catch(()=>{});}catch(e){}}
  $('#fs').addEventListener('click',toggleFs);
  $$('[data-go]').forEach(b=>b.addEventListener('click',()=>go(slides.findIndex(s=>s.id===b.dataset.go))));

  /* autoplay */
  let autoT=null;const autoBtn=$('#auto');
  function stopAuto(){if(!autoT)return;clearInterval(autoT);autoT=null;autoBtn.classList.remove('on');autoBtn.setAttribute('aria-pressed','false');autoBtn.querySelector('use').setAttribute('href','#i-play');}
  autoBtn.addEventListener('click',()=>{
    if(autoT){stopAuto();return;}
    autoBtn.classList.add('on');autoBtn.setAttribute('aria-pressed','true');autoBtn.querySelector('use').setAttribute('href','#i-pause');
    autoT=setInterval(()=>go(target+1>=N?0:target+1),9000);
  });

  addEventListener('scroll',()=>{if(!portrait||performance.now()<lockUntil)return;const mid=innerHeight/2;let k=0;
    pages.forEach((p,j)=>{if(p.getBoundingClientRect().top<=mid)k=j;});target=k;setActive(k);},{passive:true});
  addEventListener('resize',fit);
  // hash jumps and keyboard focus can scroll the clipped viewport; the strip transform is the only source of position
  vp.addEventListener('scroll',()=>{if(!portrait&&(vp.scrollTop||vp.scrollLeft)){vp.scrollTop=0;vp.scrollLeft=0;}});
  addEventListener('hashchange',()=>{const k=slides.findIndex(s=>s.id===location.hash.slice(1));if(k>=0&&k!==cur)go(k);});

  /* ── helpers ── */
  const FL='אבגדהוזחטיכלמנסעפצקרשת0123456789';
  function scramble(el){
    const fin=el.dataset.text||(el.dataset.text=el.textContent);
    if(reduce){el.textContent=fin;return;}
    let t=0;const len=fin.length;clearInterval(el._t);
    el._t=setInterval(()=>{t++;let s='';
      for(let k=0;k<len;k++)s+=(t>k*0.7+8||fin[k]===' ')?fin[k]:FL[(Math.random()*FL.length)|0];
      el.textContent=s;if(t>len*0.7+8){clearInterval(el._t);el.textContent=fin;}},40);
  }
  function countTo(el,to,dur,fmt){
    cancelAnimationFrame(el._r);const t0=performance.now();
    const step=now=>{const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=fmt?fmt(to*e):Math.round(to*e);if(k<1)el._r=requestAnimationFrame(step);};
    if(reduce){el.textContent=fmt?fmt(to):to;return;}
    el._r=requestAnimationFrame(step);
  }

  /* why: scramble */
  hooks.why=s=>$$('.scr',s).forEach(scramble);

  /* moment: 10-minute validity, compressed into 12 seconds */
  let mT=null;
  hooks.moment=()=>{
    const t=$('#mtimer'),sm=t.nextElementSibling;clearInterval(mT);t.textContent='10:00';sm.textContent='תוקף צילום עד הפרסום';
    if(reduce)return;
    const t0=performance.now()+800;
    mT=setInterval(()=>{const k=Math.max(0,Math.min(1,(performance.now()-t0)/12000));const left=Math.round(600*(1-k));
      t.textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');
      if(k>=1){clearInterval(mT);sm.textContent='התמונה כבר לא טרייה. צלם שוב.';}},100);
  };
  leaves.moment=()=>clearInterval(mT);

  /* audience: persona → question → REAL's answer */
  const personas=[
    ['wave','מי שיוצא לחוף','איך הגלים עכשיו? כמה עמוס?','רגעים מהחוף מהשעה האחרונה, או בקשת רגע שמישהו שנמצא שם עונה עליה.',[['p7','חוף דדו · 3 דק׳'],['p1','בת גלים · 9 דק׳'],['p7','השקט · 21 דק׳']]],
    ['music','מי שמתלבט אם לצאת','מה קורה עכשיו בפסטיבל?','המפה מראה את הרגעים משם עכשיו, וההאשטג של האירוע מרכז אותם.',[['p4','#פסטיבל · 1 דק׳'],['p4','#פסטיבל · 6 דק׳'],['p2','עיר תחתית · 14 דק׳']]],
    ['home','תושב/ת שכונה','מה חדש אצלנו בשכונה?','טאב ״סביבי״ והתראות על פעילות בשכונה.',[['p5','גן הזיכרון · 8 דק׳'],['p6','שוק תלפיות · 15 דק׳'],['p8','הרצל · 30 דק׳']]],
    ['fork','מי שמחפש בית קפה או מסעדה','איך המקום נראה באמת? יש תור?','פרופיל עסק עם תמונות עדכניות של העסק ושל לקוחות.',[['p3','קפה מסדה · 4 דק׳'],['p3','לקוח · 12 דק׳'],['p6','לקוח · 25 דק׳']]],
    ['store','בעל/ת עסק קטן','איך אני מראה לשכנים מה יש היום?','חשבון עסקי, נקודה קבועה על המפה ועוקבים מהסביבה.',[['p6','הדוכן שלי · עכשיו'],['p3','הדוכן שלי · 1 ש׳'],['p6','לקוח · 2 ש׳']]],
    ['cam','מי שאוהב לצלם את העיר','איפה הקהל וההכרה?','תגים כמו ״כתב מקומי״ ו״עין העיר״, ועוקבים שגרים קרוב.',[['p2','הדר · 2 דק׳'],['p1','בת גלים · 1 ש׳'],['p8','מסדה · 3 ש׳']]]
  ];
  const plist=$('#plist'),pchat=$('#pchat');let pT=null,pIdx=0;
  personas.forEach(([ic,who,q],k)=>{const b=document.createElement('button');b.className='pp';b.innerHTML=icon(ic)+'<span><b>'+who+'</b><small>״'+q+'״</small></span>';
    b.addEventListener('click',()=>{pickP(k);clearInterval(pT);});plist.appendChild(b);});
  function pickP(k){pIdx=k;$$('.pp',plist).forEach((b,j)=>b.classList.toggle('sel',j===k));const [,who,q,a,tiles]=personas[k];
    pchat.classList.remove('go');void pchat.offsetWidth;
    pchat.innerHTML='<div class="bub q"><small>'+who+'</small>'+q+'</div><div class="typing"><i></i><i></i><i></i></div><div class="bub a"><small>REAL</small>'+a+'</div><div class="ptiles">'+tiles.map((t,i)=>'<i class="ph '+t[0]+'" data-t="'+t[1]+'" style="--i:'+i+'"></i>').join('')+'</div>';
    pchat.classList.add('go');}
  pickP(0);
  hooks.audience=()=>{pickP(0);clearInterval(pT);if(!reduce)pT=setInterval(()=>pickP((pIdx+1)%personas.length),4200);};
  leaves.audience=()=>clearInterval(pT);

  /* location toggle */
  const lmap=$('#lmap');
  const locSeg=seg($('#locseg'),b=>lmap.dataset.m=b.dataset.m);
  hooks.location=()=>{lmap.dataset.m='approx';locSeg.pick(0);};

  /* visibility network */
  const net=$('#net'),nsvg=$('#netsvg');nsvg.setAttribute('viewBox','0 0 100 100');nsvg.setAttribute('preserveAspectRatio','none');
  const nodes=[];const addNode=(x,y,cls,ic,label)=>{const d=document.createElement('span');d.className='nd '+cls;d.style.left=x+'%';d.style.top=y+'%';d.innerHTML=icon(ic)+(label?'<small>'+label+'</small>':'');net.appendChild(d);nodes.push(d);return d;};
  for(let k=0;k<8;k++){const a=k/8*Math.PI*2+.2,x=50+Math.cos(a)*25,y=50+Math.sin(a)*25;const fr=[0,3,5].includes(k);
    const ln=document.createElementNS('http://www.w3.org/2000/svg','line');ln.setAttribute('x1',50);ln.setAttribute('y1',50);ln.setAttribute('x2',x);ln.setAttribute('y2',y);ln.setAttribute('vector-effect','non-scaling-stroke');nsvg.appendChild(ln);
    const n=addNode(x,y,'f'+(fr?' fr':''),fr?'heart':'user',k===0?'חבר/ה':k===1?'עוקב/ת':'');n._ln=ln;}
  for(let k=0;k<12;k++){const a=k/12*Math.PI*2+.45,x=50+Math.cos(a)*43,y=50+Math.sin(a)*43;addNode(x,y,'o',k%3?'user':'guest',k===2?'אורח':k===7?'כל אחד':'');}
  const me=document.createElement('span');me.className='nd me';me.style.left='50%';me.style.top='50%';me.innerHTML='<i class="ph p1"></i>';net.appendChild(me);
  const vis={
    all:['כולם (ברירת מחדל)','כולם, כולל אורחים שעוד לא נרשמו.',['סביבי','מפה','האשטגים','פרופיל','פיד העוקבים']],
    fol:['עוקבים','רק מי שעוקב אחריי. על המפה הרגע מופיע רק אצלם.',['פיד העוקבים','פרופיל','המפה שלהם']],
    fr:['חברים','רק עוקבים הדדיים. כמו עוקבים, לקהל מצומצם יותר.',['פיד העוקבים','פרופיל']]
  };
  function setVis(v){
    nodes.forEach((n,k)=>{const on=v==='all'||(v==='fol'&&n.classList.contains('f'))||(v==='fr'&&n.classList.contains('fr'));
      setTimeout(()=>{n.classList.toggle('lit',on);n.classList.toggle('g',on&&n.classList.contains('o'));if(n._ln)n._ln.style.stroke=on?'rgba(79,195,255,.55)':'';},reduce?0:k*35);});
    const [t,p,w]=vis[v];const d=$('#vdesc');
    d.innerHTML='<b>'+t+'</b><p>'+p+'</p><div class="where">'+w.map(x=>'<span class="pill b">'+x+'</span>').join('')+'</div>';
  }
  const visSeg=seg($('#visseg'),b=>setVis(b.dataset.v));
  setVis('all');
  hooks.visibility=()=>{visSeg.pick(0);nodes.forEach(n=>n.classList.remove('lit'));setTimeout(()=>setVis('all'),600);};

  /* discovery */
  const disc=[
    ['near','סביבי','מסך הבית','רשת של רגעים ציבוריים קרובים, ברדיוס של 1, 5 או 20 ק״מ.','הכי חדש או הכי קרוב',[['p4','120 מ׳'],['p6','300 מ׳'],['p1','450 מ׳'],['p3','600 מ׳'],['p7','900 מ׳'],['p5','1.2 ק״מ'],['p2','2 ק״מ'],['p8','3 ק״מ']]],
    ['map','מפה','הקשר גיאוגרפי','הרגעים בהקשר הגיאוגרפי שלהם, בקשות רגע פתוחות ועסקים.','שעה אחרונה, היום או שבוע',[['p7','2 דק׳'],['p1','5 דק׳'],['p4','9 דק׳'],['p3','14 דק׳'],['p6','22 דק׳'],['p5','40 דק׳'],['p2','1 ש׳'],['p8','3 ש׳']]],
    ['feed','עוקב/ת','אנשים, עסקים והאשטגים','רגעים של מי שעוקבים אחריו. הפיד מסתיים אחרי הימים האחרונים, בלי גלילה אינסופית.','כרונולוגי',[['p5','דנה'],['p3','קפה מסדה'],['p1','#שקיעה'],['p8','רוני'],['p6','שוק תלפיות'],['p4','#פסטיבל'],['p2','נועה'],['p7','#גלישה']]],
    ['hash','האשטגים וחיפוש','נושא, אירוע או מקום','רגעים לפי נושא, אירוע או מקום. ״חם בסביבה״ מציג את ההאשטגים הפעילים סביבך בשעות האחרונות: פסטיבל, מרתון או סופה.','הכי חדש או הכי קרוב',[['p4','#פסטיבל'],['p4','#פסטיבל'],['p2','#פסטיבל'],['p4','#פסטיבל'],['p6','#מרתון'],['p8','#מרתון'],['p7','#חוף'],['p1','#חוף']]]
  ];
  const dtabs=$('#dtabs'),dview=$('#dview');
  disc.forEach((d,k)=>{const b=document.createElement('button');b.className='dt';b.innerHTML=icon(d[0])+'<span><b>'+d[1]+'</b><small>'+d[2]+'</small></span>';b.addEventListener('click',()=>pickD(k));dtabs.appendChild(b);});
  function pickD(k){$$('.dt',dtabs).forEach((b,j)=>b.classList.toggle('sel',j===k));const d=disc[k];
    dview.classList.remove('swap');void dview.offsetWidth;
    dview.innerHTML='<p class="what">'+d[3]+'</p><div class="order">'+icon('sliders')+'סדר: <b>'+d[4]+'</b> · בלי אלגוריתם</div><div class="mgrid">'+d[5].map((t,i)=>'<i class="ph '+t[0]+'" data-t="'+t[1]+'" style="--i:'+i+'"></i>').join('')+'</div>';
    dview.classList.add('swap');}
  pickD(0);
  let tagT=null;
  hooks.discover=()=>{pickD(0);const tg=$('#tg1');clearTimeout(tagT);tg.textContent='#חֵיפָה';tagT=setTimeout(()=>{tg.textContent='#חיפה';tg.style.background='rgba(46,242,176,.15)';},1800);};

  /* requests: six-step scenario */
  const rmap=$('#rmap'),rs=$$('.rs'),rplay=$('#rplay');let rT=null,rStep=0;
  function setR(k){rStep=k;if(k)rmap.dataset.s=k;else delete rmap.dataset.s;
    rs.forEach((b,j)=>{b.classList.toggle('sel',j+1===k);b.classList.toggle('done',j+1<k);});
    $$('.usr.near',rmap).forEach(u=>u.classList.toggle('on',k>=3));
    if(k===1){const p=$('.press',rmap);p.style.animation='none';void p.offsetWidth;p.style.animation='';}}
  function rStop(){clearInterval(rT);rT=null;rplay.querySelector('span').textContent='הפעלת התרחיש';rplay.querySelector('use').setAttribute('href','#i-play');}
  function rStart(){rStop();setR(1);rplay.querySelector('span').textContent='עצירה';rplay.querySelector('use').setAttribute('href','#i-pause');
    rT=setInterval(()=>{if(rStep>=6){rStop();return;}setR(rStep+1);},2300);}
  rplay.addEventListener('click',()=>rT?rStop():rStart());
  rs.forEach(b=>b.addEventListener('click',()=>{rStop();setR(+b.dataset.s);}));
  let rDelay=null;
  hooks.requests=()=>{rStop();setR(0);clearTimeout(rDelay);rDelay=setTimeout(rStart,reduce?0:900);};
  leaves.requests=()=>{rStop();clearTimeout(rDelay);};

  /* social: double-tap heart */
  const hb=$('#heartbox'),hc=$('#hcnt');let hn=14,lastTap=0;
  const burst=()=>{hb.classList.remove('burst');void hb.offsetWidth;hb.classList.add('burst');hn++;hc.textContent=hn;};
  hb.addEventListener('dblclick',burst);
  hb.addEventListener('touchend',e=>{const n=Date.now();if(n-lastTap<320){e.preventDefault();burst();}lastTap=n;});
  hb.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();burst();}});
  let hT=null;hooks.social=()=>{clearTimeout(hT);hT=setTimeout(burst,1600);};

  /* badges: arc fill targets */
  $$('#badges .arc').forEach((a,k)=>a.style.setProperty('--to',[0,88,0][k]));

  /* business tabs */
  const bsets={own:['p3','p3','p6','p3','p8','p3'],cust:['p5','p3','p1','p4','p3','p7']};
  const bgrid=$('#bgrid');
  function setB(k){bgrid.classList.remove('swap');void bgrid.offsetWidth;bgrid.innerHTML=bsets[k].map((p,i)=>'<i class="ph '+p+'" style="--i:'+i+'"></i>').join('');bgrid.classList.add('swap');}
  seg($('#bseg'),b=>setB(b.dataset.b));setB('own');

  /* notifications settings */
  seg($('#nseg'));
  $$('#notify .sw').forEach(s=>s.addEventListener('click',()=>{s.classList.toggle('on');s.setAttribute('aria-pressed',s.classList.contains('on'));}));

  /* screen map: phone tabs ↔ description */
  const sdata=[
    ['סביבי · מסך הבית',['פס עליון: שם השכונה, חיפוש, התראות והודעות','״מבקשים מכם״: בקשות רגע פתוחות עם ״צלם עכשיו״','חם בסביבה: שבבי האשטגים פעילים','מסננים: רדיוס, זמן וסוג (אנשים / עסקים)','רשת רגעים בשתי עמודות. בסוף: ״ראית את כל מה שקרה פה היום״']],
    ['מפה',['סמני רגעים עגולים, שמתקבצים לאשכול כשמתרחקים','סמני בקשות עם טבעת רדיוס, וסמני עסקים','מסנני זמן: שעה אחרונה / היום / שבוע','לחיצה על סמן פותחת כרטיס. החלקה למעלה: עמוד הרגע','לחיצה ארוכה: ״בקש רגע מכאן״']],
    ['צלם',['המצלמה נפתחת מיד, במסך מלא','שם השכונה בראש המסך','פס ״עונה על״ כשמגיעים מבקשת רגע','אין כפתור גלריה ואין פילטרים','תצוגה מקדימה ← מסך פרסום']],
    ['עוקב/ת',['פיד כרונולוגי של אנשים, עסקים והאשטגים','מסתיים אחרי הימים האחרונים, בלי גלילה אינסופית','מצב ריק: המלצות למעקב בשכונה ועסקים קרובים']],
    ['פרופיל',['תמונה, שם, שכונת בית, תגים ומונים בקטן','לשוניות: רשת · מפה · הבקשות שלי','עקוב / בקש לעקוב, ושליחת הודעה','הגדרות, פרטיות ומעבר לחשבון עסקי']]
  ];
  const sviews=$$('#sphone .view'),stb=$$('#stabbar>span'),sdesc=$('#sdesc');
  function pickS(k,fromSeg){sviews.forEach((v,j)=>v.classList.toggle('sel',j===k));stb.forEach((t,j)=>t.classList.toggle('sel',j===k));
    sdesc.classList.remove('swap');void sdesc.offsetWidth;sdesc.innerHTML='<h3>'+sdata[k][0]+'</h3><ul>'+sdata[k][1].map(x=>'<li>'+x+'</li>').join('')+'</ul>';sdesc.classList.add('swap');
    if(!fromSeg)sSeg.pick(k);}
  const sSeg=seg($('#sseg'),(b,k)=>pickS(k,true));
  stb.forEach((t,k)=>t.addEventListener('click',()=>pickS(k)));
  pickS(0);
  hooks.screens=()=>pickS(0);

  /* onboarding clock */
  hooks.onboard=()=>countTo($('#obsec'),8,6600,v=>v.toFixed(1)+'s');

  /* capture → publish → map */
  const cviews=$$('#cphone>div'),csteps=$$('#csteps .sc'),csec=$('#csec'),cplay=$('#cplay'),ctype=$('#ctype');
  const CAP='הגלים מושלמים עכשיו #בת_גלים #שקיעה';
  const cDur=[2600,2200,4600,2600];let cT=[],cClock=null;
  function setC(k){cviews.forEach((v,j)=>{v.classList.remove('sel');if(j===k){void v.offsetWidth;v.classList.add('sel');}});csteps.forEach((b,j)=>b.classList.toggle('sel',j===k));
    clearInterval(ctype._t);
    if(k===2){let n=0;ctype.innerHTML='<span class="cur"></span>';if(reduce){ctype.textContent=CAP;return;}
      ctype._t=setInterval(()=>{n++;ctype.innerHTML=CAP.slice(0,n)+'<span class="cur"></span>';if(n>=CAP.length)clearInterval(ctype._t);},70);}
    else if(k===3)ctype.textContent=CAP;}
  function cStop(){cT.forEach(clearTimeout);cT=[];clearInterval(cClock);cplay.querySelector('span').textContent='הפעלה';cplay.querySelector('use').setAttribute('href','#i-play');}
  function cStart(){cStop();setC(0);const t0=performance.now();let acc=0;
    cplay.querySelector('span').textContent='עצירה';cplay.querySelector('use').setAttribute('href','#i-pause');
    const total=cDur.reduce((a,b)=>a+b,0);
    cClock=setInterval(()=>{const e=Math.min(performance.now()-t0,total-1200);csec.textContent=(e/1000).toFixed(1).padStart(4,'0');},50);
    cDur.slice(0,-1).forEach((d,k)=>{acc+=d;cT.push(setTimeout(()=>setC(k+1),acc));});
    cT.push(setTimeout(()=>{clearInterval(cClock);cplay.querySelector('span').textContent='שוב';cplay.querySelector('use').setAttribute('href','#i-refresh');},total-1200));}
  cplay.addEventListener('click',()=>cT.length&&cplay.querySelector('span').textContent==='עצירה'?cStop():cStart());
  csteps.forEach((b,k)=>b.addEventListener('click',()=>{cStop();setC(k);}));
  let cDelay=null;
  hooks.capture=()=>{cStop();csec.textContent='00.0';setC(0);clearTimeout(cDelay);cDelay=setTimeout(cStart,reduce?0:700);};
  leaves.capture=()=>{cStop();clearTimeout(cDelay);};

  /* KPIs */
  hooks.kpi=s=>$$('.cnt',s).forEach((el,k)=>setTimeout(()=>countTo(el,+el.dataset.n,1400),k*100+400));

  /* design: copy colour */
  $$('#design .swc').forEach(s=>s.addEventListener('click',()=>{const hex=s.dataset.copy,sm=$('small',s),old=sm.textContent;
    try{navigator.clipboard&&navigator.clipboard.writeText(hex.toUpperCase());}catch(e){}
    sm.textContent='הועתק ✓';setTimeout(()=>sm.textContent=old,1200);}));

  /* start */
  const h=(location.hash||'').slice(1);
  const start=Math.max(0,slides.findIndex(s=>s.id===h));
  target=start;fit();setActive(start);
  if(portrait&&start>0)go(start,true);else if(!portrait)place(start,false);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
})();
