// Each candidate is an observed tree shape over positions in the question.
// Only the bounded arithmetic operators below may occur in a transferred program.
const operators=['+','-','*','/'];
const stop=new Set('a an the is are was were in on for to and of by as from how what did does do has have had he she they his her their there many much it with at than can some now each more less total after before all if'.split(' '));
const tokens=s=>(s.toLowerCase().match(/[a-z]+/g)||[]).filter(w=>!stop.has(w)).map(w=>w.replace(/s$/,''));
const overlap=(a,b)=>a.reduce((sum,w)=>sum+Number(b.includes(w)),0);
const concepts=[
 /more.*than|less.*than|difference|fewer.*than/,/left|remain|still|unoccupied/,/how many more|how much more|need.*more|short of/,/in total|altogether|in all|together/,/\beach\b|per |one /,/how many.*(?:buy|bought|sell|sold|delete|remove|give|lose|lost|use|eat)/,/how (?:many|much).*now/,/how long|how many (?:days|weeks|hours)/,/how many.* and /,/each|every|per /,/already|still needs|has to/,/distributed|shared|divide|split/,/bought|got|received|added|joined|gain/,/gave|spent|sold|ate|lost|removed|delete|left|poured/];
const indexExpr=new Map();
export function exprQuestion(q){
 const matches=[...q.toLowerCase().matchAll(/\d+(?:\.\d+)?/g)];
 if(matches.length<2||matches.length>4||/\d\s*\/\s*\d|[−-]\s*\d|\d,\d{3}/.test(q))return null;
 const lower=q.toLowerCase(),ix=Math.max(...['how ','what ','find ','which '].map(x=>lower.lastIndexOf(x))),goal=ix<0?lower:lower.slice(ix),gt=tokens(goal);
 const facts=matches.map((m,i)=>{
  const pre=lower.slice(i?matches[i-1].index+matches[i-1][0].length:0,m.index).split(/[.!?;]/).at(-1);
  const post=lower.slice(m.index+m[0].length,matches[i+1]?.index).split(/[.!?;]/)[0].split(/\b(?:and|but|if|then|how|what)\b/)[0];
  const ft=tokens(post).slice(0,6),bt=tokens(pre).slice(-5),n=Number(m[0]);
  return {n,raw:m[0],f:[i,Math.log1p(n),overlap(ft,gt),overlap(bt,gt),gt.includes(ft[0])?1:0,gt.includes(ft[1])?1:0,pre.includes('each')||post.includes('each')?1:0,Number(/had|original|started|initial|need|recipe/.test(pre)),Number(/left|remain|already|gave|removed|ate|lost/.test(pre+post)),Number(/bought|added|more|received/.test(pre)),Number(/total|altogether/.test(pre+post))]};
 });
 return {facts,global:[facts.length,...concepts.map((r,i)=>Number(r.test(i<9?goal:lower)))]};
}
function compiled(expr){
 const key=JSON.stringify(expr);if(indexExpr.has(key))return indexExpr.get(key);
 const nodes=[],leaves=[];
 function walk(tree){
  if(Number.isInteger(tree)){leaves.push(tree);return;}
  nodes.push(operators.indexOf(tree[0]));walk(tree[1]);walk(tree[2]);
 }
 walk(expr);const z={nodes,leaves};indexExpr.set(key,z);return z;
}
function evaluate(tree,facts){
 if(Number.isInteger(tree))return facts[tree].n;
 const [op,l,r]=tree,a=evaluate(l,facts),b=evaluate(r,facts);
 return op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:a/b;
}
export function makeCandidate(expr,q){
 const {facts,global}=q,{nodes,leaves}=compiled(expr),n=evaluate(expr,facts);
 if(!Number.isFinite(n))return null;
 const f=[...global,leaves.length,typeof expr[1]==='object'?1:0,...operators.map((_,i)=>Number(i===nodes[0])),...operators.map((_,i)=>Number(i===nodes[1])),Number(n>=0),Number(Math.abs(n-Math.round(n))<1e-8),Math.log1p(Math.abs(n)),Number(n>Math.max(...facts.map(x=>x.n))),Number(facts.some(x=>x.n===n))];
 for(let j=0;j<3;j++)f.push(...(facts[leaves[j]]?.f||Array(11).fill(-1)));
 for(let j=0;j<4;j++)f.push(Number(leaves.includes(j)));
 return {n,f};
}
function score(features,model){
 let value=model.bias;
 for(const tree of model.trees){
  let i=0;
  while(tree[i][0]>=0){const [f,t,l,r]=tree[i];i=features[f]<=t?l:r;}
  value+=tree[i][1];
 }
 return value;
}
function bind(tree,facts){return typeof tree==='number'?facts[tree].raw:'('+tree[0]+' '+bind(tree[1],facts)+' '+bind(tree[2],facts)+')';}
let last;
export function rankEquation(text,model){
 if(last?.text===text&&last.model===model)return last.result;
 const q=exprQuestion(text);if(!q)return null;
 const bestByAnswer=new Map();
 for(const tree of model.forms[q.facts.length]||[]){
  const candidate=makeCandidate(tree,q);if(!candidate||candidate.n<0)continue;
  const logit=score(candidate.f,model),key=candidate.n.toPrecision(10);
  if(!bestByAnswer.has(key)||bestByAnswer.get(key).logit<logit)bestByAnswer.set(key,{tree,logit});
 }
 const ranked=[...bestByAnswer.values()].sort((a,b)=>b.logit-a.logit);
 const best=ranked[0],result=best?{program:'(problem (kind num.ops) (evaluate '+bind(best.tree,q.facts)+'))',confidence:1/(1+Math.exp(-best.logit)),margin:best.logit-(ranked[1]?.logit??best.logit)}:null;
 last={text,model,result};return result;
}
