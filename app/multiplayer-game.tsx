"use client";

import { useEffect, useMemo, useState } from "react";
import { themeQuestions, type GameQuestion } from "./question-bank";
import { roomAction, roomFinalQuestion, roomQualificationQuestion, roomThemeQuestion, subscribeRoom, type Room } from "./firebase-room";

function Answers({ question, disabled, onAnswer }: { question: GameQuestion; disabled?: boolean; onAnswer: (i: number) => void }) {
  return <div className="answers">{question.choices.map((choice, i) => <button disabled={disabled} key={choice} onClick={() => onAnswer(i)}><span>{String.fromCharCode(65 + i)}</span>{choice}</button>)}</div>;
}

function OpenAnswer({ value, disabled, onChange, onSubmit }: { value:string; disabled?:boolean; onChange:(value:string)=>void; onSubmit:()=>void }) {
  return <div className="open-answer"><input autoComplete="off" value={value} disabled={disabled} placeholder="TA RÉPONSE" onChange={event=>onChange(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&value.trim())onSubmit()}}/><button className="primary" disabled={disabled||!value.trim()} onClick={onSubmit}>VALIDER</button></div>;
}

export default function MultiplayerGame({ initialRoom, playerId, onExit }: { initialRoom: Room; playerId: string; onExit: () => void }) {
  const [room, setRoom] = useState(initialRoom);
  const [seconds, setSeconds] = useState(10);
  const [estimate, setEstimate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [openAnswer, setOpenAnswer] = useState("");
  const me = room.players.find(player => player.id === playerId)!;
  const active = room.players.find(player => player.id === room.activePlayerId);
  const isActive = room.activePlayerId === playerId;
  const qualified = room.qualifiedIds.includes(playerId);
  const finalist = room.finalistIds.includes(playerId);
  const isAnimator = Boolean(room.animatorMode && me?.isAnimator);
  const ranking = useMemo(() => [...room.players].sort((a,b) => b.score-a.score || a.qualificationMs-b.qualificationMs), [room.players]);

  async function action(actionName: string, payload: Record<string, unknown> = {}) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const nextRoom = await roomAction(room.code, playerId, actionName, payload as Parameters<typeof roomAction>[3]);
      if (!nextRoom) { onExit(); return; }
      setRoom(nextRoom);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Erreur réseau"); }
    finally { setBusy(false); }
  }

  useEffect(() => { let unsubscribe=()=>{}; subscribeRoom(room.code, value=>{if(value)setRoom(value)}).then(stop=>{unsubscribe=stop}).catch(()=>setError("Connexion Firebase impossible")); return () => unsubscribe(); }, [room.code]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSeconds(room.phase === "category-playing" ? 90 : 10);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [room.phase, room.turnIndex, room.currentTheme]);
  useEffect(() => {
    if (room.phase !== "qualification" || me?.qualificationAnswered >= 20) return;
    const timer = window.setTimeout(() => setSeconds(10), 0);
    return () => window.clearTimeout(timer);
  }, [room.phase, me?.qualificationAnswered]);
  useEffect(() => {
    if (room.phase !== "estimate" || me?.estimate === null || me?.estimate === undefined || busy) return;
    const timer = window.setTimeout(() => action("sync-estimate"), 1200);
    return () => window.clearTimeout(timer);
  }, [room.phase, room.estimateSubmissions, me?.estimate, busy]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isAnimator) return;
    if (!isActive && room.phase !== "qualification") return;
    if (!["qualification","category-playing","final-answer"].includes(room.phase)) return;
    if (seconds <= 0) {
      const timer = window.setTimeout(() => {
        if (busy) return;
        if (room.phase === "qualification" && me.qualificationAnswered < 20) action("qualification-answer", { questionIndex: me.qualificationAnswered, answerIndex: -1, elapsedMs: 10000 });
        if (room.phase === "category-playing") action("end-category");
        if (room.phase === "final-answer") action("final-answer", { answerIndex: -1, elapsedMs: 10000 });
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setSeconds(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds, room.phase, room.turnIndex, me?.qualificationAnswered, isActive, isAnimator, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!me) return <section className="panel"><h1>Session introuvable</h1><button className="primary" onClick={onExit}>RETOUR</button></section>;

  if (room.phase === "qualification") {
    if(isAnimator) {
      const localCandidate=room.players.find(candidate=>candidate.isLocal&&candidate.qualificationAnswered<20);
      if(room.deviceMode==="multiple") return <section className="panel host-console"><p className="eyebrow">CONSOLE ANIMATEUR · QUALIFICATIONS</p><h1>Les candidats répondent</h1><div className="ranking">{room.players.filter(candidate=>!candidate.isAnimator).map(candidate=><div key={candidate.id}><span>{candidate.name}</span><strong>{candidate.qualificationAnswered}/20</strong></div>)}</div><p className="muted">La manche suivante démarre dès que toutes les réponses sont reçues.</p>{error&&<div className="room-error">{error}</div>}</section>;
      if(!localCandidate) return <section className="panel"><h1>Qualifications terminées</h1><p>Calcul du classement…</p></section>;
      const localQuestion=roomQualificationQuestion(room,localCandidate.qualificationAnswered);
      return <section className="quiz"><div className="round"><span>ANIMATEUR · {localCandidate.name}</span><b>QUESTION {localCandidate.qualificationAnswered+1}/20</b></div><div className="question"><small>{localQuestion.category}</small><h2>{localQuestion.q}</h2><Answers disabled={busy} question={localQuestion} onAnswer={answerIndex=>action("qualification-answer",{targetPlayerId:localCandidate.id,questionIndex:localCandidate.qualificationAnswered,answerIndex,elapsedMs:0})}/></div><div className="live"><b>{localCandidate.name}</b><span>{localCandidate.score} pts</span></div></section>;
    }
    const done = me.qualificationAnswered >= 20;
    const question = roomQualificationQuestion(room, Math.min(me.qualificationAnswered, 19));
    return <section className="quiz"><div className="round"><span>QUALIFICATIONS · EN LIGNE</span><b>QUESTION {Math.min(me.qualificationAnswered + 1, 20)}/20</b></div>
      {!done && <div className="timer">{seconds}</div>}
      {done ? <div className="question"><small>RÉPONSES ENVOYÉES</small><h2>En attente des autres neurones…</h2><p>{me.score}/20 bonnes réponses</p></div>
        : <div className="question"><small>{question.category}</small><h2>{question.q}</h2><Answers disabled={busy} question={question} onAnswer={answerIndex => action("qualification-answer", { questionIndex: me.qualificationAnswered, answerIndex, elapsedMs: (10-seconds)*1000 })} /></div>}
      <div className="live"><b>{me.name}</b><span>{me.score} pts</span></div>{error && <div className="room-error">{error}</div>}</section>;
  }

  if (room.phase === "estimate") {
    if(isAnimator&&room.deviceMode==="single") { const waiting=room.players.find(candidate=>candidate.isLocal&&room.qualifiedIds.includes(candidate.id)&&candidate.estimate===null); return <section className="panel"><p className="eyebrow">ESTIMATION · ANIMATEUR</p><h1>{waiting?`Réponse de ${waiting.name}`:"Estimations envoyées"}</h1>{waiting&&<><p className="estimate">Combien de kilomètres séparent en moyenne la Terre de la Lune ?</p><div className="input"><input value={estimate} onChange={event=>setEstimate(event.target.value)} type="number" placeholder="Réponse"/><span>km</span></div><button className="primary" disabled={!estimate||busy} onClick={()=>{action("estimate",{targetPlayerId:waiting.id,estimate:Number(estimate)});setEstimate("")}}>VALIDER</button></>}</section> }
    return <section className="panel"><p className="eyebrow">FIN DES QUALIFICATIONS</p><h1>{isAnimator?"Classement des qualifications":qualified ? "Tu es qualifié·e !" : "La partie continue"}</h1>
    <div className="ranking">{ranking.map((player,i) => <div className={player.id===playerId?"you":""} key={player.id}><b>{i+1}</b><span>{player.name}</span><strong>{player.score}/20</strong></div>)}</div>
    {!isAnimator&&(qualified ? me.estimate !== null ? <p className="muted">Estimation envoyée. En attente des autres qualifiés…</p> : <><p className="estimate">Combien de kilomètres séparent en moyenne la Terre de la Lune ?</p><div className="input"><input value={estimate} onChange={event => setEstimate(event.target.value)} type="number" placeholder="Ta réponse"/><span>km</span></div><button className="primary" disabled={!estimate||busy} onClick={() => action("estimate", { estimate: Number(estimate) })}>VALIDER</button></> : <p className="muted">Tu peux suivre la suite en tant que spectateur·rice.</p>)}{isAnimator&&<p className="muted">En attente des estimations des candidats qualifiés…</p>}{error&&<div className="room-error">{error}</div>}</section>;
  }

  if (room.phase === "category-select") { const canChoose=isAnimator||isActive; return <section className="wide center"><p className="eyebrow">ÉPREUVE DES CATÉGORIES · TOUR {room.round}/2</p><h1>{canChoose ? `${isAnimator?`Choix pour ${active?.name}`:"Choisis ton terrain"}` : `Au tour de ${active?.name || "…"}`}</h1><p className="muted">Chaque thème choisi disparaît pour tous les joueurs.</p>
    <div className="themes">{Object.keys(themeQuestions).map((theme,i)=><button disabled={!canChoose||room.usedThemes.includes(theme)||busy} onClick={()=>action("choose-theme",{theme})} key={theme}><span>{["🎬","♫","🎮","✦","◆","⌛","★","▶","▣","🍴"][i]}</span><b>{theme}</b><small>{room.usedThemes.includes(theme)?"DÉJÀ JOUÉ":canChoose?"CHOISIR":"INDISPONIBLE"}</small></button>)}</div>{error&&<div className="room-error">{error}</div>}</section>; }

  if (room.phase === "category-playing") {
    const selectedTheme=room.currentTheme || "Cinéma"; const list=themeQuestions[selectedTheme]; const exhausted=room.currentQuestionIndex>=list.length; const question=roomThemeQuestion(room,selectedTheme,Math.min(room.currentQuestionIndex,list.length-1))!;
    return <section className="quiz"><div className="round"><span>{room.currentTheme?.toUpperCase()}</span><b>TOUR {room.round}/2</b></div><div className="clock">{seconds}<small>SEC</small></div>
      {isAnimator ? <div className="question speed host-console"><small>QUESTION OUVERTE POUR {active?.name}</small><h2>{question.q}</h2><div className="expected-answer">RÉPONSE : <b>{question.choices[question.answer]}</b></div>{room.pendingAnswer?<><p>Réponse donnée : <b>{room.pendingAnswer.text||"(aucune réponse)"}</b></p><div className="verdicts"><button onClick={()=>action("answer-verdict",{correct:true})}>✓ BONNE RÉPONSE</button><button onClick={()=>action("answer-verdict",{correct:false})}>✕ MAUVAISE</button></div></>:room.deviceMode==="single"?<OpenAnswer value={openAnswer} disabled={busy} onChange={setOpenAnswer} onSubmit={()=>{action("category-answer",{targetPlayerId:active?.id,questionIndex:room.currentQuestionIndex,answerText:openAnswer});setOpenAnswer("")}}/>:<p className="muted">En attente de la réponse du candidat…</p>}<button className="pass" disabled={busy||Boolean(room.pendingAnswer)} onClick={()=>action("category-pass")}>PASSER ↗</button><button className="secondary" disabled={busy||Boolean(room.pendingAnswer)} onClick={()=>action("end-category")}>TERMINER LE TOUR</button></div>
      : isActive ? exhausted ? <div className="question"><small>THÈME TERMINÉ</small><h2>Toutes les questions ont été jouées.</h2><button className="primary" disabled={busy} onClick={()=>action("end-category")}>TERMINER LE TOUR</button></div> : <div className="question speed"><small>RÉPONSE OUVERTE</small><h2>{question.q}</h2>{room.pendingAnswer?<p>Réponse envoyée. L’animateur décide…</p>:<OpenAnswer value={openAnswer} disabled={busy} onChange={setOpenAnswer} onSubmit={()=>{action("category-answer",{questionIndex:room.currentQuestionIndex,answerText:openAnswer});setOpenAnswer("")}}/>}{!room.animatorMode&&<button className="pass" disabled={busy} onClick={()=>action("category-pass")}>PASSER ↗</button>}</div>
      : <div className="question"><small>EN DIRECT</small><h2>{active?.name} joue la catégorie {room.currentTheme}</h2><p>Son score se met à jour sur tous les téléphones.</p></div>}
      <div className="live"><b>{active?.name}</b><span>{active?.categoryScore || 0} bonnes réponses</span></div>{error&&<div className="room-error">{error}</div>}</section>;
  }

  if (room.phase === "final-intro") {
    const finalists=room.players.filter(player=>room.finalistIds.includes(player.id));
    return <section className="ceremony"><img src="/app-icon.png" alt=""/><p className="eyebrow gold">LA GRANDE FINALE</p><h1>{finalists[0]?.name} <em>VS</em> {finalists[1]?.name}</h1><p>Une seule grille, une case par tour, 10 secondes pour répondre.</p>{(finalist&&!room.animatorMode)||isAnimator?<button className="gold-button" disabled={busy} onClick={()=>action("start-final")}>JOUER POUR LE NEURONE D’OR</button>:<p>Tu assistes à la finale en direct.</p>}</section>;
  }

  if (["final-pick","final-answer"].includes(room.phase)) {
    const finalists=room.players.filter(player=>room.finalistIds.includes(player.id)); const q=roomFinalQuestion(room, room.turnIndex%12);
    return <section className="wide center"><div className="scores"><div>{finalists[0]?.name} <b>{finalists[0]?.finalScore}</b></div><span>FINALE · {room.turnIndex}/12</span><div>{finalists[1]?.name} <b>{finalists[1]?.finalScore}</b></div></div>
      <div className={`turn-banner ${isActive||isAnimator?"your-turn":"ai-turn"}`}><span>{isAnimator?`ANIMATEUR · ${active?.name}`:isActive?"À TON TOUR":`AU TOUR DE ${active?.name}`}</span><b>{room.phase==="final-pick"?"Choix d’une case disponible":"10 secondes pour répondre"}</b></div>
      {room.phase==="final-pick"?<div className="cases">{Array.from({length:16},(_,i)=><button disabled={(!isActive&&!isAnimator)||room.selectedCases.includes(i)||busy} className={`${i%4===0?"mystery":""} ${room.selectedCases.includes(i)?"taken":""}`} key={i} onClick={()=>action("choose-case",{caseIndex:i})}>{room.selectedCases.includes(i)?<><b>PRISE</b><small>INDISPONIBLE</small></>:i%4===0?"?":<><span>{["🎬","🌍","♫","🎮","🍴","✦"][i%6]}</span><small>{i%3===0?"2 PTS":"1 PT"}</small></>}</button>)}</div>
      :isAnimator?<div className="question final-question host-console"><small>{room.activeCase!%4===0?"CASE MYSTÈRE · 3 POINTS":"QUESTION FINALE"}</small><h2>{q.q}</h2><div className="expected-answer">RÉPONSE : <b>{q.choices[q.answer]}</b></div>{room.pendingAnswer?<><p>Réponse donnée : <b>{room.pendingAnswer.text||"(aucune réponse)"}</b></p><div className="verdicts"><button onClick={()=>action("answer-verdict",{correct:true})}>✓ BONNE RÉPONSE</button><button onClick={()=>action("answer-verdict",{correct:false})}>✕ MAUVAISE</button></div></>:room.deviceMode==="single"?<OpenAnswer value={openAnswer} disabled={busy} onChange={setOpenAnswer} onSubmit={()=>{action("final-answer",{targetPlayerId:active?.id,answerText:openAnswer});setOpenAnswer("")}}/>:<p>En attente de la réponse de {active?.name}…</p>}</div>
      :isActive?<div className="question final-question"><small>{room.activeCase!%4===0?"CASE MYSTÈRE · 3 POINTS":"QUESTION FINALE"}</small><div className="timer">{seconds}</div><h2>{q.q}</h2>{room.pendingAnswer?<p>Réponse envoyée. L’animateur décide…</p>:<OpenAnswer value={openAnswer} disabled={busy} onChange={setOpenAnswer} onSubmit={()=>{action("final-answer",{answerText:openAnswer});setOpenAnswer("")}}/>}</div>
      :<div className="question final-question"><small>QUESTION EN COURS</small><h2>{active?.name} répond…</h2><p>La case choisie est désormais indisponible pour tout le monde.</p></div>}{error&&<div className="room-error">{error}</div>}</section>;
  }

  const finalRanking=[...room.players.filter(player=>room.finalistIds.includes(player.id))].sort((a,b)=>b.finalScore-a.finalScore);
  return <section className="ceremony"><div className="confetti">✦ · ✧ · ✦</div><img src="/app-icon.png" alt=""/><p className="eyebrow gold">VICTOIRE</p><h1>Le Neurone d’Or revient à {finalRanking[0]?.name} !</h1><p>{finalRanking.map(player=><span key={player.id}>{player.name} <b>{player.finalScore}</b> &nbsp;</span>)}</p><button className="gold-button" onClick={onExit}>RETOUR À L’ACCUEIL</button></section>;
}
