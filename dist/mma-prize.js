export function mmaPrize(players){
 const count=typeof players==='number'?players:[...players].filter(p=>!p.bot&&!p.spectator&&p.cells?.length).length;
 return count>=20?250000:count>=15?200000:count>=10?150000:count>=5?100000:50000;
}
