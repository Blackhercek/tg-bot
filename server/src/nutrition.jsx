const {useState,useEffect,useMemo,useCallback,useRef} = React;

/* ============ ДВИЖОК ============ */
const BANDS=[
  {max:12000, mid:10, label:"до 12к"},
  {max:17000, mid:15, label:"12–17к"},
  {max:22000, mid:20, label:"17–22к"},
  {max:27000, mid:25, label:"22–27к"},
  {max:Infinity, mid:30, label:"27к+"},
];
const KCAL_PER_1K = 30;
const SURPLUS = 300;
const FLOOR_REST = 2350, FLOOR_TRAIN = 2900;

/* met — метаболический эквивалент; spm — шагов в минуту, которые часы
   припишут внутри этой активности (вычитаются, чтобы не считать дважды);
   str — даёт силовой стимул, значит день получает профицит */
const ACTS=[
  {id:"lift",   n:"Силовая",               met:4.2, spm:15,  str:true, d:[45,60,75,90,120,180]},
  {id:"lifth",  n:"Силовая тяжёлая, ноги", met:5.0, spm:15,  str:true, d:[60,75,90,120]},
  {id:"climb",  n:"Скалодром, боулдеринг", met:6.5, spm:12,  d:[60,90,120,150,180]},
  {id:"mmat",   n:"ММА: техника",          met:5.0, spm:40,  d:[60,90,120]},
  {id:"mmas",   n:"ММА: ударка",           met:7.0, spm:45,  d:[60,90,120]},
  {id:"mmag",   n:"ММА: борьба",           met:8.5, spm:35,  d:[60,90,120]},
  {id:"mmasp",  n:"ММА: спарринг",         met:9.5, spm:40,  d:[30,60,90]},
  {id:"bike",   n:"Велотренажёр, вело",    met:6.8, spm:4,   d:[20,25,30,45,60,90]},
  {id:"run",    n:"Бег",                   met:8.5, spm:160, d:[20,30,45,60]},
  {id:"walkh",  n:"Ходьба в горку",        met:6.0, spm:100, d:[20,30,45,60]},
  {id:"walk",   n:"Ходьба, прогулка",      met:3.5, spm:105, d:[30,45,60,90,120]},
  {id:"ellip",  n:"Эллипс",                met:5.0, spm:60,  d:[20,30,45]},
  {id:"swim",   n:"Плавание",              met:7.0, spm:0,   d:[30,45,60]},
  {id:"ball",   n:"Футбол, баскетбол",     met:7.0, spm:100, d:[45,60,90]},
  {id:"stairs", n:"Лестница, подъём",      met:8.0, spm:90,  d:[10,15,20,30]},
  {id:"work",   n:"Физическая работа",     met:4.0, spm:70,  d:[60,120,180,240]},
  {id:"play",   n:"Активный отдых, игры",  met:4.5, spm:60,  d:[60,90,120,180]},
  {id:"stretch",n:"Растяжка, мобилити",    met:2.5, spm:5,   d:[15,20,30]},
];
const actById = id => ACTS.find(a=>a.id===id);

/* нетто-стоимость: (MET − 1), потому что покой уже сидит в базе */
const actKcal=(met,min,bw)=> (met-1)*3.5*bw/200*min;

function computeTarget(S, day){
  const bw = +S.bw || 71;
  const kAct = +S.kAct || 1;
  const acts = day.acts || [];
  let sess=0, ded=0, isTrain=false;
  acts.forEach(a=>{
    const A=actById(a.id); if(!A) return;
    sess += actKcal(A.met, a.min, bw);
    ded  += A.spm * a.min;
    if(A.str) isTrain=true;
  });
  const raw = Math.max(0, day.steps||0);
  const net = Math.max(0, raw - ded);
  const band = BANDS.find(b=>net < b.max) || BANDS[BANDS.length-1];
  const stepKcal = KCAL_PER_1K * band.mid;
  const activity = Math.round((stepKcal + sess) * kAct);
  const surplus = isTrain ? SURPLUS : 0;
  const maintenance = Math.round(S.base + activity);
  const rawTarget = maintenance + surplus;
  const floor = isTrain ? FLOOR_TRAIN : FLOOR_REST;
  const kcal = Math.max(rawTarget, floor);
  const protein = 185;
  const fat = Math.min(125, Math.max(60, Math.round(kcal*0.27/9)));
  const carbs = Math.max(0, Math.round((kcal - protein*4 - fat*9)/4));
  return {sess:Math.round(sess), ded:Math.round(ded), raw, net, band, stepKcal,
          activity, surplus, isTrain, maintenance, kcal, floored:kcal>rawTarget, floor,
          protein, fat, carbs, kAct};
}

/* ============ ПРОДУКТЫ (на 100 г) ============ */
const FOODS=[
  {n:"Куриная грудка",   u:"сырая",        k:113, p:22.5, f:2.2, c:0,    port:[100,150,200]},
  {n:"Куриная грудка",   u:"готовая",      k:150, p:30,   f:3,   c:0,    port:[100,150]},
  {n:"Яйцо куриное",     u:"1 шт ≈ 50 г",  k:143, p:12.6, f:9.5, c:0.7,  port:[50,100,150]},
  {n:"Творог 5 %",       u:"",             k:121, p:17.2, f:5,   c:3,    port:[100,180,200]},
  {n:"Кефир 2,5 %",      u:"",             k:53,  p:2.9,  f:2.5, c:4,    port:[200,250,300]},
  {n:"Молоко 3,2 %",     u:"",             k:60,  p:3,    f:3.2, c:4.7,  port:[200,330,500]},
  {n:"Сыр твёрдый",      u:"",             k:350, p:25,   f:27,  c:2,    port:[20,30,55]},
  {n:"Протеин сыв.",     u:"мерник ≈ 30 г",k:400, p:80,   f:6,   c:8,    port:[30,60]},
  {n:"Рис белый",        u:"сырой",        k:345, p:6.7,  f:0.7, c:78,   port:[60,90,120]},
  {n:"Рис белый",        u:"готовый",      k:116, p:2.2,  f:0.2, c:26,   port:[150,200,300]},
  {n:"Картофель",        u:"сырой",        k:77,  p:2,    f:0.1, c:17,   port:[200,260,400]},
  {n:"Гречка",           u:"сухая",        k:343, p:12.6, f:3.3, c:62,   port:[60,90]},
  {n:"Макароны",         u:"сухие",        k:344, p:11,   f:1.3, c:70,   port:[60,100]},
  {n:"Овсяные хлопья",   u:"сухие",        k:352, p:12.3, f:6.2, c:59.5, port:[40,55,90]},
  {n:"Хлеб",             u:"",             k:262, p:8,    f:3,   c:48,   port:[35,75,100]},
  {n:"Банан",            u:"мякоть",       k:89,  p:1.1,  f:0.3, c:22.8, port:[120,220]},
  {n:"Яблоко",           u:"",             k:52,  p:0.3,  f:0.2, c:14,   port:[150,200]},
  {n:"Овощная смесь",    u:"заморож.",     k:35,  p:1.5,  f:0.3, c:6,    port:[150,200,400]},
  {n:"Оливковое масло",  u:"ложка ≈ 14 г", k:884, p:0,    f:100, c:0,    port:[5,14,22]},
  {n:"Арахис",           u:"",             k:567, p:26,   f:49,  c:16,   port:[30,35,50]},
  {n:"Арахисовая паста", u:"",             k:600, p:25,   f:50,  c:20,   port:[30,50]},
  {n:"Сельдь",           u:"",             k:250, p:18,   f:19,  c:0,    port:[100,150]},
  {n:"Скумбрия",         u:"",             k:262, p:18,   f:21,  c:0,    port:[100,150]},
  {n:"Печень куриная",   u:"",             k:137, p:20,   f:6,   c:0.7,  port:[100,150]},
  {n:"Мёд",              u:"",             k:304, p:0.3,  f:0,   c:82,   port:[20,30]},
];

/* ============ ХРАНИЛИЩЕ ============ */
const KEY="nutri-balance-v2", OLD="nutri-balance-v1";
function load(){
  try{
    const v2=JSON.parse(localStorage.getItem(KEY)||"null");
    if(v2) return v2;
    const v1=JSON.parse(localStorage.getItem(OLD)||"null");
    if(v1&&v1.days){ /* миграция: старый dayType -> сессии */
      const days={};
      Object.entries(v1.days).forEach(([d,v])=>{
        const acts = v.dayType==="heavy" ? [{id:"lifth",min:90},{id:"bike",min:25}]
                   : v.dayType==="normal"? [{id:"lift",min:70}] : [];
        days[d]={steps:v.steps||0, acts, weight:v.weight, food:v.food||[]};
      });
      return {settings:{...v1.settings, kAct:1}, days, custom:v1.custom||[]};
    }
  }catch(e){}
  return {};
}
const save=d=>{try{localStorage.setItem(KEY,JSON.stringify(d))}catch(e){} if(window.Sync) window.Sync.push(d);};
const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const shiftDays=(s,n)=>{const d=new Date(s+"T12:00:00");d.setDate(d.getDate()+n);return iso(d)};
const ruShort=s=>{const[,m,dd]=s.split("-");return `${dd}.${m}`};
const r0=n=>Math.round(n), r1=n=>Math.round(n*10)/10;
const hhmm=m=>m>=60?`${Math.floor(m/60)} ч ${m%60?(m%60)+" мин":""}`.trim():`${m} мин`;

/* ============ КОМПОНЕНТЫ ============ */
function Meter({label, eaten, target, unit, hardFloor}){
  const pct = target>0 ? eaten/target*100 : 0;
  const under = target - eaten;
  let tone="neutral";
  if(pct>=97 && pct<=106) tone="ok";
  else if(pct>106) tone="over";
  else if(hardFloor && eaten<hardFloor) tone="warn";
  const col = tone==="ok"?"var(--ok)":tone==="over"?"var(--over)":tone==="warn"?"var(--warn)":"var(--accent)";
  const wash= tone==="ok"?"var(--ok-wash)":tone==="over"?"var(--over-wash)":tone==="warn"?"var(--warn-wash)":"var(--accent-wash)";
  return (
    <div style={{padding:"11px 12px",background:wash,borderRadius:9,
      border:`1px solid ${tone==="neutral"?"var(--line-soft)":col+"55"}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:6}}>
        <span className="eyebrow" style={{color:col}}>{label}</span>
        <span className="num" style={{fontSize:11.5,color:"var(--faint)"}}>
          {under>0?`−${r0(under)}`:`+${r0(-under)}`}{unit}
        </span>
      </div>
      <div className="num" style={{fontSize:20,fontWeight:600,color:col,lineHeight:1.2,marginTop:2}}>
        {r0(eaten)}<span style={{fontSize:12,color:"var(--faint)",fontWeight:500}}> / {r0(target)}{unit}</span>
      </div>
      <div style={{height:5,background:"var(--sunk)",borderRadius:99,marginTop:7,overflow:"hidden"}}>
        <div className="bar" style={{height:"100%",width:`${Math.min(100,pct)}%`,background:col,borderRadius:99}}/>
      </div>
    </div>
  );
}

function Trend({points}){
  const ref=useRef(null);
  useEffect(()=>{
    const cv=ref.current; if(!cv) return;
    const cs=getComputedStyle(document.documentElement);
    const acc=cs.getPropertyValue("--accent").trim()||"#3B4E9E";
    const ln=cs.getPropertyValue("--line-soft").trim()||"#EBE7E2";
    const ft=cs.getPropertyValue("--faint").trim()||"#978F85";
    const dpr=window.devicePixelRatio||1, w=cv.clientWidth, h=170;
    cv.width=w*dpr; cv.height=h*dpr;
    const x=cv.getContext("2d"); x.scale(dpr,dpr); x.clearRect(0,0,w,h);
    const pL=40,pR=10,pT=14,pB=22;
    if(points.length<2){
      x.fillStyle=ft; x.font='12px "IBM Plex Sans",sans-serif'; x.textAlign="center";
      x.fillText("Нужно минимум 2 точки скользящей средней", w/2, h/2); return;
    }
    const vals=points.map(p=>p.v); let mn=Math.min(...vals), mx=Math.max(...vals);
    if(mx-mn<0.6){const c=(mx+mn)/2; mn=c-0.3; mx=c+0.3;}
    const pad=(mx-mn)*0.18; mn-=pad; mx+=pad;
    const X=i=>pL+i*(w-pL-pR)/(points.length-1);
    const Y=v=>pT+(1-(v-mn)/(mx-mn))*(h-pT-pB);
    x.strokeStyle=ln; x.lineWidth=1; x.font='10px "IBM Plex Mono",monospace'; x.fillStyle=ft; x.textAlign="right";
    for(let g=0;g<=3;g++){const v=mn+(mx-mn)*g/3, y=Math.round(Y(v))+.5;
      x.beginPath();x.moveTo(pL,y);x.lineTo(w-pR,y);x.stroke();
      x.fillText(v.toFixed(1), pL-6, y+3);}
    const gr=x.createLinearGradient(0,pT,0,h-pB);
    gr.addColorStop(0,acc+"3D"); gr.addColorStop(1,acc+"05");
    x.beginPath(); x.moveTo(X(0),Y(points[0].v));
    points.forEach((p,i)=>x.lineTo(X(i),Y(p.v)));
    x.lineTo(X(points.length-1),h-pB); x.lineTo(X(0),h-pB); x.closePath();
    x.fillStyle=gr; x.fill();
    x.beginPath(); points.forEach((p,i)=> i?x.lineTo(X(i),Y(p.v)):x.moveTo(X(i),Y(p.v)));
    x.strokeStyle=acc; x.lineWidth=2; x.lineJoin="round"; x.stroke();
    points.forEach((p,i)=>{const last=i===points.length-1;
      x.beginPath(); x.arc(X(i),Y(p.v),last?4.5:2.4,0,7); x.fillStyle=acc; x.fill();
      if(last){x.beginPath();x.arc(X(i),Y(p.v),8,0,7);x.strokeStyle=acc+"55";x.lineWidth=2;x.stroke();}});
    x.fillStyle=ft; x.font='10px "IBM Plex Mono",monospace'; x.textAlign="center";
    const st=Math.max(1,Math.ceil(points.length/5));
    points.forEach((p,i)=>{if(i%st===0||i===points.length-1) x.fillText(ruShort(p.d),X(i),h-6)});
  },[points]);
  return <canvas ref={ref} style={{width:"100%",height:170,display:"block"}} role="img"
    aria-label={`Скользящая средняя веса, точек: ${points.length}`}/>;
}

/* ============ ПРИЛОЖЕНИЕ ============ */
function App(){
  const [db,setDb]=useState(()=>{
    const d=load();
    if(!d.settings) d.settings={base:2050,startDate:iso(new Date()),bw:71,kAct:1};
    if(d.settings.kAct==null) d.settings.kAct=1;
    if(d.settings.bw==null) d.settings.bw=71;
    if(!d.days) d.days={};
    if(!d.custom) d.custom=[];
    return d;
  });
  const [date,setDate]=useState(()=>iso(new Date()));
  const [tab,setTab]=useState("day");
  const [q,setQ]=useState(""); const [sel,setSel]=useState(null); const [grams,setGrams]=useState("");
  const [pickAct,setPickAct]=useState(false); const [actSel,setActSel]=useState(null); const [mins,setMins]=useState("");

  useEffect(()=>{save(db)},[db]);
  const S=db.settings;
  const day=db.days[date]||{steps:12000, acts:[], food:[]};
  const food=day.food||[]; const acts=day.acts||[];

  const patch=useCallback(fn=>setDb(prev=>{
    const next={...prev, days:{...prev.days}};
    const d={...(next.days[date]||{steps:12000,acts:[],food:[]})};
    fn(d); next.days[date]=d; return next;
  }),[date]);
  const setS=(k,v)=>setDb(p=>({...p, settings:{...p.settings,[k]:v}}));

  const T=useMemo(()=>computeTarget(S,day),[S,day]);
  const tot=useMemo(()=>food.reduce((a,x)=>({k:a.k+x.k,p:a.p+x.p,f:a.f+x.f,c:a.c+x.c}),{k:0,p:0,f:0,c:0}),[food]);

  const allFoods=useMemo(()=>[...FOODS,...(db.custom||[])],[db.custom]);
  const found=useMemo(()=>{
    const s=q.trim().toLowerCase();
    if(!s) return allFoods.slice(0,8);
    return allFoods.filter(f=>(f.n+" "+(f.u||"")).toLowerCase().includes(s)).slice(0,10);
  },[q,allFoods]);

  const addAct=(A,m)=>{const mm=parseInt(m,10); if(!mm||mm<=0) return;
    patch(d=>{d.acts=[...(d.acts||[]),{uid:Date.now()+Math.random(), id:A.id, min:mm}]});
    setPickAct(false); setActSel(null); setMins("");};
  const delAct=uid=>patch(d=>{d.acts=(d.acts||[]).filter(a=>a.uid!==uid)});
  const addFood=(f,g)=>{const gr=parseFloat(g); if(!gr||gr<=0) return;
    patch(d=>{d.food=[...(d.food||[]),{id:Date.now()+Math.random(),n:f.n,u:f.u,g:gr,
      k:f.k*gr/100,p:f.p*gr/100,f:f.f*gr/100,c:f.c*gr/100}]});
    setSel(null);setGrams("");setQ("");};
  const delFood=id=>patch(d=>{d.food=(d.food||[]).filter(x=>x.id!==id)});

  const hint=useMemo(()=>{
    const dk=T.kcal-tot.k, dp=T.protein-tot.p, df=T.fat-tot.f;
    if(dk<-120) return {tone:"over",text:`Перебор ${r0(-dk)} ккал. Завтра не компенсируй — компенсаторное урезание надёжно предсказывает второй, более крупный срыв.`};
    if(dk<80 && dp<10) return {tone:"ok",text:"День закрыт по цели. Добирать нечего."};
    if(dp>25) return {tone:"warn",text:`Белка не хватает ${r0(dp)} г — приоритет №1. Грудка ${r0(dp/22.5*100)} г сырой, либо творог ${r0(dp/17.2*100)} г, либо протеин ${r0(dp/80*100)} г.`};
    if(df>12 && dk>100) return {tone:"warn",text:`Жиров не хватает ${r0(df)} г, пол 60 г. Масло ${r0(df)} г или арахис ${r0(df/49*100)} г.`};
    if(dk>150){
      const dense=dk>900;
      return {tone:"neutral",text: dense
        ? `Осталось ${r0(dk)} ккал — день большой, объёмом не влезет. Бери плотное: арахис ${r0(dk*0.35/5.67)} г + рис ${r0(dk*0.65/3.45)} г сырого. Или коктейль на молоке.`
        : `Осталось ${r0(dk)} ккал. Рис ${r0(dk/3.45)} г сырого, картофель ${r0(dk/0.77)} г или банан ${r0(dk/0.89)} г.`};
    }
    return {tone:"ok",text:"Почти в цели. Хватит одного небольшого приёма."};
  },[T,tot]);

  const sma=useCallback(d=>{
    const v=[]; for(let i=0;i<7;i++){const w=db.days[shiftDays(d,-i)]?.weight; if(w) v.push(+w)}
    return v.length>=4 ? v.reduce((a,b)=>a+b,0)/v.length : null;
  },[db.days]);
  const smaPoints=useMemo(()=>{
    const out=[]; for(let i=29;i>=0;i--){const d=shiftDays(date,-i); const v=sma(d); if(v) out.push({d,v})}
    return out;
  },[date,sma]);
  const dayIndex=useMemo(()=>{
    const a=new Date(S.startDate+"T12:00:00"), b=new Date(date+"T12:00:00");
    return Math.round((b-a)/864e5)+1;
  },[S.startDate,date]);
  const decision=useMemo(()=>{
    if(![14,28,42,56,70,84].includes(dayIndex)) return null;
    const now=sma(date), then=sma(shiftDays(date,-14));
    if(now==null||then==null) return {ready:false};
    const D=now-then; let step=0,txt="";
    if(D<=0.10){step=150;txt="База +150 ккал";}
    else if(D<=0.24){step=75;txt="База +75 ккал";}
    else if(D<=0.55){step=0;txt="БЕЗ ИЗМЕНЕНИЙ — целевой коридор";}
    else if(D<=0.90){step=-75;txt="База −75 ккал";}
    else {step=-150;txt="База −150 ккал";}
    return {ready:true,D,step,txt};
  },[dayIndex,date,sma]);

  const week=useMemo(()=>{
    let ik=0,tk=0,n=0,act=0;
    for(let i=0;i<7;i++){
      const d=db.days[shiftDays(date,-i)];
      if(d&&d.food&&d.food.length){
        ik+=d.food.reduce((a,x)=>a+x.k,0);
        const t=computeTarget(S,d); tk+=t.kcal; act+=t.activity; n++;
      }
    }
    return n?{avgIn:ik/n,avgT:tk/n,avgAct:act/n,n}:null;
  },[db.days,date,S]);

  return (
    <div className="wrap">
      <header style={{paddingTop:20,paddingBottom:12}}>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:10}}>
          <h1 style={{fontSize:27}}>Дневной баланс</h1>
          <button onClick={()=>{const r=document.documentElement,c=r.getAttribute("data-theme");
            const dark=c?c==="dark":matchMedia("(prefers-color-scheme: dark)").matches;
            r.setAttribute("data-theme",dark?"light":"dark");}}
            className="eyebrow" style={{border:"1px solid var(--line)",borderRadius:6,padding:"5px 8px"}}>тема</button>
        </div>
        <p style={{margin:"4px 0 0",color:"var(--muted)",fontSize:13}}>
          Каждая сессия считается по MET и минутам. Шаги внутри сессий вычитаются, чтобы не считать дважды.
        </p>
      </header>

      <div className="card" style={{padding:11,marginBottom:10,display:"flex",gap:8}}>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} aria-label="Дата"/>
        <button onClick={()=>setDate(iso(new Date()))} className="eyebrow"
          style={{border:"1px solid var(--line)",borderRadius:8,padding:"0 12px",whiteSpace:"nowrap"}}>сегодня</button>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:10}}>
        {[["day","День"],["trend","Тренд"],["set","Настройки"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} className="disp" style={{flex:1,padding:"9px 6px",borderRadius:8,fontSize:15,
            border:`1px solid ${tab===k?"var(--accent)":"var(--line)"}`,
            background:tab===k?"var(--accent-wash)":"var(--card)",
            color:tab===k?"var(--accent)":"var(--muted)"}}>{l}</button>
        ))}
      </div>

      {tab==="day" && <>
        {/* ШАГИ */}
        <div className="card" style={{padding:14,marginBottom:10}}>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:4}}>
            <span className="eyebrow">Шаги с часов</span>
            <span className="num" style={{fontSize:19,fontWeight:600}}>{T.raw.toLocaleString("ru-RU")}</span>
          </div>
          <input type="range" min="0" max="40000" step="500" value={day.steps||0}
            onChange={e=>patch(x=>{x.steps=+e.target.value})} aria-label="Шаги за день"/>
          <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
            {[8000,12000,16000,20000,25000,30000].map(v=>(
              <button key={v} onClick={()=>patch(x=>{x.steps=v})} className="num"
                style={{fontSize:12,padding:"5px 9px",borderRadius:7,border:"1px solid var(--line)",
                  background:(day.steps===v)?"var(--accent-wash)":"var(--raised)",
                  color:(day.steps===v)?"var(--accent)":"var(--muted)"}}>{v/1000}к</button>
            ))}
          </div>
          {T.ded>0 && (
            <div className="num" style={{fontSize:11.5,color:"var(--muted)",marginTop:9,
              paddingTop:8,borderTop:"1px solid var(--line-soft)",lineHeight:1.6}}>
              −{T.ded.toLocaleString("ru-RU")} приписано часами внутри сессий<br/>
              = <span style={{color:"var(--ink)",fontWeight:600}}>{T.net.toLocaleString("ru-RU")} нетто</span> → полоса {T.band.label} → {T.stepKcal} ккал
            </div>
          )}
          {T.ded===0 && (
            <div className="num" style={{fontSize:11.5,color:"var(--muted)",marginTop:8}}>
              полоса {T.band.label} → {T.stepKcal} ккал
            </div>
          )}
        </div>

        {/* СЕССИИ */}
        <div className="card" style={{padding:14,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:9}}>
            <span className="eyebrow">Сессии</span>
            <span className="num" style={{fontSize:14,fontWeight:600,color:acts.length?"var(--accent)":"var(--faint)"}}>
              {T.sess} ккал
            </span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {acts.map(a=>{
              const A=actById(a.id); if(!A) return null;
              return (
                <div key={a.uid} style={{display:"flex",alignItems:"center",gap:9,
                  padding:"9px 11px",background:"var(--raised)",borderRadius:8,border:"1px solid var(--line-soft)"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13.5,fontWeight:500}}>{A.n}</div>
                    <div className="num" style={{fontSize:11,color:"var(--faint)"}}>
                      {hhmm(a.min)} · MET {A.met}{A.str?" · силовой стимул":""}
                    </div>
                  </div>
                  <span className="num" style={{fontSize:13.5,fontWeight:600,whiteSpace:"nowrap"}}>
                    {r0(actKcal(A.met,a.min,+S.bw||71))}
                  </span>
                  <button onClick={()=>delAct(a.uid)} aria-label="Удалить сессию"
                    style={{color:"var(--over)",fontSize:17,lineHeight:1,padding:"2px 4px"}}>×</button>
                </div>
              );
            })}
            {!acts.length && <div style={{fontSize:13,color:"var(--faint)"}}>
              Сессий нет — день считается как отдых, профицит не начисляется.
            </div>}
          </div>

          {!pickAct ? (
            <button onClick={()=>setPickAct(true)}
              style={{marginTop:10,width:"100%",padding:"11px",borderRadius:8,
                border:"1px dashed var(--accent)",color:"var(--accent)",fontWeight:600,fontSize:14}}>
              + Добавить сессию
            </button>
          ) : (
            <div style={{marginTop:10,padding:11,background:"var(--raised)",borderRadius:9,border:"1px solid var(--line)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span className="eyebrow">Что делал</span>
                <button onClick={()=>{setPickAct(false);setActSel(null);setMins("")}}
                  className="eyebrow" style={{color:"var(--muted)"}}>отмена</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:250,overflowY:"auto"}}>
                {ACTS.map(A=>(
                  <button key={A.id} onClick={()=>{setActSel(A);setMins("")}}
                    style={{textAlign:"left",padding:"8px 10px",borderRadius:7,
                      border:`1px solid ${actSel&&actSel.id===A.id?"var(--accent)":"transparent"}`,
                      background:actSel&&actSel.id===A.id?"var(--accent-wash)":"var(--card)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                      <span style={{fontSize:13.5}}>{A.n}</span>
                      <span className="num" style={{fontSize:11,color:"var(--faint)",whiteSpace:"nowrap"}}>
                        MET {A.met} · {r0(actKcal(A.met,60,+S.bw||71))}/ч
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {actSel && (
                <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--line)"}}>
                  <div className="eyebrow" style={{marginBottom:6}}>Сколько минут</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                    {actSel.d.map(m=>(
                      <button key={m} onClick={()=>setMins(String(m))} className="num"
                        style={{fontSize:12.5,padding:"7px 11px",borderRadius:7,border:"1px solid var(--line)",
                          background:mins===String(m)?"var(--accent-wash)":"var(--card)",
                          color:mins===String(m)?"var(--accent)":"var(--muted)"}}>{m}</button>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:7}}>
                    <input type="number" inputMode="numeric" placeholder="минут" value={mins}
                      onChange={e=>setMins(e.target.value)} aria-label="Минуты"/>
                    <button onClick={()=>addAct(actSel,mins)}
                      style={{padding:"0 18px",borderRadius:8,background:"var(--accent)",color:"var(--accent-ink)",
                        fontWeight:600,fontSize:14,whiteSpace:"nowrap"}}>Добавить</button>
                  </div>
                  {mins>0 && (
                    <div className="num" style={{fontSize:11.5,color:"var(--muted)",marginTop:7}}>
                      = {r0(actKcal(actSel.met,+mins,+S.bw||71))} ккал нетто · часы припишут ≈{r0(actSel.spm*mins)} шагов, они будут вычтены
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ЦЕЛЬ */}
        <div className="card" style={{padding:14,marginBottom:10}}>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8}}>
            <div className="eyebrow">Цель дня</div>
            <div style={{display:"flex",gap:6}}>
              {T.floored && <span className="num" style={{fontSize:11,color:"var(--warn)"}}>по полу {T.floor}</span>}
              <span className="num" style={{fontSize:11,padding:"2px 7px",borderRadius:99,
                background:T.isTrain?"var(--ok-wash)":"var(--sunk)",
                color:T.isTrain?"var(--ok)":"var(--faint)"}}>
                {T.isTrain?"тренировочный":"без силовой"}</span>
            </div>
          </div>
          <div className="num" style={{fontSize:34,fontWeight:600,lineHeight:1.1,marginTop:2}}>
            {T.kcal}<span style={{fontSize:14,color:"var(--faint)",fontWeight:500}}> ккал</span>
          </div>
          <div className="num" style={{fontSize:11.5,color:"var(--muted)",marginTop:6,lineHeight:1.7}}>
            {S.base} база + {T.stepKcal} шаги{T.sess>0 && ` + ${T.sess} сессии`}
            {T.kAct!==1 && ` (×${T.kAct} коэф.)`}
            {T.surplus>0 && ` + ${T.surplus} профицит`}
          </div>
          <div style={{marginTop:6,paddingTop:8,borderTop:"1px solid var(--line-soft)",
            display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--faint)"}}>
            <span>Поддержка дня <span className="num" style={{color:"var(--muted)"}}>{T.maintenance}</span></span>
            <span>Профицит <span className="num" style={{color:T.surplus?"var(--ok)":"var(--muted)"}}>
              {T.surplus?`+${T.surplus}`:"0"}</span></span>
          </div>
          {T.kcal>4000 && (
            <div style={{marginTop:9,padding:"9px 10px",background:"var(--warn-wash)",borderRadius:8,
              fontSize:12.5,color:"var(--warn)"}}>
              Больше 4000 ккал. На крахмалах это 4+ кг еды — не влезет. Минимум треть добери
              плотным: масло, арахисовая паста, сыр, молоко.
            </div>
          )}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          <Meter label="Белок" eaten={tot.p} target={T.protein} unit=" г"/>
          <Meter label="Калории" eaten={tot.k} target={T.kcal} unit=""/>
          <Meter label="Жиры" eaten={tot.f} target={T.fat} unit=" г" hardFloor={60}/>
          <Meter label="Углеводы" eaten={tot.c} target={T.carbs} unit=" г"/>
        </div>

        <div className="card" style={{padding:"12px 13px",marginBottom:10,
          background:hint.tone==="over"?"var(--over-wash)":hint.tone==="warn"?"var(--warn-wash)":hint.tone==="ok"?"var(--ok-wash)":"var(--card)",
          borderColor:hint.tone==="over"?"var(--over)":hint.tone==="warn"?"var(--warn)":hint.tone==="ok"?"var(--ok)":"var(--line)"}}>
          <div className="eyebrow" style={{marginBottom:4,
            color:hint.tone==="over"?"var(--over)":hint.tone==="warn"?"var(--warn)":hint.tone==="ok"?"var(--ok)":"var(--faint)"}}>
            Чем добрать</div>
          <div style={{fontSize:13.5,lineHeight:1.5}}>{hint.text}</div>
        </div>

        <div className="card" style={{padding:14,marginBottom:10}}>
          <div className="eyebrow" style={{marginBottom:8}}>Добавить еду</div>
          <input type="text" placeholder="Поиск: курица, рис, творог…" value={q}
            onChange={e=>{setQ(e.target.value);setSel(null)}} aria-label="Поиск продукта"/>
          <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:9}}>
            {found.map((f,i)=>{
              const isSel=sel&&sel.n===f.n&&sel.u===f.u;
              return (
                <div key={i}>
                  <button onClick={()=>{setSel(isSel?null:f);setGrams("")}}
                    style={{width:"100%",textAlign:"left",padding:"9px 10px",borderRadius:8,
                      border:`1px solid ${isSel?"var(--accent)":"var(--line-soft)"}`,
                      background:isSel?"var(--accent-wash)":"var(--raised)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                      <span style={{fontSize:13.5,fontWeight:500}}>{f.n}
                        {f.u && <span style={{color:"var(--faint)",fontWeight:400}}> · {f.u}</span>}</span>
                      <span className="num" style={{fontSize:11.5,color:"var(--faint)",whiteSpace:"nowrap"}}>
                        {f.k} · Б{f.p} Ж{f.f} У{f.c}</span>
                    </div>
                  </button>
                  {isSel && (
                    <div style={{marginTop:6,padding:10,background:"var(--raised)",borderRadius:8,border:"1px solid var(--line-soft)"}}>
                      <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                        {(f.port||[100]).map(p=>(
                          <button key={p} onClick={()=>setGrams(String(p))} className="num"
                            style={{fontSize:12.5,padding:"6px 10px",borderRadius:7,border:"1px solid var(--line)",
                              background:grams===String(p)?"var(--accent-wash)":"var(--card)",
                              color:grams===String(p)?"var(--accent)":"var(--muted)"}}>{p} г</button>
                        ))}
                      </div>
                      <div style={{display:"flex",gap:7}}>
                        <input type="number" inputMode="decimal" placeholder="грамм" value={grams}
                          onChange={e=>setGrams(e.target.value)} aria-label="Граммы"/>
                        <button onClick={()=>addFood(f,grams)}
                          style={{padding:"0 18px",borderRadius:8,background:"var(--accent)",color:"var(--accent-ink)",
                            fontWeight:600,fontSize:14,whiteSpace:"nowrap"}}>Добавить</button>
                      </div>
                      {grams>0 && (
                        <div className="num" style={{fontSize:11.5,color:"var(--muted)",marginTop:7}}>
                          = {r0(f.k*grams/100)} ккал · Б {r1(f.p*grams/100)} · Ж {r1(f.f*grams/100)} · У {r1(f.c*grams/100)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:9}}>
            <div className="eyebrow">Съедено за день</div>
            <span className="num" style={{fontSize:13,fontWeight:600}}>{r0(tot.k)} ккал</span>
          </div>
          {food.length ? (
            <div className="scroll-x"><table><tbody>
              {food.map(x=>(
                <tr key={x.id} style={{borderBottom:"1px solid var(--line-soft)"}}>
                  <td style={{padding:"8px 6px 8px 0",fontSize:13}}>
                    {x.n}<span className="num" style={{color:"var(--faint)"}}> {r0(x.g)} г</span></td>
                  <td className="num" style={{padding:"8px 4px",fontSize:11.5,color:"var(--muted)",whiteSpace:"nowrap"}}>
                    Б{r0(x.p)} Ж{r0(x.f)} У{r0(x.c)}</td>
                  <td className="num" style={{padding:"8px 4px",fontSize:13,textAlign:"right",whiteSpace:"nowrap"}}>{r0(x.k)}</td>
                  <td style={{padding:"8px 0 8px 8px",textAlign:"right"}}>
                    <button onClick={()=>delFood(x.id)} aria-label="Удалить"
                      style={{color:"var(--over)",fontSize:17,lineHeight:1,padding:"2px 4px"}}>×</button></td>
                </tr>
              ))}
            </tbody></table></div>
          ) : <div style={{fontSize:13,color:"var(--faint)",padding:"6px 0"}}>Пока пусто. День всё равно закрывается цифрой.</div>}
        </div>
      </>}

      {tab==="trend" && <>
        <div className="card" style={{padding:14,marginBottom:10}}>
          <div className="eyebrow" style={{marginBottom:7}}>Вес натощак · сегодня</div>
          <input type="number" inputMode="decimal" step="0.1" placeholder="кг"
            value={day.weight||""} onChange={e=>patch(x=>{x.weight=e.target.value})} aria-label="Вес натощак"/>
          <p style={{margin:"8px 0 0",fontSize:12,color:"var(--faint)"}}>
            Утро, после туалета, до воды. Днём не взвешиваться — разница доходит до 1,5 кг.
          </p>
        </div>

        <div className="card" style={{padding:14,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
            <div className="eyebrow">Скользящая средняя за 7 дней</div>
            <span className="num" style={{fontSize:13,fontWeight:600}}>
              {smaPoints.length?smaPoints[smaPoints.length-1].v.toFixed(2)+" кг":"—"}</span>
          </div>
          <Trend points={smaPoints}/>
          {smaPoints.length>=8 && (()=>{
            const last=smaPoints[smaPoints.length-1], i0=Math.max(0,smaPoints.length-8), prev=smaPoints[i0];
            const perWeek=(last.v-prev.v)/((smaPoints.length-1-i0)/7);
            const ok=perWeek>=0.15&&perWeek<=0.28;
            return <div className="num" style={{fontSize:12.5,marginTop:8,
              color:ok?"var(--ok)":perWeek>0.28?"var(--over)":"var(--warn)"}}>
              {perWeek>=0?"+":""}{perWeek.toFixed(2)} кг/нед · коридор +0,15…+0,28
              {ok?" — в цели":perWeek>0.28?" — быстро, растёт доля жира":" — медленно"}
            </div>;
          })()}
        </div>

        {week && (
          <div className="card" style={{padding:14,marginBottom:10}}>
            <div className="eyebrow" style={{marginBottom:8}}>Неделя · среднее за {week.n} дн.</div>
            <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
              <div><div className="eyebrow" style={{marginBottom:2}}>съедено</div>
                <div className="num" style={{fontSize:19,fontWeight:600}}>{r0(week.avgIn)}</div></div>
              <div><div className="eyebrow" style={{marginBottom:2}}>цель</div>
                <div className="num" style={{fontSize:19,fontWeight:600,color:"var(--muted)"}}>{r0(week.avgT)}</div></div>
              <div><div className="eyebrow" style={{marginBottom:2}}>расхождение</div>
                <div className="num" style={{fontSize:19,fontWeight:600,
                  color:Math.abs(week.avgIn-week.avgT)<120?"var(--ok)":"var(--warn)"}}>
                  {week.avgIn>=week.avgT?"+":""}{r0(week.avgIn-week.avgT)}</div></div>
              <div><div className="eyebrow" style={{marginBottom:2}}>активность</div>
                <div className="num" style={{fontSize:19,fontWeight:600,color:"var(--accent)"}}>{r0(week.avgAct)}</div></div>
            </div>
            <p style={{margin:"9px 0 0",fontSize:12,color:"var(--faint)"}}>
              Состав тела отвечает на недельный баланс, а не на дневной. Расхождение до ±120 ккал — норма.
            </p>
          </div>
        )}

        <div className="card" style={{padding:14,
          borderColor:decision?"var(--accent)":"var(--line)",
          background:decision?"var(--accent-wash)":"var(--card)"}}>
          <div className="eyebrow" style={{marginBottom:6,color:decision?"var(--accent)":"var(--faint)"}}>
            День {dayIndex} · решение по калорийности</div>
          {!decision ? (
            <div style={{fontSize:13,color:"var(--muted)"}}>
              Сегодня база не меняется. Дни решений — 14, 28, 42, 56, 70, 84.
              Между ними калорийность не трогается. Никогда.
            </div>
          ) : !decision.ready ? (
            <div style={{fontSize:13.5,color:"var(--warn)"}}>
              День решения, но данных мало: нужно минимум 4 взвешивания в каждом из двух окон по 7 дней.
              Решение переносится, а не принимается на плохих данных.
            </div>
          ) : (
            <>
              <div className="num" style={{fontSize:22,fontWeight:600,marginBottom:4}}>
                Δ = {decision.D>=0?"+":""}{decision.D.toFixed(2)} кг за 14 дней</div>
              <div style={{fontSize:14,fontWeight:600,marginBottom:8}}>{decision.txt}</div>
              {decision.step!==0 && (
                <button onClick={()=>setS("base",S.base+decision.step)}
                  style={{padding:"10px 16px",borderRadius:8,background:"var(--accent)",
                    color:"var(--accent-ink)",fontWeight:600,fontSize:14}}>
                  Применить: база {S.base} → {S.base+decision.step}</button>
              )}
              <p style={{margin:"9px 0 0",fontSize:12,color:"var(--muted)"}}>
                Гистерезис: прошлое решение двигало базу в ту же сторону — половинный шаг;
                в противоположную — не принимать, держать 14 дней.
              </p>
            </>
          )}
        </div>
      </>}

      {tab==="set" && <>
        <div className="card" style={{padding:14,marginBottom:10}}>
          <div className="eyebrow" style={{marginBottom:9}}>База · корректируется по тренду веса</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>setS("base",S.base-25)} className="num"
              style={{padding:"10px 15px",borderRadius:8,border:"1px solid var(--line)",fontSize:16}}>−25</button>
            <input type="number" value={S.base} onChange={e=>setS("base",+e.target.value||0)}
              style={{textAlign:"center",fontSize:17,fontWeight:600}} aria-label="База ккал"/>
            <button onClick={()=>setS("base",S.base+25)} className="num"
              style={{padding:"10px 15px",borderRadius:8,border:"1px solid var(--line)",fontSize:16}}>+25</button>
          </div>
          <p style={{margin:"9px 0 0",fontSize:12,color:"var(--faint)"}}>
            RMR + базовый NEAT + TEF. Не зависит от активности — её считают шаги и сессии.
          </p>
        </div>

        <div className="card" style={{padding:14,marginBottom:10}}>
          <div className="eyebrow" style={{marginBottom:9}}>Коэффициент активности · вторая ручка</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[0.85,0.9,0.95,1,1.05,1.1,1.15].map(v=>(
              <button key={v} onClick={()=>setS("kAct",v)} className="num"
                style={{fontSize:13,padding:"8px 12px",borderRadius:7,border:"1px solid var(--line)",
                  background:Math.abs((+S.kAct||1)-v)<1e-9?"var(--accent)":"var(--raised)",
                  color:Math.abs((+S.kAct||1)-v)<1e-9?"var(--accent-ink)":"var(--muted)"}}>
                {v.toFixed(2)}</button>
            ))}
          </div>
          <p style={{margin:"10px 0 0",fontSize:12,color:"var(--faint)",lineHeight:1.6}}>
            Множитель на весь блок активности (шаги + сессии). Трогать <b>только через 8 недель</b>:
            сравни недели с высокой активностью против низких. Малоподвижные недели росли быстрее —
            коэффициент занижен, подними. Активные росли быстрее — опусти.
            Ошибка базы одинакова каждый день, ошибка коэффициента растёт с нагрузкой — поэтому ручки две.
          </p>
        </div>

        <div className="card" style={{padding:14,marginBottom:10}}>
          <div className="eyebrow" style={{marginBottom:9}}>Вес тела · для расчёта сессий</div>
          <input type="number" inputMode="decimal" step="0.5" value={S.bw}
            onChange={e=>setS("bw",+e.target.value||71)} aria-label="Вес тела"/>
          <p style={{margin:"8px 0 0",fontSize:12,color:"var(--faint)"}}>
            ккал/мин = (MET − 1) × 3,5 × вес / 200. Обновляй раз в месяц по скользящей средней.
          </p>
        </div>

        <div className="card" style={{padding:14,marginBottom:10}}>
          <div className="eyebrow" style={{marginBottom:9}}>Старт цикла</div>
          <input type="date" value={S.startDate} onChange={e=>setS("startDate",e.target.value)} aria-label="Дата старта"/>
          <p style={{margin:"8px 0 0",fontSize:12,color:"var(--faint)"}}>
            От неё считаются дни решений. Сегодня — день {dayIndex}.
          </p>
        </div>

        <div className="card" style={{padding:14,marginBottom:10}}>
          <div className="eyebrow" style={{marginBottom:9}}>Справка по движку</div>
          <div className="num" style={{fontSize:12.5,color:"var(--muted)",lineHeight:1.9}}>
            ккал = база + (шаги_нетто + Σ сессий) × коэф. + профицит<br/>
            сессия = (MET − 1) × 3,5 × вес / 200 × минуты<br/>
            шаги_нетто = шаги с часов − Σ (шагов/мин × минуты) по сессиям<br/>
            профицит +300, если есть силовая сессия<br/>
            полы: без силовой 2350 · с силовой 2900<br/>
            белок 185 г · жиры пол 60 г · углеводы — остаток
          </div>
          <p style={{margin:"10px 0 0",fontSize:12,color:"var(--faint)"}}>
            Вычет шагов нужен, потому что часы приписывают шаги при махах, жимах и лазании.
            Без него зал считался бы дважды.
          </p>
        </div>

        <div className="card" style={{padding:14}}>
          <div className="eyebrow" style={{marginBottom:9}}>Данные</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>{const t=JSON.stringify(db,null,2);
              navigator.clipboard?navigator.clipboard.writeText(t).then(()=>alert("Скопировано"),()=>alert("Не вышло")):alert("Буфер недоступен")}}
              style={{border:"1px solid var(--accent)",background:"var(--accent-wash)",color:"var(--accent)",
                borderRadius:8,padding:"10px 14px",fontSize:13.5,fontWeight:600}}>Скопировать JSON</button>
            <button onClick={()=>{if(confirm("Стереть весь журнал? Это необратимо.")) setDb({settings:S,days:{},custom:[]})}}
              style={{border:"1px solid var(--line)",color:"var(--over)",borderRadius:8,padding:"10px 14px",fontSize:13.5}}>
              Очистить дни</button>
          </div>
          <p style={{margin:"10px 0 0",fontSize:12,color:"var(--faint)"}}>
            Дней в журнале: <span className="num">{Object.keys(db.days).length}</span>.
            Хранится в этом браузере, никуда не уходит.
          </p>
        </div>
      </>}

      <footer style={{marginTop:22,paddingTop:14,borderTop:"1px solid var(--line-soft)",fontSize:12,color:"var(--faint)"}}>
        День закрывается всегда. Плохая оценка лучше пустой ячейки. Откат — один приём пищи, не неделя.
      </footer>
    </div>
  );
}
function start(){ ReactDOM.createRoot(document.getElementById("root")).render(<App/>); }
/* Сначала подтягиваем и сливаем серверную копию, потом рисуем — иначе
   первый же save() отправил бы на сервер пустой документ. Если сети нет,
   стартуем на локальных данных. */
if(window.Sync) window.Sync.boot().then(start, start); else start();
