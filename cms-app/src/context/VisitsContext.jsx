import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getAllVisits as fetchAllVisits,
  getVisit as getVisitFromDB,
  createVisit as createVisitInDB,
  upsertVisit as upsertVisitInDB,
  getVisitsByDate as getVisitsByDateFromDB,
  getVisitsByWashType as getVisitsByWashTypeFromDB,
  getVisitsByPaymentType as getVisitsByPaymentTypeFromDB,
  getVisitsByMonthlyPassId as getVisitsByMonthlyPassIdFromDB,
  updateVisit as updateVisitInDB,
  deleteVisit as deleteVisitInDB,
} from '../api/visit-crud';

const VisitsContext = createContext();

export const useVisits = () => {
  const context = useContext(VisitsContext);
  if (!context) {
    throw new Error('useVisits must be used within a VisitsProvider');
  }
  return context;
};

export const VisitsProvider = ({ children, user }) => {
  const [visits, setVisits] = useState([]);
  const [isVisitsLoading, setIsVisitsLoading] = useState(true);
  const [visitsError, setVisitsError] = useState(null);
  const [isVisitsInitialized, setIsVisitsInitialized] = useState(false);

  useEffect(() => {
    const loadVisits = async () => {
      if (!user) {
        setVisits([]);
        setIsVisitsLoading(false);
        setVisitsError(null);
        setIsVisitsInitialized(false);
        return;
      }

      if (isVisitsInitialized) {
        return;
      }

      setIsVisitsLoading(true);
      setVisitsError(null);

      try {
        const data = await fetchAllVisits();
        setVisits(data);
        setIsVisitsInitialized(true);
      } catch (err) {
        console.error('Failed to load visits:', err);
        setVisitsError('Failed to load visits.');
      } finally {
        setIsVisitsLoading(false);
      }
    };

    loadVisits();
  }, [user, isVisitsInitialized]);

  const getVisit = useCallback(async (id) => {
    try {
      const cachedVisit = visits.find((visit) => visit.id === id);

      if (cachedVisit) {
        return cachedVisit;
      }

      const visitFromDB = await getVisitFromDB(id);

      if (visitFromDB) {
        setVisits((prev) =>
          prev.find((visit) => visit.id === visitFromDB.id)
            ? prev
            : [...prev, visitFromDB]
        );
      }

      return visitFromDB;
    } catch (err) {
      console.error('Failed to get visit:', err);
      throw err;
    }
  }, [visits]);

  const createVisit = useCallback(async (id, washType, paymentType, monthlyPassId = '') => {
    try {
      await createVisitInDB(id, washType, paymentType, monthlyPassId);

      const newVisit = {
        id,
        visit_date: new Date().toISOString().split('T')[0],
        wash_type: washType,
        payment_type: paymentType,
        monthly_pass_id: monthlyPassId,
      };

      setVisits((prev) => {
        const idx = prev.findIndex((visit) => visit.id === id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = newVisit;
          return updated;
        }
        return [...prev, newVisit];
      });

      return id;
    } catch (err) {
      console.error('Failed to create visit:', err);
      throw err;
    }
  }, []);

  const upsertVisit = useCallback(async (id, washType, paymentType, monthlyPassId = '') => {
    try {
      const { existed } = await upsertVisitInDB(id, washType, paymentType, monthlyPassId);

      const visitFields = {
        id,
        visit_date: new Date().toISOString().split('T')[0],
        wash_type: washType,
        payment_type: paymentType,
        monthly_pass_id: monthlyPassId,
      };

      setVisits((prev) => {
        const idx = prev.findIndex((visit) => visit.id === id);

        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...visitFields };
          return updated;
        }

        return [...prev, visitFields];
      });

      return { id, existed };
    } catch (err) {
      console.error('Failed to upsert visit:', err);
      throw err;
    }
  }, []);

  const updateVisit = useCallback(async (id, updates) => {
    try {
      await updateVisitInDB(id, updates);

      setVisits((prev) =>
        prev.map((visit) =>
          visit.id === id ? { ...visit, ...updates } : visit
        )
      );

      return id;
    } catch (err) {
      console.error('Failed to update visit:', err);
      throw err;
    }
  }, []);

  const deleteVisit = useCallback(async (id) => {
    try {
      await deleteVisitInDB(id);

      setVisits((prev) => prev.filter((visit) => visit.id !== id));
      return id;
    } catch (err) {
      console.error('Failed to delete visit:', err);
      throw err;
    }
  }, []);

  const refreshVisits = useCallback(async () => {
    if (!user) return [];

    setIsVisitsLoading(true);
    setVisitsError(null);

    try {
      const data = await fetchAllVisits();
      setVisits(data);
      return data;
    } catch (err) {
      console.error('Failed to refresh visits:', err);
      setVisitsError('Failed to refresh visits.');
      throw err;
    } finally {
      setIsVisitsLoading(false);
    }
  }, [user]);

  const getVisitsByDate = useCallback(async (visitDate) => {
    try {
      return await getVisitsByDateFromDB(visitDate);
    } catch (err) {
      console.error('Failed to get visits by date:', err);
      throw err;
    }
  }, []);

  const getVisitsByWashType = useCallback(async (washType) => {
    try {
      return await getVisitsByWashTypeFromDB(washType);
    } catch (err) {
      console.error('Failed to get visits by wash type:', err);
      throw err;
    }
  }, []);

  const getVisitsByPaymentType = useCallback(async (paymentType) => {
    try {
      return await getVisitsByPaymentTypeFromDB(paymentType);
    } catch (err) {
      console.error('Failed to get visits by payment type:', err);
      throw err;
    }
  }, []);

  const getVisitsByMonthlyPassId = useCallback(async (monthlyPassId) => {
    try {
      return await getVisitsByMonthlyPassIdFromDB(monthlyPassId);
    } catch (err) {
      console.error('Failed to get visits by monthly pass ID:', err);
      throw err;
    }
  }, []);

  const value = {
    visits,
    isVisitsLoading,
    visitsError,
    getVisit,
    createVisit,
    upsertVisit,
    updateVisit,
    deleteVisit,
    refreshVisits,
    getVisitsByDate,
    getVisitsByWashType,
    getVisitsByPaymentType,
    getVisitsByMonthlyPassId,
  };

  return (
    <VisitsContext.Provider value={value}>
      {children}
    </VisitsContext.Provider>
  );
};
