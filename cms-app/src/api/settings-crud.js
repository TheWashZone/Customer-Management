import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebaseconfig";

const SETTINGS_DOC = doc(db, "settings", "washPrices");
const DEFAULT_PRICES = { B: 10.00, D: 13.50, U: 16.50 };

/**
 * Retrieves wash prices from Firestore.
 * Falls back to hardcoded defaults if the document does not exist yet.
 *
 * @returns {Promise<{B: number, D: number, U: number}>} Wash prices keyed by wash type
 */
async function getWashPrices() {
  const snap = await getDoc(SETTINGS_DOC);
  if (!snap.exists()) return { ...DEFAULT_PRICES };
  const data = snap.data();
  return {
    B: data.B ?? DEFAULT_PRICES.B,
    D: data.D ?? DEFAULT_PRICES.D,
    U: data.U ?? DEFAULT_PRICES.U,
  };
}

/**
 * Saves updated wash prices to Firestore.
 *
 * @param {{B: number, D: number, U: number}} prices
 * @returns {Promise<void>}
 */
async function updateWashPrices(prices) {
  await setDoc(SETTINGS_DOC, { B: prices.B, D: prices.D, U: prices.U });
}

export { getWashPrices, updateWashPrices };
