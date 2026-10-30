const safeColor=c=>/^#[0-9a-f]{6}$/i.test(c||'')?c:'#5cddff';
export function drawCosmeticBorder(ctx,c,r,look,scale,now){
 if(!look?.border)return;const item=look.border,rr=r+5/scale;ctx.save();ctx.strokeStyle=safeColor(item.color);ctx.lineWidth=2.5/scale;
 if(item.id.endsWith('-27')){ctx.beginPath();for(let i=0;i<12;i++){const a=i/12*Math.PI*2+now/12000,x=c.x+Math.cos(a)*rr,y=c.y+Math.sin(a)*rr;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.stroke()}
 else if(item.id.endsWith('-29')){ctx.globalAlpha=.3;ctx.beginPath();ctx.arc(c.x,c.y,rr+7/scale,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.beginPath();ctx.arc(c.x,c.y,rr,now/400,now/400+Math.PI*1.45);ctx.stroke()}
 else{ctx.shadowColor=safeColor(item.color);ctx.shadowBlur=10;ctx.beginPath();ctx.arc(c.x,c.y,rr,0,Math.PI*2);ctx.stroke()}
 ctx.restore();
}
export function drawCosmeticEntry(ctx,c,r,look,scale,age){
 if(!look?.entry||!Number.isFinite(age)||age<0||age>2200)return;const t=age/2200;ctx.save();ctx.strokeStyle=safeColor(look.entry.color);ctx.globalAlpha=(1-t)*.7;ctx.lineWidth=3/scale;ctx.beginPath();ctx.arc(c.x,c.y,r+20/scale+t*160/scale,0,Math.PI*2);ctx.stroke();ctx.fillStyle=safeColor(look.entry.color);for(let i=0;i<12;i++){const a=i/12*Math.PI*2+t*1.5,rr=r+(25+t*120)/scale;ctx.beginPath();ctx.arc(c.x+Math.cos(a)*rr,c.y+Math.sin(a)*rr,(3*(1-t)+1)/scale,0,Math.PI*2);ctx.fill()}ctx.restore();
}
export function drawCosmeticName(ctx,text,x,y,look,fast){ctx.save();if(look?.nick&&!fast){ctx.fillStyle=safeColor(look.nick.color);ctx.shadowColor=safeColor(look.nick.color);ctx.shadowBlur=9}ctx.fillText(text,x,y);ctx.restore()}
