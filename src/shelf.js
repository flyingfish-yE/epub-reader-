import './shelf.css';

(() => {
'use strict';
const STORAGE_KEY='lnreader:books';
const SETTINGS_KEY='lnreader:settings';
const AUTOFIT_KEY='lnreader:autofit';
const $=s=>document.querySelector(s);
const flow=$('#flow'), grid=$('#bookGrid'), info=$('#flowInfo');
let books=[], selectedId=null, filter='all', menuBookId=null, toastTimer=0, raf=0, pointerState=null, suppressFlowClick=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

const sampleBooks=[
  {id:'sample-1',title:'星之海与旅人的约定',author:'白川透',progress:.42,finished:false,favorite:true,lastOpenedAt:Date.now()-1000*60*18,addedAt:Date.now()-86400000*8},
  {id:'sample-2',title:'在世界尽头等待春天',author:'水野遥',progress:.78,finished:false,favorite:false,lastOpenedAt:Date.now()-1000*60*60*5,addedAt:Date.now()-86400000*7},
  {id:'sample-3',title:'夏日、蝉鸣与未寄出的信',author:'青木凛',progress:1,finished:true,favorite:true,lastOpenedAt:Date.now()-86400000,addedAt:Date.now()-86400000*6},
  {id:'sample-4',title:'魔法师的慢生活',author:'森野小夜',progress:.12,finished:false,favorite:false,lastOpenedAt:0,addedAt:Date.now()-86400000*5},
  {id:'sample-5',title:'第七个雨季',author:'林檎',progress:.03,finished:false,favorite:false,lastOpenedAt:0,addedAt:Date.now()-86400000*4},
  {id:'sample-6',title:'月光邮局',author:'秋山澪',progress:.56,finished:false,favorite:false,lastOpenedAt:Date.now()-86400000*3,addedAt:Date.now()-86400000*3},
  {id:'sample-7',title:'猫与旧书店',author:'三浦春',progress:0,finished:false,favorite:false,lastOpenedAt:0,addedAt:Date.now()-86400000*2},
  {id:'sample-8',title:'玻璃海岸线',author:'高桥悠',progress:.91,finished:false,favorite:true,lastOpenedAt:Date.now()-86400000*4,addedAt:Date.now()-86400000},
  {id:'sample-9',title:'没有名字的魔女',author:'雾岛',progress:0,finished:false,favorite:false,lastOpenedAt:0,addedAt:Date.now()},
  {id:'sample-10',title:'远方的灯火',author:'七海',progress:.2,finished:false,favorite:false,lastOpenedAt:Date.now()-86400000*5,addedAt:Date.now()-3600000}
];
const clone=o=>JSON.parse(JSON.stringify(o));
const safeParse=(s,fallback)=>{try{return JSON.parse(s)||fallback}catch(_){return fallback}};
function showToast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2300)}
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(books))}catch(e){showToast('本地存储空间不足，请先导出备份');}}
function normalize(b){return {...b,id:String(b.id),title:b.title||'未命名',author:b.author||'未知作者',coverThumbUrl:b.coverThumbUrl||null,addedAt:Number(b.addedAt)||Date.now(),lastOpenedAt:Number(b.lastOpenedAt)||0,progress:Math.max(0,Math.min(1,Number(b.progress)||0)),finished:!!b.finished,favorite:!!b.favorite,isNew:!b.lastOpenedAt};}


const DB_NAME='lnreader-db', DB_VERSION=1, STORE='epubs';
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function putEpub(id,file){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(file,id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
async function deleteEpub(id){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
window.Library={
  async list(){return clone(books)},
  async getBookFile(id){const db=await openDB();return new Promise((resolve,reject)=>{const req=db.transaction(STORE).objectStore(STORE).get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)})},
  async importFiles(files,onProgress){
    const result={added:0,skipped:0,failed:0};
    for(let i=0;i<files.length;i++){
      const file=files[i];
      if(!/\.epub$/i.test(file.name)){result.failed++;continue}
      const title=file.name.replace(/\.epub$/i,'').replace(/[_-]+/g,' ').trim()||'未命名';
      if(books.some(b=>b.title===title)){result.skipped++;continue}
      const id='book-'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+i);
      try{
        await putEpub(id,file);
        books.push(normalize({id,title,author:'未知作者',addedAt:Date.now(),lastOpenedAt:0,progress:0,finished:false,favorite:false,fileName:file.name,hasEpub:true}));
        result.added++;
      }catch(err){console.error(err);result.failed++}
      if(onProgress)onProgress({current:i+1,total:files.length,name:file.name});
    }
    persist();return result;
  },
  async removeBook(id){books=books.filter(b=>b.id!==id);await deleteEpub(id);persist()},
  async setFavorite(id,value){const b=books.find(x=>x.id===id);if(b){b.favorite=!!value;persist()}},
  async setFinished(id,value){const b=books.find(x=>x.id===id);if(b){b.finished=!!value;b.progress=value?1:Math.min(b.progress,.99);persist()}},
  async openBook(id){const b=books.find(x=>x.id===id);if(!b)return false;const dbFile=await window.Library.getBookFile(id);if(!dbFile){showToast('这是示例书目，没有对应的 EPUB 文件。请导入原书文件');return false}b.lastOpenedAt=Date.now();persist();location.href='/reader.html?book='+encodeURIComponent(id);return true}
};


function placeholder(title,author){return `<div class="cover-placeholder"><div class="p-title">${escapeHTML(title)}</div><div class="rule"></div><div class="p-author">${escapeHTML(author||'未知作者')}</div></div>`}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function coverMarkup(b){return b.coverThumbUrl?`<img src="${escapeHTML(b.coverThumbUrl)}" alt="${escapeHTML(b.title)}封面">`:placeholder(b.title,b.author)}
function getRecent(){return books.filter(b=>b.lastOpenedAt>0).sort((a,b)=>b.lastOpenedAt-a.lastOpenedAt).slice(0,10)}
function render(){
  const recent=getRecent();
  $('#recentSection').hidden=recent.length===0;
  $('#shelfSection').hidden=books.length===0;
  $('#emptyState').hidden=books.length!==0;
  if(!selectedId||!recent.some(b=>b.id===selectedId))selectedId=recent[0]?.id||null;
  renderFlow(recent);renderGrid();updateSelectedStyles();
}
function renderFlow(recent){
  flow.innerHTML='';
  if(!recent.length){info.innerHTML='';return}
  recent.forEach(b=>{
    const item=document.createElement('div');item.className='flow-item';item.dataset.id=b.id;item.setAttribute('role','option');item.setAttribute('aria-selected',String(b.id===selectedId));item.tabIndex=-1;
    item.innerHTML=`<div class="cover">${coverMarkup(b)}</div>`;
    item.addEventListener('click',()=>{selectBook(b.id,true);openBook(b.id)});
    attachLongPress(item,b.id);
    flow.append(item);
  });
  requestAnimationFrame(()=>{const el=flow.querySelector(`[data-id="${CSS.escape(selectedId)}"]`);if(el){flow.scrollLeft=el.offsetLeft+el.offsetWidth/2-flow.clientWidth/2;updateFlow()}});
  renderInfo(recent.find(b=>b.id===selectedId));
}
function renderInfo(b){
  if(!b){info.innerHTML='';return}
  const pct=Math.round((b.finished?1:b.progress)*100);
  info.innerHTML=`<div class="flow-book-title">${escapeHTML(b.title)}</div><div class="flow-author">${escapeHTML(b.author)}</div><div class="progress-line"><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><span class="progress-num">${pct}%</span></div><button class="primary-btn" id="continueBtn">继续阅读</button>`;
  $('#continueBtn').addEventListener('click',()=>openBook(b.id));
}
function renderGrid(){
  const visible=books.filter(b=>filter==='all'||b.favorite).sort((a,b)=>b.addedAt-a.addedAt);
  grid.innerHTML='';
  if(filter==='favorite'&&!visible.length){grid.innerHTML='<div class="empty-fav">还没有收藏。长按（电脑上右键）一本书，就能收藏。</div>';return}
  visible.forEach(b=>{
    const el=document.createElement('article');el.className='grid-book';el.dataset.id=b.id;el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',`${b.title}，${Math.round(b.progress*100)}%`);
    const pct=b.finished?100:Math.round(b.progress*100);
    el.innerHTML=`<div class="grid-cover-wrap">${coverMarkup(b)}${!b.lastOpenedAt?'<span class="new-tag">新</span>':''}<span class="progress-tag">${b.finished?'读完':pct+'%'}</span></div><div class="grid-title">${escapeHTML(b.title)}</div>`;
    el.addEventListener('click',()=>{selectedId=b.id;updateSelectedStyles();openBook(b.id)});
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openBook(b.id)}});
    attachLongPress(el,b.id);grid.append(el);
  });
  updateSelectedStyles();
}
function updateSelectedStyles(){
  document.querySelectorAll('.grid-book').forEach(el=>el.classList.toggle('selected',el.dataset.id===selectedId));
  document.querySelectorAll('.flow-item').forEach(el=>{const yes=el.dataset.id===selectedId;el.setAttribute('aria-selected',String(yes));el.tabIndex=yes?0:-1});
}
function selectBook(id,scroll){
  selectedId=id;const b=books.find(x=>x.id===id);renderInfo(b);updateSelectedStyles();
  if(scroll){const el=flow.querySelector(`[data-id="${CSS.escape(id)}"]`);el?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'nearest',inline:'center'})}
  updateFlow();
}
function updateFlow(){
  if(!flow.children.length)return;
  const center=flow.scrollLeft+flow.clientWidth/2;
  [...flow.children].forEach(el=>{
    const d=(el.offsetLeft+el.offsetWidth/2-center)/(el.offsetWidth+22);
    const c=Math.max(-1,Math.min(1,d));
    el.style.transform=reduced?'none':`perspective(900px) rotateY(${-20*c}deg)`;
    el.style.opacity=String(1-.08*Math.min(Math.abs(d),1));
  });
  let closest=null,dist=Infinity;
  [...flow.children].forEach(el=>{const d=Math.abs(el.offsetLeft+el.offsetWidth/2-center);if(d<dist){dist=d;closest=el}});
  if(closest&&closest.dataset.id!==selectedId){selectedId=closest.dataset.id;renderInfo(books.find(b=>b.id===selectedId));updateSelectedStyles()}
}
flow.addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;updateFlow()})},{passive:true});
window.addEventListener('resize',()=>{const id=selectedId;requestAnimationFrame(()=>{const el=flow.querySelector(`[data-id="${CSS.escape(id||'')}"]`);if(el)flow.scrollTo({left:el.offsetLeft+el.offsetWidth/2-flow.clientWidth/2,behavior:'auto'});updateFlow()})});
flow.addEventListener('keydown',e=>{
  const recent=getRecent(),idx=recent.findIndex(b=>b.id===selectedId);let next=idx;
  if(e.key==='ArrowLeft')next=Math.max(0,idx-1);else if(e.key==='ArrowRight')next=Math.min(recent.length-1,idx+1);else if(e.key==='Home')next=0;else if(e.key==='End')next=recent.length-1;else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(selectedId)openBook(selectedId);return}else return;
  e.preventDefault();if(recent[next])selectBook(recent[next].id,true);
});
function openBook(id){const b=books.find(x=>x.id===id);if(!b)return;window.Library.openBook(id)}
function attachLongPress(el,id){
  let timer=null,startX=0,startY=0,fired=false;
  el.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse')return;
    fired=false;startX=e.clientX;startY=e.clientY;
    timer=setTimeout(()=>{fired=true;if(navigator.vibrate)navigator.vibrate(10);showBookMenu(id,e.clientX,e.clientY)},550);
  });
  el.addEventListener('pointermove',e=>{if(timer&&(Math.abs(e.clientX-startX)>10||Math.abs(e.clientY-startY)>10)){clearTimeout(timer);timer=null}});
  ['pointerup','pointercancel','pointerleave'].forEach(type=>el.addEventListener(type,()=>{clearTimeout(timer);timer=null}));
  el.addEventListener('contextmenu',e=>{e.preventDefault();showBookMenu(id,e.clientX,e.clientY)});
  el.addEventListener('click',e=>{if(fired){e.preventDefault();e.stopImmediatePropagation();fired=false}},{capture:true});
}
// Desktop mouse drag: browser retains native scroll-snap; pointer dragging is only added for mouse.
flow.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='mouse'||e.button!==0)return;
  pointerState={x:e.clientX,left:flow.scrollLeft,moved:false};
});
window.addEventListener('pointermove',e=>{
  if(!pointerState)return;
  const dx=e.clientX-pointerState.x;
  if(Math.abs(dx)>5)pointerState.moved=true;
  if(pointerState.moved){flow.scrollLeft=pointerState.left-dx;e.preventDefault()}
},{passive:false});
window.addEventListener('pointerup',()=>{if(pointerState?.moved){suppressFlowClick=true;setTimeout(()=>{suppressFlowClick=false},0)}pointerState=null});
flow.addEventListener('click',e=>{if(suppressFlowClick){e.preventDefault();e.stopPropagation();suppressFlowClick=false}},true);

function showBookMenu(id,x,y){
  menuBookId=id;const b=books.find(x=>x.id===id);if(!b)return;
  $('#menuFavorite').textContent=b.favorite?'取消收藏':'加入收藏';
  $('#menuFinished').textContent=b.finished?'标记为未读完':'标记为读完';
  const menu=$('#bookMenu');menu.style.left=Math.min(x,innerWidth-205)+'px';menu.style.top=Math.min(y,innerHeight-160)+'px';
  menu.classList.add('open');$('#menuBackdrop').classList.add('open');
}
function closeMenu(){$('#bookMenu').classList.remove('open');$('#menuBackdrop').classList.remove('open');menuBookId=null}
$('#menuBackdrop').addEventListener('click',closeMenu);
$('#menuFavorite').addEventListener('click',async()=>{const b=books.find(x=>x.id===menuBookId);if(b){await Library.setFavorite(b.id,!b.favorite);await refresh();showToast(b.favorite?'已取消收藏':'已加入收藏')}closeMenu()});
$('#menuFinished').addEventListener('click',async()=>{const b=books.find(x=>x.id===menuBookId);if(b){await Library.setFinished(b.id,!b.finished);await refresh();showToast(b.finished?'已标记为读完':'已标记为未读完')}closeMenu()});
$('#menuRemove').addEventListener('click',async()=>{const b=books.find(x=>x.id===menuBookId);if(b&&confirm(`确定删除《${b.title}》吗？`)){await Library.removeBook(b.id);if(selectedId===b.id)selectedId=null;await refresh();showToast('已删除')}closeMenu()});
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{filter=btn.dataset.filter;document.querySelectorAll('.tab').forEach(x=>x.setAttribute('aria-pressed',String(x===btn)));renderGrid()}));

function openSettings(){loadSettings();$('#sheetBackdrop').classList.add('open');$('#settingsSheet').classList.add('open')}
function closeSettings(){$('#sheetBackdrop').classList.remove('open');$('#settingsSheet').classList.remove('open')}
$('#settingsBtn').addEventListener('click',openSettings);$('#closeSettings').addEventListener('click',closeSettings);$('#sheetBackdrop').addEventListener('click',closeSettings);
function setTheme(theme){localStorage.setItem('lnreader:theme',theme);const dark=theme==='night'||(theme==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'night':'day';document.querySelectorAll('#themeSegment button').forEach(b=>b.classList.toggle('active',b.dataset.value===theme))}
function readSettings(){return safeParse(localStorage.getItem(SETTINGS_KEY),{fontSize:18,pageMode:'page'})}
function readAutofit(){return safeParse(localStorage.getItem(AUTOFIT_KEY),{enabled:true,maxHeight:90,align:'center',gap:16})}
function loadSettings(){
  const s=readSettings(),a=readAutofit(),theme=localStorage.getItem('lnreader:theme')||'auto';
  setTheme(theme);$('#fontSize').value=s.fontSize;$('#fontSizeValue').textContent=s.fontSize+'px';setSegment('#pageMode',s.pageMode);
  $('#autofitEnabled').checked=a.enabled;$('#autofitHeight').value=a.maxHeight;$('#autofitHeightValue').textContent=a.maxHeight+'%';setSegment('#autofitAlign',a.align);$('#autofitGap').value=a.gap;$('#autofitGapValue').textContent=a.gap+'px';
  updateStorageInfo();
}
function setSegment(selector,value){document.querySelectorAll(selector+' button').forEach(b=>b.classList.toggle('active',b.dataset.value===value))}
$('#themeSegment').addEventListener('click',e=>{const b=e.target.closest('button[data-value]');if(b)setTheme(b.dataset.value)});
$('#fontSize').addEventListener('input',e=>{const s=readSettings();s.fontSize=+e.target.value;localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));$('#fontSizeValue').textContent=s.fontSize+'px'});
$('#pageMode').addEventListener('click',e=>{const b=e.target.closest('button[data-value]');if(!b)return;const s=readSettings();s.pageMode=b.dataset.value;localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));setSegment('#pageMode',s.pageMode)});
function saveAutofit(){const a={enabled:$('#autofitEnabled').checked,maxHeight:+$('#autofitHeight').value,align:document.querySelector('#autofitAlign .active')?.dataset.value||'center',gap:+$('#autofitGap').value};localStorage.setItem(AUTOFIT_KEY,JSON.stringify(a))}
$('#autofitEnabled').addEventListener('change',saveAutofit);
$('#autofitHeight').addEventListener('input',e=>{$('#autofitHeightValue').textContent=e.target.value+'%';saveAutofit()});
$('#autofitGap').addEventListener('input',e=>{$('#autofitGapValue').textContent=e.target.value+'px';saveAutofit()});
$('#autofitAlign').addEventListener('click',e=>{const b=e.target.closest('button[data-value]');if(!b)return;setSegment('#autofitAlign',b.dataset.value);saveAutofit()});
async function updateStorageInfo(){
  try{const est=await navigator.storage?.estimate?.();$('#storageUsage').textContent=est?formatBytes(est.usage||0):'浏览器未提供此信息';$('#storageQuota').textContent=est?'允许 '+formatBytes(est.quota||0):'';const p=await navigator.storage?.persisted?.();$('#persistStatus').textContent=p?'已获得持久存储':'尚未获得持久存储'}catch(_){$('#storageUsage').textContent='暂不可用';$('#persistStatus').textContent='暂不可用'}
}
function formatBytes(n){if(n<1024)return n+' B';if(n<1048576)return(n/1024).toFixed(1)+' KB';return(n/1048576).toFixed(1)+' MB'}
$('#persistBtn').addEventListener('click',async()=>{try{const ok=await navigator.storage?.persist?.();$('#persistStatus').textContent=ok?'已获得持久存储':'浏览器未授予持久存储';showToast(ok?'持久存储申请成功':'浏览器暂未授予持久存储')}catch(_){showToast('当前浏览器不支持此功能')}});
function exportBackup(){const payload={app:'lnreader',version:1,exportedAt:new Date().toISOString(),books,settings:readSettings(),autofit:readAutofit(),theme:localStorage.getItem('lnreader:theme')||'auto'};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='lnreader-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href);showToast('备份已导出')}
$('#exportBackup').addEventListener('click',exportBackup);
$('#importBackup').addEventListener('click',()=>$('#backupInput').click());
$('#backupInput').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.books))throw Error('格式错误');if(!confirm('导入备份将替换当前书架，是否继续？'))return;books=data.books.map(normalize);persist();if(data.settings)localStorage.setItem(SETTINGS_KEY,JSON.stringify(data.settings));if(data.autofit)localStorage.setItem(AUTOFIT_KEY,JSON.stringify(data.autofit));if(data.theme)localStorage.setItem('lnreader:theme',data.theme);selectedId=null;render();loadSettings();showToast('备份导入成功')}catch(_){showToast('无法读取备份文件')}finally{e.target.value=''}});
$('#clearShelf').addEventListener('click',async()=>{if(confirm('确定清空整个书架吗？此操作无法撤销。')){books=[];persist();selectedId=null;render();showToast('书架已清空')}});
function addSamples(){if(books.length&& !confirm('载入示例书会将示例书添加到当前书架，是否继续？'))return;const existing=new Set(books.map(b=>b.id));sampleBooks.forEach(b=>{if(!existing.has(b.id))books.push(normalize(b))});persist();render();showToast('示例书已载入')}
$('#samplesBtn').addEventListener('click',addSamples);$('#loadSamples').addEventListener('click',addSamples);

function importClick(){$('#epubInput').click()}
$('#importBtn').addEventListener('click',importClick);$('#emptyImport').addEventListener('click',importClick);
$('#epubInput').addEventListener('change',async e=>{const files=[...e.target.files];if(!files.length)return;showToast('正在导入 '+files.length+' 个文件…');try{const result=await Library.importFiles(files,p=>{});await refresh();showToast(`导入完成：新增 ${result.added}，重复 ${result.skipped}，失败 ${result.failed}`)}catch(_){showToast('导入失败')}finally{e.target.value=''}});
async function refresh(){books=(await Library.list()).map(normalize);render()}
if(!('ontouchstart'in window)||matchMedia('(display-mode: standalone)').matches===false){$('#installHint').hidden=false}
window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY)refresh()});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();closeSettings()}});
if('serviceWorker'in navigator&&location.protocol.startsWith('http')){/* PWA service worker can be added by deployment */}
books=safeParse(localStorage.getItem(STORAGE_KEY),null);
if(!Array.isArray(books)){books=[];localStorage.setItem(STORAGE_KEY,'[]')}
books=books.map(normalize);render();loadSettings();
})();
