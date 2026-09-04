const fs=require('fs');const h=fs.readFileSync('index.html','utf8');
const i=h.indexOf('<script>\n'), j=h.lastIndexOf('</script>');
try{ new (require('vm').Script)(h.slice(i+9,j),{filename:'index.js'}); console.log('SYNTAX OK'); }catch(e){ console.log('SYNTAX ERR',e.message,(e.stack||'').split('\n').slice(0,2).join(' ')); process.exit(1); }
