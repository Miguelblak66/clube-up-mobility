export async function onRequestPost({request,env}){
  const token=getCookie(request.headers.get('Cookie')||'','up_partner');

  if(!token){
    return json({error:'UNAUTHORIZED'},401);
  }

  const session=await verify(
    token,
    env.PARTNER_SECRET||env.ADMIN_SECRET||env.ADMIN_PASSWORD||'change-me'
  );

  if(!session || session.exp<Date.now()){
    return json({error:'UNAUTHORIZED'},401);
  }

  const partner=await env.DB.prepare(`
    SELECT id,code,company_name,benefit,status
    FROM partners
    WHERE id=?1
    LIMIT 1
  `).bind(session.pid).first();

  if(!partner || partner.status!=='active'){
    return json({error:'Parceiro inativo ou não encontrado.'},403);
  }

  const body=await request.json();
  const memberCode=String(body.code||'').trim().toUpperCase();

  if(!memberCode){
    return json({error:'Informe o código do cliente UP.'},400);
  }

  const member=await env.DB.prepare(`
    SELECT
      code,
      name,
      phone,
      email,
      profile,
      city,
      status,
      created_at
    FROM club_members
    WHERE code=?1
    LIMIT 1
  `).bind(memberCode).first();

  if(!member){
    return json({error:'Cliente UP não encontrado.'},404);
  }

  if(member.status!=='active'){
    return json({error:'Este cadastro do Clube UP Mobility está inativo.'},403);
  }

  const usage=await env.DB.prepare(`
    SELECT COUNT(*) AS total
    FROM benefit_uses
    WHERE partner_id=?1
      AND member_code=?2
  `).bind(partner.id,member.code).first();

  return json({
    ok:true,
    member:{
      code:member.code,
      name:member.name,
      phone:member.phone,
      email:member.email,
      profile:member.profile,
      city:member.city,
      status:member.status,
      createdAt:member.created_at
    },
    benefit:partner.benefit,
    partner:{
      code:partner.code,
      companyName:partner.company_name
    },
    usageCount:Number(usage?.total||0)
  });
}

function getCookie(cookie,name){
  const match=cookie.match(
    new RegExp('(?:^|; )'+name.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')+'=([^;]+)')
  );
  return match?match[1]:null;
}

async function verify(token,secret){
  try{
    const [raw,hex]=token.split('.');

    if(!raw||!hex||!secret){
      return null;
    }

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

    if(!ok){
      return null;
    }

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
