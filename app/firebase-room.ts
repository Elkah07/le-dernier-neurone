"use client";

import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase, get, onValue, ref, runTransaction } from "firebase/database";
import { allQuestions, qualificationQuestions, themeQuestions } from "./question-bank";

export type Player = { id: string; name: string; color: string; ready: boolean; score: number; qualificationAnswered: number; qualificationMs: number; estimate: number | null; categoryScore: number; categoryAnswered: number; finalScore: number; joinedAt: string };
export type Room = { id: string; code: string; status: string; phase: string; hostPlayerId: string; round: number; turnIndex: number; currentTheme: string | null; currentQuestionIndex: number; phaseStartedAt: string | null; usedThemes: string[]; selectedCases: number[]; activeCase: number | null; activePlayerId: string | null; qualifiedIds: string[]; finalistIds: string[]; players: Player[]; answerKeys?: Record<string, boolean>; qualificationQuestionIds?: string[]; finalQuestionIds?: string[]; themeQuestionStarts?: Record<string, number> };

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
  const start = room.themeQuestionStarts?.[theme] || 0;
  return list.length ? list[(start + index) % list.length] : undefined;
}

function randomThemeStarts() {
  return Object.fromEntries(Object.entries(themeQuestions).map(([theme, list]) => [theme, Math.floor(Math.random() * Math.max(1, list.length))]));
}

function normalize(room: Room): Room {
  room.players ||= [];
  room.players.forEach(player => { if (player.estimate === undefined) player.estimate = null; });
  room.usedThemes ||= [];
  room.selectedCases ||= [];
  room.answerKeys ||= {};
  room.currentQuestionIndex ||= 0;
  const ranked = [...room.players].sort((a,b) => b.score-a.score || a.qualificationMs-b.qualificationMs || a.joinedAt.localeCompare(b.joinedAt));
  const qualified = ranked.slice(0, Math.min(3, ranked.length));
  const finalists = [...qualified].sort((a,b) => b.categoryScore-a.categoryScore || b.score-a.score || a.qualificationMs-b.qualificationMs).slice(0,2);
  room.qualifiedIds = qualified.map(p => p.id);
  room.finalistIds = finalists.map(p => p.id);
  const pool = room.phase.startsWith("final") || room.phase === "finished" ? finalists : qualified;
  room.activePlayerId = pool.length ? pool[room.turnIndex % pool.length]?.id || null : null;
  return room;
}

export async function createRoom(name: string) {
  await ensureAuth();
  if (!name.trim()) throw new Error("Pseudo obligatoire");
  for (let attempt=0; attempt<8; attempt++) {
    const code=makeCode(); const player=makePlayer(name,"#8b5cf6",true);
    const qualificationQuestionIds = shuffledQuestionIds(20);
    const room: Room = normalize({ id: crypto.randomUUID(), code, status:"lobby", phase:"lobby", hostPlayerId:player.id, round:1, turnIndex:0, currentTheme:null, currentQuestionIndex:0, phaseStartedAt:null, usedThemes:[], selectedCases:[], activeCase:null, activePlayerId:null, qualifiedIds:[], finalistIds:[], players:[player], answerKeys:{}, qualificationQuestionIds, finalQuestionIds:shuffledQuestionIds(12, qualificationQuestionIds), themeQuestionStarts:randomThemeStarts() });
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

type Payload = { questionIndex?:number; answerIndex?:number; elapsedMs?:number; estimate?:number; theme?:string; caseIndex?:number; targetPlayerId?:string };

export async function roomAction(code: string, playerId: string, action: string, payload: Payload = {}) {
  await ensureAuth(); let failure="";
  const result=await runTransaction(ref(database,`rooms/${code}`), value => {
    if (!value) { failure="Salon introuvable"; return; }
    const room=normalize(value as Room); const player=room.players.find(p=>p.id===playerId);
    if (!player) { failure="Joueur introuvable"; return; }
    const fail=(message:string)=>{ failure=message; return undefined; };
    if (action==="ready") player.ready=!player.ready;
    else if (action==="start") {
      if (room.hostPlayerId!==player.id) return fail("Seul l’hôte peut lancer");
      if (room.players.length<2) return fail("Il faut au moins 2 joueurs");
      if (room.players.some(p=>!p.ready)) return fail("Tous les joueurs ne sont pas prêts");
      Object.assign(room,{status:"playing",phase:"qualification",turnIndex:0,round:1,usedThemes:[],selectedCases:[],activeCase:null,answerKeys:{},phaseStartedAt:new Date().toISOString()});
      room.players.forEach(p=>Object.assign(p,{score:0,qualificationAnswered:0,qualificationMs:0,estimate:null,categoryScore:0,categoryAnswered:0,finalScore:0}));
    } else if (action==="qualification-answer") {
      const i=payload.questionIndex??-1; if(room.phase!=="qualification") return fail("Les qualifications sont terminées");
      if(i!==player.qualificationAnswered||i<0||i>=20) return fail("Réponse déjà reçue ou question invalide");
      player.qualificationAnswered++; player.qualificationMs+=Math.max(0,payload.elapsedMs||0); if(payload.answerIndex===roomQualificationQuestion(room,i).answer) player.score++;
      if(room.players.length > 0 && room.players.every(p=>p.qualificationAnswered>=20)) { room.phase="estimate"; room.phaseStartedAt=new Date().toISOString(); }
    } else if(action==="estimate") {
      if(room.phase!=="estimate"||!room.qualifiedIds.includes(player.id)) return fail("Estimation indisponible");
      player.estimate=Math.max(0,Math.round(payload.estimate||0));
      const qualified=room.players.filter(p=>room.qualifiedIds.includes(p.id));
      if(qualified.every(p=>p.estimate!==null)){ const ordered=[...qualified].sort((a,b)=>Math.abs((a.estimate||0)-384400)-Math.abs((b.estimate||0)-384400)); room.phase="category-select"; room.turnIndex=room.qualifiedIds.indexOf(ordered[0].id); room.phaseStartedAt=new Date().toISOString(); }
    } else if(action==="choose-theme") {
      if(room.phase!=="category-select"||room.activePlayerId!==player.id||!payload.theme||!themeQuestions[payload.theme]?.length||room.usedThemes.includes(payload.theme)) return fail("Ce thème ne peut pas être choisi");
      room.phase="category-playing"; room.currentTheme=payload.theme; room.currentQuestionIndex=0; room.usedThemes.push(payload.theme); room.phaseStartedAt=new Date().toISOString();
    } else if(action==="category-answer") {
      if(room.phase!=="category-playing"||room.activePlayerId!==player.id||!room.currentTheme) return fail("Ce n’est pas ton tour");
      const i=payload.questionIndex??-1; const key=`category:${room.turnIndex}:${player.id}:${i}`; const question=roomThemeQuestion(room,room.currentTheme,i);
      if(i!==room.currentQuestionIndex||i<0||!question) return fail("Question invalide"); if(room.answerKeys![key]) return fail("Réponse déjà reçue"); room.answerKeys![key]=true;
      player.categoryAnswered++; if(payload.answerIndex===question.answer) player.categoryScore++; room.currentQuestionIndex++;
    } else if(action==="category-pass") {
      if(room.phase!=="category-playing"||room.activePlayerId!==player.id||!room.currentTheme) return fail("Ce n’est pas ton tour");
      if(room.currentQuestionIndex>=themeQuestions[room.currentTheme].length) return fail("Toutes les questions ont été jouées"); room.currentQuestionIndex++;
    } else if(action==="end-category") {
      if(room.phase!=="category-playing"||room.activePlayerId!==player.id) return fail("Ce n’est pas ton tour");
      const next=room.turnIndex+1,total=room.qualifiedIds.length*2; room.turnIndex=next; room.currentTheme=null; room.currentQuestionIndex=0; room.phaseStartedAt=new Date().toISOString();
      if(next>=total){room.phase="final-intro";room.turnIndex=0;room.round=1;}else{room.phase="category-select";room.round=Math.floor(next/room.qualifiedIds.length)+1;}
    } else if(action==="start-final") {
      if(room.phase!=="final-intro"||!room.finalistIds.includes(player.id)) return fail("Finale indisponible"); room.phase="final-pick";room.turnIndex=0;room.phaseStartedAt=new Date().toISOString();
    } else if(action==="choose-case") {
      const i=payload.caseIndex??-1;if(room.phase!=="final-pick"||room.activePlayerId!==player.id||i<0||i>=16||room.selectedCases.includes(i)) return fail("Cette case n’est pas disponible");room.phase="final-answer";room.activeCase=i;room.selectedCases.push(i);room.phaseStartedAt=new Date().toISOString();
    } else if(action==="final-answer") {
      if(room.phase!=="final-answer"||room.activePlayerId!==player.id||room.activeCase===null) return fail("Ce n’est pas ton tour");
      const i=room.turnIndex%12,points=room.activeCase%4===0?3:room.activeCase%3===0?2:1;if(payload.answerIndex===roomFinalQuestion(room,i).answer)player.finalScore+=points;
      room.turnIndex++;room.activeCase=null;room.phaseStartedAt=new Date().toISOString();if(room.turnIndex>=12){room.phase="finished";room.status="finished";}else room.phase="final-pick";
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
