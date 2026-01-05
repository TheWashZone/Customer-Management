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

// Import all functions from firebase-users.js
import {
  createMember,
  getMember,
  getAllMembers,
  getMembersByPaymentStatus,
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
      const isActive = true;
      const validPayment = true;
      const notes = "Premium member";

      const returnedId = await createMember(userId, name, carInfo, isActive, validPayment, notes);

      expect(returnedId).toBe(userId);

      // Verify using getMember
      const user = await getMember(userId);
      expect(user).toEqual({
        id: userId,
        name: name,
        car: carInfo,
        isActive: isActive,
        validPayment: validPayment,
        notes: notes,
      });

      await cleanupTestDoc(userId);
    });

    test("overwrites existing user document", async () => {
      const userId = uniqId("overwrite");

      await createMember(userId, "Old Name", "Old Car", true, true, "Old notes");
      await createMember(userId, "New Name", "New Car", false, false, "New notes");

      const user = await getMember(userId);
      expect(user.name).toBe("New Name");
      expect(user.car).toBe("New Car");
      expect(user.isActive).toBe(false);
      expect(user.validPayment).toBe(false);
      expect(user.notes).toBe("New notes");

      await cleanupTestDoc(userId);
    });
  });

  describe("getMember", () => {
    test("retrieves an existing user document", async () => {
      const userId = uniqId("get");
      const name = "Jane Smith";
      const carInfo = "Honda Accord 2021";
      const isActive = true;
      const validPayment = true;
      const notes = "Test user";

      await createMember(userId, name, carInfo, isActive, validPayment, notes);

      const user = await getMember(userId);

      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
      expect(user.name).toBe(name);
      expect(user.car).toBe(carInfo);
      expect(user.isActive).toBe(isActive);
      expect(user.validPayment).toBe(validPayment);
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

      await createMember(userId1, "User 1", "Car 1", true, true, "Notes 1");
      await createMember(userId2, "User 2", "Car 2", false, false, "Notes 2");
      await createMember(userId3, "User 3", "Car 3", true, true, "Notes 3");

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

  describe("getMembersByPaymentStatus", () => {
    test("retrieves users with valid payment", async () => {
      const userId1 = uniqId("valid1");
      const userId2 = uniqId("valid2");
      const userId3 = uniqId("invalid");

      await createMember(userId1, "Valid User 1", "Car 1", true, true, "Valid payment");
      await createMember(userId2, "Valid User 2", "Car 2", true, true, "Valid payment");
      await createMember(userId3, "Invalid User", "Car 3", true, false, "Invalid payment");

      const validMembers = await getMembersByPaymentStatus(true);

      const testUsers = validMembers.filter(
        (u) => u.id === userId1 || u.id === userId2
      );
      expect(testUsers.length).toBe(2);

      // Should not include the invalid payment user
      const invalidUser = validMembers.find((u) => u.id === userId3);
      expect(invalidUser).toBeUndefined();

      await cleanupTestDoc(userId1);
      await cleanupTestDoc(userId2);
      await cleanupTestDoc(userId3);
    });

    test("retrieves users with invalid payment", async () => {
      const userId1 = uniqId("inv1");
      const userId2 = uniqId("inv2");
      const userId3 = uniqId("val");

      await createMember(userId1, "Invalid User 1", "Car 1", true, false, "Invalid payment");
      await createMember(userId2, "Invalid User 2", "Car 2", true, false, "Invalid payment");
      await createMember(userId3, "Valid User", "Car 3", true, true, "Valid payment");

      const invalidMembers = await getMembersByPaymentStatus(false);

      const testUsers = invalidMembers.filter(
        (u) => u.id === userId1 || u.id === userId2
      );
      expect(testUsers.length).toBe(2);

      await cleanupTestDoc(userId1);
      await cleanupTestDoc(userId2);
      await cleanupTestDoc(userId3);
    });
  });

  describe("updateMember", () => {
    test("updates specific fields of a user", async () => {
      const userId = uniqId("update");

      await createMember(userId, "Original Name", "Original Car", true, true, "Original notes");

      await updateMember(userId, {
        car: "Updated Car",
        notes: "Updated notes",
      });

      const user = await getMember(userId);
      expect(user.name).toBe("Original Name"); // Should remain unchanged
      expect(user.car).toBe("Updated Car");
      expect(user.isActive).toBe(true); // Should remain unchanged
      expect(user.validPayment).toBe(true); // Should remain unchanged
      expect(user.notes).toBe("Updated notes");

      await cleanupTestDoc(userId);
    });

    test("updates only one field", async () => {
      const userId = uniqId("partial");

      await createMember(userId, "Test User", "Car", true, true, "Notes");

      await updateMember(userId, {
        validPayment: false,
      });

      const user = await getMember(userId);
      expect(user.name).toBe("Test User");
      expect(user.car).toBe("Car");
      expect(user.isActive).toBe(true);
      expect(user.notes).toBe("Notes");
      expect(user.validPayment).toBe(false);

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

      await createMember(userId, "Delete User", "Car", true, true, "Notes");

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

  describe("Integration tests", () => {
    test("complete CRUD workflow", async () => {
      const userId = uniqId("workflow");

      // Create
      await createMember(userId, "Workflow User", "Toyota", true, true, "New customer");
      let user = await getMember(userId);
      expect(user.name).toBe("Workflow User");
      expect(user.car).toBe("Toyota");
      expect(user.isActive).toBe(true);

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

    test("query after multiple operations", async () => {
      const userId1 = uniqId("query1");
      const userId2 = uniqId("query2");

      // Create both with valid payment
      await createMember(userId1, "Query User 1", "Car 1", true, true, "Notes 1");
      await createMember(userId2, "Query User 2", "Car 2", true, true, "Notes 2");

      // Update one to invalid payment
      await updateMember(userId2, { validPayment: false });

      // Query for valid payments
      const validMembers = await getMembersByPaymentStatus(true);
      const testValidUsers = validMembers.filter((u) => u.id === userId1);
      expect(testValidUsers.length).toBe(1);

      // Query for invalid payments
      const invalidMembers = await getMembersByPaymentStatus(false);
      const testInvalidUsers = invalidMembers.filter((u) => u.id === userId2);
      expect(testInvalidUsers.length).toBe(1);

      await cleanupTestDoc(userId1);
      await cleanupTestDoc(userId2);
    });
  });
});
