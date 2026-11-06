/* НейроБукварь — общий скрипт сайта (многостраничная версия) */
const I=n=>`<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
const pages=PAGES;                       /* данные: search-data.js */
const CUR=+document.body.dataset.p;      /* номер текущего раздела (0..11), -1 — страница 404 */

/* ===== Состояние ===== */
const menu=document.getElementById('menu'),main=document.getElementById('main'),q=document.getElementById('q');
let read=new Set();
try{read=new Set(JSON.parse(localStorage.getItem('np_read')||'[]').filter(n=>Number.isInteger(n)&&n>=0&&n<pages.length))}catch(e){}
function saveRead(){try{localStorage.setItem('np_read',JSON.stringify([...read]))}catch(e){}}

/* ===== Меню и прогресс ===== */
function updateMenu(){
 [...menu.children].forEach((a,i)=>{
  const ic=a.querySelector('.rd');
  if(read.has(i)){if(!ic)a.insertAdjacentHTML('beforeend','<svg class="ic rd" aria-label="прочитано"><use href="#i-check"/></svg>')}
  else if(ic)ic.remove();
 });
 const n=read.size,tot=pages.length;
 document.getElementById('prog').innerHTML=`Прочитано: ${n} из ${tot}<div class="pbar"><i style="width:${Math.round(n/tot*100)}%"></i></div>`;
 const a=menu.children[CUR];
 if(a&&window.innerWidth<=860){try{const r=a.getBoundingClientRect(),m=menu.getBoundingClientRect();menu.scrollLeft+=r.left-m.left-Math.max(0,(menu.clientWidth-r.width)/2)}catch(e){}}
}
function syncReadBtn(){
 const b=main.querySelector('.readbtn');if(!b||CUR<0)return;
 const on=read.has(CUR);
 b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);
 b.querySelector('span').textContent=on?'Раздел прочитан':'Отметить раздел прочитанным';
}
function toggleRead(i){
 if(read.has(i))read.delete(i);else read.add(i);
 saveRead();syncReadBtn();updateMenu();
}

/* ===== Тесты ===== */
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function quizHtml(p){
 if(!p.qz)return'';
 return `<section class="quiz" aria-label="Проверьте себя"><h2>Проверьте себя</h2>`+p.qz.map((x,qi)=>{
  const opts=shuffle(x.o.map((t,k)=>({t,ok:k===x.a})));
  return `<div class="qq"><p class="qt">${qi+1}. ${x.q}</p><div class="qo">${opts.map(o=>`<button type="button"${o.ok?' data-ok="1"':''}>${o.t}</button>`).join('')}</div><p class="qe" hidden>${x.e}</p></div>`;
 }).join('')+`<p class="qs" aria-live="polite"></p></section>`;
}


/* ===== Демо нейрона ===== */
function initNeuron(){
 const d=document.getElementById('nd');if(!d)return;
 const xs=[...d.querySelectorAll('[data-x]')],ws=[...d.querySelectorAll('[data-w]')],b=d.querySelector('[data-b]'),r=d.querySelector('.demo-r'),f=d.querySelector('.demo-f');
 const sg=n=>n>0?'+'+n:''+n;
 function upd(){
  let s=0;const parts=[];
  xs.forEach((x,k)=>{const xv=x.checked?1:0,w=+ws[k].value;ws[k].nextElementSibling.textContent=sg(w);s+=xv*w;parts.push(xv+'×('+w+')')});
  const bv=+b.value;b.nextElementSibling.textContent=sg(bv);s+=bv;
  f.textContent='Сумма: '+parts.join(' + ')+' + ('+bv+') = '+s;
  r.textContent=s>0?'Сумма больше нуля — нейрон сработал: идём гулять!':'Сумма не больше нуля — нейрон молчит: остаёмся дома.';
 }
 d.addEventListener('input',upd);d.addEventListener('change',upd);upd();
}


/* ===== Прочее ===== */
function wrapTables(html){return html.replace(/<table/g,'<div class="tw"><table').replace(/<\/table>/g,'</table></div>')}

/* ===== Поиск ===== */
const norm=s=>s.toLowerCase().replace(/ё/g,'е');
const stem=w=>w.length>=7?w.slice(0,-2):w.length>=5?w.slice(0,-1):w;

/* Фрагменты (абзацы, пункты, строки таблиц, карточки…): именно на них ведёт результат поиска */
const UNIT_SEL='p,li,tr,dt,details,h2,h3,.box,.card,.fig,.demo,.prompt';
const UNIT_SKIP='.toc,.quiz,.pager,.crumbs,.readbtn';
const UNIT_WRAP='.fig,.demo,.card,.prompt,details,.box';
const INLINE_TAGS=new Set(['B','I','A','EM','STRONG','MARK','CODE','U','SUB','SUP']);
function tx(n){
 if(n.nodeType===3)return n.nodeValue;
 if(n.nodeType!==1)return '';
 const t=n.tagName.toUpperCase();
 if(t==='SVG'||t==='STYLE'||t==='SCRIPT')return '';
 if(t==='BR')return ' ';
 let s='';n.childNodes.forEach(c=>{s+=tx(c)});
 return INLINE_TAGS.has(t)?s:' '+s+' ';
}
function unitText(el){
 let t;
 if(el.matches('dt')){const d=el.nextElementSibling;t=tx(el)+' — '+(d&&d.matches('dd')?tx(d):'')}
 else if(el.matches('.prompt')){t=tx(el.querySelector('span')||el)}
 else t=tx(el);
 return t.replace(/\s+/g,' ').trim();
}
function collectUnits(root){
 return [...root.querySelectorAll(UNIT_SEL)].filter(el=>{
  if(el.closest(UNIT_SKIP))return false;
  return !(el.parentElement&&el.parentElement.closest(UNIT_WRAP));
 });
}
pages.forEach(p=>{p.units=p.units.map(text=>({text,n:norm(text)}));p.nt=norm(p.t);p.np=p.units.map(x=>x.n).join(' ')});

function doSearch(v){
 const st=[...new Set(norm(v).split(/[^a-zа-я0-9]+/).filter(Boolean).map(stem))];
 if(!st.length)return{st,res:[]};
 const res=[];
 pages.forEach((p,i)=>{
  if(!st.every(s=>p.nt.includes(s)||p.np.includes(s)))return;
  let sc=0;
  st.forEach(s=>{if(p.nt.includes(s))sc+=10;sc+=Math.min(5,p.np.split(s).length-1)});
  /* лучший фрагмент: где больше всего слов запроса; при равенстве — тот, где все эти слова стоят в самом начале (заголовок, название карточки), затем — ближе к началу */
  let u=-1,best=-1;
  p.units.forEach((x,k)=>{
   let c=0,far=0;
   st.forEach(s=>{const j=x.n.indexOf(s);if(j>=0){c++;if(j>far)far=j}});
   if(!c)return;
   const v=c*10+(far<=40?5:0);
   if(v>best){best=v;u=k}
  });
  res.push({p,i,sc,u});
 });
 res.sort((a,b)=>b.sc-a.sc);
 return{st,res};
}
function snippet(x,st){
 const T=x.text;
 let pos=-1;
 st.forEach(s=>{const k=x.n.indexOf(s);if(k>=0&&(pos<0||k<pos))pos=k});
 if(pos<0)return esc(T.slice(0,200));
 const a=Math.max(0,pos-60),b=Math.min(T.length,pos+140);
 const txt=T.slice(a,b),nt=norm(txt);
 const pre=(a>0?'…':''),post=(b<T.length?'…':'');
 if(nt.length!==txt.length)return pre+esc(txt)+post;
 const rg=[];
 st.forEach(s=>{let k=nt.indexOf(s);while(k>=0){let e=k+s.length;while(e<nt.length&&/[a-zа-я0-9]/.test(nt[e]))e++;rg.push([k,e]);k=nt.indexOf(s,e)}});
 rg.sort((m1,m2)=>m1[0]-m2[0]);
 const mg=[];
 rg.forEach(r=>{const l=mg[mg.length-1];if(l&&r[0]<=l[1])l[1]=Math.max(l[1],r[1]);else mg.push(r.slice())});
 let o='',last=0;
 mg.forEach(r=>{o+=esc(txt.slice(last,r[0]))+'<mark>'+esc(txt.slice(r[0],r[1]))+'</mark>';last=r[1]});
 o+=esc(txt.slice(last));
 return pre+o+post;
}

/* ===== Плавный переход к фрагменту + подсветка (как переход к цитате в Telegram) ===== */
function targetY(el){
 const hs=(document.querySelector('header')||{}).offsetHeight||70;
 const r=el.getBoundingClientRect(),H=window.innerHeight,top=r.top+window.scrollY,avail=H-hs;
 let y=r.height>avail*0.8?top-hs-24:top-hs-(avail-r.height)/2;
 y=Math.min(y,document.documentElement.scrollHeight-H);
 return Math.max(0,Math.round(y));
}
function afterScroll(cb){
 let last=-1,still=0,n=0;
 (function tick(){
  const y=window.scrollY;
  still=Math.abs(y-last)<1?still+1:0;
  last=y;n++;
  if(still>=8||n>400)return cb();
  requestAnimationFrame(tick);
 })();
}
function flash(els){
 els.forEach(e=>e.classList.add('np-flash'));
 void els[0].offsetWidth;
 els.forEach(e=>e.classList.add('np-on'));
 setTimeout(()=>{
  els.forEach(e=>e.classList.remove('np-on'));
  setTimeout(()=>els.forEach(e=>e.classList.remove('np-flash')),1100);
 },1400);
}

/* Слово → (пауза) → предложение. Подсветка ставится временными <span>, потом они снимаются */
let lastSt=[];
const BLOCK_SEL='p,li,td,th,dt,dd,h2,h3,summary,small,div,.prompt span';
function blockOf(t){
 const p=t.parentElement;
 if(p.tagName==='B'&&p.parentElement&&p.parentElement.matches('.card,.box'))return p;
 return p.closest(BLOCK_SEL)||p;
}
function findPlan(roots,st){
 const blocks=[];let curB=null;
 roots.forEach(root=>{
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{
   if(!n.nodeValue.trim())return NodeFilter.FILTER_REJECT;
   const pe=n.parentElement;
   if(!pe||pe.closest('svg,script,style,.copy'))return NodeFilter.FILTER_REJECT;
   return NodeFilter.FILTER_ACCEPT}});
  let n;
  while((n=w.nextNode())){
   const bl=blockOf(n);
   if(!curB||curB.el!==bl){curB={el:bl,nodes:[],s:''};blocks.push(curB)}
   curB.nodes.push({node:n,a:curB.s.length});
   curB.s+=n.nodeValue;
  }
 });
 let best=null;
 blocks.forEach(B=>{
  const n=norm(B.s);if(n.length!==B.s.length)return;
  const re=/[.!?…]+[»"”)]*\s+(?=[А-ЯЁA-Z«"(—–0-9])/g;
  const cuts=[0];let m;
  while((m=re.exec(B.s)))cuts.push(m.index+m[0].length);
  cuts.push(B.s.length);
  for(let k=0;k<cuts.length-1;k++){
   let a=cuts[k],e=cuts[k+1];
   while(a<e&&/\s/.test(B.s[a]))a++;
   while(e>a&&/\s/.test(B.s[e-1]))e--;
   if(e<=a)continue;
   const seg=n.slice(a,e);let c=0;
   st.forEach(x=>{if(seg.includes(x))c++});
   if(c&&(!best||c>best.c))best={c,B,n,a,e};
  }
 });
 if(!best)return null;
 const words=[];
 st.forEach(x=>{let k=best.n.indexOf(x,best.a);while(k>=0&&k<best.e){let e=k+x.length;while(e<best.e&&/[a-zа-я0-9]/.test(best.n[e]))e++;words.push([k,e]);k=best.n.indexOf(x,e)}});
 return{B:best.B,a:best.a,e:best.e,words};
}
function wrapPlan(pl){
 const spans=[];
 pl.B.nodes.forEach(nd=>{
  const len=nd.node.nodeValue.length,A=nd.a,E=nd.a+len;
  if(E<=pl.a||A>=pl.e)return;
  const cp=new Set([0,len]);
  [pl.a,pl.e].forEach(x=>{if(x>A&&x<E)cp.add(x-A)});
  pl.words.forEach(r=>r.forEach(x=>{if(x>A&&x<E)cp.add(x-A)}));
  const pts=[...cp].sort((x,y)=>x-y);
  let cur=nd.node,base=0;const pieces=[],par=nd.node.parentNode;
  for(let k=1;k<pts.length;k++){
   const len2=pts[k]-base,isLast=k===pts.length-1;
   const rest=isLast?null:cur.splitText(len2);
   const g0=A+base,g1=A+pts[k];
   if(g0>=pl.a&&g1<=pl.e&&cur.nodeValue.trim()){
    const sp=document.createElement('span');
    sp.className='np-s'+(pl.words.some(r=>g0>=r[0]&&g1<=r[1])?' np-w':'');
    cur.parentNode.insertBefore(sp,cur);sp.appendChild(cur);
    spans.push(sp);pieces.push(sp);
   }else pieces.push(cur);
   if(rest){cur=rest;base=pts[k]}
  }
  /* в flex-контейнерах (заголовки вопросов) текст должен остаться одним элементом */
  const dsp=getComputedStyle(par).display;
  if(pieces.length>1&&/flex|grid/.test(dsp)){
   const g=document.createElement('span');
   par.insertBefore(g,pieces[0]);pieces.forEach(x=>g.appendChild(x));
   spans.push(g);
  }
 });
 return spans;
}
function unwrapSpans(spans){
 const ps=new Set();
 spans.forEach(sp=>{const p=sp.parentNode;if(!p)return;while(sp.firstChild)p.insertBefore(sp.firstChild,sp);p.removeChild(sp);ps.add(p)});
 ps.forEach(p=>p.normalize());
}
function flashWords(spans){
 const ws=spans.filter(x=>x.classList.contains('np-w'));
 void spans[0].offsetWidth;
 ws.forEach(x=>x.classList.add('np-w-on'));
 setTimeout(()=>spans.forEach(x=>x.classList.add('np-s-on')),750);
 setTimeout(()=>{
  spans.forEach(x=>x.classList.remove('np-s-on','np-w-on'));
  setTimeout(()=>unwrapSpans(spans),1100);
 },2900);
}
function runHit(u,st){
 if(u<0)return;
 const el=collectUnits(main)[u];
 if(!el)return;
 const reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const group=[el];
 if(el.matches('details'))el.open=true;
 if(el.matches('dt')){const d=el.nextElementSibling;if(d&&d.matches('dd'))group.push(d)}
 let spans=[];
 try{const pl=findPlan(group,st);if(pl)spans=wrapPlan(pl)}catch(e){spans=[]}
 const tgt=spans.length?spans[0]:el;
 const done=()=>{if(spans.length)flashWords(spans);else flash(group)};
 if(!reduce){main.classList.add('np-in');setTimeout(()=>main.classList.remove('np-in'),600)}
 const go=cb=>{window.scrollTo({top:targetY(tgt),behavior:reduce?'auto':'smooth'});afterScroll(cb)};
 setTimeout(()=>go(()=>{
  if(Math.abs(targetY(tgt)-window.scrollY)>40)go(done);else done();
 }),reduce?0:200);
}


/* Переход к найденному: на этой же странице — сразу, на другой — через адрес ?h=…&q=… */
let saved=null;
function restoreMain(){
 if(saved===null)return;
 main.innerHTML=saved;saved=null;
 initNeuron();syncReadBtn();
}
function goHit(i,u){
 const st=lastSt.slice();
 if(i===CUR){q.value='';restoreMain();runHit(u,st);return}
 location.href=pages[i].url+(u>=0?'?h='+u+'&q='+encodeURIComponent(st.join(',')):'');
}
q.oninput=()=>{
 const v=q.value.trim();
 if(!v){restoreMain();return}
 if(saved===null)saved=main.innerHTML;
 const {st,res}=doSearch(v);lastSt=st;
 main.innerHTML=`<h1>Поиск</h1><p class="lead">Запрос: «${esc(v)}». Найдено: ${res.length}</p>`+
 (res.length?`<div class="cards">${res.map(x=>`<button type="button" class="card" onclick="goHit(${x.i},${x.u})">${I(x.p.ic)}<b>${x.p.t}</b><small>${x.u>=0?snippet(x.p.units[x.u],st):esc(x.p.lead)}</small></button>`).join('')}</div>`:'<p class="empty">Ничего не найдено. Попробуйте другое слово.</p>');
};

/* ===== Клики внутри содержимого ===== */
function copyText(btn){
 const t=btn.parentNode.querySelector('span').textContent,em=btn.querySelector('em');
 const done=()=>{em.textContent='Скопировано';setTimeout(()=>{em.textContent='Копировать'},1600)};
 const fb=()=>{const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(e){}document.body.removeChild(ta)};
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,fb);else fb();
}
main.addEventListener('click',e=>{
 const b=e.target.closest('.qo button');
 if(b){
  const qo=b.parentNode;if(qo.classList.contains('done'))return;
  qo.classList.add('done');
  b.classList.add('pick',b.dataset.ok?'ok':'no');
  qo.querySelector('[data-ok]').classList.add('ok');
  qo.parentNode.querySelector('.qe').hidden=false;
  const z=b.closest('.quiz'),tot=z.querySelectorAll('.qq').length,dn=z.querySelectorAll('.qo.done').length;
  if(dn===tot){
   const sc=z.querySelectorAll('button.pick.ok').length;
   z.querySelector('.qs').textContent='Результат: '+sc+' из '+tot+(sc===tot?' — отлично!':sc>=tot-1?' — хорошо, можно перечитать спорные места.':' — стоит перечитать раздел.');
  }
  return;
 }
 const c=e.target.closest('.copy');
 if(c){copyText(c);return}
 const t=e.target.closest('.toc a');
 if(t){
  e.preventDefault();
  const el=document.getElementById(t.getAttribute('href').slice(1));
  if(el){el.scrollIntoView({behavior:'smooth',block:'start'});el.tabIndex=-1;el.focus({preventScroll:true})}
 }
});
document.getElementById('skip').addEventListener('click',e=>{e.preventDefault();main.focus()});


document.getElementById('skip').addEventListener('click',e=>{e.preventDefault();main.focus()});

/* ===== Тема ===== */
function applyTheme(t){
 document.documentElement.setAttribute('data-theme',t);
 const b=document.getElementById('theme');
 if(b)b.innerHTML=I(t==='dark'?'sun':'moon');
}
let theme=null;
try{theme=localStorage.getItem('np_theme')}catch(e){}
if(theme!=='dark'&&theme!=='light'){
 theme=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';
}
applyTheme(theme);
document.getElementById('theme').onclick=()=>{
 theme=theme==='dark'?'light':'dark';
 try{localStorage.setItem('np_theme',theme)}catch(e){}
 applyTheme(theme);
};


/* ===== Кнопка «наверх» ===== */
const topBtn=document.getElementById('top');
window.addEventListener('scroll',()=>{topBtn.classList.toggle('show',window.scrollY>400)});
topBtn.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});


/* ===== Image Zoom ===== */
const overlay=document.getElementById('imgOverlay'),overlayImg=document.getElementById('imgOverlayImg'),overlayClose=document.querySelector('.img-overlay-close');
function openImageZoom(src,alt){
 overlayImg.src=src;
 overlayImg.alt=alt||'';
 overlay.classList.add('active');
 document.body.style.overflow='hidden';
}
function closeImageZoom(){
 overlay.classList.remove('active');
 document.body.style.overflow='';
}
overlayClose.onclick=closeImageZoom;
overlay.onclick=(e)=>{if(e.target===overlay)closeImageZoom()};
document.addEventListener('keydown',(e)=>{if(e.key==='Escape'&&overlay.classList.contains('active'))closeImageZoom()});
document.addEventListener('click',(e)=>{
 if(e.target.tagName==='IMG'&&e.target.closest('main')){
  openImageZoom(e.target.src,e.target.alt);
 }
});


/* ===== Старт ===== */
q.value='';
updateMenu();syncReadBtn();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(updateMenu);
if(CUR>=0){
 const qs=main.querySelector('section.quiz');
 if(qs&&pages[CUR].qz)qs.outerHTML=quizHtml(pages[CUR]);   /* варианты ответов перемешиваются */
 initNeuron();
}
(function(){
 const sp=new URLSearchParams(location.search),h=sp.get('h');
 if(h===null||CUR<0)return;
 const u=parseInt(h,10),st=(sp.get('q')||'').split(',').filter(Boolean);
 try{history.replaceState(null,'',location.pathname+location.hash)}catch(e){}
 if(u>=0)runHit(u,st);
})();
