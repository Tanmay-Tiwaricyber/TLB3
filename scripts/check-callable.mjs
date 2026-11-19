// Read-only deployment check: no credentials, employee information or writes.
import {pathToFileURL} from 'node:url';

const origin = 'https://tlb3-pulse.vercel.app';
const endpoint = 'https://us-central1-chat-world-62138.cloudfunctions.net/createEmployee';
export async function checkCallable(url = endpoint) {
  const preflight = await fetch(url, {
    method: 'OPTIONS', redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: {Origin: origin, 'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type'}
  });
  if (preflight.status === 404) throw new Error('Endpoint not found. Deploy createEmployee in chat-world-62138 / us-central1.');
  if (preflight.status === 403) throw new Error('Preflight forbidden. Check Cloud Run invoker IAM and ingress on the callable service.');
  const tokens = name => (preflight.headers.get(name) || '').toLowerCase().split(',').map(v=>v.trim());
  if (!preflight.ok || preflight.headers.get('access-control-allow-origin') !== origin ||
      !tokens('access-control-allow-methods').includes('post') ||
      !['authorization','content-type'].every(h=>tokens('access-control-allow-headers').includes(h))) {
    throw new Error(`Unexpected OPTIONS response (HTTP ${preflight.status}). Verify the deployed callable and its allowed origins.`);
  }
  const post = await fetch(url, {method: 'POST', redirect:'error', signal: AbortSignal.timeout(30000),
    headers:{Origin:origin,'Content-Type':'application/json'}, body:JSON.stringify({data:{}})});
  const error = (await post.json().catch(()=>null))?.error;
  if(post.status!==401 || error?.status!=='UNAUTHENTICATED' || post.headers.get('access-control-allow-origin')!==origin) {
    throw new Error(`Expected a readable Firebase UNAUTHENTICATED response to an unsigned POST; received HTTP ${post.status}.`);
  }
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  try{await checkCallable(); console.log('PASS: createEmployee accepts the portal preflight and rejects an unsigned request.');}
  catch(e){console.error(e.message);process.exitCode=1;}
}
