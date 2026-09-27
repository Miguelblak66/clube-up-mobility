export async function onRequestGet({request,env}){
  if(!(await authorized(request,env))) return json({error:'UNAUTHORIZED'},401);
  const rows=await env.DB.prepare(`SELECT code,name,phone,email,profile,city,driver_id,status,created_at FROM club_members ORDER BY id DESC LIMIT 1000`).all();
  const stats=await env.DB.prepare(`SELECT COUNT(*) total,SUM(profile='motorista') drivers,SUM(profile='cliente') clients,SUM(status='active') active FROM club_members`).first();
  return json({members:rows.results||[],stats:stats||{}});
}
async function authorized(req,env){const m=(req.headers.get('Cookie')||'').match(/(?:^|; )up_admin=([^;]+)/);if(!m)return false;const p=await verify(m[1],env.ADMIN_SECRET||env.ADMIN_PASSWORD||'');return !!p&&p.exp>Date.now()}
async function verify(token,secret){try{const [raw,hex]=token.split('.');if(!raw||!hex)return null;const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);const sig=new Uint8Array((hex.match(/.{2}/g)||[]).map(x=>parseInt(x,16)));const ok=await crypto.subtle.verify('HMAC',key,sig,new TextEncoder().encode(raw));if(!ok)return null;return JSON.parse(atob(raw.replace(/-/g,'+').replace(/_/g,'/')))}catch(e){return null}}
function json(d,s=200){return new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}})}
