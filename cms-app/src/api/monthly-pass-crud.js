import { doc, setDoc, getDoc, updateDoc, collection, getDocs, runTransaction } from "firebase/firestore";
import { db } from "./firebaseconfig";


/**
 * Creates or overwrites a user document in the database
 * @param {string} id - The user ID
 * @param {string} name - User's name
 * @param {string} contact_person - Contact person information
 * @param {string} address - Address information
 * @param {string} phone_number - Phone number information
 * @param {string} email - Email address (optional)
 * @returns {Promise<string>} The user ID
 */
async function createMonthlyPass(customerId, passId, plan_type, update_flag, vehicle, notes = '') {
  const passRef = doc(db, "customers", customerId, "monthlyPasses", passId);
  try {
    const memberData = {
      creation_date: new Date().toISOString().split("T")[0],
      plan_type: plan_type,
      update_flag: update_flag,
      vehicle: vehicle,
      notes: notes
    };
    await setDoc(passRef, memberData);
    return passId;
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
 * @param {string} customerId - The customer ID
 * @param {string} passId - The monthly pass ID
 * @param {string} plan_type - The plan type
 * @param {string} update_flag - The update flag
 * @param {string} vehicle - The vehicle information
 * @param {string} notes - The notes (optional)
 * @returns {Promise<{id: string, existed: boolean}>}
 */
async function upsertMonthlyPass(customerId, passId, plan_type, update_flag, vehicle, notes = '') {
  try {
    const docRef = doc(db, "customers", customerId, "monthlyPasses", passId);

    const existed = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (docSnap.exists()) {
        transaction.update(docRef, { plan_type, update_flag, vehicle, notes });
        return true;
      }
      transaction.set(docRef, { plan_type, update_flag, vehicle, notes });
      return false;
    });

    return { id: passId, existed };
  } catch (error) {
    console.error("Error upserting document:", error);
    throw error;
  }
}

/**
 * Reads a single monthly pass document from the database
 * @param {string} customerId - The customer ID to retrieve
 * @param {string} passId - The monthly pass ID to retrieve
 * @returns {Promise<Object|null>} Monthly pass data object or null if not found
 */
async function getMonthlyPass(customerId, passId) {
  try {
    const docRef = doc(db, "customers", customerId, "monthlyPasses", passId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        passId: docSnap.id,
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
async function getAllMonthlyPasses(customerId) {
  try {
    const querySnapshot = await getDocs(collection(db, "customers", customerId, "monthlyPasses"));
    const monthlyPasses = [];
    querySnapshot.forEach((doc) => {
      monthlyPasses.push({
        passId: doc.id,
        ...doc.data()
      });
    });
    return monthlyPasses;
  } catch (error) {
    console.error("❌ Error reading all documents:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}


/**
 * Updates specific fields of an existing monthly pass document
 * @param {string} customerId - The customer ID to update
 * @param {string} passId - The monthly pass ID to update
 * @param {Object} updates - Object containing fields to update
 * @returns {Promise<string>} The customer ID
 */
async function updateMembership(customerId, passId, updates) {
  try {
    const docRef = doc(db, "customers", customerId, "monthlyPasses", passId);

    // Check if document exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error(`Monthly pass with ID ${passId} does not exist`);
    }

    await updateDoc(docRef, updates);
    return passId;
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
async function cancelMonthlyPass(customerId, passId) {
  try {
    const docRef = doc(db, "customers", customerId, "monthlyPasses", passId);

    // Check if document exists before deleting
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error(`Monthly pass with ID ${passId} does not exist`);
    }

    await setDoc(docRef, { cancelled_date: new Date().toISOString().split("T")[0] }, { merge: true });

    return passId;
  } catch (error) {
    console.error("❌ Error cancelling document:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}



export {createMonthlyPass, upsertMonthlyPass, getMonthlyPass, getAllMonthlyPasses, updateMembership, cancelMonthlyPass};