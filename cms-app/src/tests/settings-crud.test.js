/* eslint-env vitest */
import { beforeAll, afterAll, beforeEach, describe, expect, test } from 'vitest';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
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
import { getWashPrices, updateWashPrices } from "../api/settings-crud.js";

const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8080);

const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

const settingsDocRef = doc(db, "settings", "washPrices");

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
        throw createError;
      }
    }
  }
});

afterAll(async () => {
  await deleteDoc(settingsDocRef).catch(() => {});
  await signOut(auth);
  await deleteApp(app);
});

// Start each test with a clean slate
beforeEach(async () => {
  await deleteDoc(settingsDocRef).catch(() => {});
});

describe("settings-crud (emulator)", () => {
  describe("getWashPrices", () => {
    test("returns hardcoded defaults when document does not exist", async () => {
      const prices = await getWashPrices();
      expect(prices).toEqual({ B: 10.00, D: 13.50, U: 16.50 });
    });

    test("returns stored prices when document exists", async () => {
      await updateWashPrices({ B: 9.00, D: 12.00, U: 15.00 });
      const prices = await getWashPrices();
      expect(prices).toEqual({ B: 9.00, D: 12.00, U: 15.00 });
    });

    test("falls back to defaults for any keys missing from the document", async () => {
      // Write a partial doc directly, bypassing updateWashPrices
      await setDoc(settingsDocRef, { B: 8.00 });
      const prices = await getWashPrices();
      expect(prices.B).toBe(8.00);
      expect(prices.D).toBe(13.50);
      expect(prices.U).toBe(16.50);
    });
  });

  describe("updateWashPrices", () => {
    test("writes prices that are readable back via getWashPrices", async () => {
      await updateWashPrices({ B: 11.00, D: 14.00, U: 17.00 });
      const prices = await getWashPrices();
      expect(prices).toEqual({ B: 11.00, D: 14.00, U: 17.00 });
    });

    test("overwrites previously stored prices completely", async () => {
      await updateWashPrices({ B: 9.00, D: 12.00, U: 15.00 });
      await updateWashPrices({ B: 20.00, D: 25.00, U: 30.00 });
      const prices = await getWashPrices();
      expect(prices).toEqual({ B: 20.00, D: 25.00, U: 30.00 });
    });
  });
});
