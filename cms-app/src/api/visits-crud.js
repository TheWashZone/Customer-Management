import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseconfig";

const VISITS_COLLECTION = "Visits";
const VALID_WASH_TYPES = new Set(['B', 'D', 'U']);
const VALID_PAYMENT_TYPES = new Set(['cash', 'credit', 'free', 'book']);

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function createGeneratedDocRef() {
  return doc(collection(db, VISITS_COLLECTION));
}

function cleanVisitUpdates(updates = {}) {
  return {
    ...(updates.typeOfWash !== undefined ? { typeOfWash: cleanText(updates.typeOfWash).toUpperCase() } : {}),
    ...(updates.typeOfPayment !== undefined ? { typeOfPayment: cleanText(updates.typeOfPayment).toLowerCase() } : {}),
    ...(updates.monthlyId !== undefined ? { monthlyId: cleanText(updates.monthlyId) } : {}),
    ...(updates.userId !== undefined ? { userId: cleanText(updates.userId) } : {})
  };
}

function buildVisitRecord(visit = {}) {
  const typeOfWash = cleanText(visit.typeOfWash).toUpperCase();
  const typeOfPayment = cleanText(visit.typeOfPayment).toLowerCase();

  if (!VALID_WASH_TYPES.has(typeOfWash)) {
    throw new Error(`Invalid typeOfWash: "${visit.typeOfWash}". Must be one of: B, D, U`);
  }

  if (!VALID_PAYMENT_TYPES.has(typeOfPayment)) {
    throw new Error(`Invalid typeOfPayment: "${visit.typeOfPayment}". Must be one of: cash, credit, free, book`);
  }

  return {
    typeOfWash,
    typeOfPayment,
    monthlyId: cleanText(visit.monthlyId),
    userId: cleanText(visit.userId),
    date: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}

async function createVisit(visit = {}) {
  const visitRecord = buildVisitRecord(visit);
  const visitRef = createGeneratedDocRef();

  await setDoc(visitRef, visitRecord);

  return visitRef.id;
}

async function getVisit(visitId) {
  try {
    const docRef = doc(db, VISITS_COLLECTION, visitId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    };
  } catch (error) {
    console.error('Error reading visit:', error);
    throw error;
  }
}

async function getAllVisits() {
  try {
    const querySnapshot = await getDocs(collection(db, VISITS_COLLECTION));
    const visits = [];

    querySnapshot.forEach((docSnap) => {
      visits.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    return visits;
  } catch (error) {
    console.error('Error reading visits:', error);
    throw error;
  }
}

async function updateVisit(visitId, updates = {}) {
  try {
    const docRef = doc(db, VISITS_COLLECTION, visitId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error(`Visit with ID ${visitId} does not exist`);
    }

    const cleanUpdates = cleanVisitUpdates(updates);

    if (cleanUpdates.typeOfWash && !VALID_WASH_TYPES.has(cleanUpdates.typeOfWash)) {
      throw new Error(`Invalid typeOfWash: "${updates.typeOfWash}". Must be one of: B, D, U`);
    }

    if (cleanUpdates.typeOfPayment && !VALID_PAYMENT_TYPES.has(cleanUpdates.typeOfPayment)) {
      throw new Error(`Invalid typeOfPayment: "${updates.typeOfPayment}". Must be one of: cash, credit, free, book`);
    }

    if (Object.keys(cleanUpdates).length === 0) {
      return visitId;
    }

    await updateDoc(docRef, {
      ...cleanUpdates,
      updatedAt: serverTimestamp()
    });

    return visitId;
  } catch (error) {
    console.error('Error updating visit:', error);
    throw error;
  }
}

async function deleteVisit(visitId) {
  try {
    const docRef = doc(db, VISITS_COLLECTION, visitId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error(`Visit with ID ${visitId} does not exist`);
    }

    await deleteDoc(docRef);
    return visitId;
  } catch (error) {
    console.error('Error deleting visit:', error);
    throw error;
  }
}

async function logVisit(visit = {}) {
  return createVisit(visit);
}

export {
  createVisit,
  getVisit,
  getAllVisits,
  updateVisit,
  deleteVisit,
  logVisit
};