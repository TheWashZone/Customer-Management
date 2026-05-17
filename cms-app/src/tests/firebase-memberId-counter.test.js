/* eslint-env vitest */
import { describe, test, expect, beforeEach, vi } from 'vitest';

vi.mock('../api/firebaseconfig', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  runTransaction: vi.fn(),
}));

import { getNextId } from '../api/memberId-counter.js';
import { doc, runTransaction } from 'firebase/firestore';

describe('memberId-counter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns next + 1 when the counter document exists', async () => {
    const mockDocRef = { id: 'memberIdsRef' };
    const transaction = {
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
    };

    doc.mockReturnValue(mockDocRef);
    runTransaction.mockImplementation(async (_db, callback) => {
      transaction.get.mockResolvedValue({
        exists: () => true,
        data: () => ({ next: 1 }),
      });
      return await callback(transaction);
    });

    const result = await getNextId();

    expect(doc).toHaveBeenCalledWith({}, 'counters', 'memberIds');
    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(transaction.get).toHaveBeenCalledWith(mockDocRef);
    expect(transaction.update).toHaveBeenCalledWith(mockDocRef, { next: 2 });
    expect(transaction.set).not.toHaveBeenCalled();
    expect(result).toBe(2);
  });

  test('sets and returns the initial value when the counter document does not exist', async () => {
    const mockDocRef = { id: 'memberIdsRef' };
    const transaction = {
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
    };

    doc.mockReturnValue(mockDocRef);
    runTransaction.mockImplementation(async (_db, callback) => {
      transaction.get.mockResolvedValue({
        exists: () => false,
      });
      return await callback(transaction);
    });

    const result = await getNextId();

    expect(transaction.get).toHaveBeenCalledWith(mockDocRef);
    expect(transaction.set).toHaveBeenCalledWith(mockDocRef, { next: 1 });
    expect(transaction.update).not.toHaveBeenCalled();
    expect(result).toBe(1);
  });

  test('rethrows errors from Firestore', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const firestoreError = new Error('Firestore failed');

    doc.mockReturnValue({ id: 'memberIdsRef' });
    runTransaction.mockRejectedValue(firestoreError);

    await expect(getNextId()).rejects.toThrow('Firestore failed');

    consoleErrorSpy.mockRestore();
  });
});
