/* eslint-env vitest */
import { beforeAll, afterAll, describe, expect, test } from "vitest";
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
import { createMember } from "../api/firebase-crud.js";
import {
  createMonthlyPass,
  upsertMonthlyPass,
  getMonthlyPass,
  getAllMonthlyPasses,
  updateMembership,
  cancelMonthlyPass
} from "../api/monthly-pass-crud.js";

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
      if (createError.code === "auth/email-already-in-use") {
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

function uniqId(prefix = "test") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function createTestUser(userId) {
  await createMember(
    userId,
    "Acme Detailing",
    "Jordan Lee",
    "123 Main St",
    "555-123-4567",
    "jordan@example.com"
  );
}

async function cleanupUser(userId) {
  await deleteDoc(doc(db, "users", userId)).catch(() => {});
}

async function cleanupMonthlyPass(userId, passId) {
  await deleteDoc(doc(db, "users", userId, "monthlyPasses", passId)).catch(() => {});
}

describe("Monthly Pass CRUD Operations (emulator)", () => {
  describe("createMonthlyPass", () => {
    test("creates a monthly pass document under the user with the expected fields", async () => {
      const userId = uniqId("USER");
      const passId = uniqId("PASS");
      const planType = "Unlimited";
      const status = "active";
      const vehicle = "Toyota Camry 2020";
      const notes = "First monthly pass";
      const today = new Date().toISOString().split("T")[0];

      await createTestUser(userId);

      const returnedId = await createMonthlyPass(
        userId,
        passId,
        planType,
        status,
        vehicle,
        notes
      );

      expect(returnedId).toBe(passId);

      const passDoc = await getDoc(
        doc(db, "users", userId, "monthlyPasses", passId)
      );

      expect(passDoc.exists()).toBe(true);
      expect(passDoc.data()).toEqual({
        passId,
        creation_date: today,
        plan_type: planType,
        status,
        vehicle,
        notes,
      });

      await cleanupMonthlyPass(userId, passId);
      await cleanupUser(userId);
    });
  });

  describe("upsertMonthlyPass", () => {
    test("creates a monthly pass when it does not already exist", async () => {
      const userId = uniqId("USER");
      const passId = uniqId("PASS");

      await createTestUser(userId);

      const result = await upsertMonthlyPass(
        userId,
        passId,
        "Unlimited",
        "active",
        "Toyota Camry 2020",
        "New pass"
      );

      expect(result).toEqual({ id: passId, existed: false });

      const passDoc = await getDoc(
        doc(db, "users", userId, "monthlyPasses", passId)
      );

      expect(passDoc.exists()).toBe(true);
      expect(passDoc.data()).toEqual({
        plan_type: "Unlimited",
        status: "active",
        vehicle: "Toyota Camry 2020",
        notes: "New pass",
      });

      await cleanupMonthlyPass(userId, passId);
      await cleanupUser(userId);
    });
  });

  describe("getMonthlyPass", () => {
    test("retrieves an existing monthly pass document", async () => {
      const userId = uniqId("USER");
      const passId = uniqId("PASS");
      const today = new Date().toISOString().split("T")[0];

      await createTestUser(userId);

      await createMonthlyPass(
        userId,
        passId,
        "Unlimited",
        "active",
        "Toyota Camry 2020",
        "First monthly pass"
      );

      const monthlyPass = await getMonthlyPass(userId, passId);

      expect(monthlyPass).toEqual({
        passId,
        creation_date: today,
        plan_type: "Unlimited",
        status: "active",
        vehicle: "Toyota Camry 2020",
        notes: "First monthly pass",
      });

      await cleanupMonthlyPass(userId, passId);
      await cleanupUser(userId);
    });

    test("returns null for a non-existent monthly pass", async () => {
      const userId = uniqId("USER");
      const passId = uniqId("MISSING");

      await createTestUser(userId);

      const monthlyPass = await getMonthlyPass(userId, passId);

      expect(monthlyPass).toBeNull();

      await cleanupUser(userId);
    });
  });

  describe("getAllMonthlyPasses", () => {
    test("retrieves all monthly passes for a user", async () => {
      const userId = uniqId("USER");
      const passId1 = uniqId("PASS1");
      const passId2 = uniqId("PASS2");
      const passId3 = uniqId("PASS3");

      await createTestUser(userId);

      await createMonthlyPass(
        userId,
        passId1,
        "Unlimited",
        "active",
        "Toyota Camry 2020",
        "First pass"
      );

      await createMonthlyPass(
        userId,
        passId2,
        "Basic",
        "payment_needed",
        "Honda Accord 2021",
        "Second pass"
      );

      await createMonthlyPass(
        userId,
        passId3,
        "Premium",
        "inactive",
        "Ford Explorer 2022",
        "Third pass"
      );

      const monthlyPasses = await getAllMonthlyPasses(userId);

      expect(monthlyPasses.length).toBe(3);
      expect(monthlyPasses).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            passId: passId1,
            plan_type: "Unlimited",
            status: "active",
            vehicle: "Toyota Camry 2020",
            notes: "First pass",
          }),
          expect.objectContaining({
            passId: passId2,
            plan_type: "Basic",
            status: "payment_needed",
            vehicle: "Honda Accord 2021",
            notes: "Second pass",
          }),
          expect.objectContaining({
            passId: passId3,
            plan_type: "Premium",
            status: "inactive",
            vehicle: "Ford Explorer 2022",
            notes: "Third pass",
          }),
        ])
      );

      await cleanupMonthlyPass(userId, passId1);
      await cleanupMonthlyPass(userId, passId2);
      await cleanupMonthlyPass(userId, passId3);
      await cleanupUser(userId);
    });

    test("returns an empty array when the user has no monthly passes", async () => {
      const userId = uniqId("USER");

      await createTestUser(userId);

      const monthlyPasses = await getAllMonthlyPasses(userId);

      expect(monthlyPasses).toEqual([]);

      await cleanupUser(userId);
    });
  });

  describe("updateMembership", () => {
    test("updates specific fields of an existing monthly pass", async () => {
      const userId = uniqId("USER");
      const passId = uniqId("PASS");

      await createTestUser(userId);

      await createMonthlyPass(
        userId,
        passId,
        "Basic",
        "active",
        "Toyota Camry 2020",
        "Original note"
      );

      await updateMembership(userId, passId, {
        plan_type: "Premium",
        status: "payment_needed",
        notes: "Updated note",
      });

      const monthlyPass = await getMonthlyPass(userId, passId);

      expect(monthlyPass.plan_type).toBe("Premium");
      expect(monthlyPass.status).toBe("payment_needed");
      expect(monthlyPass.vehicle).toBe("Toyota Camry 2020");
      expect(monthlyPass.notes).toBe("Updated note");

      await cleanupMonthlyPass(userId, passId);
      await cleanupUser(userId);
    });

    test("updates only one field without changing the others", async () => {
      const userId = uniqId("USER");
      const passId = uniqId("PASS");

      await createTestUser(userId);

      await createMonthlyPass(
        userId,
        passId,
        "Unlimited",
        "active",
        "Honda Accord 2021",
        "Original note"
      );

      await updateMembership(userId, passId, {
        notes: "Only note changed",
      });

      const monthlyPass = await getMonthlyPass(userId, passId);

      expect(monthlyPass.plan_type).toBe("Unlimited");
      expect(monthlyPass.status).toBe("active");
      expect(monthlyPass.vehicle).toBe("Honda Accord 2021");
      expect(monthlyPass.notes).toBe("Only note changed");

      await cleanupMonthlyPass(userId, passId);
      await cleanupUser(userId);
    });

    test("throws an error when updating a non-existent monthly pass", async () => {
      const userId = uniqId("USER");
      const passId = uniqId("MISSING");

      await createTestUser(userId);

      await expect(
        updateMembership(userId, passId, { notes: "Nope" })
      ).rejects.toThrow(`Monthly pass with ID ${passId} does not exist`);

      await cleanupUser(userId);
    });
  });

  describe("cancelMonthlyPass", () => {
    test("adds a cancelled_date to an existing monthly pass without removing existing fields", async () => {
      const userId = uniqId("USER");
      const passId = uniqId("PASS");
      const today = new Date().toISOString().split("T")[0];

      await createTestUser(userId);

      await createMonthlyPass(
        userId,
        passId,
        "Unlimited",
        "active",
        "Toyota Camry 2020",
        "First monthly pass"
      );

      const returnedId = await cancelMonthlyPass(userId, passId);

      expect(returnedId).toBe(passId);

      const monthlyPass = await getMonthlyPass(userId, passId);

      expect(monthlyPass).toEqual({
        passId,
        creation_date: today,
        plan_type: "Unlimited",
        status: "active",
        vehicle: "Toyota Camry 2020",
        notes: "First monthly pass",
        cancelled_date: today,
      });

      await cleanupMonthlyPass(userId, passId);
      await cleanupUser(userId);
    });

    test("throws an error when cancelling a non-existent monthly pass", async () => {
      const userId = uniqId("USER");
      const passId = uniqId("MISSING");

      await createTestUser(userId);

      await expect(
        cancelMonthlyPass(userId, passId)
      ).rejects.toThrow(`Monthly pass with ID ${passId} does not exist`);

      await cleanupUser(userId);
    });
  });
});



// /* eslint-env vitest */
// import { beforeAll, afterAll, describe, expect, test } from "vitest";
// import {
//   getFirestore,
//   connectFirestoreEmulator,
//   doc,
//   getDoc,
//   deleteDoc,
// } from "firebase/firestore";
// import {
//   getAuth,
//   connectAuthEmulator,
//   signInWithEmailAndPassword,
//   createUserWithEmailAndPassword,
//   signOut,
// } from "firebase/auth";
// import { deleteApp } from "firebase/app";
// import { app } from "../api/firebaseconfig.js";
// import { createCustomer } from "../api/customer-crud.js";
// import { 
//     createMonthlyPass, 
//     upsertMonthlyPass, 
//     getMonthlyPass, 
//     getAllMonthlyPasses, 
//     updateMembership, 
//     cancelMonthlyPass
//  } from "../api/monthly-pass-crud.js";

// const db = getFirestore(app);
// connectFirestoreEmulator(db, "127.0.0.1", 8080);

// const auth = getAuth(app);
// connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

// beforeAll(async () => {
//   try {
//     await signInWithEmailAndPassword(auth, "test@example.com", "password123");
//   } catch {
//     try {
//       await createUserWithEmailAndPassword(auth, "test@example.com", "password123");
//     } catch (createError) {
//       if (createError.code === "auth/email-already-in-use") {
//         await signInWithEmailAndPassword(auth, "test@example.com", "password123");
//       } else {
//         throw createError;
//       }
//     }
//   }
// });

// afterAll(async () => {
//   await signOut(auth);
//   await deleteApp(app);
// });

// function uniqId(prefix = "test") {
//   return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
// }

// async function cleanupCustomer(customerId) {
//   await deleteDoc(doc(db, "customers", customerId)).catch(() => {});
// }

// async function cleanupMonthlyPass(customerId, passId) {
//   await deleteDoc(doc(db, "customers", customerId, "monthlyPasses", passId)).catch(() => {});
// }

// describe("Monthly Pass CRUD Operations (emulator)", () => {
//   describe("createMonthlyPass", () => {
//     test("creates a monthly pass document under the customer with the expected fields", async () => {
//       const customerId = uniqId("CUSTOMER");
//       const passId = uniqId("PASS");
//       const planType = "Unlimited";
//       const updateFlag = false;
//       const vehicle = "Toyota Camry 2020";
//       const notes = "First monthly pass";
//       const today = new Date().toISOString().split("T")[0];

//       await createCustomer(
//         customerId,
//         "Acme Detailing",
//         "Jordan Lee",
//         "123 Main St",
//         "555-123-4567",
//         "jordan@example.com"
//       );

//       const returnedId = await createMonthlyPass(
//         customerId,
//         passId,
//         planType,
//         updateFlag,
//         vehicle,
//         notes
//       );

//       expect(returnedId).toBe(passId);

//       const passDoc = await getDoc(
//         doc(db, "customers", customerId, "monthlyPasses", passId)
//       );

//       expect(passDoc.exists()).toBe(true);
//       expect(passDoc.data()).toEqual({
//         creation_date: today,
//         plan_type: planType,
//         update_flag: updateFlag,
//         vehicle,
//         notes,
//       });

//       await cleanupMonthlyPass(customerId, passId);
//       await cleanupCustomer(customerId);
//     });
//   });
// });
// test("creates a monthly pass when it does not already exist", async () => {
//   const customerId = uniqId("CUSTOMER");
//   const passId = uniqId("PASS");

//   await createCustomer(
//     customerId,
//     "Acme Detailing",
//     "Jordan Lee",
//     "123 Main St",
//     "555-123-4567",
//     "jordan@example.com"
//   );

//   const result = await upsertMonthlyPass(
//     customerId,
//     passId,
//     "Unlimited",
//     false,
//     "Toyota Camry 2020",
//     "New pass"
//   );

//   expect(result).toEqual({ id: passId, existed: false });

//   const passDoc = await getDoc(
//     doc(db, "customers", customerId, "monthlyPasses", passId)
//   );

//   expect(passDoc.exists()).toBe(true);
//   expect(passDoc.data()).toEqual({
//     plan_type: "Unlimited",
//     update_flag: false,
//     vehicle: "Toyota Camry 2020",
//     notes: "New pass",
//   });

//   await cleanupMonthlyPass(customerId, passId);
//   await cleanupCustomer(customerId);
// });



// describe("getMonthlyPass", () => {
//   test("retrieves an existing monthly pass document", async () => {
//     const customerId = uniqId("CUSTOMER");
//     const passId = uniqId("PASS");
//     const today = new Date().toISOString().split("T")[0];

//     await createCustomer(
//       customerId,
//       "Acme Detailing",
//       "Jordan Lee",
//       "123 Main St",
//       "555-123-4567",
//       "jordan@example.com"
//     );

//     await createMonthlyPass(
//       customerId,
//       passId,
//       "Unlimited",
//       false,
//       "Toyota Camry 2020",
//       "First monthly pass"
//     );

//     const monthlyPass = await getMonthlyPass(customerId, passId);

//     expect(monthlyPass).toEqual({
//       passId,
//       creation_date: today,
//       plan_type: "Unlimited",
//       update_flag: false,
//       vehicle: "Toyota Camry 2020",
//       notes: "First monthly pass",
//     });

//     await cleanupMonthlyPass(customerId, passId);
//     await cleanupCustomer(customerId);
//   });

//   test("returns null for a non-existent monthly pass", async () => {
//     const customerId = uniqId("CUSTOMER");
//     const passId = uniqId("MISSING");

//     await createCustomer(
//       customerId,
//       "Acme Detailing",
//       "Jordan Lee",
//       "123 Main St",
//       "555-123-4567",
//       "jordan@example.com"
//     );

//     const monthlyPass = await getMonthlyPass(customerId, passId);

//     expect(monthlyPass).toBeNull();

//     await cleanupCustomer(customerId);
//   });
// });


// describe("getAllMonthlyPasses", () => {
//   test("retrieves all monthly passes for a customer", async () => {
//     const customerId = uniqId("CUSTOMER");
//     const passId1 = uniqId("PASS1");
//     const passId2 = uniqId("PASS2");
//     const passId3 = uniqId("PASS3");

//     await createCustomer(
//       customerId,
//       "Acme Detailing",
//       "Jordan Lee",
//       "123 Main St",
//       "555-123-4567",
//       "jordan@example.com"
//     );

//     await createMonthlyPass(
//       customerId,
//       passId1,
//       "Unlimited",
//       false,
//       "Toyota Camry 2020",
//       "First pass"
//     );

//     await createMonthlyPass(
//       customerId,
//       passId2,
//       "Basic",
//       true,
//       "Honda Accord 2021",
//       "Second pass"
//     );

//     await createMonthlyPass(
//       customerId,
//       passId3,
//       "Premium",
//       false,
//       "Ford Explorer 2022",
//       "Third pass"
//     );

//     const monthlyPasses = await getAllMonthlyPasses(customerId);

//     expect(monthlyPasses.length).toBe(3);

//     expect(monthlyPasses).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({
//           passId: passId1,
//           plan_type: "Unlimited",
//           update_flag: false,
//           vehicle: "Toyota Camry 2020",
//           notes: "First pass",
//         }),
//         expect.objectContaining({
//           passId: passId2,
//           plan_type: "Basic",
//           update_flag: true,
//           vehicle: "Honda Accord 2021",
//           notes: "Second pass",
//         }),
//         expect.objectContaining({
//           passId: passId3,
//           plan_type: "Premium",
//           update_flag: false,
//           vehicle: "Ford Explorer 2022",
//           notes: "Third pass",
//         }),
//       ])
//     );

//     await cleanupMonthlyPass(customerId, passId1);
//     await cleanupMonthlyPass(customerId, passId2);
//     await cleanupMonthlyPass(customerId, passId3);
//     await cleanupCustomer(customerId);
//   });

//   test("returns an empty array when the customer has no monthly passes", async () => {
//     const customerId = uniqId("CUSTOMER");

//     await createCustomer(
//       customerId,
//       "Acme Detailing",
//       "Jordan Lee",
//       "123 Main St",
//       "555-123-4567",
//       "jordan@example.com"
//     );

//     const monthlyPasses = await getAllMonthlyPasses(customerId);

//     expect(monthlyPasses).toEqual([]);

//     await cleanupCustomer(customerId);
//   });
// });


// describe("updateMembership", () => {
//   test("updates specific fields of an existing monthly pass", async () => {
//     const customerId = uniqId("CUSTOMER");
//     const passId = uniqId("PASS");

//     await createCustomer(
//       customerId,
//       "Acme Detailing",
//       "Jordan Lee",
//       "123 Main St",
//       "555-123-4567",
//       "jordan@example.com"
//     );

//     await createMonthlyPass(
//       customerId,
//       passId,
//       "Basic",
//       false,
//       "Toyota Camry 2020",
//       "Original note"
//     );

//     await updateMembership(customerId, passId, {
//       plan_type: "Premium",
//       update_flag: true,
//       notes: "Updated note",
//     });

//     const monthlyPass = await getMonthlyPass(customerId, passId);

//     expect(monthlyPass.plan_type).toBe("Premium");
//     expect(monthlyPass.update_flag).toBe(true);
//     expect(monthlyPass.vehicle).toBe("Toyota Camry 2020");
//     expect(monthlyPass.notes).toBe("Updated note");

//     await cleanupMonthlyPass(customerId, passId);
//     await cleanupCustomer(customerId);
//   });

//   test("updates only one field without changing the others", async () => {
//     const customerId = uniqId("CUSTOMER");
//     const passId = uniqId("PASS");

//     await createCustomer(
//       customerId,
//       "Acme Detailing",
//       "Jordan Lee",
//       "123 Main St",
//       "555-123-4567",
//       "jordan@example.com"
//     );

//     await createMonthlyPass(
//       customerId,
//       passId,
//       "Unlimited",
//       false,
//       "Honda Accord 2021",
//       "Original note"
//     );

//     await updateMembership(customerId, passId, {
//       notes: "Only note changed",
//     });

//     const monthlyPass = await getMonthlyPass(customerId, passId);

//     expect(monthlyPass.plan_type).toBe("Unlimited");
//     expect(monthlyPass.update_flag).toBe(false);
//     expect(monthlyPass.vehicle).toBe("Honda Accord 2021");
//     expect(monthlyPass.notes).toBe("Only note changed");

//     await cleanupMonthlyPass(customerId, passId);
//     await cleanupCustomer(customerId);
//   });

//   test("throws an error when updating a non-existent monthly pass", async () => {
//     const customerId = uniqId("CUSTOMER");
//     const passId = uniqId("MISSING");

//     await createCustomer(
//       customerId,
//       "Acme Detailing",
//       "Jordan Lee",
//       "123 Main St",
//       "555-123-4567",
//       "jordan@example.com"
//     );

//     await expect(
//       updateMembership(customerId, passId, { notes: "Nope" })
//     ).rejects.toThrow(`Monthly pass with ID ${passId} does not exist`);

//     await cleanupCustomer(customerId);
//   });
// });

// describe("cancelMonthlyPass", () => {
//   test("adds a cancelled_date to an existing monthly pass without removing existing fields", async () => {
//     const customerId = uniqId("CUSTOMER");
//     const passId = uniqId("PASS");
//     const today = new Date().toISOString().split("T")[0];

//     await createCustomer(
//       customerId,
//       "Acme Detailing",
//       "Jordan Lee",
//       "123 Main St",
//       "555-123-4567",
//       "jordan@example.com"
//     );

//     await createMonthlyPass(
//       customerId,
//       passId,
//       "Unlimited",
//       false,
//       "Toyota Camry 2020",
//       "First monthly pass"
//     );

//     const returnedId = await cancelMonthlyPass(customerId, passId);

//     expect(returnedId).toBe(passId);

//     const monthlyPass = await getMonthlyPass(customerId, passId);

//     expect(monthlyPass).toEqual({
//       passId,
//       creation_date: today,
//       plan_type: "Unlimited",
//       update_flag: false,
//       vehicle: "Toyota Camry 2020",
//       notes: "First monthly pass",
//       cancelled_date: today,
//     });

//     await cleanupMonthlyPass(customerId, passId);
//     await cleanupCustomer(customerId);
//   });

//   test("throws an error when cancelling a non-existent monthly pass", async () => {
//     const customerId = uniqId("CUSTOMER");
//     const passId = uniqId("MISSING");

//     await createCustomer(
//       customerId,
//       "Acme Detailing",
//       "Jordan Lee",
//       "123 Main St",
//       "555-123-4567",
//       "jordan@example.com"
//     );

//     await expect(
//       cancelMonthlyPass(customerId, passId)
//     ).rejects.toThrow(`Monthly pass with ID ${passId} does not exist`);

//     await cleanupCustomer(customerId);
//   });
// });
