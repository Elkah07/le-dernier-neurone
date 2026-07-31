"use client";

import { useEffect, useMemo, useState } from "react";

type Question = { q: string; choices: string[]; answer: number; category: string };
type Player = { id: string; name: string; color: string; ready: boolean; score: number; qualificationAnswered: number; qualificationMs: number; estimate: number | null; categoryScore: number; categoryAnswered: number; finalScore: number };
type Room = { code: string; phase: string; round: number; turnIndex: number; currentTheme: string | null; phaseStartedAt: string | null; usedThemes: string[]; selectedCases: number[]; activeCase: number | null; activePlayerId: string | null; qualifiedIds: string[]; finalistIds: string[]; players: Player[] };

const questions: Question[] = [
  ["Quelle planète est surnommée la planète rouge ?",["Vénus","Mars","Jupiter","Mercure"],1,"Sciences"],
  ["Qui a réalisé le film Titanic ?",["Steven Spielberg","James Cameron","Ridley Scott","Peter Jackson"],1,"Cinéma"],
  ["Dans quel jeu trouve-t-on le royaume d’Hyrule ?",["Final Fantasy","Minecraft","The Legend of Zelda","Pokémon"],2,"Gaming"],
  ["Quel ingrédient est à la base du guacamole ?",["Courgette","Avocat","Concombre","Poivron"],1,"Cuisine"],
  ["Qui chante « Poker Face » ?",["Katy Perry","Rihanna","Lady Gaga","Beyoncé"],2,"Musique"],
  ["Comment s’appelle le père de Simba ?",["Scar","Mufasa","Rafiki","Kovu"],1,"Disney"],
  ["Quel héros Marvel utilise un bouclier en vibranium ?",["Thor","Iron Man","Captain America","Hawkeye"],2,"Marvel"],
  ["En quelle année la France a-t-elle remporté sa première Coupe du monde ?",["1994","1998","2000","2002"],1,"Années 90"],
  ["Quel duo français a sorti « One More Time » ?",["Justice","Air","Daft Punk","Cassius"],2,"Années 2000"],
  ["Quelle ville est la capitale du Canada ?",["Toronto","Vancouver","Montréal","Ottawa"],3,"Géographie"],
  ["Quel métal porte le symbole chimique Au ?",["Argent","Aluminium","Or","Cuivre"],2,"Sciences"],
  ["Dans Stranger Things, comment se nomme la ville des héros ?",["Hawkins","Riverdale","Sunnydale","Hill Valley"],0,"Netflix"],
  ["Quel est le plus grand océan du monde ?",["Atlantique","Indien","Arctique","Pacifique"],3,"Géographie"],
  ["Quel studio a créé Mario ?",["Sega","Nintendo","Sony","Capcom"],1,"Gaming"],
  ["Combien de côtés possède un hexagone ?",["5","6","7","8"],1,"Logique"],
  ["Quel personnage vit dans un ananas sous la mer ?",["Patrick","Bob l’éponge","Nemo","Polochon"],1,"Télévision"],
  ["Quel pays a pour capitale Tokyo ?",["Chine","Corée du Sud","Japon","Thaïlande"],2,"Géographie"],
  ["Qui a peint La Nuit étoilée ?",["Monet","Van Gogh","Picasso","Dalí"],1,"Arts"],
  ["Quelle pâtisserie italienne contient du mascarpone ?",["Baklava","Tiramisu","Cheesecake","Flan"],1,"Cuisine"],
  ["Quelle entreprise possède Twitch ?",["Amazon","Apple","Microsoft","Meta"],0,"Web"],
].map(([q, choices, answer, category]) => ({ q, choices, answer, category })) as Question[];

const themeQuestions: Record<string, Question[]> = {
  "Cinéma": [["Quel acteur incarne Jack Sparrow ?",["Brad Pitt","Johnny Depp","Tom Cruise","Matt Damon"],1],["Dans quelle saga trouve-t-on la Terre du Milieu ?",["Harry Potter","Star Wars","Le Seigneur des anneaux","Narnia"],2],["Quel film met en scène un parc de dinosaures clonés ?",["King Kong","Jurassic Park","Godzilla","Jumanji"],1],["Qui joue Barbie dans le film de 2023 ?",["Emma Stone","Margot Robbie","Florence Pugh","Sydney Sweeney"],1]],
  Musique: [["Quel groupe chantait « Bohemian Rhapsody » ?",["ABBA","Queen","Muse","Oasis"],1],["Quel instrument possède généralement 88 touches ?",["Piano","Accordéon","Orgue","Xylophone"],0],["Qui interprète « Rolling in the Deep » ?",["Adele","Sia","Pink","Dua Lipa"],0],["Qui a sorti l’album Civilisation ?",["Nekfeu","Orelsan","Ninho","Jul"],1]],
  Gaming: [["Quelle créature jaune accompagne Sacha ?",["Kirby","Pikachu","Sonic","Yoshi"],1],["Dans Minecraft, quel monstre vert explose ?",["Zombie","Creeper","Enderman","Slime"],1],["Quel hérisson bleu est la mascotte de Sega ?",["Crash","Sonic","Spyro","Rayman"],1],["Dans Les Sims, quelle monnaie est utilisée ?",["Clochettes","Simflouz","Crédits","Rubis"],1]],
  Disney: [["Quelle princesse possède un caméléon nommé Pascal ?",["Vaiana","Raiponce","Ariel","Belle"],1],["Quel est le bonhomme de neige de La Reine des neiges ?",["Olaf","Sven","Kristoff","Hans"],0],["Dans Aladdin, quel animal est Abu ?",["Perroquet","Singe","Tigre","Éléphant"],1],["Quel jouet est un ranger de l’espace ?",["Woody","Buzz","Rex","Lotso"],1]],
  Cuisine: [["Quel fromage utilise-t-on dans une Margherita ?",["Cheddar","Mozzarella","Comté","Feta"],1],["De quel pays le sushi est-il originaire ?",["Chine","Japon","Corée","Thaïlande"],1],["Quelle légumineuse compose le houmous ?",["Lentille","Pois chiche","Haricot rouge","Fève"],1],["Quel dessert est caramélisé au chalumeau ?",["Crème brûlée","Panna cotta","Mousse","Île flottante"],0]],
  "Années 2000": [["Quel téléphone Motorola se repliait en clapet ?",["Razr","Lumia","Galaxy","BlackBerry"],0],["Quelle série suit Michael Scofield ?",["Lost","Prison Break","Heroes","Dexter"],1],["Quel réseau avait Tom pour ami par défaut ?",["Facebook","Skyblog","MySpace","Bebo"],2],["Quelle console Nintendo est sortie en Europe en 2006 ?",["GameCube","Wii","Switch","DS"],1]],
};
Object.entries(themeQuestions).forEach(([category, list]) => themeQuestions[category] = list.map(([q, choices, answer]) => ({ q, choices, answer, category })) as Question[]);

function Answers({ question, disabled, onAnswer }: { question: Question; disabled?: boolean; onAnswer: (i: number) => void }) {
  return <div className="answers">{question.choices.map((choice, i) => <button disabled={disabled} key={choice} onClick={() => onAnswer(i)}><span>{String.fromCharCode(65 + i)}</span>{choice}</button>)}</div>;
}

export default function MultiplayerGame({ initialRoom, playerId, onExit }: { initialRoom: Room; playerId: string; onExit: () => void }) {
  const [room, setRoom] = useState(initialRoom);
  const [seconds, setSeconds] = useState(10);
  const [estimate, setEstimate] = useState("");
  const [categoryQuestion, setCategoryQuestion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const me = room.players.find(player => player.id === playerId)!;
  const active = room.players.find(player => player.id === room.activePlayerId);
  const isActive = room.activePlayerId === playerId;
  const qualified = room.qualifiedIds.includes(playerId);
  const finalist = room.finalistIds.includes(playerId);
  const ranking = useMemo(() => [...room.players].sort((a,b) => b.score-a.score || a.qualificationMs-b.qualificationMs), [room.players]);

  async function refresh() {
    const response = await fetch(`/api/rooms?code=${room.code}`, { cache: "no-store" });
    if (response.ok) setRoom((await response.json() as { room: Room }).room);
  }
  async function action(actionName: string, payload: Record<string, unknown> = {}) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/rooms", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: actionName, code: room.code, playerId, ...payload }) });
      const data = await response.json() as { room?: Room; error?: string };
      if (!response.ok || !data.room) throw new Error(data.error || "Action impossible");
      setRoom(data.room);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Erreur réseau"); }
    finally { setBusy(false); }
  }

  useEffect(() => { const timer = window.setInterval(refresh, 1000); return () => window.clearInterval(timer); }, [room.code]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSeconds(room.phase === "category-playing" ? 90 : 10);
      if (room.phase === "category-playing") setCategoryQuestion(0);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [room.phase, room.turnIndex, room.currentTheme]);
  useEffect(() => {
    if (room.phase !== "qualification" || me?.qualificationAnswered >= 20) return;
    const timer = window.setTimeout(() => setSeconds(10), 0);
    return () => window.clearTimeout(timer);
  }, [room.phase, me?.qualificationAnswered]);
  useEffect(() => {
    if (!isActive && room.phase !== "qualification") return;
    if (!["qualification","category-playing","final-answer"].includes(room.phase)) return;
    if (seconds <= 0) {
      const timer = window.setTimeout(() => {
        if (room.phase === "qualification" && me.qualificationAnswered < 20) action("qualification-answer", { questionIndex: me.qualificationAnswered, answerIndex: -1, elapsedMs: 10000 });
        if (room.phase === "category-playing") action("end-category");
        if (room.phase === "final-answer") action("final-answer", { answerIndex: -1, elapsedMs: 10000 });
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setSeconds(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds, room.phase, room.turnIndex, me?.qualificationAnswered, isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!me) return <section className="panel"><h1>Session introuvable</h1><button className="primary" onClick={onExit}>RETOUR</button></section>;

  if (room.phase === "qualification") {
    const done = me.qualificationAnswered >= 20;
    const question = questions[Math.min(me.qualificationAnswered, 19)];
    return <section className="quiz"><div className="round"><span>QUALIFICATIONS · EN LIGNE</span><b>QUESTION {Math.min(me.qualificationAnswered + 1, 20)}/20</b></div>
      {!done && <div className="timer">{seconds}</div>}
      {done ? <div className="question"><small>RÉPONSES ENVOYÉES</small><h2>En attente des autres neurones…</h2><p>{me.score}/20 bonnes réponses</p></div>
        : <div className="question"><small>{question.category}</small><h2>{question.q}</h2><Answers disabled={busy} question={question} onAnswer={answerIndex => action("qualification-answer", { questionIndex: me.qualificationAnswered, answerIndex, elapsedMs: (10-seconds)*1000 })} /></div>}
      <div className="live"><b>{me.name}</b><span>{me.score} pts</span></div>{error && <div className="room-error">{error}</div>}</section>;
  }

  if (room.phase === "estimate") return <section className="panel"><p className="eyebrow">FIN DES QUALIFICATIONS</p><h1>{qualified ? "Tu es qualifié·e !" : "La partie continue"}</h1>
    <div className="ranking">{ranking.map((player,i) => <div className={player.id===playerId?"you":""} key={player.id}><b>{i+1}</b><span>{player.name}</span><strong>{player.score}/20</strong></div>)}</div>
    {qualified ? me.estimate !== null ? <p className="muted">Estimation envoyée. En attente des autres qualifiés…</p> : <><p className="estimate">Combien de kilomètres séparent en moyenne la Terre de la Lune ?</p><div className="input"><input value={estimate} onChange={event => setEstimate(event.target.value)} type="number" placeholder="Ta réponse"/><span>km</span></div><button className="primary" disabled={!estimate||busy} onClick={() => action("estimate", { estimate: Number(estimate) })}>VALIDER</button></> : <p className="muted">Tu peux suivre la suite en tant que spectateur·rice.</p>}{error&&<div className="room-error">{error}</div>}</section>;

  if (room.phase === "category-select") return <section className="wide center"><p className="eyebrow">ÉPREUVE DES CATÉGORIES · TOUR {room.round}/2</p><h1>{isActive ? "Choisis ton terrain" : `Au tour de ${active?.name || "…"}`}</h1><p className="muted">Chaque thème choisi disparaît pour tous les joueurs.</p>
    <div className="themes">{Object.keys(themeQuestions).map((theme,i)=><button disabled={!isActive||room.usedThemes.includes(theme)||busy} onClick={()=>action("choose-theme",{theme})} key={theme}><span>{["🎬","♫","🎮","✦","🍴","⌛"][i]}</span><b>{theme}</b><small>{room.usedThemes.includes(theme)?"DÉJÀ JOUÉ":isActive?"CHOISIR":"INDISPONIBLE"}</small></button>)}</div>{error&&<div className="room-error">{error}</div>}</section>;

  if (room.phase === "category-playing") {
    const list=themeQuestions[room.currentTheme || "Cinéma"]; const question=list[categoryQuestion%list.length];
    return <section className="quiz"><div className="round"><span>{room.currentTheme?.toUpperCase()}</span><b>TOUR {room.round}/2</b></div><div className="clock">{seconds}<small>SEC</small></div>
      {isActive ? <div className="question speed"><h2>{question.q}</h2><Answers disabled={busy} question={question} onAnswer={answerIndex=>{action("category-answer",{questionIndex:categoryQuestion,answerIndex,elapsedMs:0});setCategoryQuestion(value=>value+1);}}/><button className="pass" disabled={busy} onClick={()=>setCategoryQuestion(value=>value+1)}>PASSER ↗</button></div>
      : <div className="question"><small>EN DIRECT</small><h2>{active?.name} joue la catégorie {room.currentTheme}</h2><p>Son score se met à jour sur tous les téléphones.</p></div>}
      <div className="live"><b>{active?.name}</b><span>{active?.categoryScore || 0} bonnes réponses</span></div>{error&&<div className="room-error">{error}</div>}</section>;
  }

  if (room.phase === "final-intro") {
    const finalists=room.players.filter(player=>room.finalistIds.includes(player.id));
    return <section className="ceremony"><img src="/app-icon.png" alt=""/><p className="eyebrow gold">LA GRANDE FINALE</p><h1>{finalists[0]?.name} <em>VS</em> {finalists[1]?.name}</h1><p>Une seule grille, une case par tour, 10 secondes pour répondre.</p>{finalist?<button className="gold-button" disabled={busy} onClick={()=>action("start-final")}>JOUER POUR LE NEURONE D’OR</button>:<p>Tu assistes à la finale en direct.</p>}</section>;
  }

  if (["final-pick","final-answer"].includes(room.phase)) {
    const finalists=room.players.filter(player=>room.finalistIds.includes(player.id)); const q=questions[(19-room.turnIndex+40)%20];
    return <section className="wide center"><div className="scores"><div>{finalists[0]?.name} <b>{finalists[0]?.finalScore}</b></div><span>FINALE · {room.turnIndex}/12</span><div>{finalists[1]?.name} <b>{finalists[1]?.finalScore}</b></div></div>
      <div className={`turn-banner ${isActive?"your-turn":"ai-turn"}`}><span>{isActive?"À TON TOUR":`AU TOUR DE ${active?.name}`}</span><b>{room.phase==="final-pick"?"Choix d’une case disponible":"10 secondes pour répondre"}</b></div>
      {room.phase==="final-pick"?<div className="cases">{Array.from({length:16},(_,i)=><button disabled={!isActive||room.selectedCases.includes(i)||busy} className={`${i%4===0?"mystery":""} ${room.selectedCases.includes(i)?"taken":""}`} key={i} onClick={()=>action("choose-case",{caseIndex:i})}>{room.selectedCases.includes(i)?<><b>PRISE</b><small>INDISPONIBLE</small></>:i%4===0?"?":<><span>{["🎬","🌍","♫","🎮","🍴","✦"][i%6]}</span><small>{i%3===0?"2 PTS":"1 PT"}</small></>}</button>)}</div>
      :isActive?<div className="question final-question"><small>{room.activeCase!%4===0?"CASE MYSTÈRE · 3 POINTS":"QUESTION FINALE"}</small><div className="timer">{seconds}</div><h2>{q.q}</h2><Answers disabled={busy} question={q} onAnswer={answerIndex=>action("final-answer",{answerIndex,elapsedMs:(10-seconds)*1000})}/></div>
      :<div className="question final-question"><small>QUESTION EN COURS</small><h2>{active?.name} répond…</h2><p>La case choisie est désormais indisponible pour tout le monde.</p></div>}{error&&<div className="room-error">{error}</div>}</section>;
  }

  const finalRanking=[...room.players.filter(player=>room.finalistIds.includes(player.id))].sort((a,b)=>b.finalScore-a.finalScore);
  return <section className="ceremony"><div className="confetti">✦ · ✧ · ✦</div><img src="/app-icon.png" alt=""/><p className="eyebrow gold">VICTOIRE</p><h1>Le Neurone d’Or revient à {finalRanking[0]?.name} !</h1><p>{finalRanking.map(player=><span key={player.id}>{player.name} <b>{player.finalScore}</b> &nbsp;</span>)}</p><button className="gold-button" onClick={onExit}>RETOUR À L’ACCUEIL</button></section>;
}
