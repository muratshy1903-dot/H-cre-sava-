// Smooth network positions without changing the authoritative game state.
export class MotionSmoother {
  constructor(duration=60){this.duration=duration;this.reset();}
  reset(){this.cells=new Map();this.items=new Map();this.frame=null;this.at=0;}
  push(snapshot,now){
    this.sample(now);
    const reconcile=(entities,cache)=>{
      const next=new Map();
      for(const target of entities){
        const old=cache.get(target.id);
        const jump=old?Math.hypot(target.x-old.value.x,target.y-old.value.y):Infinity;
        const from=old&&jump<1200?{x:old.value.x,y:old.value.y,mass:old.value.mass}:target;
        next.set(target.id,{from,target,value:{...target,x:from.x,y:from.y,mass:target.mass}});
      }
      return next;
    };
    this.cells=reconcile(snapshot.players.flatMap(p=>p.cells),this.cells);
    this.items=reconcile(snapshot.items.filter(v=>v.type==='eject'),this.items);
    this.frame={...snapshot,players:snapshot.players.map(p=>({...p,cells:p.cells.map(c=>this.cells.get(c.id).value)})),items:snapshot.items.map(v=>this.items.get(v.id)?.value||v)};
    this.at=now;
  }
  sample(now){
    const t=Math.max(0,Math.min(1,(now-this.at)/this.duration));
    for(const cache of [this.cells,this.items])for(const {from,target,value}of cache.values()){
      value.x=from.x+(target.x-from.x)*t;value.y=from.y+(target.y-from.y)*t;
    }
    return this.frame;
  }
}
