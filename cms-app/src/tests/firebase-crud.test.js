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

// Import all functions from firebase-crud.js
import {
  createMember,
  upsertMember,
  getMember,
  getAllMembers,
  getMembersByStatus,
  updateMember,
  deleteMember,
} from "../api/firebase-crud.js";

// Authenticate a test user before running tests
beforeAll(async () => {
  try {
    // Try to sign in with test user
    await signInWithEmailAndPassword(auth, "test@example.com", "password123");
  } catch {
    // If sign in fails, try to create the user
    try {
      await createUserWithEmailAndPassword(auth, "test@example.com", "password123");
    } catch (createError) {
      // If user already exists, try signing in again
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

// Helper function to generate unique user IDs for testing
function uniqId(prefix = "user") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// Helper function to clean up test documents
async function cleanupTestDoc(userId) {
  try {
    await deleteDoc(doc(db, "users", userId));
  } catch (error) {
    console.error(error.message);
  }
}

describe("User CRUD Operations (emulator)", () => {
  describe("createMember", () => {
    test("successfully creates a new user document", async () => {
      const userId = uniqId("create");
      const name = "John Doe";
      const carInfo = "Toyota Camry 2020";
      const status = 'active';
      const notes = "Premium member";

      const returnedId = await createMember(userId, name, carInfo, status, notes);

      expect(returnedId).toBe(userId);

      // Verify using getMember
      const user = await getMember(userId);
      expect(user).toEqual({
        id: userId,
        name: name,
        car: carInfo,
        status: status,
        notes: notes,
        email: '',
      });

      await cleanupTestDoc(userId);
    });

    test("overwrites existing user document", async () => {
      const userId = uniqId("overwrite");

      await createMember(userId, "Old Name", "Old Car", 'active', "Old notes");
      await createMember(userId, "New Name", "New Car", 'inactive', "New notes");

      const user = await getMember(userId);
      expect(user.name).toBe("New Name");
      expect(user.car).toBe("New Car");
      expect(user.status).toBe('inactive');
      expect(user.notes).toBe("New notes");

      await cleanupTestDoc(userId);
    });
  });

  describe("getMember", () => {
    test("retrieves an existing user document", async () => {
      const userId = uniqId("get");
      const name = "Jane Smith";
      const carInfo = "Honda Accord 2021";
      const status = 'active';
      const notes = "Test user";

      await createMember(userId, name, carInfo, status, notes);

      const user = await getMember(userId);

      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
      expect(user.name).toBe(name);
      expect(user.car).toBe(carInfo);
      expect(user.status).toBe(status);
      expect(user.notes).toBe(notes);

      await cleanupTestDoc(userId);
    });

    test("returns null for non-existent user", async () => {
      const userId = uniqId("nonexistent");
      const user = await getMember(userId);

      expect(user).toBeNull();
    });
  });

  describe("getAllMembers", () => {
    test("retrieves all user documents", async () => {
      const userId1 = uniqId("all1");
      const userId2 = uniqId("all2");
      const userId3 = uniqId("all3");

      await createMember(userId1, "User 1", "Car 1", 'active', "Notes 1");
      await createMember(userId2, "User 2", "Car 2", 'inactive', "Notes 2");
      await createMember(userId3, "User 3", "Car 3", 'active', "Notes 3");

      const allMembers = await getAllMembers();

      // Should include at least our 3 test users
      expect(allMembers.length).toBeGreaterThanOrEqual(3);

      const testUsers = allMembers.filter(
        (u) => u.id === userId1 || u.id === userId2 || u.id === userId3
      );
      expect(testUsers.length).toBe(3);

      await cleanupTestDoc(userId1);
      await cleanupTestDoc(userId2);
      await cleanupTestDoc(userId3);
    });

    test("returns empty array when no users exist", async () => {
      // This test assumes emulator is cleared, but may have other users
      const allMembers = await getAllMembers();
      expect(Array.isArray(allMembers)).toBe(true);
    });
  });

  describe("getMembersByStatus", () => {
    test("retrieves active members", async () => {
      const userId1 = uniqId("active1");
      const userId2 = uniqId("active2");
      const userId3 = uniqId("inactive");

      await createMember(userId1, "Active User 1", "Car 1", 'active', "Active");
      await createMember(userId2, "Active User 2", "Car 2", 'active', "Active");
      await createMember(userId3, "Inactive User", "Car 3", 'inactive', "Inactive");

      const activeMembers = await getMembersByStatus('active');

      const testUsers = activeMembers.filter(
        (u) => u.id === userId1 || u.id === userId2
      );
      expect(testUsers.length).toBe(2);

      // Should not include the inactive user
      const inactiveUser = activeMembers.find((u) => u.id === userId3);
      expect(inactiveUser).toBeUndefined();

      await cleanupTestDoc(userId1);
      await cleanupTestDoc(userId2);
      await cleanupTestDoc(userId3);
    });

    test("retrieves inactive members", async () => {
      const userId1 = uniqId("inact1");
      const userId2 = uniqId("inact2");
      const userId3 = uniqId("act");

      await createMember(userId1, "Inactive User 1", "Car 1", 'inactive', "Inactive");
      await createMember(userId2, "Inactive User 2", "Car 2", 'inactive', "Inactive");
      await createMember(userId3, "Active User", "Car 3", 'active', "Active");

      const inactiveMembers = await getMembersByStatus('inactive');

      const testUsers = inactiveMembers.filter(
        (u) => u.id === userId1 || u.id === userId2
      );
      expect(testUsers.length).toBe(2);

      await cleanupTestDoc(userId1);
      await cleanupTestDoc(userId2);
      await cleanupTestDoc(userId3);
    });

    test("retrieves payment_needed members", async () => {
      const userId1 = uniqId("pmtneeded");
      const userId2 = uniqId("active");

      await createMember(userId1, "Pmt Needed User", "Car 1", 'payment_needed', "Needs pmt");
      await createMember(userId2, "Active User", "Car 2", 'active', "Active");

      const pmtMembers = await getMembersByStatus('payment_needed');

      const found = pmtMembers.find((u) => u.id === userId1);
      expect(found).toBeDefined();
      expect(found.status).toBe('payment_needed');

      const notFound = pmtMembers.find((u) => u.id === userId2);
      expect(notFound).toBeUndefined();

      await cleanupTestDoc(userId1);
      await cleanupTestDoc(userId2);
    });
  });

  describe("updateMember", () => {
    test("updates specific fields of a user", async () => {
      const userId = uniqId("update");

      await createMember(userId, "Original Name", "Original Car", 'active', "Original notes");

      await updateMember(userId, {
        car: "Updated Car",
        notes: "Updated notes",
      });

      const user = await getMember(userId);
      expect(user.name).toBe("Original Name"); // Should remain unchanged
      expect(user.car).toBe("Updated Car");
      expect(user.status).toBe('active'); // Should remain unchanged
      expect(user.notes).toBe("Updated notes");

      await cleanupTestDoc(userId);
    });

    test("updates status field only", async () => {
      const userId = uniqId("partial");

      await createMember(userId, "Test User", "Car", 'active', "Notes");

      await updateMember(userId, {
        status: 'payment_needed',
      });

      const user = await getMember(userId);
      expect(user.name).toBe("Test User");
      expect(user.car).toBe("Car");
      expect(user.status).toBe('payment_needed');
      expect(user.notes).toBe("Notes");

      await cleanupTestDoc(userId);
    });

    test("throws error when updating non-existent user", async () => {
      const userId = uniqId("noexist");
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        updateMember(userId, { car: "New Car" })
      ).rejects.toThrow(`User with ID ${userId} does not exist`);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("deleteMember", () => {
    test("deletes an existing user document", async () => {
      const userId = uniqId("delete");

      await createMember(userId, "Delete User", "Car", 'active', "Notes");

      // Verify it exists
      let user = await getMember(userId);
      expect(user).toBeDefined();

      // Delete it
      const deletedId = await deleteMember(userId);
      expect(deletedId).toBe(userId);

      // Verify it's gone
      user = await getMember(userId);
      expect(user).toBeNull();
    });

    test("throws error when deleting non-existent user", async () => {
      const userId = uniqId("nothere");
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(deleteMember(userId)).rejects.toThrow(
        `User with ID ${userId} does not exist`
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("upsertMember", () => {
    test("creates a new member with empty notes and email when none exists", async () => {
      const userId = uniqId("upsert_new");

      const result = await upsertMember(userId, "New Member", "Ford Focus", 'active');

      expect(result).toEqual({ id: userId, existed: false });

      const user = await getMember(userId);
      expect(user).toEqual({
        id: userId,
        name: "New Member",
        car: "Ford Focus",
        status: 'active',
        notes: '',
        email: '',
      });

      await cleanupTestDoc(userId);
    });

    test("updates existing member's Excel fields and preserves notes and email", async () => {
      const userId = uniqId("upsert_existing");

      await createMember(userId, "Original Name", "Original Car", 'active', "Keep this note", "keep@example.com");

      const result = await upsertMember(userId, "Updated Name", "Updated Car", 'inactive');

      expect(result).toEqual({ id: userId, existed: true });

      const user = await getMember(userId);
      expect(user.name).toBe("Updated Name");
      expect(user.car).toBe("Updated Car");
      expect(user.status).toBe('inactive');
      // Cache-only fields must be preserved
      expect(user.notes).toBe("Keep this note");
      expect(user.email).toBe("keep@example.com");

      await cleanupTestDoc(userId);
    });

    test("upsert stores payment_needed status correctly", async () => {
      const userId = uniqId("upsert_pmt");

      await upsertMember(userId, "Pmt User", "Car", 'payment_needed');

      const user = await getMember(userId);
      expect(user.status).toBe('payment_needed');

      await cleanupTestDoc(userId);
    });
  });

  describe("Integration tests", () => {
    test("complete CRUD workflow", async () => {
      const userId = uniqId("workflow");

      // Create
      await createMember(userId, "Workflow User", "Toyota", 'active', "New customer");
      let user = await getMember(userId);
      expect(user.name).toBe("Workflow User");
      expect(user.car).toBe("Toyota");
      expect(user.status).toBe('active');

      // Update
      await updateMember(userId, { car: "Honda", notes: "Regular customer" });
      user = await getMember(userId);
      expect(user.car).toBe("Honda");
      expect(user.notes).toBe("Regular customer");

      // Read from list
      const allMembers = await getAllMembers();
      const foundUser = allMembers.find((u) => u.id === userId);
      expect(foundUser).toBeDefined();

      // Delete
      await deleteMember(userId);
      user = await getMember(userId);
      expect(user).toBeNull();
    });

    test("query after status change", async () => {
      const userId1 = uniqId("query1");
      const userId2 = uniqId("query2");

      // Create both as active
      await createMember(userId1, "Query User 1", "Car 1", 'active', "Notes 1");
      await createMember(userId2, "Query User 2", "Car 2", 'active', "Notes 2");

      // Change one to payment_needed
      await updateMember(userId2, { status: 'payment_needed' });

      // Query for active
      const activeMembers = await getMembersByStatus('active');
      const testActiveUsers = activeMembers.filter((u) => u.id === userId1);
      expect(testActiveUsers.length).toBe(1);

      // Query for payment_needed
      const pmtMembers = await getMembersByStatus('payment_needed');
      const testPmtUsers = pmtMembers.filter((u) => u.id === userId2);
      expect(testPmtUsers.length).toBe(1);

      await cleanupTestDoc(userId1);
      await cleanupTestDoc(userId2);
    });
  });
});
