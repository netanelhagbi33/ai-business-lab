import http from 'http';
import fs from 'fs';
import path from 'path';
const ROOT=process.cwd();
const TYPES={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/')p='/index.html';
  const file=path.join(ROOT,p);
  if(!file.startsWith(ROOT)){res.writeHead(403);return res.end();}
  fs.readFile(file,(err,buf)=>{
    if(err){res.writeHead(404);return res.end('404 '+p);}
    res.writeHead(200,{'Content-Type':TYPES[path.extname(file)]||'application/octet-stream'});
    res.end(buf);
  });
}).listen(8137,()=>console.log('serving on http://localhost:8137'));
