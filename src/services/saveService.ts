import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// =============================================================
//  saveService — salvar/retomar partida solo (saves/{uid})
// =============================================================

export interface SavedWeapon {
  type: string;
  level: number;
}

export interface GameSave {
  charId: string;
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  maxHp: number;
  speed: number;
  damageMult: number;
  cooldownMult: number;
  pickupRadius: number;
  regen: number;
  abilityLevel: number;
  ultReadyIn: number;
  weapons: SavedWeapon[];
  elapsedSeconds: number;
  kills: number;
  savedAt: number;
}

export async function saveGame(save: GameSave): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await setDoc(doc(db, 'saves', uid), save);
}

export async function loadGame(): Promise<GameSave | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'saves', uid));
  if (!snap.exists()) return null;
  return snap.data() as GameSave;
}

export async function clearSave(): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    await deleteDoc(doc(db, 'saves', uid));
  } catch (error) {
    console.error('Erro ao apagar save:', error);
  }
}
