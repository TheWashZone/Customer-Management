import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  runTransaction,
  collectionGroup,
  query,
  where
} from "firebase/firestore";
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
async function createMember(id, name, contact_person='', address='', phone_number = '', email = '') {
  const userId = id;
  try {
    const userData = {
      date: new Date().toISOString().split("T")[0],
      name: name,
      contact_person: contact_person,
      address: address,
      phone_number: phone_number,
      email: email,
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

/**This function creates a member and a monthly pass in a single transaction
 * @param {string} userId - The user ID for the member
 * @param {string} passId - The monthly pass ID
 * @param {string} name - User's name
 * @param {string} contact_person - Contact person information
 * @param {string} address - Address information
 * @param {string} phone_number - Phone number information
 * @param {string} email - Email address (optional)
 * @param {string} plan_type - Monthly pass plan type
 * @param {string} status - Monthly pass status
 * @param {string} vehicle - Vehicle information for the monthly pass
 * @param {string} notes - Additional notes for the monthly pass (optional)
 * @returns {Promise<string>} The user ID of the created member
 */
async function createMemberWithMonthlyPass(
  userId,
  passId,
  name,
  contact_person = '',
  address = '',
  phone_number = '',
  email = '',
  plan_type,
  status,
  vehicle = '',
  notes = ''
) {
  const userRef = doc(db, "users", userId);
  const passRef = doc(db, "users", userId, "monthlyPasses", passId);
  const passIdRef = doc(db, "monthlyPassIds", passId);

  const today = new Date().toISOString().split("T")[0];

  await runTransaction(db, async (transaction) => {
    const existingUser = await transaction.get(userRef);
    const existingPassId = await transaction.get(passIdRef);

    if (existingUser.exists()) {
      throw new Error(`User with ID ${userId} already exists`);
    }

    if (existingPassId.exists()) {
      throw new Error(`Monthly pass with ID ${passId} already exists`);
    }

    transaction.set(userRef, {
      date: today,
      name,
      contact_person,
      address,
      phone_number,
      email,
    });

    transaction.set(passRef, {
      passId,
      creation_date: today,
      plan_type,
      status,
      status,
      vehicle,
      notes,
    });

    transaction.set(passIdRef, {
      userId,
      passId,
      creation_date: today,
    });
  });

  return userId;
}


/**
 * Upserts a member document
 * @returns {Promise<{id: string, existed: boolean}>}
 */
async function upsertMember(id, name, contact_person='', address='', phone_number = '', email = '') {
  try {
    const docRef = doc(db, "users", id);

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
 * Updates specific fields of an existing user document
 * @param {string} id - The user ID to update
 * @param {Object} updates - Object containing fields to update
 * @returns {Promise<string>} The user ID
 */
async function updateMember(id, updates) {
  try {
    const docRef = doc(db, "users", id);

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
 * Deletes a user document and that user's monthly passes
 * @param {string} id - The user ID to delete
 * @returns {Promise<string>} The deleted user ID
 */
async function deleteMember(id) {
  try {
    const docRef = doc(db, "users", id);

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error(`User with ID ${id} does not exist`);
    }

    const monthlyPassesRef = collection(db, "users", id, "monthlyPasses");
    const monthlyPassesSnapshot = await getDocs(monthlyPassesRef);

    for (const passDoc of monthlyPassesSnapshot.docs) {
      await deleteDoc(doc(db, "users", id, "monthlyPasses", passDoc.id));
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

/**
 * Finds and returns the member who owns a given monthly pass ID
 * @param {string} passId - The monthly pass ID
 * @returns {Promise<Object|null>} Member object or null if not found
 */
async function getMemberByMonthlyPassId(passId) {
  try {
    const q = query(
      collectionGroup(db, "monthlyPasses"),
      where("passId", "==", passId)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const passDoc = snapshot.docs[0];

    // Get parent user document
    const userRef = passDoc.ref.parent.parent;
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    return {
      id: userSnap.id,
      ...userSnap.data()
    };

  } catch (error) {
    console.error("❌ Error finding member by monthly pass ID:", error);
    throw error;
  }
}


export {
  createMember,
  upsertMember,
  getMember,
  getAllMembers,
  updateMember,
  deleteMember,
  getMemberByMonthlyPassId,
  createMemberWithMonthlyPass
};




// import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, runTransaction } from "firebase/firestore";
// import { db } from "./firebaseconfig";

// // /**
// //  * Creates or overwrites a user document in the database
// //  * @param {string} id - The user ID
// //  * @param {string} name - User's name
// //  * @param {string} car - Car information
// //  * @param {'active'|'inactive'|'payment_needed'} status - Member status
// //  * @param {string} notes - Additional notes
// //  * @param {string} email - Email address (optional)
// //  * @returns {Promise<string>} The user ID
// //  */
// // async function createMember(id, name, car, status, notes, email = '') {
// //   const userId = id;
// //   try {
// //     const userData = {
// //       name: name,
// //       car: car,
// //       status: status,
// //       notes: notes,
// //       email: email
// //     };
// //     await setDoc(doc(db, "users", userId), userData);
// //     return userId;
// //   } catch (error) {
// //     console.error("❌ Error creating document:", error);
// //     console.error("Error code:", error.code);
// //     console.error("Error message:", error.message);
// //     console.error("Error stack:", error.stack);
// //     throw error;
// //   }
// // }

// /**
//  * Creates or overwrites a user document in the database
//  * @param {string} id - The user ID
//  * @param {string} name - User's name
//  * @param {string} contact_person - Contact person information
//  * @param {string} address - Address information
//  * @param {string} phone_number - Phone number information
//  * @param {string} email - Email address (optional)
//  * @returns {Promise<string>} The user ID
//  */
// async function createMember(id, name, contact_person, address, phone_number, email = '') {
//   const userId = id;
//   try {
//     const userData = {
//       date: new Date().toISOString().split("T")[0],
//       name: name,
//       contact_person: contact_person,
//       address: address,
//       phone_number: phone_number,
//       email: email
//     };
//     await setDoc(doc(db, "users", userId), userData);
//     return userId;
//   } catch (error) {
//     console.error("❌ Error creating document:", error);
//     console.error("Error code:", error.code);
//     console.error("Error message:", error.message);
//     console.error("Error stack:", error.stack);
//     throw error;
//   }
// }

// // /**
// //  * Upserts a member document, only writing Excel-sourced fields.
// //  * If the document already exists, notes and email are preserved.
// //  * @param {string} id - The user ID
// //  * @param {string} name - User's name
// //  * @param {string} car - Car information
// //  * @param {'active'|'inactive'|'payment_needed'} status - Member status
// //  * @returns {Promise<{id: string, existed: boolean}>}
// //  */
// // async function upsertMember(id, name, car, status) {
// //   try {
// //     const docRef = doc(db, "users", id);

// //     const existed = await runTransaction(db, async (transaction) => {
// //       const docSnap = await transaction.get(docRef);
// //       if (docSnap.exists()) {
// //         transaction.update(docRef, { name, car, status });
// //         return true;
// //       }
// //       transaction.set(docRef, { name, car, status, notes: '', email: '' });
// //       return false;
// //     });

// //     return { id, existed };
// //   } catch (error) {
// //     console.error("Error upserting document:", error);
// //     throw error;
// //   }
// // }

// /**
//  * Upserts a member document, only writing Excel-sourced fields.
//  * If the document already exists, notes and email are preserved.
//  * @param {string} id - The user ID
//  * @param {string} name - User's name
//  * @param {string} car - Car information
//  * @param {'active'|'inactive'|'payment_needed'} status - Member status
//  * @returns {Promise<{id: string, existed: boolean}>}
//  */
// async function upsertMember(id, name, contact_person, address, phone_number, email = '') {
//   try {
//     const docRef = doc(db, "users", id);

//     const existed = await runTransaction(db, async (transaction) => {
//       const docSnap = await transaction.get(docRef);
//       if (docSnap.exists()) {
//         transaction.update(docRef, { name, contact_person, address, phone_number, email });
//         return true;
//       }
//       transaction.set(docRef, { name, contact_person, address, phone_number, email });
//       return false;
//     });

//     return { id, existed };
//   } catch (error) {
//     console.error("Error upserting document:", error);
//     throw error;
//   }
// }

// // /**
// //  * Reads a single user document from the database
// //  * @param {string} id - The user ID to retrieve
// //  * @returns {Promise<Object|null>} User data object or null if not found
// //  */
// // async function getMember(id) {
// //   try {
// //     const docRef = doc(db, "users", id);
// //     const docSnap = await getDoc(docRef);

// //     if (docSnap.exists()) {
// //       return {
// //         id: docSnap.id,
// //         ...docSnap.data()
// //       };
// //     } else {
// //       return null;
// //     }
// //   } catch (error) {
// //     console.error("❌ Error reading document:", error);
// //     console.error("Error code:", error.code);
// //     console.error("Error message:", error.message);
// //     console.error("Error stack:", error.stack);
// //     throw error;
// //   }
// // }

// /**
//  * Reads a single user document from the database
//  * @param {string} id - The user ID to retrieve
//  * @returns {Promise<Object|null>} User data object or null if not found
//  */
// async function getMember(id) {
//   try {
//     const docRef = doc(db, "users", id);
//     const docSnap = await getDoc(docRef);

//     if (docSnap.exists()) {
//       return {
//         id: docSnap.id,
//         ...docSnap.data()
//       };
//     } else {
//       return null;
//     }
//   } catch (error) {
//     console.error("❌ Error reading document:", error);
//     console.error("Error code:", error.code);
//     console.error("Error message:", error.message);
//     console.error("Error stack:", error.stack);
//     throw error;
//   }
// }

// /**
//  * Reads all user documents from the database
//  * @returns {Promise<Array>} Array of user objects
//  */
// async function getAllMembers() {
//   try {
//     const querySnapshot = await getDocs(collection(db, "users"));
//     const members = [];
//     querySnapshot.forEach((doc) => {
//       members.push({
//         id: doc.id,
//         ...doc.data()
//       });
//     });
//     return members;
//   } catch (error) {
//     console.error("❌ Error reading all documents:", error);
//     console.error("Error code:", error.code);
//     console.error("Error message:", error.message);
//     console.error("Error stack:", error.stack);
//     throw error;
//   }
// }

// // /**
// //  * Queries members by status
// //  * @param {'active'|'inactive'|'payment_needed'} status - Status to filter by
// //  * @returns {Promise<Array>} Array of user objects matching the criteria
// //  */
// // async function getMembersByStatus(status) {
// //   try {
// //     const q = query(collection(db, "users"), where("status", "==", status));
// //     const querySnapshot = await getDocs(q);
// //     const members = [];
// //     querySnapshot.forEach((doc) => {
// //       members.push({
// //         id: doc.id,
// //         ...doc.data()
// //       });
// //     });
// //     return members;
// //   } catch (error) {
// //     console.error("❌ Error querying documents:", error);
// //     console.error("Error code:", error.code);
// //     console.error("Error message:", error.message);
// //     console.error("Error stack:", error.stack);
// //     throw error;
// //   }
// // }

// /**
//  * Updates specific fields of an existing user document
//  * @param {string} id - The user ID to update
//  * @param {Object} updates - Object containing fields to update
//  * @returns {Promise<string>} The user ID
//  */
// async function updateMember(id, updates) {
//   try {
//     const docRef = doc(db, "users", id);

//     // Check if document exists
//     const docSnap = await getDoc(docRef);
//     if (!docSnap.exists()) {
//       throw new Error(`User with ID ${id} does not exist`);
//     }

//     await updateDoc(docRef, updates);
//     return id;
//   } catch (error) {
//     console.error("❌ Error updating document:", error);
//     console.error("Error code:", error.code);
//     console.error("Error message:", error.message);
//     console.error("Error stack:", error.stack);
//     throw error;
//   }
// }

// /**
//  * Deletes a user document from the database
//  * @param {string} id - The user ID to delete
//  * @returns {Promise<string>} The deleted user ID
//  */
// async function deleteMember(id) {
//   try {
//     const docRef = doc(db, "users", id);

//     // Check if document exists before deleting
//     const docSnap = await getDoc(docRef);
//     if (!docSnap.exists()) {
//       throw new Error(`User with ID ${id} does not exist`);
//     }

//     await deleteDoc(docRef);
//     return id;
//   } catch (error) {
//     console.error("❌ Error deleting document:", error);
//     console.error("Error code:", error.code);
//     console.error("Error message:", error.message);
//     console.error("Error stack:", error.stack);
//     throw error;
//   }
// }

// export {
//   createMember,
//   upsertMember,
//   getMember,
//   getAllMembers,
//   updateMember,
//   deleteMember
// };
