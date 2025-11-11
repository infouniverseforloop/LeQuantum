// web/app.js (poll /health and display time)
async function refresh(){
  try{
    const r = await fetch('/health'); const j = await r.json();
    document.getElementById('serverTime').innerText = 'Server: ' + (j.server_time || '-');
  }catch(e){}
}
setInterval(refresh,2000); refresh();
