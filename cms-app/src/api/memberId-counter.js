import { doc, runTransaction } from "firebase/firestore";
import { db } from "./firebaseconfig";

/**
 * Gets the next member ID and initializes the counter if needed.
 * @returns {Promise<number>} The next member ID
 */
async function getNextId() {
  try {
    const docRef = doc(db, "counters", "memberIds");

    const nextId = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);

      if (!docSnap.exists()) {
        const initialValue = 0;
        transaction.set(docRef, { next: initialValue });
        return initialValue;
      }

      const currentNext = docSnap.data().next + 1;
      transaction.update(docRef, { next: currentNext });
      return currentNext;
    });

    return nextId;
  } catch (error) {
    console.error("❌ Error reading/updating counter:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

export { getNextId };
