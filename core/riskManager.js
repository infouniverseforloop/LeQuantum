// core/riskManager.js
function calcSLTP(entry, atr, direction){
  const sl = direction === 'CALL' ? entry - atr * 1.2 : entry + atr * 1.2;
  const tp = direction === 'CALL' ? entry + atr * 2.2 : entry - atr * 2.2;
  return { sl, tp };
}
module.exports = { calcSLTP };
