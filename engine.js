// A bounded arithmetic parser. User input is never executed as JavaScript.
export class InputError extends Error {}
export function normalizeInput(value){
 return String(value??'').trim().toLowerCase().replace(/^f\s*\(\s*[xtх]\s*\)\s*(?:=|≡)\s*/,'').replace(/[х]/g,'x').replace(/[с]/g,'c').replace(/π/g,'pi').replace(/[−–]/g,'-').replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/²/g,'^2').replace(/³/g,'^3').replace(/√\s*\(/g,'sqrt(').replace(/(?<=\d),(?=\d)/g,'.').replace(/\blog\b/g,'ln').replace(/\bt\b/g,'x');
}
const FUNCS=new Set(['ln','sqrt','exp','cosh','abs','sin','cos','tan']);
const VARS=new Set(['x','y','r','s','c','pi','e']);
export function parse(value){
 const raw=normalizeInput(value); if(!raw)throw new InputError('Сначала введи ответ.');
 if(raw.length>350)throw new InputError('Запись слишком длинная. Используй короткое выражение.');
 let pos=0,tokens=[];
 while(pos<raw.length){
  if(/\s/.test(raw[pos])){pos++;continue;}
  const tail=raw.slice(pos), num=tail.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/);
  if(num){tokens.push({type:'num',value:num[0]});pos+=num[0].length;continue;}
  const id=tail.match(/^[a-z]+/);
  if(id){if(!FUNCS.has(id[0])&&!VARS.has(id[0]))throw new InputError(`Не понимаю «${id[0]}». Используй числа, x, r, s, C, pi, e или функции ln, sqrt, exp, cosh.`);tokens.push({type:'id',value:id[0]});pos+=id[0].length;continue;}
  if('+-*/^()'.includes(raw[pos])){tokens.push({type:raw[pos],value:raw[pos++]});continue;}
  throw new InputError('Не понимаю этот символ. Для степени используй ^, для умножения — *; единицы измерения писать не нужно.');
 }
 if(tokens.length>150)throw new InputError('Слишком много операций в одном ответе.');
 const expanded=[];
 tokens.forEach((t,i)=>{const prev=tokens[i-1];if(prev&&['num','id',')'].includes(prev.type)&&['num','id','('].includes(t.type)&&!(prev.type==='id'&&FUNCS.has(prev.value)&&t.type==='('))expanded.push({type:'*'});expanded.push(t);});
 tokens=expanded; let k=0;
 function primary(){const t=tokens[k++];if(!t)throw new InputError('Выражение не закончено. Проверь скобки и знаки.');if(t.type==='num')return {op:'num',raw:t.value};if(t.type==='id'){if(!FUNCS.has(t.value))return {op:'id',name:t.value};if(tokens[k++]?.type!=='(')throw new InputError('Аргумент функции нужно писать в скобках, например ln(1-x).');const a=add();if(tokens[k++]?.type!==')')throw new InputError('Не хватает закрывающей скобки.');return {op:t.value,a};}if(t.type==='('){const a=add();if(tokens[k++]?.type!==')')throw new InputError('Проверь парные скобки.');return a;}throw new InputError('После знака операции нужно число, переменная или скобка.');}
 function power(){let a=primary();if(tokens[k]?.type==='^'){k++;a={op:'^',a,b:unary()};}return a;}
 function unary(){if(tokens[k]?.type==='+'||tokens[k]?.type==='-'){const sign=tokens[k++].type;return sign==='+'?unary():{op:'neg',a:unary()};}return power();}
 function mul(){let a=unary();while(tokens[k]?.type==='*'||tokens[k]?.type==='/'){const op=tokens[k++].type;a={op,a,b:unary()};}return a;}
 function add(){let a=mul();while(tokens[k]?.type==='+'||tokens[k]?.type==='-'){const op=tokens[k++].type;a={op,a,b:mul()};}return a;}
 const ast=add();if(k!==tokens.length)throw new InputError('Не удалось прочитать весь ответ. Проверь лишние скобки.');return ast;
}
export function evaluate(ast,vars={}){
 let v;
 if(ast.op==='num')v=Number(ast.raw);
 else if(ast.op==='id'){if(ast.name==='pi')v=Math.PI;else if(ast.name==='e')v=Math.E;else if(Object.hasOwn(vars,ast.name))v=vars[ast.name];else throw new InputError('Здесь нужен числовой ответ, без неизвестных переменных.');}
 else if(ast.op==='neg')v=-evaluate(ast.a,vars);
 else if(['+','-','*','/','^'].includes(ast.op)){const a=evaluate(ast.a,vars),b=evaluate(ast.b,vars);if(ast.op==='+')v=a+b;if(ast.op==='-')v=a-b;if(ast.op==='*')v=a*b;if(ast.op==='/')v=a/b;if(ast.op==='^')v=Math.pow(a,b);}
 else {const a=evaluate(ast.a,vars);v=({ln:Math.log,sqrt:Math.sqrt,exp:Math.exp,cosh:Math.cosh,abs:Math.abs,sin:Math.sin,cos:Math.cos,tan:Math.tan}[ast.op])(a);}
 if(!Number.isFinite(v))throw new InputError('Получается неопределённое или бесконечное значение. Проверь деление на ноль и область логарифма/корня.');return v;
}
const gcd=(a,b)=>{a=a<0n?-a:a;while(b){[a,b]=[b,a%b];}return a||1n;};
function rat(a,b=1n){if(b===0n)throw new InputError('Деление на ноль.');if(b<0n){a=-a;b=-b;}const g=gcd(a,b);return [a/g,b/g];}
const plus=(a,b)=>rat(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);
const times=(a,b)=>rat(a[0]*b[0],a[1]*b[1]);
function decimal(s){const [mant,exp='0']=s.split('e');const e=Number(exp);if(Math.abs(e)>40)throw new InputError('Слишком большая степень десяти.');const [whole,part='']=mant.split('.');return rat(BigInt((whole||'0')+part)*10n**BigInt(Math.max(e,0)),10n**BigInt(part.length+Math.max(-e,0)));}
const key=a=>JSON.stringify(a.sort());
const atom=a=>new Map([[key([a]),[1n,1n]]]);
const constant=a=>new Map(a[0]===0n?[]:[['[]',a]]);
function combine(a,b,sign=1n){const out=new Map(a);for(const [k,v] of b){const r=plus(out.get(k)||[0n,1n],times(v,[sign,1n]));if(r[0]===0n)out.delete(k);else out.set(k,r);}return out;}
function multiply(a,b){const out=new Map();for(const [ka,va] of a)for(const [kb,vb]of b){const factors=[...JSON.parse(ka),...JSON.parse(kb)];if(factors.length>48)throw new InputError('Слишком высокая степень для этой проверки.');const k=key(factors);const r=plus(out.get(k)||[0n,1n],times(va,vb));if(r[0])out.set(k,r);else out.delete(k);if(out.size>200)throw new InputError('Слишком сложное выражение для этой проверки.');}return out;}
const serialize=a=>JSON.stringify([...a.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,v.map(String)]));
const scale=(a,v)=>new Map([...a].map(([k,r])=>[k,times(r,v)]).filter(([,r])=>r[0]!==0n));
function canonical(ast){
 if(ast.op==='num')return constant(decimal(ast.raw));
 if(ast.op==='id')return atom(ast.name);
 if(ast.op==='neg')return scale(canonical(ast.a),[-1n,1n]);
 if(ast.op==='+')return combine(canonical(ast.a),canonical(ast.b));
 if(ast.op==='-')return combine(canonical(ast.a),canonical(ast.b),-1n);
 if(ast.op==='*')return multiply(canonical(ast.a),canonical(ast.b));
 if(ast.op==='/'){const a=canonical(ast.a),b=canonical(ast.b);if(b.size!==1||!b.has('[]'))throw new InputError('Для этой проверки дели выражение только на число. Попробуй упростить дробь вручную.');const r=b.get('[]');return scale(a,rat(r[1],r[0]));}
 if(ast.op==='^'){const b=evaluate(ast.b);if(!Number.isInteger(b)||b<0||b>12)throw new InputError('Для формул здесь поддерживаются целые степени от 0 до 12.');let a=constant([1n,1n]),base=canonical(ast.a);for(let i=0;i<b;i++)a=multiply(a,base);return a;}
 if(ast.op==='ln'&&ast.a.op==='/'&&serialize(canonical(ast.a.a))===serialize(constant([1n,1n])))return scale(atom('ln:'+serialize(canonical(ast.a.b))),[-1n,1n]);
 return atom(ast.op+':'+serialize(canonical(ast.a)));
}
export function symbolicSignature(raw,family=false){
 const p=canonical(parse(raw));
 if(family){const ck=key(['c']);if(!p.has(ck)||p.get(ck)[0]===0n)throw new InputError('Добавь произвольную постоянную C: здесь нужны все первообразные.');for(const [k]of p)if(k!==ck&&JSON.parse(k).some(x=>/(^|[^a-z])c($|[^a-z])/.test(x)))throw new InputError('Постоянная C должна добавляться отдельно, без x и без степеней.');p.delete(ck);for(const [k]of p)if(!JSON.parse(k).some(x=>/(^|[^a-z])x($|[^a-z])/.test(x)))p.delete(k);}
 return serialize(p);
}
function matchSets(actual,expected,equal){if(actual.length!==expected.length)return false;const rest=[...expected];for(const a of actual){const idx=rest.findIndex(b=>equal(a,b));if(idx<0)return false;rest.splice(idx,1);}return rest.length===0;}
export function checkAnswer(task,values){
 const a=task.answer;
 try{
  if(a.kind==='yesno'){if(!['yes','no'].includes(values[0]))throw new InputError('Выбери «Да» или «Нет».');return {status:values[0]===(task.id==='2023-2'?'no':'yes')?'correct':'wrong'};}
  if(a.kind==='number'){const actual=evaluate(parse(values[0])),expected=typeof a.target==='number'?a.target:evaluate(parse(a.target));const exact=Number.isInteger(expected);const tolerance=exact?1e-9:Math.max(1e-6,Math.abs(expected)*1e-5);return {status:Math.abs(actual-expected)<=tolerance?'correct':'wrong',actual};}
  if(a.kind==='expressions'){if(values.length!==a.values.length||values.some(v=>!String(v).trim()))throw new InputError(a.values.length>1?'Заполни обе функции: нужны все решения.':'Сначала введи формулу.');const family=task.id==='2024-4';const actual=values.map(v=>symbolicSignature(v,family)),expected=a.values.map(v=>symbolicSignature(v,family));return {status:matchSets(actual,expected,(x,y)=>x===y)?'correct':'wrong'};}
  if(a.kind==='points'){if(values.length!==a.count*a.dimensions||values.some(v=>!String(v).trim()))throw new InputError('Заполни все координаты каждой точки.');const numbers=values.map(v=>evaluate(parse(v)));const pts=Array.from({length:a.count},(_,i)=>numbers.slice(i*a.dimensions,(i+1)*a.dimensions));const ok=a.alternatives.some(set=>matchSets(pts,set,(p,q)=>p.every((v,i)=>Math.abs(v-q[i])<1e-8)));return {status:ok?'correct':'wrong'};}
  throw new InputError('Этот формат ответа пока не поддерживается.');
 }catch(e){if(e instanceof InputError)return {status:'invalid',message:e.message};throw e;}
}
export const STORAGE_KEY='itmo-steps-v1';
export const freshProgress=()=>({schema:1,selected:'2025-1',tasks:{},notes:{}});
export function sanitizeProgress(raw,tasks){const base=freshProgress(),ids=new Set(tasks.map(t=>t.id));if(!raw||raw.schema!==1)return base;if(ids.has(raw.selected))base.selected=raw.selected;for(const id of ids){const p=raw.tasks?.[id];if(p&&typeof p==='object')base.tasks[id]={attempts:Math.max(0,Math.min(9999,Number(p.attempts)||0)),hints:Math.max(0,Math.min(tasks.find(t=>t.id===id).hints.length,Math.floor(Number(p.hints)||0))),solved:!!p.solved,assisted:!!p.assisted,revealed:!!p.revealed,draft:Array.isArray(p.draft)?p.draft.slice(0,6).map(v=>String(v).slice(0,350)):[]};if(typeof raw.notes?.[id]==='string')base.notes[id]=raw.notes[id].slice(0,12000);}return base;}
