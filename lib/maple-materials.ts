export const MAPLE_MATERIALS=[
 {id:'marshmallow',name:'Marshmallow',description:'Pillowy round faces, creamy colours and soft satin shading.'},
 {id:'velvet',name:'Velvet Pals',description:'Cosy plush animals with fine fuzzy fur and little bead eyes.'},
 {id:'glazed',name:'Glazed Critters',description:'Round collectible characters with bright, creamy highlights.'},
] as const;
export type MapleMaterial=typeof MAPLE_MATERIALS[number]['id'];
export const isMapleMaterial=(s:string):s is MapleMaterial=>MAPLE_MATERIALS.some(v=>v.id===s);
export const materialUrl=(style:MapleMaterial)=>`./maple-art/${style==='velvet'?'velvet-v2':style}.webp`;
// Atlas cells are measured against the generated artwork before publication.
export function materialCell(tier:number){if(!Number.isInteger(tier)||tier<0||tier>10)throw Error('Invalid sprite tier');return {column:tier%4,row:Math.floor(tier/4)};}
export const MATERIAL_SHEETS={
 marshmallow:{width:1536,height:1024,bodies:[[.516,.645,.286],[.495,.615,.331],[.508,.545,.357],[.5,.554,.354],[.466,.612,.299],[.5,.623,.31],[.508,.532,.346],[.508,.547,.349],[.505,.596,.346],[.513,.549,.346],[.51,.609,.323]]},
 velvet:{width:1536,height:1024,bodies:[[.516,.642,.286],[.5,.615,.318],[.505,.542,.39],[.508,.577,.383],[.495,.55,.363],[.505,.615,.328],[.51,.55,.352],[.497,.553,.359],[.5,.567,.378],[.508,.549,.367],[.518,.59,.354]]},
 glazed:{width:1448,height:1086,bodies:[[.536,.638,.307],[.505,.583,.37],[.492,.517,.395],[.503,.564,.395],[.602,.616,.356],[.503,.624,.351],[.497,.528,.387],[.489,.572,.409],[.517,.591,.387],[.505,.566,.387],[.492,.616,.367]]},
} as const;
export function materialSprite(style:MapleMaterial,tier:number,width:number,height:number,radius:number){
 const cell=materialCell(tier),body=MATERIAL_SHEETS[style].bodies[tier],cw=width/4,ch=height/3,sx=cell.column*cw,sy=cell.row*ch,scale=radius/(body[2]*cw);
 return {sx,sy,sw:cw,sh:ch,dx:-body[0]*cw*scale,dy:-body[1]*ch*scale,dw:cw*scale,dh:ch*scale};
}
