"use client";

import { useEffect, useState } from "react";
import MultiplayerGame from "./multiplayer-game";
import { allQuestions, qualificationQuestions, themeQuestions, type GameQuestion } from "./question-bank";
import { createRoom, joinRoom, roomAction as updateRoom, subscribeRoom, type Room as RoomData } from "./firebase-room";

type Screen = "home" | "setup" | "multi" | "createRoom" | "joinRoom" | "lobby" | "multiGame" | "qualify" | "qualified" | "estimate" | "categories" | "speed" | "roundResult" | "finalIntro" | "final" | "victory" | "creator" | "questionAudit";
type Question = GameQuestion;
type QuestionReport = { questionId: string; reason: string; correction: string; createdAt: string };

const questions = qualificationQuestions;
const themes = themeQuestions;

/* Ancienne mini-base conservée dans l'historique Git ; la base active est désormais centralisée.
const legacyQuestions: Question[] = [
  { q: "Quelle planète est surnommée la planète rouge ?", choices: ["Vénus", "Mars", "Jupiter", "Mercure"], answer: 1, category: "Sciences" },
  { q: "Qui a réalisé le film Titanic ?", choices: ["Steven Spielberg", "James Cameron", "Ridley Scott", "Peter Jackson"], answer: 1, category: "Cinéma" },
  { q: "Dans quel jeu trouve-t-on le royaume d’Hyrule ?", choices: ["Final Fantasy", "Minecraft", "The Legend of Zelda", "Pokémon"], answer: 2, category: "Gaming" },
  { q: "Quel ingrédient est à la base du guacamole ?", choices: ["Courgette", "Avocat", "Concombre", "Poivron"], answer: 1, category: "Cuisine" },
  { q: "Qui chante « Poker Face » ?", choices: ["Katy Perry", "Rihanna", "Lady Gaga", "Beyoncé"], answer: 2, category: "Musique" },
  { q: "Comment s’appelle le père de Simba ?", choices: ["Scar", "Mufasa", "Rafiki", "Kovu"], answer: 1, category: "Disney" },
  { q: "Quel héros Marvel utilise un bouclier en vibranium ?", choices: ["Thor", "Iron Man", "Captain America", "Hawkeye"], answer: 2, category: "Marvel" },
  { q: "En quelle année la France a-t-elle remporté sa première Coupe du monde ?", choices: ["1994", "1998", "2000", "2002"], answer: 1, category: "Années 90" },
  { q: "Quel duo français a sorti « One More Time » ?", choices: ["Justice", "Air", "Daft Punk", "Cassius"], answer: 2, category: "Années 2000" },
  { q: "Quelle ville est la capitale du Canada ?", choices: ["Toronto", "Vancouver", "Montréal", "Ottawa"], answer: 3, category: "Géographie" },
  { q: "Quel métal porte le symbole chimique Au ?", choices: ["Argent", "Aluminium", "Or", "Cuivre"], answer: 2, category: "Sciences" },
  { q: "Dans Stranger Things, comment se nomme la ville des héros ?", choices: ["Hawkins", "Riverdale", "Sunnydale", "Hill Valley"], answer: 0, category: "Netflix" },
  { q: "Quel est le plus grand océan du monde ?", choices: ["Atlantique", "Indien", "Arctique", "Pacifique"], answer: 3, category: "Géographie" },
  { q: "Quel studio a créé Mario ?", choices: ["Sega", "Nintendo", "Sony", "Capcom"], answer: 1, category: "Gaming" },
  { q: "Combien de côtés possède un hexagone ?", choices: ["5", "6", "7", "8"], answer: 1, category: "Logique" },
  { q: "Quel personnage vit dans un ananas sous la mer ?", choices: ["Patrick", "Bob l’éponge", "Nemo", "Polochon"], answer: 1, category: "Télévision" },
  { q: "Quel pays a pour capitale Tokyo ?", choices: ["Chine", "Corée du Sud", "Japon", "Thaïlande"], answer: 2, category: "Géographie" },
  { q: "Qui a peint La Nuit étoilée ?", choices: ["Monet", "Van Gogh", "Picasso", "Dalí"], answer: 1, category: "Arts" },
  { q: "Quelle pâtisserie italienne contient du mascarpone ?", choices: ["Baklava", "Tiramisu", "Cheesecake", "Flan"], answer: 1, category: "Cuisine" },
  { q: "Quelle entreprise possède Twitch ?", choices: ["Amazon", "Apple", "Microsoft", "Meta"], answer: 0, category: "Web" },
];

const legacyThemes: Record<string, Question[]> = {
  Cinéma: [
    { q: "Quel acteur incarne Jack Sparrow ?", choices: ["Brad Pitt", "Johnny Depp", "Tom Cruise", "Matt Damon"], answer: 1, category: "Cinéma" },
    { q: "Dans quelle saga trouve-t-on la Terre du Milieu ?", choices: ["Harry Potter", "Star Wars", "Le Seigneur des anneaux", "Narnia"], answer: 2, category: "Cinéma" },
    { q: "Quel film met en scène un parc de dinosaures clonés ?", choices: ["King Kong", "Jurassic Park", "Godzilla", "Jumanji"], answer: 1, category: "Cinéma" },
    { q: "Qui joue Barbie dans le film de 2023 ?", choices: ["Emma Stone", "Margot Robbie", "Florence Pugh", "Sydney Sweeney"], answer: 1, category: "Cinéma" },
  ],
  Musique: [
    { q: "Quel groupe chantait « Bohemian Rhapsody » ?", choices: ["ABBA", "Queen", "Muse", "Oasis"], answer: 1, category: "Musique" },
    { q: "Quel instrument possède généralement 88 touches ?", choices: ["Piano", "Accordéon", "Orgue", "Xylophone"], answer: 0, category: "Musique" },
    { q: "Qui interprète « Rolling in the Deep » ?", choices: ["Adele", "Sia", "Pink", "Dua Lipa"], answer: 0, category: "Musique" },
    { q: "Qui a sorti l’album Civilisation ?", choices: ["Nekfeu", "Orelsan", "Ninho", "Jul"], answer: 1, category: "Musique" },
  ],
  Gaming: [
    { q: "Quelle créature jaune accompagne Sacha ?", choices: ["Kirby", "Pikachu", "Sonic", "Yoshi"], answer: 1, category: "Gaming" },
    { q: "Dans Minecraft, quel monstre vert explose ?", choices: ["Zombie", "Creeper", "Enderman", "Slime"], answer: 1, category: "Gaming" },
    { q: "Quel hérisson bleu est la mascotte de Sega ?", choices: ["Crash", "Sonic", "Spyro", "Rayman"], answer: 1, category: "Gaming" },
    { q: "Dans Les Sims, quelle monnaie est utilisée ?", choices: ["Clochettes", "Simflouz", "Crédits", "Rubis"], answer: 1, category: "Gaming" },
  ],
  Disney: [
    { q: "Quelle princesse possède un caméléon nommé Pascal ?", choices: ["Vaiana", "Raiponce", "Ariel", "Belle"], answer: 1, category: "Disney" },
    { q: "Quel est le bonhomme de neige de La Reine des neiges ?", choices: ["Olaf", "Sven", "Kristoff", "Hans"], answer: 0, category: "Disney" },
    { q: "Dans Aladdin, quel animal est Abu ?", choices: ["Perroquet", "Singe", "Tigre", "Éléphant"], answer: 1, category: "Disney" },
    { q: "Quel jouet est un ranger de l’espace ?", choices: ["Woody", "Buzz", "Rex", "Lotso"], answer: 1, category: "Disney" },
  ],
  Cuisine: [
    { q: "Quel fromage utilise-t-on dans une Margherita ?", choices: ["Cheddar", "Mozzarella", "Comté", "Feta"], answer: 1, category: "Cuisine" },
    { q: "De quel pays le sushi est-il originaire ?", choices: ["Chine", "Japon", "Corée", "Thaïlande"], answer: 1, category: "Cuisine" },
    { q: "Quelle légumineuse compose le houmous ?", choices: ["Lentille", "Pois chiche", "Haricot rouge", "Fève"], answer: 1, category: "Cuisine" },
    { q: "Quel dessert est caramélisé au chalumeau ?", choices: ["Crème brûlée", "Panna cotta", "Mousse", "Île flottante"], answer: 0, category: "Cuisine" },
  ],
  "Années 2000": [
    { q: "Quel téléphone Motorola se repliait en clapet ?", choices: ["Razr", "Lumia", "Galaxy", "BlackBerry"], answer: 0, category: "Années 2000" },
    { q: "Quelle série suit Michael Scofield ?", choices: ["Lost", "Prison Break", "Heroes", "Dexter"], answer: 1, category: "Années 2000" },
    { q: "Quel réseau avait Tom pour ami par défaut ?", choices: ["Facebook", "Skyblog", "MySpace", "Bebo"], answer: 2, category: "Années 2000" },
    { q: "Quelle console Nintendo est sortie en Europe en 2006 ?", choices: ["GameCube", "Wii", "Switch", "DS"], answer: 1, category: "Années 2000" },
  ],
};
*/

function Answers({ question, onAnswer }: { question: Question; onAnswer: (i: number) => void }) {
  return <div className="answers">{question.choices.map((choice, i) =>
    <button key={choice} onClick={() => onAnswer(i)}><span>{String.fromCharCode(65 + i)}</span>{choice}</button>
  )}</div>;
}

export default function Game() {
  const [screen, setScreen] = useState<Screen>("home");
  const [name, setName] = useState("");
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(10);
  const [round, setRound] = useState(1);
  const [theme, setTheme] = useState("");
  const [used, setUsed] = useState<string[]>([]);
  const [speedScore, setSpeedScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [cases, setCases] = useState<number[]>([]);
  const [finalTurn, setFinalTurn] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [opponent, setOpponent] = useState(0);
  const [activeCase, setActiveCase] = useState<number | null>(null);
  const [aiPicking, setAiPicking] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState<RoomData | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [roomError, setRoomError] = useState("");
  const [roomLoading, setRoomLoading] = useState(false);
  const [auditCategory, setAuditCategory] = useState("Tous les thèmes");
  const [auditIndex, setAuditIndex] = useState(0);
  const [reportReason, setReportReason] = useState("Mauvaises réponses incohérentes");
  const [reportCorrection, setReportCorrection] = useState("");
  const [questionReports, setQuestionReports] = useState<QuestionReport[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(window.localStorage.getItem("ldn-question-reports") || "[]") as QuestionReport[]; }
    catch { return []; }
  });
  const auditedQuestions = auditCategory === "Tous les thèmes" ? allQuestions : allQuestions.filter(question => question.category === auditCategory);
  const auditedQuestion = auditedQuestions[Math.min(auditIndex, Math.max(0, auditedQuestions.length - 1))];

  const current = screen === "qualify" ? questions[index] : themes[theme]?.[index];

  useEffect(() => {
    if (!["qualify", "speed"].includes(screen)) return;
    if (time <= 0) { next(); return; }
    const id = window.setTimeout(() => setTime(v => v - 1), 1000);
    return () => clearTimeout(id);
  }, [time, screen]);

  useEffect(() => {
    if (screen !== "final" || finalTurn >= 12 || finalTurn % 2 === 0 || activeCase !== null) return;
    const startTimer = window.setTimeout(() => setAiPicking(true), 0);
    const available = Array.from({ length: 16 }, (_, i) => i).filter(i => !cases.includes(i));
    const chosen = available[Math.floor(Math.random() * available.length)];
    const chooseTimer = window.setTimeout(() => {
      setCases(v => [...v, chosen]);
      setActiveCase(chosen);
    }, 700);
    const answerTimer = window.setTimeout(() => {
      const points = chosen % 4 === 0 ? 3 : chosen % 3 === 0 ? 2 : 1;
      if (Math.random() > .42) setOpponent(v => v + points);
      setActiveCase(null);
      setAiPicking(false);
      const turn = finalTurn + 1;
      setFinalTurn(turn);
      if (turn === 12) window.setTimeout(() => setScreen("victory"), 450);
    }, 2100);
    return () => { window.clearTimeout(startTimer); window.clearTimeout(chooseTimer); window.clearTimeout(answerTimer); };
  }, [screen, finalTurn]);

  useEffect(() => {
    if (screen !== "lobby" || !room?.code) return;
    let unsubscribe=()=>{};
    subscribeRoom(room.code, next=>{ if(!next)return; setRoom(next); if(next.status!=="lobby")setScreen("multiGame"); }).then(stop=>{unsubscribe=stop}).catch(()=>setRoomError("Connexion Firebase impossible"));
    return () => unsubscribe();
  }, [screen, room?.code]);

  useEffect(() => {
    window.localStorage.removeItem("ldn-room-code");
    window.localStorage.removeItem("ldn-player-id");
  }, []);

  function saveQuestionReport() {
    if (!auditedQuestion) return;
    const next = [...questionReports.filter(report => report.questionId !== auditedQuestion.id), { questionId: auditedQuestion.id, reason: reportReason, correction: reportCorrection.trim(), createdAt: new Date().toISOString() }];
    setQuestionReports(next);
    window.localStorage.setItem("ldn-question-reports", JSON.stringify(next));
    setReportCorrection("");
    setAuditIndex(value => Math.min(value + 1, auditedQuestions.length - 1));
  }

  function exportQuestionReports() {
    const payload = questionReports.map(report => ({ ...report, question: allQuestions.find(question => question.id === report.questionId) }));
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = "signalements-questions.json"; link.click();
    URL.revokeObjectURL(url);
  }

  async function roomAction(action: "create" | "join" | "ready" | "start" | "leave" | "kick", targetPlayerId?: string) {
    setRoomLoading(true); setRoomError("");
    try {
      const data = action === "create" ? await createRoom(name) : action === "join" ? await joinRoom(roomCode,name) : { room: await updateRoom(room!.code,playerId,action,{targetPlayerId}), playerId };
      if (action === "leave") {
        window.localStorage.removeItem("ldn-room-code"); window.localStorage.removeItem("ldn-player-id");
        setRoom(null); setPlayerId(""); setRoomCode(""); reset(); setScreen("home");
        return;
      }
      if (!data.room) throw new Error("Le salon a été fermé");
      setRoom(data.room);
      if (data.playerId) {
        setPlayerId(data.playerId);
        window.localStorage.setItem("ldn-player-id", data.playerId);
        window.localStorage.setItem("ldn-room-code", data.room.code);
      }
      setRoomCode(data.room.code);
      if (action === "create" || action === "join") setScreen("lobby");
      if (data.room.status !== "lobby") setScreen("multiGame");
    } catch (error) { setRoomError(error instanceof Error ? error.message : "Une erreur est survenue"); }
    finally { setRoomLoading(false); }
  }

  function reset() {
    setIndex(0); setScore(0); setTime(10); setRound(1); setTheme(""); setUsed([]);
    setSpeedScore(0); setTotal(0); setCases([]); setFinalTurn(0); setFinalScore(0); setOpponent(0); setActiveCase(null); setAiPicking(false);
  }
  function next() {
    if (screen === "qualify") {
      if (index === 19) setScreen("qualified"); else { setIndex(v => v + 1); setTime(10); }
    } else {
      if (time <= 0 || index >= (themes[theme]?.length || 1) - 1) setScreen("roundResult"); else setIndex(v => v + 1);
    }
  }
  function answer(i: number) {
    if (i === current.answer) {
      if (screen === "qualify") setScore(v => v + 1);
      else setSpeedScore(v => v + 1);
    }
    next();
  }
  function chooseTheme(value: string) {
    setTheme(value); setUsed(v => [...v, value]); setIndex(0); setSpeedScore(0); setTime(90); setScreen("speed");
  }
  function afterRound() {
    setTotal(v => v + speedScore);
    if (round === 1) { setRound(2); setScreen("categories"); } else setScreen("finalIntro");
  }
  function chooseCase(i: number) {
    if (finalTurn % 2 !== 0 || cases.includes(i)) return;
    setCases(v => [...v, i]); setActiveCase(i);
  }
  function answerFinal(i: number) {
    if (finalTurn % 2 !== 0) return;
    const q = questions[(19 - finalTurn) % 20];
    const points = (activeCase ?? 1) % 4 === 0 ? 3 : (activeCase ?? 1) % 3 === 0 ? 2 : 1;
    if (i === q.answer) setFinalScore(v => v + points);
    setActiveCase(null);
    const turn = finalTurn + 1;
    setFinalTurn(turn);
    if (turn === 12) setTimeout(() => setScreen("victory"), 250);
  }

  return <main className={`game ${screen === "home" ? "is-home" : ""}`}>
    <header>
      <button className="mini-brand" onClick={() => room && playerId ? roomAction("leave") : setScreen("home")}><img src="/app-icon.png" alt="" /><span>LE DERNIER NEURONE</span></button>
      {screen !== "home" && <small>{room && ["lobby","multiGame"].includes(screen) ? "MULTIJOUEUR" : "DÉMO SOLO"}</small>}
      <button className="settings" onClick={() => setScreen("creator")}>⚙</button>
    </header>

    {screen === "home" && <section className="hero">
      <img className="logo" src="/logo-full.png" alt="Le Dernier Neurone" />
      <p>Prouve qu’il t’en reste au moins un.</p>
      <button className="primary huge" onClick={() => setScreen("setup")}>JOUER</button>
      <div className="modes">
        <button onClick={() => setScreen("setup")}><b>◉ SOLO</b><span>Affronte 3 candidats</span></button>
        <button onClick={() => setScreen("multi")}><b>⌁ PARTIE PRIVÉE</b><span>Joue sur plusieurs téléphones</span></button>
        <button disabled><b>♛ TOURNOIS</b><span>La Guerre des Neurones</span></button>
      </div>
      <div className="pls"><b>CULTURE EN PLS</b> arrive bientôt — la culture pop sans pitié</div>
    </section>}

    {screen === "multi" && <section className="panel multiplayer-panel">
      <p className="eyebrow">MULTIJOUEUR</p><h1>Chacun son téléphone</h1>
      <p className="muted">Crée un salon et partage son code, ou rejoins directement tes amis.</p>
      <div className="multi-actions">
        <button onClick={() => setScreen("createRoom")}><span>＋</span><b>CRÉER UNE PARTIE</b><small>Tu seras l’hôte du salon</small></button>
        <button onClick={() => setScreen("joinRoom")}><span>⌁</span><b>REJOINDRE UNE PARTIE</b><small>Entre le code reçu</small></button>
      </div>
      <button className="secondary" onClick={() => setScreen("home")}>RETOUR</button>
    </section>}

    {(screen === "createRoom" || screen === "joinRoom") && <section className="panel room-form">
      <p className="eyebrow">{screen === "createRoom" ? "NOUVEAU SALON" : "REJOINDRE"}</p>
      <h1>{screen === "createRoom" ? "Crée ton pupitre" : "Entre dans l’arène"}</h1>
      <label>TON PSEUDO<input value={name} maxLength={12} onChange={e => setName(e.target.value.toUpperCase())} /></label>
      {screen === "joinRoom" && <label>CODE DE LA PARTIE<input className="code-input" value={roomCode} maxLength={6} placeholder="ABC123" onChange={e => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""))} /></label>}
      {roomError && <div className="room-error">{roomError}</div>}
      <button className="primary" disabled={roomLoading || !name.trim() || (screen === "joinRoom" && roomCode.length !== 6)} onClick={() => roomAction(screen === "createRoom" ? "create" : "join")}>{roomLoading ? "CONNEXION…" : screen === "createRoom" ? "CRÉER LE SALON" : "REJOINDRE LE SALON"}</button>
      <button className="text-button" onClick={() => setScreen("multi")}>Annuler</button>
    </section>}

    {screen === "lobby" && room && <section className="panel lobby-panel">
      <p className="eyebrow">SALON PRIVÉ</p><h1>Prêts à jouer ?</h1>
      <div className="room-code"><small>CODE À PARTAGER</small><b>{room.code}</b><button onClick={() => navigator.clipboard?.writeText(room.code)}>COPIER</button></div>
      <div className="lobby-count"><span>{room.players.length}/12 joueurs</span><small>Minimum 2 pour commencer</small></div>
      <div className="players-list">{room.players.map((player) => <div key={player.id} className={player.ready ? "ready" : ""}>
        <span className="player-avatar" style={{background:player.color}}>{player.name[0]}</span><b>{player.name}{player.id === room.hostPlayerId && <small> HÔTE</small>}</b><em>{player.ready ? "PRÊT ✓" : "EN ATTENTE"}</em>
        {playerId === room.hostPlayerId && player.id !== playerId && <button className="kick-player" disabled={roomLoading} onClick={() => roomAction("kick", player.id)}>VIRER</button>}
      </div>)}</div>
      {roomError && <div className="room-error">{roomError}</div>}
      {playerId === room.hostPlayerId
        ? <button className="primary" disabled={roomLoading || room.players.length < 2 || room.players.some(p => !p.ready)} onClick={() => roomAction("start")}>LANCER LA PARTIE</button>
        : <button className={room.players.find(p => p.id === playerId)?.ready ? "secondary ready-button" : "primary"} disabled={roomLoading} onClick={() => roomAction("ready")}>{room.players.find(p => p.id === playerId)?.ready ? "JE NE SUIS PLUS PRÊT" : "JE SUIS PRÊT"}</button>}
      <p className="waiting-note">{playerId === room.hostPlayerId ? "Le bouton s’active lorsque tout le monde est prêt." : "La partie démarrera automatiquement quand l’hôte la lancera."}</p>
      <button className="leave-room" disabled={roomLoading} onClick={() => roomAction("leave")}>{playerId === room.hostPlayerId ? "FERMER LE SALON" : "QUITTER LE SALON"}</button>
    </section>}

    {screen === "multiGame" && room && playerId && <MultiplayerGame initialRoom={room} playerId={playerId} onExit={() => roomAction("leave")} />}

    {screen === "setup" && <section className="panel">
      <p className="eyebrow">PRÉPARE TON PUPITRE</p><h1>Ton candidat</h1>
      <div className="avatar">{(name || "K")[0]}</div>
      <label>TON PSEUDO<input value={name} maxLength={12} onChange={e => setName(e.target.value.toUpperCase())} /></label>
      <div className="stats"><div><b>20</b><span>questions</span></div><div><b>3</b><span>manches</span></div><div><b>1</b><span>Neurone d’Or</span></div></div>
      <button className="primary" onClick={() => { reset(); setScreen("qualify"); }}>ENTRER SUR LE PLATEAU</button>
    </section>}

    {screen === "qualify" && <section className="quiz">
      <div className="round"><span>QUALIFICATIONS</span><b>QUESTION {index + 1}/20</b></div>
      <div className="timer">{time}</div>
      <div className="question"><small>{current.category}</small><h2>{current.q}</h2><Answers question={current} onAnswer={answer} /></div>
      <div className="live"><b>{name || "KATHIE"}</b><span>{score} pts</span></div>
    </section>}

    {screen === "qualified" && <section className="panel">
      <p className="eyebrow">FIN DES QUALIFICATIONS</p><h1>Tu es qualifiée !</h1>
      <div className="ranking">{[[name || "KATHIE", score], ["NOA", 14], ["LÉO", 12], ["INES", 10]].sort((a,b) => Number(b[1])-Number(a[1])).map((p,i) =>
        <div className={p[0] === (name || "KATHIE") ? "you" : ""} key={String(p[0])}><b>{i+1}</b><span>{p[0]}</span><strong>{p[1]}/20</strong></div>)}
      </div>
      <button className="primary" onClick={() => setScreen("estimate")}>CONTINUER</button>
    </section>}

    {screen === "estimate" && <section className="panel">
      <p className="eyebrow">ORDRE DE PASSAGE</p><h1>Question d’estimation</h1>
      <p className="estimate">Combien de kilomètres séparent en moyenne la Terre de la Lune ?</p>
      <div className="input"><input type="number" placeholder="Ta réponse" /><span>km</span></div>
      <button className="primary" onClick={() => setScreen("categories")}>VALIDER</button>
      <p className="muted">Réponse : 384 400 km. Tu choisis en premier !</p>
    </section>}

    {screen === "categories" && <section className="wide center">
      <p className="eyebrow">ÉPREUVE DES CATÉGORIES · TOUR {round}/2</p><h1>Choisis ton terrain</h1>
      <p className="muted">90 secondes. Un maximum de bonnes réponses. Chaque thème ne peut être joué qu’une fois.</p>
      <div className="themes">{Object.keys(themes).map((t,i) =>
        <button disabled={used.includes(t)} onClick={() => chooseTheme(t)} key={t}><span>{["🎬","♫","🎮","✦","◆","⌛","★","▶","▣","🍴"][i]}</span><b>{t}</b><small>{used.includes(t) ? "DÉJÀ JOUÉ" : "CHOISIR"}</small></button>)}
      </div>
    </section>}

    {screen === "speed" && <section className="quiz">
      <div className="round"><span>{theme.toUpperCase()}</span><b>TOUR {round}/2</b></div><div className="clock">{time}<small>SEC</small></div>
      <div className="question speed"><h2>{current.q}</h2><Answers question={current} onAnswer={answer} /><button className="pass" onClick={next}>PASSER ↗</button></div>
      <div className="live"><b>{speedScore}</b><span>bonnes réponses</span></div>
    </section>}

    {screen === "roundResult" && <section className="panel">
      <p className="eyebrow">{theme.toUpperCase()} · TERMINÉ</p><h1>{speedScore} bonnes réponses</h1>
      <div className="medal">{total + speedScore}</div><p className="muted">Score cumulé</p>
      <button className="primary" onClick={afterRound}>{round === 1 ? "DEUXIÈME TOUR" : "VOIR LES FINALISTES"}</button>
    </section>}

    {screen === "finalIntro" && <section className="ceremony">
      <img src="/app-icon.png" alt="" /><p className="eyebrow gold">LA GRANDE FINALE</p>
      <h1>{name || "KATHIE"} <em>VS</em> NOA</h1><p>12 cases. Les cases mystères valent plus de points.</p>
      <button className="gold-button" onClick={() => setScreen("final")}>JOUER POUR LE NEURONE D’OR</button>
    </section>}

    {screen === "final" && <section className="wide center">
      <div className="scores"><div>{name || "KATHIE"} <b>{finalScore}</b></div><span>FINALE · {finalTurn}/12</span><div>NOA <b>{opponent}</b></div></div>
      <div className={`turn-banner ${finalTurn % 2 === 0 ? "your-turn" : "ai-turn"}`}>
        <span>{finalTurn % 2 === 0 ? "À TON TOUR" : "AU TOUR DE NOA"}</span>
        <b>{finalTurn % 2 === 0 ? "Choisis une case disponible" : aiPicking && activeCase === null ? "Noa réfléchit…" : "Noa joue sa case"}</b>
      </div>
      {activeCase === null ? <div className="cases">{Array.from({length:16},(_,i) =>
        <button disabled={cases.includes(i) || finalTurn % 2 !== 0} className={`${i%4===0?"mystery":""} ${cases.includes(i)?"taken":""}`} key={i} onClick={() => chooseCase(i)}>{cases.includes(i)?<><b>PRISE</b><small>INDISPONIBLE</small></>:i%4===0?"?":<><span>{["🎬","🌍","♫","🎮","🍴","✦"][i%6]}</span><small>{i%3===0?"2 PTS":"1 PT"}</small></>}</button>)}</div>
      : aiPicking
        ? <div className="question final-question ai-choice"><small>CASE CHOISIE PAR NOA</small><div className="ai-case">{activeCase%4===0?"?":"✦"}</div><h2>Noa répond à sa question…</h2><p>Cette case est maintenant retirée de la grille.</p></div>
        : <div className="question final-question"><small>{activeCase%4===0?"CASE MYSTÈRE · 3 POINTS":"QUESTION FINALE"}</small><h2>{questions[(19-finalTurn)%20].q}</h2><Answers question={questions[(19-finalTurn)%20]} onAnswer={answerFinal} /></div>}
    </section>}

    {screen === "victory" && <section className="ceremony">
      <div className="confetti">✦ · ✧ · ✦</div><img src="/app-icon.png" alt="" /><p className="eyebrow gold">{finalScore >= opponent ? "VICTOIRE" : "QUEL DUEL !"}</p>
      <h1>{finalScore >= opponent ? "Le Neurone d’Or est à toi !" : "NOA remporte le Neurone d’Or"}</h1>
      <p>{name || "KATHIE"} <b>{finalScore}</b> — <b>{opponent}</b> NOA</p><button className="gold-button" onClick={() => { reset(); setScreen("home"); }}>RETOUR À L’ACCUEIL</button>
    </section>}

    {screen === "creator" && <section className="panel">
      <p className="eyebrow">MODE CRÉATEUR</p><h1>Tester une étape</h1><p className="muted">Accès rapide à tous les écrans.</p>
      <div className="creator">{[["Qualifications","qualify"],["Classement","qualified"],["Estimation","estimate"],["Catégories","categories"],["Finalistes","finalIntro"],["Finale","final"],["Victoire","victory"]].map(([label,target]) =>
        <button key={target} onClick={() => { if(target==="qualify") reset(); setScreen(target as Screen); }}>{label}</button>)}</div>
      <button className="primary" onClick={() => setScreen("questionAudit")}>CONTRÔLER LES 1 000 QUESTIONS</button>
      <p className="muted">{questionReports.length} question{questionReports.length > 1 ? "s" : ""} signalée{questionReports.length > 1 ? "s" : ""} sur cet appareil.</p>
      <button className="secondary" onClick={() => setScreen("home")}>FERMER</button>
    </section>}

    {screen === "questionAudit" && auditedQuestion && <section className="wide audit-panel">
      <p className="eyebrow">CONTRÔLE ÉDITORIAL</p><h1>Question {auditIndex + 1}/{auditedQuestions.length}</h1>
      <div className="audit-toolbar"><select value={auditCategory} onChange={event => { setAuditCategory(event.target.value); setAuditIndex(0); }}><option>Tous les thèmes</option>{[...new Set(allQuestions.map(question => question.category))].sort().map(category => <option key={category}>{category}</option>)}</select><input aria-label="Numéro de question" type="number" min="1" max={auditedQuestions.length} value={auditIndex + 1} onChange={event => setAuditIndex(Math.max(0, Math.min(auditedQuestions.length - 1, Number(event.target.value) - 1)))} /></div>
      <div className="audit-question"><small>{auditedQuestion.id} · {auditedQuestion.category} · {auditedQuestion.difficulty}</small><h2>{auditedQuestion.q}</h2><div className="audit-choices">{auditedQuestion.choices.map((choice, choiceIndex) => <div className={choiceIndex === auditedQuestion.answer ? "correct" : ""} key={choice}><b>{String.fromCharCode(65 + choiceIndex)}</b>{choice}{choiceIndex === auditedQuestion.answer && <span>RÉPONSE ACTUELLE</span>}</div>)}</div></div>
      <div className="audit-actions"><button className="secondary" disabled={auditIndex === 0} onClick={() => setAuditIndex(value => value - 1)}>← PRÉCÉDENTE</button><button className="primary" onClick={() => setAuditIndex(value => Math.min(value + 1, auditedQuestions.length - 1))}>QUESTION OK · SUIVANTE</button></div>
      <div className="report-box"><h2>Signaler cette question</h2><select value={reportReason} onChange={event => setReportReason(event.target.value)}><option>Mauvaises réponses incohérentes</option><option>Réponse actuelle incorrecte</option><option>Question ambiguë</option><option>Question datée ou évolutive</option><option>Doublon</option><option>Formulation à corriger</option><option>Mauvaise difficulté ou catégorie</option></select><textarea value={reportCorrection} onChange={event => setReportCorrection(event.target.value)} placeholder="Correction proposée ou explication (facultatif)" /><button className="danger-button" onClick={saveQuestionReport}>ENREGISTRER LE SIGNALEMENT</button></div>
      {questionReports.length > 0 && <button className="secondary" onClick={exportQuestionReports}>EXPORTER LES {questionReports.length} SIGNALEMENTS</button>}
      <button className="text-button" onClick={() => setScreen("creator")}>Retour au mode créateur</button>
    </section>}
  </main>;
}
