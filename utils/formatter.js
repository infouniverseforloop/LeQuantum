// utils/formatter.js
function formatSignal(sig){
  const owner = process.env.OWNER_NAME || 'Owner';
  const when = new Date(sig.entry_ts*1000).toLocaleString();
  const expiry = sig.expiry_ts ? new Date(sig.expiry_ts*1000).toLocaleString() : '-';
  return `<b>Quantum Apex — Signal</b>\nOwner: <b>${owner}</b>\nPair: <b>${sig.pair}</b>\nType: <b>${sig.direction}</b>\nConfidence: <b>${sig.confidence}%</b>\nEntry: <code>${sig.entry}</code> at ${when}\nSL: <code>${sig.sl}</code> | TP: <code>${sig.tp}</code>\nExpiry: ${expiry}\nNotes: ${sig.notes || '-'}`;
}
function formatResult(sig){
  const owner = process.env.OWNER_NAME || 'Owner';
  return `<b>Quantum Apex — Result</b>\nOwner: <b>${owner}</b>\nPair: <b>${sig.pair}</b>\nType: <b>${sig.direction}</b>\nResult: <b>${sig.result}</b>\nEntry: <code>${sig.entry}</code>\nFinal: <code>${sig.finalPrice}</code>\nConfidence: <b>${sig.confidence}%</b>`;
}
module.exports = { formatSignal, formatResult };
