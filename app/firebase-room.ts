"use client";

import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase, get, onValue, ref, runTransaction } from "firebase/database";
import { allQuestions, qualificationQuestions, themeQuestions } from "./question-bank";

export type Player = { id: string; name: string; color: string; ready: boolean; isAnimator?: boolean; isLocal?: boolean; score: number; qualificationAnswered: number; qualificationMs: number; estimate: number | null; categoryScore: number; categoryAnswered: number; finalScore: number; joinedAt: string };
export type Room = { id: string; code: string; status: string; phase: string; hostPlayerId: string; animatorMode?: boolean; deviceMode?: "single" | "multiple"; round: number; turnIndex: number; currentTheme: string | null; currentQuestionIndex: number; phaseStartedAt: string | null; usedThemes: string[]; selectedCases: number[]; activeCase: number | null; activePlayerId: string | null; qualifiedIds: string[]; finalistIds: string[]; players: Player[]; pendingAnswer?: { playerId: string; text: string; phase: "category" | "final" } | null; answerKeys?: Record<string, boolean>; estimateSubmissions?: Record<string, number>; qualificationQuestionIds?: string[]; finalQuestionIds?: string[]; themeQuestionStarts?: Record<string, number> };

const firebaseConfig = {
  apiKey: "AIzaSyBSSUy5ee9ntIK0-NGlGsnK4RAW31S8bxA",
  authDomain: "le-dernier-neurone.firebaseapp.com",
  databaseURL: "https://le-dernier-neurone-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "le-dernier-neurone",
  storageBucket: "le-dernier-neurone.firebasestorage.app",
  messagingSenderId: "731900216722",
  appId: "1:731900216722:web:212feec506bf0a39db2d4b",
};

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
let authPromise: Promise<void> | null = null;

function ensureAuth() {
  if (auth.currentUser) return Promise.resolve();
  authPromise ||= signInAnonymously(auth).then(() => undefined).catch(error => { authPromise = null; throw error; });
  return authPromise;
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function makePlayer(name: string, color: string, ready = false): Player {
  return { id: crypto.randomUUID(), name: name.trim().slice(0, 12).toUpperCase(), color, ready, score: 0, qualificationAnswered: 0, qualificationMs: 0, estimate: null, categoryScore: 0, categoryAnswered: 0, finalScore: 0, joinedAt: new Date().toISOString() };
}

function competitors(room: Room) { return room.players.filter(player => !player.isAnimator); }

function shuffledQuestionIds(count: number, excluded: string[] = []) {
  const excludedIds = new Set(excluded);
  const ids = allQuestions.filter(question => !excludedIds.has(question.id)).map(question => question.id);
  for (let index = ids.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [ids[index], ids[other]] = [ids[other], ids[index]];
  }
  return ids.slice(0, count);
}

export function roomQualificationQuestion(room: Room, index: number) {
  const id = room.qualificationQuestionIds?.[index];
  return allQuestions.find(question => question.id === id) || qualificationQuestions[index % qualificationQuestions.length];
}

export function roomFinalQuestion(room: Room, index: number) {
  const id = room.finalQuestionIds?.[index];
  return allQuestions.find(question => question.id === id) || qualificationQuestions[index % qualificationQuestions.length];
}

export function roomThemeQuestion(room: Room, theme: string, index: number) {
  const list = themeQuestions[theme] || [];
  // Firebase Realtime Database forbids `.`, `#`, `$`, `/`, `[` and `]` in
  // object keys. Theme names are display labels (for example
  // "Années 90/2000"), so store their offsets under a safe technical key.
  // Keep the display-name fallback for compatibility with any older room.
  const start = room.themeQuestionStarts?.[firebaseThemeKey(theme)]
    ?? room.themeQuestionStarts?.[theme]
    ?? 0;
  return list.length ? list[(start + index) % list.length] : undefined;
}

function firebaseThemeKey(theme: string) {
  return theme
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function randomThemeStarts() {
  return Object.fromEntries(Object.entries(themeQuestions).map(([theme, list]) => [firebaseThemeKey(theme), Math.floor(Math.random() * Math.max(1, list.length))]));
}

function normalize(room: Room): Room {
  room.players ||= [];
  room.players.forEach(player => { if (player.estimate === undefined) player.estimate = null; });
  room.usedThemes ||= [];
  room.selectedCases ||= [];
  room.answerKeys ||= {};
  room.estimateSubmissions ||= {};
  room.currentQuestionIndex ||= 0;
  room.pendingAnswer ??= null;
  const ranked = competitors(room).sort((a,b) => b.score-a.score || a.qualificationMs-b.qualificationMs || a.joinedAt.localeCompare(b.joinedAt));
  const qualified = ranked.slice(0, Math.min(3, ranked.length));
  const finalists = [...qualified].sort((a,b) => b.categoryScore-a.categoryScore || b.score-a.score || a.qualificationMs-b.qualificationMs).slice(0,2);
  room.qualifiedIds = qualified.map(p => p.id);
  room.finalistIds = finalists.map(p => p.id);
  const pool = room.phase.startsWith("final") || room.phase === "finished" ? finalists : qualified;
  room.activePlayerId = pool.length ? pool[room.turnIndex % pool.length]?.id || null : null;
  return room;
}

export async function createRoom(name: string, options: { animatorMode?: boolean; deviceMode?: "single" | "multiple" } = {}) {
  await ensureAuth();
  if (!name.trim()) throw new Error("Pseudo obligatoire");
  for (let attempt=0; attempt<8; attempt++) {
    const code=makeCode(); const player=makePlayer(name,"#8b5cf6",true);
    player.isAnimator=Boolean(options.animatorMode);
    const qualificationQuestionIds = shuffledQuestionIds(20);
    const room: Room = normalize({ id: crypto.randomUUID(), code, status:"lobby", phase:"lobby", hostPlayerId:player.id, animatorMode:Boolean(options.animatorMode), deviceMode:options.deviceMode || "multiple", round:1, turnIndex:0, currentTheme:null, currentQuestionIndex:0, phaseStartedAt:null, usedThemes:[], selectedCases:[], activeCase:null, activePlayerId:null, qualifiedIds:[], finalistIds:[], players:[player], pendingAnswer:null, answerKeys:{}, estimateSubmissions:{}, qualificationQuestionIds, finalQuestionIds:shuffledQuestionIds(12, qualificationQuestionIds), themeQuestionStarts:randomThemeStarts() });
    const result=await runTransaction(ref(database,`rooms/${code}`), current => current === null ? room : undefined, { applyLocally:false });
    if (result.committed) return { room, playerId:player.id };
  }
  throw new Error("Impossible de créer un code de salon. Réessaie.");
}

export async function joinRoom(code: string, name: string) {
  await ensureAuth();
  const normalizedCode=code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const player=makePlayer(name,"#22d3ee");
  if (normalizedCode.length !== 6) throw new Error(`Code incomplet (${normalizedCode || "vide"})`);
  if (!player.name) throw new Error("Pseudo obligatoire");

  // Read the room from the server first. A transaction on the complete room can
  // temporarily receive `null` on a second device and incorrectly report that
  // an existing room does not exist.
  const roomRef=ref(database,`rooms/${normalizedCode}`);
  const snapshot=await get(roomRef);
  if (!snapshot.exists()) throw new Error(`Salon ${normalizedCode} introuvable`);
  const existing=normalize(snapshot.val() as Room);
  if (existing.status!=="lobby") throw new Error("La partie a déjà commencé");

  let failure="";
  const playersRef=ref(database,`rooms/${normalizedCode}/players`);
  const result=await runTransaction(playersRef, value => {
    const players: Player[]=Array.isArray(value) ? value : [];
    if (players.length>=12) { failure="Le salon est complet"; return; }
    return [...players, player];
  },{applyLocally:false});
  if (!result.committed) throw new Error(failure || "Impossible d’ajouter le joueur au salon");

  const confirmed=await get(roomRef);
  if (!confirmed.exists()) throw new Error("Le salon a été fermé pendant la connexion");
  const room=normalize(confirmed.val() as Room);
  if (!room.players.some(candidate=>candidate.id===player.id)) throw new Error("Le joueur n’a pas été ajouté au salon");
  return { room, playerId:player.id };
}

export async function getRoom(code: string) {
  await ensureAuth();
  const snapshot=await get(ref(database,`rooms/${code.trim().toUpperCase()}`));
  return snapshot.exists() ? normalize(snapshot.val() as Room) : null;
}

export async function subscribeRoom(code: string, callback: (room: Room | null) => void) {
  await ensureAuth();
  return onValue(ref(database,`rooms/${code.trim().toUpperCase()}`), snapshot => callback(snapshot.exists()?normalize(snapshot.val() as Room):null));
}

type Payload = { questionIndex?:number; answerIndex?:number; answerText?:string; correct?:boolean; elapsedMs?:number; estimate?:number; theme?:string; caseIndex?:number; targetPlayerId?:string; name?:string };

export async function roomAction(code: string, playerId: string, action: string, payload: Payload = {}) {
  await ensureAuth(); let failure="";
  const result=await runTransaction(ref(database,`rooms/${code}`), value => {
    if (!value) { failure="Salon introuvable"; return; }
    const room=normalize(value as Room); const player=room.players.find(p=>p.id===playerId);
    if (!player) { failure="Joueur introuvable"; return; }
    const fail=(message:string)=>{ failure=message; return undefined; };
    if (action==="ready") player.ready=!player.ready;
    else if(action==="add-local-player") {
      if(room.hostPlayerId!==player.id || !room.animatorMode || room.deviceMode!=="single") return fail("Action réservée à l’animateur sur un seul téléphone");
      const name=(payload.name||"").trim(); if(!name) return fail("Prénom obligatoire"); if(competitors(room).length>=12) return fail("Le salon est complet");
      const local=makePlayer(name,["#22d3ee","#f97316","#ec4899","#84cc16"][competitors(room).length%4],true); local.isLocal=true; room.players.push(local);
    }
    else if (action==="start") {
      if (room.hostPlayerId!==player.id) return fail("Seul l’hôte peut lancer");
      if (competitors(room).length<2) return fail("Il faut au moins 2 candidats");
      if (competitors(room).some(p=>!p.ready)) return fail("Tous les candidats ne sont pas prêts");
      Object.assign(room,{status:"playing",phase:"qualification",turnIndex:0,round:1,usedThemes:[],selectedCases:[],activeCase:null,answerKeys:{},estimateSubmissions:{},phaseStartedAt:new Date().toISOString()});
      room.players.forEach(p=>Object.assign(p,{score:0,qualificationAnswered:0,qualificationMs:0,estimate:null,categoryScore:0,categoryAnswered:0,finalScore:0})); room.pendingAnswer=null;
    } else if (action==="qualification-answer") {
      const answering=payload.targetPlayerId && room.animatorMode && room.hostPlayerId===player.id ? room.players.find(p=>p.id===payload.targetPlayerId && p.isLocal) : player;
      if(!answering || answering.isAnimator) return fail("Candidat invalide"); const i=payload.questionIndex??-1; if(room.phase!=="qualification") return fail("Les qualifications sont terminées");
      if(i!==answering.qualificationAnswered||i<0||i>=20) return fail("Réponse déjà reçue ou question invalide");
      answering.qualificationAnswered++; answering.qualificationMs+=Math.max(0,payload.elapsedMs||0); if(payload.answerIndex===roomQualificationQuestion(room,i).answer) answering.score++;
      if(competitors(room).length > 0 && competitors(room).every(p=>p.qualificationAnswered>=20)) { room.phase="estimate"; room.phaseStartedAt=new Date().toISOString(); }
    } else if(action==="estimate") {
      const estimating=payload.targetPlayerId && room.animatorMode && room.hostPlayerId===player.id ? room.players.find(p=>p.id===payload.targetPlayerId && p.isLocal) : player;
      if(!estimating||room.phase!=="estimate"||!room.qualifiedIds.includes(estimating.id)) return fail("Estimation indisponible");
      estimating.estimate=Math.max(0,Math.round(payload.estimate||0));
      room.estimateSubmissions![estimating.id]=estimating.estimate;
      const qualified=room.players.filter(p=>room.qualifiedIds.includes(p.id));
      if(qualified.every(p=>Object.prototype.hasOwnProperty.call(room.estimateSubmissions,p.id))){ const ordered=[...qualified].sort((a,b)=>Math.abs(room.estimateSubmissions![a.id]-384400)-Math.abs(room.estimateSubmissions![b.id]-384400)); room.phase="category-select"; room.turnIndex=room.qualifiedIds.indexOf(ordered[0].id); room.phaseStartedAt=new Date().toISOString(); }
    } else if(action==="sync-estimate") {
      if(room.phase!=="estimate") return room;
      const qualified=room.players.filter(p=>room.qualifiedIds.includes(p.id));
      for(const candidate of qualified) if(candidate.estimate!==null && candidate.estimate!==undefined) room.estimateSubmissions![candidate.id]=candidate.estimate;
      if(qualified.length>0 && qualified.every(candidate=>Object.prototype.hasOwnProperty.call(room.estimateSubmissions,candidate.id))){ const ordered=[...qualified].sort((a,b)=>Math.abs(room.estimateSubmissions![a.id]-384400)-Math.abs(room.estimateSubmissions![b.id]-384400)); room.phase="category-select"; room.turnIndex=room.qualifiedIds.indexOf(ordered[0].id); room.phaseStartedAt=new Date().toISOString(); }
    } else if(action==="choose-theme") {
      if(room.phase!=="category-select"||(!room.animatorMode&&room.activePlayerId!==player.id)||(room.animatorMode&&room.hostPlayerId!==player.id)||!payload.theme||!themeQuestions[payload.theme]?.length||room.usedThemes.includes(payload.theme)) return fail("Ce thème ne peut pas être choisi");
      room.phase="category-playing"; room.currentTheme=payload.theme; room.currentQuestionIndex=0; room.usedThemes.push(payload.theme); room.phaseStartedAt=new Date().toISOString();
    } else if(action==="category-answer") {
      const answering=payload.targetPlayerId && room.animatorMode && room.hostPlayerId===player.id ? room.players.find(p=>p.id===payload.targetPlayerId && p.isLocal) : player;
      if(!answering||room.phase!=="category-playing"||room.activePlayerId!==answering.id||!room.currentTheme) return fail("Ce n’est pas ton tour");
      const i=payload.questionIndex??-1; const key=`category:${room.turnIndex}:${answering.id}:${i}`; const question=roomThemeQuestion(room,room.currentTheme,i);
      if(i!==room.currentQuestionIndex||i<0||!question) return fail("Question invalide"); if(room.answerKeys![key]||room.pendingAnswer) return fail("Réponse déjà reçue");
      if(room.animatorMode) room.pendingAnswer={playerId:answering.id,text:(payload.answerText||"").trim(),phase:"category"};
      else { const clean=(text:string)=>text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,""); room.answerKeys![key]=true; answering.categoryAnswered++; if(clean(payload.answerText||"")===clean(question.choices[question.answer])) answering.categoryScore++; room.currentQuestionIndex++; }
    } else if(action==="answer-verdict") {
      if(!room.animatorMode||room.hostPlayerId!==player.id||!room.pendingAnswer) return fail("Aucune réponse à valider"); const answering=room.players.find(p=>p.id===room.pendingAnswer!.playerId); if(!answering) return fail("Candidat introuvable");
      if(room.pendingAnswer.phase==="category") { const key=`category:${room.turnIndex}:${answering.id}:${room.currentQuestionIndex}`; room.answerKeys![key]=true; answering.categoryAnswered++; if(payload.correct) answering.categoryScore++; room.currentQuestionIndex++; }
      else { const points=room.activeCase!%4===0?3:room.activeCase!%3===0?2:1; if(payload.correct) answering.finalScore+=points; room.turnIndex++; room.activeCase=null; if(room.turnIndex>=12){room.phase="finished";room.status="finished";}else room.phase="final-pick"; }
      room.pendingAnswer=null; room.phaseStartedAt=new Date().toISOString();
    } else if(action==="category-pass") {
      if(room.phase!=="category-playing"||(!room.animatorMode&&room.activePlayerId!==player.id)||(room.animatorMode&&room.hostPlayerId!==player.id)||!room.currentTheme) return fail("Ce n’est pas ton tour");
      if(room.currentQuestionIndex>=themeQuestions[room.currentTheme].length) return fail("Toutes les questions ont été jouées"); room.currentQuestionIndex++;
    } else if(action==="end-category") {
      if(room.phase!=="category-playing"||(!room.animatorMode&&room.activePlayerId!==player.id)||(room.animatorMode&&room.hostPlayerId!==player.id)) return fail("Ce n’est pas ton tour");
      const next=room.turnIndex+1,total=room.qualifiedIds.length*2; room.turnIndex=next; room.currentTheme=null; room.currentQuestionIndex=0; room.phaseStartedAt=new Date().toISOString();
      if(next>=total){room.phase="final-intro";room.turnIndex=0;room.round=1;}else{room.phase="category-select";room.round=Math.floor(next/room.qualifiedIds.length)+1;}
    } else if(action==="start-final") {
      if(room.phase!=="final-intro"||(!room.animatorMode&&!room.finalistIds.includes(player.id))||(room.animatorMode&&room.hostPlayerId!==player.id)) return fail("Finale indisponible"); room.phase="final-pick";room.turnIndex=0;room.phaseStartedAt=new Date().toISOString();
    } else if(action==="choose-case") {
      const i=payload.caseIndex??-1;if(room.phase!=="final-pick"||(!room.animatorMode&&room.activePlayerId!==player.id)||(room.animatorMode&&room.hostPlayerId!==player.id)||i<0||i>=16||room.selectedCases.includes(i)) return fail("Cette case n’est pas disponible");room.phase="final-answer";room.activeCase=i;room.selectedCases.push(i);room.phaseStartedAt=new Date().toISOString();
    } else if(action==="final-answer") {
      const answering=payload.targetPlayerId && room.animatorMode && room.hostPlayerId===player.id ? room.players.find(p=>p.id===payload.targetPlayerId && p.isLocal) : player;
      if(!answering||room.phase!=="final-answer"||room.activePlayerId!==answering.id||room.activeCase===null) return fail("Ce n’est pas ton tour");
      if(room.animatorMode) { if(room.pendingAnswer) return fail("Réponse déjà reçue"); room.pendingAnswer={playerId:answering.id,text:(payload.answerText||"").trim(),phase:"final"}; }
      else { const expected=roomFinalQuestion(room,room.turnIndex%12).choices[roomFinalQuestion(room,room.turnIndex%12).answer]; const clean=(text:string)=>text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,""); const points=room.activeCase%4===0?3:room.activeCase%3===0?2:1;if(clean(payload.answerText||"")===clean(expected))player.finalScore+=points; room.turnIndex++;room.activeCase=null;room.phaseStartedAt=new Date().toISOString();if(room.turnIndex>=12){room.phase="finished";room.status="finished";}else room.phase="final-pick"; }
    } else if(action==="kick") {
      if(room.hostPlayerId!==player.id) return fail("Seul l’hôte peut exclure un joueur");
      if(!payload.targetPlayerId || payload.targetPlayerId===player.id) return fail("Joueur invalide");
      room.players=room.players.filter(p=>p.id!==payload.targetPlayerId);
    } else if(action==="leave") {
      if(room.hostPlayerId===player.id) return null;
      room.players=room.players.filter(p=>p.id!==player.id);
    }
    else return fail("Action inconnue");
    return normalize(room);
  },{applyLocally:false});
  if(!result.committed) throw new Error(failure||"Action impossible");
  const value=result.snapshot.val() as Room | null;
  return value ? normalize(value) : null;
}
