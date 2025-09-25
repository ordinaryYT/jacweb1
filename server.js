// server.js — single file web service (serves HTML + JS + config endpoint)
try { require('dotenv').config(); } catch (_) {}

const express = require('express');
const path = require('path');
const app = express();

/* =========================
   ROUTE: HTML (inline, full UI)
========================= */
app.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>ThatLegendJack — All-in-One</title>

<style>
  :root{ --ars-red:#EF0107; --ars-white:#FFF; --ars-navy:#063672; --ars-gold:#9C824A; }
  *{box-sizing:border-box}
  body{
    margin:0; font-family:Arial,Helvetica,sans-serif; color:#fff; text-align:center;
    background:linear-gradient(135deg,var(--ars-red) 0%,var(--ars-white) 35%,var(--ars-navy) 70%,var(--ars-gold) 100%);
  }
  h1{
    margin:1rem 0 0; font-size:2.8rem; font-weight:900; text-shadow:2px 2px 5px #000;
    background:linear-gradient(270deg,#EF0107,#FFFFFF,#063672,#EF0107);
    background-size:600% 600%;
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; animation:gradientShift 8s ease infinite;
  }
  @keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}

  .login-container{position:fixed;top:10px;right:20px;background:rgba(0,0,0,.75);padding:10px;border-radius:10px;z-index:20}
  .login-container button{padding:.6rem 1rem;background:var(--ars-red);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700}
  .login-container button:hover{background:var(--ars-gold)}

  .nav-center{margin:1rem auto 0;display:flex;justify-content:center;gap:1rem;flex-wrap:wrap}
  .nav-box{
    display:block;min-width:150px;padding:.9rem 1.6rem;font-weight:800;color:#fff;text-decoration:none;border-radius:12px;
    box-shadow:2px 2px 8px rgba(0,0,0,.6);cursor:pointer; transition:.15s;
  }
  .nav-box:hover{transform:translateY(-3px)}
  .home{background:linear-gradient(135deg,var(--ars-gold),var(--ars-red)); border:2px solid var(--ars-white)}
  .about{background:linear-gradient(135deg,var(--ars-red),var(--ars-gold)); border:2px solid var(--ars-white)}
  .leaderboards{background:linear-gradient(135deg,var(--ars-navy),var(--ars-white)); border:2px solid var(--ars-white)}

  .hidden{display:none}
  section{padding:1rem}

  /* Twitch player */
  .player-wrap{max-width:1000px;margin:1rem auto 0;padding:0 1rem}
  .player-frame{position:relative;width:100%;aspect-ratio:16/9;background:#0e0e10;border:2px solid var(--ars-gold);
    border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.35)}
  #twitch-player{position:absolute;inset:0;width:100%;height:100%}
  .offline-banner{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.75rem;
    background:rgba(0,0,0,.8);padding:1rem;opacity:0;visibility:hidden;transition:.25s}
  .offline-show{opacity:1;visibility:visible}
  .offline-btn{display:inline-block;padding:.55rem .9rem;border-radius:8px;background:linear-gradient(135deg,var(--ars-red),var(--ars-gold));
    color:#fff;text-decoration:none;font-weight:800}

  /* Circles: Spotify + Discord (bottom-right) */
  .status-container{position:fixed;bottom:20px;right:20px;display:flex;gap:1.2rem;flex-wrap:wrap;align-items:flex-end;z-index:15}
  .circle{
    width:130px;height:130px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.82rem;text-align:center;
    padding:10px;box-shadow:2px 2px 6px rgba(0,0,0,.6); background:#111; border:4px solid #333;
  }
  .spotify{border-color:#1DB954}
  .discord{border-color:#5865F2}
  .track{max-width:100px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

  /* Content blocks */
  .wrap{max-width:1100px;margin:1rem auto;padding:1rem;background:rgba(0,0,0,.35);border-radius:12px;text-align:left;border:1px solid rgba(255,255,255,.25)}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  .card{border-radius:12px;padding:1rem;border:2px solid var(--ars-white);box-shadow:0 8px 24px rgba(0,0,0,.25)}
  .bits{background:linear-gradient(135deg,var(--ars-navy) 0%,var(--ars-white) 100%)}
  .subs{background:linear-gradient(135deg,var(--ars-red) 0%,var(--ars-gold) 100%)}
  table{width:100%;border-collapse:collapse}
  th,td{padding:.45rem .6rem;text-align:left;border-bottom:1px solid rgba(255,255,255,.25)}
  .row{display:flex;gap:.5rem;margin:.45rem 0}
  .row input,.row select,.row button{padding:.5rem;border:none;border-radius:8px}
  .row input,.row select{flex:1}
  .row button{background:var(--ars-red);color:#fff;font-weight:700;cursor:pointer}

  /* Login form */
  form{max-width:420px;margin:1rem auto;background:rgba(0,0,0,.35);padding:1rem;border-radius:12px}
  form input{display:block;width:100%;margin:.5rem 0;padding:.6rem;border:none;border-radius:8px}
  form button{padding:.6rem 1rem;border:none;border-radius:8px;background:var(--ars-red);color:#fff;font-weight:800;cursor:pointer}
  form button:hover{background:var(--ars-gold)}

  @media(max-width:600px){
    .circle{width:92px
