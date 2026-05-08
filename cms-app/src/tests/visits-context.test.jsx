/* eslint-env vitest */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { VisitsProvider, useVisits } from '../context/VisitsContext';
import * as visitsCrud from '../api/visit-crud';

vi.mock('../api/visit-crud', () => ({
  getAllVisits: vi.fn(),
  getVisit: vi.fn(),
  createVisit: vi.fn(),
  upsertVisit: vi.fn(),
  getVisitsByDate: vi.fn(),
  getVisitsByWashType: vi.fn(),
  getVisitsByPaymentType: vi.fn(),
  getVisitsByMonthlyPassId: vi.fn(),
  updateVisit: vi.fn(),
  deleteVisit: vi.fn(),
}));

describe('VisitsContext', () => {
  const mockUser = { uid: 'test-user-123', email: 'test@example.com' };

  const mockVisits = [
    {
      id: 'V001',
      visit_date: '2026-04-28',
      wash_type: 'Basic',
      payment_type: 'cash',
      monthly_pass_id: '',
    },
    {
      id: 'V002',
      visit_date: '2026-04-28',
      wash_type: 'Deluxe',
      payment_type: 'monthly_pass',
      monthly_pass_id: 'MP001',
    },
    {
      id: 'V003',
      visit_date: '2026-04-29',
      wash_type: 'Ultimate',
      payment_type: 'card',
      monthly_pass_id: '',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useVisits hook', () => {
    test('throws error when used outside VisitsProvider', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useVisits());
      }).toThrow('useVisits must be used within a VisitsProvider');

      consoleErrorSpy.mockRestore();
    });

    test('returns context value when used within VisitsProvider', () => {
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      expect(result.current).toHaveProperty('visits');
      expect(result.current).toHaveProperty('isVisitsLoading');
      expect(result.current).toHaveProperty('visitsError');
      expect(result.current).toHaveProperty('getVisit');
      expect(result.current).toHaveProperty('createVisit');
      expect(result.current).toHaveProperty('upsertVisit');
      expect(result.current).toHaveProperty('updateVisit');
      expect(result.current).toHaveProperty('deleteVisit');
      expect(result.current).toHaveProperty('refreshVisits');
      expect(result.current).toHaveProperty('getVisitsByDate');
      expect(result.current).toHaveProperty('getVisitsByWashType');
      expect(result.current).toHaveProperty('getVisitsByPaymentType');
      expect(result.current).toHaveProperty('getVisitsByMonthlyPassId');
    });
  });

  describe('Initial Loading', () => {
    test('loads visits when user is authenticated', async () => {
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      expect(result.current.isVisitsLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      expect(result.current.visits).toEqual(mockVisits);
      expect(visitsCrud.getAllVisits).toHaveBeenCalledTimes(1);
    });

    test('does not load visits when user is not authenticated', async () => {
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);

      const wrapper = ({ children }) => (
        <VisitsProvider user={null}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      expect(result.current.visits).toEqual([]);
      expect(visitsCrud.getAllVisits).not.toHaveBeenCalled();
    });

    test('sets error state when loading fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      visitsCrud.getAllVisits.mockRejectedValue(new Error('Network error'));

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      expect(result.current.visitsError).toBe('Failed to load visits.');
      expect(result.current.visits).toEqual([]);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getVisit', () => {
    test('returns visit from cache if available', async () => {
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      let visit;
      await act(async () => {
        visit = await result.current.getVisit('V001');
      });

      expect(visit).toEqual(mockVisits[0]);
      expect(visitsCrud.getVisit).not.toHaveBeenCalled();
    });

    test('fetches visit from DB if not in cache', async () => {
      const newVisit = {
        id: 'V999',
        visit_date: '2026-04-30',
        wash_type: 'Premium',
        payment_type: 'cash',
        monthly_pass_id: '',
      };

      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);
      visitsCrud.getVisit.mockResolvedValue(newVisit);

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      let visit;
      await act(async () => {
        visit = await result.current.getVisit('V999');
      });

      expect(visit).toEqual(newVisit);
      expect(visitsCrud.getVisit).toHaveBeenCalledWith('V999');
      expect(result.current.visits).toContainEqual(newVisit);
    });

    test('throws error when getVisit fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);
      visitsCrud.getVisit.mockRejectedValue(new Error('Visit not found'));

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      await expect(act(async () => {
        await result.current.getVisit('V999');
      })).rejects.toThrow('Visit not found');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('createVisit', () => {
    test('creates visit in DB and updates cache', async () => {
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);
      visitsCrud.createVisit.mockResolvedValue('V123');

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      const initialLength = result.current.visits.length;

      let visitId;
      await act(async () => {
        visitId = await result.current.createVisit('V123', 'Deluxe', 'card', 'MP123');
      });

      expect(visitId).toBe('V123');
      expect(visitsCrud.createVisit).toHaveBeenCalledWith('V123', 'Deluxe', 'card', 'MP123');
      expect(result.current.visits).toHaveLength(initialLength + 1);
      expect(result.current.visits).toContainEqual({
        id: 'V123',
        visit_date: new Date().toISOString().split('T')[0],
        wash_type: 'Deluxe',
        payment_type: 'card',
        monthly_pass_id: 'MP123',
      });
    });

    test('throws error when createVisit fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);
      visitsCrud.createVisit.mockRejectedValue(new Error('Failed to create visit'));

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      await expect(act(async () => {
        await result.current.createVisit('V123', 'Deluxe', 'card', 'MP123');
      })).rejects.toThrow('Failed to create visit');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('upsertVisit', () => {
    test('updates existing visit in cache', async () => {
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);
      visitsCrud.upsertVisit.mockResolvedValue({ id: 'V001', existed: true });

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      let returnValue;
      await act(async () => {
        returnValue = await result.current.upsertVisit('V001', 'Premium', 'card', 'MP999');
      });

      expect(returnValue).toEqual({ id: 'V001', existed: true });
      expect(visitsCrud.upsertVisit).toHaveBeenCalledWith('V001', 'Premium', 'card', 'MP999');

      const updatedVisit = result.current.visits.find(v => v.id === 'V001');
      expect(updatedVisit.wash_type).toBe('Premium');
      expect(updatedVisit.payment_type).toBe('card');
      expect(updatedVisit.monthly_pass_id).toBe('MP999');
      expect(updatedVisit.visit_date).toBe(new Date().toISOString().split('T')[0]);
    });

    test('adds new visit to cache when it does not exist', async () => {
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);
      visitsCrud.upsertVisit.mockResolvedValue({ id: 'V999', existed: false });

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      const initialLength = result.current.visits.length;

      let returnValue;
      await act(async () => {
        returnValue = await result.current.upsertVisit('V999', 'Basic', 'cash', '');
      });

      expect(returnValue).toEqual({ id: 'V999', existed: false });
      expect(result.current.visits).toHaveLength(initialLength + 1);
      expect(result.current.visits).toContainEqual({
        id: 'V999',
        visit_date: new Date().toISOString().split('T')[0],
        wash_type: 'Basic',
        payment_type: 'cash',
        monthly_pass_id: '',
      });
    });

    test('throws error when upsertVisit fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);
      visitsCrud.upsertVisit.mockRejectedValue(new Error('Failed to upsert visit'));

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      await expect(act(async () => {
        await result.current.upsertVisit('V001', 'Premium', 'card', 'MP999');
      })).rejects.toThrow('Failed to upsert visit');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateVisit', () => {
    test('updates visit in DB and cache', async () => {
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);
      visitsCrud.updateVisit.mockResolvedValue('V001');

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateVisit('V001', {
          wash_type: 'Premium',
          payment_type: 'card',
        });
      });

      expect(visitsCrud.updateVisit).toHaveBeenCalledWith('V001', {
        wash_type: 'Premium',
        payment_type: 'card',
      });

      const updatedVisit = result.current.visits.find(v => v.id === 'V001');
      expect(updatedVisit.wash_type).toBe('Premium');
      expect(updatedVisit.payment_type).toBe('card');
      expect(updatedVisit.monthly_pass_id).toBe('');
    });

    test('throws error when updateVisit fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);
      visitsCrud.updateVisit.mockRejectedValue(new Error('Failed to update visit'));

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      await expect(act(async () => {
        await result.current.updateVisit('V001', { wash_type: 'Premium' });
      })).rejects.toThrow('Failed to update visit');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('deleteVisit', () => {
    test('deletes visit from DB and cache', async () => {
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);
      visitsCrud.deleteVisit.mockResolvedValue('V001');

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      const initialLength = result.current.visits.length;

      await act(async () => {
        await result.current.deleteVisit('V001');
      });

      expect(visitsCrud.deleteVisit).toHaveBeenCalledWith('V001');
      expect(result.current.visits).toHaveLength(initialLength - 1);
      expect(result.current.visits.find(v => v.id === 'V001')).toBeUndefined();
    });

    test('throws error when deleteVisit fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);
      visitsCrud.deleteVisit.mockRejectedValue(new Error('Failed to delete visit'));

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      await expect(act(async () => {
        await result.current.deleteVisit('V001');
      })).rejects.toThrow('Failed to delete visit');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('refreshVisits', () => {
    test('refreshes visits from DB', async () => {
      const initialVisits = [mockVisits[0]];
      const refreshedVisits = mockVisits;

      visitsCrud.getAllVisits
        .mockResolvedValueOnce(initialVisits)
        .mockResolvedValueOnce(refreshedVisits);

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      expect(result.current.visits).toHaveLength(1);

      await act(async () => {
        await result.current.refreshVisits();
      });

      expect(result.current.visits).toHaveLength(3);
      expect(visitsCrud.getAllVisits).toHaveBeenCalledTimes(2);
    });

    test('does not refresh when user is not authenticated', async () => {
      visitsCrud.getAllVisits.mockResolvedValue([]);

      const wrapper = ({ children }) => (
        <VisitsProvider user={null}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshVisits();
      });

      expect(visitsCrud.getAllVisits).not.toHaveBeenCalled();
    });

    test('handles errors during refresh', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      visitsCrud.getAllVisits
        .mockResolvedValueOnce(mockVisits)
        .mockRejectedValueOnce(new Error('Network error'));

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      let errorThrown = false;
      await act(async () => {
        try {
          await result.current.refreshVisits();
        } catch (err) {
          errorThrown = true;
          expect(err.message).toBe('Network error');
        }
      });

      expect(errorThrown).toBe(true);
      expect(result.current.visitsError).toBe('Failed to refresh visits.');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Query helpers', () => {
    test('getVisitsByDate calls DB helper', async () => {
      const filteredVisits = [mockVisits[0], mockVisits[1]];
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);
      visitsCrud.getVisitsByDate.mockResolvedValue(filteredVisits);

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      let visitsByDate;
      await act(async () => {
        visitsByDate = await result.current.getVisitsByDate('2026-04-28');
      });

      expect(visitsCrud.getVisitsByDate).toHaveBeenCalledWith('2026-04-28');
      expect(visitsByDate).toEqual(filteredVisits);
    });

    test('getVisitsByWashType calls DB helper', async () => {
      const filteredVisits = [mockVisits[1]];
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);
      visitsCrud.getVisitsByWashType.mockResolvedValue(filteredVisits);

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      let visitsByWashType;
      await act(async () => {
        visitsByWashType = await result.current.getVisitsByWashType('Deluxe');
      });

      expect(visitsCrud.getVisitsByWashType).toHaveBeenCalledWith('Deluxe');
      expect(visitsByWashType).toEqual(filteredVisits);
    });

    test('getVisitsByPaymentType calls DB helper', async () => {
      const filteredVisits = [mockVisits[1]];
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);
      visitsCrud.getVisitsByPaymentType.mockResolvedValue(filteredVisits);

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      let visitsByPaymentType;
      await act(async () => {
        visitsByPaymentType = await result.current.getVisitsByPaymentType('monthly_pass');
      });

      expect(visitsCrud.getVisitsByPaymentType).toHaveBeenCalledWith('monthly_pass');
      expect(visitsByPaymentType).toEqual(filteredVisits);
    });

    test('getVisitsByMonthlyPassId calls DB helper', async () => {
      const filteredVisits = [mockVisits[1]];
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);
      visitsCrud.getVisitsByMonthlyPassId.mockResolvedValue(filteredVisits);

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      let visitsByMonthlyPassId;
      await act(async () => {
        visitsByMonthlyPassId = await result.current.getVisitsByMonthlyPassId('MP001');
      });

      expect(visitsCrud.getVisitsByMonthlyPassId).toHaveBeenCalledWith('MP001');
      expect(visitsByMonthlyPassId).toEqual(filteredVisits);
    });
  });

  describe('Integration Scenarios', () => {
    test('complete CRUD workflow updates cache correctly', async () => {
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);
      visitsCrud.createVisit.mockResolvedValue('V123');
      visitsCrud.updateVisit.mockResolvedValue('V123');
      visitsCrud.deleteVisit.mockResolvedValue('V123');

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      expect(result.current.visits).toHaveLength(3);

      await act(async () => {
        await result.current.createVisit('V123', 'Deluxe', 'card', 'MP123');
      });
      expect(result.current.visits).toHaveLength(4);

      await act(async () => {
        await result.current.updateVisit('V123', { wash_type: 'Premium' });
      });
      const updated = result.current.visits.find(v => v.id === 'V123');
      expect(updated.wash_type).toBe('Premium');

      await act(async () => {
        await result.current.deleteVisit('V123');
      });
      expect(result.current.visits).toHaveLength(3);
      expect(result.current.visits.find(v => v.id === 'V123')).toBeUndefined();
    });

    test('cache prevents duplicate fetches for same visit', async () => {
      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      await act(async () => {
        await result.current.getVisit('V001');
        await result.current.getVisit('V001');
        await result.current.getVisit('V001');
      });

      expect(visitsCrud.getVisit).not.toHaveBeenCalled();
    });

    test('fetched visit is added to cache and not fetched again', async () => {
      const newVisit = {
        id: 'V999',
        visit_date: '2026-04-30',
        wash_type: 'Premium',
        payment_type: 'cash',
        monthly_pass_id: '',
      };

      visitsCrud.getAllVisits.mockResolvedValue(mockVisits);
      visitsCrud.getVisit.mockResolvedValue(newVisit);

      const wrapper = ({ children }) => (
        <VisitsProvider user={mockUser}>{children}</VisitsProvider>
      );

      const { result } = renderHook(() => useVisits(), { wrapper });

      await waitFor(() => {
        expect(result.current.isVisitsLoading).toBe(false);
      });

      await act(async () => {
        await result.current.getVisit('V999');
      });
      expect(visitsCrud.getVisit).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.getVisit('V999');
      });
      expect(visitsCrud.getVisit).toHaveBeenCalledTimes(1);
    });
  });
});
