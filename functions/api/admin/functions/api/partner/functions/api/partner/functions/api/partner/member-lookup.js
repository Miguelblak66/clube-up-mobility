export async function onRequestGet({request,env}){
  const session=await authorized(request,env);
  if(!session) return json({error:'UNAUTHORIZED'},401);

  try{
    const url=new URL(request.url);
    const code=String(url.searchParams.get('code')||'').trim().toUpperCase();

    if(!code){
      return json({error:'Informe o código do cliente.'},400);
    }

    const partner=await env.DB.prepare(`
      SELECT id,code,company_name,benefit,status
      FROM partners
      WHERE id=?1
      LIMIT 1
    `).bind(session.pid).first();

    if(!partner || partner.status!=='active'){
      return json({error:'Parceiro inativo.'},403);
    }

    const member=await env.DB.prepare(`
      SELECT
        code,
        name,
        phone,
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
      return json({error:'Este cadastro está inativo.'},403);
    }

    const usage=await env.DB.prepare(`
      SELECT
        id,
        benefit_label,
        used_at
      FROM benefit_uses
      WHERE partner_id=?1
        AND member_code=?2
      ORDER BY id DESC
      LIMIT 20
    `).bind(session.pid,member.code).all();

    return json({
      ok:true,
      member:{
        code:member.code,
        name:member.name,
        phone:member.phone,
        profile:member.profile,
        city:member.city,
        status:member.status,
        createdAt:member.created_at
      },
      benefit:{
        label:partner.benefit,
        partnerCode:partner.code,
        companyName:partner.company_name
      },
      usageHistory:usage.results||[]
    });

  }catch(e){
    return json({error:'Não foi possível consultar o cliente.'},500);
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
