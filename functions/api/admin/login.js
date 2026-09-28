export async function onRequestPost({request,env}){
  try{
    const b=await request.json();

    const user=String(b.user||'').trim();
    const password=String(b.password||'');

    const expectedUser=env.ADMIN_USER||'admin';
    const expectedPassword=env.ADMIN_PASSWORD||'';

    if(!expectedPassword || user!==expectedUser || password!==expectedPassword){
      return json({error:'Usuário ou senha inválidos.'},401);
    }

    const token=await sign(
      {
        u:user,
        exp:Date.now()+8*60*60*1000
      },
      env.ADMIN_SECRET||expectedPassword
    );

    return new Response(
      JSON.stringify({ok:true}),
      {
        headers:{
          'content-type':'application/json',
          'set-cookie':cookie('up_admin',token)
        }
      }
    );

  }catch(e){
    return json({error:'Não foi possível entrar.'},400);
  }
}

function cookie(n,v){
  return `${n}=${v}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;
}

async function sign(payload,secret){
  const raw=btoa(JSON.stringify(payload))
    .replace(/=+$/,'')
    .replace(/\+/g,'-')
    .replace(/\//g,'_');

  const key=await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {
      name:'HMAC',
      hash:'SHA-256'
    },
    false,
    ['sign']
  );

  const sig=await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(raw)
  );

  return raw+'.'+buf(sig);
}

function buf(a){
  return String.fromCharCode(...new Uint8Array(a))
    .replace(
      /./g,
      c=>c.charCodeAt(0).toString(16).padStart(2,'0')
    );
}

function json(d,s){
  return new Response(
    JSON.stringify(d),
    {
      status:s,
      headers:{
        'content-type':'application/json'
      }
    }
  );
}
