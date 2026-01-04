// Extended SPA frontend for GraceChMS — adds pages and routing
// LocalStorage-backed mock data for prototyping

const APP = (() => {
  const LS_MEMBERS = 'gc_members_v1';
  const LS_ATTENDANCE = 'gc_attendance_v1';
  const LS_DONATIONS = 'gc_donations_v1';
  const LS_EVENTS = 'gc_events_v1';
  const LS_GROUPS = 'gc_groups_v1';
  const LS_VOLS = 'gc_vols_v1';
  const LS_BACK = 'gc_backgrounds_v1';

  // seeds
  const sampleMembers = [
    {id:'m_1',first_name:'Alice',last_name:'Johnson',phone:'555-0101',email:'alice@example.com',tags:['volunteer']},
    {id:'m_2',first_name:'Ben',last_name:'Williams',phone:'555-0102',email:'ben@example.com',tags:['new']},
    {id:'m_3',first_name:'Clara',last_name:'Nguyen',phone:'555-0103',email:'clara@example.com',tags:[]}
  ];
  const sampleEvents = [
    {id:'e_1',title:'Sunday Service',desc:'Main Sunday gathering',start:new Date().toISOString(),campus:'Main',capacity:200}
  ];
  const sampleGroups = [{id:'g_1',name:'Life Group - North',leader:'m_1'}];
  const sampleVols = [{id:'v_1',member_id:'m_1',role:'Usher'}];
  const sampleBacks = [{id:'b_1',member_id:'m_1',status:'clear'}];

  function read(key, seed){ try{ const v = localStorage.getItem(key); return v?JSON.parse(v):seed }catch(e){ return seed } }
  function write(key,val){ localStorage.setItem(key,JSON.stringify(val)) }

  // init storage if empty
  if(!localStorage.getItem(LS_MEMBERS)) write(LS_MEMBERS,sampleMembers);
  if(!localStorage.getItem(LS_ATTENDANCE)) write(LS_ATTENDANCE,[]);
  if(!localStorage.getItem(LS_DONATIONS)) write(LS_DONATIONS,[]);
  if(!localStorage.getItem(LS_EVENTS)) write(LS_EVENTS,sampleEvents);
  if(!localStorage.getItem(LS_GROUPS)) write(LS_GROUPS,sampleGroups);
  if(!localStorage.getItem(LS_VOLS)) write(LS_VOLS,sampleVols);
  if(!localStorage.getItem(LS_BACK)) write(LS_BACK,sampleBacks);

  // routing
  function route(){
    const hash = location.hash.replace('#','') || '/';
    const app = document.getElementById('app');
    // Website-conventional mappings to reference pages
    if(hash === '/' || hash === '') {
      // root -> landing page from references
      loadReferencePage(app, 'gracechms_landing_page');
    }
    else if(hash.startsWith('/members')) {
      loadReferencePage(app, 'member_directory');
    }
    else if(hash.startsWith('/attendance')) {
      loadReferencePage(app, 'attendance_tracking_admin');
    }
    else if(hash.startsWith('/events')) {
      // keep event detail handling if an event id is provided, otherwise open event management reference
      if(hash.startsWith('/event/')) renderEventDetail(app, hash.split('/event/')[1]); else loadReferencePage(app,'event_creation_and_management');
    }
    else if(hash.startsWith('/groups')) renderGroups(app);
    else if(hash.startsWith('/volunteers')) renderVolunteers(app);
    else if(hash.startsWith('/service')) renderService(app);
    else if(hash.startsWith('/reports')) renderReports(app);
    else if(hash.startsWith('/giving')) {
      loadReferencePage(app,'giving_and_financial_reports');
    }
    else if(hash.startsWith('/profile')) {
      loadReferencePage(app,'individual_member_profile');
    }
    else if(hash.startsWith('/kiosk')) {
      loadReferencePage(app,'child_check_in_kiosk');
    }
    else if(hash.startsWith('/online-giving')) {
      loadReferencePage(app,'online_giving_portal_member');
    }
    else if(hash.startsWith('/login')) renderLogin(app);
    else if(hash.startsWith('/settings')) renderSettings(app);
    else if(hash.startsWith('/backgrounds')) renderBackgrounds(app);
    else if(hash.startsWith('/reference/')) { const name = hash.split('/reference/')[1]; loadReferencePage(app, name); }
    else if(hash.startsWith('/ref/')) { const name = hash.split('/ref/')[1]; loadReferencePage(app, name); }
    else renderDashboard(app);
    document.getElementById('year').textContent = new Date().getFullYear();
    // update active nav link
    updateActiveNav();
  }

  function updateActiveNav(){
    const hash = location.hash.replace('#','') || '/';
    document.querySelectorAll('nav.nav a[data-route], .ref-dropdown a[data-route]').forEach(a=>{
      const href = (a.getAttribute('href')||'').replace('#','') || '/';
      if(href === '/' && hash === '/') return a.classList.add('active');
      if(href !== '/' && hash.startsWith(href)) a.classList.add('active'); else if(href === '/' && hash !== '/') a.classList.remove('active'); else if(!hash.startsWith(href)) a.classList.remove('active');
    });
    // also update aria-expanded for ref-toggle when dropdown contains active
    const refToggle = document.querySelector('.ref-toggle');
    if(refToggle){
      const hasActive = Array.from(document.querySelectorAll('.ref-dropdown a')).some(a=>a.classList.contains('active'));
      refToggle.setAttribute('aria-expanded', hasActive ? 'true' : 'false');
    }
  }

  function renderDashboard(container){
    const tpl = document.getElementById('tmpl-dashboard'); container.innerHTML = tpl.innerHTML;
    document.getElementById('members-count').textContent = read(LS_MEMBERS,[]).length;
    document.getElementById('attendance-count').textContent = read(LS_ATTENDANCE,[]).filter(a=>isToday(new Date(a.checked_in_at))).length;
    const total = read(LS_DONATIONS,[]).reduce((s,d)=>s+(d.amount||0),0);
    document.getElementById('giving-total').textContent = `$${(total/100).toFixed(2)}`;
    // groups count
    document.getElementById('groups-count').textContent = read(LS_GROUPS,[]).length;
    // populate upcoming events
    const upcoming = read(LS_EVENTS,[]).slice().sort((a,b)=>new Date(a.start)-new Date(b.start));
    const ul = document.getElementById('upcoming-events'); if(ul){ ul.innerHTML=''; upcoming.slice(0,5).forEach(ev=>{ const li=document.createElement('li'); const d=new Date(ev.start); li.innerHTML = `<div class="date"><div class="muted">${d.toLocaleString(undefined,{weekday:'short'})}</div><div class="muted">${d.getDate()}</div></div><div><strong>${ev.title}</strong><div class="muted">${d.toLocaleString()} • ${ev.campus||''}</div></div>`; ul.appendChild(li); }); }
  }

  // Members (unchanged behaviour, refactored)
  function renderMembers(container){
    const tpl = document.getElementById('tmpl-members'); container.innerHTML = tpl.innerHTML;
    const list = document.getElementById('members-list'); const members = read(LS_MEMBERS,[]);
    function draw(filter=''){ list.innerHTML=''; const q=filter.toLowerCase(); members.filter(m=>`${m.first_name} ${m.last_name} ${m.email} ${m.phone} ${(m.tags||[]).join(' ')}`.toLowerCase().includes(q)).forEach(m=>{ const li=document.createElement('li'); const initials = `${(m.first_name||'').charAt(0)}${(m.last_name||'').charAt(0)}`.toUpperCase(); li.innerHTML=`<div class="member-left"><div class="avatar">${initials}</div><div><strong>${m.first_name} ${m.last_name}</strong><div class="muted">${m.email||''} ${m.phone||''}</div></div></div><div><button class="btn" data-id="${m.id}" data-act="view">View</button></div>`; list.appendChild(li); }) }
    draw(''); document.getElementById('member-search').addEventListener('input', e=>draw(e.target.value));
    document.getElementById('btn-add-member').addEventListener('click', ()=>openAddMember());
    document.getElementById('btn-export').addEventListener('click', ()=>exportCSV(members));
    document.getElementById('btn-import').addEventListener('click', ()=>importCSV(members, draw));
    list.addEventListener('click', e=>{ const btn=e.target.closest('button'); if(!btn) return; const id=btn.dataset.id; if(btn.dataset.act==='view') showMemberDetail(id); });

    function importCSV(membersArr, cb){ const input=document.createElement('input'); input.type='file'; input.accept='.csv'; input.onchange=()=>{ const f=input.files[0]; if(!f) return; const reader=new FileReader(); reader.onload=()=>{ const rows=reader.result.split('\n').map(r=>r.trim()).filter(r=>r); rows.forEach((r,i)=>{ if(i===0) return; const cols=r.split(','); const m={id:'m_'+Date.now()+Math.random().toString(36).slice(2,6),first_name:cols[0]||'',last_name:cols[1]||'',email:cols[2]||'',phone:cols[3]||''}; membersArr.push(m); }); write(LS_MEMBERS,membersArr); cb(''); }; reader.readAsText(f); }; input.click(); }

    function openAddMember(){ const body=document.getElementById('modal-body'); body.innerHTML=`<h3>Add Member</h3><label>First name <input id="nm-first"/></label><label>Last name <input id="nm-last"/></label><label>Email <input id="nm-email"/></label><label>Phone <input id="nm-phone"/></label><div style="text-align:right"><button id="save-member" class="btn primary">Save</button></div>`; showModal(true); document.getElementById('save-member').addEventListener('click', ()=>{ const m={id:'m_'+Date.now(),first_name:document.getElementById('nm-first').value,last_name:document.getElementById('nm-last').value,email:document.getElementById('nm-email').value,phone:document.getElementById('nm-phone').value,tags:[]}; members.push(m); write(LS_MEMBERS,members); hideModal(); renderMembers(container); }); }

    function showMemberDetail(id){ const m = members.find(x=>x.id===id); if(!m) return; const body=document.getElementById('modal-body'); body.innerHTML=`<h3>${m.first_name} ${m.last_name}</h3><p><strong>Email:</strong> ${m.email||'—'}</p><p><strong>Phone:</strong> ${m.phone||'—'}</p><div style="text-align:right"><button id="close-m" class="btn">Close</button></div>`; showModal(true); document.getElementById('close-m').addEventListener('click', hideModal); }

    function exportCSV(items){ const rows=[['first_name','last_name','email','phone'],...items.map(m=>[m.first_name,m.last_name,m.email,m.phone])]; const csv=rows.map(r=>r.map(c=>`"${(c||'').replace(/"/g,'""')}"`).join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='members.csv'; a.click(); URL.revokeObjectURL(url); }
  }

  // Attendance
  function renderAttendance(container){ const tpl=document.getElementById('tmpl-attendance'); container.innerHTML=tpl.innerHTML; const members=read(LS_MEMBERS,[]); const attendance=read(LS_ATTENDANCE,[]); const list=document.getElementById('attendance-list'); function draw(){ list.innerHTML=''; attendance.filter(a=>isToday(new Date(a.checked_in_at))).forEach(a=>{ const m=members.find(x=>x.id===a.member_id)||{first_name:'Guest',last_name:''}; const li=document.createElement('li'); li.textContent=`${m.first_name} ${m.last_name} — ${new Date(a.checked_in_at).toLocaleTimeString()}`; list.appendChild(li); }); document.getElementById('chk-search').value=''; } draw(); document.getElementById('btn-checkin').addEventListener('click', ()=>{ const q=document.getElementById('chk-search').value.trim().toLowerCase(); const found=members.find(m=>`${m.first_name} ${m.last_name} ${m.phone} ${m.email}`.toLowerCase().includes(q)); const memberId = found ? found.id : 'guest_'+Date.now(); attendance.push({id:'a_'+Date.now(),member_id:memberId,checked_in_at:new Date().toISOString(),method:'kiosk'}); write(LS_ATTENDANCE,attendance); draw(); }); }

  // Events
  function renderEvents(container){ const tpl=document.getElementById('tmpl-events'); container.innerHTML=tpl.innerHTML; const events=read(LS_EVENTS,[]); const list=document.getElementById('events-list'); function draw(q=''){ list.innerHTML=''; events.filter(e=>(`${e.title} ${e.desc} ${e.campus||''}`).toLowerCase().includes(q.toLowerCase())).forEach(ev=>{ const li=document.createElement('li'); li.innerHTML=`<div><strong>${ev.title}</strong><div class="muted">${new Date(ev.start).toLocaleString()} — ${ev.campus||''}</div></div><div><a class="btn" href="#/event/${ev.id}">Open</a></div>`; list.appendChild(li); }) } draw(''); document.getElementById('event-search').addEventListener('input', e=>draw(e.target.value)); document.getElementById('btn-new-event').addEventListener('click', ()=>{ const body=document.getElementById('modal-body'); body.innerHTML=`<h3>New Event</h3><label>Title<input id="ev-title"/></label><label>Date<input id="ev-date" type="datetime-local"/></label><label>Campus<input id="ev-campus"/></label><label>Description<textarea id="ev-desc"></textarea></label><div style="text-align:right"><button id="save-ev" class="btn primary">Save</button></div>`; showModal(true); document.getElementById('save-ev').addEventListener('click', ()=>{ const ev={id:'e_'+Date.now(),title:document.getElementById('ev-title').value,desc:document.getElementById('ev-desc').value,start:new Date(document.getElementById('ev-date').value).toISOString(),campus:document.getElementById('ev-campus').value||'Main'}; events.push(ev); write(LS_EVENTS,events); hideModal(); renderEvents(container); }); }); }

  function renderEventDetail(container, id){ const tpl=document.getElementById('tmpl-event-detail'); container.innerHTML=tpl.innerHTML; const events=read(LS_EVENTS,[]); const ev=events.find(x=>x.id===id); if(!ev){ container.innerHTML='<p>Event not found</p>'; return } document.getElementById('event-title').textContent=ev.title; document.getElementById('event-desc').textContent=ev.desc||''; document.getElementById('event-meta').textContent=new Date(ev.start).toLocaleString() + ' • ' + (ev.campus||''); document.getElementById('btn-event-register').addEventListener('click', ()=>{ alert('Registration simulated — connect to backend to enable real registration'); }); }

  // Groups
  function renderGroups(container){ const tpl=document.getElementById('tmpl-groups'); container.innerHTML=tpl.innerHTML; const groups=read(LS_GROUPS,[]); const list=document.getElementById('groups-list'); function draw(q=''){ list.innerHTML=''; groups.filter(g=>g.name.toLowerCase().includes(q.toLowerCase())).forEach(g=>{ const li=document.createElement('li'); li.innerHTML=`<div><strong>${g.name}</strong><div class="muted">Leader: ${g.leader||'—'}</div></div>`; list.appendChild(li); }); } draw(''); document.getElementById('group-search').addEventListener('input', e=>draw(e.target.value)); document.getElementById('btn-new-group').addEventListener('click', ()=>{ const body=document.getElementById('modal-body'); body.innerHTML=`<h3>New Group</h3><label>Name<input id="g-name"/></label><label>Leader ID<input id="g-leader"/></label><div style="text-align:right"><button id="save-g" class="btn primary">Save</button></div>`; showModal(true); document.getElementById('save-g').addEventListener('click', ()=>{ const g={id:'g_'+Date.now(),name:document.getElementById('g-name').value,leader:document.getElementById('g-leader').value}; groups.push(g); write(LS_GROUPS,groups); hideModal(); renderGroups(container); }); }); }

  // Volunteers
  function renderVolunteers(container){ const tpl=document.getElementById('tmpl-volunteers'); container.innerHTML=tpl.innerHTML; const vols=read(LS_VOLS,[]); const members=read(LS_MEMBERS,[]); const list=document.getElementById('vols-list'); function draw(q=''){ list.innerHTML=''; vols.filter(v=>{ const m=members.find(x=>x.id===v.member_id); return (m && `${m.first_name} ${m.last_name}`.toLowerCase().includes(q.toLowerCase())) || (v.role||'').toLowerCase().includes(q.toLowerCase()); }).forEach(v=>{ const m=members.find(x=>x.id===v.member_id)||{}; const initials = `${(m.first_name||'').charAt(0)}${(m.last_name||'').charAt(0)}`.toUpperCase(); const li=document.createElement('li'); li.innerHTML=`<div class="member-left"><div class="avatar">${initials}</div><div><strong>${m.first_name||'Unknown'} ${m.last_name||''}</strong><div class="muted">Role: ${v.role}</div></div></div>`; list.appendChild(li); }) } draw(''); document.getElementById('vol-search').addEventListener('input', e=>draw(e.target.value)); document.getElementById('btn-new-vol').addEventListener('click', ()=>{ const body=document.getElementById('modal-body'); body.innerHTML=`<h3>Add Volunteer</h3><label>Member ID<input id="vol-member"/></label><label>Role<input id="vol-role"/></label><div style="text-align:right"><button id="save-vol" class="btn primary">Save</button></div>`; showModal(true); document.getElementById('save-vol').addEventListener('click', ()=>{ const v={id:'v_'+Date.now(),member_id:document.getElementById('vol-member').value,role:document.getElementById('vol-role').value}; vols.push(v); write(LS_VOLS,vols); hideModal(); renderVolunteers(container); }); }); }

  // Service planner (placeholder)
  function renderService(container){ const tpl=document.getElementById('tmpl-service'); container.innerHTML=tpl.innerHTML; document.getElementById('btn-new-plan').addEventListener('click', ()=>alert('Create service plan — backend required for full functionality')); }

  // Reports
  function renderReports(container){ const tpl=document.getElementById('tmpl-reports'); container.innerHTML=tpl.innerHTML; document.getElementById('btn-attendance-report').addEventListener('click', ()=>exportCSV(read(LS_ATTENDANCE,[]),'attendance.csv')); document.getElementById('btn-giving-report').addEventListener('click', ()=>exportCSV(read(LS_DONATIONS,[]),'giving.csv')); function exportCSV(items, name='report.csv'){ if(!items || !items.length) return alert('No data'); const keys = Object.keys(items[0]); const rows=[keys, ...items.map(i=>keys.map(k=>i[k]||''))]; const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url); } }

  // Giving
  function renderGiving(container){ const tpl=document.getElementById('tmpl-giving'); container.innerHTML=tpl.innerHTML; const form=document.getElementById('give-form'); const receipts=document.getElementById('donation-receipts'); const donations=read(LS_DONATIONS,[]); function drawReceipts(){ receipts.innerHTML=''; donations.slice().reverse().forEach(d=>{ const div=document.createElement('div'); div.className='card'; div.style.marginTop='.5rem'; div.innerHTML=`<div><strong>$${(d.amount/100).toFixed(2)}</strong> — ${d.fund} <div class="muted">${new Date(d.created_at).toLocaleString()}</div></div>`; receipts.appendChild(div); }); } drawReceipts(); form.addEventListener('submit', e=>{ e.preventDefault(); const amount=Math.round(Number(document.getElementById('donation-amount').value)*100); const name=document.getElementById('donor-name').value||'Anonymous'; const fund=document.getElementById('donation-fund').value; if(!amount||amount<=0) return alert('Enter amount'); const rec={id:'d_'+Date.now(),amount,donor_name:name,fund,created_at:new Date().toISOString()}; donations.push(rec); write(LS_DONATIONS,donations); drawReceipts(); alert('Donation simulated — receipt saved'); form.reset(); }); }

  // Profile
  function renderProfile(container){ const tpl=document.getElementById('tmpl-profile'); container.innerHTML=tpl.innerHTML; const body=document.getElementById('profile-body'); const members=read(LS_MEMBERS,[]); const me=members[0]||{first_name:'User'}; body.innerHTML=`<div class="card"><h3>${me.first_name} ${me.last_name||''}</h3><p><strong>Email:</strong> ${me.email||'—'}</p><p><strong>Phone:</strong> ${me.phone||'—'}</p></div>`; }

  // Login
  function renderLogin(container){ const tpl=document.getElementById('tmpl-login'); container.innerHTML=tpl.innerHTML; document.getElementById('login-form').addEventListener('submit', e=>{ e.preventDefault(); alert('Login simulated (no auth)'); location.hash='#/'; }); }

  // Settings
  function renderSettings(container){ const tpl=document.getElementById('tmpl-settings'); container.innerHTML=tpl.innerHTML; }

  // Kiosk
  function renderKiosk(container){ const tpl=document.getElementById('tmpl-kiosk'); container.innerHTML=tpl.innerHTML; document.getElementById('kiosk-checkin').addEventListener('click', ()=>alert('Kiosk check-in simulated')); }

  // Background checks
  function renderBackgrounds(container){ const tpl=document.getElementById('tmpl-backgrounds'); container.innerHTML=tpl.innerHTML; const list=document.getElementById('background-list'); const backs=read(LS_BACK,[]); list.innerHTML=''; backs.forEach(b=>{ const m = read(LS_MEMBERS,[]).find(x=>x.id===b.member_id) || {}; const li=document.createElement('div'); li.className='card'; li.style.marginBottom='.5rem'; li.innerHTML=`<div><strong>${m.first_name||'Unknown'} ${m.last_name||''}</strong><div class="muted">Status: ${b.status}</div></div>`; list.appendChild(li); }); }

  // Load standalone reference HTML pages into SPA container
  function loadReferencePage(container, name){
    if(!name) { container.innerHTML = '<p>Reference page not specified.</p>'; return; }
    const path = `reference/${name}.html`;
    fetch(path).then(r=>{
      if(!r.ok) throw new Error('not found');
      return r.text();
    }).then(txt=>{
      try{
        const parser = new DOMParser();
        const doc = parser.parseFromString(txt, 'text/html');
        // inject body content of the reference page into the SPA container
        container.innerHTML = doc.body ? doc.body.innerHTML : txt;
        // basic post-load adjustments: update year if present
        const y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();
      }catch(e){ container.innerHTML = '<p>Unable to render reference page.</p>'; }
    }).catch(()=>{ container.innerHTML = `<p>Reference page <strong>${name}</strong> not found.</p>`; });
  }

  // modal helpers
  function showModal(){ const modal=document.getElementById('modal'); modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); document.getElementById('modal-close').onclick = hideModal; }
  function hideModal(){ const modal=document.getElementById('modal'); modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); }

  function isToday(d){ const t=new Date(); return d.getFullYear()===t.getFullYear() && d.getMonth()===t.getMonth() && d.getDate()===t.getDate(); }

  // init
  function init(){ window.addEventListener('hashchange', route); document.querySelectorAll('[data-route]').forEach(a=>a.addEventListener('click', ()=>{})); const navToggle = document.getElementById('nav-toggle'); if(navToggle){ navToggle.addEventListener('click', ()=>{ const nav = document.querySelector('.nav'); nav.classList.toggle('open'); }); } document.getElementById('btn-login').addEventListener('click', ()=>location.hash='#/login'); document.getElementById('modal-close').addEventListener('click', hideModal); route(); if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); } }

  return { init };
})();

window.addEventListener('DOMContentLoaded', ()=>APP.init());
