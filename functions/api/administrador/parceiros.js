export async function onRequestGet({request,env}){
  if(!(await authorized(request,env))) return json({error:'UNAUTHORIZED'},401);
  const rows=await env.DB.prepare(`SELECT p.id,p.code,p.company_name,p.responsible_name,p.phone,p.email,p.category,p.city,p.address,p.benefit,p.logo_url,p.status,p.created_at,p.updated_at,CASE WHEN pu.id IS NULL THEN 0 ELSE 1 END AS has_login FROM partners p LEFT JOIN partner_users pu ON pu.partner_id=p.id ORDER BY p.id DESC LIMIT 1000`).all();
  const stats=await env.DB.prepare(`SELECT COUNT(*) total,SUM(status='active') active,SUM(status='inactive') inactive,SUM(status='pending') pending FROM partners`).first();
  return json({partners:rows.results||[],stats:stats||{}});
}
export async function onRequestPost({request,env}){
  if(!(await authorized(request,env))) return json({error:'UNAUTHORIZED'},401);
  try{
    const b=await request.json();
    const company=String(b.companyName||'').trim(), responsible=String(b.responsibleName||'').trim(), phone=String(b.phone||'').trim(), email=String(b.email||'').trim().toLowerCase(), category=String(b.category||'').trim(), city=String(b.city||'').trim(), address=String(b.address||'').trim(), benefit=String(b.benefit||'').trim(), logo=String(b.logoUrl||'').trim(), status=['active','inactive','pending'].includes(b.status)?b.status:'active', password=String(b.password||'');
    if(!company||!responsible||!phone||!category||!city||!benefit) return json({error:'Preencha empresa, responsável, WhatsApp, categoria, cidade e benefício.'},400);
    if(email && !/^\S+@\S+\.\S+$/.test(email)) return json({error:'E-mail inválido.'},400);
    if(password && password.length<8) return json({error:'A senha do parceiro deve ter pelo menos 8 caracteres.'},400);
    const code=await uniqueCode(env.DB);
    const r=await env.DB.prepare(`INSERT INTO partners (code,company_name,responsible_name,phone,email,category,city,address,benefit,logo_url,status,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`).bind(code,company,responsible,phone,email||null,category,city,address||null,benefit,logo||null,status).run();
    const id=r.meta.last_row_id;
    if(email && password){const hash=await hashPassword(password);await env.DB.prepare(`INSERT INTO partner_users (partner_id,email,password_hash,status) VALUES (?,?,?,'active')`).bind(id,email,hash).run();}
    return json({ok:true,partner:{id,code,companyName:company,email:email||null,hasLogin:!!(email&&password)}} ,201);
  }catch(e){
    const msg=String(e?.message||'');
    if(msg.includes('UNIQUE')) return json({error:'Já existe um parceiro ou login com esses dados.'},409);
    return json({error:'Não foi possível cadastrar a empresa parceira.'},400);
  }
}
export async function onRequestPatch({request,env}){
  if(!(await authorized(request,env))) return json({error:'UNAUTHORIZED'},401);
  try{
    const b=await request.json(); const id=Number(b.id); if(!id)return json({error:'ID inválido.'},400);
    const company=String(b.companyName||'').trim(), responsible=String(b.responsibleName||'').trim(), phone=String(b.phone||'').trim(), email=String(b.email||'').trim().toLowerCase(), category=String(b.category||'').trim(), city=String(b.city||'').trim(), address=String(b.address||'').trim(), benefit=String(b.benefit||'').trim(), logo=String(b.logoUrl||'').trim(), status=['active','inactive','pending'].includes(b.status)?b.status:'active', password=String(b.password||'');
    if(!company||!responsible||!phone||!category||!city||!benefit)return json({error:'Preencha os campos obrigatórios.'},400);
    if(email && !/^\S+@\S+\.\S+$/.test(email))return json({error:'E-mail inválido.'},400);
    if(password && password.length<8)return json({error:'A senha deve ter pelo menos 8 caracteres.'},400);
    await env.DB.prepare(`UPDATE partners SET company_name=?,responsible_name=?,phone=?,email=?,category=?,city=?,address=?,benefit=?,logo_url=?,status=?,updated_at=datetime('now') WHERE id=?`).bind(company,responsible,phone,email||null,category,city,address||null,benefit,logo||null,status,id).run();
    const existing=await env.DB.prepare(`SELECT id FROM partner_users WHERE partner_id=?`).bind(id).first();
    if(email){
      if(existing){
        if(password){const hash=await hashPassword(password);await env.DB.prepare(`UPDATE partner_users SET email=?,password_hash=?,status='active' WHERE partner_id=?`).bind(email,hash,id).run();}
        else await env.DB.prepare(`UPDATE partner_users SET email=?,status='active' WHERE partner_id=?`).bind(email,id).run();
      } else if(password){const hash=await hashPassword(password);await env.DB.prepare(`INSERT INTO partner_users (partner_id,email,password_hash,status) VALUES (?,?,?,'active')`).bind(id,email,hash).run();}
    }
    return json({ok:true});
  }catch(e){if(String(e?.message||'').includes('UNIQUE'))return json({error:'Esse e-mail já está sendo usado por outro acesso.'},409);return json({error:'Não foi possível atualizar o parceiro.'},400)}
}
export async function onRequestDelete({request,env}){
  if(!(await authorized(request,env)))return json({error:'UNAUTHORIZED'},401);
  try{const b=await request.json();const id=Number(b.id);if(!id)return json({error:'ID inválido.'},400);await env.DB.prepare(`DELETE FROM partners WHERE id=?`).bind(id).run();return json({ok:true});}catch(e){return json({error:'Não foi possível excluir.'},400)}
}
async function uniqueCode(db){for(let i=0;i<8;i++){const c='PAR-'+Math.random().toString(36).slice(2,8).toUpperCase();const x=await db.prepare('SELECT id FROM partners WHERE code=?').bind(c).first();if(!x)return c}throw new Error('code')}
async function hashPassword(password){const salt=crypto.getRandomValues(new Uint8Array(16));const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:120000,hash:'SHA-256'},key,256);return `pbkdf2$120000$${b64(salt)}$${b64(new Uint8Array(bits))}`}
function b64(a){let s='';for(const x of a)s+=String.fromCharCode(x);return btoa(s)}
async function authorized(req,env){const m=(req.headers.get('Cookie')||'').match(/(?:^|; )up_admin=([^;]+)/);if(!m)return false;const p=await verify(m[1],env.ADMIN_SECRET||env.ADMIN_PASSWORD||'');return !!p&&p.exp>Date.now()}
async function verify(token,secret){try{const [raw,hex]=token.split('.');if(!raw||!hex||!secret)return null;const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);const sig=new Uint8Array((hex.match(/.{2}/g)||[]).map(x=>parseInt(x,16)));if(!await crypto.subtle.verify('HMAC',key,sig,new TextEncoder().encode(raw)))return null;return JSON.parse(atob(raw.replace(/-/g,'+').replace(/_/g,'/')))}catch(e){return null}}
function json(d,s=200){return new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}})}
