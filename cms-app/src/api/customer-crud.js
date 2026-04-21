import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where, runTransaction } from "firebase/firestore";
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
async function createCustomer(id, name, contact_person, address, phone_number, email = '') {
  const customerId = id;
  try {
    const memberData = {
      date: new Date().toISOString().split("T")[0],
      name: name,
      contact_person: contact_person,
      address: address,
      phone_number: phone_number,
      email: email
    };
    await setDoc(doc(db, "customers", customerId), memberData);
    return customerId;
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
 * @param {string} id - The user ID
 * @param {string} name - User's name
 * @param {string} contact_person - Contact person information
 * @param {string} address - Address information
 * @param {string} phone_number - Phone number information
 * @param {string} email - Email address (optional)
 * @returns {Promise<{id: string, existed: boolean}>}
 */
async function upsertCustomer(id, name, contact_person, address, phone_number, email = '') {
  try {
    const docRef = doc(db, "customers", id);

    const existed = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (docSnap.exists()) {
        transaction.update(docRef, { name, contact_person, address, phone_number, email });
        return true;
      }
      transaction.set(docRef, { name, contact_person, address, phone_number, email });
      return false;
    });

    return { id, existed };
  } catch (error) {
    console.error("Error upserting document:", error);
    throw error;
  }
}

/**
 * Reads a single customer document from the database
 * @param {string} id - The customer ID to retrieve
 * @returns {Promise<Object|null>} Customer data object or null if not found
 */
async function getCustomer(id) {
  try {
    const docRef = doc(db, "customers", id);
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
async function getAllCustomers() {
  try {
    const querySnapshot = await getDocs(collection(db, "customers"));
    const customers = [];
    querySnapshot.forEach((doc) => {
      customers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return customers;
  } catch (error) {
    console.error("❌ Error reading all documents:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Updates specific fields of an existing customer document
 * @param {string} id - The customer ID to update
 * @param {Object} updates - Object containing fields to update
 * @returns {Promise<string>} The customer ID
 */
async function updateCustomer(id, updates) {
  try {
    const docRef = doc(db, "customers", id);

    // Check if document exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error(`Customer with ID ${id} does not exist`);
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
async function deleteCustomer(id) {
  try {
    const docRef = doc(db, "customers", id);

    // Check if document exists before deleting
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error(`Customer with ID ${id} does not exist`);
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
  createCustomer, upsertCustomer, getCustomer, getAllCustomers, updateCustomer, deleteCustomer
};
