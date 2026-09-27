export async function onRequestPost({request,env}){
  try{
    const body=await request.json();

    const code=String(body.code||'').trim().toUpperCase();
    const phone=String(body.phone||'').replace(/\D/g,'');

    if(!code||!phone){
      return json({error:'Informe seu código UP e WhatsApp.'},400);
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
      WHERE code=?1
      LIMIT 1
    `).bind(code).first();

    if(!member){
      return json({error:'Código UP não encontrado.'},401);
    }

    if(member.status!=='active'){
      return json({error:'Este cadastro do Clube UP Mobility está inativo.'},403);
    }

    const registeredPhone=String(member.phone||'').replace(/\D/g,'');

    if(registeredPhone!==phone){
      return json({error:'Código UP ou WhatsApp inválido.'},401);
    }

    const token=await sign(
      {
        mid:member.id,
        code:member.code,
        exp:Date.now()+8*60*60*1000
      },
      env.MEMBER_SECRET||env.ADMIN_SECRET||env.ADMIN_PASSWORD||'change-me'
    );

    return new Response(
      JSON.stringify({
        ok:true,
        code:member.code,
        name:member.name
      }),
      {
        headers:{
          'content-type':'application/json; charset=UTF-8',
          'cache-control':'no-store',
          'set-cookie':cookie('up_member',token)
        }
      }
    );

  }catch(e){
    return json({error:'Não foi possível entrar.'},400);
  }
}

async function sign(payload,secret){
  const raw=btoa(JSON.stringify(payload))
    .replace(/=+$/,'')
    .replace(/\+/g,'-')
    .replace(/\//g,'_');

  const key=await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {name:'HMAC',hash:'SHA-256'},
    false,
    ['sign']
  );

  const sig=await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(raw)
  );

  return raw+'.'+Array.from(
    new Uint8Array(sig),
    x=>x.toString(16).padStart(2,'0')
  ).join('');
}

function cookie(name,value){
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;
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
