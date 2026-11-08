// Static card artwork: project the live game's ship geometry with its Follow camera.
// This exporter runs only during asset authoring; it adds no rendering work to the hub.
import * as THREE from 'three';
import {writeFile} from 'node:fs/promises';
import {shipModel,configureFlightCamera,FLIGHT_CAMERA} from '../lib/tunnel-scene.ts';
import {FLIGHT,TAU} from '../lib/tunnel-flight.ts';
import {panelShade,tunnelSection} from '../lib/tunnel-presentation.ts';
const W=500,H=700,camera=new THREE.PerspectiveCamera(74,W/H,FLIGHT_CAMERA.near,FLIGHT_CAMERA.far);
configureFlightCamera(camera,0,'follow');camera.updateProjectionMatrix();
let captureShip=false;const shipFaces:{points:number[][];hex:string;opacity:number}[]=[];
const background=new THREE.Color(0x090d1d),layers:{z:number;svg:string}[]=[];
const polar=(a:number,r:number,z:number)=>new THREE.Vector3(Math.sin(a)*r,-Math.cos(a)*r,z);
const project=(p:THREE.Vector3)=>{const v=p.clone().project(camera);return [(v.x+1)*W/2,(1-v.y)*H/2];};
const coords=(points:THREE.Vector3[])=>points.map(p=>project(p).map(n=>n.toFixed(2)).join(',')).join(' ');
function polygon(points:THREE.Vector3[],hex:number,opacity=1,shade=1){const z=points.reduce((sum,p)=>sum+p.z,0)/points.length;if(z>7)return;const color=new THREE.Color(hex).multiplyScalar(shade).lerp(background,Math.max(0,Math.min(.98,(-z-70)/130)));if(captureShip){shipFaces.push({points:points.map(p=>{const v=p.clone().project(camera);return [(v.x+1)*W/2,(1-v.y)*H/2,v.z];}),hex:color.getHexString(),opacity});return;}layers.push({z,svg:`<polygon points="${coords(points)}" fill="#${color.getHexString()}" opacity="${opacity.toFixed(3)}"/>`});}
function line(points:THREE.Vector3[],hex:number,width:number,opacity=1){const z=points.reduce((sum,p)=>sum+p.z,0)/points.length;if(z>7||captureShip)return;layers.push({z:z+.04,svg:`<polyline points="${coords(points)}" fill="none" stroke="#${new THREE.Color(hex).getHexString()}" stroke-width="${width.toFixed(2)}" stroke-opacity="${opacity.toFixed(3)}" stroke-linecap="round"/>`});}
const palette=[0x171c35,0x14182d,0x1e203d,0x111b2d];
for(let row=0;row<32;row++){const z=6-row*6,section=tunnelSection(row,0),distance=12-z;
 for(let sector=0;sector<24;sector++){const a=sector*TAU/24,d=TAU/24*.47;polygon([polar(a-d,8.64,z-.15),polar(a+d,8.64,z-.15),polar(a+d,8.64,z-5.8),polar(a-d,8.64,z-5.8)],palette[panelShade(section.worldIndex,sector)]);}
 line(Array.from({length:97},(_,i)=>polar(i*TAU/96,8.47,z)),0x303552,Math.max(.35,17/(distance+2)),.85);
 const fade=Math.max(0,Math.min(1,(130-distance)/80));
 for(let sector=0;sector<8;sector++){const a=sector*TAU/8+section.lightPhase,color=sector%2?0x9253ef:0x39d8dc;
 line(Array.from({length:9},(_,i)=>polar(a+i*Math.PI/9/8,8.32,z-.12)),color,Math.max(.7,29/distance),fade);
 line([polar(a,8.35,z-2.3),polar(a,8.35,z-4.7)],0x567bd3,Math.max(.45,15/distance),fade*.7);}
}
function gate(z:number,start:number,length:number,amber=true){const layerStart=layers.length;const color=amber?0xffa53d:0xf16b85;for(let a=start;a<start+length-.001;a+=.13){const b=Math.min(a+.13,start+length);polygon([polar(a,5.9,z),polar(b,5.9,z),polar(b,8.65,z),polar(a,8.65,z)],color,1,.92);line([polar(a,5.93,z+.03),polar(a,8.6,z+.03)],amber?0x6d482a:0x6c304a,.65,.8);}line(Array.from({length:Math.ceil(length/.07)+1},(_,i)=>polar(start+length*i/Math.ceil(length/.07),5.93,z+.08)),amber?0xffbc58:0xff8aa2,1.7);const slices=layers.splice(layerStart);const steps=Math.ceil(length/.06);const boundary=[...Array.from({length:steps+1},(_,i)=>polar(start+length*i/steps,8.65,z)),...Array.from({length:steps+1},(_,i)=>polar(start+length*(steps-i)/steps,5.9,z))];const id=`gate${Math.abs(z)}`;layers.push({z,svg:`<defs><clipPath id="${id}"><polygon points="${coords(boundary)}"/></clipPath></defs><g clip-path="url(#${id})">${slices.map(s=>s.svg).join('')}</g>`});}
gate(-27,1.12,4.66);gate(-72,3.2,4.66);gate(-10,5.08,.42,false);
function meshPolygons(root:THREE.Object3D){root.updateMatrixWorld(true);root.traverse(object=>{const mesh=object as THREE.Mesh;if(!mesh.geometry||!mesh.visible)return;const material=mesh.material as THREE.MeshPhongMaterial;if(!material?.color)return;const position=mesh.geometry.getAttribute('position'),indices=mesh.geometry.index;const vertex=(i:number)=>new THREE.Vector3().fromBufferAttribute(position,indices?indices.getX(i):i).applyMatrix4(mesh.matrixWorld);
 if((object as THREE.Line).isLine){line(Array.from({length:position.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld)),material.color.getHex(),.9);return;}
 const count=indices?indices.count:position.count;for(let i=0;i<count;i+=3){const points=[vertex(i),vertex(i+1),vertex(i+2)],center=points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1/3),normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();if(normal.dot(camera.position.clone().sub(center))<0)normal.negate();const lit=material instanceof THREE.MeshBasicMaterial?1:.7+.65*Math.max(0,normal.dot(new THREE.Vector3(-3,8,14).sub(center).normalize()));polygon(points,material.color.getHex(),material.opacity,lit);}});}
for(const z of [-8,-17,-28,-43,-63]){const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.28),new THREE.MeshBasicMaterial({color:0x66f4ee}));crystal.position.copy(polar(.1,FLIGHT.shipRadius,z));crystal.rotation.y=.5;meshPolygons(crystal);}
const ship=shipModel();ship.position.copy(polar(0,FLIGHT.shipRadius,FLIGHT.shipZ));captureShip=true;meshPolygons(ship);captureShip=false;
layers.sort((a,b)=>a.z-b.z);
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><radialGradient id="glow"><stop stop-color="#7150cb" stop-opacity=".13"/><stop offset="1" stop-color="#090d1d" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="#090d1d"/>${layers.map(l=>l.svg).join('')}<ellipse cx="250" cy="350" rx="235" ry="285" fill="url(#glow)"/></svg>`;
await writeFile('/tmp/neon-preview-background.svg',svg);
await writeFile('/tmp/neon-preview-ship.json',JSON.stringify(shipFaces));
console.log(`Rendered ${layers.length} projected surfaces from the game geometry.`);
