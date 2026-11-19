import {evolve} from './evolve.mjs';
import {release} from './evolution/release.mjs';
import {candidates,decide,evidence,replay} from './requisite.mjs';

// Attach to the page's public solver API. Its result and original reader trace
// remain available beside the optional interpretation and its checked program.
export function attachHarness(doc,api,storage){
 const host=doc.querySelector('#out');
 if(!host||!api)return;
 const style=doc.createElement('link');
 style.rel='stylesheet';style.href=new URL('./harness.css',import.meta.url).href;doc.head.append(style);
 const panel=doc.createElement('details');
 panel.className='feedback-harness';panel.hidden=true;
 function node(tag,text){const el=doc.createElement(tag);el.textContent=text;return el;}
 const summary=node('summary','Feedback harness');
 const content=node('div','');
 panel.append(summary,content);
 const readerLabel=node('h3','Native reader result');
 readerLabel.hidden=true;
 host.before(panel,readerLabel);
 let active=null,storageMessage='';
 function read(key){try{const saved=JSON.parse(storage.getItem(key)||'[]');return Array.isArray(saved)?saved:[];}catch{return [];}}
 function save(key,events){
  try{storage.setItem(key,JSON.stringify(events));storageMessage='';return true;}
  catch{storageMessage='Browser storage is unavailable. This correction could not be saved.';return false;}
 }
 function button(title,fn){const el=node('button',title);el.type='button';el.className='btn';el.onclick=fn;return el;}
 function trace(title,text){const d=node('details','');d.append(node('summary',title),node('pre',text));return d;}
 function render(){
  if(!active)return;
  const {view,key,action,id,isSmall}=active;
  const events=read(key),record=events.find(e=>e.id===id&&e.enabled);
  const ledger=events;
  const cells=replay(ledger,isSmall?release.cells:{});
  const base=view.pick?.r?.ok?view.pick:null;
  const old=base&&candidates(base.text,base.r,view.question,api.solve);
  const result=isSmall?evolve(view.question,base,api.solve,cells,release.mask,ledger,release.transfer):{pool:old,choice:old&&decide(old,cells)?.choice||base,route:'original selector'};
  const pool=result.pool,now=pool&&decide(pool,cells),choice=result.choice;
  const values=choice?.r?.answers?.map(a=>a.text).join(' · ');
  summary.textContent='Small 11 harness · '+(values||'no checked answer');
  content.replaceChildren();
  content.append(node('p',values?'Harness answer: '+values:'The solver could not verify a mathematical answer.'));
  if(choice&&result.route.startsWith('transfer checked'))content.append(node('p','The transferred expression gives a numerical value. Its output unit has not been verified.'));
  content.append(trace('Inspect derivation',[
   'Route: '+result.route,
   'Small model output: '+(base?.text||'(refused)'),
   'Executed program: '+(choice?.text||'(none)'),
   ...(choice?.unitEvidence?['Answer unit grounded in: '+choice.unitEvidence]:[]),
   'Prior development labels: '+(isSmall?Object.values(release.cells).reduce((n,cell)=>n+cell.count,0):0),
   'Your enabled labels: '+events.filter(e=>e.enabled).length
  ].join('\n')));
  if(pool){
   content.append(node('p','Which quantity did you want? Selecting a checked target teaches the harness on this device.'));
   const controls=node('div','');controls.className='harness-controls';
   pool.options.forEach((o,side)=>{
    const b=button(o.role+' · '+o.r.answers[0].text,()=>{
     const next=read(key).filter(e=>e.id!==id);
     next.push({...evidence(view.question,pool,action||now,side),id});
     save(key,next);render();
    });b.setAttribute('aria-pressed',String(record?.side===side));controls.append(b);
   });
   content.append(controls,trace('Inspect online predictor',[
    'Relation: '+pool.family,
    'Probability of '+pool.options[1].role+' at answer time: '+(action||now).probability.toFixed(3),
    'Current probability: '+now.probability.toFixed(3),
    'Expert mix (slow, medium, fast): '+now.mix.map(x=>x.toFixed(3)).join(', '),
    'Active labels for this relation: '+now.labels
   ].join('\n')));
  }
  if(events.some(e=>e.enabled)){
   const log=node('details','');log.append(node('summary','Correction history'));
   const list=node('ol','');
   for(const e of events.filter(e=>e.enabled).reverse()){
    const li=node('li',e.question+' → '+(e.side===1?'second':'first')+' target ('+e.family+') ');
    li.append(button('Undo',()=>{const next=read(key);const old=next.find(x=>x.id===e.id);if(old)old.enabled=false;save(key,next);render();}));list.append(li);
   }
   log.append(list);content.append(log);
  }
  if(storageMessage)content.append(node('p',storageMessage));
 }
 function refresh(){
  const view=api.S.view;
  if(view?.source!=='model'||api.S.modelEntry?.id!=='small11'){active=null;panel.hidden=true;readerLabel.hidden=true;return;}
  if(active?.view===view)return;
  const format=api.S.model?.info?.format||'reader',isSmall=format==='RGW1',key='rg-small-joint11:'+format;
  const events=read(key),ledger=events,cells=replay(ledger,isSmall?release.cells:{});
  const base=view.pick?.r?.ok?view.pick:null;
  const result=isSmall?evolve(view.question,base,api.solve,cells,release.mask,ledger,release.transfer):null;
  const pool=isSmall?result.pool:base&&candidates(base.text,base.r,view.question,api.solve);
  active={view,key,isSmall,id:globalThis.crypto?.randomUUID?.()||String(Date.now())+"-"+Math.random().toString(36).slice(2),action:pool&&decide(pool,cells)};
  panel.open=true;
  summary.textContent='Feedback harness';panel.hidden=false;readerLabel.hidden=false;render();
 }
 const observer=new doc.defaultView.MutationObserver(refresh);
 observer.observe(host,{childList:true});refresh();
 return {panel,refresh};
}
if(typeof document!=='undefined'){
 let storage;try{storage=window.localStorage;}catch{storage=null;}
 const install=()=>attachHarness(document,window.__rg,storage);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
}
