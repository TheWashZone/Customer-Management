/* eslint-env vitest */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import React from 'react';
import { MembersProvider, useMembers } from '../context/MembersContext';
import * as firebaseCrud from '../api/firebase-crud';
import * as loyaltyCrud from '../api/loyalty-crud';
import * as prepaidCrud from '../api/prepaid-crud';

// Mock the firebase-crud module
vi.mock('../api/firebase-crud', () => ({
  getAllMembers: vi.fn(),
  getMember: vi.fn(),
  createMember: vi.fn(),
  updateMember: vi.fn(),
  deleteMember: vi.fn(),
}));

// Mock the loyalty-crud module
vi.mock('../api/loyalty-crud', () => ({
  getAllLoyaltyMembers: vi.fn(),
  getLoyaltyMember: vi.fn(),
  createLoyaltyMember: vi.fn(),
  updateLoyaltyMember: vi.fn(),
  deleteLoyaltyMember: vi.fn(),
}));

// Mock the prepaid-crud module
vi.mock('../api/prepaid-crud', () => ({
  getAllPrepaidMembers: vi.fn(),
  getPrepaidMember: vi.fn(),
  createPrepaidMember: vi.fn(),
  updatePrepaidMember: vi.fn(),
  deletePrepaidMember: vi.fn(),
}));

describe('MembersContext', () => {
  const mockUser = { uid: 'test-user-123', email: 'test@example.com' };

  const mockMembers = [
    { id: 'B001', name: 'Alice Smith', car: 'Honda', isActive: true, validPayment: true, notes: '' },
    { id: 'D002', name: 'Bob Jones', car: 'Toyota', isActive: true, validPayment: false, notes: 'Payment pending' },
    { id: 'U003', name: 'Charlie Brown', car: 'Ford', isActive: false, validPayment: true, notes: 'Inactive' },
  ];

  const mockLoyaltyMembers = [
    { id: 'L001', name: 'Loyal Larry', issueDate: '2024-01-01', lastVisitDate: '2024-06-15', visitCount: 5, notes: '' },
    { id: 'L002', name: 'Loyal Lucy', issueDate: '2024-02-10', lastVisitDate: '2024-07-20', visitCount: 12, notes: 'VIP' },
  ];

  const mockPrepaidMembers = [
    { id: 'BB001', name: 'Prepaid Pete', issueDate: '2024-03-01', lastVisitDate: '2024-08-10', prepaidWashes: 8, notes: '' },
    { id: 'DB002', name: 'Prepaid Pam', issueDate: '2024-04-15', lastVisitDate: '2024-09-01', prepaidWashes: 3, notes: 'Deluxe plan' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useMembers hook', () => {
    test('throws error when used outside MembersProvider', () => {
      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useMembers());
      }).toThrow('useMembers must be used within a MembersProvider');

      consoleErrorSpy.mockRestore();
    });

    test('returns context value when used within MembersProvider', () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      // Subscription fields
      expect(result.current).toHaveProperty('members');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('getMember');
      expect(result.current).toHaveProperty('createMember');
      expect(result.current).toHaveProperty('updateMember');
      expect(result.current).toHaveProperty('deleteMember');
      expect(result.current).toHaveProperty('refreshMembers');
      // Loyalty fields
      expect(result.current).toHaveProperty('loyaltyMembers');
      expect(result.current).toHaveProperty('isLoyaltyLoading');
      expect(result.current).toHaveProperty('loyaltyError');
      expect(result.current).toHaveProperty('ensureLoyaltyLoaded');
      expect(result.current).toHaveProperty('getLoyaltyMember');
      expect(result.current).toHaveProperty('createLoyaltyMember');
      expect(result.current).toHaveProperty('updateLoyaltyMember');
      expect(result.current).toHaveProperty('deleteLoyaltyMember');
      expect(result.current).toHaveProperty('refreshLoyaltyMembers');
      // Prepaid fields
      expect(result.current).toHaveProperty('prepaidMembers');
      expect(result.current).toHaveProperty('isPrepaidLoading');
      expect(result.current).toHaveProperty('prepaidError');
      expect(result.current).toHaveProperty('ensurePrepaidLoaded');
      expect(result.current).toHaveProperty('getPrepaidMember');
      expect(result.current).toHaveProperty('createPrepaidMember');
      expect(result.current).toHaveProperty('updatePrepaidMember');
      expect(result.current).toHaveProperty('deletePrepaidMember');
      expect(result.current).toHaveProperty('refreshPrepaidMembers');
    });
  });

  describe('Initial Loading', () => {
    test('loads members when user is authenticated', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.members).toEqual(mockMembers);
      expect(firebaseCrud.getAllMembers).toHaveBeenCalledTimes(1);
    });

    test('does not load members when user is not authenticated', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);

      const wrapper = ({ children }) => (
        <MembersProvider user={null}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.members).toEqual([]);
      expect(firebaseCrud.getAllMembers).not.toHaveBeenCalled();
    });

    test('sets error state when loading fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorMessage = 'Network error';
      firebaseCrud.getAllMembers.mockRejectedValue(new Error(errorMessage));

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load members. Please refresh the page.');
      expect(result.current.members).toEqual([]);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getMember', () => {
    test('returns member from cache if available', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let member;
      await act(async () => {
        member = await result.current.getMember('B001');
      });

      expect(member).toEqual(mockMembers[0]);
      expect(firebaseCrud.getMember).not.toHaveBeenCalled();
    });

    test('fetches member from DB if not in cache', async () => {
      const newMember = { id: 'B999', name: 'New Member', car: 'BMW', isActive: true, validPayment: true, notes: '' };
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      firebaseCrud.getMember.mockResolvedValue(newMember);

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let member;
      await act(async () => {
        member = await result.current.getMember('B999');
      });

      expect(member).toEqual(newMember);
      expect(firebaseCrud.getMember).toHaveBeenCalledWith('B999');
      expect(result.current.members).toContainEqual(newMember);
    });

    test('adds fetched member to cache', async () => {
      const newMember = { id: 'B999', name: 'New Member', car: 'BMW', isActive: true, validPayment: true, notes: '' };
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      firebaseCrud.getMember.mockResolvedValue(newMember);

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.getMember('B999');
      });

      expect(result.current.members).toHaveLength(4);
      expect(result.current.members[3]).toEqual(newMember);
    });

    test('throws error when getMember fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      firebaseCrud.getMember.mockRejectedValue(new Error('Member not found'));

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(act(async () => {
        await result.current.getMember('B999');
      })).rejects.toThrow('Member not found');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('createMember', () => {
    test('creates member in DB and updates cache', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      firebaseCrud.createMember.mockResolvedValue('B123');

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialLength = result.current.members.length;

      let memberId;
      await act(async () => {
        memberId = await result.current.createMember('B123', 'John Doe', 'Toyota', true, true, 'Test member');
      });

      expect(memberId).toBe('B123');
      expect(firebaseCrud.createMember).toHaveBeenCalledWith('B123', 'John Doe', 'Toyota', true, true, 'Test member', '');
      expect(result.current.members).toHaveLength(initialLength + 1);
      expect(result.current.members).toContainEqual({
        id: 'B123',
        name: 'John Doe',
        car: 'Toyota',
        isActive: true,
        validPayment: true,
        notes: 'Test member',
        email: '',
      });
    });

    test('throws error when createMember fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      firebaseCrud.createMember.mockRejectedValue(new Error('Failed to create'));

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(act(async () => {
        await result.current.createMember('B123', 'John Doe', 'Toyota', true, true, 'Test');
      })).rejects.toThrow('Failed to create');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateMember', () => {
    test('updates member in DB and cache', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      firebaseCrud.updateMember.mockResolvedValue('B001');

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateMember('B001', { car: 'Tesla', name: 'Alice Updated' });
      });

      expect(firebaseCrud.updateMember).toHaveBeenCalledWith('B001', { car: 'Tesla', name: 'Alice Updated' });

      const updatedMember = result.current.members.find(m => m.id === 'B001');
      expect(updatedMember.car).toBe('Tesla');
      expect(updatedMember.name).toBe('Alice Updated');
      expect(updatedMember.isActive).toBe(true); // Other fields unchanged
    });

    test('throws error when updateMember fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      firebaseCrud.updateMember.mockRejectedValue(new Error('Failed to update'));

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(act(async () => {
        await result.current.updateMember('B001', { car: 'Tesla' });
      })).rejects.toThrow('Failed to update');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('deleteMember', () => {
    test('deletes member from DB and cache', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      firebaseCrud.deleteMember.mockResolvedValue('B001');

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialLength = result.current.members.length;

      await act(async () => {
        await result.current.deleteMember('B001');
      });

      expect(firebaseCrud.deleteMember).toHaveBeenCalledWith('B001');
      expect(result.current.members).toHaveLength(initialLength - 1);
      expect(result.current.members.find(m => m.id === 'B001')).toBeUndefined();
    });

    test('throws error when deleteMember fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      firebaseCrud.deleteMember.mockRejectedValue(new Error('Failed to delete'));

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(act(async () => {
        await result.current.deleteMember('B001');
      })).rejects.toThrow('Failed to delete');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('refreshMembers', () => {
    test('refreshes members from DB', async () => {
      const initialMembers = [mockMembers[0]];
      const refreshedMembers = mockMembers;

      firebaseCrud.getAllMembers
        .mockResolvedValueOnce(initialMembers)
        .mockResolvedValueOnce(refreshedMembers);

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.members).toHaveLength(1);

      await act(async () => {
        await result.current.refreshMembers();
      });

      expect(result.current.members).toHaveLength(3);
      expect(firebaseCrud.getAllMembers).toHaveBeenCalledTimes(2);
    });

    test('does not refresh when user is not authenticated', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue([]);

      const wrapper = ({ children }) => (
        <MembersProvider user={null}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshMembers();
      });

      expect(firebaseCrud.getAllMembers).not.toHaveBeenCalled();
    });

    test('handles errors during refresh', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      firebaseCrud.getAllMembers
        .mockResolvedValueOnce(mockMembers)
        .mockRejectedValueOnce(new Error('Network error'));

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Catch the error manually to allow state updates to flush
      let errorThrown = false;
      await act(async () => {
        try {
          await result.current.refreshMembers();
        } catch (err) {
          errorThrown = true;
          expect(err.message).toBe('Network error');
        }
      });

      expect(errorThrown).toBe(true);
      expect(result.current.error).toBe('Failed to refresh members.');

      consoleErrorSpy.mockRestore();
    });
  });

  // =============================================
  //  LOYALTY TESTS
  // =============================================

  describe('ensureLoyaltyLoaded', () => {
    test('loads loyalty members on first call', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      loyaltyCrud.getAllLoyaltyMembers.mockResolvedValue(mockLoyaltyMembers);

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.loyaltyMembers).toEqual([]);

      await act(async () => {
        await result.current.ensureLoyaltyLoaded();
      });

      expect(result.current.loyaltyMembers).toEqual(mockLoyaltyMembers);
      expect(loyaltyCrud.getAllLoyaltyMembers).toHaveBeenCalledTimes(1);
    });

    test('does not re-fetch on subsequent calls', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      loyaltyCrud.getAllLoyaltyMembers.mockResolvedValue(mockLoyaltyMembers);

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.ensureLoyaltyLoaded();
      });

      await act(async () => {
        await result.current.ensureLoyaltyLoaded();
      });

      expect(loyaltyCrud.getAllLoyaltyMembers).toHaveBeenCalledTimes(1);
    });

    test('sets loyaltyError when loading fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      loyaltyCrud.getAllLoyaltyMembers.mockRejectedValue(new Error('Network error'));

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.ensureLoyaltyLoaded();
      });

      expect(result.current.loyaltyError).toBe('Failed to load loyalty members.');
      expect(result.current.loyaltyMembers).toEqual([]);
      expect(result.current.isLoyaltyLoading).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getLoyaltyMember', () => {
    test('returns loyalty member from cache if available', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      loyaltyCrud.getAllLoyaltyMembers.mockResolvedValue(mockLoyaltyMembers);

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Load loyalty members first
      await act(async () => {
        await result.current.ensureLoyaltyLoaded();
      });

      let member;
      await act(async () => {
        member = await result.current.getLoyaltyMember('L001');
      });

      expect(member).toEqual(mockLoyaltyMembers[0]);
      expect(loyaltyCrud.getLoyaltyMember).not.toHaveBeenCalled();
    });

    test('fetches loyalty member from DB if not in cache', async () => {
      const newLoyaltyMember = { id: 'L999', name: 'New Loyal', issueDate: '2024-05-01', lastVisitDate: '2024-10-01', visitCount: 1, notes: '' };
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      loyaltyCrud.getLoyaltyMember.mockResolvedValue(newLoyaltyMember);

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let member;
      await act(async () => {
        member = await result.current.getLoyaltyMember('L999');
      });

      expect(member).toEqual(newLoyaltyMember);
      expect(loyaltyCrud.getLoyaltyMember).toHaveBeenCalledWith('L999');
      expect(result.current.loyaltyMembers).toContainEqual(newLoyaltyMember);
    });
  });

  describe('createLoyaltyMember', () => {
    test('creates loyalty member in DB and updates cache', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      loyaltyCrud.createLoyaltyMember.mockResolvedValue('L123');

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let memberId;
      await act(async () => {
        memberId = await result.current.createLoyaltyMember('L123', 'New Loyal', '2024-01-01', '2024-06-01', 0, 'Test');
      });

      expect(memberId).toBe('L123');
      expect(loyaltyCrud.createLoyaltyMember).toHaveBeenCalledWith('L123', 'New Loyal', '2024-01-01', '2024-06-01', 0, 'Test', '');
      expect(result.current.loyaltyMembers).toContainEqual({
        id: 'L123',
        name: 'New Loyal',
        issueDate: '2024-01-01',
        lastVisitDate: '2024-06-01',
        visitCount: 0,
        notes: 'Test',
        email: '',
      });
    });
  });

  describe('updateLoyaltyMember', () => {
    test('updates loyalty member in DB and cache', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      loyaltyCrud.getAllLoyaltyMembers.mockResolvedValue(mockLoyaltyMembers);
      loyaltyCrud.updateLoyaltyMember.mockResolvedValue('L001');

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.ensureLoyaltyLoaded();
      });

      await act(async () => {
        await result.current.updateLoyaltyMember('L001', { visitCount: 10, lastVisitDate: '2024-12-01' });
      });

      expect(loyaltyCrud.updateLoyaltyMember).toHaveBeenCalledWith('L001', { visitCount: 10, lastVisitDate: '2024-12-01' });

      const updated = result.current.loyaltyMembers.find(m => m.id === 'L001');
      expect(updated.visitCount).toBe(10);
      expect(updated.lastVisitDate).toBe('2024-12-01');
      expect(updated.name).toBe('Loyal Larry'); // Unchanged
    });
  });

  describe('deleteLoyaltyMember', () => {
    test('deletes loyalty member from DB and cache', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      loyaltyCrud.getAllLoyaltyMembers.mockResolvedValue(mockLoyaltyMembers);
      loyaltyCrud.deleteLoyaltyMember.mockResolvedValue('L001');

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.ensureLoyaltyLoaded();
      });

      expect(result.current.loyaltyMembers).toHaveLength(2);

      await act(async () => {
        await result.current.deleteLoyaltyMember('L001');
      });

      expect(loyaltyCrud.deleteLoyaltyMember).toHaveBeenCalledWith('L001');
      expect(result.current.loyaltyMembers).toHaveLength(1);
      expect(result.current.loyaltyMembers.find(m => m.id === 'L001')).toBeUndefined();
    });
  });

  describe('refreshLoyaltyMembers', () => {
    test('refreshes loyalty members from DB', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      loyaltyCrud.getAllLoyaltyMembers
        .mockResolvedValueOnce([mockLoyaltyMembers[0]])
        .mockResolvedValueOnce(mockLoyaltyMembers);

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.ensureLoyaltyLoaded();
      });

      expect(result.current.loyaltyMembers).toHaveLength(1);

      await act(async () => {
        await result.current.refreshLoyaltyMembers();
      });

      expect(result.current.loyaltyMembers).toHaveLength(2);
      expect(loyaltyCrud.getAllLoyaltyMembers).toHaveBeenCalledTimes(2);
    });

    test('handles errors during refresh', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      loyaltyCrud.getAllLoyaltyMembers
        .mockResolvedValueOnce(mockLoyaltyMembers)
        .mockRejectedValueOnce(new Error('Network error'));

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.ensureLoyaltyLoaded();
      });

      let errorThrown = false;
      await act(async () => {
        try {
          await result.current.refreshLoyaltyMembers();
        } catch (err) {
          errorThrown = true;
          expect(err.message).toBe('Network error');
        }
      });

      expect(errorThrown).toBe(true);
      expect(result.current.loyaltyError).toBe('Failed to refresh loyalty members.');

      consoleErrorSpy.mockRestore();
    });
  });

  // =============================================
  //  PREPAID TESTS
  // =============================================

  describe('ensurePrepaidLoaded', () => {
    test('loads prepaid members on first call', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      prepaidCrud.getAllPrepaidMembers.mockResolvedValue(mockPrepaidMembers);

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.prepaidMembers).toEqual([]);

      await act(async () => {
        await result.current.ensurePrepaidLoaded();
      });

      expect(result.current.prepaidMembers).toEqual(mockPrepaidMembers);
      expect(prepaidCrud.getAllPrepaidMembers).toHaveBeenCalledTimes(1);
    });

    test('does not re-fetch on subsequent calls', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      prepaidCrud.getAllPrepaidMembers.mockResolvedValue(mockPrepaidMembers);

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.ensurePrepaidLoaded();
      });

      await act(async () => {
        await result.current.ensurePrepaidLoaded();
      });

      expect(prepaidCrud.getAllPrepaidMembers).toHaveBeenCalledTimes(1);
    });

    test('sets prepaidError when loading fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      prepaidCrud.getAllPrepaidMembers.mockRejectedValue(new Error('Network error'));

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.ensurePrepaidLoaded();
      });

      expect(result.current.prepaidError).toBe('Failed to load prepaid members.');
      expect(result.current.prepaidMembers).toEqual([]);
      expect(result.current.isPrepaidLoading).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getPrepaidMember', () => {
    test('returns prepaid member from cache if available', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      prepaidCrud.getAllPrepaidMembers.mockResolvedValue(mockPrepaidMembers);

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.ensurePrepaidLoaded();
      });

      let member;
      await act(async () => {
        member = await result.current.getPrepaidMember('BB001');
      });

      expect(member).toEqual(mockPrepaidMembers[0]);
      expect(prepaidCrud.getPrepaidMember).not.toHaveBeenCalled();
    });

    test('fetches prepaid member from DB if not in cache', async () => {
      const newPrepaidMember = { id: 'UB999', name: 'New Prepaid', issueDate: '2024-05-01', lastVisitDate: '2024-10-01', prepaidWashes: 5, notes: '' };
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      prepaidCrud.getPrepaidMember.mockResolvedValue(newPrepaidMember);

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let member;
      await act(async () => {
        member = await result.current.getPrepaidMember('UB999');
      });

      expect(member).toEqual(newPrepaidMember);
      expect(prepaidCrud.getPrepaidMember).toHaveBeenCalledWith('UB999');
      expect(result.current.prepaidMembers).toContainEqual(newPrepaidMember);
    });
  });

  describe('createPrepaidMember', () => {
    test('creates prepaid member in DB and updates cache', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      prepaidCrud.createPrepaidMember.mockResolvedValue('BB123');

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let memberId;
      await act(async () => {
        memberId = await result.current.createPrepaidMember('BB123', 'New Prepaid', '2024-01-01', '2024-06-01', 10, 'Test');
      });

      expect(memberId).toBe('BB123');
      expect(prepaidCrud.createPrepaidMember).toHaveBeenCalledWith('BB123', 'New Prepaid', '2024-01-01', '2024-06-01', 10, 'Test', '');
      expect(result.current.prepaidMembers).toContainEqual({
        id: 'BB123',
        name: 'New Prepaid',
        issueDate: '2024-01-01',
        lastVisitDate: '2024-06-01',
        prepaidWashes: 10,
        notes: 'Test',
        email: '',
      });
    });
  });

  describe('updatePrepaidMember', () => {
    test('updates prepaid member in DB and cache', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      prepaidCrud.getAllPrepaidMembers.mockResolvedValue(mockPrepaidMembers);
      prepaidCrud.updatePrepaidMember.mockResolvedValue('BB001');

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.ensurePrepaidLoaded();
      });

      await act(async () => {
        await result.current.updatePrepaidMember('BB001', { prepaidWashes: 5, lastVisitDate: '2024-12-01' });
      });

      expect(prepaidCrud.updatePrepaidMember).toHaveBeenCalledWith('BB001', { prepaidWashes: 5, lastVisitDate: '2024-12-01' });

      const updated = result.current.prepaidMembers.find(m => m.id === 'BB001');
      expect(updated.prepaidWashes).toBe(5);
      expect(updated.lastVisitDate).toBe('2024-12-01');
      expect(updated.name).toBe('Prepaid Pete'); // Unchanged
    });
  });

  describe('deletePrepaidMember', () => {
    test('deletes prepaid member from DB and cache', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      prepaidCrud.getAllPrepaidMembers.mockResolvedValue(mockPrepaidMembers);
      prepaidCrud.deletePrepaidMember.mockResolvedValue('BB001');

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.ensurePrepaidLoaded();
      });

      expect(result.current.prepaidMembers).toHaveLength(2);

      await act(async () => {
        await result.current.deletePrepaidMember('BB001');
      });

      expect(prepaidCrud.deletePrepaidMember).toHaveBeenCalledWith('BB001');
      expect(result.current.prepaidMembers).toHaveLength(1);
      expect(result.current.prepaidMembers.find(m => m.id === 'BB001')).toBeUndefined();
    });
  });

  describe('refreshPrepaidMembers', () => {
    test('refreshes prepaid members from DB', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      prepaidCrud.getAllPrepaidMembers
        .mockResolvedValueOnce([mockPrepaidMembers[0]])
        .mockResolvedValueOnce(mockPrepaidMembers);

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.ensurePrepaidLoaded();
      });

      expect(result.current.prepaidMembers).toHaveLength(1);

      await act(async () => {
        await result.current.refreshPrepaidMembers();
      });

      expect(result.current.prepaidMembers).toHaveLength(2);
      expect(prepaidCrud.getAllPrepaidMembers).toHaveBeenCalledTimes(2);
    });

    test('handles errors during refresh', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      prepaidCrud.getAllPrepaidMembers
        .mockResolvedValueOnce(mockPrepaidMembers)
        .mockRejectedValueOnce(new Error('Network error'));

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.ensurePrepaidLoaded();
      });

      let errorThrown = false;
      await act(async () => {
        try {
          await result.current.refreshPrepaidMembers();
        } catch (err) {
          errorThrown = true;
          expect(err.message).toBe('Network error');
        }
      });

      expect(errorThrown).toBe(true);
      expect(result.current.prepaidError).toBe('Failed to refresh prepaid members.');

      consoleErrorSpy.mockRestore();
    });
  });

  // =============================================
  //  INTEGRATION TESTS
  // =============================================

  describe('Integration Scenarios', () => {
    test('complete CRUD workflow updates cache correctly', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      firebaseCrud.createMember.mockResolvedValue('B123');
      firebaseCrud.updateMember.mockResolvedValue('B123');
      firebaseCrud.deleteMember.mockResolvedValue('B123');

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Initial state
      expect(result.current.members).toHaveLength(3);

      // Create
      await act(async () => {
        await result.current.createMember('B123', 'John Doe', 'Toyota', true, true, 'New');
      });
      expect(result.current.members).toHaveLength(4);

      // Update
      await act(async () => {
        await result.current.updateMember('B123', { car: 'Honda' });
      });
      const updated = result.current.members.find(m => m.id === 'B123');
      expect(updated.car).toBe('Honda');

      // Delete
      await act(async () => {
        await result.current.deleteMember('B123');
      });
      expect(result.current.members).toHaveLength(3);
      expect(result.current.members.find(m => m.id === 'B123')).toBeUndefined();
    });

    test('cache prevents duplicate fetches for same member', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Get same member multiple times
      await act(async () => {
        await result.current.getMember('B001');
        await result.current.getMember('B001');
        await result.current.getMember('B001');
      });

      // Should only use cache, not call DB
      expect(firebaseCrud.getMember).not.toHaveBeenCalled();
    });

    test('fetched member is added to cache and not fetched again', async () => {
      const newMember = { id: 'B999', name: 'New Member', car: 'BMW', isActive: true, validPayment: true, notes: '' };
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      firebaseCrud.getMember.mockResolvedValue(newMember);

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First fetch - should call DB
      await act(async () => {
        await result.current.getMember('B999');
      });
      expect(firebaseCrud.getMember).toHaveBeenCalledTimes(1);

      // Second fetch - should use cache
      await act(async () => {
        await result.current.getMember('B999');
      });
      expect(firebaseCrud.getMember).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    test('cross-type independence: modifying one type does not affect others', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);
      loyaltyCrud.getAllLoyaltyMembers.mockResolvedValue(mockLoyaltyMembers);
      prepaidCrud.getAllPrepaidMembers.mockResolvedValue(mockPrepaidMembers);
      loyaltyCrud.deleteLoyaltyMember.mockResolvedValue('L001');
      prepaidCrud.createPrepaidMember.mockResolvedValue('UB999');

      const wrapper = ({ children }) => (
        <MembersProvider user={mockUser}>{children}</MembersProvider>
      );

      const { result } = renderHook(() => useMembers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Load all types
      await act(async () => {
        await result.current.ensureLoyaltyLoaded();
      });
      await act(async () => {
        await result.current.ensurePrepaidLoaded();
      });

      const initialSubscriptionCount = result.current.members.length;
      const initialLoyaltyCount = result.current.loyaltyMembers.length;
      const initialPrepaidCount = result.current.prepaidMembers.length;

      // Delete a loyalty member
      await act(async () => {
        await result.current.deleteLoyaltyMember('L001');
      });

      // Create a prepaid member
      await act(async () => {
        await result.current.createPrepaidMember('UB999', 'New Prepaid', '2024-01-01', '2024-06-01', 15, '');
      });

      // Verify only affected types changed
      expect(result.current.members).toHaveLength(initialSubscriptionCount); // unchanged
      expect(result.current.loyaltyMembers).toHaveLength(initialLoyaltyCount - 1); // one deleted
      expect(result.current.prepaidMembers).toHaveLength(initialPrepaidCount + 1); // one added
    });
  });

  describe('Rendering with Provider', () => {
    test('renders children with context value', async () => {
      firebaseCrud.getAllMembers.mockResolvedValue(mockMembers);

      const TestComponent = () => {
        const { members, isLoading } = useMembers();

        if (isLoading) return <div>Loading...</div>;

        return (
          <div>
            <h1>Members: {members.length}</h1>
            {members.map(m => <div key={m.id}>{m.name}</div>)}
          </div>
        );
      };

      render(
        <MembersProvider user={mockUser}>
          <TestComponent />
        </MembersProvider>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Members: 3')).toBeInTheDocument();
      });

      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
    });
  });
});
