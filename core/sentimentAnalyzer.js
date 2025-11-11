// core/sentimentAnalyzer.js
// Lightweight sentiment: session/time filters + basic momentum sign
function inHighImpactSession(){
  // returns true if current hour in server time is London or NY active
  const h = new Date().getUTCHours();
  // London 7-16 UTC, NY 13-21 UTC (approx)
  return (h >= 7 && h <= 16) || (h >= 13 && h <= 21);
}
function momentumQuality(candles){
  if(!candles || candles.length < 5) return 0;
  const last = candles.slice(-5);
  const bodies = last.map(c=>Math.abs(c.close - c.open));
  const avg = bodies.reduce((a,b)=>a+b,0)/bodies.length;
  const lastBody = bodies[bodies.length-1];
  return lastBody / (avg || 1e-8); // >1 indicates momentum
}
module.exports = { inHighImpactSession, momentumQuality };
