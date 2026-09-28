export async function onRequestGet({request,env}){
  const session=await authorized(request,env);
  if(!session) return json({error:'UNAUTHORIZED'},401);

  try{
    const row=await env.DB.prepare(`
      SELECT
        p.id,
        p.code,
        p.company_name,
        p.responsible_name,
        p.phone,
        p.email,
        p.category,
        p.city,
        p.address,
        p.benefit,
        p.logo_url,
        p.status,
        p.created_at,
        p.updated_at
      FROM partners p
      WHERE p.id=?1
      LIMIT 1
    `).bind(session.pid).first();

    if(!row || row.status!=='active'){
      return json({error:'Parceiro não encontrado ou inativo.'},403);
    }

    const uses=await env.DB.prepare(`
      SELECT
        COUNT(*) total
      FROM benefit_uses
      WHERE partner_id=?1
    `).bind(session.pid).first();

    return json({
      ok:true,
      partner:{
        id:row.id,
        code:row.code,
        companyName:row.company_name,
        responsibleName:row.responsible_name,
        phone:row.phone,
        email:row.email,
        category:row.category,
        city:row.city,
        address:row.address,
        benefit:row.benefit,
        logoUrl:row.logo_url,
        status:row.status,
        createdAt:row.created_at,
        updatedAt:row.updated_at,
        usageCount:Number(uses?.total||0)
      }
    });
  }catch(e){
    return json({error:'Não foi possível carregar os dados do parceiro.'},500);
  }
}

async function authorized(req,env){
  const m=(req.headers.get('Cookie')||'').match(/(?:^|; )up_partner=([^;]+)/);
  if(!m) return null;

  const secret=env.PARTNER_SECRET||env.ADMIN_SECRET||env.ADMIN_PASSWORD||'';
  if(!secret) return null;

  return await verify(m[1],secret);
}

async function verify(token,secret){
  try{
    const [raw,hex]=token.split('.');
    if(!raw||!hex) return null;

    const key=await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      {name:'HMAC',hash:'SHA-256'},
      false,
      ['verify']
    );

    const sig=new Uint8Array(
      (hex.match(/.{2}/g)||[]).map(x=>parseInt(x,16))
    );

    const ok=await crypto.subtle.verify(
      'HMAC',
      key,
      sig,
      new TextEncoder().encode(raw)
    );

    if(!ok) return null;

    const payload=JSON.parse(
      atob(raw.replace(/-/g,'+').replace(/_/g,'/'))
    );

    if(!payload.exp || payload.exp<Date.now()) return null;

    return payload;
  }catch(e){
    return null;
  }
}

function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      'content-type':'application/json; charset=UTF-8',
      'cache-control':'no-store'
    }
  });
}
