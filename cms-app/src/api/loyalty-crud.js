import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db } from "./firebaseconfig";

const COLLECTION_NAME = "loyaltyMembers";

/**
 * Creates a loyalty member document in the database
 * @param {string} id - The loyalty member ID (L + 3-5 digits, e.g. "L101")
 * @param {string} name - Member's name
 * @param {string} issueDate - Date the loyalty membership was issued
 * @param {string} lastVisitDate - Date of the member's last visit
 * @param {number} visitCount - Number of times the member has visited
 * @param {string} notes - Additional notes
 * @param {string} email - Email address (optional)
 * @returns {Promise<string>} The loyalty member ID
 */
async function createLoyaltyMember(id, name, issueDate, lastVisitDate, visitCount, notes, email = '') {
  try {
    const memberData = {
      name: name,
      issueDate: issueDate,
      lastVisitDate: lastVisitDate,
      visitCount: visitCount,
      notes: notes,
      email: email
    };
    await setDoc(doc(db, COLLECTION_NAME, id), memberData);
    return id;
  } catch (error) {
    console.error("Error creating loyalty member:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    throw error;
  }
}

/**
 * Reads a single loyalty member document from the database
 * @param {string} id - The loyalty member ID to retrieve
 * @returns {Promise<Object|null>} Loyalty member data object or null if not found
 */
async function getLoyaltyMember(id) {
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
    console.error("Error reading loyalty member:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    throw error;
  }
}

/**
 * Reads all loyalty member documents from the database
 * @returns {Promise<Array>} Array of loyalty member objects
 */
async function getAllLoyaltyMembers() {
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
    console.error("Error reading all loyalty members:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    throw error;
  }
}

/**
 * Updates specific fields of an existing loyalty member document
 * @param {string} id - The loyalty member ID to update
 * @param {Object} updates - Object containing fields to update
 * @returns {Promise<string>} The loyalty member ID
 */
async function updateLoyaltyMember(id, updates) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error(`Loyalty member with ID ${id} does not exist`);
    }

    await updateDoc(docRef, updates);
    return id;
  } catch (error) {
    console.error("Error updating loyalty member:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    throw error;
  }
}

/**
 * Deletes a loyalty member document from the database
 * @param {string} id - The loyalty member ID to delete
 * @returns {Promise<string>} The deleted loyalty member ID
 */
async function deleteLoyaltyMember(id) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error(`Loyalty member with ID ${id} does not exist`);
    }

    await deleteDoc(docRef);
    return id;
  } catch (error) {
    console.error("Error deleting loyalty member:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    throw error;
  }
}

export {
  createLoyaltyMember,
  getLoyaltyMember,
  getAllLoyaltyMembers,
  updateLoyaltyMember,
  deleteLoyaltyMember
};
