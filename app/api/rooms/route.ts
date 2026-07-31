import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { roomPlayers, rooms } from "../../../db/schema";

async function getRoom(code: string) {
  const db = await getDb();
  const [room] = await db.select().from(rooms).where(eq(rooms.code, code.toUpperCase())).limit(1);
  if (!room) return null;
  const players = await db.select().from(roomPlayers).where(eq(roomPlayers.roomId, room.id)).orderBy(asc(roomPlayers.joinedAt));
  return { ...room, players };
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase();
    if (!code) return Response.json({ error: "Code manquant" }, { status: 400 });
    const room = await getRoom(code);
    return room ? Response.json({ room }) : Response.json({ error: "Salon introuvable" }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string; code?: string; name?: string; playerId?: string; color?: string };
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
    const player = room.players.find(p => p.id === body.playerId);
    if (!player) return Response.json({ error: "Joueur introuvable" }, { status: 404 });

    if (body.action === "ready") {
      await db.update(roomPlayers).set({ ready: !player.ready }).where(and(eq(roomPlayers.id, player.id), eq(roomPlayers.roomId, room.id)));
    } else if (body.action === "start") {
      if (room.hostPlayerId !== player.id) return Response.json({ error: "Seul l’hôte peut lancer" }, { status: 403 });
      if (room.players.length < 2) return Response.json({ error: "Il faut au moins 2 joueurs" }, { status: 409 });
      if (room.players.some(p => !p.ready)) return Response.json({ error: "Tous les joueurs ne sont pas prêts" }, { status: 409 });
      await db.update(rooms).set({ status: "playing", startedAt: new Date().toISOString() }).where(eq(rooms.id, room.id));
    } else if (body.action === "leave") {
      await db.delete(roomPlayers).where(and(eq(roomPlayers.id, player.id), eq(roomPlayers.roomId, room.id)));
    } else {
      return Response.json({ error: "Action inconnue" }, { status: 400 });
    }
    return Response.json({ room: await getRoom(code) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 500 });
  }
}
