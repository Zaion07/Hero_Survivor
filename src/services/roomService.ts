import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  Unsubscribe,
} from 'firebase/firestore';

import { auth, db } from './firebase';
import { CFG } from '../config';

// =============================================================
//  roomService — salas online de Battle Royale via Firestore
//
//  rooms/{code}                     — estado da sala
//  rooms/{code}/players/{uid}       — estado de cada jogador
//  rooms/{code}/players/{uid}/hits  — dano PvP recebido
// =============================================================

export type RoomStatus = 'waiting' | 'prep' | 'arena' | 'finished';

/** Keyframe da zona: círculo (x, y, r) no segundo t desde o início da arena */
export interface ZoneKeyframe {
  x: number;
  y: number;
  r: number;
  t: number;
}

export interface RoomData {
  code: string;
  hostUid: string;
  status: RoomStatus;
  prepSeconds: number;
  maxPlayers: number;
  prepStartMs: number | null;
  arenaStartMs: number | null;
  zones: ZoneKeyframe[];
  winnerUid: string | null;
  winnerName: string | null;
}

export interface RoomPlayer {
  uid: string;
  username: string;
  charId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  kills: number;
  alive: boolean;
}

export interface PvpHit {
  dmg: number;
  fromUid: string;
  fromName: string;
}

let currentCode: string | null = null;

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(len = 5): string {
  let code = '';

  for (let i = 0; i < len; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }

  return code;
}

function normalizeMaxPlayers(maxPlayers: number): number {
  return Math.min(5, Math.max(2, Number(maxPlayers) || 2));
}

function cleanName(name?: string): string {
  const value = (name ?? '').trim();

  if (!value) return 'Jogador';

  return value.slice(0, 18);
}

function myUid(): string {
  const uid = auth.currentUser?.uid;

  if (!uid) throw new Error('Usuário não autenticado');

  return uid;
}

let cachedUsername: string | null = null;

async function myUsername(): Promise<string> {
  if (cachedUsername) return cachedUsername;

  try {
    const uid = myUid();
    const snap = await getDoc(doc(db, 'users', uid));
    const name: string = snap.exists() ? (snap.data().username ?? 'Jogador') : 'Jogador';

    cachedUsername = cleanName(name);
    return cachedUsername;
  } catch (error) {
    // Se a regra do Firestore bloquear leitura em users/{uid},
    // não deixa a criação da sala falhar por causa do nome.
    const fallback = auth.currentUser?.email?.split('@')[0] ?? 'Jogador';
    cachedUsername = cleanName(fallback);
    return cachedUsername;
  }
}

async function resolveUsername(playerName?: string): Promise<string> {
  const typedName = cleanName(playerName);

  if (typedName !== 'Jogador') return typedName;

  return myUsername();
}

export function getCurrentRoomCode(): string | null {
  return currentCode;
}

export function isHost(room: RoomData): boolean {
  return room.hostUid === auth.currentUser?.uid;
}

// ── Criação / entrada / saída ──────────────────────────────

export async function createRoom(
  prepSeconds: number,
  charId: string,
  maxPlayers: number = 2,
  playerName?: string,
): Promise<string> {
  const safeMaxPlayers = normalizeMaxPlayers(maxPlayers);
  let code = randomCode();
  let roomRef = doc(db, 'rooms', code);
  let snap = await getDoc(roomRef);

  while (snap.exists()) {
    code = randomCode();
    roomRef = doc(db, 'rooms', code);
    snap = await getDoc(roomRef);
  }

  const uid = myUid();

  await setDoc(roomRef, {
    code,
    hostUid: uid,
    status: 'waiting',
    prepSeconds,
    maxPlayers: safeMaxPlayers,
    prepStartMs: null,
    arenaStartMs: null,
    zones: [],
    winnerUid: null,
    winnerName: null,
    createdAt: serverTimestamp(),
  });

  await joinRoomDoc(code, charId, playerName);

  return code;
}

export async function joinRoom(
  code: string,
  charId: string,
  playerName?: string,
): Promise<string | null> {
  const normalized = code.trim().toUpperCase();
  const roomRef = doc(db, 'rooms', normalized);
  const snap = await getDoc(roomRef);

  if (!snap.exists()) return null;

  const room = snap.data();

  if (room.status !== 'waiting') return null;

  const maxPlayers = normalizeMaxPlayers(room.maxPlayers ?? 2);
  const playersRef = collection(db, 'rooms', normalized, 'players');
  const playersSnap = await getDocs(playersRef);

  const uid = myUid();
  const alreadyInRoom = playersSnap.docs.some(playerDoc => playerDoc.id === uid);

  if (!alreadyInRoom && playersSnap.size >= maxPlayers) {
    return null;
  }

  await joinRoomDoc(normalized, charId, playerName);

  return normalized;
}

async function joinRoomDoc(code: string, charId: string, playerName?: string): Promise<void> {
  const uid = myUid();
  const username = await resolveUsername(playerName);
  const def = CFG.CHARACTERS[charId] ?? CFG.CHARACTERS['KNIGHT'];

  await setDoc(doc(db, 'rooms', code, 'players', uid), {
    uid,
    username,
    charId,
    x: 0,
    y: 0,
    hp: def.maxHp,
    maxHp: def.maxHp,
    level: 1,
    kills: 0,
    alive: true,
  });

  currentCode = code;
}

export async function leaveRoom(): Promise<void> {
  if (!currentCode) return;

  const code = currentCode;
  currentCode = null;

  try {
    const uid = myUid();
    const roomRef = doc(db, 'rooms', code);
    const snap = await getDoc(roomRef);

    await deleteDoc(doc(db, 'rooms', code, 'players', uid));

    // Líder saindo de sala em espera → desfaz a sala.
    if (snap.exists() && snap.data().hostUid === uid && snap.data().status === 'waiting') {
      const players = await getDocs(collection(db, 'rooms', code, 'players'));
      await Promise.all(players.docs.map(p => deleteDoc(p.ref)));
      await deleteDoc(roomRef);
    }
  } catch (error) {
    console.error('Erro ao sair da sala:', error);
  }
}

// ── Listeners em tempo real ────────────────────────────────

export function listenRoom(code: string, cb: (room: RoomData | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'rooms', code), snap => {
    if (!snap.exists()) {
      cb(null);
      return;
    }

    const d = snap.data();

    cb({
      code,
      hostUid: d.hostUid,
      status: d.status,
      prepSeconds: d.prepSeconds ?? 300,
      maxPlayers: normalizeMaxPlayers(d.maxPlayers ?? 2),
      prepStartMs: d.prepStartMs ?? null,
      arenaStartMs: d.arenaStartMs ?? null,
      zones: d.zones ?? [],
      winnerUid: d.winnerUid ?? null,
      winnerName: d.winnerName ?? null,
    });
  });
}

export function listenPlayers(code: string, cb: (players: RoomPlayer[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'rooms', code, 'players'), snap => {
    cb(snap.docs.map(d => d.data() as RoomPlayer));
  });
}

/** Escuta o dano PvP recebido; aplica e remove cada hit. */
export function listenMyHits(code: string, cb: (hit: PvpHit) => void): Unsubscribe {
  const uid = myUid();

  return onSnapshot(collection(db, 'rooms', code, 'players', uid, 'hits'), snap => {
    snap.docChanges().forEach(change => {
      if (change.type !== 'added') return;

      cb(change.doc.data() as PvpHit);
      void deleteDoc(change.doc.ref);
    });
  });
}

// ── Atualizações de estado ─────────────────────────────────

export async function updateRoomSettings(code: string, prepSeconds: number): Promise<void> {
  await updateDoc(doc(db, 'rooms', code), { prepSeconds });
}

export async function updateRoomMaxPlayers(code: string, maxPlayers: number): Promise<void> {
  await updateDoc(doc(db, 'rooms', code), {
    maxPlayers: normalizeMaxPlayers(maxPlayers),
  });
}

export async function startPrep(code: string): Promise<void> {
  await updateDoc(doc(db, 'rooms', code), {
    status: 'prep',
    prepStartMs: Date.now(),
  });
}

export async function startArena(code: string, zones: ZoneKeyframe[]): Promise<void> {
  await updateDoc(doc(db, 'rooms', code), {
    status: 'arena',
    arenaStartMs: Date.now(),
    zones,
  });
}

export async function finishRoom(
  code: string,
  winnerUid: string,
  winnerName: string,
): Promise<void> {
  await updateDoc(doc(db, 'rooms', code), {
    status: 'finished',
    winnerUid,
    winnerName,
  });
}

export function pushMyState(code: string, state: Partial<RoomPlayer>): void {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  void updateDoc(doc(db, 'rooms', code, 'players', uid), state).catch(() => {});
}

export async function sendHit(code: string, targetUid: string, dmg: number): Promise<void> {
  const uid = myUid();
  const username = await myUsername();

  await addDoc(collection(db, 'rooms', code, 'players', targetUid, 'hits'), {
    dmg,
    fromUid: uid,
    fromName: username,
  });
}

export function awardKill(code: string, killerUid: string): void {
  void updateDoc(doc(db, 'rooms', code, 'players', killerUid), {
    kills: increment(1),
  }).catch(() => {});
}

// ── Geração das zonas (executada pelo líder) ───────────────

export function generateZones(): ZoneKeyframe[] {
  const W = CFG.WORLD;
  const HOLD = 18;
  const SHRINK = 22;
  const STAGES = 5;

  const zones: ZoneKeyframe[] = [];

  let x = W / 2;
  let y = W / 2;
  let r = W * 0.7;
  let t = 0;

  zones.push({ x, y, r, t });

  for (let i = 0; i < STAGES; i++) {
    t += HOLD;
    zones.push({ x, y, r, t });

    const nr = Math.max(150, r * 0.55);
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * Math.max(0, r - nr);
    const margin = 120;

    const nx = Math.min(
      W - nr - margin,
      Math.max(nr + margin, x + Math.cos(angle) * dist),
    );

    const ny = Math.min(
      W - nr - margin,
      Math.max(nr + margin, y + Math.sin(angle) * dist),
    );

    t += SHRINK;
    zones.push({ x: nx, y: ny, r: nr, t });

    x = nx;
    y = ny;
    r = nr;
  }

  t += 9999;
  zones.push({ x, y, r, t });

  return zones;
}

/** Círculo atual interpolado + próximo círculo-alvo, dado o tempo de arena. */
export function getZoneAt(
  zones: ZoneKeyframe[],
  elapsedSec: number,
): { current: ZoneKeyframe; target: ZoneKeyframe | null } {
  if (zones.length === 0) {
    const c = {
      x: CFG.WORLD / 2,
      y: CFG.WORLD / 2,
      r: CFG.WORLD,
      t: 0,
    };

    return { current: c, target: null };
  }

  let i = 0;

  while (i < zones.length - 1 && zones[i + 1].t <= elapsedSec) {
    i++;
  }

  const a = zones[i];
  const b = zones[Math.min(i + 1, zones.length - 1)];
  const span = b.t - a.t;
  const f = span > 0 ? Math.min(1, Math.max(0, (elapsedSec - a.t) / span)) : 1;

  const current = {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    r: a.r + (b.r - a.r) * f,
    t: elapsedSec,
  };

  let target: ZoneKeyframe | null = null;

  for (let j = i + 1; j < zones.length; j++) {
    const z = zones[j];

    if (z.x !== current.x || z.y !== current.y || Math.abs(z.r - current.r) > 1) {
      target = z;
      break;
    }
  }

  return { current, target };
}
