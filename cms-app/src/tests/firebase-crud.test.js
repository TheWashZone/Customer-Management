/* eslint-env vitest */
import { beforeAll, afterAll, describe, expect, test, vi } from 'vitest';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  deleteDoc,
  getDoc,
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
  createMember,
  upsertMember,
  getMember,
  getAllMembers,
  updateMember,
  deleteMember,
  createMemberWithMonthlyPass,
} from "../api/firebase-crud.js";

import { createMonthlyPass } from "../api/monthly-pass-crud.js";


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

function uniqId(prefix = "user") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function buildMemberData(overrides = {}) {
  return {
    name: "John Doe",
    contact_person: "Jane Doe",
    address: "123 Main St",
    phone_number: "555-123-4567",
    email: "",
    ...overrides,
  };
}

async function cleanupTestDoc(userId) {
  try {
    await deleteDoc(doc(db, "users", userId));
  } catch (error) {
    console.error(error.message);
  }
}

async function cleanupMonthlyPass(userId, passId) {
  try {
    await deleteDoc(doc(db, "users", userId, "monthlyPasses", passId));
  } catch (error) {
    console.error(error.message);
  }

  try {
    await deleteDoc(doc(db, "monthlyPassIds", passId));
  } catch (error) {
    console.error(error.message);
  }
}


describe("User CRUD Operations (emulator)", () => {
  describe("createMember", () => {
    test("successfully creates a new user document", async () => {
      const userId = uniqId("create");
      const member = buildMemberData();
      const today = new Date().toISOString().split("T")[0];

      const returnedId = await createMember(
        userId,
        member.name,
        member.contact_person,
        member.address,
        member.phone_number,
        member.email
      );

      expect(returnedId).toBe(userId);

      const user = await getMember(userId);
      expect(user).toEqual({
        id: userId,
        date: today,
        ...member,
      });

      await cleanupTestDoc(userId);
    });

    test("overwrites an existing user document", async () => {
      const userId = uniqId("overwrite");

      await createMember(
        userId,
        "Old Name",
        "Old Contact",
        "Old Address",
        "111-111-1111",
        "old@example.com"
      );

      await createMember(
        userId,
        "New Name",
        "New Contact",
        "New Address",
        "222-222-2222",
        "new@example.com"
      );

      const user = await getMember(userId);
      expect(user.name).toBe("New Name");
      expect(user.contact_person).toBe("New Contact");
      expect(user.address).toBe("New Address");
      expect(user.phone_number).toBe("222-222-2222");
      expect(user.email).toBe("new@example.com");

      await cleanupTestDoc(userId);
    });
  });

  describe("getMember", () => {
    test("retrieves an existing user document", async () => {
      const userId = uniqId("get");
      const member = buildMemberData({
        name: "Jane Smith",
        contact_person: "Sam Smith",
        address: "456 Oak Ave",
        phone_number: "555-987-6543",
        email: "jane@example.com",
      });

      await createMember(
        userId,
        member.name,
        member.contact_person,
        member.address,
        member.phone_number,
        member.email
      );

      const user = await getMember(userId);

      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
      expect(user.name).toBe(member.name);
      expect(user.contact_person).toBe(member.contact_person);
      expect(user.address).toBe(member.address);
      expect(user.phone_number).toBe(member.phone_number);
      expect(user.email).toBe(member.email);
      expect(user.date).toBe(new Date().toISOString().split("T")[0]);

      await cleanupTestDoc(userId);
    });

    test("returns null for a non-existent user", async () => {
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

      await createMember(userId1, "User 1", "Contact 1", "Address 1", "555-000-0001");
      await createMember(userId2, "User 2", "Contact 2", "Address 2", "555-000-0002");
      await createMember(userId3, "User 3", "Contact 3", "Address 3", "555-000-0003");

      const allMembers = await getAllMembers();

      expect(allMembers.length).toBeGreaterThanOrEqual(3);

      const testUsers = allMembers.filter(
        (u) => u.id === userId1 || u.id === userId2 || u.id === userId3
      );
      expect(testUsers.length).toBe(3);

      await cleanupTestDoc(userId1);
      await cleanupTestDoc(userId2);
      await cleanupTestDoc(userId3);
    });

    test("returns an array", async () => {
      const allMembers = await getAllMembers();
      expect(Array.isArray(allMembers)).toBe(true);
    });
  });

  describe("updateMember", () => {
    test("updates specific fields of an existing user", async () => {
      const userId = uniqId("update");

      await createMember(
        userId,
        "Original Name",
        "Original Contact",
        "Original Address",
        "555-111-1111",
        "original@example.com"
      );

      await updateMember(userId, {
        address: "Updated Address",
        phone_number: "555-222-2222",
      });

      const user = await getMember(userId);
      expect(user.name).toBe("Original Name");
      expect(user.contact_person).toBe("Original Contact");
      expect(user.address).toBe("Updated Address");
      expect(user.phone_number).toBe("555-222-2222");
      expect(user.email).toBe("original@example.com");

      await cleanupTestDoc(userId);
    });

    test("updates only one field without changing the others", async () => {
      const userId = uniqId("partial");

      await createMember(
        userId,
        "Test User",
        "Test Contact",
        "Test Address",
        "555-333-3333",
        "test@example.com"
      );

      await updateMember(userId, {
        contact_person: "Updated Contact",
      });

      const user = await getMember(userId);
      expect(user.name).toBe("Test User");
      expect(user.contact_person).toBe("Updated Contact");
      expect(user.address).toBe("Test Address");
      expect(user.phone_number).toBe("555-333-3333");
      expect(user.email).toBe("test@example.com");

      await cleanupTestDoc(userId);
    });

    test("throws when updating a non-existent user", async () => {
      const userId = uniqId("noexist");
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        updateMember(userId, { address: "New Address" })
      ).rejects.toThrow(`User with ID ${userId} does not exist`);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("deleteMember", () => {
    test("deletes an existing user document", async () => {
      const userId = uniqId("delete");

      await createMember(
        userId,
        "Delete User",
        "Delete Contact",
        "Delete Address",
        "555-444-4444"
      );

      let user = await getMember(userId);
      expect(user).toBeDefined();

      const deletedId = await deleteMember(userId);
      expect(deletedId).toBe(userId);

      user = await getMember(userId);
      expect(user).toBeNull();
    });

    test("throws when deleting a non-existent user", async () => {
      const userId = uniqId("nothere");
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(deleteMember(userId)).rejects.toThrow(
        `User with ID ${userId} does not exist`
      );

      consoleErrorSpy.mockRestore();
    });
  });

test("does not create a customer when the monthly pass ID already exists", async () => {
  const existingUserId = uniqId("USER");
  const newUserId = uniqId("USER");
  const passId = uniqId("PASS");

  await createMember(
    existingUserId,
    "Existing Customer",
    "Jordan Lee",
    "123 Main St",
    "555-123-4567",
    "existing@example.com"
  );

  await createMonthlyPass(
    existingUserId,
    passId,
    "Unlimited",
    false,
    "Toyota Camry 2020",
    "Existing pass"
  );

  await expect(
    createMemberWithMonthlyPass(
      newUserId,
      passId,
      "New Customer",
      "Taylor Smith",
      "456 Oak St",
      "555-987-6543",
      "new@example.com",
      "Basic",
      false,
      "Honda Accord 2021",
      "Should not be created"
    )
  ).rejects.toThrow(`Monthly pass with ID ${passId} already exists`);

  const newUserDoc = await getDoc(doc(db, "users", newUserId));
  const newUserPassDoc = await getDoc(
    doc(db, "users", newUserId, "monthlyPasses", passId)
  );

  expect(newUserDoc.exists()).toBe(false);
  expect(newUserPassDoc.exists()).toBe(false);

  await cleanupMonthlyPass(existingUserId, passId);
  await cleanupMonthlyPass(newUserId, passId);
  await cleanupTestDoc(existingUserId);
  await cleanupTestDoc(newUserId);
});


  describe("upsertMember", () => {
    test("creates a new member when none exists", async () => {
      const userId = uniqId("upsert_new");

      const result = await upsertMember(
        userId,
        "New Member",
        "New Contact",
        "New Address",
        "555-555-5555"
      );

      expect(result).toEqual({ id: userId, existed: false });

      const user = await getMember(userId);
      expect(user).toEqual({
        id: userId,
        name: "New Member",
        contact_person: "New Contact",
        address: "New Address",
        phone_number: "555-555-5555",
        email: "",
      });

      await cleanupTestDoc(userId);
    });

    test("updates an existing member and returns existed true", async () => {
      const userId = uniqId("upsert_existing");

      await createMember(
        userId,
        "Original Name",
        "Original Contact",
        "Original Address",
        "555-666-6666",
        "original@example.com"
      );

      const result = await upsertMember(
        userId,
        "Updated Name",
        "Updated Contact",
        "Updated Address",
        "555-777-7777",
        "updated@example.com"
      );

      expect(result).toEqual({ id: userId, existed: true });

      const user = await getMember(userId);
      expect(user.name).toBe("Updated Name");
      expect(user.contact_person).toBe("Updated Contact");
      expect(user.address).toBe("Updated Address");
      expect(user.phone_number).toBe("555-777-7777");
      expect(user.email).toBe("updated@example.com");
      expect(user.date).toBe(new Date().toISOString().split("T")[0]);

      await cleanupTestDoc(userId);
    });

    test("stores the provided email on new records", async () => {
      const userId = uniqId("upsert_email");

      await upsertMember(
        userId,
        "Email User",
        "Email Contact",
        "Email Address",
        "555-888-8888",
        "emailuser@example.com"
      );

      const user = await getMember(userId);
      expect(user.email).toBe("emailuser@example.com");

      await cleanupTestDoc(userId);
    });
  });

  describe("Integration tests", () => {
    test("completes the full CRUD workflow", async () => {
      const userId = uniqId("workflow");

      await createMember(
        userId,
        "Workflow User",
        "Workflow Contact",
        "Workflow Address",
        "555-999-9999"
      );

      let user = await getMember(userId);
      expect(user.name).toBe("Workflow User");
      expect(user.contact_person).toBe("Workflow Contact");
      expect(user.address).toBe("Workflow Address");

      await updateMember(userId, {
        address: "Updated Workflow Address",
        email: "workflow@example.com",
      });

      user = await getMember(userId);
      expect(user.address).toBe("Updated Workflow Address");
      expect(user.email).toBe("workflow@example.com");

      const allMembers = await getAllMembers();
      const foundUser = allMembers.find((u) => u.id === userId);
      expect(foundUser).toBeDefined();

      await deleteMember(userId);
      user = await getMember(userId);
      expect(user).toBeNull();
    });
  });
});
