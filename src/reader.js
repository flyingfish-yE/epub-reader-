import ePub from 'epubjs';
import './reader.css';

const params=new URLSearchParams(location.search);
const bookId=params.get('book');
const $=id=>document.getElementById(id);
const DB_NAME='lnreader-db', STORE='epubs';
const LOCATION_KEY='lnreader:locations';
let book=null,rendition=null,currentImage=null,config={widthPercent:100,align:'center'},savedConfig={...config},hasSaved=false,drag=null,pinch=null;
const pointers=new Map();
const toast=msg=>{const el=$('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1700)};
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function getFile(id){const db=await openDB();return new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).get(id);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}
function getLocations(){try{return JSON.parse(localStorage.getItem(LOCATION_KEY)||'{}')}catch{return {}}}
function setLocations(v){localStorage.setItem(LOCATION_KEY,JSON.stringify(v))}
function readLibrary(){try{return JSON.parse(localStorage.getItem('lnreader:books')||'[]')}catch{return []}}
function saveBookMeta(patch){const list=readLibrary();const i=list.findIndex(x=>x.id===bookId);if(i>=0){list[i]={...list[i],...patch};localStorage.setItem('lnreader:books',JSON.stringify(list))}}
function imageKey(img){return img.getAttribute('src')||img.getAttribute('data-src')||img.alt||'image'}
function readImageSettings(){try{return JSON.parse(localStorage.getItem('lnreader-image-overrides:'+bookId)||'{}')}catch{return {}}}
function writeImageSettings(all){localStorage.setItem('lnreader-image-overrides:'+bookId,JSON.stringify(all))}
function getImageCfg(img){const v=readImageSettings()[imageKey(img)];return v?{widthPercent:Math.max(30,Math.min(100,+v.widthPercent||100)),align:v.align||'center'}:{widthPercent:100,align:'center'}}
function applyImageCfg(){
 if(!currentImage)return;
 currentImage.style.width=config.widthPercent+'%';currentImage.style.maxWidth='100%';currentImage.style.height='auto';currentImage.style.display='block';
 currentImage.style.marginLeft=config.align==='left'?'0':config.align==='right'?'auto':'auto';
 currentImage.style.marginRight=config.align==='right'?'0':config.align==='left'?'auto':'auto';
 currentImage.style.outline='3px solid transparent';
 if($('panel').classList.contains('open'))currentImage.style.touchAction='none';
 positionHandle();
 $('size-slider').value=config.widthPercent;$('size-value').textContent=config.widthPercent;
 document.querySelectorAll('.align-group button').forEach(b=>b.classList.toggle('active',b.dataset.align===config.align));
}
function saveImageCfg(){if(!currentImage)return;const all=readImageSettings();all[imageKey(currentImage)]={...config};writeImageSettings(all);savedConfig={...config};hasSaved=true;toast('Settings saved ✓');$('saved-info').textContent='Settings saved ✓'}
function fitPercent(img){const doc=img.ownerDocument;const w=img.parentElement?.clientWidth||doc.documentElement.clientWidth;const nw=img.naturalWidth||w,nh=img.naturalHeight||w;const maxH=(doc.defaultView?.innerHeight||innerHeight)*.85;return Math.max(30,Math.min(100,Math.round(maxH*nw/nh/w*100)))}
function openImagePanel(img){
 currentImage=img;config=getImageCfg(img);savedConfig={...config};hasSaved=!!readImageSettings()[imageKey(img)];
 $('font-panel').classList.remove('show');$('panel').classList.add('open');document.body.classList.add('editing');
 img.classList.add('editing');applyImageCfg();$('saved-info').textContent=hasSaved?'Settings saved ✓':'Default settings';
}
function positionHandle(){if(!currentImage)return;const r=currentImage.getBoundingClientRect();const frame=currentImage.ownerDocument.defaultView?.frameElement;const fr=frame?.getBoundingClientRect();const x=r.right+(fr?.left||0),y=r.bottom+(fr?.top||0);const h=$('resize-handle');h.style.left=Math.min(innerWidth-48,Math.max(0,x-18))+'px';h.style.top=Math.min(innerHeight-48,Math.max(0,y-18))+'px'}
function closeImagePanel(save=true){if(save&&currentImage){const changed=config.widthPercent!==savedConfig.widthPercent||config.align!==savedConfig.align;if(changed)saveImageCfg()}$('panel').classList.remove('open');document.body.classList.remove('editing');if(currentImage){currentImage.classList.remove('editing');currentImage.style.outline='';currentImage.style.touchAction=''}currentImage=null;drag=null;pinch=null;pointers.clear()}
function setupImage(doc){
 doc.querySelectorAll('img').forEach(img=>{
  if(img.dataset.lnBound)return;img.dataset.lnBound='1';img.draggable=false;
  img.addEventListener('click',e=>{e.preventDefault();openImagePanel(img)});
  img.addEventListener('pointerdown',e=>{if(!currentImage||currentImage!==img||!$('panel').classList.contains('open'))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={dist:Math.hypot(a.x-b.x,a.y-b.y),start:config.widthPercent}}});
  img.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!pinch)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const [a,b]=[...pointers.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch.dist>0){config.widthPercent=Math.max(30,Math.min(100,Math.round(pinch.start*d/pinch.dist)));applyImageCfg()}});
  ['pointerup','pointercancel'].forEach(t=>img.addEventListener(t,e=>{pointers.delete(e.pointerId);if(pointers.size<2)pinch=null}));
 });
}
function bindRendition(){
 rendition.hooks.content.register(contents=>{const doc=contents.document;setupImage(doc);const body=doc.body;body.style.fontSize=$('font-slider').value+'px';body.style.lineHeight='1.8';body.style.padding='0 12px';});
 rendition.on('rendered',(_section,view)=>{if(view?.document)setupImage(view.document)});
 rendition.on('relocated',location=>{
  const all=getLocations();all[bookId]={cfi:location.start.cfi,percentage:location.start.percentage||0,updatedAt:Date.now()};setLocations(all);
  const pct=Math.max(0,Math.min(1,location.start.percentage||0));saveBookMeta({progress:pct,lastLocation:location.start.cfi,lastOpenedAt:Date.now()});
 });
}
function bindControls(){
 try{const savedTheme=localStorage.getItem('lnreader:theme')||'auto';const dark=savedTheme==='night'||(savedTheme==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'night':'day';$('theme-btn').textContent=dark?'Day':'Night';const settings=JSON.parse(localStorage.getItem('lnreader:settings')||'{}');if(settings.fontSize){$('font-slider').value=settings.fontSize;$('font-value').textContent=settings.fontSize}}catch{}
 $('back-shelf').addEventListener('click',()=>{closeImagePanel(false);location.href='/'});
 $('font-btn').addEventListener('click',()=>$('font-panel').classList.toggle('show'));
 $('font-slider').addEventListener('input',e=>{const size=e.target.value;$('font-value').textContent=size;rendition?.getContents().forEach(c=>{c.document.body.style.fontSize=size+'px'})});
 $('theme-btn').addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='night';document.documentElement.dataset.theme=dark?'night':'day';$('theme-btn').textContent=dark?'Day':'Night';rendition?.getContents().forEach(c=>{c.document.body.style.background=dark?'#000':'#fff';c.document.body.style.color=dark?'#ddd':'#222'})});
 $('edit-btn').addEventListener('click',()=>{const img=currentImage||rendition?.getContents().flatMap(c=>[...c.document.images])[0];if(img)openImagePanel(img);else toast('Current chapter has no images')});
 $('close-btn').addEventListener('click',()=>closeImagePanel(true));
 $('save-btn').addEventListener('click',()=>{saveImageCfg();closeImagePanel(false)});
 $('reset-btn').addEventListener('click',()=>{if(!currentImage)return;const all=readImageSettings();delete all[imageKey(currentImage)];writeImageSettings(all);config={widthPercent:fitPercent(currentImage),align:'center'};applyImageCfg();savedConfig={...config};hasSaved=false;$('saved-info').textContent='Settings reset to defaults'});
 $('fit-btn').addEventListener('click',()=>{if(!currentImage)return;config={widthPercent:fitPercent(currentImage),align:'center'};applyImageCfg()});
 const handle=$('resize-handle');
 handle.addEventListener('pointerdown',e=>{if(!currentImage)return;e.preventDefault();handle.setPointerCapture(e.pointerId);const r=currentImage.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,start:config.widthPercent,aspect:r.width/(r.height||1),parent:currentImage.parentElement?.clientWidth||r.width}});
 handle.addEventListener('pointermove',e=>{if(!drag||!currentImage)return;const delta=((e.clientX-drag.x)+(e.clientY-drag.y)*drag.aspect)/2;config.widthPercent=Math.max(30,Math.min(100,Math.round(drag.start+delta/drag.parent*100)));applyImageCfg()});
 ['pointerup','pointercancel'].forEach(t=>handle.addEventListener(t,()=>{drag=null}));
 window.addEventListener('resize',positionHandle);
 $('size-slider').addEventListener('input',e=>{config.widthPercent=+e.target.value;applyImageCfg()});
 $('size-minus').addEventListener('click',()=>{config.widthPercent=Math.max(30,config.widthPercent-1);applyImageCfg()});
 $('size-plus').addEventListener('click',()=>{config.widthPercent=Math.min(100,config.widthPercent+1);applyImageCfg()});
 document.querySelectorAll('.align-group button').forEach(b=>b.addEventListener('click',()=>{config.align=b.dataset.align;if(config.align!=='center'&&config.widthPercent===100)config.widthPercent=70;applyImageCfg()}));
 $('export-btn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(readImageSettings(),null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='lnreader-image-settings.json';a.click();URL.revokeObjectURL(a.href)});
 document.addEventListener('click',e=>{if($('font-panel').classList.contains('show')&&!$('font-panel').contains(e.target)&&!$('font-btn').contains(e.target))$('font-panel').classList.remove('show')});
}
async function start(){
 bindControls();
 if(!bookId){$('reader-error').hidden=false;$('reader-error').textContent='No book ID specified. Please return to the bookshelf and open the book again.';return}
 const file=await getFile(bookId);
 if(!file){$('reader-error').hidden=false;$('reader-error').textContent='Book file not found. It may have been cleaned up. Please re-import it.';return}
 const meta=readLibrary().find(b=>b.id===bookId);$('reader-book-title').textContent=meta?.title||file.name||'Currently Reading';
 book=ePub(await file.arrayBuffer());
 rendition=book.renderTo('epub-view',{width:'100%',height:'100%',flow:'scrolled',manager:'continuous'});
 bindRendition();
 await book.ready;
 try{
  const md=await book.loaded.metadata;
  saveBookMeta({title:md.title||meta?.title,author:md.creator||meta?.author});
  $('reader-book-title').textContent=md.title||meta?.title||'Currently Reading';
  try{const cover=await book.coverUrl();if(cover){const response=await fetch(cover);const blob=await response.blob();const dataUrl=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(blob)});saveBookMeta({coverThumbUrl:dataUrl})}}catch(coverErr){console.info('No EPUB cover available',coverErr)}
 }catch(metaErr){console.info('EPUB metadata unavailable',metaErr)}
 await book.locations.generate(1000);
 const saved=getLocations()[bookId];await rendition.display(saved?.cfi||undefined);
}
start().catch(err=>{console.error(err);$('reader-error').hidden=false;$('reader-error').textContent='EPUB loading failed: The file may be corrupted or the format is not supported. Please re-import a valid EPUB file.'});
