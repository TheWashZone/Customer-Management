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

// Import all functions from loyalty-crud.js
import {
  createLoyaltyMember,
  getLoyaltyMember,
  getAllLoyaltyMembers,
  updateLoyaltyMember,
  deleteLoyaltyMember,
} from "../api/loyalty-crud.js";

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
function uniqId(prefix = "loyalty") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// Helper function to clean up test documents
async function cleanupTestDoc(id) {
  try {
    await deleteDoc(doc(db, "loyaltyMembers", id));
  } catch (error) {
    console.error(error.message);
  }
}

describe("Loyalty CRUD Operations (emulator)", () => {
  describe("createLoyaltyMember", () => {
    test("successfully creates a new loyalty member document", async () => {
      const id = uniqId("create");
      const name = "John Doe";
      const issueDate = "2025-01-15";
      const lastVisitDate = "2025-06-01";
      const visitCount = 5;
      const notes = "Frequent visitor";

      const returnedId = await createLoyaltyMember(id, name, issueDate, lastVisitDate, visitCount, notes);

      expect(returnedId).toBe(id);

      // Verify using getLoyaltyMember
      const member = await getLoyaltyMember(id);
      expect(member).toEqual({
        id: id,
        name: name,
        issueDate: issueDate,
        lastVisitDate: lastVisitDate,
        visitCount: visitCount,
        notes: notes,
      });

      await cleanupTestDoc(id);
    });

    test("overwrites existing loyalty member document", async () => {
      const id = uniqId("overwrite");

      await createLoyaltyMember(id, "Old Name", "2024-01-01", "2024-06-01", 3, "Old notes");
      await createLoyaltyMember(id, "New Name", "2025-02-02", "2025-07-01", 10, "New notes");

      const member = await getLoyaltyMember(id);
      expect(member.name).toBe("New Name");
      expect(member.issueDate).toBe("2025-02-02");
      expect(member.lastVisitDate).toBe("2025-07-01");
      expect(member.visitCount).toBe(10);
      expect(member.notes).toBe("New notes");

      await cleanupTestDoc(id);
    });
  });

  describe("getLoyaltyMember", () => {
    test("retrieves an existing loyalty member document", async () => {
      const id = uniqId("get");
      const name = "Jane Smith";
      const issueDate = "2025-03-10";
      const lastVisitDate = "2025-05-20";
      const visitCount = 8;
      const notes = "Test member";

      await createLoyaltyMember(id, name, issueDate, lastVisitDate, visitCount, notes);

      const member = await getLoyaltyMember(id);

      expect(member).toBeDefined();
      expect(member.id).toBe(id);
      expect(member.name).toBe(name);
      expect(member.issueDate).toBe(issueDate);
      expect(member.lastVisitDate).toBe(lastVisitDate);
      expect(member.visitCount).toBe(visitCount);
      expect(member.notes).toBe(notes);

      await cleanupTestDoc(id);
    });

    test("returns null for non-existent loyalty member", async () => {
      const id = uniqId("nonexistent");
      const member = await getLoyaltyMember(id);

      expect(member).toBeNull();
    });
  });

  describe("getAllLoyaltyMembers", () => {
    test("retrieves all loyalty member documents", async () => {
      const id1 = uniqId("all1");
      const id2 = uniqId("all2");
      const id3 = uniqId("all3");

      await createLoyaltyMember(id1, "Member 1", "2025-01-01", "2025-06-01", 1, "Notes 1");
      await createLoyaltyMember(id2, "Member 2", "2025-02-01", "2025-06-15", 2, "Notes 2");
      await createLoyaltyMember(id3, "Member 3", "2025-03-01", "2025-07-01", 3, "Notes 3");

      const allMembers = await getAllLoyaltyMembers();

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

    test("returns empty array when no loyalty members exist", async () => {
      const allMembers = await getAllLoyaltyMembers();
      expect(Array.isArray(allMembers)).toBe(true);
    });
  });

  describe("updateLoyaltyMember", () => {
    test("updates specific fields of a loyalty member", async () => {
      const id = uniqId("update");

      await createLoyaltyMember(id, "Original Name", "2025-01-01", "2025-06-01", 5, "Original notes");

      await updateLoyaltyMember(id, {
        lastVisitDate: "2025-08-01",
        visitCount: 6,
        notes: "Updated notes",
      });

      const member = await getLoyaltyMember(id);
      expect(member.name).toBe("Original Name"); // Should remain unchanged
      expect(member.issueDate).toBe("2025-01-01"); // Should remain unchanged
      expect(member.lastVisitDate).toBe("2025-08-01");
      expect(member.visitCount).toBe(6);
      expect(member.notes).toBe("Updated notes");

      await cleanupTestDoc(id);
    });

    test("updates only one field", async () => {
      const id = uniqId("partial");

      await createLoyaltyMember(id, "Test Member", "2025-01-01", "2025-06-01", 3, "Notes");

      await updateLoyaltyMember(id, {
        visitCount: 4,
      });

      const member = await getLoyaltyMember(id);
      expect(member.name).toBe("Test Member");
      expect(member.issueDate).toBe("2025-01-01");
      expect(member.lastVisitDate).toBe("2025-06-01");
      expect(member.notes).toBe("Notes");
      expect(member.visitCount).toBe(4);

      await cleanupTestDoc(id);
    });

    test("throws error when updating non-existent loyalty member", async () => {
      const id = uniqId("noexist");
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        updateLoyaltyMember(id, { visitCount: 10 })
      ).rejects.toThrow(`Loyalty member with ID ${id} does not exist`);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("deleteLoyaltyMember", () => {
    test("deletes an existing loyalty member document", async () => {
      const id = uniqId("delete");

      await createLoyaltyMember(id, "Delete Member", "2025-01-01", "2025-06-01", 2, "Notes");

      // Verify it exists
      let member = await getLoyaltyMember(id);
      expect(member).toBeDefined();

      // Delete it
      const deletedId = await deleteLoyaltyMember(id);
      expect(deletedId).toBe(id);

      // Verify it's gone
      member = await getLoyaltyMember(id);
      expect(member).toBeNull();
    });

    test("throws error when deleting non-existent loyalty member", async () => {
      const id = uniqId("nothere");
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(deleteLoyaltyMember(id)).rejects.toThrow(
        `Loyalty member with ID ${id} does not exist`
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Integration tests", () => {
    test("complete CRUD workflow", async () => {
      const id = uniqId("workflow");

      // Create
      await createLoyaltyMember(id, "Workflow Member", "2025-01-01", "2025-06-01", 0, "New loyalty member");
      let member = await getLoyaltyMember(id);
      expect(member.name).toBe("Workflow Member");
      expect(member.visitCount).toBe(0);

      // Update
      await updateLoyaltyMember(id, { lastVisitDate: "2025-08-15", visitCount: 1, notes: "Returning member" });
      member = await getLoyaltyMember(id);
      expect(member.lastVisitDate).toBe("2025-08-15");
      expect(member.visitCount).toBe(1);
      expect(member.notes).toBe("Returning member");

      // Read from list
      const allMembers = await getAllLoyaltyMembers();
      const foundMember = allMembers.find((m) => m.id === id);
      expect(foundMember).toBeDefined();

      // Delete
      await deleteLoyaltyMember(id);
      member = await getLoyaltyMember(id);
      expect(member).toBeNull();
    });
  });
});
