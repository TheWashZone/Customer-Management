/* eslint-env vitest */
import { beforeAll, afterAll, describe, expect, test } from 'vitest';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
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
  createCustomer, 
  upsertCustomer, 
  getCustomer, 
  getAllCustomers, 
  updateCustomer, 
  deleteCustomer 
} from "../api/customer-crud.js";

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
        throw createError;
      }
    }
  }
});

afterAll(async () => {
  await signOut(auth);
  await deleteApp(app);
});

function uniqId(prefix = "customer") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function cleanupTestDoc(id) {
  await deleteDoc(doc(db, "customers", id)).catch(() => {});
}

describe("Customer CRUD Operations (emulator)", () => {
  describe("createCustomer", () => {
    test("creates a customer document with the expected fields", async () => {
      const id = uniqId("C001");
      const name = "Acme Detailing";
      const contactPerson = "Jordan Lee";
      const address = "123 Main St";
      const phoneNumber = "555-123-4567";
      const email = "jordan@example.com";
      const today = new Date().toISOString().split("T")[0];

      const returnedId = await createCustomer(
        id,
        name,
        contactPerson,
        address,
        phoneNumber,
        email
      );

      expect(returnedId).toBe(id);

      const customerDoc = await getDoc(doc(db, "customers", id));
      expect(customerDoc.exists()).toBe(true);
      expect(customerDoc.data()).toEqual({
        date: today,
        name,
        contact_person: contactPerson,
        address,
        phone_number: phoneNumber,
        email,
      });

      await cleanupTestDoc(id);
    });
  });

  describe("upsertCustomer", () => {
    test("creates a customer document when one does not already exist", async () => {
      const id = uniqId("UPSERT_NEW");
      const name = "Northside Auto";
      const contactPerson = "Taylor Kim";
      const address = "456 Oak Ave";
      const phoneNumber = "555-222-9999";
      const email = "taylor@example.com";

      const result = await upsertCustomer(
        id,
        name,
        contactPerson,
        address,
        phoneNumber,
        email
      );

      expect(result).toEqual({ id, existed: false });

      const customerDoc = await getDoc(doc(db, "customers", id));
      expect(customerDoc.exists()).toBe(true);
      expect(customerDoc.data()).toEqual({
        name,
        contact_person: contactPerson,
        address,
        phone_number: phoneNumber,
        email,
      });

      await cleanupTestDoc(id);
    });

    test("updates an existing customer document and reports that it already existed", async () => {
      const id = uniqId("UPSERT_EXISTING");
      const originalName = "Original Customer";
      const originalContact = "Alex Morgan";
      const originalAddress = "100 First St";
      const originalPhone = "555-000-1111";
      const originalEmail = "original@example.com";
      const today = new Date().toISOString().split("T")[0];

      await createCustomer(
        id,
        originalName,
        originalContact,
        originalAddress,
        originalPhone,
        originalEmail
      );

      const result = await upsertCustomer(
        id,
        "Updated Customer",
        "Sam Rivera",
        "200 Second St",
        "555-888-7777",
        "updated@example.com"
      );

      expect(result).toEqual({ id, existed: true });

      const customerDoc = await getDoc(doc(db, "customers", id));
      expect(customerDoc.exists()).toBe(true);
      expect(customerDoc.data()).toEqual({
        date: today,
        name: "Updated Customer",
        contact_person: "Sam Rivera",
        address: "200 Second St",
        phone_number: "555-888-7777",
        email: "updated@example.com",
      });

      await cleanupTestDoc(id);
    });
  });
});


describe("getCustomer", () => {
  test("retrieves an existing customer document", async () => {
    const id = uniqId("GET");
    const name = "Acme Detailing";
    const contactPerson = "Jordan Lee";
    const address = "123 Main St";
    const phoneNumber = "555-123-4567";
    const email = "jordan@example.com";
    const today = new Date().toISOString().split("T")[0];

    await createCustomer(
      id,
      name,
      contactPerson,
      address,
      phoneNumber,
      email
    );

    const customer = await getCustomer(id);

    expect(customer).toEqual({
      id,
      date: today,
      name,
      contact_person: contactPerson,
      address,
      phone_number: phoneNumber,
      email,
    });

    await cleanupTestDoc(id);
  });

  test("returns null for a non-existent customer", async () => {
    const id = uniqId("MISSING");

    const customer = await getCustomer(id);

    expect(customer).toBeNull();
  });
});

import {
  createCustomer,
  getAllCustomers,
} from "../api/customer-crud.js";

describe("getAllCustomers", () => {
  test("retrieves all customer documents", async () => {
    const id1 = uniqId("ALL1");
    const id2 = uniqId("ALL2");
    const id3 = uniqId("ALL3");

    await createCustomer(
      id1,
      "Customer One",
      "Jordan Lee",
      "123 Main St",
      "555-111-1111",
      "one@example.com"
    );

    await createCustomer(
      id2,
      "Customer Two",
      "Taylor Kim",
      "456 Oak Ave",
      "555-222-2222",
      "two@example.com"
    );

    await createCustomer(
      id3,
      "Customer Three",
      "Sam Rivera",
      "789 Pine Rd",
      "555-333-3333",
      "three@example.com"
    );

    const customers = await getAllCustomers();

    expect(customers.length).toBeGreaterThanOrEqual(3);

    const testCustomers = customers.filter(
      (customer) =>
        customer.id === id1 ||
        customer.id === id2 ||
        customer.id === id3
    );

    expect(testCustomers.length).toBe(3);

    await cleanupTestDoc(id1);
    await cleanupTestDoc(id2);
    await cleanupTestDoc(id3);
  });

  test("returns an array when no matching test customers exist", async () => {
    const customers = await getAllCustomers();

    expect(Array.isArray(customers)).toBe(true);
  });
});

import {
  createCustomer,
  getCustomer,
  updateCustomer,
} from "../api/customer-crud.js";

describe("updateCustomer", () => {
  test("updates specific fields of an existing customer", async () => {
    const id = uniqId("UPDATE");

    await createCustomer(
      id,
      "Original Customer",
      "Alex Morgan",
      "100 First St",
      "555-000-1111",
      "original@example.com"
    );

    await updateCustomer(id, {
      address: "200 Second St",
      phone_number: "555-888-7777",
      email: "updated@example.com",
    });

    const customer = await getCustomer(id);

    expect(customer.name).toBe("Original Customer");
    expect(customer.contact_person).toBe("Alex Morgan");
    expect(customer.address).toBe("200 Second St");
    expect(customer.phone_number).toBe("555-888-7777");
    expect(customer.email).toBe("updated@example.com");

    await cleanupTestDoc(id);
  });

  test("updates only one field without changing the others", async () => {
    const id = uniqId("PARTIAL");

    await createCustomer(
      id,
      "Partial Customer",
      "Taylor Kim",
      "456 Oak Ave",
      "555-222-9999",
      "partial@example.com"
    );

    await updateCustomer(id, {
      contact_person: "Updated Contact",
    });

    const customer = await getCustomer(id);

    expect(customer.name).toBe("Partial Customer");
    expect(customer.contact_person).toBe("Updated Contact");
    expect(customer.address).toBe("456 Oak Ave");
    expect(customer.phone_number).toBe("555-222-9999");
    expect(customer.email).toBe("partial@example.com");

    await cleanupTestDoc(id);
  });

  test("throws an error when updating a non-existent customer", async () => {
    const id = uniqId("NOEXIST");

    await expect(
      updateCustomer(id, { address: "999 Missing St" })
    ).rejects.toThrow(`Customer with ID ${id} does not exist`);
  });
});

import {
  createCustomer,
  getCustomer,
  deleteCustomer,
} from "../api/customer-crud.js";

describe("deleteCustomer", () => {
  test("deletes an existing customer document", async () => {
    const id = uniqId("DELETE");

    await createCustomer(
      id,
      "Delete Customer",
      "Jordan Lee",
      "123 Main St",
      "555-123-4567",
      "delete@example.com"
    );

    let customer = await getCustomer(id);
    expect(customer).toBeDefined();

    const deletedId = await deleteCustomer(id);
    expect(deletedId).toBe(id);

    customer = await getCustomer(id);
    expect(customer).toBeNull();
  });

  test("throws an error when deleting a non-existent customer", async () => {
    const id = uniqId("MISSING");

    await expect(deleteCustomer(id)).rejects.toThrow(
      `Customer with ID ${id} does not exist`
    );
  });
});
