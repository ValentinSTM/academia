/* ================= DIKTAT (STAV) =================
   Modul separat: nu modifică progresul existent al aplicației.
   Textele dictărilor sunt criptate în diktat.dat (din carte: „Kopiering forbudt”).
   După parola de familie, textele se salvează doar pe acest telefon și merg offline. */
(function(){
const DATA_KEY='academia_diktat_data';
const PKEY=(typeof LS==='string'?LS:'academia_v1')+'_diktat';
const PROPER=new Set(['danmark','norge','sverige','afrika','sten']);
const DA=()=>typeof S!=='undefined'&&S.lang==='da';
const TX={
  btn:['Dictare','Diktat'], btnSub:['Ascultă în daneză și scrie','Lyt på dansk og skriv'],
  title:['Dictare – STAV 3','Diktat – STAV 3'],
  lockP:['Textele sunt din cartea de la școală, așa că sunt încuiate cu parola familiei. O scrii o singură dată pe telefonul ăsta, apoi merge și fără internet.','Teksterne er fra skolebogen, så de er låst med familiens kodeord. Du skriver det én gang på denne telefon, og så virker det også uden internet.'],
  pass:['Parola familiei','Familiens kodeord'], open:['Deschide','Åbn'],
  wrongPass:['Parola nu e bună. Mai încearcă.','Forkert kodeord. Prøv igen.'],
  netErr:['Prima dată e nevoie de internet ca să descarc textele.','Første gang skal der være internet for at hente teksterne.'],
  level:['Nivelul tău','Dit niveau'], words:['cuvinte','ord'],
  mix:['Test amestecat','Blandet test'], mixSub:['Cuvinte din toate dictările, amestecate','Ord fra alle diktater, blandet'], all:['Toate','Alle'],
  hard:['Cuvintele mele grele','Mine svære ord'], hardNone:['Încă niciun cuvânt greu. Bravo!','Ingen svære ord endnu. Flot!'],
  learn:['Învață cuvintele','Lær ordene'], test:['Orddiktat','Orddiktat'], full:['Toată dictarea','Hele diktaten'],
  listen:['Ascultă','Hør'], slow:['Rar','Langsomt'], inSent:['În propoziție','I sætningen'],
  write:['Scrie cuvântul:','Skriv ordet:'], check:['Verifică','Tjek'], next:['Următorul','Næste'],
  right:['Corect!','Rigtigt!'], again:['Aproape! Ascultă încă o dată și mai încearcă.','Næsten! Lyt igen og prøv en gang til.'],
  spelled:['Se scrie:','Det staves:'], capital:['Aproape! Ăsta se scrie cu literă mare.','Næsten! Det skal skrives med stort.'],
  wordOf:(i,n)=>[`Cuvântul ${i} din ${n}`,`Ord ${i} af ${n}`],
  score:(r,n)=>[`${r} din ${n} corecte din prima`,`${r} af ${n} rigtige i første forsøg`],
  practiceWrong:['Exersează cuvintele greșite','Øv de forkerte ord'], restart:['De la început','Forfra'],
  allRight:['Toate din prima! Super!','Alle i første forsøg! Super!'],
  part:(i,n)=>[`Bucata ${i} din ${n}`,`Del ${i} af ${n}`], repeat:['Repetă','Gentag'], prev:['Înapoi','Forrige'],
  nextPart:['Bucata următoare','Næste del'], done:['Gata','Færdig'],
  punct:['Spune „komma” și „punktum”','Sig »komma« og »punktum«'], sentFirst:['Citește întâi toată propoziția','Læs hele sætningen først'],
  showText:['Arată textul (ca să corectezi)','Vis teksten (til at rette)'],
  goodJob:['Godt arbejde! Nu kan du rette din diktat.','Godt arbejde! Nu kan du rette din diktat.'],
  voice:['Vocea daneză','Dansk stemme'], speed:['Viteza','Tempo'],
  noVoice:['Nu am găsit o voce daneză pe telefon. Android: Setări → Accesibilitate → Text în vorbire → Google → descarcă „Dansk”. iPhone: Setări → Accesibilitate → Conținut vorbit → Voci → Dansk → „Sara (Îmbunătățită)”.','Der er ingen dansk stemme på telefonen. Android: Indstillinger → Hjælpefunktioner → Tekst til tale → Google → hent »Dansk«. iPhone: Indstillinger → Tilgængelighed → Oplæst indhold → Stemmer → Dansk → »Sara (forbedret)«.'],
  back:['⬅ Înapoi','⬅ Tilbage'], tips:['La ce să fii atentă','Pas på'], meaning:['În română','På rumænsk'],
  stars:n=>[`+${n} ⭐`,`+${n} ⭐`]
};
const T=(k,...a)=>{const v=TX[k];const x=typeof v==='function'?v(...a):v;return x[DA()?1:0];};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const box=()=>document.getElementById('dkBox');

/* ---------- stare (separată de progresul principal) ---------- */
function loadP(){try{return Object.assign({best:{},hard:{},level:1,rate:.85,voice:'',punct:true,full:false},JSON.parse(localStorage.getItem(PKEY)||'{}'));}catch(e){return {best:{},hard:{},level:1,rate:.85,voice:'',punct:true,full:false};}}
let P=loadP();
const saveP=()=>{try{localStorage.setItem(PKEY,JSON.stringify(P));}catch(e){}};
let D=null;
function loadData(){try{const j=localStorage.getItem(DATA_KEY);if(j){D=prep(JSON.parse(j));}}catch(e){D=null;}}

/* ---------- decriptare (AES-GCM, cheie din parolă cu PBKDF2) ---------- */
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function unlock(pw){
  const r=await fetch('diktat.dat',{cache:'no-cache'});if(!r.ok)throw new Error('net');
  const f=await r.json(),enc=new TextEncoder();
  const base=await crypto.subtle.importKey('raw',enc.encode(pw.trim().toLowerCase().replace(/\s+/g,' ')),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(f.salt),iterations:f.iter,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
  let plain;try{plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(f.iv)},key,b64(f.ct));}catch(e){throw new Error('pass');}
  const txt=new TextDecoder().decode(plain);localStorage.setItem(DATA_KEY,txt);D=prep(JSON.parse(txt));
}
/* actualizare: dacă diktat.dat are o versiune nouă, se decriptează cu aceeași parolă (ținută doar pe telefon) */
async function refresh(){try{const pw=localStorage.getItem(DATA_KEY+'_k');if(!pw||!navigator.onLine)return;const r=await fetch('diktat.dat',{cache:'no-cache'});if(!r.ok)return;const f=await r.json();if(D&&f.v<=D.v)return;await unlock(pw);}catch(e){}}

/* ---------- pregătirea textelor ---------- */
function prep(d){
  d.dictations.forEach(x=>{
    const toks=[];x.raw.replace(/\n/g,' ¶ ').split(/\s+/).forEach(t=>{if(t==='¶'){toks.push({br:1});return;}const m=t.match(/^([123])(.+)$/);toks.push(m?{t:m[2],l:+m[1]}:{t,l:0});});
    const sents=[];let cur=[];toks.forEach(tk=>{if(tk.br){if(cur.length){sents.push(cur);cur=[];}return;}tk.s=sents.length;cur.push(tk);if(/[.!?:]$/.test(tk.t)){sents.push(cur);cur=[];}});if(cur.length)sents.push(cur);
    x.toks=toks.filter(t=>!t.br);x.sents=sents;x.paras=x.raw.split('\n').length;
    x.words=x.toks.filter(t=>t.l).map(t=>{const c=t.t.replace(/[.,!?:]/g,'');const lw=c.toLowerCase();return {w:PROPER.has(lw)?c:lw,l:t.l,s:t.s,n:x.n};});
    const ph=[];sents.forEach((sen,si)=>{let part=[];const push=()=>{if(!part.length)return;if(part.length>7){const h=Math.ceil(part.length/2);ph.push({tk:part.slice(0,h),s:si});ph.push({tk:part.slice(h),s:si});}else ph.push({tk:part,s:si});part=[];};
      sen.forEach(tk=>{part.push(tk);if(/[,:]$/.test(tk.t))push();});push();});
    x.phrases=ph;
  });
  return d;
}
const sText=(x,i)=>x.sents[i].map(t=>t.t).join(' ');
const note=w=>(D&&D.notes[w.toLowerCase()])||{ro:'',tips:[]};

/* ---------- voce daneză ---------- */
let voices=[],UT=null;
function vscore(v){let s=0;if(/natural|neural|online/i.test(v.name))s+=4;if(/enhanced|premium|forbedret|siri/i.test(v.name))s+=3;if(/google/i.test(v.name))s+=1;if(/da[-_]dk/i.test(v.lang))s+=1;return s;}
function loadVoices(){try{voices=speechSynthesis.getVoices().filter(v=>/^da/i.test(v.lang)).sort((a,b)=>vscore(b)-vscore(a));}catch(e){voices=[];}}
if('speechSynthesis' in window){loadVoices();try{speechSynthesis.addEventListener('voiceschanged',loadVoices);}catch(e){}}
function dkSay(txt,rate){
  try{const ss=window.speechSynthesis;if(!ss)return;
    const go=()=>{UT=new SpeechSynthesisUtterance(txt);const v=voices.find(x=>x.name===P.voice)||voices[0];if(v)UT.voice=v;UT.lang=v?v.lang:'da-DK';UT.rate=rate||P.rate;ss.resume();ss.speak(UT);};
    if(ss.speaking||ss.pending){ss.cancel();setTimeout(go,150);}else go();
  }catch(e){}
}
const stop=()=>{try{speechSynthesis.cancel();}catch(e){}};

/* ---------- diferențe între ce a scris și cuvântul corect ---------- */
function diffHTML(a,b){ // a=ce a scris, b=corect → b cu literele greșite/lipsă marcate
  a=a.toLowerCase();const B=b.toLowerCase(),n=a.length,m=B.length,d=[...Array(n+1)].map(()=>Array(m+1).fill(0));
  for(let i=0;i<=n;i++)d[i][0]=i;for(let j=0;j<=m;j++)d[0][j]=j;
  for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===B[j-1]?0:1));
  const bad=new Set();let i=n,j=m;
  while(i>0||j>0){if(i>0&&j>0&&d[i][j]===d[i-1][j-1]+(a[i-1]===B[j-1]?0:1)){if(a[i-1]!==B[j-1])bad.add(j-1);i--;j--;}else if(j>0&&d[i][j]===d[i][j-1]+1){bad.add(j-1);j--;}else{if(j<m)bad.add(j);else if(m)bad.add(m-1);i--;}}
  return [...b].map((c,k)=>bad.has(k)?`<b class="dkx">${esc(c)}</b>`:esc(c)).join('');
}

/* ---------- ecrane ---------- */
let curD=null,tab='learn';
function header(title,backFn){return `<div class="row" style="justify-content:space-between;flex-wrap:nowrap;margin-bottom:8px"><h2 style="margin:0">${esc(title)}</h2><button class="btn sec sm" onclick="${backFn}">${T('back')}</button></div>`;}
function renderLock(msg){
  box().innerHTML=header('📝 '+T('title'),"go('home')")+`<p>${T('lockP')}</p>
  <p style="margin:12px 0 4px"><b>${T('pass')}</b></p><input type="text" id="dkPw" autocomplete="off" autocapitalize="off" spellcheck="false" style="width:100%;font-size:20px;padding:10px;border-radius:12px;border:2px solid #e3dbff">
  <p id="dkMsg" style="color:var(--bad);font-weight:700;min-height:1.4em">${msg?esc(msg):''}</p>
  <button class="btn" id="dkOpen">${T('open')}</button>`;
  const go_=async()=>{const pw=document.getElementById('dkPw').value;if(!pw.trim())return;document.getElementById('dkOpen').disabled=true;
    try{await unlock(pw);try{localStorage.setItem(DATA_KEY+'_k',pw);}catch(e){}renderList();}catch(e){renderLock(e.message==='pass'?T('wrongPass'):T('netErr'));}};
  document.getElementById('dkOpen').onclick=go_;document.getElementById('dkPw').addEventListener('keydown',e=>{if(e.key==='Enter')go_();});
}
function levelChips(){return `<div class="chips" style="margin:6px 0 12px">${[1,2,3].map(l=>`<button class="chip ${P.level===l?'on':''}" onclick="dkLevel(${l})">${DA()?l+'-ord':'Nivel '+l}</button>`).join('')}</div>`;}
function renderList(){
  curD=null;stop();
  const hardN=Object.keys(P.hard).length;
  box().innerHTML=header('📝 '+T('title'),"go('home')")+`<p style="margin:0"><b>${T('level')}</b></p>${levelChips()}
  <div class="list">${D.dictations.map(x=>{const b=P.best[x.n+'-'+P.level];const tot=x.words.filter(w=>w.l===P.level).length;
    return `<div class="li" onclick="dkOpen(${x.n})"><span style="font-size:18px">${x.n}. ${esc(x.title)}</span><span class="muted">${b==null?'➜':(b===tot?'⭐ ':'')+b+'/'+tot}</span></div>`;}).join('')}</div>
  <div style="margin-top:14px;padding:12px;border-radius:14px;background:#fff4ec;border:2px solid #f0803c">
   <b style="font-size:18px">🎲 ${T('mix')}</b><div class="muted" style="font-size:14px;margin:2px 0 8px">${T('mixSub')} · ${DA()?P.level+'-ord':'Nivel '+P.level}${P.best['mix-'+P.level]!=null?' · ⭐ '+P.best['mix-'+P.level]:''}</div>
   <div class="row">${[10,20,0].map(n=>`<button class="btn sm" style="background:#e0662b" onclick="dkMix(${n})">${n||T('all')}</button>`).join('')}</div></div>
  <button class="btn sec" style="margin-top:14px;width:100%" onclick="dkHard()">💪 ${T('hard')} (${hardN})</button>
  ${voiceBox()}`;
  bindVoice();
}
function voiceBox(){
  loadVoices();
  return `<div style="margin-top:16px;padding:12px;border:2px dashed #e3dbff;border-radius:14px;font-size:15px">
   <b>🔊 ${T('voice')}</b>${voices.length?`<select id="dkVoice" style="width:100%;font-size:16px;padding:8px;margin:6px 0;border-radius:10px">${voices.map(v=>`<option ${v.name===P.voice?'selected':''}>${esc(v.name)}</option>`).join('')}</select>`:`<p class="muted" style="margin:6px 0">${T('noVoice')}</p>`}
   <div class="row"><span>${T('speed')}</span><input type="range" id="dkRate" min=".55" max="1.05" step=".05" value="${P.rate}" style="flex:1"><button class="btn sec sm" onclick="dkSayTest()">▶</button></div></div>`;
}
function bindVoice(){const v=document.getElementById('dkVoice');if(v)v.onchange=()=>{P.voice=v.value;saveP();dkSay('Hej! Nu skal vi skrive diktat.');};
  const r=document.getElementById('dkRate');if(r)r.onchange=()=>{P.rate=+r.value;saveP();dkSay('Egernet hopper fra træ til træ.');};}

function openD(n){curD=D.dictations.find(x=>x.n===n);tab='learn';renderD();}
function renderD(){
  stop();const x=curD;
  box().innerHTML=header(`${x.n}. ${x.title}`,'dkList()')+levelChips()+
   `<div class="chips" style="margin-bottom:12px">${[['learn','📖 '+T('learn')],['test','✏️ '+T('test')],['full','🎧 '+T('full')]].map(([k,l])=>`<button class="chip ${tab===k?'on':''}" onclick="dkTab('${k}')">${l}</button>`).join('')}</div><div id="dkPane"></div>`;
  if(tab==='learn')renderLearn();else if(tab==='test')startTest(x.words.filter(w=>w.l===P.level));else renderFull();
}
function tipsHTML(w){const nt=note(w);const tips=nt.tips.map(t=>t[DA()?0:1]);
  return `${nt.ro?`<div class="muted" style="font-size:15px">🇷🇴 ${esc(nt.ro)}</div>`:''}${tips.length?`<ul style="margin:4px 0 0;padding-left:20px;font-size:15px">${tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}`;}
function renderLearn(){
  const ws=curD.words.filter(w=>w.l===P.level);
  document.getElementById('dkPane').innerHTML=ws.map((w,i)=>`<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid #eee9ff">
    <button class="iconbtn" onclick="dkSayW(${i})" aria-label="${T('listen')}">🔊</button>
    <div style="flex:1;min-width:0"><div style="font-size:24px;font-weight:900;letter-spacing:.5px">${esc(w.w)}</div>${tipsHTML(w.w)}</div></div>`).join('');
  window.dkSayW=i=>dkSay(ws[i].w);
}

/* --- test cuvinte --- */
let list=[],idx=0,wrong=[],first=true,checked=false,right=0,mode='dict',base='dict',mixN=20;
function startTest(ws,m){
  list=ws.slice().sort(()=>Math.random()-.5);idx=0;wrong=[];right=0;mode=m||'dict';if(mode!=='retry')base=mode;showWord();
}
function pane(){return document.getElementById('dkPane')||box();}
function showWord(){
  first=true;checked=false;const w=list[idx];
  pane().innerHTML=`<p class="muted" style="margin:0 0 6px">${T('wordOf',idx+1,list.length)}${base!=='dict'?' · '+esc(D.dictations.find(x=>x.n===w.n).title):''}</p>
  <button class="big-btn hero" style="width:100%;margin:0 0 10px" onclick="dkSayCur()"><span class="ico">🔊</span><span>${T('listen')}</span></button>
  <div class="row" style="margin-bottom:10px"><button class="btn sec sm" onclick="dkSayCur(1)">🐢 ${T('slow')}</button><button class="btn sec sm" onclick="dkSayCur(2)">💬 ${T('inSent')}</button></div>
  <p style="margin:6px 0 4px"><b>${T('write')}</b></p>
  <input type="text" id="dkAns" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" style="width:100%;font-size:28px;padding:10px 14px;border-radius:14px;border:3px solid #e3dbff">
  <div id="dkFb" class="fb" style="margin:10px 0;min-height:48px;border-radius:14px;padding:10px 12px;font-size:18px"></div>
  <div class="row"><button class="btn ok" id="dkChk">${T('check')}</button><button class="btn sec" id="dkNext">${T('next')} ➜</button></div>`;
  const a=document.getElementById('dkAns');
  document.getElementById('dkChk').onclick=check;document.getElementById('dkNext').onclick=next;
  a.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();checked?next():check();}});
  setTimeout(()=>dkSayCur(),250);
}
window.dkSayCur=k=>{const w=list[idx];if(!w)return;const x=D.dictations.find(d=>d.n===w.n);
  if(k===2)dkSay(w.w+'. ... '+sText(x,w.s)+' ... '+w.w+'.');else dkSay(w.w,k===1?Math.max(.5,P.rate-.25):0);
  const a=document.getElementById('dkAns');if(a&&k!==2)a.focus({preventScroll:true});};
function check(){
  const a=document.getElementById('dkAns'),v=a.value.trim().replace(/\s+/g,' ');if(!v||checked)return;
  const w=list[idx],fb=document.getElementById('dkFb'),key=w.w.toLowerCase();
  const exact=v===w.w||(!PROPER.has(key)&&v.toLowerCase()===key);
  if(exact){fb.className='fb good';fb.innerHTML=`✅ ${T('right')} <b style="font-size:22px">${esc(w.w)}</b>`;if(first){right++;if(P.hard[key]){P.hard[key].c--;if(P.hard[key].c<=0)delete P.hard[key];saveP();}}
    checked=true;try{sound&&sound('ok');}catch(e){}return;}
  const capOnly=v.toLowerCase()===key;
  if(first){first=false;if(!wrong.includes(w))wrong.push(w);P.hard[key]={w:w.w,n:w.n,s:w.s,c:2};saveP();
    fb.className='fb slow';fb.innerHTML=(capOnly?T('capital'):T('again'))+`<div style="margin-top:6px">${tipsHTML(w.w)}</div>`;a.select();try{sound&&sound('bad');}catch(e){}dkSayCur(1);return;}
  checked=true;fb.className='fb bad';fb.innerHTML=`${T('spelled')} <b style="font-size:26px;letter-spacing:1px">${diffHTML(v,w.w)}</b><div style="margin-top:6px">${tipsHTML(w.w)}</div>`;
}
function next(){if(idx<list.length-1){idx++;showWord();}else finish();}
function finish(){
  stop();let st=0;
  if((mode==='dict'&&curD)||mode==='mix'){const k=mode==='mix'?'mix-'+P.level:curD.n+'-'+P.level;P.best[k]=Math.max(P.best[k]||0,right);saveP();
    st=right;try{if(st&&typeof S!=='undefined'){S.stars+=st;save();updateHeader();}}catch(e){}}
  pane().innerHTML=`<h2 style="margin:6px 0">${T('score',right,list.length)}</h2>${st?`<p style="font-size:22px;font-weight:900">${T('stars',st)}</p>`:''}
   ${wrong.length?`<p>${T('practiceWrong')}:</p><p style="font-size:20px;font-weight:800">${wrong.map(w=>esc(w.w)).join(' · ')}</p>
   <div class="row"><button class="btn" onclick="dkRetry()">${T('practiceWrong')}</button><button class="btn sec" onclick="dkRestart()">${T('restart')}</button></div>`
   :`<p style="font-size:20px">🎉 ${T('allRight')}</p><button class="btn sec" onclick="dkRestart()">${T('restart')}</button>`}`;
  if(!wrong.length&&right){try{burst&&burst();sound&&sound('great');}catch(e){}}
}
window.dkRetry=()=>startTest(wrong.slice(),'retry');
window.dkRestart=()=>{if(base==='hard')dkHard();else if(base==='mix')dkMix(mixN);else startTest(curD.words.filter(w=>w.l===P.level));};
window.dkMix=n=>{curD=null;mixN=n;const seen=new Set(),pool=[];D.dictations.forEach(x=>x.words.forEach(w=>{const k=w.w.toLowerCase();if(w.l===P.level&&!seen.has(k)){seen.add(k);pool.push(w);}}));
  pool.sort(()=>Math.random()-.5);box().innerHTML=header('🎲 '+T('mix'),'dkList()')+'<div id="dkPane"></div>';startTest(n?pool.slice(0,n):pool,'mix');};
window.dkHard=()=>{curD=null;const ws=Object.values(P.hard).map(h=>({w:h.w,n:h.n,s:h.s}));
  box().innerHTML=header('💪 '+T('hard'),'dkList()')+'<div id="dkPane"></div>';
  if(!ws.length){pane().innerHTML=`<p style="font-size:18px">${T('hardNone')}</p>`;return;}startTest(ws,'hard');};

/* --- toată dictarea --- */
let p=0;
function phraseText(i){let t=curD.phrases[i].tk.map(x=>x.t).join(' ');if(P.punct)t=t.replace(/,$/,', komma.').replace(/:$/,': kolon.').replace(/\?$/,'? spørgsmålstegn.').replace(/\.$/,'. punktum.');return t;}
function sayPhrase(){const ph=curD.phrases[p],t=phraseText(p);
  if(P.full&&(p===0||curD.phrases[p-1].s!==ph.s))dkSay(sText(curD,ph.s)+' ... '+t);else dkSay(t);}
function renderFull(){p=0;drawFull();}
function drawFull(){
  const n=curD.phrases.length,set=new Set(curD.phrases[p].tk);
  pane().innerHTML=`<p class="muted" style="margin:0 0 6px">${T('part',p+1,n)}</p>
  <button class="big-btn hero" style="width:100%;margin:0 0 10px" onclick="dkRep()"><span class="ico">🔁</span><span>${T('repeat')}</span></button>
  <div class="row" style="margin-bottom:10px"><button class="btn sec" onclick="dkPrev()" ${p?'':'disabled'}>⬅ ${T('prev')}</button><button class="btn ok" onclick="dkNextP()">${p===n-1?T('done'):T('nextPart')+' ➜'}</button></div>
  <label class="ck"><input type="checkbox" id="dkPunct" ${P.punct?'checked':''}><span>${T('punct')}</span></label>
  <label class="ck"><input type="checkbox" id="dkFull" ${P.full?'checked':''}><span>${T('sentFirst')}</span></label>
  <label class="ck"><input type="checkbox" id="dkShow" ${showText?'checked':''}><span>${T('showText')}</span></label>
  ${showText?`<div style="line-height:2;font-size:18px;margin-top:8px;user-select:text">${curD.sents.map(s=>s.map(tk=>{let h=esc(tk.t);if(tk.l===P.level){const m=tk.t.match(/^(.*?)([.,!?:]?)$/);h=`<mark style="background:#ffe9a8;border-radius:4px;padding:0 2px">${esc(m[1])}</mark>${esc(m[2])}`;}return set.has(tk)?`<span style="outline:2px dashed var(--pri);border-radius:4px">${h}</span>`:h;}).join(' ')).join(' ')}</div>`:''}`;
  document.getElementById('dkPunct').onchange=e=>{P.punct=e.target.checked;saveP();};
  document.getElementById('dkFull').onchange=e=>{P.full=e.target.checked;saveP();};
  document.getElementById('dkShow').onchange=e=>{showText=e.target.checked;drawFull();};
}
let showText=false;
window.dkRep=sayPhrase;
window.dkPrev=()=>{if(p>0){p--;drawFull();sayPhrase();}};
window.dkNextP=()=>{if(p<curD.phrases.length-1){p++;drawFull();sayPhrase();}else{showText=true;drawFull();dkSay(T('goodJob'));}};

/* ---------- legături globale ---------- */
window.dkList=()=>{showText=false;renderList();};
window.dkOpen=openD;
window.dkTab=k=>{tab=k;showText=false;renderD();};
window.dkLevel=l=>{P.level=l;saveP();curD?renderD():renderList();};
window.dkSayTest=()=>dkSay('Hej! Jeg læser diktaten op for dig.');
window.openDiktat=()=>{go('diktat');loadData();if(D){renderList();refresh();}else renderLock();};
function homeLabel(){const a=document.getElementById('bDkT'),b=document.getElementById('bDkS');if(a)a.textContent=T('btn');if(b)b.textContent=T('btnSub');}
if(typeof renderHome==='function'){const _rh=renderHome;window.renderHome=function(){_rh.apply(this,arguments);homeLabel();};}
homeLabel();
const st=document.createElement('style');st.textContent='.dkx{color:var(--bad);text-decoration:underline}#dkBox .chip{min-height:44px}#dkBox input[type=text]{user-select:text;-webkit-user-select:text}';document.head.appendChild(st);
})();
