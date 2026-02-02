import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db } from "./firebaseconfig";

const COLLECTION_NAME = "prepaidMembers";

/**
 * Creates a prepaid member document in the database
 * @param {string} id - The prepaid member ID (P + 3-5 digits, e.g. "P101")
 * @param {string} name - Member's name
 * @param {string} type - Car wash type: "B", "U", or "D"
 * @param {string} issueDate - Date the prepaid membership was issued
 * @param {string} lastVisitDate - Date of the member's last visit
 * @param {number} prepaidWashes - Number of prepaid washes remaining
 * @param {string} notes - Additional notes
 * @returns {Promise<string>} The prepaid member ID
 */
async function createPrepaidMember(id, name, type, issueDate, lastVisitDate, prepaidWashes, notes) {
  try {
    const memberData = {
      name: name,
      type: type,
      issueDate: issueDate,
      lastVisitDate: lastVisitDate,
      prepaidWashes: prepaidWashes,
      notes: notes
    };
    await setDoc(doc(db, COLLECTION_NAME, id), memberData);
    return id;
  } catch (error) {
    console.error("Error creating prepaid member:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    throw error;
  }
}

/**
 * Reads a single prepaid member document from the database
 * @param {string} id - The prepaid member ID to retrieve
 * @returns {Promise<Object|null>} Prepaid member data object or null if not found
 */
async function getPrepaidMember(id) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
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
    console.error("Error reading prepaid member:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    throw error;
  }
}

/**
 * Reads all prepaid member documents from the database
 * @returns {Promise<Array>} Array of prepaid member objects
 */
async function getAllPrepaidMembers() {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const members = [];
    querySnapshot.forEach((doc) => {
      members.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return members;
  } catch (error) {
    console.error("Error reading all prepaid members:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    throw error;
  }
}

/**
 * Updates specific fields of an existing prepaid member document
 * @param {string} id - The prepaid member ID to update
 * @param {Object} updates - Object containing fields to update
 * @returns {Promise<string>} The prepaid member ID
 */
async function updatePrepaidMember(id, updates) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error(`Prepaid member with ID ${id} does not exist`);
    }

    await updateDoc(docRef, updates);
    return id;
  } catch (error) {
    console.error("Error updating prepaid member:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    throw error;
  }
}

/**
 * Deletes a prepaid member document from the database
 * @param {string} id - The prepaid member ID to delete
 * @returns {Promise<string>} The deleted prepaid member ID
 */
async function deletePrepaidMember(id) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error(`Prepaid member with ID ${id} does not exist`);
    }

    await deleteDoc(docRef);
    return id;
  } catch (error) {
    console.error("Error deleting prepaid member:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    throw error;
  }
}

export {
  createPrepaidMember,
  getPrepaidMember,
  getAllPrepaidMembers,
  updatePrepaidMember,
  deletePrepaidMember
};
