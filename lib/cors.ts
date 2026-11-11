export const PAGES_ORIGIN = 'https://coryharasym.github.io';
export function isAllowedOrigin(request:Request) {
 const origin=request.headers.get('Origin');
 return origin!==null && (origin===new URL(request.url).origin || origin===PAGES_ORIGIN);
}
export function preflight(request:Request):Response|null {
 if(request.method!=='OPTIONS')return null;
 if(!isAllowedOrigin(request))return new Response(null,{status:403});
 const method=request.headers.get('Access-Control-Request-Method');
 const headers=(request.headers.get('Access-Control-Request-Headers')||'').split(',').map(h=>h.trim().toLowerCase()).filter(Boolean);
 if(!method||!['GET','POST','PATCH'].includes(method)||headers.some(h=>h!=='content-type'))return new Response(null,{status:403});
 return withCors(request,new Response(null,{status:204,headers:{'Access-Control-Allow-Methods':'GET, POST, PATCH, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}}));
}
export function withCors(request:Request,response:Response) {
 if(!isAllowedOrigin(request))return response;
 const result=new Response(response.body,{status:response.status,statusText:response.statusText,headers:response.headers});
 result.headers.set('Access-Control-Allow-Origin',request.headers.get('Origin')!);
 result.headers.append('Vary','Origin');
 return result;
}
