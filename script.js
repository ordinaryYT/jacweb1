/* ===========================
   Storage helpers
=========================== */
function loadUsers(){ try{return JSON.parse(localStorage.getItem('users')||'[]')}catch{return[]} }
function saveUsers(arr){ localStorage.setItem('users', JSON.stringify(arr)); }

/* Seed default admin (once) */
(function seedAdmin(){
  const seeded = localStorage.getItem('seed_admin_v1');
  if(seeded) return;
  const users = loadUsers();
  if(!users.some(u=>u.role==='admin')){
    users.push({ username:'ThatLegendJack', password:'BooBear24/7', role:'admin' });
    saveUsers(users);
  }
  localStorage.setItem('seed_admin_v1','true');
})();

/* ===========================
   Session / Auth
=========================== */
function isLoggedIn(){ return localStorage.getItem('staffSession')==='true'; }
function role(){ return localStorage.getItem('staffRole')||'viewer'; }

function doLogin(e){
  if(e) e.preventDefault();
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value.trim();
  const users = loadUsers();
  const match = users.find(x=>x.username===u && x.password===p);
  if(!match){ alert('Invalid credentials'); return false; }
  localStorage.setItem('staffSession','true');
  localStorage.setItem('staffName', match.username);
  localStorage.setItem('staffRole', match.role);
  location.href = 'index.html';
  return false;
}
function logout(){
  localStorage.removeItem('staffSession');
  localStorage.removeItem('staffName');
  localStorage.removeItem('staffRole');
  if(location.pathname.endsWith('login.html')){ location.reload(); }
  showAuth(); showPanels();
}

/* ===========================
   Auth UI pieces (index/about)
=========================== */
function showAuth(){
  const box=document.getElementById('authBox');
  if(!box) return;
  if(isLoggedIn()){
    const name=localStorage.getItem('staffName')||'staff';
    box.innerHTML=`<button onclick="logout()">Logout (${name})</button>`;
  }else{
    box.innerHTML=`<a href="login.html">Login</a>`;
  }
}
function showPanels(){
  const staffPanel=document.getElementById('staffPanel');
  const adminPanel=document.getElementById('adminPanel');
  if(staffPanel) staffPanel.style.display = isLoggedIn() ? 'block' : 'none';
  if(adminPanel) adminPanel.style.display = (isLoggedIn() && role()==='admin') ? 'block' : 'none';
  if(isLoggedIn()){
    const who=document.getElementById('who');
    const badge=document.getElementById('roleBadge');
    if(who) who.textContent = localStorage.getItem('staffName')||'staff';
    if(badge) badge.textContent = role();
    prefillInputs();
    if(role()==='admin') renderUsers();
  }
}

/* ===========================
   Admin: manage staff users (index)
=========================== */
function renderUsers(){
  const list=document.getElementById('userList');
  if(!list) return;
  const users=loadUsers();
  list.innerHTML='';
  users.forEach((u,i)=>{
    const row=document.createElement('div');
    row.style.display='flex'; row.style.justifyContent='space-between'; row.style.margin='.3rem 0';
    row.innerHTML=`<div>${u.username} <span class="badge">${u.role}</span></div>
      <button onclick="removeUser(${i})" style="background:#444;color:#fff;border:none;border-radius:8px;padding:.35rem .6rem">Remove</button>`;
    if(u.role==='admin') row.querySelector('button').disabled=true;
    list.appendChild(row);
  });
}
function addStaff(){
  const uEl=document.getElementById('newUser');
  const pEl=document.getElementById('newPass');
  if(!uEl||!pEl) return;
  const u=uEl.value.trim(), p=pEl.value.trim();
  if(!u||!p) return;
  const users=loadUsers();
  if(users.some(x=>x.username===u)) return alert('User already exists.');
  users.push({username:u,password:p,role:'staff'});
  saveUsers(users);
  uEl.value=''; pEl.value='';
  renderUsers();
}
function removeUser(idx){
  const users=loadUsers();
  users.splice(idx,1);
  saveUsers(users);
  renderUsers();
}

/* ===========================
   Social links + images (index)
=========================== */
const socialKeys=['twitch','tiktok','kick','onlyfans'];

function applyLinks(){
  socialKeys.forEach(k=>{
    const a=document.getElementById('link_'+k);
    if(!a) return;
    const url = localStorage.getItem('link_'+k);
    if(url) a.href = url;
  });
}
function applyImages(){
  ['twitch','tiktok','kick'].forEach(k=>{
    const img=document.getElementById('img_'+k);
    if(!img) return;
    const saved = localStorage.getItem('img_'+k);
    if(saved) img.src = saved;
  });
}
function saveLink(key){
  if(!isLoggedIn()) return;
  const el=document.getElementById('in_'+key);
  const a=document.getElementById('link_'+key);
  if(!el||!a) return;
  const val=el.value.trim(); if(!val) return;
  localStorage.setItem('link_'+key,val);
  a.href = val;
}
function saveImg(key){
  if(!isLoggedIn()) return;
  const el=document.getElementById('imgurl_'+key);
  const img=document.getElementById('img_'+key);
  if(!el||!img) return;
  const val=el.value.trim(); if(!val) return;
  localStorage.setItem('img_'+key, val);
  img.src = val;
}

/* ===========================
   Discord status (index)
=========================== */
function saveText(targetId,inputId){
  if(!isLoggedIn()) return;
  const el=document.getElementById(inputId);
  const target=document.getElementById(targetId);
  if(!el||!target) return;
  const val=el.value.trim(); if(!val) return;
  localStorage.setItem(targetId,val);
  target.textContent = val;
}

/* ===========================
   Prefill staff panel (index)
=========================== */
function prefillInputs(){
  socialKeys.forEach(k=>{
    const inEl=document.getElementById('in_'+k);
    const linkEl=document.getElementById('link_'+k);
    if(inEl && linkEl){
      inEl.value = localStorage.getItem('link_'+k) || linkEl.href;
    }
  });
  ['twitch','tiktok','kick'].forEach(k=>{
    const el=document.getElementById('imgurl_'+k);
    if(el) el.value = localStorage.getItem('img_'+k) || '';
  });
  const dIn=document.getElementById('in_discord');
  const dLbl=document.getElementById('discord-status');
  if(dIn && dLbl){
    dIn.value = localStorage.getItem('discord-status') || dLbl.textContent;
  }
  const tokBox = document.getElementById('spotify_token');
  if(tokBox) tokBox.value = localStorage.getItem('spotify_access_token') || '';
}

/* ===========================
   Spotify Now Playing (index)
=========================== */
function saveSpotifyToken(){
  if(!isLoggedIn()) return;
  const t = (document.getElementById('spotify_token')?.value || "").trim();
  if(!t) return;
  localStorage.setItem('spotify_access_token', t);
  updateSpotifyNowPlaying(true);
}
let spotifyTimer = null;
async function fetchSpotifyCurrentlyPlaying(token){
  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if(res.status === 204) return null;
  if(!res.ok){
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}
async function updateSpotifyNowPlaying(){
  const token = localStorage.getItem('spotify_access_token') || '';
  const el = document.getElementById('spotify-track');
  if(!el) return;
  if(!token){ el.textContent = 'Spotify: Not Connected'; return; }
  try{
    const data = await fetchSpotifyCurrentlyPlaying(token);
    if(!data || !data.item){
      el.textContent = 'Spotify: Not Playing';
    }else{
      const name = data.item.name;
      const artists = (data.item.artists||[]).map(a=>a.name).join(', ');
      el.textContent = `${name} — ${artists}`;
      el.parentElement.title = `Now playing: ${name} — ${artists}`;
    }
  }catch(err){
    console.error('Spotify error:', err);
    el.textContent = 'Spotify: Re-auth needed';
  }finally{
    clearTimeout(spotifyTimer);
    spotifyTimer = setTimeout(updateSpotifyNowPlaying, 15000);
  }
}

/* ===========================
   About page editor (staff-only)
=========================== */
const ABOUT_KEY='about_content_v1';
function wireAboutEditor(){
  const box = document.getElementById('about-box');
  if(!box) return;
  // Load saved content
  const saved = localStorage.getItem(ABOUT_KEY);
  if(saved) box.innerHTML = saved;

  if(isLoggedIn()){
    // Add simple editor UI
    box.contentEditable = 'true';
    box.style.outline = '2px dashed rgba(255,255,255,.25)';
    let ctl = document.getElementById('about-controls');
    if(!ctl){
      ctl = document.createElement('div');
      ctl.id='about-controls';
      ctl.style.margin='10px auto';
      ctl.style.display='flex';
      ctl.style.gap='.5rem';
      ctl.style.justifyContent='center';
      ctl.innerHTML = `
        <button id="about-save" style="padding:.5rem .8rem;border:none;border-radius:8px;background:#EF0107;color:#fff;font-weight:700;cursor:pointer">Save</button>
        <button id="about-reset" style="padding:.5rem .8rem;border:none;border-radius:8px;background:#444;color:#fff;font-weight:700;cursor:pointer">Reset</button>
      `;
      box.insertAdjacentElement('beforebegin', ctl);
      document.getElementById('about-save').onclick = ()=>{
        localStorage.setItem(ABOUT_KEY, box.innerHTML);
        alert('About content saved.');
      };
      document.getElementById('about-reset').onclick = ()=>{
        if(confirm('Reset About content to empty?')){
          localStorage.removeItem(ABOUT_KEY);
          box.innerHTML='';
        }
      };
    }
  }else{
    box.contentEditable = 'false';
  }
}

/* ===========================
   Twitch Helper (optional creds)
   NOTE: Player embed is handled in index.html.
   If you want to reuse creds across pages, put/save here.
=========================== */
function saveTwitchCreds(){
  if(!isLoggedIn()) return;
  const idEl=document.getElementById('twitch_client_id');
  const tkEl=document.getElementById('twitch_access_token');
  if(!idEl||!tkEl) return;
  const cid=idEl.value.trim(), tok=tkEl.value.trim();
  if(!cid || !tok){ alert('Paste both Client ID and Access Token'); return; }
  localStorage.setItem('twitch_client_id', cid);
  localStorage.setItem('twitch_access_token', tok);
  alert('Twitch credentials saved to this browser.');
}

/* ===========================
   Bootstrapping on every page
=========================== */
(function init(){
  // Auth widgets/panels (if present)
  showAuth();
  showPanels();

  // Social & images (if present)
  applyLinks();
  applyImages();

  // Restore Discord status (if present)
  const savedDiscord=localStorage.getItem('discord-status');
  const discordEl=document.getElementById('discord-status');
  if(savedDiscord && discordEl) discordEl.textContent=savedDiscord;

  // Start Spotify poll (if the circle exists)
  if(document.getElementById('spotify-status')){
    updateSpotifyNowPlaying();
  }

  // Wire About page editor if on about.html
  wireAboutEditor();
})();
