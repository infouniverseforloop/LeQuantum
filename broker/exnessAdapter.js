// broker/exnessAdapter.js
const WebSocket = require('ws');
const { info, warn } = require('../utils/timeSync');

let ws = null;
let lastTicks = {};

function init(){
  const url = process.env.EXNESS_WS_URL;
  if(!url){ warn('EXNESS_WS_URL not set'); return false; }
  try{
    info('Connecting to Exness WS: ' + url);
    ws = new WebSocket(url);
    ws.on('open', ()=> info('Exness WS open'));
    ws.on('message', msg => {
      try{
        const d = JSON.parse(msg.toString());
        // expected {symbol:'EUR/USD', price:1.2345}
        if(d && d.symbol && d.price){
          lastTicks[d.symbol] = lastTicks[d.symbol] || [];
          lastTicks[d.symbol].push({ ts: Math.floor(Date.now()/1000), price: parseFloat(d.price) });
          if(lastTicks[d.symbol].length > 2000) lastTicks[d.symbol].shift();
        }
      }catch(e){}
    });
    ws.on('error', e => warn('Exness WS error: '+e.message));
    ws.on('close', ()=> warn('Exness WS closed'));
    return true;
  }catch(e){ warn('Exness init fail: '+e.message); return false; }
}

function buildCandlesFromTicks(symbol, count=400){
  const ticks = lastTicks[symbol] || [];
  if(ticks.length < 5) throw new Error('Not enough ticks');
  const map = {};
  ticks.forEach(t => {
    const sec = t.ts;
    map[sec] = map[sec] || { time: sec, open: t.price, high: t.price, low: t.price, close: t.price, volume: 1 };
    map[sec].high = Math.max(map[sec].high, t.price);
    map[sec].low = Math.min(map[sec].low, t.price);
    map[sec].close = t.price;
    map[sec].volume += 1;
  });
  const keys = Object.keys(map).sort();
  const out = [];
  for(let i=keys.length-1; i>=0 && out.length < count; i--){
    out.push(map[keys[i]]);
  }
  return out.reverse();
}

module.exports = { init, buildCandlesFromTicks };
