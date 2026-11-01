export const PLAYER_COLORS={self:'#ff4545',team:'#ffeb3b',clan:'#69dfcc',other:'#ffffff'};
export function playerRelation(player,self){
 if(player?.id&&player.id===self?.id)return 'self';
 if(self?.team&&player?.team===self.team)return 'team';
 if(self?.clanId&&player?.clanId===self.clanId)return 'clan';
 return 'other';
}
export function playerTextColor(player,self,leaderboard=false){const relation=playerRelation(player,self);return PLAYER_COLORS[!leaderboard&&relation==='self'?'other':relation]}
export function cameraTarget(snapshot,id){
 const own=snapshot?.players.find(p=>p.id===id),follow=snapshot?.players.find(p=>p.id===snapshot?.following?.id);
 const p=own?.cells.length?own:follow?.cells.length?follow:snapshot?.players[0];
 let mass=0,x=0,y=0;for(const c of p?.cells||[]){mass+=c.mass;x+=c.x*c.mass;y+=c.y*c.mass}
 return {x:mass?x/mass:(snapshot?.size||8500)/2,y:mass?y/mass:(snapshot?.size||8500)/2,mass:mass||100};
}
