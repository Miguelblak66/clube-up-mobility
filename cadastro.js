export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const profile = String(body.profile || '').trim();
    const city = String(body.city || '').trim();
    const driverId = String(body.driverId || '').trim();

    if (!name || name.length < 3) return json({error:'Informe seu nome completo.'},400);
    if (!phone || phone.length < 8) return json({error:'Informe um WhatsApp válido.'},400);
    if (!['motorista','cliente'].includes(profile)) return json({error:'Selecione seu perfil.'},400);
    if (!city) return json({error:'Informe a cidade.'},400);

    const normalizedPhone = phone.replace(/\D/g,'');
    const exists = await context.env.DB.prepare(
      'SELECT code FROM club_members WHERE phone = ?1 LIMIT 1'
    ).bind(normalizedPhone).first();
    if (exists) return json({error:'Este WhatsApp já possui cadastro no Clube UP Mobility.'},409);

    const code = await makeCode(context.env.DB);
    await context.env.DB.prepare(`
      INSERT INTO club_members (code,name,phone,email,profile,city,driver_id,status,created_at)
      VALUES (?1,?2,?3,?4,?5,?6,?7,'active',datetime('now'))
    `).bind(code,name,normalizedPhone,email,profile,city,driverId).run();

    return json({ok:true,code,name});
  } catch (e) {
    return json({error:'Erro interno ao salvar o cadastro.'},500);
  }
}

async function makeCode(db){
  for(let i=0;i<8;i++){
    const code='UP-'+Math.floor(100000+Math.random()*900000);
    const found=await db.prepare('SELECT 1 FROM club_members WHERE code=?1 LIMIT 1').bind(code).first();
    if(!found) return code;
  }
  throw new Error('code_generation_failed');
}

function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=UTF-8','cache-control':'no-store'}});
}
