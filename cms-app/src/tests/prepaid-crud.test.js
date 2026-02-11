/* eslint-env vitest */
import { beforeAll, afterAll, describe, expect, test, vi } from 'vitest';
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

// Connect to the Firestore emulator using the same app instance
const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8080);

// Connect to the Auth emulator
const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

// Import all functions from prepaid-crud.js
import {
  createPrepaidMember,
  getPrepaidMember,
  getAllPrepaidMembers,
  updatePrepaidMember,
  deletePrepaidMember,
} from "../api/prepaid-crud.js";

// Authenticate a test user before running tests
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

// Cleanup after all tests to prevent hanging processes
afterAll(async () => {
  await signOut(auth);
  await deleteApp(app);
});

// Helper function to generate unique IDs for testing
function uniqId(prefix = "prepaid") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// Helper function to clean up test documents
async function cleanupTestDoc(id) {
  try {
    await deleteDoc(doc(db, "prepaidMembers", id));
  } catch (error) {
    console.error(error.message);
  }
}

describe("Prepaid CRUD Operations (emulator)", () => {
  describe("createPrepaidMember", () => {
    test("successfully creates a new prepaid member document", async () => {
      const id = uniqId("create");
      const name = "John Doe";
      const type = "B";
      const issueDate = "2025-01-15";
      const lastVisitDate = "2025-06-01";
      const prepaidWashes = 10;
      const notes = "Bulk purchase";

      const returnedId = await createPrepaidMember(id, name, type, issueDate, lastVisitDate, prepaidWashes, notes);

      expect(returnedId).toBe(id);

      // Verify using getPrepaidMember
      const member = await getPrepaidMember(id);
      expect(member).toEqual({
        id: id,
        name: name,
        type: type,
        issueDate: issueDate,
        lastVisitDate: lastVisitDate,
        prepaidWashes: prepaidWashes,
        notes: notes,
        email: '',
      });

      await cleanupTestDoc(id);
    });

    test("overwrites existing prepaid member document", async () => {
      const id = uniqId("overwrite");

      await createPrepaidMember(id, "Old Name", "B", "2024-01-01", "2024-06-01", 5, "Old notes");
      await createPrepaidMember(id, "New Name", "D", "2025-02-02", "2025-07-01", 15, "New notes");

      const member = await getPrepaidMember(id);
      expect(member.name).toBe("New Name");
      expect(member.type).toBe("D");
      expect(member.issueDate).toBe("2025-02-02");
      expect(member.lastVisitDate).toBe("2025-07-01");
      expect(member.prepaidWashes).toBe(15);
      expect(member.notes).toBe("New notes");

      await cleanupTestDoc(id);
    });

    test("creates prepaid members with different wash types", async () => {
      const idB = uniqId("typeB");
      const idD = uniqId("typeD");
      const idU = uniqId("typeU");

      await createPrepaidMember(idB, "Basic User", "B", "2025-01-01", "2025-06-01", 5, "");
      await createPrepaidMember(idD, "Deluxe User", "D", "2025-01-01", "2025-06-01", 5, "");
      await createPrepaidMember(idU, "Ultimate User", "U", "2025-01-01", "2025-06-01", 5, "");

      const memberB = await getPrepaidMember(idB);
      const memberD = await getPrepaidMember(idD);
      const memberU = await getPrepaidMember(idU);

      expect(memberB.type).toBe("B");
      expect(memberD.type).toBe("D");
      expect(memberU.type).toBe("U");

      await cleanupTestDoc(idB);
      await cleanupTestDoc(idD);
      await cleanupTestDoc(idU);
    });
  });

  describe("getPrepaidMember", () => {
    test("retrieves an existing prepaid member document", async () => {
      const id = uniqId("get");
      const name = "Jane Smith";
      const type = "U";
      const issueDate = "2025-03-10";
      const lastVisitDate = "2025-05-20";
      const prepaidWashes = 3;
      const notes = "Test member";

      await createPrepaidMember(id, name, type, issueDate, lastVisitDate, prepaidWashes, notes);

      const member = await getPrepaidMember(id);

      expect(member).toBeDefined();
      expect(member.id).toBe(id);
      expect(member.name).toBe(name);
      expect(member.type).toBe(type);
      expect(member.issueDate).toBe(issueDate);
      expect(member.lastVisitDate).toBe(lastVisitDate);
      expect(member.prepaidWashes).toBe(prepaidWashes);
      expect(member.notes).toBe(notes);

      await cleanupTestDoc(id);
    });

    test("returns null for non-existent prepaid member", async () => {
      const id = uniqId("nonexistent");
      const member = await getPrepaidMember(id);

      expect(member).toBeNull();
    });
  });

  describe("getAllPrepaidMembers", () => {
    test("retrieves all prepaid member documents", async () => {
      const id1 = uniqId("all1");
      const id2 = uniqId("all2");
      const id3 = uniqId("all3");

      await createPrepaidMember(id1, "Member 1", "B", "2025-01-01", "2025-06-01", 10, "Notes 1");
      await createPrepaidMember(id2, "Member 2", "D", "2025-02-01", "2025-06-15", 5, "Notes 2");
      await createPrepaidMember(id3, "Member 3", "U", "2025-03-01", "2025-07-01", 0, "Notes 3");

      const allMembers = await getAllPrepaidMembers();

      // Should include at least our 3 test members
      expect(allMembers.length).toBeGreaterThanOrEqual(3);

      const testMembers = allMembers.filter(
        (m) => m.id === id1 || m.id === id2 || m.id === id3
      );
      expect(testMembers.length).toBe(3);

      await cleanupTestDoc(id1);
      await cleanupTestDoc(id2);
      await cleanupTestDoc(id3);
    });

    test("returns empty array when no prepaid members exist", async () => {
      const allMembers = await getAllPrepaidMembers();
      expect(Array.isArray(allMembers)).toBe(true);
    });
  });

  describe("updatePrepaidMember", () => {
    test("updates specific fields of a prepaid member", async () => {
      const id = uniqId("update");

      await createPrepaidMember(id, "Original Name", "B", "2025-01-01", "2025-06-01", 10, "Original notes");

      await updatePrepaidMember(id, {
        lastVisitDate: "2025-08-01",
        prepaidWashes: 9,
        notes: "Used one wash",
      });

      const member = await getPrepaidMember(id);
      expect(member.name).toBe("Original Name"); // Should remain unchanged
      expect(member.type).toBe("B"); // Should remain unchanged
      expect(member.issueDate).toBe("2025-01-01"); // Should remain unchanged
      expect(member.lastVisitDate).toBe("2025-08-01");
      expect(member.prepaidWashes).toBe(9);
      expect(member.notes).toBe("Used one wash");

      await cleanupTestDoc(id);
    });

    test("updates only one field", async () => {
      const id = uniqId("partial");

      await createPrepaidMember(id, "Test Member", "D", "2025-01-01", "2025-06-01", 5, "Notes");

      await updatePrepaidMember(id, {
        prepaidWashes: 4,
      });

      const member = await getPrepaidMember(id);
      expect(member.name).toBe("Test Member");
      expect(member.type).toBe("D");
      expect(member.issueDate).toBe("2025-01-01");
      expect(member.lastVisitDate).toBe("2025-06-01");
      expect(member.notes).toBe("Notes");
      expect(member.prepaidWashes).toBe(4);

      await cleanupTestDoc(id);
    });

    test("updates the wash type", async () => {
      const id = uniqId("typechg");

      await createPrepaidMember(id, "Type Change", "B", "2025-01-01", "2025-06-01", 5, "");

      await updatePrepaidMember(id, { type: "U" });

      const member = await getPrepaidMember(id);
      expect(member.type).toBe("U");
      expect(member.prepaidWashes).toBe(5); // Should remain unchanged

      await cleanupTestDoc(id);
    });

    test("throws error when updating non-existent prepaid member", async () => {
      const id = uniqId("noexist");
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        updatePrepaidMember(id, { prepaidWashes: 10 })
      ).rejects.toThrow(`Prepaid member with ID ${id} does not exist`);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("deletePrepaidMember", () => {
    test("deletes an existing prepaid member document", async () => {
      const id = uniqId("delete");

      await createPrepaidMember(id, "Delete Member", "B", "2025-01-01", "2025-06-01", 3, "Notes");

      // Verify it exists
      let member = await getPrepaidMember(id);
      expect(member).toBeDefined();

      // Delete it
      const deletedId = await deletePrepaidMember(id);
      expect(deletedId).toBe(id);

      // Verify it's gone
      member = await getPrepaidMember(id);
      expect(member).toBeNull();
    });

    test("throws error when deleting non-existent prepaid member", async () => {
      const id = uniqId("nothere");
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(deletePrepaidMember(id)).rejects.toThrow(
        `Prepaid member with ID ${id} does not exist`
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Integration tests", () => {
    test("complete CRUD workflow", async () => {
      const id = uniqId("workflow");

      // Create
      await createPrepaidMember(id, "Workflow Member", "B", "2025-01-01", "2025-06-01", 10, "New prepaid member");
      let member = await getPrepaidMember(id);
      expect(member.name).toBe("Workflow Member");
      expect(member.type).toBe("B");
      expect(member.prepaidWashes).toBe(10);

      // Update — simulate a wash visit
      await updatePrepaidMember(id, { lastVisitDate: "2025-08-15", prepaidWashes: 9, notes: "Used one wash" });
      member = await getPrepaidMember(id);
      expect(member.lastVisitDate).toBe("2025-08-15");
      expect(member.prepaidWashes).toBe(9);
      expect(member.notes).toBe("Used one wash");

      // Read from list
      const allMembers = await getAllPrepaidMembers();
      const foundMember = allMembers.find((m) => m.id === id);
      expect(foundMember).toBeDefined();

      // Delete
      await deletePrepaidMember(id);
      member = await getPrepaidMember(id);
      expect(member).toBeNull();
    });

    test("prepaid washes decrement to zero", async () => {
      const id = uniqId("zero");

      await createPrepaidMember(id, "Zero Wash", "D", "2025-01-01", "2025-06-01", 2, "");

      // Use first wash
      await updatePrepaidMember(id, { prepaidWashes: 1, lastVisitDate: "2025-07-01" });
      let member = await getPrepaidMember(id);
      expect(member.prepaidWashes).toBe(1);

      // Use last wash
      await updatePrepaidMember(id, { prepaidWashes: 0, lastVisitDate: "2025-07-15" });
      member = await getPrepaidMember(id);
      expect(member.prepaidWashes).toBe(0);

      await cleanupTestDoc(id);
    });
  });
});
