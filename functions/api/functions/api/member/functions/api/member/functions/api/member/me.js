export async function onRequestGet({request,env}){
  const token=getCookie(
    request.headers.get('Cookie')||'',
    'up_member'
  );

  if(!token){
    return json({error:'UNAUTHORIZED'},401);
  }

  const session=await verify(
    token,
    env.MEMBER_SECRET||env.ADMIN_SECRET||env.ADMIN_PASSWORD||'change-me'
  );

  if(!session || session.exp<Date.now()){
    return json({error:'UNAUTHORIZED'},401);
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
      driver_id,
      status,
      created_at
    FROM club_members
    WHERE id=?1
    LIMIT 1
  `).bind(session.mid).first();

  if(!member || member.status!=='active'){
    return json({
      error:'Cadastro do Clube UP Mobility inativo ou não encontrado.'
    },403);
  }

  const usage=await env.DB.prepare(`
    SELECT
      COUNT(*) AS total
    FROM benefit_uses
    WHERE member_code=?1
  `).bind(member.code).first();

  const history=await env.DB.prepare(`
    SELECT
      u.id,
      u.member_code,
      u.benefit_label,
      u.used_at,
      p.code AS partner_code,
      p.company_name,
      p.category,
      p.city
    FROM benefit_uses u
    JOIN partners p ON p.id=u.partner_id
    WHERE u.member_code=?1
    ORDER BY u.id DESC
    LIMIT 100
  `).bind(member.code).all();

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
      driverId:member.driver_id,
      status:member.status,
      createdAt:member.created_at,
      usageCount:Number(usage?.total||0)
    },
    history:history.results||[]
  });
}

function getCookie(cookie,name){
  const match=cookie.match(
    new RegExp(
      '(?:^|; )'+
      name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+
      '=([^;]+)'
    )
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
      (hex.match(/.{2}/g)||[])
        .map(x=>parseInt(x,16))
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
      atob(
        raw
          .replace(/-/g,'+')
          .replace(/_/g,'/')
      )
    );

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
        'content-type':'application/json',
        'cache-control':'no-store'
      }
    }
  );
        }
