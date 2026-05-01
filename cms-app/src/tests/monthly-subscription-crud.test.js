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
  createCustomer,
  getCustomer,
  createMonthlyPass,
  getMonthlyPass,
  createCustomerAndMonthlyPass,
  updateCustomer,
  updateMonthlyPass,
} from "../api/monthly-subscription-crud.js";

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

async function cleanupCustomer(customerId) {
  try {
    await deleteDoc(doc(db, "Customers", customerId));
  } catch (error) {
    console.error(error.message);
  }
}

async function cleanupMonthlyPass(passId) {
  try {
    await deleteDoc(doc(db, "MonthlyPasses", passId));
  } catch (error) {
    console.error(error.message);
  }
}

describe("Monthly subscription backend", () => {
  test("creates a customer without accepting frontend ids or dates", async () => {
    const customerId = await createCustomer({
      customerId: 'frontend-id',
      createdAt: '2000-01-01',
      name: 'Jane Doe',
      contactPerson: 'Jane Doe',
      address: {
        streetAddress: '123 Main St',
        city: 'Spokane',
        state: 'WA',
        zipCode: '99201'
      },
      phone: '5095551234',
      email: 'jane@example.com'
    });

    expect(customerId).not.toBe('frontend-id');

    const customer = await getCustomer(customerId);
    expect(customer).toBeDefined();
    expect(customer.id).toBe(customerId);
    expect(customer.name).toBe('Jane Doe');
    expect(customer.contactPerson).toBe('Jane Doe');
    expect(customer.address).toEqual({
      streetAddress: '123 Main St',
      city: 'Spokane',
      state: 'WA',
      zipCode: '99201'
    });
    expect(customer.phone).toBe('5095551234');
    expect(customer.email).toBe('jane@example.com');
    expect(customer.customerId).toBeUndefined();
    expect(customer.createdAt).toBeDefined();

    await cleanupCustomer(customerId);
  });

  test("creates a monthly pass with default status and update flag", async () => {
    const customerId = await createCustomer({
      name: 'Pass Owner',
      address: {},
      phone: '5095550000',
      email: 'owner@example.com'
    });

    const passId = await createMonthlyPass({
      passId: 'frontend-pass-id',
      createdAt: '2000-01-01',
      customerId,
      planType: 'deluxe',
      planNumberId: 'PN-100',
      vehicleInfo: {
        year: '2022',
        make: 'Toyota',
        model: 'Camry',
        color: 'Blue'
      },
      notes: 'Initial signup',
      status: 'paid',
      updateInfoFlag: false
    });

    expect(passId).not.toBe('frontend-pass-id');

    const pass = await getMonthlyPass(passId);
    expect(pass).toBeDefined();
    expect(pass.id).toBe(passId);
    expect(pass.customerId).toBe(customerId);
    expect(pass.planType).toBe('deluxe');
    expect(pass.planNumberId).toBe('PN-100');
    expect(pass.vehicleInfo).toEqual({
      year: '2022',
      make: 'Toyota',
      model: 'Camry',
      color: 'Blue'
    });
    expect(pass.notes).toBe('Initial signup');
    expect(pass.status).toBe('needs credit card information');
    expect(pass.updateInfoFlag).toBe(true);
    expect(pass.passId).toBeUndefined();
    expect(pass.createdAt).toBeDefined();

    await cleanupMonthlyPass(passId);
    await cleanupCustomer(customerId);
  });

  test("creates linked customer and monthly pass in one call", async () => {
    const result = await createCustomerAndMonthlyPass({
      customer: {
        name: 'Linked Customer',
        address: {},
        phone: '5095552222',
        email: 'linked@example.com'
      },
      monthlyPass: {
        planType: 'ultimate',
        planNumberId: 'PN-200',
        vehicleInfo: {
          year: '2023',
          make: 'Honda',
          model: 'Civic',
          color: 'White'
        }
      }
    });

    expect(result.customerId).toBeDefined();
    expect(result.passId).toBeDefined();

    const customer = await getCustomer(result.customerId);
    const pass = await getMonthlyPass(result.passId);

    expect(customer.id).toBe(result.customerId);
    expect(pass.id).toBe(result.passId);
    expect(pass.customerId).toBe(result.customerId);

    await cleanupMonthlyPass(result.passId);
    await cleanupCustomer(result.customerId);
  });

  test("updates customer and monthly pass without allowing id or date fields", async () => {
    const customerId = await createCustomer({
      name: 'Update Me',
      address: {},
      phone: '5095553333',
      email: 'update@example.com'
    });

    const passId = await createMonthlyPass({
      customerId,
      planType: 'basic',
      planNumberId: 'PN-300',
      vehicleInfo: {
        year: '2021',
        make: 'Ford',
        model: 'Escape',
        color: 'Gray'
      }
    });

    await updateCustomer(customerId, {
      customerId: 'blocked',
      createdAt: '2001-01-01',
      name: 'Updated Customer'
    });

    await updateMonthlyPass(passId, {
      passId: 'blocked',
      closedAt: '2001-01-01',
      status: 'active',
      updateInfoFlag: false
    });

    const updatedCustomer = await getCustomer(customerId);
    const updatedPass = await getMonthlyPass(passId);

    expect(updatedCustomer.name).toBe('Updated Customer');
    expect(updatedCustomer.customerId).toBeUndefined();
    expect(updatedPass.status).toBe('active');
    expect(updatedPass.updateInfoFlag).toBe(false);
    expect(updatedPass.passId).toBeUndefined();

    await cleanupMonthlyPass(passId);
    await cleanupCustomer(customerId);
  });
});