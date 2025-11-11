// utils/cloudBackup.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { info, warn } = require('./timeSync');
const FILE = path.join(__dirname, '..', 'data', 'signals.json');

function ensure(){ const dir = path.dirname(FILE); if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true }); if(!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify([])); }

async function backupSignal(sig){
  try{
    ensure();
    const arr = JSON.parse(fs.readFileSync(FILE));
    arr.unshift({ t: new Date().toISOString(), sig });
    if(arr.length > 2000) arr.pop();
    fs.writeFileSync(FILE, JSON.stringify(arr, null, 2));
    // optional Firebase push
    if(process.env.FIREBASE_DB_URL){
      await axios.post(`${process.env.FIREBASE_DB_URL}/signals.json`, sig).catch(()=>{});
      info('Backed up to Firebase');
    } else info('Signal backed up locally');
  }catch(e){ warn('Backup error: ' + e.message); }
}

module.exports = { backupSignal };
