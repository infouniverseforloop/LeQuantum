function info(m){ console.log(`[${new Date().toISOString()}] [INFO] ${m}`); }
function warn(m){ console.log(`[${new Date().toISOString()}] [WARN] ${m}`); }
function err(m){ console.log(`[${new Date().toISOString()}] [ERROR] ${m}`); }
module.exports = { info, warn, err };
