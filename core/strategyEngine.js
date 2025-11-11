// core/strategyEngine.js
const tech = require('./technicalAnalyzer');
const senti = require('./sentimentAnalyzer');
const opt = require('./optimizer');
const risk = require('./riskManager');

async function computeSignalForPair(pair, candles1m, candles5m){
  if(!candles1m || candles1m.length < 60) return { status:'hold', reason:'insufficient' };
  // Multi-TF confirmation: require same direction on 1m & 5m
  const last1 = candles1m[candles1m.length-1], prev1 = candles1m[candles1m.length-2];
  const last5 = candles5m[candles5m.length-1], prev5 = candles5m[candles5m.length-2];
  const dir1 = last1.close > prev1.close ? 1 : -1;
  const dir5 = last5.close > prev5.close ? 1 : -1;
  if(dir1 !== dir5) return { status:'hold', reason:'no_multitf' };
  // features
  const closes = candles1m.map(c=>c.close);
  const sma5 = tech.sma(closes,5), sma20 = tech.sma(closes,20);
  const rsi = tech.rsi(closes,14);
  const ob = tech.detectOrderBlock(candles1m);
  const fvg = tech.detectFVG(candles1m);
  const atr = tech.atrLike(candles1m);
  // scoring
  let score = 50;
  if(sma5 && sma20 && sma5 > sma20) score += 12; else score -= 8;
  if(rsi < 35) score += 8;
  if(rsi > 70) score -= 8;
  if(ob) score += 14;
  if(fvg) score += 10;
  if(senti.momentumQuality(candles1m) > 1.2) score += 6;
  // adaptive min conf
  const minConf = opt.getMinConf();
  const direction = score >= 60 ? 'CALL' : (score <= 40 ? 'PUT' : 'HOLD');
  if(direction === 'HOLD') return { status:'hold', reason:'weak_score', score: Math.round(score) };
  const conf = Math.max(10, Math.min(99, Math.round(score)));
  if(conf < minConf) return { status:'hold', reason:'low_conf', confidence: conf };
  const entry = last1.close;
  const { sl, tp } = risk.calcSLTP(entry, atr, direction);
  return {
    status: 'ok',
    pair,
    direction,
    confidence: conf,
    entry,
    sl: +sl.toFixed(pair.includes('JPY')?2:5),
    tp: +tp.toFixed(pair.includes('JPY')?2:5),
    entry_ts: Math.floor(Date.now()/1000),
    expiry_ts: Math.floor(Date.now()/1000) + parseInt(process.env.BINARY_EXPIRY_SECONDS||'60',10),
    notes: `sma5:${sma5? +sma5.toFixed(5):'-'} rsi:${Math.round(rsi)} ob:${!!ob} fvg:${!!fvg}`
  };
}

module.exports = { computeSignalForPair };
