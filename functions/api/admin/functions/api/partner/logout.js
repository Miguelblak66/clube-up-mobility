export async function onRequestPost({request}){
  return new Response(JSON.stringify({ok:true}),{
    headers:{
      "content-type":"application/json; charset=UTF-8",
      "cache-control":"no-store",
      "set-cookie":"up_partner=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
    }
  });
}
