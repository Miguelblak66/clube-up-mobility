export async function onRequestGet({request,env}){
  try{
    const session=await authorized(request,env);

    if(!session){
      return json({error:'UNAUTHORIZED'},401);
    }

    const partner=await env.DB.prepare(`
      SELECT id,code,company_name,benefit,status
      FROM partners
      WHERE id=?1
      LIMIT 1
    `).bind(session.pid).first();

    if(!partner){
      return json({error:'Parceiro não encontrado.'},404);
    }

    if(partner.status!=='active'){
      return json({error:'Este parceiro está inativo.'},403);
    }

    const url=new URL(request.url);
    const code=String(url.searchParams.get('code')||'').trim().toUpperCase();

    if(!code){
      return json({error:'Informe o código do cliente.'},400);
    }

    const member=await env.DB.prepare(`
      SELECT
        id,
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
    `).bind(code).first();

    if(!member){
      return json({error:'Cliente não encontrado.'},404);
    }

    if(member.status!=='active'){
      return json({error:'Este cadastro não está ativo.'},403);
    }

    const usage=await env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM benefit_uses
      WHERE member_code=?1
        AND partner_id=?2
    `).bind(member.code,partner.id).first();

    return json({
      ok:true,
      member:{
        id:member.id,
        code:member.code,
        name:member.name,
        phone:member.phone,
        email:member.email,
        profile:member.profile,
        city:member.city,
        status:member.status,
        createdAt:member.created_at,
        usageCount:Number(usage?.total||0)
      },
      partner:{
        code:partner.code,
        companyName:partner.company_name,
        benefit:partner.benefit
      }
    });

  }catch(e){
    return json({
      error:'Não foi possível consultar o cliente.'
    },500);
  }
}

async function authorized(req,env){
  const cookie=req.headers.get('Cookie')||'';
  const match=cookie.match(/(?:^|; )up_partner=([^;]+)/);

  if(!match){
    return null;
  }

  return await verify(
    match[1],
    env.PARTNER_SECRET||env.ADMIN_SECRET||env.ADMIN_PASSWORD||'change-me'
  );
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
      {
        name:'HMAC',
        hash:'SHA-256'
      },
      false,
      ['verify']
    );

    const sig=new Uint8Array(
      (hex.match(/.{2}/g)||[]).map(x=>parseInt(x,16))
    );

    const valid=await crypto.subtle.verify(
      'HMAC',
      key,
      sig,
      new TextEncoder().encode(raw)
    );

    if(!valid){
      return null;
    }

    const payload=JSON.parse(
      atob(raw.replace(/-/g,'+').replace(/_/g,'/'))
    );

    if(!payload.exp || payload.exp<Date.now()){
      return null;
    }

    return payload;

  }catch(e){
    return null;
  }
}

function json(data,status=200){
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers:{
        'content-type':'application/json; charset=UTF-8',
        'cache-control':'no-store'
      }
    }
  );
    }
