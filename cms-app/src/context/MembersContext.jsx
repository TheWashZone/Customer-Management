import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getAllMembers as fetchAllMembers,
  getMember as getMemberFromDB,
  createMember as createMemberInDB,
  updateMember as updateMemberInDB,
  deleteMember as deleteMemberInDB,
} from '../api/firebase-crud';
import {
  getAllLoyaltyMembers as fetchAllLoyaltyMembers,
  getLoyaltyMember as getLoyaltyMemberFromDB,
  createLoyaltyMember as createLoyaltyMemberInDB,
  updateLoyaltyMember as updateLoyaltyMemberInDB,
  deleteLoyaltyMember as deleteLoyaltyMemberInDB,
} from '../api/loyalty-crud';
import {
  getAllPrepaidMembers as fetchAllPrepaidMembers,
  getPrepaidMember as getPrepaidMemberFromDB,
  createPrepaidMember as createPrepaidMemberInDB,
  updatePrepaidMember as updatePrepaidMemberInDB,
  deletePrepaidMember as deletePrepaidMemberInDB,
} from '../api/prepaid-crud';

const MembersContext = createContext();

export const useMembers = () => {
  const context = useContext(MembersContext);
  if (!context) {
    throw new Error('useMembers must be used within a MembersProvider');
  }
  return context;
};

export const MembersProvider = ({ children, user }) => {
  // --- Subscription state ---
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // --- Loyalty state ---
  const [loyaltyMembers, setLoyaltyMembers] = useState([]);
  const [isLoyaltyLoading, setIsLoyaltyLoading] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState(null);
  const [isLoyaltyInitialized, setIsLoyaltyInitialized] = useState(false);

  // --- Prepaid state ---
  const [prepaidMembers, setPrepaidMembers] = useState([]);
  const [isPrepaidLoading, setIsPrepaidLoading] = useState(false);
  const [prepaidError, setPrepaidError] = useState(null);
  const [isPrepaidInitialized, setIsPrepaidInitialized] = useState(false);

  // Load subscription members once when provider mounts and user is authenticated
  useEffect(() => {
    const loadMembers = async () => {
      if (!user) {
        setMembers([]);
        setIsLoading(false);
        setIsInitialized(false);
        setLoyaltyMembers([]);
        setIsLoyaltyLoading(false);
        setIsLoyaltyInitialized(false);
        setLoyaltyError(null);
        setPrepaidMembers([]);
        setIsPrepaidLoading(false);
        setIsPrepaidInitialized(false);
        setPrepaidError(null);
        return;
      }

      if (isInitialized) {
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchAllMembers();
        setMembers(data);
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to load members:', err);
        setError('Failed to load members. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadMembers();
  }, [user, isInitialized]);

  // --- Lazy-load helpers ---
  const ensureLoyaltyLoaded = useCallback(async () => {
    if (isLoyaltyInitialized || isLoyaltyLoading) return;

    setIsLoyaltyLoading(true);
    setLoyaltyError(null);
    try {
      const data = await fetchAllLoyaltyMembers();
      setLoyaltyMembers(data);
      setIsLoyaltyInitialized(true);
    } catch (err) {
      console.error('Failed to load loyalty members:', err);
      setLoyaltyError('Failed to load loyalty members.');
    } finally {
      setIsLoyaltyLoading(false);
    }
  }, [isLoyaltyInitialized, isLoyaltyLoading]);

  const ensurePrepaidLoaded = useCallback(async () => {
    if (isPrepaidInitialized || isPrepaidLoading) return;

    setIsPrepaidLoading(true);
    setPrepaidError(null);
    try {
      const data = await fetchAllPrepaidMembers();
      setPrepaidMembers(data);
      setIsPrepaidInitialized(true);
    } catch (err) {
      console.error('Failed to load prepaid members:', err);
      setPrepaidError('Failed to load prepaid members.');
    } finally {
      setIsPrepaidLoading(false);
    }
  }, [isPrepaidInitialized, isPrepaidLoading]);

  // =============================================
  //  SUBSCRIPTION CRUD (existing, unchanged)
  // =============================================

  const getMember = useCallback(async (id) => {
    try {
      const cachedMember = members.find((m) => m.id === id);

      if (cachedMember) {
        return cachedMember;
      }

      const memberFromDB = await getMemberFromDB(id);

      if (memberFromDB) {
        setMembers((prev) =>
          prev.find((m) => m.id === memberFromDB.id) ? prev : [...prev, memberFromDB]
        );
      }

      return memberFromDB;
    } catch (err) {
      console.error('Failed to get member:', err);
      throw err;
    }
  }, [members]);

  const createMember = useCallback(async (id, name, car, isActive, validPayment, notes) => {
    try {
      await createMemberInDB(id, name, car, isActive, validPayment, notes);

      const newMember = {
        id,
        name,
        car,
        isActive,
        validPayment,
        notes,
      };

      setMembers((prev) => [...prev, newMember]);
      return id;
    } catch (err) {
      console.error('Failed to create member:', err);
      throw err;
    }
  }, []);

  const updateMember = useCallback(async (id, updates) => {
    try {
      await updateMemberInDB(id, updates);

      setMembers((prev) =>
        prev.map((member) =>
          member.id === id ? { ...member, ...updates } : member
        )
      );
      return id;
    } catch (err) {
      console.error('Failed to update member:', err);
      throw err;
    }
  }, []);

  const deleteMember = useCallback(async (id) => {
    try {
      await deleteMemberInDB(id);

      setMembers((prev) => prev.filter((member) => member.id !== id));
      return id;
    } catch (err) {
      console.error('Failed to delete member:', err);
      throw err;
    }
  }, []);

  const refreshMembers = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAllMembers();
      setMembers(data);
    } catch (err) {
      console.error('Failed to refresh members:', err);
      setError('Failed to refresh members.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // =============================================
  //  LOYALTY CRUD
  // =============================================

  const getLoyaltyMember = useCallback(async (id) => {
    try {
      const cachedMember = loyaltyMembers.find((m) => m.id === id);

      if (cachedMember) {
        return cachedMember;
      }

      const memberFromDB = await getLoyaltyMemberFromDB(id);

      if (memberFromDB) {
        setLoyaltyMembers((prev) =>
          prev.find((m) => m.id === memberFromDB.id) ? prev : [...prev, memberFromDB]
        );
      }

      return memberFromDB;
    } catch (err) {
      console.error('Failed to get loyalty member:', err);
      throw err;
    }
  }, [loyaltyMembers]);

  const createLoyaltyMember = useCallback(async (id, name, issueDate, lastVisitDate, visitCount, notes) => {
    try {
      await createLoyaltyMemberInDB(id, name, issueDate, lastVisitDate, visitCount, notes);

      const newMember = {
        id,
        name,
        issueDate,
        lastVisitDate,
        visitCount,
        notes,
      };

      setLoyaltyMembers((prev) => [...prev, newMember]);
      return id;
    } catch (err) {
      console.error('Failed to create loyalty member:', err);
      throw err;
    }
  }, []);

  const updateLoyaltyMember = useCallback(async (id, updates) => {
    try {
      await updateLoyaltyMemberInDB(id, updates);

      setLoyaltyMembers((prev) =>
        prev.map((member) =>
          member.id === id ? { ...member, ...updates } : member
        )
      );
      return id;
    } catch (err) {
      console.error('Failed to update loyalty member:', err);
      throw err;
    }
  }, []);

  const deleteLoyaltyMember = useCallback(async (id) => {
    try {
      await deleteLoyaltyMemberInDB(id);

      setLoyaltyMembers((prev) => prev.filter((member) => member.id !== id));
      return id;
    } catch (err) {
      console.error('Failed to delete loyalty member:', err);
      throw err;
    }
  }, []);

  const refreshLoyaltyMembers = useCallback(async () => {
    if (!user) return;

    setIsLoyaltyLoading(true);
    setLoyaltyError(null);
    try {
      const data = await fetchAllLoyaltyMembers();
      setLoyaltyMembers(data);
    } catch (err) {
      console.error('Failed to refresh loyalty members:', err);
      setLoyaltyError('Failed to refresh loyalty members.');
      throw err;
    } finally {
      setIsLoyaltyLoading(false);
    }
  }, [user]);

  // =============================================
  //  PREPAID CRUD
  // =============================================

  const getPrepaidMember = useCallback(async (id) => {
    try {
      const cachedMember = prepaidMembers.find((m) => m.id === id);

      if (cachedMember) {
        return cachedMember;
      }

      const memberFromDB = await getPrepaidMemberFromDB(id);

      if (memberFromDB) {
        setPrepaidMembers((prev) =>
          prev.find((m) => m.id === memberFromDB.id) ? prev : [...prev, memberFromDB]
        );
      }

      return memberFromDB;
    } catch (err) {
      console.error('Failed to get prepaid member:', err);
      throw err;
    }
  }, [prepaidMembers]);

  const createPrepaidMember = useCallback(async (id, name, type, issueDate, lastVisitDate, prepaidWashes, notes) => {
    try {
      await createPrepaidMemberInDB(id, name, type, issueDate, lastVisitDate, prepaidWashes, notes);

      const newMember = {
        id,
        name,
        type,
        issueDate,
        lastVisitDate,
        prepaidWashes,
        notes,
      };

      setPrepaidMembers((prev) => [...prev, newMember]);
      return id;
    } catch (err) {
      console.error('Failed to create prepaid member:', err);
      throw err;
    }
  }, []);

  const updatePrepaidMember = useCallback(async (id, updates) => {
    try {
      await updatePrepaidMemberInDB(id, updates);

      setPrepaidMembers((prev) =>
        prev.map((member) =>
          member.id === id ? { ...member, ...updates } : member
        )
      );
      return id;
    } catch (err) {
      console.error('Failed to update prepaid member:', err);
      throw err;
    }
  }, []);

  const deletePrepaidMember = useCallback(async (id) => {
    try {
      await deletePrepaidMemberInDB(id);

      setPrepaidMembers((prev) => prev.filter((member) => member.id !== id));
      return id;
    } catch (err) {
      console.error('Failed to delete prepaid member:', err);
      throw err;
    }
  }, []);

  const refreshPrepaidMembers = useCallback(async () => {
    if (!user) return;

    setIsPrepaidLoading(true);
    setPrepaidError(null);
    try {
      const data = await fetchAllPrepaidMembers();
      setPrepaidMembers(data);
    } catch (err) {
      console.error('Failed to refresh prepaid members:', err);
      setPrepaidError('Failed to refresh prepaid members.');
      throw err;
    } finally {
      setIsPrepaidLoading(false);
    }
  }, [user]);

  const value = {
    // Subscription
    members,
    isLoading,
    error,
    getMember,
    createMember,
    updateMember,
    deleteMember,
    refreshMembers,
    // Loyalty
    loyaltyMembers,
    isLoyaltyLoading,
    loyaltyError,
    ensureLoyaltyLoaded,
    getLoyaltyMember,
    createLoyaltyMember,
    updateLoyaltyMember,
    deleteLoyaltyMember,
    refreshLoyaltyMembers,
    // Prepaid
    prepaidMembers,
    isPrepaidLoading,
    prepaidError,
    ensurePrepaidLoaded,
    getPrepaidMember,
    createPrepaidMember,
    updatePrepaidMember,
    deletePrepaidMember,
    refreshPrepaidMembers,
  };

  return (
    <MembersContext.Provider value={value}>
      {children}
    </MembersContext.Provider>
  );
};
