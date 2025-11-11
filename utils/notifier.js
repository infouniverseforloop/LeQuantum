// utils/notifier.js
const axios = require('axios');
const formatter = require('./formatter');
const { info, warn } = require('./timeSync');

const TELE_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELE_CHAT = process.env.TELEGRAM_CHAT_ID || '';
const API = TELE_TOKEN ? `https://api.telegram.org/bot${TELE_TOKEN}` : null;

async function postTelegram(text){
  if(!API){ warn('Telegram not configured'); return false; }
  try{
    await axios.post(`${API}/sendMessage`, { chat_id: TELE_CHAT, text, parse_mode:'HTML' }, { timeout:10000 });
    return true;
  }catch(e){ warn('Telegram send fail: ' + (e.response? JSON.stringify(e.response.data) : e.message)); return false; }
}

async function broadcastSignal(sig){
  const text = formatter.formatSignal(sig);
  info('Broadcasting signal to Telegram');
  await postTelegram(text);
}
async function broadcastResult(sig){
  const text = formatter.formatResult(sig);
  await postTelegram(text);
}
module.exports = { broadcastSignal, broadcastResult };
