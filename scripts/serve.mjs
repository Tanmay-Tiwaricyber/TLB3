// Local preview of the static Firebase/Vercel Hosting app, including its routes.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),routes=new Set(['','login','welcome','overview','attendance','payroll','profile','team','reports','settings']);
const mime={html:'text/html',js:'application/javascript',css:'text/css',svg:'image/svg+xml',woff2:'font/woff2',png:'image/png',webmanifest:'application/manifest+json'};
http.createServer(async(req,res)=>{try{
 let path=new URL(req.url,'http://localhost').pathname.slice(1);
 if(routes.has(path))path='index.html';
 const ok=/^(index\.html|sw\.js|access\.js|design\.css|manifest\.webmanifest|icon-\d+\.png|(?:assets|fonts|vendor)\/[\w.-]+)$/.test(path);
 const body=await readFile(new URL(ok?path:'404.html',root));res.writeHead(ok?200:404,{'Content-Type':mime[(ok?path:'404.html').split('.').pop()]||'application/octet-stream'});res.end(body);
}catch{res.writeHead(404);res.end('Not found')}}).listen(Number(process.env.PORT||3000),'0.0.0.0');
