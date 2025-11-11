// core/optimizer.js
// Minimal optimizer to adapt min_conf dynamically based on recent loss streaks
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'optimizer.json');
function ensure(){
  const dir = path.dirname(FILE); if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true });
  if(!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ min_conf: parseInt(process.env.MIN_CONFIDENCE||'80',10), history:[] }, null, 2));
}
function load(){ ensure(); return JSON.parse(fs.readFileSync(FILE)); }
function save(o){ fs.writeFileSync(FILE, JSON.stringify(o, null, 2)); }
function record(result){
  const d = load();
  d.history.unshift({ t: new Date().toISOString(), result });
  if(d.history.length > 500) d.history = d.history.slice(0,500);
  // adjust min_conf if loss streak >3
  const recent = d.history.slice(0,20);
  const losses = recent.filter(r=>r.result==='LOSS').length;
  const wins = recent.filter(r=>r.result==='WIN').length;
  if(losses > wins + 3) d.min_conf = Math.min(98, d.min_conf + 2);
  else if(wins > losses + 3) d.min_conf = Math.max(60, d.min_conf - 2);
  save(d);
}
function getMinConf(){ return load().min_conf || parseInt(process.env.MIN_CONFIDENCE||'80',10); }
module.exports = { record, getMinConf };
