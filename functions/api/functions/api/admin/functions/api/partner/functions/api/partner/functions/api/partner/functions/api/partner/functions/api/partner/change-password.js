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

  const body=await request.json();

  const currentPassword=String(body.currentPassword||'');
  const newPassword=String(body.newPassword||'');

  if(!currentPassword || !newPassword){
    return json({error:'Informe a senha atual e a nova senha.'},400);
  }

  if(newPassword.length<8){
    return json({error:'A nova senha deve ter pelo menos 8 caracteres.'},400);
  }

  const user=await env.DB.prepare(`
    SELECT id,email,password_hash,status
    FROM partner_users
    WHERE id=?1
      AND partner_id=?2
    LIMIT 1
  `).bind(session.uid,session.pid).first();

  if(!user || user.status!=='active'){
    return json({error:'Acesso do parceiro não encontrado ou inativo.'},403);
  }

  const valid=await verifyPassword(
    currentPassword,
    user.password_hash
  );

  if(!valid){
    return json({error:'A senha atual está incorreta.'},401);
  }

  const hash=await hashPassword(newPassword);

  await env.DB.prepare(`
    UPDATE partner_users
    SET password_hash=?
    WHERE id=?
      AND partner_id=?
  `).bind(
    hash,
    user.id,
    session.pid
  ).run();

  return json({
    ok:true,
    message:'Senha alterada com sucesso.'
  });
}

async function hashPassword(password){
  const salt=crypto.getRandomValues(new Uint8Array(16));

  const key=await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits=await crypto.subtle.deriveBits(
    {
      name:'PBKDF2',
      salt,
      iterations:120000,
      hash:'SHA-256'
    },
    key,
    256
  );

  return `pbkdf2$120000$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}

async function verifyPassword(password,stored){
  try{
    const [tag,it,salt64,hash64]=stored.split('$');

    if(tag!=='pbkdf2'){
      return false;
    }

    const salt=from64(salt64);
    const expected=from64(hash64);

    const key=await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const bits=new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name:'PBKDF2',
          salt,
          iterations:Number(it),
          hash:'SHA-256'
        },
        key,
        expected.length*8
      )
    );

    if(bits.length!==expected.length){
      return false;
    }

    let diff=0;

    for(let i=0;i<bits.length;i++){
      diff|=bits[i]^expected[i];
    }

    return diff===0;

  }catch(e){
    return false;
  }
}

function b64(a){
  let s='';

  for(const x of a){
    s+=String.fromCharCode(x);
  }

  return btoa(s);
}

function from64(s){
  const raw=atob(s);

  return Uint8Array.from(
    raw,
    c=>c.charCodeAt(0)
  );
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
