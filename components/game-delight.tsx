"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Check, Trophy, Sparkles } from "lucide-react";

export function AnimatedScore({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setDisplay(value); return; }
    let frame: number;
    const start = performance.now();
    function tick(time: number) {
      const progress = Math.min(1, (time - start) / 850);
      setDisplay(Math.round(from + (value - from) * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span aria-label={`${value.toLocaleString()} points`}>{display.toLocaleString()}</span>;
}

export function Leaderboard({ players, phase }: { players: any[]; phase: string }) {
  const board = useRef<HTMLDivElement>(null);
  const positions = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const next = new Map<string, number>();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    board.current?.querySelectorAll<HTMLElement>("[data-player]").forEach(row => {
      const id = row.dataset.player!;
      const top = row.offsetTop;
      next.set(id, top);
      const old = positions.current.get(id);
      if (!reduced && old !== undefined && old !== top) {
        row.animate([{ transform: `translateY(${old - top}px)` }, { transform: "translateY(0)" }], { duration: 700, easing: "cubic-bezier(.22,1,.36,1)" });
      }
    });
    positions.current = next;
  }, [players]);
  return <div className="board" ref={board}>{players.map((p, i) =>
    <div className={`player-row ${p.rank === 1 && phase !== "lobby" ? "leader" : ""} ${p.isMe ? "is-me" : ""}`} key={p.id} data-player={p.id} style={{ "--row": Math.min(i, 8) } as CSSProperties}>
      <span className="rank">{phase === "lobby" ? <Check size={16}/> : p.rank === 1 ? <Trophy size={19}/> : String(p.rank).padStart(2, "0")}</span>
      <span className={`avatar avatar-${i % 4}`}>{p.name.slice(0, 1).toUpperCase()}</span>
      <strong>{p.name}{p.isMe && <small> YOU</small>}</strong>
      <span className="score">{phase === "lobby" ? <span className="ready">Ready</span> : <><AnimatedScore value={p.score}/> <small>pts</small></>}</span>
    </div>
  )}</div>;
}

export function Countdown({ seconds, round }: { seconds: number; round: number }) {
  return <div className="countdown-stage" role="status" aria-live="polite">
    <div className="countdown-orbit orbit-a"/><div className="countdown-orbit orbit-b"/>
    <span className="eyebrow">ROUND {String(round + 1).padStart(2, "0")} · GET READY</span>
    <div className="countdown-number" key={seconds}>{seconds || "Go!"}</div>
    <h1>A little focus.<br/>A lot of possibility.</h1>
    <p>One question. Four choices. You’ve got this.</p>
  </div>;
}

export function Confetti() {
  return <div className="confetti" aria-hidden="true">{Array.from({ length: 42 }, (_, i) =>
    <i key={i} style={{ "--x": `${(i * 37) % 100}%`, "--delay": `${(i % 9) * .13}s`, "--duration": `${3 + (i % 5) * .35}s`, "--drift": `${(i % 2 ? 1 : -1) * (30 + i % 80)}px`, "--color": ["#005db9", "#d50058", "#8dc4ef", "#efb4cb"][i % 4] } as CSSProperties}/>
  )}</div>;
}

export function Podium({ players }: { players: any[] }) {
  const top = players.slice(0, 3);
  const ordered = top.length > 1 ? [top[1], top[0], ...top.slice(2)] : top;
  return <div className="podium" aria-label="Top scoring players">{ordered.map(p =>
    <div key={p.id} className={`podium-place place-${Math.min(p.rank, 3)}`}>
      <div className="podium-avatar">{p.rank === 1 && <Sparkles size={23}/>}<span>{p.name.slice(0, 1).toUpperCase()}</span></div>
      <strong>{p.name}</strong><small>{p.score.toLocaleString()} points</small>
      <div className="podium-block"><span>{p.rank === 1 ? <Trophy size={29}/> : p.rank}</span><small>{p.rank === 1 ? "TOP SCORE" : `PLACE ${p.rank}`}</small></div>
    </div>
  )}</div>;
}

