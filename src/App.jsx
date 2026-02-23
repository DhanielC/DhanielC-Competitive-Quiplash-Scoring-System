import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
// Admin password is read from Vite env variable `VITE_ADMIN_PASSWORD`.
// For security, do NOT hardcode secrets in source. Provide a `.env` file instead.
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "";
const BASE_POINTS = [12, 10, 8, 6, 4, 2, 1, 0];
const GAME_MULTIPLIERS = { 1: 1, 2: 1, 3: 2 };
const MAX_TEAMS = 8;
const STORAGE_KEY = "quiplash_v4";

const PHASES = [
  { id:"pregame", label:"Pre-Game",         step:0, game:null, type:"setup"  },
  { id:"draft_1", label:"Game 1 — Draft",   step:1, game:1,    type:"draft"  },
  { id:"game_1",  label:"Game 1 — Playing", step:2, game:1,    type:"game"   },
  { id:"draft_2", label:"Game 2 — Draft",   step:3, game:2,    type:"draft"  },
  { id:"game_2",  label:"Game 2 — Playing", step:4, game:2,    type:"game"   },
  { id:"draft_3", label:"Game 3 — Draft",   step:5, game:3,    type:"draft"  },
  { id:"game_3",  label:"Game 3 — Playing", step:6, game:3,    type:"game"   },
  { id:"podium",  label:"Podium",            step:7, game:null, type:"podium" },
];

const LIGHT = { bg:"#f5f6f8", surface:"#ffffff", border:"#e2e4e9", text:"#111827", sub:"#6b7280", accent:"#e63946", accent2:"#457b9d", isDark:false };
const DARK  = { bg:"#0f0f14", surface:"#17171f", border:"#272736", text:"#f1f1f5", sub:"#8b8ba8", accent:"#f7c948", accent2:"#ff6b35", isDark:true  };

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const ICONS = {
  trophy:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>`,
  clipboard:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
  users:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  play:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
  logout:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  check:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  x:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  plus:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  minus:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  drag:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="7" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="17" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="17" r="1"/></svg>`,
  camera:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  sun:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  moon:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  star:     `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  medal:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  ban:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
  save:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  trash:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  lock:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  upload:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
};

function Ico({ name, size=16, color, style:sx={} }) {
  return (
    <span
      style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:size,height:size,flexShrink:0,color:color||"currentColor",...sx }}
      dangerouslySetInnerHTML={{ __html: ICONS[name] || "" }}
    />
  );
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
function mkTeam(id) {
  return {
    id, name:`Team ${id}`, playerName:"", coachName:"",
    teamLogo:null, playerAvatar:null, coachAvatar:null,
    strikes:[0,0,0],       // per-game, reset each game
    bonusPoints:[0,0,0],   // meta wins per game
    placements:[null,null,null],
    dnf:[false,false,false],
  };
}

function mkDefault() {
  return {
    tournamentName:"Competitive Quiplash Championship",
    tournamentLogo:null,
    isDark:true,
    accent:"#f7c948",
    accent2:"#ff6b35",
    teams:Array.from({length:MAX_TEAMS},(_,i)=>mkTeam(i+1)),
    currentPhase:"pregame",
    currentGame:1,
    words:{
      1:{pool:[],banned:[],assignments:{}},
      2:{pool:[],banned:[],assignments:{}},
      3:{pool:[],banned:[],assignments:{}},
    },
    completedGames:[],
  };
}

// ─── SCORING ─────────────────────────────────────────────────────────────────
function buildEffPlacements(orderedIds, dnfSet) {
  const r={};let idx=0;
  for (const id of orderedIds) {
    if (dnfSet.has(id)) r[id]=null;
    else { r[id]=idx; idx++; }
  }
  return r;
}

function gameScore(team, gi) {
  if (team.dnf[gi]) return 0;
  const p=team.placements[gi];
  if (p===null) return 0;
  return (BASE_POINTS[p]??0)*GAME_MULTIPLIERS[gi+1];
}

function strikeDed(s) {
  if (s>=3) return 0;
  if (s>=2) return -4;
  if (s>=1) return -2;
  return 0;
}

function teamTotal(tm) {
  let tot=0;
  for (let g=0;g<3;g++) {
    tot+=gameScore(tm,g);
    tot+=tm.bonusPoints?.[g]||0;
    tot+=strikeDed(tm.strikes?.[g]||0);
  }
  return Math.max(0,tot);
}

function teamBonus(tm) { return (tm.bonusPoints||[0,0,0]).reduce((a,b)=>a+b,0); }

function rankTeams(teams) {
  return [...teams].sort((a,b)=>{
    const d=teamTotal(b)-teamTotal(a);
    return d!==0?d:teamBonus(b)-teamBonus(a);
  });
}

function phaseOf(id) { return PHASES.find(p=>p.id===id)||PHASES[0]; }

// ─── STORAGE + SYNC ───────────────────────────────────────────────────────────
function merge(base,over) {
  const r={...base};
  for (const k of Object.keys(over)) {
    if (over[k]!==null&&typeof over[k]==="object"&&!Array.isArray(over[k]))
      r[k]=merge(base[k]||{},over[k]);
    else r[k]=over[k];
  }
  return r;
}

function useStore() {
  const [state,setRaw]=useState(()=>{
    try { const raw=localStorage.getItem(STORAGE_KEY); if(raw) return merge(mkDefault(),JSON.parse(raw)); } catch{}
    return mkDefault();
  });

  const setState=useCallback((fn)=>{
    setRaw(prev=>{
      const next=typeof fn==="function"?fn(prev):fn;
      try { localStorage.setItem(STORAGE_KEY,JSON.stringify(next)); } catch{}
      return next;
    });
  },[]);

  useEffect(()=>{
    const h=(e)=>{ if(e.key===STORAGE_KEY&&e.newValue) { try{setRaw(JSON.parse(e.newValue));}catch{} } };
    window.addEventListener("storage",h);
    return ()=>window.removeEventListener("storage",h);
  },[]);

  return [state,setState];
}

async function toDataURL(file) {
  return new Promise(res=>{ const r=new FileReader(); r.onload=e=>res(e.target.result); r.readAsDataURL(file); });
}

function getTheme(state) {
  const base=state.isDark?{...DARK}:{...LIGHT};
  if(state.accent)  base.accent=state.accent;
  if(state.accent2) base.accent2=state.accent2;
  return base;
}

// ─── STYLE UTILS ──────────────────────────────────────────────────────────────
const iSt=(t,ex={})=>({background:t.isDark?"rgba(255,255,255,.05)":"rgba(0,0,0,.04)",border:`1px solid ${t.border}`,borderRadius:8,padding:"8px 11px",color:t.text,fontSize:13,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",...ex});
const bSt=(bg,color,ex={})=>({background:bg,color,border:"none",borderRadius:8,padding:"7px 14px",fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,...ex});
const cSt=(t,ex={})=>({background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,...ex});
const Lbl=({t,children})=><div style={{fontSize:11,fontWeight:700,letterSpacing:.5,color:t.sub,textTransform:"uppercase",marginBottom:4}}>{children}</div>;

// ─── AVATAR ───────────────────────────────────────────────────────────────────
function Av({src,name,size=36,round=false}) {
  const ini=(name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const br=round?"50%":8;
  if (src&&src.length>10)
    return <img src={src} alt={name} style={{width:size,height:size,borderRadius:br,objectFit:"cover",flexShrink:0}} />;
  return <div style={{width:size,height:size,borderRadius:br,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.35,fontWeight:700,color:"#fff",flexShrink:0,userSelect:"none"}}>{ini}</div>;
}

function ImgPicker({t,src,onChange,label,size=50,round=false}) {
  const ref=useRef();
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <div onClick={()=>ref.current.click()} style={{cursor:"pointer",position:"relative"}}>
        <Av src={src} name={label} size={size} round={round} />
        <div style={{position:"absolute",bottom:-2,right:-2,width:18,height:18,borderRadius:"50%",background:t.accent,display:"flex",alignItems:"center",justifyContent:"center",color:t.isDark?"#111":"#fff"}}>
          <Ico name="camera" size={10} />
        </div>
      </div>
      <span style={{fontSize:10,color:t.sub,textAlign:"center"}}>{label}</span>
      <input ref={ref} type="file" accept="image/*" onChange={async e=>{const f=e.target.files[0];if(f) onChange(await toDataURL(f));}} style={{display:"none"}} />
    </div>
  );
}

function StrikePips({count,size=9}) {
  return <div style={{display:"flex",gap:3}}>{[0,1,2].map(i=><div key={i} style={{width:size,height:size,borderRadius:"50%",background:i<count?"#ef4444":"rgba(128,128,128,.2)",transition:"background .15s"}} />)}</div>;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({t,onLogin}) {
  const [pw,setPw]=useState("");
  const [err,setErr]=useState(false);
  const [shk,setShk]=useState(false);
  const go=()=>{ if(pw===ADMIN_PASSWORD){onLogin();}else{setErr(true);setShk(true);setTimeout(()=>setShk(false),450);} };
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:t.bg}}>
      <div style={{...cSt(t,{padding:40,width:320,textAlign:"center"}),animation:shk?"shake .4s":""}}>
        <div style={{width:48,height:48,borderRadius:12,background:t.accent+"22",border:`1px solid ${t.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",color:t.accent}}>
          <Ico name="lock" size={22} />
        </div>
        <h2 style={{margin:"0 0 4px",color:t.text,fontSize:20,fontWeight:800}}>Admin Access</h2>
        <p style={{margin:"0 0 24px",color:t.sub,fontSize:13}}>Quiplash Tournament</p>
        <input type="password" placeholder="Password" value={pw}
          onChange={e=>{setPw(e.target.value);setErr(false);}}
          onKeyDown={e=>e.key==="Enter"&&go()}
          style={{...iSt(t,{textAlign:"center",marginBottom:err?6:12,border:`1px solid ${err?"#ef4444":t.border}`})}}
        />
        {err&&<p style={{margin:"0 0 10px",color:"#ef4444",fontSize:12}}>Wrong password</p>}
        <button onClick={go} style={{...bSt(t.accent,t.isDark?"#111":"#fff",{width:"100%",justifyContent:"center",padding:"10px",fontSize:14})}}>Enter</button>
        <p style={{margin:"12px 0 0",color:t.sub,fontSize:11}}>Default: quiplash2025</p>
      </div>
    </div>
  );
}

// ─── PRE-GAME PUBLIC ─────────────────────────────────────────────────────────
function PreGamePublic({state,t}) {
  return (
    <div style={{minHeight:"100vh",background:t.bg,display:"flex",flexDirection:"column",alignItems:"center",padding:"40px 24px"}}>
      {state.tournamentLogo&&<img src={state.tournamentLogo} alt="" style={{height:64,objectFit:"contain",marginBottom:16}} />}
      <h1 style={{margin:"0 0 6px",fontSize:"clamp(22px,5vw,52px)",fontWeight:800,color:t.text,textAlign:"center",letterSpacing:-1}}>{state.tournamentName}</h1>
      <p style={{margin:"0 0 40px",fontSize:15,color:t.sub,fontWeight:500}}>Participating Teams</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:14,width:"100%",maxWidth:900}}>
        {state.teams.map(tm=>(
          <div key={tm.id} style={{...cSt(t,{padding:22,textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:10})}}>
            <Av src={tm.teamLogo} name={tm.name} size={70} />
            <div>
              <div style={{fontWeight:800,fontSize:15,color:t.text}}>{tm.name}</div>
              {tm.playerName&&<div style={{fontSize:12,color:t.sub,marginTop:2}}>{tm.playerName}</div>}
              {tm.coachName&&<div style={{fontSize:11,color:t.sub,opacity:.7}}>{tm.coachName}</div>}
            </div>
            {(tm.playerAvatar||tm.coachAvatar)&&(
              <div style={{display:"flex",gap:6,justifyContent:"center"}}>
                {tm.playerAvatar&&<Av src={tm.playerAvatar} name={tm.playerName} size={30} round />}
                {tm.coachAvatar&&<Av src={tm.coachAvatar} name={tm.coachName} size={30} round />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DRAFT PUBLIC ─────────────────────────────────────────────────────────────
function DraftPublic({state,t,phase}) {
  const gn=phase.game;
  const effGn = (gn===2||gn===3)?1:gn;
  const pool = state.words?.[effGn]?.pool||[]; // shared pool (game 1 for games 2/3)
  const banned = state.words?.[gn]?.banned||[]; // banned is per-game
  const asgn = state.words?.[gn]?.assignments||{}; // assignments per-game
  const available=pool.filter(w=>!banned.includes(w));
  const ranked=gn===1?state.teams:rankTeams(state.teams);
  return (
    <div style={{maxWidth:860,margin:"0 auto 24px",padding:"0 16px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        <div style={cSt(t,{padding:16})}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:.5,color:t.sub,textTransform:"uppercase",marginBottom:10}}>Word Pool</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {pool.length===0&&<span style={{color:t.sub,fontSize:13}}>No words yet</span>}
            {pool.map(w=>{
              const ib=banned.includes(w);
              const ia=!ib&&Object.values(asgn).includes(w);
              return <span key={w} style={{padding:"3px 9px",borderRadius:16,fontSize:12,fontWeight:600,background:ib?"rgba(239,68,68,.1)":ia?"rgba(34,197,94,.1)":t.isDark?"rgba(255,255,255,.06)":"rgba(0,0,0,.05)",color:ib?"#ef4444":ia?"#22c55e":t.text,textDecoration:ib?"line-through":"none",border:`1px solid ${ib?"rgba(239,68,68,.25)":ia?"rgba(34,197,94,.25)":t.border}`}}>{w}</span>;
            })}
          </div>
        </div>
        <div style={cSt(t,{padding:16,borderColor:"rgba(239,68,68,.3)"})}>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,fontWeight:700,letterSpacing:.5,color:"#ef4444",textTransform:"uppercase",marginBottom:10}}>
            <Ico name="ban" size={12} color="#ef4444" /> Banned Words
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {banned.length===0&&<span style={{color:t.sub,fontSize:13}}>None banned</span>}
            {banned.map(w=><span key={w} style={{padding:"3px 9px",borderRadius:16,fontSize:12,fontWeight:600,background:"rgba(239,68,68,.1)",color:"#ef4444",border:"1px solid rgba(239,68,68,.25)"}}>{w}</span>)}
          </div>
        </div>
        <div style={cSt(t,{padding:16})}>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,fontWeight:700,letterSpacing:.5,color:t.sub,textTransform:"uppercase",marginBottom:10}}>
            <Ico name="star" size={12} color="#f59e0b" /> Meta Draft
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {ranked.map((tm,i)=>{
              const word=Object.entries(asgn).find(([id])=>Number(id)===tm.id)?.[1];
              return (
                <div key={tm.id} style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:10,color:t.sub,width:14}}>{i+1}</span>
                  <Av src={tm.teamLogo} name={tm.name} size={18} />
                  <span style={{fontSize:12,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:t.text}}>{tm.name}</span>
                  {word?<span style={{fontSize:11,fontWeight:700,color:"#22c55e",background:"rgba(34,197,94,.1)",padding:"2px 7px",borderRadius:10}}>{word}</span>:<span style={{fontSize:11,color:t.sub}}>—</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PODIUM ───────────────────────────────────────────────────────────────────
function Podium({state,t}) {
  const ranked=rankTeams(state.teams);
  const [vis,setVis]=useState(false);
  useEffect(()=>{const tm=setTimeout(()=>setVis(true),200);return()=>clearTimeout(tm);},[]);
  const trio=[{tm:ranked[1],rank:2,h:200},{tm:ranked[0],rank:1,h:280},{tm:ranked[2],rank:3,h:160}].filter(d=>d.tm);
  const medalColor=["","#f7c948","#b0b0b0","#cd7f32"];
  return (
    <div style={{minHeight:"100vh",background:t.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      {state.tournamentLogo&&<img src={state.tournamentLogo} alt="" style={{height:56,objectFit:"contain",marginBottom:16,opacity:vis?1:0,transition:"opacity .8s"}} />}
      <h1 style={{margin:"0 0 40px",fontSize:"clamp(22px,5vw,52px)",fontWeight:800,color:t.text,textAlign:"center",opacity:vis?1:0,transition:"opacity .8s .2s"}}>Final Standings</h1>
      <div style={{display:"flex",alignItems:"flex-end",gap:10}}>
        {trio.map(({tm,rank,h},i)=>(
          <div key={tm.id} style={{display:"flex",flexDirection:"column",alignItems:"center",opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(60px)",transition:`all .7s cubic-bezier(.34,1.56,.64,1) ${.1+i*.15}s`}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,marginBottom:10}}>
              <Ico name="medal" size={rank===1?34:24} color={medalColor[rank]} />
              <Av src={tm.teamLogo} name={tm.name} size={rank===1?70:52} />
              <div style={{textAlign:"center"}}>
                <div style={{fontWeight:800,fontSize:rank===1?17:14,color:t.text}}>{tm.name}</div>
                {tm.playerName&&<div style={{fontSize:11,color:t.sub}}>{tm.playerName}</div>}
              </div>
              <div style={{fontWeight:800,fontSize:rank===1?26:20,color:rank===1?t.accent:t.text}}>{teamTotal(tm)} pts</div>
            </div>
            <div style={{width:rank===1?150:120,height:h,borderRadius:"10px 10px 0 0",background:rank===1?t.accent+"18":t.isDark?"rgba(255,255,255,.04)":"rgba(0,0,0,.04)",border:`2px solid ${rank===1?t.accent:t.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:rank===1?64:48,fontWeight:900,color:t.border,opacity:.3}}>{rank}</span>
            </div>
          </div>
        ))}
      </div>
      {ranked.length>3&&(
        <div style={{marginTop:32,width:"100%",maxWidth:480}}>
          {ranked.slice(3).map((tm,i)=>(
            <div key={tm.id} style={{...cSt(t,{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",marginBottom:5}),opacity:vis?1:0,transition:`opacity .4s ease ${.6+i*.07}s`}}>
              <span style={{fontWeight:700,color:t.sub,width:18}}>{i+4}</span>
              <Av src={tm.teamLogo} name={tm.name} size={28} />
              <span style={{fontWeight:600,flex:1,color:t.text}}>{tm.name}</span>
              <span style={{fontWeight:800,color:t.text}}>{teamTotal(tm)} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PUBLIC VIEW ─────────────────────────────────────────────────────────────
function PublicView({state}) {
  const t=getTheme(state);
  const phase=phaseOf(state.currentPhase);
  if (phase.type==="podium") return <Podium state={state} t={t} />;
  if (phase.type==="setup")  return <PreGamePublic state={state} t={t} />;
  const ranked=rankTeams(state.teams);
  const medalColor=["#f7c948","#b0b0b0","#cd7f32"];
  const isDraft=phase.type==="draft";
  const isGame=phase.type==="game";
  return (
    <div style={{minHeight:"100vh",background:t.bg,color:t.text}}>
      <div style={{textAlign:"center",padding:"32px 20px 20px"}}>
        {state.tournamentLogo&&<img src={state.tournamentLogo} alt="" style={{height:58,objectFit:"contain",marginBottom:12}} />}
        <h1 style={{margin:0,fontSize:"clamp(18px,4vw,42px)",fontWeight:800,color:t.text,letterSpacing:-1}}>{state.tournamentName}</h1>
        <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:12,flexWrap:"wrap"}}>
          {[1,2,3].map(g=>{
            const done=state.completedGames?.includes(g);
            const active=phase.game===g;
            return <div key={g} style={{padding:"4px 14px",borderRadius:20,fontSize:12,fontWeight:700,background:done?t.accent:active?t.isDark?"rgba(255,255,255,.08)":"rgba(0,0,0,.06)":"transparent",color:done?(t.isDark?"#111":"#fff"):active?t.accent:t.sub,border:`1.5px solid ${active?t.accent:done?t.accent:t.border}`}}>Game {g}{g===3?" (×2)":""}{done?" ✓":""}</div>;
          })}
        </div>
        <div style={{marginTop:10,display:"inline-flex",alignItems:"center",gap:6,padding:"4px 14px",borderRadius:20,background:isGame?"rgba(34,197,94,.1)":isDraft?"rgba(59,130,246,.08)":"transparent",border:`1px solid ${isGame?"rgba(34,197,94,.3)":isDraft?"rgba(59,130,246,.2)":t.border}`}}>
          {isGame&&<div style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",animation:"pulse 1.5s infinite"}} />}
          <span style={{fontSize:13,fontWeight:600,color:isGame?"#22c55e":isDraft?"#3b82f6":t.sub}}>{phase.label}</span>
        </div>
      </div>
      {isDraft&&<DraftPublic state={state} t={t} phase={phase} />}
      <div style={{maxWidth:820,margin:"0 auto",padding:"0 16px 40px"}}>
        <div style={{display:"grid",gridTemplateColumns:"44px 1fr 72px 68px 56px",gap:8,padding:"0 12px 8px",fontSize:11,fontWeight:700,letterSpacing:.5,color:t.sub,textTransform:"uppercase",borderBottom:`1px solid ${t.border}`}}>
          <div>#</div><div>Team</div><div style={{textAlign:"right"}}>Pts</div><div style={{textAlign:"center"}}>Strikes</div><div style={{textAlign:"right"}}>Bonus</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:6}}>
          {ranked.map((tm,idx)=>{
            const tot=teamTotal(tm);
            const bon=teamBonus(tm);
            const allS=(tm.strikes||[0,0,0]).reduce((a,b)=>a+b,0);
            return (
              <div key={tm.id} style={{display:"grid",gridTemplateColumns:"44px 1fr 72px 68px 56px",gap:8,padding:"10px 12px",borderRadius:10,background:t.surface,border:`1px solid ${idx===0?t.accent+"44":t.border}`,alignItems:"center"}}>
                <div style={{textAlign:"center"}}>
                  {idx<3?<Ico name="medal" size={20} color={medalColor[idx]} />:<span style={{fontWeight:700,color:t.sub,fontSize:14}}>{idx+1}</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                  <Av src={tm.teamLogo} name={tm.name} size={36} />
                  <div style={{minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:t.text}}>{tm.name}</div>
                    <div style={{display:"flex",gap:5,alignItems:"center",marginTop:2}}>
                      {tm.playerName&&<><Av src={tm.playerAvatar} name={tm.playerName} size={14} round /><span style={{fontSize:11,color:t.sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tm.playerName}</span></>}
                      {tm.coachName&&<><span style={{color:t.border,fontSize:10}}>|</span><Av src={tm.coachAvatar} name={tm.coachName} size={14} round /><span style={{fontSize:11,color:t.sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tm.coachName}</span></>}
                    </div>
                  </div>
                </div>
                <div style={{textAlign:"right",fontWeight:800,fontSize:22,color:idx===0?t.accent:t.text}}>{tot}</div>
                <div style={{display:"flex",justifyContent:"center"}}><StrikePips count={allS} /></div>
                <div style={{textAlign:"right",fontWeight:700,fontSize:15,color:bon>0?"#22c55e":t.sub}}>+{bon}</div>
              </div>
            );
          })}
        </div>
        <p style={{textAlign:"center",marginTop:18,fontSize:11,color:t.sub}}>Tiebreaker: Total Bonus Points · Game 3 = ×2 pts</p>
      </div>
    </div>
  );
}

// ─── ADMIN SHELL ─────────────────────────────────────────────────────────────
function Admin({state,setState,t,onLogout}) {
  const [tab,setTab]=useState("phase");
  const phase=phaseOf(state.currentPhase);
  const navBg=t.isDark?"#0d0d12":"#eaeaf0";
  const tabs=[
    {id:"phase",icon:"play",label:"Phase"},
    {id:"scoring",icon:"trophy",label:"Scoring"},
    {id:"draft",icon:"clipboard",label:"Draft"},
    {id:"teams",icon:"users",label:"Teams"},
    {id:"settings",icon:"settings",label:"Settings"},
  ];
  return (
    <div style={{position:"fixed",inset:0,display:"flex",background:t.bg,overflow:"hidden",zIndex:999}}>
      <div style={{width:170,height:"100vh",background:navBg,borderRight:`1px solid ${t.border}`,display:"flex",flexDirection:"column",flexShrink:0,boxSizing:"border-box"}}>
        <div style={{padding:"18px 14px 12px"}}>
          <div style={{fontWeight:800,fontSize:13,color:t.accent,letterSpacing:.5}}>ADMIN</div>
          <div style={{fontSize:11,color:t.sub,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{phase.label}</div>
        </div>
        <div style={{flex:1,padding:"4px 8px"}}>
          {tabs.map(tb=>(
            <button key={tb.id} onClick={()=>setTab(tb.id)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"9px 10px",borderRadius:8,border:"none",background:tab===tb.id?t.accent+"20":"transparent",color:tab===tb.id?t.accent:t.sub,fontWeight:tab===tb.id?700:500,fontSize:13,cursor:"pointer",marginBottom:2,textAlign:"left"}}>
              <Ico name={tb.icon} size={15} />{tb.label}
            </button>
          ))}
        </div>
        <div style={{padding:"10px 8px"}}>
          <button onClick={onLogout} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",borderRadius:8,border:"none",background:"transparent",color:"#ef4444",fontWeight:600,fontSize:13,cursor:"pointer"}}>
            <Ico name="logout" size={15} color="#ef4444" />Logout
          </button>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:24,display:"flex",flexDirection:"column",minHeight:"100vh",boxSizing:"border-box"}}>
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          {tab==="phase"    &&<PhaseTab    state={state} setState={setState} t={t} />}
          {tab==="scoring"  &&<ScoringTab  state={state} setState={setState} t={t} />}
          {tab==="draft"    &&<DraftTab    state={state} setState={setState} t={t} />}
          {tab==="teams"    &&<TeamsTab    state={state} setState={setState} t={t} />}
          {tab==="settings" &&<SettingsTab state={state} setState={setState} t={t} />}
        </div>
      </div>
    </div>
  );
}

// ─── PHASE TAB ────────────────────────────────────────────────────────────────
function PhaseTab({state,setState,t}) {
  const idx=PHASES.findIndex(p=>p.id===state.currentPhase);
  const go=(id)=>{
    const ph=phaseOf(id);
    setState(s=>({...s,currentPhase:id,currentGame:ph.game||s.currentGame}));
  };
  return (
    <div style={{maxWidth:560}}>
      <h2 style={{margin:"0 0 4px",fontWeight:800,fontSize:20,color:t.text}}>Phase Control</h2>
      <p style={{margin:"0 0 20px",color:t.sub,fontSize:13}}>Controls what the public stream sees in real time.</p>
      <div style={{...cSt(t,{padding:22,marginBottom:16,textAlign:"center"})}}>
        <div style={{fontSize:12,fontWeight:700,letterSpacing:.5,color:t.sub,textTransform:"uppercase",marginBottom:4}}>Currently Showing</div>
        <div style={{fontSize:24,fontWeight:800,color:t.accent,marginBottom:14}}>{phaseOf(state.currentPhase).label}</div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <button onClick={()=>{if(idx>0)go(PHASES[idx-1].id);}} disabled={idx===0} style={{...bSt(t.isDark?"rgba(255,255,255,.07)":"rgba(0,0,0,.06)",t.text,{padding:"9px 22px",opacity:idx===0?.3:1})}}>← Back</button>
          <button onClick={()=>{if(idx<PHASES.length-1)go(PHASES[idx+1].id);}} disabled={idx===PHASES.length-1} style={{...bSt(t.accent,t.isDark?"#111":"#fff",{padding:"9px 28px",opacity:idx===PHASES.length-1?.4:1})}}>Next →</button>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:2}}>
        {PHASES.map((ph,i)=>{
          const cur=ph.id===state.currentPhase;
          const past=i<idx;
          return (
            <div key={ph.id} onClick={()=>go(ph.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:9,background:cur?t.accent+"18":"transparent",border:`1px solid ${cur?t.accent+"44":"transparent"}`,cursor:"pointer"}}>
              <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,background:cur?t.accent:past?"#22c55e22":t.isDark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)",border:`2px solid ${cur?t.accent:past?"#22c55e":t.border}`,display:"flex",alignItems:"center",justifyContent:"center",color:cur?(t.isDark?"#111":"#fff"):past?"#22c55e":t.sub}}>
                {past?<Ico name="check" size={10} />:<span style={{fontSize:10,fontWeight:800}}>{i+1}</span>}
              </div>
              <span style={{fontWeight:cur?700:500,fontSize:13,flex:1,color:cur?t.accent:t.text}}>{ph.label}</span>
              {cur&&<span style={{fontSize:10,fontWeight:700,color:t.accent,background:t.accent+"18",padding:"2px 8px",borderRadius:10}}>LIVE</span>}
              {ph.game===3&&!cur&&<span style={{fontSize:10,color:t.sub}}>×2</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SCORING TAB ─────────────────────────────────────────────────────────────
function ScoringTab({state,setState,t}) {
  const gameNum=state.currentGame||1;
  const gIdx=gameNum-1;
  const [order,setOrder]=useState(()=>state.teams.map(tm=>tm.id));
  const [dragId,setDragId]=useState(null);
  const [overId,setOverId]=useState(null);

  // Recompute dnf set every render from live state
  const dnfSet=new Set(state.teams.filter(tm=>(tm.strikes?.[gIdx]||0)>=3).map(tm=>tm.id));
  const eff=buildEffPlacements(order,dnfSet);

  const onDragStart=(id)=>setDragId(id);
  const onDragOver=(e,id)=>{e.preventDefault();setOverId(id);};
  const onDrop=(targetId)=>{
    if(!dragId||dragId===targetId){setDragId(null);setOverId(null);return;}
    setOrder(prev=>{const a=[...prev];const fi=a.indexOf(dragId),ti=a.indexOf(targetId);a.splice(fi,1);a.splice(ti,0,dragId);return a;});
    setDragId(null);setOverId(null);
  };

  const applyResults=()=>{
    const eff2=buildEffPlacements(order,dnfSet);
    setState(s=>({
      ...s,
      teams:s.teams.map(tm=>{
        const pIdx=eff2[tm.id];
        const np=[...tm.placements];
        const nd=[...tm.dnf];
        if(dnfSet.has(tm.id)){nd[gIdx]=true;np[gIdx]=order.indexOf(tm.id);}
        else{nd[gIdx]=false;np[gIdx]=pIdx;}
        return {...tm,placements:np,dnf:nd};
      }),
      completedGames:s.completedGames?.includes(gameNum)?s.completedGames:[...(s.completedGames||[]),gameNum],
    }));
  };

  const modStrike=(teamId,delta)=>{
    setState(s=>({...s,teams:s.teams.map(tm=>{
      if(tm.id!==teamId) return tm;
      const ns=[...(tm.strikes||[0,0,0])];
      ns[gIdx]=Math.max(0,Math.min((ns[gIdx]||0)+delta,3));
      const nd=[...tm.dnf];
      nd[gIdx]=ns[gIdx]>=3;
      return {...tm,strikes:ns,dnf:nd};
    })}));
  };

  const modBonus=(teamId,delta)=>{
    setState(s=>({...s,teams:s.teams.map(tm=>{
      if(tm.id!==teamId) return tm;
      const nb=[...(tm.bonusPoints||[0,0,0])];
      nb[gIdx]=Math.max(0,(nb[gIdx]||0)+delta);
      return {...tm,bonusPoints:nb};
    })}));
  };

  const getTeam=id=>state.teams.find(tm=>tm.id===id);

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{margin:0,fontWeight:800,fontSize:20,color:t.text}}>Game {gameNum} Scoring</h2>
          <p style={{margin:"2px 0 0",color:t.sub,fontSize:13}}>{gameNum===3?"×2 multiplier":"Base points"} · Drag to set placement · 3 strikes this game = DNF</p>
        </div>
        <div style={{display:"flex",gap:6}}>
          {[1,2,3].map(g=>(
            <button key={g} onClick={()=>setState(s=>({...s,currentGame:g}))}
              style={bSt(g===gameNum?t.accent:t.isDark?"rgba(255,255,255,.07)":"rgba(0,0,0,.06)",g===gameNum?(t.isDark?"#111":"#fff"):t.text,{padding:"6px 12px",fontSize:12})}>
              Game {g}{g===3?" ×2":""}
            </button>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 285px",gap:16}}>
        <div>
          <div style={{fontWeight:700,fontSize:11,color:t.sub,letterSpacing:.5,textTransform:"uppercase",marginBottom:8}}>Final Placement — drag to reorder</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {order.map((tid,i)=>{
              const tm=getTeam(tid);if(!tm) return null;
              const isDnf=dnfSet.has(tid);
              const pIdx=eff[tid];
              const rawBase=pIdx!==null?(BASE_POINTS[pIdx]??0):0;
              const pts=isDnf?0:rawBase*GAME_MULTIPLIERS[gameNum];
              const sThis=tm.strikes?.[gIdx]||0;
              return (
                <div key={tid} draggable
                  onDragStart={()=>onDragStart(tid)}
                  onDragOver={e=>onDragOver(e,tid)}
                  onDrop={()=>onDrop(tid)}
                  onDragEnd={()=>{setDragId(null);setOverId(null);}}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:isDnf?"rgba(239,68,68,.04)":t.surface,border:`1px solid ${isDnf?"rgba(239,68,68,.28)":overId===tid&&dragId!==tid?"rgba(99,102,241,.4)":t.border}`,cursor:"grab",opacity:dragId===tid?.4:1,userSelect:"none"}}>
                  <span style={{color:t.sub}}><Ico name="drag" size={16} /></span>
                  <span style={{fontWeight:800,fontSize:15,color:i<3?t.accent:t.sub,width:20,textAlign:"center"}}>{i+1}</span>
                  <Av src={tm.teamLogo} name={tm.name} size={30} />
                  <span style={{fontWeight:600,flex:1,fontSize:13,color:isDnf?"rgba(239,68,68,.7)":t.text,textDecoration:isDnf?"line-through":"none"}}>{tm.name}</span>
                  <StrikePips count={sThis} />
                  {isDnf?<span style={{fontWeight:700,color:"#ef4444",fontSize:12,marginLeft:4}}>DNF</span>:<span style={{fontWeight:700,color:"#22c55e",fontSize:14,minWidth:32,textAlign:"right"}}>+{pts}</span>}
                </div>
              );
            })}
          </div>
          <button onClick={applyResults} style={{...bSt(t.accent,t.isDark?"#111":"#fff",{marginTop:12,padding:"10px 22px",fontSize:14})}}>
            <Ico name="check" size={15} /> Apply Game {gameNum} Results
          </button>
        </div>
        <div>
          <div style={{fontWeight:700,fontSize:11,color:t.sub,letterSpacing:.5,textTransform:"uppercase",marginBottom:8}}>Strikes & Meta Bonus</div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {state.teams.map(tm=>{
              const sThis=tm.strikes?.[gIdx]||0;
              const bThis=tm.bonusPoints?.[gIdx]||0;
              const isDnf=sThis>=3;
              return (
                <div key={tm.id} style={cSt(t,{padding:"10px 12px",border:`1px solid ${isDnf?"rgba(239,68,68,.25)":t.border}`})}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
                    <Av src={tm.teamLogo} name={tm.name} size={22} />
                    <span style={{fontWeight:600,fontSize:12,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:t.text}}>{tm.name}</span>
                    <span style={{fontWeight:800,fontSize:13,color:t.accent}}>{teamTotal(tm)}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                    <StrikePips count={sThis} />
                    <div style={{flex:1}} />
                    <button onClick={()=>modStrike(tm.id,-1)} disabled={sThis===0} style={{width:24,height:24,borderRadius:6,border:`1px solid ${t.border}`,background:"transparent",color:t.sub,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:sThis===0?.3:1}}>
                      <Ico name="minus" size={11} />
                    </button>
                    <span style={{fontWeight:700,fontSize:13,color:isDnf?"#ef4444":sThis>0?"#f97316":t.text,minWidth:14,textAlign:"center"}}>{sThis}</span>
                    <button onClick={()=>modStrike(tm.id,1)} disabled={sThis>=3} style={{width:24,height:24,borderRadius:6,border:`1px solid ${t.border}`,background:"transparent",color:"#ef4444",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:sThis>=3?.3:1}}>
                      <Ico name="plus" size={11} />
                    </button>
                    <span style={{fontSize:10,fontWeight:700,color:isDnf?"#ef4444":"#f97316",minWidth:34,textAlign:"right"}}>{isDnf?"DNF":sThis>=2?"−6":sThis>=1?"−2":""}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:11,color:t.sub,fontWeight:600}}>Meta wins</span>
                    <div style={{flex:1}} />
                    <button onClick={()=>modBonus(tm.id,-1)} disabled={bThis===0} style={{width:24,height:24,borderRadius:6,border:`1px solid ${t.border}`,background:"transparent",color:t.sub,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:bThis===0?.3:1}}>
                      <Ico name="minus" size={11} />
                    </button>
                    <span style={{fontWeight:800,fontSize:15,color:bThis>0?"#22c55e":t.sub,minWidth:18,textAlign:"center"}}>{bThis}</span>
                    <button onClick={()=>modBonus(tm.id,1)} style={{width:24,height:24,borderRadius:6,border:"1px solid rgba(34,197,94,.3)",background:"rgba(34,197,94,.1)",color:"#22c55e",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <Ico name="plus" size={11} />
                    </button>
                    <span style={{fontSize:10,fontWeight:700,color:"#22c55e",minWidth:34,textAlign:"right"}}>{bThis>0?`+${bThis}`:""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DRAFT TAB ────────────────────────────────────────────────────────────────
function DraftTab({state,setState,t}) {
  const gameNum=state.currentGame||1;
  const displayGame = (gameNum===2||gameNum===3)?1:gameNum;
  const savedPool=state.words?.[displayGame]||{pool:[]};
  const savedLocal=state.words?.[gameNum]||{banned:[],assignments:{}};
  const [pool,setPool]=useState(savedPool.pool||[]);
  const [banned,setBanned]=useState(savedLocal.banned||[]);
  const [asgn,setAsgn]=useState(savedLocal.assignments||{});
  const [wInput,setWInput]=useState("");

  // FIX: reset local state when game switches
  useEffect(()=>{
    const p=state.words?.[displayGame]||{};
    const l=state.words?.[gameNum]||{};
    setPool(p.pool||[]);
    setBanned(l.banned||[]);
    setAsgn(l.assignments||{});
  },[gameNum]);

  const save=()=>setState(s=>{
    const nextWords={...s.words};
    // persist shared pool back to game 1
    const g1 = nextWords[1]||{};
    nextWords[1] = {...g1, pool};
    // persist banned + assignments for the current game
    const cur = nextWords[gameNum]||{};
    nextWords[gameNum] = {...cur, banned, assignments: asgn};
    return {...s, words: nextWords};
  });

  const addWord=()=>{
    const w=wInput.trim().toUpperCase();
    if(!w||pool.includes(w)||pool.length>=16) return;
    setPool(p=>[...p,w]);setWInput("");
  };

  const removeWord=(w)=>{
    setPool(p=>p.filter(x=>x!==w));
    setBanned(b=>b.filter(x=>x!==w));
    setAsgn(a=>{const n={...a};Object.keys(n).forEach(k=>{if(n[k]===w)delete n[k];});return n;});
  };

  const toggleBan=(w)=>{
    if(banned.includes(w)){setBanned(b=>b.filter(x=>x!==w));}
    else if(banned.length<8){
      setBanned(b=>[...b,w]);
      setAsgn(a=>{const n={...a};Object.keys(n).forEach(k=>{if(n[k]===w)delete n[k];});return n;});
    }
  };

  const assignWord=(word,teamId)=>{
    setAsgn(prev=>{
      const n={...prev};
      Object.keys(n).forEach(k=>{if(n[k]===word)delete n[k];});
      if(teamId) n[teamId]=word;
      return n;
    });
  };

  const available=pool.filter(w=>!banned.includes(w));
  const ranked=gameNum===1?state.teams:rankTeams(state.teams);
  const takenByOther=(word,teamId)=>Object.entries(asgn).some(([k,v])=>v===word&&Number(k)!==teamId);

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{margin:0,fontWeight:800,fontSize:20,color:t.text}}>Game {gameNum} Draft Board</h2>
          <p style={{margin:"2px 0 0",color:t.sub,fontSize:13}}>{gameNum>1?"Standings order (1st picks first)":"Registration order"}</p>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          {[1,2,3].map(g=>(
            <button key={g} onClick={()=>setState(s=>({...s,currentGame:g}))}
              style={bSt(g===gameNum?t.accent:t.isDark?"rgba(255,255,255,.07)":"rgba(0,0,0,.06)",g===gameNum?(t.isDark?"#111":"#fff"):t.text,{padding:"6px 12px",fontSize:12})}>
              Game {g}
            </button>
          ))}
          <button onClick={save} style={bSt("#22c55e","#fff",{padding:"6px 14px",fontSize:12})}>
            <Ico name="save" size={13} /> Save & Publish
          </button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
        <div style={cSt(t,{padding:16})}>
          <div style={{fontWeight:700,fontSize:11,color:t.sub,letterSpacing:.5,textTransform:"uppercase",marginBottom:10}}>Word Pool ({pool.length}/16)</div>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            <input value={wInput} onChange={e=>setWInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addWord()}
              placeholder="Add word…" style={{...iSt(t,{flex:1,fontSize:12})}} />
            <button onClick={addWord} style={bSt(t.accent,t.isDark?"#111":"#fff",{padding:"7px 11px"})}><Ico name="plus" size={13} /></button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {pool.map(w=>{
              const ib=banned.includes(w);
              const ia=!ib&&Object.values(asgn).includes(w);
              return (
                <div key={w} style={{display:"inline-flex",alignItems:"center",gap:3,padding:"3px 9px",borderRadius:16,cursor:"pointer",background:ib?"rgba(239,68,68,.1)":ia?"rgba(34,197,94,.1)":t.isDark?"rgba(255,255,255,.06)":"rgba(0,0,0,.05)",border:`1px solid ${ib?"rgba(239,68,68,.3)":ia?"rgba(34,197,94,.25)":t.border}`}}
                  onClick={()=>toggleBan(w)}>
                  <span style={{fontSize:12,fontWeight:600,color:ib?"#ef4444":ia?"#22c55e":t.text,textDecoration:ib?"line-through":"none"}}>{w}</span>
                  <span onClick={e=>{e.stopPropagation();removeWord(w);}} style={{fontSize:10,color:t.sub,cursor:"pointer",marginLeft:1}}>×</span>
                </div>
              );
            })}
          </div>
          <p style={{margin:"8px 0 0",fontSize:10,color:t.sub}}>Click word to toggle ban · max 8 banned</p>
        </div>
        <div style={cSt(t,{padding:16,borderColor:"rgba(239,68,68,.25)"})}>
          <div style={{display:"flex",alignItems:"center",gap:6,fontWeight:700,fontSize:11,color:"#ef4444",letterSpacing:.5,textTransform:"uppercase",marginBottom:10}}>
            <Ico name="ban" size={12} color="#ef4444" /> Banned ({banned.length}/8)
          </div>
          {banned.length===0?<p style={{color:t.sub,fontSize:13,margin:0}}>Click words in the pool to ban them.</p>
          :<div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {banned.map(w=><span key={w} onClick={()=>toggleBan(w)} style={{padding:"3px 9px",borderRadius:16,fontSize:12,fontWeight:600,background:"rgba(239,68,68,.1)",color:"#ef4444",border:"1px solid rgba(239,68,68,.25)",cursor:"pointer"}}>{w} ×</span>)}
          </div>}
          <div style={{marginTop:12,padding:"9px 11px",borderRadius:8,background:t.isDark?"rgba(239,68,68,.05)":"rgba(239,68,68,.03)",border:"1px solid rgba(239,68,68,.1)"}}>
            <p style={{margin:0,fontSize:11,color:t.sub}}>If a team submits a banned word: give them a strike in Scoring.</p>
          </div>
        </div>
        <div style={cSt(t,{padding:16})}>
          <div style={{display:"flex",alignItems:"center",gap:6,fontWeight:700,fontSize:11,color:t.sub,letterSpacing:.5,textTransform:"uppercase",marginBottom:10}}>
            <Ico name="star" size={12} color="#f59e0b" /> Meta Assignments
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {ranked.map((tm,i)=>{
              const cur=Object.entries(asgn).find(([id])=>Number(id)===tm.id)?.[1]||"";
              return (
                <div key={tm.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 6px",borderRadius:7,background:t.isDark?"rgba(255,255,255,.02)":"rgba(0,0,0,.02)"}}>
                  <span style={{fontSize:10,color:t.sub,width:14,fontWeight:700}}>{i+1}</span>
                  <Av src={tm.teamLogo} name={tm.name} size={22} />
                  <span style={{fontSize:12,fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:t.text}}>{tm.name}</span>
                  <select value={cur} onChange={e=>assignWord(e.target.value,e.target.value?tm.id:null)} style={{...iSt(t,{width:104,fontSize:11,padding:"4px 6px"})}}>
                    <option value="">— none —</option>
                    {available.map(w=><option key={w} value={w} disabled={takenByOther(w,tm.id)}>{w}{takenByOther(w,tm.id)?" ✓":""}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TEAMS TAB ────────────────────────────────────────────────────────────────
function TeamsTab({state,setState,t}) {
  const upd=(id,f,v)=>setState(s=>({...s,teams:s.teams.map(tm=>tm.id===id?{...tm,[f]:v}:tm)}));
  return (
    <div>
      <h2 style={{margin:"0 0 4px",fontWeight:800,fontSize:20,color:t.text}}>Team Roster</h2>
      <p style={{margin:"0 0 16px",color:t.sub,fontSize:13}}>Click avatar icons to upload photos.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(330px,1fr))",gap:12}}>
        {state.teams.map(tm=>(
          <div key={tm.id} style={cSt(t,{padding:18})}>
            <div style={{display:"grid",gridTemplateColumns:"90px 1fr",gap:12,alignItems:"start"}}>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <ImgPicker t={t} src={tm.teamLogo} onChange={v=>upd(tm.id,"teamLogo",v)} label="Team Logo" size={50} />
                <ImgPicker t={t} src={tm.playerAvatar} onChange={v=>upd(tm.id,"playerAvatar",v)} label="Player" size={42} round />
                <ImgPicker t={t} src={tm.coachAvatar} onChange={v=>upd(tm.id,"coachAvatar",v)} label="Coach" size={42} round />
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                <div><Lbl t={t}>Team Name</Lbl><input value={tm.name} onChange={e=>upd(tm.id,"name",e.target.value)} style={iSt(t)} /></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                  <div><Lbl t={t}>Player</Lbl><input value={tm.playerName} onChange={e=>upd(tm.id,"playerName",e.target.value)} style={iSt(t)} /></div>
                  <div><Lbl t={t}>Coach</Lbl><input value={tm.coachName} onChange={e=>upd(tm.id,"coachName",e.target.value)} style={iSt(t)} /></div>
                </div>
                <details style={{marginTop:2}}>
                  <summary style={{fontSize:11,color:t.sub,cursor:"pointer",userSelect:"none"}}>Paste image URLs instead</summary>
                  <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:6}}>
                    {[["teamLogo","Logo URL"],["playerAvatar","Player URL"],["coachAvatar","Coach URL"]].map(([f,ph])=>(
                      <input key={f} value={tm[f]||""} onChange={e=>upd(tm.id,f,e.target.value||null)} style={{...iSt(t,{fontSize:11})}} placeholder={ph} />
                    ))}
                  </div>
                </details>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function SettingsTab({state,setState,t}) {
  const doReset=()=>{
    if(!window.confirm("Reset ALL scores, strikes, placements, words, and bonus points?\n\nTeam names and images will be kept.")) return;
    const fresh={
      ...mkDefault(),
      teams:state.teams.map(tm=>({
        ...mkTeam(tm.id),
        name:tm.name,playerName:tm.playerName,coachName:tm.coachName,
        teamLogo:tm.teamLogo,playerAvatar:tm.playerAvatar,coachAvatar:tm.coachAvatar,
      })),
      tournamentName:state.tournamentName,
      tournamentLogo:state.tournamentLogo,
      isDark:state.isDark,
      accent:state.accent,
      accent2:state.accent2,
    };
    localStorage.setItem(STORAGE_KEY,JSON.stringify(fresh));
    setState(fresh);
  };
  const setLogo=async(e)=>{const f=e.target.files[0];if(!f)return;setState(s=>({...s,tournamentLogo:null}));const url=await toDataURL(f);setState(s=>({...s,tournamentLogo:url}));};
  return (
    <div style={{maxWidth:500}}>
      <h2 style={{margin:"0 0 4px",fontWeight:800,fontSize:20,color:t.text}}>Settings</h2>
      <p style={{margin:"0 0 20px",color:t.sub,fontSize:13}}>Tournament info, theme, and data reset.</p>
      <div style={cSt(t,{padding:20,marginBottom:12})}>
        <div style={{fontWeight:700,fontSize:14,color:t.text,marginBottom:14}}>Tournament Info</div>
        <Lbl t={t}>Name</Lbl>
        <input value={state.tournamentName} onChange={e=>setState(s=>({...s,tournamentName:e.target.value}))} style={{...iSt(t),marginBottom:12}} />
        <Lbl t={t}>Logo</Lbl>
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4,flexWrap:"wrap"}}>
          {state.tournamentLogo&&<img src={state.tournamentLogo} alt="" style={{height:38,objectFit:"contain",borderRadius:6}} />}
          <label style={{...bSt(t.isDark?"rgba(255,255,255,.07)":"rgba(0,0,0,.06)",t.sub,{cursor:"pointer",fontSize:12})}}>
            <Ico name="upload" size={13} /> Upload
            <input type="file" accept="image/*" onChange={setLogo} style={{display:"none"}} />
          </label>
          {state.tournamentLogo&&<button onClick={()=>setState(s=>({...s,tournamentLogo:null}))} style={bSt("rgba(239,68,68,.1)","#ef4444",{fontSize:12})}>
            <Ico name="x" size={12} /> Remove
          </button>}
        </div>
        <input value={state.tournamentLogo||""} onChange={e=>setState(s=>({...s,tournamentLogo:e.target.value||null}))} style={{...iSt(t,{fontSize:11,marginTop:8})}} placeholder="Or paste image URL…" />
      </div>
      <div style={cSt(t,{padding:20,marginBottom:12})}>
        <div style={{fontWeight:700,fontSize:14,color:t.text,marginBottom:14}}>Appearance</div>
        <div style={{display:"flex",gap:6,marginBottom:16}}>
          {[{v:false,label:"Light",icon:"sun"},{v:true,label:"Dark",icon:"moon"}].map(opt=>(
            <button key={String(opt.v)} onClick={()=>setState(s=>({...s,isDark:opt.v}))}
              style={bSt(opt.v===state.isDark?t.accent:t.isDark?"rgba(255,255,255,.07)":"rgba(0,0,0,.06)",opt.v===state.isDark?(t.isDark?"#111":"#fff"):t.text,{fontSize:12,padding:"7px 14px"})}>
              <Ico name={opt.icon} size={13} /> {opt.label}
            </button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[["accent","Primary Accent"],["accent2","Secondary"]].map(([key,lbl])=>(
            <div key={key} style={{display:"flex",alignItems:"center",gap:10}}>
              <input type="color" value={state[key]||"#ffffff"} onChange={e=>setState(s=>({...s,[key]:e.target.value}))} style={{width:34,height:34,borderRadius:8,border:"none",padding:2,cursor:"pointer",background:"none"}} />
              <div>
                <div style={{fontSize:11,fontWeight:600,color:t.sub}}>{lbl}</div>
                <div style={{fontSize:10,fontFamily:"monospace",color:t.sub}}>{state[key]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={cSt(t,{padding:20,borderColor:"rgba(239,68,68,.22)"})}>
        <div style={{fontWeight:700,fontSize:14,color:"#ef4444",marginBottom:6}}>Reset Tournament Data</div>
        <p style={{margin:"0 0 12px",fontSize:13,color:t.sub}}>Clears all scores, strikes, placements, words, and bonus points. Team names and images are kept.</p>
        <button onClick={doReset} style={bSt("rgba(239,68,68,.1)","#ef4444",{border:"1px solid rgba(239,68,68,.28)",fontSize:13})}>
          <Ico name="trash" size={14} /> Reset All Scores & Data
        </button>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [state,setState]=useStore();
  const [auth,setAuth]=useState(false);
  const [view,setView]=useState("public");
  const t=getTheme(state);

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    *,*::before,*::after{box-sizing:border-box;}
    html,body{margin:0;padding:0;}
    body{background:${t.bg};color:${t.text};font-family:'Inter',system-ui,sans-serif;}
    input,select,button,textarea{font-family:inherit;}
    option{background:${t.surface};color:${t.text};}
    details summary{list-style:none;}
    details summary::-webkit-details-marker{display:none;}
    ::-webkit-scrollbar{width:5px;height:5px;}
    ::-webkit-scrollbar-thumb{background:${t.border};border-radius:4px;}
    @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
  `;

  return (
    <>
      <style>{css}</style>
      {view==="public"&&(
        <button onClick={()=>{if(auth)setView("admin");else setView("login");}}
          style={{position:"fixed",bottom:12,right:12,zIndex:9999,padding:"5px 11px",borderRadius:18,border:`1px solid ${t.border}`,background:t.isDark?"rgba(0,0,0,.8)":"rgba(255,255,255,.92)",color:t.sub,fontSize:11,fontWeight:600,cursor:"pointer",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",gap:5}}>
          <Ico name="lock" size={11} /> Admin
        </button>
      )}
      {view!=="public"&&(
        <div style={{position:"fixed",top:10,left:"50%",transform:"translateX(-50%)",zIndex:9999,display:"flex",gap:3,background:t.isDark?"rgba(0,0,0,.88)":"rgba(255,255,255,.94)",padding:"4px 5px",borderRadius:24,backdropFilter:"blur(12px)",border:`1px solid ${t.border}`}}>
          <button onClick={()=>setView("public")} style={{padding:"5px 13px",borderRadius:18,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:view==="public"?t.accent:"transparent",color:view==="public"?(t.isDark?"#111":"#fff"):t.sub}}>Public</button>
          {auth&&<button onClick={()=>setView("admin")} style={{padding:"5px 13px",borderRadius:18,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:view==="admin"?t.accent:"transparent",color:view==="admin"?(t.isDark?"#111":"#fff"):t.sub}}>Admin</button>}
          {!auth&&<button onClick={()=>setView("login")} style={{padding:"5px 13px",borderRadius:18,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,color:t.sub}}>Login</button>}
        </div>
      )}
      {view==="public"&&<PublicView state={state} />}
      {view==="login"&&!auth&&<Login t={t} onLogin={()=>{setAuth(true);setView("admin");}} />}
      {view==="admin"&&auth&&<Admin state={state} setState={setState} t={t} onLogout={()=>{setAuth(false);setView("public");}} />}
    </>
  );
}
