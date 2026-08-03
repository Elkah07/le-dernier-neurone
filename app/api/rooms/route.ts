import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { gameAnswers, roomPlayers, rooms } from "../../../db/schema";
import { qualificationQuestions, themeQuestions } from "../../question-bank";

function ranked<T extends { score: number; qualificationMs: number; joinedAt: string }>(players: T[]) {
  return [...players].sort((a, b) => b.score - a.score || a.qualificationMs - b.qualificationMs || a.joinedAt.localeCompare(b.joinedAt));
}

async function getRoom(code: string) {
  const db = await getDb();
  const [room] = await db.select().from(rooms).where(eq(rooms.code, code.toUpperCase())).limit(1);
  if (!room) return null;
  const players = await db.select().from(roomPlayers).where(eq(roomPlayers.roomId, room.id)).orderBy(asc(roomPlayers.joinedAt));
  const qualification = ranked(players).slice(0, Math.min(3, players.length));
  const finalists = [...qualification].sort((a, b) => b.categoryScore - a.categoryScore || b.score - a.score || a.qualificationMs - b.qualificationMs).slice(0, 2);
  const activePool = room.phase.startsWith("final") || room.phase === "finished" ? finalists : qualification;
  return {
    ...room,
    usedThemes: JSON.parse(room.usedThemes || "[]") as string[],
    selectedCases: JSON.parse(room.selectedCases || "[]") as number[],
    players,
    qualifiedIds: qualification.map(player => player.id),
    finalistIds: finalists.map(player => player.id),
    activePlayerId: activePool.length ? activePool[room.turnIndex % activePool.length]?.id : null,
  };
}

async function advanceQualificationIfComplete(code: string) {
  const room = await getRoom(code);
  if (!room || room.phase !== "qualification" || !room.players.length) return room;
  if (room.players.every(player => player.qualificationAnswered >= qualificationQuestions.length)) {
    const db = await getDb();
    await db.update(rooms).set({ phase: "estimate", phaseStartedAt: new Date().toISOString() }).where(eq(rooms.id, room.id));
    return getRoom(code);
  }
  return room;
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase();
    if (!code) return Response.json({ error: "Code manquant" }, { status: 400 });
    const room = await advanceQualificationIfComplete(code);
    return room ? Response.json({ room }) : Response.json({ error: "Salon introuvable" }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 500 });
  }
}

type ActionBody = {
  action?: string; code?: string; name?: string; playerId?: string; color?: string;
  questionIndex?: number; answerIndex?: number; elapsedMs?: number; estimate?: number;
  theme?: string; caseIndex?: number; targetPlayerId?: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as ActionBody;
    const db = await getDb();
    const name = body.name?.trim().slice(0, 12).toUpperCase();

    if (body.action === "create") {
      if (!name) return Response.json({ error: "Pseudo obligatoire" }, { status: 400 });
      const roomId = crypto.randomUUID();
      const playerId = crypto.randomUUID();
      let code = makeCode();
      for (let i = 0; i < 4; i++) {
        const existing = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.code, code)).limit(1);
        if (!existing.length) break;
        code = makeCode();
      }
      await db.batch([
        db.insert(rooms).values({ id: roomId, code, hostPlayerId: playerId }),
        db.insert(roomPlayers).values({ id: playerId, roomId, name, color: body.color || "#8b5cf6", ready: true }),
      ]);
      return Response.json({ room: await getRoom(code), playerId }, { status: 201 });
    }

    const code = body.code?.trim().toUpperCase();
    if (!code) return Response.json({ error: "Code obligatoire" }, { status: 400 });
    const room = await getRoom(code);
    if (!room) return Response.json({ error: "Salon introuvable" }, { status: 404 });

    if (body.action === "join") {
      if (!name) return Response.json({ error: "Pseudo obligatoire" }, { status: 400 });
      if (room.status !== "lobby") return Response.json({ error: "La partie a déjà commencé" }, { status: 409 });
      if (room.players.length >= 12) return Response.json({ error: "Le salon est complet" }, { status: 409 });
      const playerId = crypto.randomUUID();
      await db.insert(roomPlayers).values({ id: playerId, roomId: room.id, name, color: body.color || "#22d3ee" });
      return Response.json({ room: await getRoom(code), playerId }, { status: 201 });
    }

    if (!body.playerId) return Response.json({ error: "Joueur manquant" }, { status: 400 });
    const player = room.players.find(item => item.id === body.playerId);
    if (!player) return Response.json({ error: "Joueur introuvable" }, { status: 404 });

    if (body.action === "ready") {
      await db.update(roomPlayers).set({ ready: !player.ready }).where(and(eq(roomPlayers.id, player.id), eq(roomPlayers.roomId, room.id)));
    } else if (body.action === "start") {
      if (room.hostPlayerId !== player.id) return Response.json({ error: "Seul l’hôte peut lancer" }, { status: 403 });
      if (room.players.length < 2) return Response.json({ error: "Il faut au moins 2 joueurs" }, { status: 409 });
      if (room.players.some(item => !item.ready)) return Response.json({ error: "Tous les joueurs ne sont pas prêts" }, { status: 409 });
      await db.batch([
        db.update(rooms).set({ status: "playing", phase: "qualification", startedAt: new Date().toISOString(), phaseStartedAt: new Date().toISOString(), turnIndex: 0, round: 1, usedThemes: "[]", selectedCases: "[]", activeCase: null }).where(eq(rooms.id, room.id)),
        db.update(roomPlayers).set({ score: 0, qualificationAnswered: 0, qualificationMs: 0, estimate: null, categoryScore: 0, categoryAnswered: 0, finalScore: 0 }).where(eq(roomPlayers.roomId, room.id)),
      ]);
    } else if (body.action === "qualification-answer") {
      if (room.phase !== "qualification") return Response.json({ error: "Les qualifications sont terminées" }, { status: 409 });
      const questionIndex = body.questionIndex ?? -1;
      if (questionIndex !== player.qualificationAnswered || questionIndex < 0 || questionIndex >= qualificationQuestions.length) return Response.json({ error: "Réponse déjà reçue ou question invalide" }, { status: 409 });
      const correct = body.answerIndex === qualificationQuestions[questionIndex].answer;
      await db.batch([
        db.insert(gameAnswers).values({ id: crypto.randomUUID(), roomId: room.id, playerId: player.id, phase: "qualification", questionKey: String(questionIndex), answerIndex: body.answerIndex ?? -1, correct, responseMs: Math.max(0, body.elapsedMs || 0) }),
        db.update(roomPlayers).set({ qualificationAnswered: questionIndex + 1, qualificationMs: player.qualificationMs + Math.max(0, body.elapsedMs || 0), score: player.score + (correct ? 1 : 0) }).where(eq(roomPlayers.id, player.id)),
      ]);
      await advanceQualificationIfComplete(code);
    } else if (body.action === "estimate") {
      if (room.phase !== "estimate" || !room.qualifiedIds.includes(player.id)) return Response.json({ error: "Estimation indisponible" }, { status: 409 });
      await db.update(roomPlayers).set({ estimate: Math.max(0, Math.round(body.estimate || 0)) }).where(eq(roomPlayers.id, player.id));
      const updated = await getRoom(code);
      const qualified = updated?.players.filter(item => updated.qualifiedIds.includes(item.id)) || [];
      if (qualified.length && qualified.every(item => item.estimate !== null)) {
        const ordered = [...qualified].sort((a, b) => Math.abs((a.estimate || 0) - 384400) - Math.abs((b.estimate || 0) - 384400));
        await db.update(rooms).set({ phase: "category-select", turnIndex: updated!.qualifiedIds.indexOf(ordered[0].id), round: 1, phaseStartedAt: new Date().toISOString() }).where(eq(rooms.id, room.id));
      }
    } else if (body.action === "choose-theme") {
      if (room.phase !== "category-select" || room.activePlayerId !== player.id || !body.theme || !themeQuestions[body.theme]?.length || room.usedThemes.includes(body.theme)) return Response.json({ error: "Ce thème ne peut pas être choisi" }, { status: 409 });
      await db.update(rooms).set({ phase: "category-playing", currentTheme: body.theme, usedThemes: JSON.stringify([...room.usedThemes, body.theme]), phaseStartedAt: new Date().toISOString() }).where(eq(rooms.id, room.id));
    } else if (body.action === "category-answer") {
      if (room.phase !== "category-playing" || room.activePlayerId !== player.id || !room.currentTheme) return Response.json({ error: "Ce n’est pas ton tour" }, { status: 409 });
      const questionIndex = Math.max(0, body.questionIndex || 0);
      const answerKey = `${room.turnIndex}-${questionIndex}`;
      const [existing] = await db.select().from(gameAnswers).where(and(eq(gameAnswers.roomId, room.id), eq(gameAnswers.playerId, player.id), eq(gameAnswers.phase, "category"), eq(gameAnswers.questionKey, answerKey))).limit(1);
      if (existing) return Response.json({ error: "Réponse déjà reçue" }, { status: 409 });
      const questions = themeQuestions[room.currentTheme];
      if (questionIndex >= questions.length) return Response.json({ error: "Toutes les questions de ce thème ont été jouées" }, { status: 409 });
      const correct = body.answerIndex === questions[questionIndex].answer;
      await db.batch([
        db.insert(gameAnswers).values({ id: crypto.randomUUID(), roomId: room.id, playerId: player.id, phase: "category", questionKey: answerKey, answerIndex: body.answerIndex ?? -1, correct, responseMs: Math.max(0, body.elapsedMs || 0) }),
        db.update(roomPlayers).set({ categoryAnswered: player.categoryAnswered + 1, categoryScore: player.categoryScore + (correct ? 1 : 0) }).where(eq(roomPlayers.id, player.id)),
      ]);
    } else if (body.action === "end-category") {
      if (room.phase !== "category-playing" || room.activePlayerId !== player.id) return Response.json({ error: "Ce n’est pas ton tour" }, { status: 409 });
      const nextTurn = room.turnIndex + 1;
      const totalTurns = room.qualifiedIds.length * 2;
      await db.update(rooms).set(nextTurn >= totalTurns
        ? { phase: "final-intro", turnIndex: 0, round: 1, currentTheme: null, phaseStartedAt: new Date().toISOString() }
        : { phase: "category-select", turnIndex: nextTurn, round: Math.floor(nextTurn / room.qualifiedIds.length) + 1, currentTheme: null, phaseStartedAt: new Date().toISOString() }
      ).where(eq(rooms.id, room.id));
    } else if (body.action === "start-final") {
      if (room.phase !== "final-intro" || !room.finalistIds.includes(player.id)) return Response.json({ error: "Finale indisponible" }, { status: 409 });
      await db.update(rooms).set({ phase: "final-pick", turnIndex: 0, phaseStartedAt: new Date().toISOString() }).where(eq(rooms.id, room.id));
    } else if (body.action === "choose-case") {
      const caseIndex = body.caseIndex ?? -1;
      if (room.phase !== "final-pick" || room.activePlayerId !== player.id || caseIndex < 0 || caseIndex >= 16 || room.selectedCases.includes(caseIndex)) return Response.json({ error: "Cette case n’est pas disponible" }, { status: 409 });
      await db.update(rooms).set({ phase: "final-answer", activeCase: caseIndex, selectedCases: JSON.stringify([...room.selectedCases, caseIndex]), phaseStartedAt: new Date().toISOString() }).where(eq(rooms.id, room.id));
    } else if (body.action === "final-answer") {
      if (room.phase !== "final-answer" || room.activePlayerId !== player.id || room.activeCase === null) return Response.json({ error: "Ce n’est pas ton tour" }, { status: 409 });
      const questionIndex = (19 - room.turnIndex + 40) % 20;
      const correct = body.answerIndex === qualificationQuestions[questionIndex].answer;
      const points = room.activeCase % 4 === 0 ? 3 : room.activeCase % 3 === 0 ? 2 : 1;
      const nextTurn = room.turnIndex + 1;
      await db.batch([
        db.insert(gameAnswers).values({ id: crypto.randomUUID(), roomId: room.id, playerId: player.id, phase: "final", questionKey: String(room.turnIndex), answerIndex: body.answerIndex ?? -1, correct, responseMs: Math.max(0, body.elapsedMs || 0) }),
        db.update(roomPlayers).set({ finalScore: player.finalScore + (correct ? points : 0) }).where(eq(roomPlayers.id, player.id)),
        db.update(rooms).set({ phase: nextTurn >= 12 ? "finished" : "final-pick", turnIndex: nextTurn, activeCase: null, status: nextTurn >= 12 ? "finished" : "playing", phaseStartedAt: new Date().toISOString() }).where(eq(rooms.id, room.id)),
      ]);
    } else if (body.action === "leave") {
      if (room.hostPlayerId === player.id) {
        await db.delete(rooms).where(eq(rooms.id, room.id));
        return Response.json({ closed: true });
      }
      await db.delete(roomPlayers).where(and(eq(roomPlayers.id, player.id), eq(roomPlayers.roomId, room.id)));
    } else if (body.action === "kick") {
      if (room.hostPlayerId !== player.id) return Response.json({ error: "Seul l’hôte peut exclure un joueur" }, { status: 403 });
      if (!body.targetPlayerId || body.targetPlayerId === player.id) return Response.json({ error: "Joueur invalide" }, { status: 400 });
      const target = room.players.find(item => item.id === body.targetPlayerId);
      if (!target) return Response.json({ error: "Ce joueur n’est plus dans le salon" }, { status: 404 });
      await db.delete(roomPlayers).where(and(eq(roomPlayers.id, target.id), eq(roomPlayers.roomId, room.id)));
    } else {
      return Response.json({ error: "Action inconnue" }, { status: 400 });
    }
    return Response.json({ room: await advanceQualificationIfComplete(code) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 500 });
  }
}
