export type Vehicle={id:string;horizontal:boolean;length:2|3;lane:number};
export type Puzzle={id:string;difficulty:'Easy'|'Intermediate'|'Advanced'|'Expert';vehicles:Vehicle[];positions:number[];minimum:number;solution:{piece:number;to:number}[]};
export type Board=number[];
export function occupancy(vehicles:Vehicle[],positions:Board):number[]{
 if(vehicles.length!==positions.length||!vehicles.length)throw Error('Invalid board');
 const cells=Array(36).fill(-1);
 vehicles.forEach((v,i)=>{const p=positions[i];if(!Number.isInteger(p)||p<0||p+v.length>6||!Number.isInteger(v.lane)||v.lane<0||v.lane>5)throw Error('Out of bounds');for(let n=0;n<v.length;n++){const cell=v.horizontal?v.lane*6+p+n:(p+n)*6+v.lane;if(cells[cell]!==-1)throw Error('Overlap');cells[cell]=i;}});return cells;
}
export function bounds(vehicles:Vehicle[],positions:Board,piece:number):[number,number]{
 const v=vehicles[piece];if(!v)throw Error('Unknown vehicle');const cells=occupancy(vehicles,positions),p=positions[piece];let min=p,max=p;
 const empty=(n:number)=>cells[v.horizontal?v.lane*6+n:n*6+v.lane]===-1;
 while(min>0&&empty(min-1))min--;while(max+v.length<6&&empty(max+v.length))max++;return [min,max];
}
export function slide(vehicles:Vehicle[],positions:Board,piece:number,to:number):Board{
 const [min,max]=bounds(vehicles,positions,piece);if(!Number.isInteger(to)||to<min||to>max)throw Error('Illegal slide');if(to===positions[piece])return positions;const next=[...positions];next[piece]=to;return next;
}
export function solved(positions:Board){return positions[0]===4;}
export type Session={level:string;history:Board[]};
export type Progress={version:1;records:Record<string,number>;session:Session|null};
// Collection 2 has different layouts; keep original records and sessions separate.
export const SAVE_KEY='harharhar.gridlock.v2';
export function decodeProgress(raw:string,puzzles:Puzzle[]):Progress|null{
 try{const p=JSON.parse(raw);if(p.version!==1||!p.records||typeof p.records!=='object'||Array.isArray(p.records))return null;const records:Record<string,number>={};for(const level of puzzles){const value=p.records[level.id];if(Number.isSafeInteger(value)&&value>=level.minimum)records[level.id]=value;}
 let session:Session|null=null;
 if(p.session){const level=puzzles.find(l=>l.id===p.session.level),history=p.session.history;if(!level||!Array.isArray(history)||!history.length||history.length>10001)return null;if(JSON.stringify(history[0])!==JSON.stringify(level.positions))return null;for(let i=0;i<history.length;i++){const board=history[i];if(!Array.isArray(board))return null;occupancy(level.vehicles,board);if(i){const previous=history[i-1];if(solved(previous))return null;const changed=board.map((n,j)=>n!==previous[j]?j:-1).filter(j=>j>=0);if(changed.length!==1)return null;slide(level.vehicles,previous,changed[0],board[changed[0]]);}}session={level:level.id,history};}
 return {version:1,records,session};}catch{return null;}
}
