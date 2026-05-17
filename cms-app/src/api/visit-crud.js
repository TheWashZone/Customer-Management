import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where, runTransaction } from "firebase/firestore";
import { db } from "./firebaseconfig";

/**
 * Creates or overwrites a visit document in the database
 * @param {string} id - The visit ID
 * @param {string} washType - Type of wash
 * @param {string} paymentType - Type of payment
 * @param {string} monthlyPassId - ID of the monthly pass (optional)
 * @returns {Promise<string>} The visit ID
 */
async function createVisit(visitId, washType, paymentType, monthlyPassId = '') {
  try {
    const visitData = {
      visit_date: new Date().toISOString().split("T")[0],
      wash_type: washType,
      payment_type: paymentType,
      monthly_pass_id: monthlyPassId
    };

    await setDoc(doc(db, "visits", visitId), visitData);
    return visitId;
  } catch (error) {
    console.error("❌ Error creating document:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Upserts a member document, only writing Excel-sourced fields.
 * If the document already exists, notes and email are preserved.
 * @param {string} visitId - The visit ID
 * @param {string} washType - Type of wash
 * @param {string} paymentType - Type of payment
 * @param {string} monthlyPassId - ID of the monthly pass (optional)
 * @returns {Promise<{id: string, existed: boolean}>}
 */
async function upsertVisit(id, washType, paymentType, monthlyPassId = '') {
  try {
    const docRef = doc(db, "visits", id);
    const today = new Date().toISOString().split("T")[0];

    const existed = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);

      if (docSnap.exists()) {
        transaction.update(docRef, {
          visit_date: today,
          wash_type: washType,
          payment_type: paymentType,
          monthly_pass_id: monthlyPassId,
        });
        return true;
      }

      transaction.set(docRef, {
        visit_date: today,
        wash_type: washType,
        payment_type: paymentType,
        monthly_pass_id: monthlyPassId,
      });
      return false;
    });

    return { id, existed };
  } catch (error) {
    console.error("Error upserting visit:", error);
    throw error;
  }
}

/**
 * Reads a single user document from the database
 * @param {string} id - The user ID to retrieve
 * @returns {Promise<Object|null>} User data object or null if not found
 */
async function getVisit(visitId) {
  try {
    const docRef = doc(db, "visits", visitId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("❌ Error reading document:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Reads all user documents from the database
 * @returns {Promise<Array>} Array of user objects
 */
async function getAllVisits() {
  try {
    const querySnapshot = await getDocs(collection(db, "visits"));
    const visits = [];
    querySnapshot.forEach((doc) => {
      visits.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return visits;
  } catch (error) {
    console.error("❌ Error reading all documents:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Queries visits by date
 * @param {string} visitDate - Date to filter by
 * @returns {Promise<Array>} Array of visit objects matching the criteria
 */
async function getVisitsByDate(visitDate) {
  try {
    const q = query(collection(db, "visits"), where("visit_date", "==", visitDate));
    const querySnapshot = await getDocs(q);
    const visits = [];
    querySnapshot.forEach((doc) => {
      visits.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return visits;
  } catch (error) {
    console.error("❌ Error querying documents:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Queries visits by date
 * @param {string} visitDate - Date to filter by
 * @returns {Promise<Array>} Array of visit objects matching the criteria
 */
async function getVisitsByWashType(washType) {
  try {
    const q = query(collection(db, "visits"), where("wash_type", "==", washType));
    const querySnapshot = await getDocs(q);
    const visits = [];
    querySnapshot.forEach((doc) => {
      visits.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return visits;
  } catch (error) {
    console.error("❌ Error querying documents:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Queries visits by payment type
 * @param {string} paymentType - Payment type to filter by
 * @returns {Promise<Array>} Array of visit objects matching the criteria
 */
async function getVisitsByPaymentType(paymentType) {
  try {
    const q = query(collection(db, "visits"), where("payment_type", "==", paymentType));
    const querySnapshot = await getDocs(q);
    const visits = [];
    querySnapshot.forEach((doc) => {
      visits.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return visits;
  } catch (error) {
    console.error("❌ Error querying documents:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Queries visits by date
 * @param {string} visitDate - Date to filter by
 * @returns {Promise<Array>} Array of visit objects matching the criteria
 */
async function getVisitsByMonthlyPassId(monthlyPassId) {
  try {
    const q = query(collection(db, "visits"), where("monthly_pass_id", "==", monthlyPassId));
    const querySnapshot = await getDocs(q);
    const visits = [];
    querySnapshot.forEach((doc) => {
      visits.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return visits;
  } catch (error) {
    console.error("❌ Error querying documents:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Updates specific fields of an existing user document
 * @param {string} id - The user ID to update
 * @param {Object} updates - Object containing fields to update
 * @returns {Promise<string>} The user ID
 */
async function updateVisit(visitId, updates) {
  try {
    const docRef = doc(db, "visits", visitId);

    // Check if document exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error(`Visit with ID ${visitId} does not exist`);
    }

    await updateDoc(docRef, updates);
    return visitId;
  } catch (error) {
    console.error("❌ Error updating document:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Deletes a user document from the database
 * @param {string} id - The user ID to delete
 * @returns {Promise<string>} The deleted user ID
 */
async function deleteVisit(visitId) {
  try {
    const docRef = doc(db, "visits", visitId);

    // Check if document exists before deleting
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error(`Visit with ID ${visitId} does not exist`);
    }

    await deleteDoc(docRef);
    return visitId;
  } catch (error) {
    console.error("❌ Error deleting document:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

export { 
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
};