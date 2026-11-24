#!/usr/bin/env node
// commands/*.md 를 읽어 검색 가능한 단일 HTML(index.html)로 생성한다.
// 원본은 마크다운. 이 파일은 산출물이므로 직접 편집하지 말 것.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'commands');
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// 노트 본문의 마크다운 인라인 문법을 변환한다 (이스케이프 후 적용).
// 코드 구간을 먼저 떼어내야 코드 안의 ** 가 굵게 처리되지 않는다.
const inline = s => esc(s)
  .split(/(`[^`]+`)/)
  .map(part => part.startsWith('`') && part.endsWith('`')
    ? `<code class="ic">${part.slice(1, -1)}</code>`
    : part.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'))
  .join('');

function parse(md) {
  const lines = md.split('\n');
  let area = 'untitled';
  const items = [];
  let cur = null, inCode = false;

  for (const line of lines) {
    if (!inCode && line.startsWith('# ')) { area = line.slice(2).trim(); continue; }
    if (!inCode && line.startsWith('## ')) {
      if (cur) items.push(cur);
      cur = { title: line.slice(3).trim(), code: [], notes: [] };
      continue;
    }
    if (!cur) continue;
    if (line.trim().startsWith('```')) { inCode = !inCode; continue; }
    if (inCode) { cur.code.push(line); continue; }
    const m = line.match(/^-\s+\*\*(.+?)\*\*:\s*(.+)$/);
    if (m) cur.notes.push({ label: m[1], text: m[2] });
  }
  if (cur) items.push(cur);
  return { area, items };
}

const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => f.endsWith('.md')).sort() : [];
const groups = files
  .map(f => ({ file: path.basename(f, '.md'), ...parse(fs.readFileSync(path.join(DIR, f), 'utf8')) }))
  .filter(g => g.items.length);
// INDEX.md 링크(commands/x.md#제목)와 같은 규칙으로 앵커를 만든다.
const slug = s => s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s/g, '-');  // GitHub처럼 공백 하나당 '-' 하나
groups.forEach(g => g.items.forEach(it => { it.id = `${g.file}-${slug(it.title)}`; }));
const total = groups.reduce((n, g) => n + g.items.length, 0);

// ── INDEX.md(상황별 색인) → 메인 화면 ─────────────────────────
// 형식: "## 섹션" 아래 "- **상황** → [영역](commands/<file>.md#<제목 앵커>)"
const ids = new Set(groups.flatMap(g => g.items.map(it => it.id)));
const areaName = Object.fromEntries(groups.map(g => [g.file, g.area]));
const indexSections = [];
const brokenLinks = [];
const indexPath = path.join(__dirname, 'INDEX.md');
if (fs.existsSync(indexPath)) {
  let sec = null;
  for (const line of fs.readFileSync(indexPath, 'utf8').split('\n')) {
    if (line.startsWith('## ')) { sec = { title: line.slice(3).trim(), entries: [] }; indexSections.push(sec); continue; }
    const m = line.match(/^-\s+\*\*(.+?)\*\*\s*→\s*\[[^\]]*\]\(commands\/([^)#]+)\.md#([^)]+)\)/);
    if (!m || !sec) continue;
    const [, text, file, anchor] = m;
    const id = `${file}-${slug(decodeURIComponent(anchor))}`;
    if (!ids.has(id)) brokenLinks.push(`${text} → ${file}#${anchor}`);
    sec.entries.push({ text, file, id });
  }
}

const home = `
<section id="home">
  <h2 class="home-h">영역</h2>
  <div class="cards">${groups.map(g => `
    <a class="card" href="#${esc(g.file)}"><span class="card-name">${esc(g.area)}</span><span class="card-n">${g.items.length}</span></a>`).join('')}
  </div>
  ${indexSections.length ? `<h2 class="home-h">상황별 색인</h2>
  <div class="situations">${indexSections.filter(s => s.entries.length).map(s => `
    <div class="sit">
      <h3>${esc(s.title)}</h3>
      <ul>${s.entries.map(e => `<li><a href="#${esc(e.id)}">${inline(e.text)}</a><span class="sit-area">${esc(areaName[e.file] || e.file)}</span></li>`).join('')}</ul>
    </div>`).join('')}
  </div>` : ''}
</section>`;

const LABEL_CLASS = { '언제': 'when', '주의': 'warn', '연관': 'rel' };

const body = groups.map(g => `
<section class="area" id="${esc(g.file)}" data-area="${esc(g.area)}">
  <h2>${esc(g.area)}</h2>
  ${g.items.map(it => {
    const code = it.code.join('\n').trim();
    const hay = [g.area, it.title, code, ...it.notes.map(n => n.label + ' ' + n.text)].join(' ').toLowerCase();
    return `<article class="cmd" id="${esc(it.id)}" data-search="${esc(hay)}">
      <h3>${esc(it.title)}</h3>
      <div class="codewrap">
        <div class="codebar"><button class="copy" type="button">복사</button></div>
        <pre><code>${esc(code)}</code></pre>
      </div>
      ${it.notes.length ? `<ul class="notes">${it.notes.map(n =>
        `<li class="${LABEL_CLASS[n.label] || 'note'}"><span class="lb">${esc(n.label)}</span>${inline(n.text)}</li>`
      ).join('')}</ul>` : ''}
    </article>`;
  }).join('\n')}
</section>`).join('\n');

// 영역별 목차. 영역을 누르면 펼쳐지고, 항목을 누르면 해당 명령어로 이동한다.
const toc = groups.map(g => `
<details class="toc-area" data-area="${esc(g.file)}">
  <summary><span class="toc-name">${esc(g.area)}</span><span class="toc-n">${g.items.length}</span></summary>
  <ul>${g.items.map(it => `<li><a href="#${esc(it.id)}" data-target="${esc(it.id)}">${esc(it.title)}</a></li>`).join('')}</ul>
</details>`).join('');

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>운영 명령어</title>
<style>
:root{
  --bg:#fbfbfa; --surface:#fff; --border:#e4e2dd; --text:#1f1e1c; --muted:#75716b;
  --accent:#b8543a; --code-bg:#f4f2ee; --warn:#a9631c; --when:#3c6b52; --rel:#5a5670;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --bg:#191817; --surface:#211f1e; --border:#37342f; --text:#eae8e4; --muted:#9c968d;
    --accent:#e08a6d; --code-bg:#171615; --warn:#d9a05b; --when:#7fb195; --rel:#a49fb8;
  }
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);
  font-family:-apple-system,BlinkMacSystemFont,"Pretendard","Apple SD Gothic Neo",sans-serif;
  line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:1200px;margin:0 auto;padding:0 16px;display:grid;grid-template-columns:260px minmax(0,1fr);gap:36px}
main{padding:40px 0 80px;min-width:0}
.toc{position:sticky;top:0;align-self:start;max-height:100vh;overflow-y:auto;padding:40px 4px 40px 0;font-size:.84rem}
.toc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.toc-title{font-size:.76rem;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);font-weight:600}
.toc-btn{padding:2px 9px;font-size:.72rem;font-family:inherit;color:var(--muted);background:transparent;
  border:1px solid var(--border);border-radius:5px;cursor:pointer}
.toc-btn:hover{color:var(--text);border-color:var(--muted)}
#toc-toggle{display:none}
.toc-area{border-bottom:1px solid var(--border)}
.toc-area summary{list-style:none;display:flex;align-items:center;gap:8px;padding:8px 6px;cursor:pointer;
  font-weight:600;border-radius:6px}
.toc-area summary::-webkit-details-marker{display:none}
.toc-area summary::before{content:"";width:6px;height:6px;flex:none;border-right:1.5px solid var(--muted);
  border-bottom:1.5px solid var(--muted);transform:rotate(-45deg);transition:transform .15s}
.toc-area[open] summary::before{transform:rotate(45deg)}
.toc-area summary:hover{background:var(--code-bg)}
.toc-area.current summary .toc-name{color:var(--accent)}
.toc-name{flex:1;min-width:0}
.toc-n{font-size:.7rem;color:var(--muted);font-weight:500;font-variant-numeric:tabular-nums}
.toc-area ul{list-style:none;margin:0 0 8px;padding:0 0 0 14px}
.toc-area li a{display:block;padding:4px 8px;color:var(--muted);text-decoration:none;border-left:2px solid var(--border);
  line-height:1.45}
.toc-area li a:hover{color:var(--text)}
.toc-area li a.active{color:var(--accent);border-left-color:var(--accent)}
.toc-area li.hide{display:none}
.cmd{scroll-margin-top:96px}
.area{scroll-margin-top:96px}
header{margin-bottom:28px}
h1{font-size:1.5rem;margin:0 0 4px;letter-spacing:-.02em}
.sub{color:var(--muted);font-size:.85rem;margin:0}
.searchbar{position:sticky;top:0;z-index:10;padding:14px 0 12px;background:var(--bg);
  border-bottom:1px solid var(--border);margin-bottom:24px}
#q{width:100%;padding:11px 14px;font-size:.95rem;font-family:inherit;color:var(--text);
  background:var(--surface);border:1px solid var(--border);border-radius:8px;outline:none}
#q:focus{border-color:var(--accent)}
#count{font-size:.78rem;color:var(--muted);margin-top:7px}
.area{margin-bottom:34px}
.area h2{font-size:.76rem;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);
  font-weight:600;margin:0 0 12px;padding-bottom:7px;border-bottom:1px solid var(--border)}
.cmd{background:var(--surface);border:1px solid var(--border);border-radius:10px;
  padding:16px 18px;margin-bottom:12px}
.cmd h3{font-size:1rem;margin:0 0 11px;font-weight:600;letter-spacing:-.01em}
.codebar{display:flex;justify-content:flex-end;margin-bottom:5px}
.copy{padding:3px 11px;font-size:.72rem;font-family:inherit;color:var(--muted);
  background:transparent;border:1px solid var(--border);border-radius:5px;cursor:pointer;
  transition:color .15s,border-color .15s}
.copy:hover{color:var(--text);border-color:var(--muted)}
.copy.done{color:var(--when);border-color:var(--when)}
pre{margin:0;padding:13px 15px;background:var(--code-bg);border-radius:7px;overflow-x:auto}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.82rem;line-height:1.65;
  white-space:pre;color:var(--text)}
.notes{list-style:none;margin:12px 0 0;padding:0;font-size:.855rem}
.notes li{margin-bottom:5px;padding-left:2px;color:var(--text)}
.notes .lb{display:inline-block;min-width:34px;margin-right:9px;font-size:.72rem;font-weight:600;
  padding:1px 7px;border-radius:4px;background:var(--code-bg);vertical-align:1px}
.when .lb{color:var(--when)} .warn .lb{color:var(--warn)} .rel .lb{color:var(--rel)}
.ic{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.82em;
  padding:1px 5px;border-radius:4px;background:var(--code-bg);color:var(--accent)}
.empty{display:none;text-align:center;color:var(--muted);padding:50px 0;font-size:.9rem}
.hide{display:none}
/* 화면 전환: body[data-view] = home | area | search */
body[data-view="home"] .wrap{grid-template-columns:minmax(0,1fr);max-width:1000px}
body[data-view="home"] .toc,body[data-view="home"] .area,body[data-view="home"] .back{display:none}
body:not([data-view="home"]) #home{display:none}
body[data-view="area"] #toc-all{display:none}
h1 a{color:inherit;text-decoration:none}
.back{display:inline-block;margin:0 0 18px;font-size:.84rem;color:var(--muted);text-decoration:none}
.back:hover{color:var(--accent)}
.home-h{font-size:.76rem;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);
  font-weight:600;margin:0 0 12px;padding-bottom:7px;border-bottom:1px solid var(--border)}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;margin-bottom:38px}
.card{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:14px 16px;
  background:var(--surface);border:1px solid var(--border);border-radius:10px;color:var(--text);
  text-decoration:none;font-weight:600;transition:border-color .15s}
.card:hover{border-color:var(--accent)}
.card:hover .card-name{color:var(--accent)}
.card-n{font-size:.78rem;color:var(--muted);font-weight:500;font-variant-numeric:tabular-nums}
.situations{columns:2 360px;column-gap:28px}
.sit{break-inside:avoid;margin-bottom:22px}
.sit h3{font-size:.92rem;margin:0 0 6px;font-weight:600}
.sit ul{list-style:none;margin:0;padding:0}
.sit li{display:flex;align-items:baseline;gap:10px;padding:4px 0;border-bottom:1px dashed var(--border);font-size:.86rem}
.sit li a{flex:1;min-width:0;color:var(--text);text-decoration:none}
.sit li a:hover{color:var(--accent)}
.sit-area{flex:none;font-size:.72rem;color:var(--muted)}
@media(max-width:900px){
  .wrap{display:block}
  main{padding:20px 0 60px}
  .toc{position:static;max-height:none;overflow:visible;padding:20px 0 0}
  #toc-toggle{display:inline-block}
  .toc-list{display:none;margin-top:6px}
  .toc.open .toc-list{display:block}
  .toc:not(.open) #toc-all{display:none}
}
</style>
</head>
<body data-view="home">
<div class="wrap">
  <nav class="toc" id="toc" aria-label="목차">
    <div class="toc-head">
      <span class="toc-title">목차</span>
      <span>
        <button class="toc-btn" id="toc-all" type="button">모두 펼치기</button>
        <button class="toc-btn" id="toc-toggle" type="button">열기</button>
      </span>
    </div>
    <div class="toc-list">${toc}</div>
  </nav>
  <main>
  <header>
    <h1><a href="#/">운영 명령어</a></h1>
    <p class="sub">${groups.length}개 영역 · ${total}개 명령어 · 원본은 <code>commands/*.md</code>, <code>INDEX.md</code> · <code>node build.js</code>로 생성</p>
  </header>
  <div class="searchbar">
    <input id="q" type="search" placeholder="검색 — 명령어, 상황, 옵션 무엇이든" autocomplete="off" autofocus>
    <div id="count">${total}개</div>
  </div>
  ${home}
  <a class="back" href="#/">← 목차</a>
  ${body || '<p class="sub">아직 등록된 명령어가 없습니다.</p>'}
  <p class="empty" id="empty">일치하는 명령어가 없습니다.</p>
  </main>
</div>
<script>
const q=document.getElementById('q'),cmds=[...document.querySelectorAll('.cmd')],
      areas=[...document.querySelectorAll('.area')],cnt=document.getElementById('count'),
      empty=document.getElementById('empty'),TOTAL=${total};
// 화면 전환. 해시가 없거나 #/ 면 메인(목차), #<영역> 이면 그 영역, #<명령어 id> 면 그 명령어가 속한 영역.
// 검색어가 있으면 어느 화면에서든 전체 검색 결과를 보여준다.
let route={view:'home'};
function parseHash(){
  const h=decodeURIComponent(location.hash.slice(1));
  if(!h||h==='/')return {view:'home'};
  const sec=document.getElementById(h);
  if(sec&&sec.classList.contains('area'))return {view:'area',area:h};
  if(sec&&sec.classList.contains('cmd'))return {view:'area',area:sec.closest('.area').id,target:h};
  return {view:'home'};
}
function render(){
  const terms=q.value.toLowerCase().split(/\\s+/).filter(Boolean);
  const view=terms.length?'search':route.view;
  document.body.dataset.view=view;
  let n=0;
  cmds.forEach(c=>{
    const h=c.dataset.search, ok=view==='search'?terms.every(t=>h.includes(t))
      :view==='area'?c.closest('.area').id===route.area:false;
    c.classList.toggle('hide',!ok); if(ok)n++;
  });
  areas.forEach(a=>a.classList.toggle('hide',!a.querySelector('.cmd:not(.hide)')));
  cnt.textContent = view==='search' ? n+'개 / '+TOTAL : view==='area' ? n+'개' : TOTAL+'개';
  empty.style.display = view==='search'&&!n?'block':'none';
  // 목차에는 지금 화면에 보이는 항목만 남긴다. 영역 화면에서는 그 영역만 펼친다.
  tocAreas.forEach(d=>{
    let any=false;
    d.querySelectorAll('li').forEach(li=>{
      const c=document.getElementById(li.firstChild.dataset.target), ok=!c.classList.contains('hide');
      li.classList.toggle('hide',!ok); if(ok)any=true;
    });
    d.classList.toggle('hide',!any);
    if(view!=='home') d.open=any;
  });
}
function go(){
  route=parseHash(); activeId=null; render();
  const t=route.target&&document.getElementById(route.target);
  if(t)t.scrollIntoView(); else window.scrollTo(0,0);
}
const filter=render;
const toc=document.getElementById('toc'),tocAreas=[...document.querySelectorAll('.toc-area')],
      allBtn=document.getElementById('toc-all'),togBtn=document.getElementById('toc-toggle');
allBtn.addEventListener('click',()=>{
  const open=!tocAreas.every(d=>d.open||d.classList.contains('hide'));
  tocAreas.forEach(d=>d.open=open); allBtn.textContent=open?'모두 접기':'모두 펼치기';
});
togBtn.addEventListener('click',()=>{
  toc.classList.toggle('open'); togBtn.textContent=toc.classList.contains('open')?'닫기':'열기';
});
toc.addEventListener('click',e=>{
  if(e.target.closest('a')&&matchMedia('(max-width:900px)').matches){toc.classList.remove('open');togBtn.textContent='열기';}
});
// 화면에 보이는 명령어를 목차에 표시한다.
const links=new Map([...document.querySelectorAll('.toc a')].map(a=>[a.dataset.target,a]));
let activeId=null;
function mark(id){
  if(id===activeId)return; activeId=id;
  document.querySelectorAll('.toc a.active').forEach(a=>a.classList.remove('active'));
  tocAreas.forEach(d=>d.classList.remove('current'));
  const a=links.get(id); if(!a)return;
  a.classList.add('active');
  const d=a.closest('.toc-area'); d.classList.add('current');
  if(!q.value.trim()&&!matchMedia('(max-width:900px)').matches){
    if(!d.open)d.open=true;
    const r=a.getBoundingClientRect(),t=toc.getBoundingClientRect();
    if(r.top<t.top||r.bottom>t.bottom)a.scrollIntoView({block:'nearest'});
  }
}
const seen=new Set();
const io=new IntersectionObserver(es=>{
  es.forEach(e=>e.isIntersecting?seen.add(e.target):seen.delete(e.target));
  const top=cmds.filter(c=>seen.has(c)).sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top)[0];
  if(top)mark(top.id);
},{rootMargin:'-90px 0px -55% 0px'});
cmds.forEach(c=>io.observe(c));
q.addEventListener('input',filter);
window.addEventListener('hashchange',go);
go();
document.addEventListener('keydown',e=>{
  if(e.key==='/'&&document.activeElement!==q){e.preventDefault();q.focus();}
  if(e.key==='Escape'&&document.activeElement===q){q.value='';filter();q.blur();}
});
document.addEventListener('click',e=>{
  const b=e.target.closest('.copy'); if(!b)return;
  navigator.clipboard.writeText(b.closest('.codewrap').querySelector('pre code').textContent).then(()=>{
    b.textContent='복사됨'; b.classList.add('done');
    setTimeout(()=>{b.textContent='복사';b.classList.remove('done')},1200);
  });
});
</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'index.html'), html);

// ── navi cheat 생성 ──────────────────────────────────────────
// navi는 명령어 속 <플레이스홀더>를 실행 시 입력받아 채워준다.
// 마스킹용으로 쓰는 <host>, <service> 등이 그대로 변수가 된다.
const cheat = groups.map(g => {
  const tag = g.area.toLowerCase().replace(/\s*\/\s*/g, ', ');
  const entries = g.items.map(it => {
    // 백슬래시 개행은 이어붙이고, 그래도 여러 줄이면 ; 로 연결한다.
    // navi는 한 항목당 한 줄의 명령을 기대하기 때문이다.
    const cmd = it.code.join('\n')
      .replace(/\s*\\\n\s*/g, ' ')
      .split('\n').map(l => l.trim()).filter(Boolean).join('; ');
    // 줄 안의 공백 2칸은 의미가 있을 수 있어(예: 체크섬 목록 형식) 합치지 않는다.
    const when = (it.notes.find(n => n.label === '언제') || {}).text;
    const desc = when ? `${it.title} — ${when.replace(/`/g, '')}` : it.title;
    return `# ${desc}\n${cmd}`;
  }).join('\n\n');
  return `% ${tag}\n\n${entries}`;
}).join('\n\n');

const cheatDir = path.join(__dirname, 'navi');
fs.mkdirSync(cheatDir, { recursive: true });
fs.writeFileSync(path.join(cheatDir, 'toolbox.cheat'), cheat + '\n');

console.log(`index.html + navi/toolbox.cheat 생성 — ${groups.length}개 영역, ${total}개 명령어`);
if (brokenLinks.length) {
  console.warn(`\nINDEX.md에서 명령어를 찾지 못한 링크 ${brokenLinks.length}개 (제목이 바뀌었는지 확인):`);
  brokenLinks.forEach(l => console.warn('  - ' + l));
}
