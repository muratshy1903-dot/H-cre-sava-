export function isRoomRecordHolder(record,player,room){return !!record&&record.room===room&&Number.isSafeInteger(record.owner)&&record.owner>0&&player?.id==='u'+record.owner}
export function drawRecordCrown(ctx,cell,r,scale){
 const w=Math.min(64,Math.max(22,r*scale*.72))/scale,h=w*.58,x=cell.x-w/2,y=cell.y-r-h-7/scale;
 ctx.save();ctx.fillStyle='#ffdc4b';ctx.strokeStyle='#9b6000';ctx.lineWidth=1.5/scale;
 ctx.beginPath();ctx.moveTo(x,y+h);ctx.lineTo(x-w*.05,y);ctx.lineTo(x+w*.25,y+h*.4);ctx.lineTo(x+w*.5,y-h*.12);ctx.lineTo(x+w*.75,y+h*.4);ctx.lineTo(x+w*1.05,y);ctx.lineTo(x+w,y+h);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#fff4b1';ctx.fillRect(x+w*.12,y+h*.76,w*.76,h*.1);ctx.restore();
}
