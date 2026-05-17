/* eslint-env vitest */
import { beforeAll, afterAll, describe, expect, test } from "vitest";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { deleteApp } from "firebase/app";
import { app } from "../api/firebaseconfig.js";
import { getNextVisitId } from "../api/visit-counter.js";

const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8080);

const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

beforeAll(async () => {
  try {
    await signInWithEmailAndPassword(auth, "test@example.com", "password123");
  } catch {
    try {
      await createUserWithEmailAndPassword(auth, "test@example.com", "password123");
    } catch (createError) {
      if (createError.code === "auth/email-already-in-use") {
        await signInWithEmailAndPassword(auth, "test@example.com", "password123");
      } else {
        throw createError;
      }
    }
  }
});

afterAll(async () => {
  await deleteDoc(doc(db, "counters", "visitIds")).catch(() => {});
  await signOut(auth);
  await deleteApp(app);
});

describe("Visit ID counter (emulator)", () => {
  test("initializes the visit counter at 1 when it does not exist", async () => {
    await deleteDoc(doc(db, "counters", "visitIds")).catch(() => {});

    const nextId = await getNextVisitId();

    expect(nextId).toBe(1);

    const counterDoc = await getDoc(doc(db, "counters", "visitIds"));
    expect(counterDoc.exists()).toBe(true);
    expect(counterDoc.data()).toEqual({ next: 1 });
  });

  test("increments and returns the next visit ID", async () => {
    await setDoc(doc(db, "counters", "visitIds"), { next: 41 });

    const nextId = await getNextVisitId();

    expect(nextId).toBe(42);

    const counterDoc = await getDoc(doc(db, "counters", "visitIds"));
    expect(counterDoc.data()).toEqual({ next: 42 });
  });

  test("returns sequential IDs across multiple calls", async () => {
    await deleteDoc(doc(db, "counters", "visitIds")).catch(() => {});

    const first = await getNextVisitId();
    const second = await getNextVisitId();
    const third = await getNextVisitId();

    expect(first).toBe(1);
    expect(second).toBe(2);
    expect(third).toBe(3);

    const counterDoc = await getDoc(doc(db, "counters", "visitIds"));
    expect(counterDoc.data()).toEqual({ next: 3 });
  });
});
