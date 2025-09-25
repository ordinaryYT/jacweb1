/* Everything from script.js + leaderboard.js combined */

/* Users + Auth */
function loadUsers(){try{return JSON.parse(localStorage.getItem('users')||'[]')}catch{return[]}}
function saveUsers(arr){localStorage.setItem('users',JSON.stringify(arr))}
;(function seed(){if(!localStorage.getItem('seeded')){let u=loadUsers();u.push({username:'ThatLegendJack',password:'BooBear24/7',role:'admin'});saveUsers(u);localStorage.setItem('seeded','1')}})()
function isLoggedIn(){return localStorage.getItem('staffSession')==='true'}
function role(){return localStorage.getItem('staffRole')||'viewer'}
function doLogin(e){if(e)e.preventDefault();let u=document.getElementById('username').value,p=document.getElementById('password').value;let m=loadUsers().find(x=>x.username===u&&x.password===p);if(!m){alert('Invalid');return false}localStorage.setItem('staffSession','true');localStorage.setItem('staffRole',m.role);location.href='index.html';return false}
function logout(){localStorage.removeItem('staffSession');location.reload()}

/* Socials */
function applyLinks(){['twitch','tiktok','kick','onlyfans'].forEach(k=>{let a=document.getElementById('link_'+k);if(a){let url=localStorage.getItem('link_'+k);if(url)a.href=url}})}
function saveTwitchCreds(){let cid=document.getElementById('twitch_client_id').value,tk=document.getElementById('twitch_access_token').value;localStorage.setItem('twitch_client_id',cid);localStorage.setItem('twitch_access_token',tk);alert('Saved creds')}

/* Subs */
const SUBS_KEY='subs_data'
function getSubs(){try{return JSON.parse(localStorage.getItem(SUBS_KEY)||'[]')}catch{return[]}}
function setSubs(v){localStorage.setItem(SUBS_KEY,JSON.stringify(v))}
function renderSubs(){let box=document.getElementById('subs-list');if(!box)return;let d=getSubs();if(!d.length){box.innerHTML='<p>No subs</p>';return}box.innerHTML=d.map((s,i)=>`${i+1}. ${s.user} - ${s.gifts}`).join('<br>')}
function addOrUpdateSub(){let u=document.getElementById('sub_user').value,n=+document.getElementById('sub_gifts').value;let d=getSubs();let i=d.findIndex(x=>x.user===u);if(i>=0)d[i].gifts=n;else d.push({user:u,gifts:n});setSubs(d);renderSubs()}
function resetSubs(){localStorage.removeItem(SUBS_KEY);renderSubs()}

/* Bits */
async function helix(path,params={}){let cid=localStorage.getItem('twitch_client_id'),tk=localStorage.getItem('twitch_access_token');let url=new URL('https://api.twitch.tv/helix/'+path);Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));let r=await fetch(url,{headers:{'Client-Id':cid,'Authorization':'Bearer '+tk}});if(!r.ok)throw new Error(await r.text());return r.json()}
async function refreshBits(){let box=document.getElementById('bits-list');if(!box)return;box.innerHTML='Loading…';try{let {data}=await helix('bits/leaderboard',{count:10,period:'all'});box.innerHTML=data.map(e=>`${e.rank}. ${e.user_name||e.user_id} - ${e.score} bits`).join('<br>')}catch(err){box.innerHTML='Error: '+err.message}}

/* Init */
window.addEventListener('load',()=>{applyLinks();renderSubs();refreshBits()})
