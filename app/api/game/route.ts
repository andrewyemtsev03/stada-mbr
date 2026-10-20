import { env } from "cloudflare:workers";
import { questions } from "../../../lib/questions";
export const dynamic = "force-dynamic";
const json = (body: unknown, status=200) => Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
const fail = (message:string, status=400) => json({error:message},status);
const token = () => crypto.randomUUID()+crypto.randomUUID();
const hash = async (value:string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,"0")).join("");
async function roomFor(code:string) {
  const db=env.DB!;
  await db.prepare("UPDATE rooms SET phase='reveal' WHERE code=? AND phase='question' AND deadline<=?").bind(code,Date.now()).run();
  return db.prepare("SELECT * FROM rooms WHERE code=? AND created>?").bind(code,Date.now()-86400000).first<any>();
}
export async function GET(request:Request) {
  try {
    const url=new URL(request.url), code=(url.searchParams.get("code")||"").toUpperCase();
    const r=await roomFor(code); if(!r)return fail("Room not found or expired. Ask your host for a new code.",404);
    const auth=request.headers.get("Authorization")?.replace("Bearer ","")||"";
    const isHost=await hash(auth)===r.host;
    const me=auth?await env.DB!.prepare("SELECT token,name FROM players WHERE token=? AND room=?").bind(auth,code).first<any>():null;
    if(!me&&!isHost) return json({code,phase:r.phase,joinable:r.phase==="lobby"});
    const rows=await env.DB!.prepare("SELECT p.token,p.name,p.joined,COALESCE(SUM(a.points),0) AS score FROM players p LEFT JOIN answers a ON a.player=p.token AND (a.round<? OR ?!='question') WHERE p.room=? GROUP BY p.token ORDER BY score DESC,p.joined ASC").bind(r.round,r.phase,code).all<any>();
    const count=await env.DB!.prepare("SELECT COUNT(*) AS n FROM answers WHERE room=? AND round=?").bind(code,r.round).first<any>();
    const mine=me?await env.DB!.prepare("SELECT choice,points FROM answers WHERE player=? AND round=?").bind(auth,r.round).first<any>():null;
    const q=questions[r.round], revealed=r.phase==="reveal"||r.phase==="finished";
    return json({code,phase:r.phase,round:r.round,deadline:r.deadline,serverNow:Date.now(),isHost,name:me?.name,me:me?.token,
      players:rows.results.map((p:any,i:number,all:any[])=>({id:p.token===auth?"me":String(p.joined)+"-"+i,name:p.name,score:p.score,rank:all.findIndex(x=>x.score===p.score)+1})),
      answered:count?.n||0,mine:mine?{choice:mine.choice,...(revealed?{points:mine.points}:{})}:null,
      question:r.phase==="lobby"?null:{text:q.text,category:q.category,options:q.options,...(revealed?{correct:q.correct,explanation:q.explanation}:{})}});
  } catch { return fail("The room is temporarily unavailable. Please try again.",503); }
}
export async function POST(request:Request) {
  try {
    const b=await request.json() as any, db=env.DB!;
    if(b.action==="create"){
      const host=token(), hostHash=await hash(host);
      for(let attempt=0;attempt<5;attempt++){
        const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const code=Array.from(crypto.getRandomValues(new Uint8Array(6)),x=>chars[x%chars.length]).join("");
        const result=await db.prepare("INSERT OR IGNORE INTO rooms(code,host,created) VALUES(?,?,?)").bind(code,hostHash,Date.now()).run();
        if(result.meta.changes) return json({code,token:host,role:"host"});
      } return fail("Please try creating a room again.",503);
    }
    const code=String(b.code||"").toUpperCase(); const r=await roomFor(code);
    if(!r)return fail("Room not found or expired. Check the six-character code.",404);
    if(b.action==="join"){
      const name=String(b.name||"").trim().replace(/[\u0000-\u001f]/g,"").slice(0,24);
      if(!name)return fail("Enter your name to join.");
      if(r.phase!=="lobby")return fail("This game has already started. Join the next game.");
      const player=token();
      const result=await db.prepare("INSERT INTO players(token,room,name,joined) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM rooms WHERE code=? AND phase='lobby') AND (SELECT COUNT(*) FROM players WHERE room=?)<200").bind(player,code,name,Date.now(),code,code).run();
      if(!result.meta.changes)return fail("The room is full or the game has just started.");
      return json({code,token:player,role:"player"});
    }
    const auth=request.headers.get("Authorization")?.replace("Bearer ","")||"";
    if(b.action==="answer"){
      if(!Number.isInteger(b.choice)||b.choice<0||b.choice>3||b.round!==r.round)return fail("That answer is no longer available.");
      const points=b.choice===questions[r.round].correct?1000:0;
      const result=await db.prepare("INSERT OR IGNORE INTO answers(player,room,round,choice,points) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM players WHERE token=? AND room=?) AND EXISTS(SELECT 1 FROM rooms WHERE code=? AND phase='question' AND round=? AND deadline>?)").bind(auth,code,r.round,b.choice,points,auth,code,code,r.round,Date.now()).run();
      if(!result.meta.changes)return fail("Answer already recorded or the round has ended.");
      return json({ok:true});
    }
    if(await hash(auth)!==r.host)return fail("Only the host can control this game.",403);
    if(b.action==="start"&&r.phase==="lobby"){
      const n=await db.prepare("SELECT COUNT(*) AS n FROM players WHERE room=?").bind(code).first<any>();
      if(!n?.n)return fail("Wait for at least one player to join.");
      await db.prepare("UPDATE rooms SET phase='question',deadline=? WHERE code=? AND phase='lobby'").bind(Date.now()+30000,code).run();
    } else if(b.action==="reveal"&&b.round===r.round&&r.phase==="question"){
      await db.prepare("UPDATE rooms SET phase='reveal' WHERE code=? AND round=? AND phase='question'").bind(code,r.round).run();
    } else if(b.action==="next"&&b.round===r.round&&r.phase==="reveal"){
      if(r.round===9)await db.prepare("UPDATE rooms SET phase='finished' WHERE code=? AND phase='reveal' AND round=9").bind(code).run();
      else await db.prepare("UPDATE rooms SET phase='question',round=round+1,deadline=? WHERE code=? AND phase='reveal' AND round=?").bind(Date.now()+30000,code,r.round).run();
    } else return fail("The room has moved on. Please try again.");
    return json({ok:true});
  } catch {return fail("Something went wrong. Please try again.",503);}
}
