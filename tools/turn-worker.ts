// Optional Cloudflare Worker. Deploy separately; never place TURN_API_TOKEN in VITE_*.
interface Env { TURN_KEY_ID:string;TURN_API_TOKEN:string;ALLOWED_ORIGIN:string;RATE_LIMITER:{limit(input:{key:string}):Promise<{success:boolean}>}; }
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const origin=request.headers.get('Origin');
  if(!env.ALLOWED_ORIGIN||origin!==env.ALLOWED_ORIGIN)return new Response('Forbidden',{status:403});
  const headers={'Access-Control-Allow-Origin':env.ALLOWED_ORIGIN,'Access-Control-Allow-Methods':'GET, OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers});
  if(!env.RATE_LIMITER)return new Response('Configure a rate-limit binding',{status:503,headers});
  const result=await env.RATE_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'});
  if(!result.success)return new Response('Try again later',{status:429,headers});
  const response=await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(env.TURN_KEY_ID)}/credentials/generate-ice-servers`,{method:'POST',headers:{Authorization:`Bearer ${env.TURN_API_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({ttl:3600})});
  if(!response.ok)return new Response('Relay unavailable',{status:502,headers});
  const data=await response.json() as {iceServers:unknown};return Response.json({iceServers:data.iceServers},{headers});
 }
};
