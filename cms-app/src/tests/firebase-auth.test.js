import { afterAll, describe, test, expect } from "vitest";
import {
  getAuth,
  connectAuthEmulator,
} from "firebase/auth";
import { deleteApp } from "firebase/app";
import { app } from "../api/firebaseconfig.js";

// Connect to the Auth emulator using the same app instance that firebase-auth.js uses
const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

// Now import the actual functions from firebase-auth.js
// They will use the same auth instance we just connected to the emulator
import { createUser, signIn } from "../api/firebase-auth.js";

// Cleanup after all tests to prevent hanging processes
afterAll(async () => {
  // Delete the Firebase app to close all connections
  await deleteApp(app);
});

function uniqEmail(prefix = "user") {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;
}

describe("Auth wrappers (emulator)", () => {
  test("createUser returns the Firebase user on success", async () => {
    const email = uniqEmail("create");
    const user = await createUser(email, "secret123");
    expect(user).toBeDefined();
    expect(user.email).toBe(email);
  });

  test("createUser throws when email already exists", async () => {
    const email = uniqEmail("dupe");
    await createUser(email, "secret123");
    await expect(createUser(email, "secret123")).rejects.toMatchObject({
      code: "auth/email-already-in-use",
    });
  });

  test("signIn works after createUser", async () => {
    const email = uniqEmail("login");
    await createUser(email, "secret123");
    const user = await signIn(email, "secret123");
    expect(user.email).toBe(email);
  });

  test("signIn throws on wrong password (rethrows from wrapper)", async () => {
    const email = uniqEmail("wrongpass");
    await createUser(email, "secret123");
    await expect(signIn(email, "not-the-password")).rejects.toMatchObject({
      code: expect.stringMatching(/^auth\/(invalid-credential|wrong-password)$/),
    });
  });
});
