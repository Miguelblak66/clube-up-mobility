export async function onRequestPost({request,env}){
  const session=await authorized(request,env);
  if(!session) return json({error:'UNAUTHORIZED'},401);

  try{
    const body=await request.json();
    const memberCode=String(body.memberCode||'').trim().toUpperCase();

    if(!memberCode){
      return json({error:'Informe o código do cliente.'},400);
    }

    const partner=await env.DB.prepare(`
      SELECT
        id,
        code,
        company_name,
        benefit,
        status
      FROM partners
      WHERE id=?1
      LIMIT 1
    `).bind(session.pid).first();

    if(!partner || partner.status!=='active'){
      return json({error:'Este parceiro está inativo.'},403);
    }

    const member=await env.DB.prepare(`
      SELECT
        code,
        name,
        phone,
        profile,
        city,
        status
      FROM club_members
      WHERE code=?1
      LIMIT 1
    `).bind(memberCode).first();

    if(!member){
      return json({error:'Cliente não encontrado.'},404);
    }

    if(member.status!=='active'){
      return json({error:'Este cliente está inativo.'},403);
    }

    const recent=await env.DB.prepare(`
      SELECT
        id,
        used_at
      FROM benefit_uses
      WHERE partner_id=?1
        AND member_code=?2
        AND used_at>=datetime('now','-10 minutes')
      ORDER BY id DESC
      LIMIT 1
    `).bind(session.pid,member.code).first();

    if(recent){
      return json({
        error:'Este benefício já foi utilizado nos últimos 10 minutos.'
      },409);
    }

    await env.DB.prepare(`
      INSERT INTO benefit_uses
        (partner_id,member_code,benefit_label,used_at)
      VALUES
        (?1,?2,?3,datetime('now'))
    `).bind(
      partner.id,
      member.code,
      partner.benefit
    ).run();

    const total=await env.DB.prepare(`
      SELECT COUNT(*) total
      FROM benefit_uses
      WHERE partner_id=?1
    `).bind(partner.id).first();

    return json({
      ok:true,
      message:'Benefício registrado com sucesso.',
      member:{
        code:member.code,
        name:member.name
      },
      benefit:partner.benefit,
      usageCount:Number(total?.total||0)
    });

  }catch(e){
    return json({
      error:'Não foi possível registrar o uso do benefício.'
    },500);
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
