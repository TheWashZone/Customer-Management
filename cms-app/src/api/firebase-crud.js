import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebaseconfig";

/**
 * Creates or overwrites a user document in the database
 * @param {string} id - The user ID
 * @param {string} name - User's name
 * @param {string} car - Car information
 * @param {boolean} isActive - Whether the user is active
 * @param {boolean} validPayment - Whether payment is valid
 * @param {string} notes - Additional notes
 * @returns {Promise<string>} The user ID
 */
async function createMember(id, name, car, isActive, validPayment, notes) {
  const userId = id;
  try {
    const userData = {
      name: name,
      car: car,
      isActive: isActive,
      validPayment: validPayment,
      notes: notes
    };
    await setDoc(doc(db, "users", userId), userData);
    return userId;
  } catch (error) {
    console.error("❌ Error creating document:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Reads a single user document from the database
 * @param {string} id - The user ID to retrieve
 * @returns {Promise<Object|null>} User data object or null if not found
 */
async function getMember(id) {
  try {
    const docRef = doc(db, "users", id);
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
async function getAllMembers() {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    const members = [];
    querySnapshot.forEach((doc) => {
      members.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return members;
  } catch (error) {
    console.error("❌ Error reading all documents:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Queries users by payment status
 * @param {boolean} validPayment - Payment status to filter by
 * @returns {Promise<Array>} Array of user objects matching the criteria
 */
async function getMembersByPaymentStatus(validPayment) {
  try {
    const q = query(collection(db, "users"), where("validPayment", "==", validPayment));
    const querySnapshot = await getDocs(q);
    const members = [];
    querySnapshot.forEach((doc) => {
      members.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return members;
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
async function updateMember(id, updates) {
  try {
    const docRef = doc(db, "users", id);

    // Check if document exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error(`User with ID ${id} does not exist`);
    }

    await updateDoc(docRef, updates);
    return id;
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
async function deleteMember(id) {
  try {
    const docRef = doc(db, "users", id);

    // Check if document exists before deleting
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error(`User with ID ${id} does not exist`);
    }

    await deleteDoc(docRef);
    return id;
  } catch (error) {
    console.error("❌ Error deleting document:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

export {
  createMember,
  getMember,
  getAllMembers,
  getMembersByPaymentStatus,
  updateMember,
  deleteMember
};
