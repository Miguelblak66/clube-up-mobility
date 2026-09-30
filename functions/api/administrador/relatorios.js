export async function onRequestGet({request,env}){
  if(!(await authorized(request,env))) return json({error:'UNAUTHORIZED'},401);
  try{
    const url=new URL(request.url);
    const from=validDate(url.searchParams.get('from'));
    const to=validDate(url.searchParams.get('to'));
    const useWhere=[]; const params=[];
    if(from){useWhere.push(`date(u.used_at)>=date(?)`);params.push(from)}
    if(to){useWhere.push(`date(u.used_at)<=date(?)`);params.push(to)}
    const where=useWhere.length?'WHERE '+useWhere.join(' AND '):'';
    const totals=await env.DB.prepare(`SELECT COUNT(*) total, SUM(date(u.used_at)=date('now')) today, SUM(strftime('%Y-%m',u.used_at)=strftime('%Y-%m','now')) month FROM benefit_uses u ${where}`).bind(...params).first();
    const activeMembers=await env.DB.prepare(`SELECT COUNT(*) n FROM club_members WHERE status='active'`).first();
    const activePartners=await env.DB.prepare(`SELECT COUNT(*) n FROM partners WHERE status='active'`).first();
    const partners=await env.DB.prepare(`SELECT p.id,p.code,p.company_name,p.category,p.city,COUNT(u.id) uses FROM partners p LEFT JOIN benefit_uses u ON u.partner_id=p.id ${where?'AND '+useWhere.join(' AND '):''} GROUP BY p.id ORDER BY uses DESC,p.company_name ASC LIMIT 100`).bind(...params).all();
    const daily=await env.DB.prepare(`SELECT date(u.used_at) day,COUNT(*) uses FROM benefit_uses u ${where} GROUP BY date(u.used_at) ORDER BY day DESC LIMIT 366`).bind(...params).all();
    const recent=await env.DB.prepare(`SELECT u.id,u.member_code,u.benefit_label,u.used_at,p.code partner_code,p.company_name FROM benefit_uses u JOIN partners p ON p.id=u.partner_id ${where} ORDER BY u.id DESC LIMIT 500`).bind(...params).all();
    const benefits=await env.DB.prepare(`SELECT COALESCE(NULLIF(TRIM(u.benefit_label),''),'Benefício') benefit_label,COUNT(*) uses FROM benefit_uses u ${where} GROUP BY COALESCE(NULLIF(TRIM(u.benefit_label),''),'Benefício') ORDER BY uses DESC,benefit_label ASC LIMIT 100`).bind(...params).all();
    const membersRecent=await env.DB.prepare(`SELECT code,name,profile,created_at FROM club_members ${from||to?`WHERE ${[from?'date(created_at)>=date(?)':'',to?'date(created_at)<=date(?)':''].filter(Boolean).join(' AND ')}`:''} ORDER BY id DESC LIMIT 200`).bind(...[from,to].filter(Boolean)).all();
    return json({totals:{...(totals||{}),activeMembers:activeMembers?.n||0,activePartners:activePartners?.n||0},partners:partners.results||[],daily:daily.results||[],recent:recent.results||[],allUses:recent.results||[],benefits:benefits.results||[],membersRecent:membersRecent.results||[],filters:{from:from||'',to:to||''}});
  }catch(e){return json({error:'Não foi possível carregar os relatórios.'},400)}
}
function validDate(v){return v&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v:''}
async function authorized(req,env){const m=(req.headers.get('Cookie')||'').match(/(?:^|; )up_admin=([^;]+)/);if(!m)return false;const p=await verify(m[1],env.ADMIN_SECRET||env.ADMIN_PASSWORD||'');return !!p&&p.exp>Date.now()}
async function verify(token,secret){try{const [raw,hex]=token.split('.');if(!raw||!hex||!secret)return null;const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);const sig=new Uint8Array((hex.match(/.{2}/g)||[]).map(x=>parseInt(x,16)));if(!await crypto.subtle.verify('HMAC',key,sig,new TextEncoder().encode(raw)))return null;return JSON.parse(atob(raw.replace(/-/g,'+').replace(/_/g,'/')))}catch(e){return null}}
function json(d,s=200){return new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}})}
