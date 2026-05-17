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
import { 
  createVisit, 
  upsertVisit,
  getVisit,
  getAllVisits,
  getVisitsByDate,
  getVisitsByWashType,
  getVisitsByPaymentType,
  getVisitsByMonthlyPassId,
  updateVisit,
  deleteVisit
} from "../api/visit-crud.js";

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

function uniqId(prefix = "visit") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function cleanupVisit(id) {
  await deleteDoc(doc(db, "visits", id)).catch(() => {});
}

describe("Visit CRUD Operations (emulator)", () => {
  describe("createVisit", () => {
    test("creates a visit document with the expected fields", async () => {
      const id = uniqId("VISIT");
      const washType = "Deluxe";
      const paymentType = "monthly_pass";
      const monthlyPassId = "PASS_001";
      const today = new Date().toISOString().split("T")[0];

      const returnedId = await createVisit(
        id,
        washType,
        paymentType,
        monthlyPassId
      );

      expect(returnedId).toBe(id);

      const visitDoc = await getDoc(doc(db, "visits", id));

      expect(visitDoc.exists()).toBe(true);
      expect(visitDoc.data()).toEqual({
        visit_date: today,
        wash_type: washType,
        payment_type: paymentType,
        monthly_pass_id: monthlyPassId,
      });

      await cleanupVisit(id);
    });

    test("stores an empty monthly_pass_id when one is not provided", async () => {
      const id = uniqId("VISIT");
      const washType = "Basic";
      const paymentType = "cash";
      const today = new Date().toISOString().split("T")[0];

      const returnedId = await createVisit(id, washType, paymentType);

      expect(returnedId).toBe(id);

      const visitDoc = await getDoc(doc(db, "visits", id));

      expect(visitDoc.exists()).toBe(true);
      expect(visitDoc.data()).toEqual({
        visit_date: today,
        wash_type: washType,
        payment_type: paymentType,
        monthly_pass_id: "",
      });

      await cleanupVisit(id);
    });
  });
});

describe("upsertVisit", () => {
  test("creates a visit when it does not already exist", async () => {
    const id = uniqId("VISIT");
    const washType = "Deluxe";
    const paymentType = "monthly_pass";
    const monthlyPassId = "PASS_001";
    const today = new Date().toISOString().split("T")[0];

    const result = await upsertVisit(
      id,
      washType,
      paymentType,
      monthlyPassId
    );

    expect(result).toEqual({ id, existed: false });

    const visitDoc = await getDoc(doc(db, "visits", id));

    expect(visitDoc.exists()).toBe(true);
    expect(visitDoc.data()).toEqual({
      visit_date: today,
      wash_type: washType,
      payment_type: paymentType,
      monthly_pass_id: monthlyPassId,
    });

    await deleteDoc(doc(db, "visits", id)).catch(() => {});
  });

  test("updates an existing visit and reports that it already existed", async () => {
    const id = uniqId("VISIT");
    const today = new Date().toISOString().split("T")[0];

    await createVisit(id, "Basic", "cash", "");

    const result = await upsertVisit(
      id,
      "Ultimate",
      "monthly_pass",
      "PASS_123"
    );

    expect(result).toEqual({ id, existed: true });

    const visitDoc = await getDoc(doc(db, "visits", id));

    expect(visitDoc.exists()).toBe(true);
    expect(visitDoc.data()).toEqual({
      visit_date: today,
      wash_type: "Ultimate",
      payment_type: "monthly_pass",
      monthly_pass_id: "PASS_123",
    });

    await deleteDoc(doc(db, "visits", id)).catch(() => {});
  });
});

describe("getVisit", () => {
  test("retrieves an existing visit document", async () => {
    const id = uniqId("VISIT");
    const washType = "Deluxe";
    const paymentType = "monthly_pass";
    const monthlyPassId = "PASS_001";
    const today = new Date().toISOString().split("T")[0];

    await createVisit(id, washType, paymentType, monthlyPassId);

    const visit = await getVisit(id);

    expect(visit).toEqual({
      id,
      visit_date: today,
      wash_type: washType,
      payment_type: paymentType,
      monthly_pass_id: monthlyPassId,
    });

    await deleteDoc(doc(db, "visits", id)).catch(() => {});
  });

  test("returns null for a non-existent visit", async () => {
    const id = uniqId("MISSING");

    const visit = await getVisit(id);

    expect(visit).toBeNull();
  });
});

describe("getAllVisits", () => {
  test("retrieves all visit documents", async () => {
    const id1 = uniqId("VISIT1");
    const id2 = uniqId("VISIT2");
    const id3 = uniqId("VISIT3");

    await createVisit(id1, "Basic", "cash", "");
    await createVisit(id2, "Deluxe", "monthly_pass", "PASS_001");
    await createVisit(id3, "Ultimate", "card", "");

    const visits = await getAllVisits();

    expect(visits.length).toBeGreaterThanOrEqual(3);

    const testVisits = visits.filter(
      (visit) =>
        visit.id === id1 ||
        visit.id === id2 ||
        visit.id === id3
    );

    expect(testVisits.length).toBe(3);

    await deleteDoc(doc(db, "visits", id1)).catch(() => {});
    await deleteDoc(doc(db, "visits", id2)).catch(() => {});
    await deleteDoc(doc(db, "visits", id3)).catch(() => {});
  });

  test("returns an array when there are no matching test visits", async () => {
    const visits = await getAllVisits();

    expect(Array.isArray(visits)).toBe(true);
  });
});

describe("getVisitsByDate", () => {
  test("retrieves visits that match the given visit_date", async () => {
    const id1 = uniqId("VISIT1");
    const id2 = uniqId("VISIT2");
    const id3 = uniqId("VISIT3");
    const today = new Date().toISOString().split("T")[0];

    await createVisit(id1, "Basic", "cash", "");
    await createVisit(id2, "Deluxe", "monthly_pass", "PASS_001");
    await createVisit(id3, "Ultimate", "card", "");

    const visits = await getVisitsByDate(today);

    const matchingVisits = visits.filter(
      (visit) =>
        visit.id === id1 ||
        visit.id === id2 ||
        visit.id === id3
    );

    expect(matchingVisits.length).toBe(3);

    await deleteDoc(doc(db, "visits", id1)).catch(() => {});
    await deleteDoc(doc(db, "visits", id2)).catch(() => {});
    await deleteDoc(doc(db, "visits", id3)).catch(() => {});
  });

  test("returns an empty array when no visits match the given date", async () => {
    const visits = await getVisitsByDate("2099-12-31");

    expect(visits).toEqual([]);
  });
});

describe("getVisitsByWashType", () => {
  test("retrieves visits that match the given wash type", async () => {
    const id1 = uniqId("VISIT1");
    const id2 = uniqId("VISIT2");
    const id3 = uniqId("VISIT3");

    await createVisit(id1, "Deluxe", "cash", "");
    await createVisit(id2, "Deluxe", "monthly_pass", "PASS_001");
    await createVisit(id3, "Basic", "card", "");

    const visits = await getVisitsByWashType("Deluxe");

    const matchingVisits = visits.filter(
      (visit) =>
        visit.id === id1 ||
        visit.id === id2
    );

    expect(matchingVisits.length).toBe(2);

    const nonMatchingVisit = visits.find((visit) => visit.id === id3);
    expect(nonMatchingVisit).toBeUndefined();

    await deleteDoc(doc(db, "visits", id1)).catch(() => {});
    await deleteDoc(doc(db, "visits", id2)).catch(() => {});
    await deleteDoc(doc(db, "visits", id3)).catch(() => {});
  });

  test("returns an empty array when no visits match the given wash type", async () => {
    const visits = await getVisitsByWashType("NonexistentWash");

    expect(visits).toEqual([]);
  });
});

describe("getVisitsByPaymentType", () => {
  test("retrieves visits that match the given payment type", async () => {
    const id1 = uniqId("VISIT1");
    const id2 = uniqId("VISIT2");
    const id3 = uniqId("VISIT3");

    await createVisit(id1, "Deluxe", "monthly_pass", "PASS_001");
    await createVisit(id2, "Basic", "monthly_pass", "");
    await createVisit(id3, "Ultimate", "cash", "");

    const visits = await getVisitsByPaymentType("monthly_pass");

    const matchingVisits = visits.filter(
      (visit) =>
        visit.id === id1 ||
        visit.id === id2
    );

    expect(matchingVisits.length).toBe(2);

    const nonMatchingVisit = visits.find((visit) => visit.id === id3);
    expect(nonMatchingVisit).toBeUndefined();

    await deleteDoc(doc(db, "visits", id1)).catch(() => {});
    await deleteDoc(doc(db, "visits", id2)).catch(() => {});
    await deleteDoc(doc(db, "visits", id3)).catch(() => {});
  });

  test("returns an empty array when no visits match the given payment type", async () => {
    const visits = await getVisitsByPaymentType("NonexistentPayment");

    expect(visits).toEqual([]);
  });   
});

describe("getVisitsByMonthlyPassId", () => {
  test("retrieves visits that match the given monthly pass ID", async () => {
    const id1 = uniqId("VISIT1");
    const id2 = uniqId("VISIT2");
    const id3 = uniqId("VISIT3");
    const monthlyPassId = "PASS_001";

    await createVisit(id1, "Deluxe", "monthly_pass", monthlyPassId);
    await createVisit(id2, "Basic", "monthly_pass", monthlyPassId);
    await createVisit(id3, "Ultimate", "cash", "");

    const visits = await getVisitsByMonthlyPassId(monthlyPassId);

    const matchingVisits = visits.filter(
      (visit) =>
        visit.id === id1 ||
        visit.id === id2
    );

    expect(matchingVisits.length).toBe(2);

    const nonMatchingVisit = visits.find((visit) => visit.id === id3);
    expect(nonMatchingVisit).toBeUndefined();

    await deleteDoc(doc(db, "visits", id1)).catch(() => {});
    await deleteDoc(doc(db, "visits", id2)).catch(() => {});
    await deleteDoc(doc(db, "visits", id3)).catch(() => {});
  });

  test("returns an empty array when no visits match the given monthly pass ID", async () => {
    const visits = await getVisitsByMonthlyPassId("PASS_DOES_NOT_EXIST");

    expect(visits).toEqual([]);
  });
});


describe("updateVisit", () => {
  test("updates specific fields of an existing visit", async () => {
    const id = uniqId("VISIT");

    await createVisit(id, "Basic", "cash", "");

    await updateVisit(id, {
      wash_type: "Deluxe",
      payment_type: "monthly_pass",
      monthly_pass_id: "PASS_001",
    });

    const visit = await getVisit(id);

    expect(visit.wash_type).toBe("Deluxe");
    expect(visit.payment_type).toBe("monthly_pass");
    expect(visit.monthly_pass_id).toBe("PASS_001");

    await deleteDoc(doc(db, "visits", id)).catch(() => {});
  });

  test("updates only one field without changing the others", async () => {
    const id = uniqId("VISIT");

    await createVisit(id, "Ultimate", "card", "");

    await updateVisit(id, {
      payment_type: "cash",
    });

    const visit = await getVisit(id);

    expect(visit.wash_type).toBe("Ultimate");
    expect(visit.payment_type).toBe("cash");
    expect(visit.monthly_pass_id).toBe("");

    await deleteDoc(doc(db, "visits", id)).catch(() => {});
  });

  test("throws an error when updating a non-existent visit", async () => {
    const id = uniqId("MISSING");

    await expect(
      updateVisit(id, { wash_type: "Deluxe" })
    ).rejects.toThrow(`Visit with ID ${id} does not exist`);
  });
});

describe("deleteVisit", () => {
  test("deletes an existing visit document", async () => {
    const id = uniqId("VISIT");

    await createVisit(id, "Basic", "cash", "");

    let visit = await getVisit(id);
    expect(visit).toBeDefined();

    const deletedId = await deleteVisit(id);
    expect(deletedId).toBe(id);

    visit = await getVisit(id);
    expect(visit).toBeNull();
  });

  test("throws an error when deleting a non-existent visit", async () => {
    const id = uniqId("MISSING");

    await expect(deleteVisit(id)).rejects.toThrow(
      `Visit with ID ${id} does not exist`
    );
  });
});