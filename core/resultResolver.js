// core/resultResolver.js
const ai = require('./optimizer');
const cloud = require('../utils/cloudBackup');
const notifier = require('../utils/notifier');
const db = require('../utils/cloudBackup');
const { info, warn } = require('../utils/timeSync');

async function resolveSignal(signal, finalPrice){
  try{
    const entry = signal.entry;
    const dir = signal.direction;
    const win = dir === 'CALL' ? (finalPrice > entry) : (finalPrice < entry);
    signal.result = win ? 'WIN' : 'LOSS';
    signal.finalPrice = finalPrice;
    signal.settled_ts = Math.floor(Date.now()/1000);
    // backup & notify
    await cloud.backupSignal(signal);
    await notifier.broadcastResult(signal);
    ai.record(signal.result);
    info('Resolved signal ' + (signal.id||'') + ' => ' + signal.result);
    return signal;
  }catch(e){
    warn('resolveSignal error: ' + e.message);
    throw e;
  }
}

module.exports = { resolveSignal };
