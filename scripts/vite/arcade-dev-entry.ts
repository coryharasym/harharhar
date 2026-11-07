import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {Plugin} from 'vite';
/** The tracked Pages index must not shadow the local app or point dev at production assets. */
export function arcadeDevEntry():Plugin{return {name:'harharhar-dev-entry',enforce:'pre',configureServer(server){server.middlewares.use(async(request,response,next)=>{if(request.method!=='GET'||(request.url||'').split('?')[0]!=='/')return next();try{const source=(await readFile(resolve('web/index.html'),'utf8')).replace('%BASE_URL%','/').replace('src="/main.tsx"','src="/web/main.tsx"');const html=await server.transformIndexHtml('/',source);response.setHeader('Content-Type','text/html; charset=utf-8');response.end(html);}catch(error){next(error);}});}};}
