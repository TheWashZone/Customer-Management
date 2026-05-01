import { beforeAll, afterAll, describe, expect, test } from 'vitest';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
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
import {
  createVisit,
  getVisit,
  getAllVisits,
  updateVisit,
  deleteVisit,
  logVisit,
} from "../api/visits-crud.js";

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
      if (createError.code === 'auth/email-already-in-use') {
        await signInWithEmailAndPassword(auth, "test@example.com", "password123");
      } else {
        console.error("Failed to authenticate test user:", createError);
        throw createError;
      }
    }
  }
});

afterAll(async () => {
  await signOut(auth);
  await deleteApp(app);
});

async function cleanupVisit(visitId) {
  try {
    await deleteDoc(doc(db, "Visits", visitId));
  } catch (error) {
    console.error(error.message);
  }
}

describe("Visits CRUD Operations (emulator)", () => {
  test("creates a visit with backend-generated id and timestamp", async () => {
    const visitId = await createVisit({
      visitId: 'frontend-id',
      date: '2000-01-01',
      typeOfWash: 'B',
      typeOfPayment: 'cash',
      monthlyId: 'M123',
      userId: 'U123'
    });

    expect(visitId).not.toBe('frontend-id');

    const visit = await getVisit(visitId);
    expect(visit).toBeDefined();
    expect(visit.id).toBe(visitId);
    expect(visit.typeOfWash).toBe('B');
    expect(visit.typeOfPayment).toBe('cash');
    expect(visit.monthlyId).toBe('M123');
    expect(visit.userId).toBe('U123');
    expect(visit.visitId).toBeUndefined();
    expect(visit.date).toBeDefined();
    expect(visit.createdAt).toBeDefined();

    await cleanupVisit(visitId);
  });

  test("logs visits through the helper alias", async () => {
    const visitId = await logVisit({
      typeOfWash: 'D',
      typeOfPayment: 'free'
    });

    const visit = await getVisit(visitId);
    expect(visit.typeOfWash).toBe('D');
    expect(visit.typeOfPayment).toBe('free');

    await cleanupVisit(visitId);
  });

  test("returns all visits and updates fields without allowing frontend ids or dates", async () => {
    const visitId = await createVisit({
      typeOfWash: 'U',
      typeOfPayment: 'book',
      monthlyId: 'M777'
    });

    await updateVisit(visitId, {
      visitId: 'blocked',
      date: '2001-01-01',
      typeOfPayment: 'credit',
      userId: 'USER-1'
    });

    const visits = await getAllVisits();
    const matchedVisit = visits.find((item) => item.id === visitId);

    expect(matchedVisit).toBeDefined();
    expect(matchedVisit.typeOfPayment).toBe('credit');
    expect(matchedVisit.userId).toBe('USER-1');
    expect(matchedVisit.visitId).toBeUndefined();

    await cleanupVisit(visitId);
  });

  test("deletes an existing visit document", async () => {
    const visitId = await createVisit({
      typeOfWash: 'B',
      typeOfPayment: 'cash'
    });

    const deletedId = await deleteVisit(visitId);
    expect(deletedId).toBe(visitId);

    const visit = await getVisit(visitId);
    expect(visit).toBeNull();
  });
});