export async function onRequestPost({request,env}){
  const s=await session(request,env); if(!s)return json({error:'UNAUTHORIZED'},401);
  try{
    const b=await request.json(); const current=String(b.currentPassword||''), next=String(b.newPassword||'');
    if(next.length<8)return json({error:'A nova senha deve ter pelo menos 8 caracteres.'},400);
    const row=await env.DB.prepare(`SELECT pu.id,pu.password_hash,p.status FROM partner_users pu JOIN partners p ON p.id=pu.partner_id WHERE pu.id=? LIMIT 1`).bind(s.uid).first();
    if(!row||row.status!=='active')return json({error:'Acesso indisponível.'},403);
    if(!(await verifyPassword(current,row.password_hash)))return json({error:'Senha atual incorreta.'},401);
    const hash=await hashPassword(next);
    await env.DB.prepare(`UPDATE partner_users SET password_hash=? WHERE id=?`).bind(hash,row.id).run();
    await audit(env,'partner_password_changed',s.pid,s.uid);
    return json({ok:true});
  }catch(e){return json({error:'Não foi possível alterar a senha.'},400)}
}
async function session(req,env){try{const m=(req.headers.get('Cookie')||'').match(/(?:^|; )up_partner=([^;]+)/);if(!m)return null;const [raw,hex]=m[1].split('.');const secret=env.PARTNER_SECRET||env.ADMIN_SECRET||env.ADMIN_PASSWORD||'change-me';const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);const sig=new Uint8Array((hex.match(/.{2}/g)||[]).map(x=>parseInt(x,16)));if(!await crypto.subtle.verify('HMAC',key,sig,new TextEncoder().encode(raw)))return null;const p=JSON.parse(atob(raw.replace(/-/g,'+').replace(/_/g,'/')));return p.exp>Date.now()?p:null}catch(e){return null}}
async function verifyPassword(password,stored){try{const [tag,it,salt64,hash64]=stored.split('$');if(tag!=='pbkdf2')return false;const salt=from64(salt64),expected=from64(hash64),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:Number(it),hash:'SHA-256'},key,expected.length*8));let d=0;for(let i=0;i<bits.length;i++)d|=bits[i]^expected[i];return bits.length===expected.length&&d===0}catch(e){return false}}
async function hashPassword(password){const salt=crypto.getRandomValues(new Uint8Array(16));const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:120000,hash:'SHA-256'},key,256);return `pbkdf2$120000$${b64(salt)}$${b64(new Uint8Array(bits))}`}
function b64(a){return btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};function from64(s){return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0))}
async function audit(env,action,partnerId,userId){try{await env.DB.prepare(`INSERT INTO audit_logs(actor_type,actor_id,partner_id,action,created_at) VALUES('partner',?,?,?,datetime('now'))`).bind(userId,partnerId,action).run()}catch(e){}}
function json(o,status=200){return new Response(JSON.stringify(o),{status,headers:{'content-type':'application/json','cache-control':'no-store'}})}
