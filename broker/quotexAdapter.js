// broker/quotexAdapter.js
const WebSocket = require('ws');
const { info, warn } = require('../utils/timeSync');

let ws = null;
let lastTicks = {};

function init(){
  const url = process.env.QUOTEX_WS_URL;
  if(!url){ warn('QUOTEX_WS_URL not set'); return false; }
  try{
    info('Connecting Quotex WS: ' + url);
    ws = new WebSocket(url);
    ws.on('open', ()=> info('Quotex WS open'));
    ws.on('message', msg => {
      try{
        const d = JSON.parse(msg.toString());
        // Expect message like {symbol:'EUR/USD', price:1.2345}
        if(d && d.symbol && d.price){
          lastTicks[d.symbol] = lastTicks[d.symbol] || [];
          lastTicks[d.symbol].push({ ts: Math.floor(Date.now()/1000), price: parseFloat(d.price) });
          if(lastTicks[d.symbol].length > 2000) lastTicks[d.symbol].shift();
        }
      }catch(e){}
    });
    ws.on('error', e => warn('Quotex WS error: '+e.message));
    ws.on('close', ()=> warn('Quotex WS closed'));
    return true;
  }catch(e){ warn('Quotex init fail: '+e.message); return false; }
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
