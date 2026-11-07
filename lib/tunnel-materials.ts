import * as THREE from 'three';
export const DETAIL_FADE={near:45,far:125};
export function detailVisibility(depth:number){const t=Math.max(0,Math.min(1,(depth-DETAIL_FADE.near)/(DETAIL_FADE.far-DETAIL_FADE.near)));return 1-t*t*(3-2*t);}
// Thin emissive geometry fades before it becomes a field of subpixel edges.
// Keep normal depth testing so walls and obstacles still occlude the lights.
export function stableDetail(color:number){const material=new THREE.MeshBasicMaterial({color,toneMapped:false,transparent:true,depthWrite:false});material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`#include <fog_fragment>
#ifdef USE_FOG
 gl_FragColor.a *= 1.0 - smoothstep(${DETAIL_FADE.near.toFixed(1)}, ${DETAIL_FADE.far.toFixed(1)}, vFogDepth);
#endif
`);};material.customProgramCacheKey=()=>`tunnel-detail-fade-${DETAIL_FADE.near}-${DETAIL_FADE.far}`;return material;}
