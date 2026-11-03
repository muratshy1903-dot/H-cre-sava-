const paths={avci:{name:'Avcı',image:'/skin-art/agarz1.webp',color:'#f5824b'},sampiyon:{name:'Şampiyon',image:'/skin-art/agarz100.webp',color:'#ffda64'},klan:{name:'Klan',image:'/skin-art/agarz103.webp',color:'#48d7bc'}};
export function rewardSkinInfo(id){const m=String(id).match(/^zirve-(\d+)-(avci|sampiyon|klan)-(5|10|15|20)$/);return m?{...paths[m[2]],id,name:m[1]+'. Sezon · '+paths[m[2]].name+' '+m[3],season:Number(m[1]),level:Number(m[3])}:null}
export function ownsRewardSkin(p,id){return !!(rewardSkinInfo(id)&&p?.inventory?.includes(id)&&p.cosmetics?.[id]?.type==='skin')}
