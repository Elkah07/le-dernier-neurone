"use client";

import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase, get, onValue, ref, runTransaction } from "firebase/database";
import { qualificationQuestions, themeQuestions } from "./question-bank";

export type Player = { id: string; name: string; color: string; ready: boolean; score: number; qualificationAnswered: number; qualificationMs: number; estimate: number | null; categoryScore: number; categoryAnswered: number; finalScore: number; joinedAt: string };
export type Room = { id: string; code: string; status: string; phase: string; hostPlayerId: string; round: number; turnIndex: number; currentTheme: string | null; currentQuestionIndex: number; phaseStartedAt: string | null; usedThemes: string[]; selectedCases: number[]; activeCase: number | null; activePlayerId: string | null; qualifiedIds: string[]; finalistIds: string[]; players: Player[]; answerKeys?: Record<string, boolean> };

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

function normalize(room: Room): Room {
  room.players ||= [];
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
    const room: Room = normalize({ id: crypto.randomUUID(), code, status:"lobby", phase:"lobby", hostPlayerId:player.id, round:1, turnIndex:0, currentTheme:null, currentQuestionIndex:0, phaseStartedAt:null, usedThemes:[], selectedCases:[], activeCase:null, activePlayerId:null, qualifiedIds:[], finalistIds:[], players:[player], answerKeys:{} });
    const result=await runTransaction(ref(database,`rooms/${code}`), current => current === null ? room : undefined, { applyLocally:false });
    if (result.committed) return { room, playerId:player.id };
  }
  throw new Error("Impossible de créer un code de salon. Réessaie.");
}

export async function joinRoom(code: string, name: string) {
  await ensureAuth();
  const normalizedCode=code.trim().toUpperCase(); const player=makePlayer(name,"#22d3ee"); let failure="";
  if (!player.name) throw new Error("Pseudo obligatoire");

  // A Realtime Database transaction can initially receive `null` while the
  // client cache is still empty, even when the room already exists remotely.
  // Prime the cache with a server read before starting the transaction so a
  // valid room is not incorrectly reported as missing on a second device.
  const roomRef=ref(database,`rooms/${normalizedCode}`);
  const existing=await get(roomRef);
  if (!existing.exists()) throw new Error("Salon introuvable");

  const result=await runTransaction(ref(database,`rooms/${normalizedCode}`), value => {
    if (!value) { failure="Salon introuvable"; return; }
    const room=normalize(value as Room);
    if (room.status!=="lobby") { failure="La partie a déjà commencé"; return; }
    if (room.players.length>=12) { failure="Le salon est complet"; return; }
    room.players.push(player); return normalize(room);
  },{applyLocally:false});
  if (!result.committed) throw new Error(failure || "Impossible de rejoindre le salon");
  return { room:normalize(result.snapshot.val() as Room), playerId:player.id };
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

type Payload = { questionIndex?:number; answerIndex?:number; elapsedMs?:number; estimate?:number; theme?:string; caseIndex?:number };

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
      player.qualificationAnswered++; player.qualificationMs+=Math.max(0,payload.elapsedMs||0); if(payload.answerIndex===qualificationQuestions[i].answer) player.score++;
      if(room.players.every(p=>p.qualificationAnswered>=20)) { room.phase="estimate"; room.phaseStartedAt=new Date().toISOString(); }
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
      const i=payload.questionIndex??-1; const key=`category:${room.turnIndex}:${player.id}:${i}`; const list=themeQuestions[room.currentTheme];
      if(i!==room.currentQuestionIndex||i<0||i>=list.length) return fail("Question invalide"); if(room.answerKeys![key]) return fail("Réponse déjà reçue"); room.answerKeys![key]=true;
      player.categoryAnswered++; if(payload.answerIndex===list[i].answer) player.categoryScore++; room.currentQuestionIndex++;
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
      const i=(19-room.turnIndex+40)%20,points=room.activeCase%4===0?3:room.activeCase%3===0?2:1;if(payload.answerIndex===qualificationQuestions[i].answer)player.finalScore+=points;
      room.turnIndex++;room.activeCase=null;room.phaseStartedAt=new Date().toISOString();if(room.turnIndex>=12){room.phase="finished";room.status="finished";}else room.phase="final-pick";
    } else if(action==="leave") room.players=room.players.filter(p=>p.id!==player.id);
    else return fail("Action inconnue");
    return normalize(room);
  },{applyLocally:false});
  if(!result.committed) throw new Error(failure||"Action impossible");
  return normalize(result.snapshot.val() as Room);
}
