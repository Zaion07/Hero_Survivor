import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  inMemoryPersistence,
  User
} from "firebase/auth";

import {
  doc,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { auth, db } from "./firebase";

export async function registerUser(
  username: string,
  email: string,
  password: string
): Promise<User> {
  await setPersistence(auth, inMemoryPersistence);

  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = credential.user;

  await setDoc(doc(db, "users", user.uid), {
    username,
    email,
    bestScore: 0,
    createdAt: serverTimestamp()
  });

  await setDoc(doc(db, "ranking", user.uid), {
    username,
    score: 0,
    updatedAt: serverTimestamp()
  });

  return user;
}

export async function loginUser(
  email: string,
  password: string
): Promise<User> {
  await setPersistence(auth, inMemoryPersistence);

  const credential = await signInWithEmailAndPassword(auth, email, password);

  return credential.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}