import {isIP} from 'node:net';
export function connectionIp(req,trusted=process.env.TRUST_PROXY==='1'||process.env.RENDER==='true'){
 const raw=String(req.socket.remoteAddress||'unknown'),peer=raw.replace(/^::ffff:/,'');
 if(trusted){const candidate=String(req.headers['x-forwarded-for']||'').split(',').pop().trim();if(isIP(candidate))return candidate.replace(/^::ffff:/,'')}
 return peer;
}
export function roomIpCount(clients,ip,room,accountId,exclude){const identities=new Set();for(const p of clients){if(p===exclude||p.readyState!==1||p.clientIp!==ip||p.world?.room!==room||accountId&&p.user?.id===accountId)continue;identities.add(p.user?'a'+p.user.id:p.pid)}return identities.size}
