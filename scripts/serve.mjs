import http from 'node:http';
import {readFile, stat, realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 8094);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1–65535.');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8','.njk':'text/plain; charset=utf-8'};
const server = http.createServer(async (request,response) => {
  if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405,{Allow:'GET, HEAD'}); response.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname).replaceAll('\\','/');
    if (pathname.split('/').some(part => part.startsWith('.'))) throw new Error('Private path');
    let file = path.resolve(root,'.' + pathname);
    if ((await stat(file)).isDirectory()) file = path.join(file,'index.html');
    file = await realpath(file);
    if (!file.startsWith(root) || !(path.extname(file) in types || path.basename(file) === 'LICENSE')) throw new Error('Unsupported path');
    const body = await readFile(file);
    response.writeHead(200, {'Content-Type':types[path.extname(file)] || 'text/plain; charset=utf-8','Content-Length':body.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});
    response.end('Not found');
  }
});
server.listen(port,'127.0.0.1',() => console.log(`a11y-atomic → http://127.0.0.1:${port}`));
