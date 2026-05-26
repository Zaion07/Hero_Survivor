import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "./firebase";

export type RankingPlayer = {
  id: string;
  username: string;
  score: number;
  kills: number;
  survivalTime: number;
};

export async function savePlayerScore(
  userId: string,
  score: number,
  kills: number,
  survivalTime: number
): Promise<void> {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  const username = userSnap.exists()
    ? userSnap.data().username
    : "Jogador";

  const rankingRef = doc(db, "ranking", userId);
  const rankingSnap = await getDoc(rankingRef);

  const currentBestScore = rankingSnap.exists()
    ? rankingSnap.data().score ?? 0
    : 0;

  if (score <= currentBestScore) {
    return;
  }

  await setDoc(rankingRef, {
    username,
    score,
    kills,
    survivalTime,
    updatedAt: serverTimestamp(),
  });
}

export async function getGlobalRanking(): Promise<RankingPlayer[]> {
  const rankingQuery = query(
    collection(db, "ranking"),
    orderBy("score", "desc"),
    limit(10)
  );

  const snapshot = await getDocs(rankingQuery);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    username: docSnap.data().username ?? "Jogador",
    score: docSnap.data().score ?? 0,
    kills: docSnap.data().kills ?? 0,
    survivalTime: docSnap.data().survivalTime ?? 0,
  }));
}