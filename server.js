// server.js — main
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { info, warn, err } = require('./utils/timeSync'); // small logger helpers inside timeSync
const brokerManager = require('./broker/quotexAdapter'); // will be replaced by brokerManager below
const brokerExness = require('./broker/exnessAdapter');
const brokerManagerModule = require('./broker/brokerManager') || null; // we will implement inline manager below

// We'll implement a simple manager inline to avoid circular imports
const brokerManager = {
  adapters: [],
  async initAdapters(){
    this.adapters = [];
    if((process.env.QUOTEX_ENABLED||'false') === 'true' && process.env.QUOTEX_WS_URL){
      const q = require('./broker/quotexAdapter');
      const ok = await q.init();
      if(ok) this.adapters.push({ name:'quotex', adapter:q });
      else warn('Quotex adapter failed init');
    } else info('Quotex disabled or QUOTEX_WS_URL missing');
    if((process.env.EXNESS_ENABLED||'false') === 'true' && process.env.EXNESS_WS_URL){
      const e = require('./broker/exnessAdapter');
      const ok = e.init();
      if(ok) this.adapters.push({ name:'exness', adapter:e });
      else warn('Exness adapter failed init');
    } else info('Exness disabled or EXNESS_WS_URL missing');
    if(this.adapters.length === 0) warn('No brokers active — safe-mode (no live signals)');
    return this.adapters;
  },
  getAdapters(){ return this.adapters.slice(); }
};

const compute = require('./core/strategyEngine');
const signalEngine = require('./core/signalEngine') || null; // not used as file, we'll reuse compute directly
const notifier = require('./utils/notifier');
const db = require('./utils/cloudBackup');

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT||'5000',10);

app.use(express.static(path.join(__dirname, 'web')));
app.get('/health', (req,res)=> res.json({ ok:true, server_time:new Date().toISOString(), adapters: brokerManager.getAdapters().map(a=>a.name) }));

// debug force-test
app.post('/api/debug/force-test', express.json(), async (req,res)=>{
  if((process.env.ALLOW_TEST||'false') !== 'true') return res.status(403).json({ ok:false, message:'disabled' });
  const sig = req.body.signal;
  if(!sig) return res.status(400).json({ ok:false, message:'no signal' });
  try{
    await notifier.broadcastSignal(sig);
    return res.json({ ok:true });
  }catch(e){
    return res.status(500).json({ ok:false, err: e.message });
  }
});

server.listen(PORT, async ()=>{
  info(`Quantum Apex server listening on ${PORT}`);
  const adapters = await brokerManager.initAdapters();
  info('Adapters: ' + adapters.map(a=>a.name).join(', '));
  startSignalLoop();
});

const WATCH = (process.env.WATCH_SYMBOLS||'').split(',').map(s=>s.trim()).filter(Boolean);
const INTERVAL = parseInt(process.env.SCAN_INTERVAL_MS||'3000',10);
const MIN_CONF = parseInt(process.env.MIN_CONFIDENCE||'80',10);

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function startSignalLoop(){
  info('Signal loop starting...');
  while(true){
    try{
      const adapters = brokerManager.getAdapters();
      if(!adapters || adapters.length === 0){
        warn('No adapters active — waiting...');
        await sleep(3000);
        continue;
      }
      for(const pair of WATCH){
        try{
          // fetch 1m & 5m candles from adapters (prefer WS adapter for fresh ticks)
          let candles1m = null, candles5m = null;
          for(const a of adapters){
            try{
              if(a.name === 'exness'){
                const arr = a.adapter.buildCandlesFromTicks(pair, 600);
                if(arr && arr.length){ candles1m = arr.slice(-300); candles5m = aggregateToHigherTF(arr,5); }
              } else if(a.name === 'quotex'){
                const arr = await a.adapter.fetchRecentCandles(pair, 600);
                if(arr && arr.length){ candles1m = arr.slice(-300); candles5m = aggregateToHigherTF(arr,5); }
              }
            }catch(e){}
            if(candles1m && candles5m) break;
          }
          if(!candles1m || !candles5m) continue;
          const sig = await compute.computeSignalForPair(pair, candles1m, candles5m);
          if(sig && sig.status === 'ok' && sig.confidence >= MIN_CONF){
            sig.id = Date.now() + Math.floor(Math.random()*9999);
            // save
            await db.backupSignal(sig);
            await notifier.broadcastSignal(sig);
            console.log(`[INFO] Emitted signal ${pair} ${sig.direction} conf:${sig.confidence}`);
            // wait until expiry then resolve
            const waitSec = Math.max(5, (sig.expiry_ts - Math.floor(Date.now()/1000)) + 2);
            await sleep(waitSec*1000 + 1000);
            // resolve final price
            let finalPrice = sig.entry;
            for(const a of adapters){
              try{
                if(a.name === 'exness'){ const arr = a.adapter.buildCandlesFromTicks(pair, 10); if(arr && arr.length) finalPrice = arr[arr.length-1].close; }
                else if(a.name === 'quotex'){ const arr = await a.adapter.fetchRecentCandles(pair, 10); if(arr && arr.length) finalPrice = arr[arr.length-1].close; }
              }catch(e){}
            }
            const resolved = require('./core/resultResolver');
            await resolved.resolveSignal(sig, finalPrice);
          }
        }catch(e){ console.warn('pair loop err', e.message); }
      }
    }catch(e){ console.warn('outer loop err', e.message); }
    await sleep(INTERVAL);
  }
}

function aggregateToHigherTF(candles, factor){
  if(!candles || !candles.length) return null;
  const out = [];
  for(let i=0;i<candles.length;i+=factor){
    const chunk = candles.slice(i,i+factor);
    if(chunk.length===0) continue;
    const open = chunk[0].open;
    const close = chunk[chunk.length-1].close;
    const high = Math.max(...chunk.map(c=>c.high));
    const low = Math.min(...chunk.map(c=>c.low));
    const vol = chunk.reduce((a,b)=>a+(b.volume||0),0);
    out.push({ time: chunk[0].time, open, high, low, close, volume: vol });
  }
  return out;
  }
