export async function onRequestGet({request,env}){
  const token=getCookie(request.headers.get('Cookie')||'','up_partner');

  if(!token){
    return json({error:'UNAUTHORIZED'},401);
  }

  const session=await verify(token,env.PARTNER_SECRET||env.ADMIN_SECRET||env.ADMIN_PASSWORD||'change-me');

  if(!session || session.exp<Date.now()){
    return json({error:'UNAUTHORIZED'},401);
  }

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
      p.updated_at,
      pu.email AS login_email
    FROM partners p
    LEFT JOIN partner_users pu ON pu.partner_id=p.id
    WHERE p.id=?1
    LIMIT 1
  `).bind(session.pid).first();

  if(!row || row.status!=='active'){
    return json({error:'Parceiro inativo ou não encontrado.'},403);
  }

  const usage=await env.DB.prepare(`
    SELECT COUNT(*) AS total
    FROM benefit_uses
    WHERE partner_id=?1
  `).bind(row.id).first();

  return json({
    ok:true,
    partner:{
      id:row.id,
      code:row.code,
      companyName:row.company_name,
      responsibleName:row.responsible_name,
      phone:row.phone,
      email:row.email,
      loginEmail:row.login_email,
      category:row.category,
      city:row.city,
      address:row.address,
      benefit:row.benefit,
      logoUrl:row.logo_url,
      status:row.status,
      createdAt:row.created_at,
      updatedAt:row.updated_at,
      usageCount:Number(usage?.total||0)
    }
  });
}

function getCookie(cookie,name){
  const match=cookie.match(new RegExp('(?:^|; )'+name.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')+'=([^;]+)'));
  return match?match[1]:null;
}

async function verify(token,secret){
  try{
    const [raw,hex]=token.split('.');
    if(!raw||!hex||!secret) return null;

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

    return JSON.parse(
      atob(raw.replace(/-/g,'+').replace(/_/g,'/'))
    );
  }catch(e){
    return null;
  }
}

function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      'content-type':'application/json',
      'cache-control':'no-store'
    }
  });
}
