(function(){
const STORAGE='mission_pro_v3';
const $= (s,el=document)=>el.querySelector(s), $$=(s,el=document)=>[...el.querySelectorAll(s)];
let state=load(), selectedIcon='i-book', editingId=null;

const PRESETS={
  study:{name:'Study 30 min',xp:30,desc:'Focused learning',icon:'i-book',color:'blue'},
  workout:{name:'Workout',xp:25,desc:'Move your body',icon:'i-dumbbell',color:'green'},
  read:{name:'Read 20 pages',xp:20,desc:'Build the habit',icon:'i-flower',color:'yellow'},
  focus:{name:'Deep focus block',xp:30,desc:'No distractions',icon:'i-phone-off',color:'orange'},
  water:{name:'Drink water',xp:10,desc:'Stay hydrated',icon:'i-zap',color:'blue'},
  walk:{name:'Walk outside',xp:15,desc:'Fresh air',icon:'i-target',color:'green'}
};

function defaultState(){
  return{
    missions:[
      {id:'1',name:'Physics — 45 min',xp:40,desc:'Deep study',icon:'i-book',color:'blue',done:false},
      {id:'2',name:'Workout — 20 min',xp:20,desc:'Move your body',icon:'i-dumbbell',color:'green',done:false},
      {id:'3',name:'10 min review',xp:15,desc:'Recall & remember',icon:'i-flower',color:'yellow',done:false},
      {id:'4',name:'Phone-free focus',xp:25,desc:'One focused block',icon:'i-phone-off',color:'orange',done:false}
    ],
    streak:0,bestStreak:0,xp:0,totalDone:0,lastDate:null,history:{},prefs:{coach:'chill',target:'all'}
  };
}

function load(){
  try{
    const r=localStorage.getItem(STORAGE);
    if(r){
      const s=JSON.parse(r);
      if(s.bestStreak==null)s.bestStreak=s.streak||0;
      if(s.totalDone==null)s.totalDone=0;
      if(!s.history)s.history={};
      if(!s.prefs)s.prefs={coach:'chill',target:'all'};
      return s;
    }
  }catch(e){}
  return defaultState();
}

function save(){localStorage.setItem(STORAGE,JSON.stringify(state))}

function esc(s){
  const d=document.createElement('div');
  d.textContent=s==null?'':String(s);
  return d.innerHTML;
}

function todayKey(){
  const d=new Date();
  return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
}

function checkStreak(){
  const t=todayKey();
  if(state.lastDate===t)return;
  if(state.lastDate){
    const diff=(new Date(t)-new Date(state.lastDate))/86400000;
    if(diff>1.5)state.streak=0;
  }
  if(state.lastDate!==t){
    state.missions.forEach(m=>m.done=false);
    state.lastDate=t;
    save();
  }
}

function levelInfo(xp){
  const per=100,lvl=Math.floor((xp||0)/per)+1,into=(xp||0)%per;
  return{lvl,into,per,pct:Math.round(into/per*100)};
}

function perfectDays(){
  return Object.keys(state.history||{}).filter(k=>{
    const h=state.history[k];
    return h===true||(h&&h.perfect);
  }).length;
}

function weekStats(){
  const today=new Date();
  let xp=0,days=0;
  for(let i=0;i<7;i++){
    const d=new Date(today);
    d.setDate(today.getDate()-i);
    const key=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    const h=state.history[key];
    if(h){
      days++;
      if(typeof h==='object'&&h.xp)xp+=h.xp;
      else if(h===true)xp+=20;
    }
  }
  return{xp,days};
}

function renderCalendar(){
  const el=$('#calendar');
  if(!el)return;
  const hist=state.history||{},days=['S','M','T','W','T','F','S'];
  let h=days.map(d=>'<div class="day">'+d+'</div>').join('');
  const today=new Date();
  for(let i=13;i>=0;i--){
    const d=new Date(today);
    d.setDate(today.getDate()-i);
    const key=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    const done=!!hist[key];
    h+='<div class="dot'+(done?' done':'')+(i===0?' today':'')+'">'+d.getDate()+'</div>';
  }
  el.innerHTML=h;
}

function renderWeekBars(){
  const el=$('#weekBars');
  if(!el)return;
  const labels=['S','M','T','W','T','F','S'];
  const today=new Date();
  let max=1;
  const data=[];
  for(let i=6;i>=0;i--){
    const d=new Date(today);
    d.setDate(today.getDate()-i);
    const key=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    const h=state.history[key];
    let v=0;
    if(h){
      if(typeof h==='object'&&h.xp)v=h.xp;
      else v=30;
    }
    data.push({label:labels[d.getDay()],v,on:!!h});
    if(v>max)max=v;
  }
  el.innerHTML=data.map(x=>{
    const pct=Math.max(8,Math.round(x.v/max*100));
    return '<div class="bar-col"><div class="bar'+(x.on?' on':'')+'" style="height:'+pct+'%"></div><div class="bar-label">'+x.label+'</div></div>';
  }).join('');
}

function renderAchievements(){
  const el=$('#achievements');
  if(!el)return;
  const list=[
    {id:'first',label:'First check',ok:(state.totalDone||0)>=1},
    {id:'s3',label:'3-day streak',ok:(state.bestStreak||0)>=3},
    {id:'s7',label:'7-day streak',ok:(state.bestStreak||0)>=7},
    {id:'xp100',label:'100 XP',ok:(state.xp||0)>=100},
    {id:'xp500',label:'500 XP',ok:(state.xp||0)>=500},
    {id:'perfect',label:'Perfect day',ok:perfectDays()>=1}
  ];
  el.innerHTML=list.map(a=>'<div class="ach'+(a.ok?' on':'')+'">'+(a.ok?'✓ ':'')+a.label+'</div>').join('');
}

function renderGoalsList(){
  const list=$('#gList');
  if(!list)return;
  const c=$('#gCount');
  if(c)c.textContent=state.missions.length+' goals';
  if(!state.missions.length){
    list.innerHTML='<p style="color:#7f838a;font-weight:700">No missions yet. Add one above or use a preset.</p>';
    return;
  }
  list.innerHTML=state.missions.map((m,idx)=>
    '<div class="mission-row" data-id="'+esc(m.id)+'">'+'
      '<div class="mr-icon" style="background:var(--'+(m.color||'blue')+')">'+'
        '<svg class="icon"><use href="#'+esc(m.icon||'i-book')+'"/></svg>'+'
      '</div>'+'
      '<div><strong>'+esc(m.name)+'</strong><span>+'+(m.xp||0)+' XP'+(m.desc?' · '+esc(m.desc):'')+'</span></div>'+'
      '<div class="actions">'+'
        '<button type="button" class="act" data-move="up" data-id="'+esc(m.id)+'" '+(idx===0?'disabled':'')+'>↑</button>'+'
        '<button type="button" class="act" data-move="down" data-id="'+esc(m.id)+'" '+(idx===state.missions.length-1?'disabled':'')+'>↓</button>'+'
        '<button type="button" class="act" data-edit="'+esc(m.id)+'">✎</button>'+'
        '<button type="button" class="act del" data-del="'+esc(m.id)+'">×</button>'+'
      '</div>'+'
    '</div>'
  ).join('');
}

function updateQuotes(){
  const style=(state.prefs&&state.prefs.coach)||'chill';
  const q={
    chill:['Keep showing up.','Small actions compound into streaks.'],
    hype:['You got this!','Crush the next mission and stack XP.'],
    strict:['No excuses.','Complete what you set. Then the next.']
  };
  const pair=q[style]||q.chill;
  const a=$('#quote');if(a)a.textContent=pair[0];
  const b=$('#quoteSub');if(b)b.textContent=pair[1];
}

function updateProgressOnly(){
  const total=state.missions.length;
  const done=state.missions.filter(m=>m.done).length;
  const pct=total?Math.round(done/total*100):0;
  const xpToday=state.missions.filter(m=>m.done).reduce((s,m)=>s+(m.xp||0),0);
  const bar=$('#goalBar');if(bar)bar.style.width=pct+'%';
  const orb=$('#progressOrb');if(orb)orb.style.setProperty('--p',pct+'%');
  const pctEl=$('#progressPct');if(pctEl)pctEl.textContent=pct+'%';
  const count=$('#goalCount');if(count)count.textContent=done+' / '+total;
  const earned=$('#xpEarned');if(earned)earned.textContent=xpToday+' XP earned';
  const set=(id,v)=>{const el=$(id);if(el)el.textContent=v};
  set('#mStreak',state.streak);
  set('#mXp',state.xp);
  set('#sStreak',state.streak);
  set('#sXp',state.xp);
  set('#sDone',done);
  set('#sBest',state.bestStreak||0);
  set('#sLifetime',state.totalDone||0);
  set('#sPerfect',perfectDays());
  const ws=weekStats();
  set('#sWeekXp',ws.xp);
  const li=levelInfo(state.xp||0);
  set('#levelName','Level '+li.lvl);
  set('#levelXP',li.into+' / '+li.per+' XP');
  const lb=$('#levelBar');if(lb)lb.style.width=li.pct+'%';
  renderCalendar();
  renderWeekBars();
  renderAchievements();
  updateQuotes();
}

function render(){
  checkStreak();
  const list=$('#taskList');
  if(!list)return;
  list.innerHTML=state.missions.map(m=>{
    const color=m.color||'blue';
    return '<div class="task '+(m.done?'done':'')+'" data-id="'+esc(m.id)+'" data-color="'+esc(color)+'">'+'
      '<div class="task-icon"><svg class="icon"><use href="#'+esc(m.icon||'i-book')+'"/></svg></div>'+'
      '<div class="task-body"><div class="task-name">'+esc(m.name)+'</div>'+'
      '<div class="task-meta"><span class="xp-pill">+'+(m.xp||0)+' XP</span>'+'
      '<span class="task-desc">'+esc(m.desc||'')+'</span></div></div>'+'
      '<button type="button" class="check" aria-label="toggle"><svg class="icon"><use href="#i-check"/></svg></button></div>';
  }).join('');
  updateProgressOnly();
}

function toggle(id){
  const m=state.missions.find(x=>x.id===id);
  if(!m)return;
  const was=m.done;
  m.done=!m.done;
  if(m.done&&!was){
    state.xp+=(m.xp||0);
    state.totalDone=(state.totalDone||0)+1;
    if(state.missions.every(x=>x.done)){
      state.streak=(state.streak||0)+1;
      if(state.streak>(state.bestStreak||0))state.bestStreak=state.streak;
      if(!state.history)state.history={};
      const xpToday=state.missions.reduce((s,x)=>s+(x.xp||0),0);
      state.history[todayKey()]={perfect:true,xp:xpToday};
    }
  }else if(!m.done&&was){
    state.xp=Math.max(0,state.xp-(m.xp||0));
    state.totalDone=Math.max(0,(state.totalDone||0)-1);
  }
  save();
  const row=document.querySelector('.task[data-id="'+CSS.escape(id)+'"]');
  if(row)row.classList.toggle('done',m.done);
  updateProgressOnly();
}

function clearForm(){
  editingId=null;
  $('#gName').value='';
  $('#gDesc').value='';
  $('#gXp').value='20';
  $('#gColor').value='blue';
  selectedIcon='i-book';
  $$('#gIconPicker button').forEach(b=>b.classList.toggle('active',b.dataset.icon==='i-book'));
  const title=$('#gFormTitle');if(title)title.textContent='Add a mission';
  const btn=$('#gAddBtn');if(btn)btn.textContent='Add to my day';
  const cancel=$('#gCancelEdit');if(cancel)cancel.style.display='none';
}

function startEdit(id){
  const m=state.missions.find(x=>x.id===id);
  if(!m)return;
  editingId=id;
  $('#gName').value=m.name||'';
  $('#gDesc').value=m.desc||'';
  $('#gXp').value=String(m.xp||20);
  $('#gColor').value=m.color||'blue';
  selectedIcon=m.icon||'i-book';
  $$('#gIconPicker button').forEach(b=>b.classList.toggle('active',b.dataset.icon===selectedIcon));
  const title=$('#gFormTitle');if(title)title.textContent='Edit mission';
  const btn=$('#gAddBtn');if(btn)btn.textContent='Save changes';
  const cancel=$('#gCancelEdit');if(cancel)cancel.style.display='block';
  showPage('goals');
}

function moveMission(id,dir){
  const idx=state.missions.findIndex(m=>m.id===id);
  if(idx<0)return;
  const swap=dir==='up'?idx-1:idx+1;
  if(swap<0||swap>=state.missions.length)return;
  const tmp=state.missions[idx];
  state.missions[idx]=state.missions[swap];
  state.missions[swap]=tmp;
  save();
  render();
  renderGoalsList();
}

function showPage(name){
  $$('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+name));
  $$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===name));
  syncGlassNavbar(name);
  if(name==='goals')renderGoalsList();
  if(name==='progress')updateProgressOnly();
}

function syncGlassNavbar(name){
  $$('#mobileNavbar button').forEach(btn=>{
    const on=btn.dataset.page===name;
    btn.classList.toggle('text-white',on);
    btn.classList.toggle('bg-[#1cb0f6]/20',on);
    btn.classList.toggle('text-[#afafaf]',!on);
  });
}

document.addEventListener('click',e=>{
  const tab=e.target.closest('[data-page]');
  if(tab&&tab.dataset.page){e.preventDefault();showPage(tab.dataset.page);return}

  const check=e.target.closest('.check');
  if(check){const row=check.closest('.task');if(row)toggle(row.dataset.id);return}

  const gIcon=e.target.closest('#gIconPicker button');
  if(gIcon){
    $$('#gIconPicker button').forEach(b=>b.classList.remove('active'));
    gIcon.classList.add('active');
    selectedIcon=gIcon.dataset.icon;
    return;
  }

  if(e.target.closest('#gCancelEdit')){clearForm();return}

  if(e.target.closest('#gAddBtn')){
    const name=($('#gName')?.value||'').trim();
    if(!name)return;
    const payload={
      name,
      xp:parseInt($('#gXp')?.value,10)||20,
      desc:($('#gDesc')?.value||'').trim(),
      icon:selectedIcon||'i-book',
      color:$('#gColor')?.value||'blue',
      done:false
    };
    if(editingId){
      const m=state.missions.find(x=>x.id===editingId);
      if(m)Object.assign(m,payload);
    }else{
      payload.id=Date.now().toString(36);
      state.missions.push(payload);
    }
    save();
    clearForm();
    render();
    renderGoalsList();
    return;
  }

  const editBtn=e.target.closest('[data-edit]');
  if(editBtn){startEdit(editBtn.getAttribute('data-edit'));return}

  const moveBtn=e.target.closest('[data-move]');
  if(moveBtn){
    moveMission(moveBtn.getAttribute('data-id'),moveBtn.getAttribute('data-move'));
    return;
  }

  const del=e.target.closest('[data-del]');
  if(del){
    const id=del.getAttribute('data-del');
    state.missions=state.missions.filter(m=>m.id!==id);
    if(editingId===id)clearForm();
    save();
    render();
    renderGoalsList();
    return;
  }

  const preset=e.target.closest('[data-preset]');
  if(preset){
    const p=PRESETS[preset.getAttribute('data-preset')];
    if(p){
      state.missions.push({id:Date.now().toString(36),...p,done:false});
      save();
      render();
      renderGoalsList();
    }
    return;
  }

  if(e.target.closest('#savePrefs')){
    if(!state.prefs)state.prefs={};
    state.prefs.coach=$('#prefCoach')?.value||'chill';
    state.prefs.target=$('#prefTarget')?.value||'all';
    save();
    updateQuotes();
    return;
  }

  if(e.target.closest('#resetBtn')){
    if(!confirm('Reset all progress on this device?'))return;
    localStorage.removeItem(STORAGE);
    state=load();
    selectedIcon='i-book';
    editingId=null;
    clearForm();
    render();
    renderGoalsList();
    updateProgressOnly();
    return;
  }
});

if(!state.history)state.history={};
if(!state.prefs)state.prefs={coach:'chill',target:'all'};
if(state.bestStreak==null)state.bestStreak=state.streak||0;
if(state.totalDone==null)state.totalDone=0;

const pc=$('#prefCoach');if(pc)pc.value=state.prefs.coach||'chill';
const pt=$('#prefTarget');if(pt)pt.value=state.prefs.target||'all';

checkStreak();
render();
renderGoalsList();
showPage('today');
requestAnimationFrame(()=>setTimeout(()=>$('#app-loader')?.classList.add('hide'),280));
})();
