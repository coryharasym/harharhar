export const LEADERBOARD_LIMIT=10;
export const LEADERBOARD_SQL = `SELECT s.id,s.player_id AS playerId,s.name,s.icon,s.game,s.score,s.tile,s.lines,s.moves,s.created FROM scores s WHERE s.game=? AND s.created>=? ORDER BY s.score DESC,s.moves ASC,s.created ASC,s.id ASC LIMIT ${LEADERBOARD_LIMIT}`;

export type RankedScore={id:string;playerId:string|null;name:string;score:number;moves:number;created:number};
export function compareScores(a:RankedScore,b:RankedScore){return b.score-a.score||a.moves-b.moves||a.created-b.created||(a.id<b.id?-1:a.id>b.id?1:0);}
export function candidateRank(rows:RankedScore[],candidate:RankedScore){return 1+rows.filter(r=>r.id!==candidate.id&&compareScores(r,candidate)<0).length;}
