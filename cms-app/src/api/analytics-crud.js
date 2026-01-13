/**
 * Analytics CRUD Operations
 *
 * Handles all Firestore operations for customer visit tracking and analytics.
 *
 * Collection: dailyVisits
 * Document ID Format: YYYY-MM-DD (e.g., "2025-12-27")
 * Document Structure: { date: Timestamp, count: number, lastUpdated: Timestamp, createdAt: Timestamp }
 *
 * Key Features:
 * - Transactional operations to prevent race conditions
 * - Automatic document creation on first visit of the day
 * - Date-based queries for analytics aggregations
 * - Automatic cleanup of records older than 1 year
 *
 * @module api/analytics-crud
 */

import { doc, getDoc, collection, query, where, getDocs, deleteDoc, Timestamp, serverTimestamp, runTransaction } from "firebase/firestore";
import { db } from "./firebaseconfig";

/**
 * Increments the daily visit counter for today's date.
 * Creates the document if it doesn't exist (with count: 1).
 * Uses a transaction to prevent race conditions.
 *
 * @returns {Promise<{date: string, count: number}>} Updated date and count
 * @throws {Error} If the operation fails
 */
async function logDailyVisit() {
  try {
    // Get current date in UTC as YYYY-MM-DD format
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];

    // Create Timestamp for the start of the day (00:00:00 UTC)
    const dayStart = new Date(dateString + 'T00:00:00.000Z');
    const dayTimestamp = Timestamp.fromDate(dayStart);

    const docRef = doc(db, "dailyVisits", dateString);

    // Use a transaction to atomically check and update the document
    // This prevents race conditions when multiple calls happen simultaneously
    const result = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      const isNewDocument = !docSnap.exists();

      // Prepare the update data
      const updateData = {
        date: dayTimestamp,
        count: isNewDocument ? 1 : (docSnap.data().count || 0) + 1,
        lastUpdated: serverTimestamp()
      };

      // Only set createdAt for new documents
      if (isNewDocument) {
        updateData.createdAt = serverTimestamp();
      }

      // Set the document (creates or updates)
      transaction.set(docRef, updateData, { merge: true });

      // Return the new count
      return updateData.count;
    });

    return {
      date: dateString,
      count: result
    };
  } catch (error) {
    console.error("❌ Error logging daily visit:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Retrieves the visit count for a specific date.
 *
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {Promise<Object|null>} Visit data or null if not found
 */
async function getDailyVisitCount(dateString) {
  try {
    const docRef = doc(db, "dailyVisits", dateString);
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
    console.error("❌ Error getting daily visit count:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Retrieves visit counts for a date range.
 * Used for analytics aggregations (weekly/monthly totals).
 *
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of visit objects sorted by date
 */
async function getDailyVisitsInRange(startDate, endDate) {
  try {
    // Convert date strings to Timestamps
    const startTimestamp = Timestamp.fromDate(new Date(startDate + 'T00:00:00.000Z'));
    const endTimestamp = Timestamp.fromDate(new Date(endDate + 'T23:59:59.999Z'));

    // Query for documents in the date range
    const q = query(
      collection(db, "dailyVisits"),
      where("date", ">=", startTimestamp),
      where("date", "<=", endTimestamp)
    );

    const querySnapshot = await getDocs(q);
    const visits = [];

    querySnapshot.forEach((doc) => {
      visits.push({
        id: doc.id,
        dateString: doc.id, // Document ID is the date string
        ...doc.data()
      });
    });

    // Sort by date (document ID) ascending
    visits.sort((a, b) => a.dateString.localeCompare(b.dateString));

    return visits;
  } catch (error) {
    console.error("❌ Error getting daily visits in range:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Deletes visit records older than 1 year from today.
 * Should be called periodically (e.g., on app initialization or daily cron).
 *
 * @returns {Promise<number>} Number of documents deleted
 */
async function cleanupOldVisitData() {
  try {
    // Calculate cutoff date (365 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    // Query for documents older than the cutoff
    const q = query(
      collection(db, "dailyVisits"),
      where("date", "<", cutoffTimestamp)
    );

    const querySnapshot = await getDocs(q);

    // Delete documents concurrently using Promise.all (one deleteDoc call per document)
    let deletedCount = 0;
    const deletePromises = [];

    querySnapshot.forEach((docSnapshot) => {
      deletePromises.push(deleteDoc(doc(db, "dailyVisits", docSnapshot.id)));
      deletedCount++;
    });

    // Wait for all deletions to complete
    await Promise.all(deletePromises);

    return deletedCount;
  } catch (error) {
    console.error("❌ Error cleaning up old visit data:", error);
    throw error;
  }
}

export {
  logDailyVisit,
  getDailyVisitCount,
  getDailyVisitsInRange,
  cleanupOldVisitData
};
