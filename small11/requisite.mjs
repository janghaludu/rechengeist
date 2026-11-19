// The only allowed edit is (ask RELATION ROLE). Facts and the exact engine stay authoritative.
export const registry={
  discount:{facts:['price','percent'],roles:['off','sale'],
    cues:[/\b(discount amount|sav(?:e|ed|es|ing|ings)|reduction|taken off|comes off)\b/i,/\b(sale price|pay|paid|payable|bill|spend|checkout)\b/i]},
  'simple-interest':{facts:['principal','rate','time'],roles:['interest','amount'],
    cues:[/\b(interest alone|just the interest|interest is earned|earnings|extra money)\b/i,/\b(balance|maturity amount|withdraw|total payout|deposit plus interest)\b/i]},
  rectangle:{facts:['length','width'],roles:['area','perimeter'],
    cues:[/\b(area|square metres?|square meters?|floor space|surface)\b/i,/\b(perimeter|boundary|border|fencing|around)\b/i]},
  trade:{facts:['cost','sell'],roles:['profit','profit-percent'],
    cues:[/\b(cash|rupees|absolute gain|profit amount)\b/i,/\b(percent|percentage|rate|per hundred)\b/i]}
};
const rates=[.35,1.25,3.2];
const round=x=>Math.round(x*1e6)/1e6;
const logistic=x=>1/(1+Math.exp(-x));
const clip=x=>Math.max(-4,Math.min(4,x));
const symbol=node=>node?.items?.[0]?.name;
const fragment=(program,node)=>program.slice(node.at,node.end);
function goalClause(q){
 const parts=q.toLowerCase().split(/(?:[.!?](?=\s|$)|;)/).map(s=>s.trim()).filter(Boolean);
 const last=parts.at(-1)||'';
 // Questions written as a single sentence often append a request after a comma.
 return last.split(/,\s*(?=(?:find|give|calculate|how|what|state|determine)\b)/).at(-1);
}
const stop=new Set('a an the is are of to at by did do does how what its in on for this that from and as with be was were find give calculate state much many'.split(' '));
function features(goal){
 const tokens=(goal.match(/[a-z]+/g)||[]).filter(t=>!stop.has(t));
 const words=tokens.map(t=>t.length>4?t.replace(/(?:ing|ed|s)$/,''):t);
 return [...new Set(['#',...words,...words.slice(1).map((w,i)=>words[i]+' '+w)])];
}
function prior(spec,goal){
 const hits=spec.cues.map(re=>Number(re.test(goal)));
 return 1.25*(hits[1]-hits[0]);
}
function emptyCell(){return {weights:rates.map(()=>new Map()),loss:[0,0,0],count:0};}
function forecast(cell,keys,bias){
 const scale=1/Math.sqrt(keys.length);
 const p=cell.weights.map(w=>logistic(bias+keys.reduce((z,k)=>z+(w.get(k)||0)*scale,0)));
 const mass=cell.loss.map(l=>Math.exp(-2*l)),z=mass.reduce((a,b)=>a+b,0);
 const mix=mass.map(x=>.04+.88*x/z);
 return {p,mix,value:mix.reduce((a,w,j)=>a+w*p[j],0)};
}
export function replay(events,initial={}){
 const cells=new Map(Object.entries(initial).map(([k,c])=>[k,{count:c.count,loss:[...c.loss],weights:c.weights.map(w=>new Map(w))}]));
 for(const e of events){
  if(!e?.enabled||!Object.hasOwn(registry,e.family)||![0,1].includes(e.side)||typeof e.question!=='string'||!Array.isArray(e.observed)||e.observed.length!==3||!e.observed.every(x=>Number.isFinite(x)&&x>=0&&x<=1))continue;
  const c=cells.get(e.family)||emptyCell(),goal=goalClause(e.question),keys=features(goal);
  const f=forecast(c,keys,prior(registry[e.family],goal));
  for(let j=0;j<3;j++){
   c.loss[j]=round(.8*c.loss[j]+(e.observed[j]-e.side)**2);
   const step=rates[j]*(e.side-f.p[j])/Math.sqrt(keys.length);
   for(const k of keys)c.weights[j].set(k,round(clip((c.weights[j].get(k)||0)+step)));
  }
  c.count++;cells.set(e.family,c);
 }
 return cells;
}
// Inspect an accepted AST. Admit only a single non-composite relation with the
// complete expected set of observed facts and no additional or duplicate constraints.
export function candidates(program,result,question,solve){
 if(!program||!result?.ok||result.fit?.level==='strong')return null;
 const forms=result.program?.items?.slice(1)||[];
 const relations=forms.filter(x=>symbol(x)!=='kind');
 if(relations.length!==1)return null;
 const relation=relations[0],family=symbol(relation),spec=Object.hasOwn(registry,family)?registry[family]:null;
 if(!spec)return null;
 const goal=goalClause(question);
 if(!goal||/\b(both|each of|and|respectively|as well as)\b/i.test(goal))return null;
 const facts=[],seen=new Set(),asked=new Set();
 for(const slot of relation.items.slice(1)){
  const key=symbol(slot),val=slot.items?.[1];
  if(!key||!val||seen.has(key))return null;
  seen.add(key);
  if(spec.facts.includes(key)&&val.t==='num'&&slot.items.slice(2).every(n=>n.t==='sym'))facts.push(fragment(program,slot));
  else if(spec.roles.includes(key)&&val.t==='q'&&slot.items.slice(2).every(n=>n.t==='sym'))asked.add(key);
  else return null;
 }
 if(facts.length!==spec.facts.length||!asked.size)return null;
 const keep=forms.filter(x=>symbol(x)==='kind').map(x=>fragment(program,x));
 const options=spec.roles.map(role=>{
  const text='(problem '+[...keep,'('+[family,...facts,'('+role+' ?)'].join(' ')+')'].join(' ')+')';
  const r=solve(text,{question});
  if(!r.ok||r.fit?.level==='strong'||r.warnings?.length||r.answers?.length!==1||r.answers[0].role!==role)return null;
  return {text,r,role};
 });
 if(options.some(x=>!x))return null;
 // Reconstructing a selected role must preserve its value and physical unit.
 // Output annotations can otherwise silently change a requested conversion.
 for(const a of result.answers||[]){
  const other=options.find(x=>x.role===a.role)?.r.answers[0];
  if(!other||other.value!==a.value||other.text!==a.text)return null;
 }
 return {family,options,goal,original:program};
}
export function decide(pool,cells,mode='adaptive'){
 if(!pool)return null;
 const spec=registry[pool.family],cell=cells.get(pool.family)||emptyCell();
 const keys=features(pool.goal),bias=prior(spec,pool.goal);
 const f=forecast(cell,keys,bias);
 const probability=mode==='fixed'?logistic(bias):mode==='medium'?f.p[1]:f.value;
 const side=Math.abs(probability-.5)>=.085?Number(probability>.5):null;
 return {...f,probability,side,choice:side===null?null:pool.options[side],labels:cell.count};
}
export function evidence(question,pool,prediction,side){
 if(!pool||!prediction||![0,1].includes(side))throw Error('Choose a checked target.');
 return {enabled:true,question,family:pool.family,side,observed:[...prediction.p]};
}
