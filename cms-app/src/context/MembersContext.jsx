import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getAllMembers as fetchAllMembers,
  getMember as getMemberFromDB,
  createMember as createMemberInDB,
  upsertMember as upsertMemberInDB,
  updateMember as updateMemberInDB,
  deleteMember as deleteMemberInDB,
  getMemberByMonthlyPassId as getMemberByMonthlyPassIdFromDB,
} from '../api/firebase-crud';
import {
  getAllMonthlyPasses as fetchAllMonthlyPasses,
  getMonthlyPass as getMonthlyPassFromDB,
  createMonthlyPass as createMonthlyPassInDB,
  upsertMonthlyPass as upsertMonthlyPassInDB,
  updateMembership as updateMembershipInDB,
  cancelMonthlyPass as cancelMonthlyPassInDB,
} from '../api/monthly-pass-crud';
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

  // --- Monthly pass state ---
  const [monthlyPassesByUser, setMonthlyPassesByUser] = useState({});
  const [isMonthlyPassLoading, setIsMonthlyPassLoading] = useState(false);
  const [monthlyPassError, setMonthlyPassError] = useState(null);

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
        setMonthlyPassesByUser({});
        setIsMonthlyPassLoading(false);
        setMonthlyPassError(null);
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

  // const createMember = useCallback(async (id, name, car, status, notes, email = '') => {
  //   try {
  //     await createMemberInDB(id, name, car, status, notes, email);

  //     const newMember = { id, name, car, status, notes, email };

  //     setMembers((prev) => {
  //       const idx = prev.findIndex((m) => m.id === id);
  //       if (idx !== -1) {
  //         const updated = [...prev];
  //         updated[idx] = newMember;
  //         return updated;
  //       }
  //       return [...prev, newMember];
  //     });
  //     return id;
  //   } catch (err) {
  //     console.error('Failed to create member:', err);
  //     throw err;
  //   }
  // }, []);

  const createMember = useCallback(async (id, name, contact_person, address, phone_number, email = '') => {
    try {
      await createMemberInDB(id, name, contact_person, address, phone_number, email);

      const newMember = {
        id,
        date: new Date().toISOString().split('T')[0],
        name,
        contact_person,
        address,
        phone_number,
        email,
      };

      setMembers((prev) => {
        const idx = prev.findIndex((m) => m.id === id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = newMember;
          return updated;
        }
        return [...prev, newMember];
      });

      return id;
    } catch (err) {
      console.error('Failed to create member:', err);
      throw err;
    }
  }, []);

  // const upsertMember = useCallback(async (id, name, car, status) => {
  //   try {
  //     const { existed } = await upsertMemberInDB(id, name, car, status);
  //     const excelFields = { id, name, car, status };

  //     setMembers((prev) => {
  //       const idx = prev.findIndex((m) => m.id === id);
  //       if (idx !== -1) {
  //         const updated = [...prev];
  //         updated[idx] = { ...updated[idx], ...excelFields };
  //         return updated;
  //       }
  //       return [...prev, { ...excelFields, notes: '', email: '' }];
  //     });
  //     return { id, existed };
  //   } catch (err) {
  //     console.error('Failed to upsert member:', err);
  //     throw err;
  //   }
  // }, []);

  const upsertMember = useCallback(async (id, name, contact_person, address, phone_number, email = '') => {
    try {
      const { existed } = await upsertMemberInDB(
        id,
        name,
        contact_person,
        address,
        phone_number,
        email
      );

      const memberFields = {
        id,
        name,
        contact_person,
        address,
        phone_number,
        email,
      };

      setMembers((prev) => {
        const idx = prev.findIndex((m) => m.id === id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...memberFields };
          return updated;
        }

        return [
          ...prev,
          {
            date: new Date().toISOString().split('T')[0],
            ...memberFields,
          },
        ];
      });

      return { id, existed };
    } catch (err) {
      console.error('Failed to upsert member:', err);
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

  // const deleteMember = useCallback(async (id) => {
  //   try {
  //     await deleteMemberInDB(id);

  //     setMembers((prev) => prev.filter((member) => member.id !== id));
  //     return id;
  //   } catch (err) {
  //     console.error('Failed to delete member:', err);
  //     throw err;
  //   }
  // }, []);

    const deleteMember = useCallback(async (id) => {
      try {
        await deleteMemberInDB(id);

        setMembers((prev) => prev.filter((member) => member.id !== id));
        setMonthlyPassesByUser((prev) => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });

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
      return data;
    } catch (err) {
      console.error('Failed to refresh members:', err);
      setError('Failed to refresh members.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // =============================================
  //  Monthly Pass CRUD
  // =============================================

  const getMonthlyPassesForUser = useCallback((userId) => {
    return monthlyPassesByUser[userId] || [];
  }, [monthlyPassesByUser]);

  const refreshMonthlyPassesForUser = useCallback(async (userId) => {
    try {
      setIsMonthlyPassLoading(true);
      setMonthlyPassError(null);

      const passes = await fetchAllMonthlyPasses(userId);

      setMonthlyPassesByUser((prev) => ({
        ...prev,
        [userId]: passes,
      }));

      return passes;
    } catch (err) {
      console.error('Failed to refresh monthly passes:', err);
      setMonthlyPassError('Failed to refresh monthly passes.');
      throw err;
    } finally {
      setIsMonthlyPassLoading(false);
    }
  }, []);

  const getMonthlyPass = useCallback(async (userId, passId) => {
    try {
      const cachedPass = (monthlyPassesByUser[userId] || []).find((p) => p.passId === passId);

      if (cachedPass) {
        return cachedPass;
      }

      const passFromDB = await getMonthlyPassFromDB(userId, passId);

      if (passFromDB) {
        setMonthlyPassesByUser((prev) => ({
          ...prev,
          [userId]: prev[userId]?.find((p) => p.passId === passFromDB.passId)
            ? prev[userId]
            : [...(prev[userId] || []), passFromDB],
        }));
      }

      return passFromDB;
    } catch (err) {
      console.error('Failed to get monthly pass:', err);
      throw err;
    }
  }, [monthlyPassesByUser]);

  const getMemberByMonthlyPassId = useCallback(async (passId) => {
    try {
      const cachedOwnerId = Object.entries(monthlyPassesByUser).find(([, passes]) =>
        (passes || []).some((pass) => pass.passId === passId)
      )?.[0];

      if (cachedOwnerId) {
        const cachedMember = members.find((member) => member.id === cachedOwnerId);

        if (cachedMember) {
          return cachedMember;
        }

        return await getMember(cachedOwnerId);
      }

      const memberFromDB = await getMemberByMonthlyPassIdFromDB(passId);

      if (memberFromDB) {
        setMembers((prev) =>
          prev.find((member) => member.id === memberFromDB.id) ? prev : [...prev, memberFromDB]
        );
      }

      return memberFromDB;
    } catch (err) {
      console.error('Failed to get member by monthly pass ID:', err);
      throw err;
    }
  }, [getMember, members, monthlyPassesByUser]);


  const createMonthlyPass = useCallback(async (
    userId,
    passId,
    plan_type,
    update_flag,
    vehicle,
    notes = ''
  ) => {
    try {
      await createMonthlyPassInDB(userId, passId, plan_type, update_flag, vehicle, notes);

      const newPass = {
        passId,
        creation_date: new Date().toISOString().split('T')[0],
        plan_type,
        update_flag,
        vehicle,
        notes,
      };

      setMonthlyPassesByUser((prev) => ({
        ...prev,
        [userId]: [...(prev[userId] || []), newPass],
      }));

      return passId;
    } catch (err) {
      console.error('Failed to create monthly pass:', err);
      throw err;
    }
  }, []);

  const upsertMonthlyPass = useCallback(async (
    userId,
    passId,
    plan_type,
    update_flag,
    vehicle,
    notes = ''
  ) => {
    try {
      const { existed } = await upsertMonthlyPassInDB(
        userId,
        passId,
        plan_type,
        update_flag,
        vehicle,
        notes
      );

      const passFields = {
        passId,
        plan_type,
        update_flag,
        vehicle,
        notes,
      };

      setMonthlyPassesByUser((prev) => {
        const existing = prev[userId] || [];
        const idx = existing.findIndex((p) => p.passId === passId);

        if (idx !== -1) {
          const updated = [...existing];
          updated[idx] = { ...updated[idx], ...passFields };
          return { ...prev, [userId]: updated };
        }

        return {
          ...prev,
          [userId]: [
            ...existing,
            {
              creation_date: new Date().toISOString().split('T')[0],
              ...passFields,
            },
          ],
        };
      });

      return { id: passId, existed };
    } catch (err) {
      console.error('Failed to upsert monthly pass:', err);
      throw err;
    }
  }, []);

  const updateMembership = useCallback(async (userId, passId, updates) => {
    try {
      await updateMembershipInDB(userId, passId, updates);

      setMonthlyPassesByUser((prev) => ({
        ...prev,
        [userId]: (prev[userId] || []).map((pass) =>
          pass.passId === passId ? { ...pass, ...updates } : pass
        ),
      }));

      return passId;
    } catch (err) {
      console.error('Failed to update monthly pass:', err);
      throw err;
    }
  }, []);

  const cancelMonthlyPass = useCallback(async (userId, passId) => {
    try {
      await cancelMonthlyPassInDB(userId, passId);

      const cancelled_date = new Date().toISOString().split('T')[0];

      setMonthlyPassesByUser((prev) => ({
        ...prev,
        [userId]: (prev[userId] || []).map((pass) =>
          pass.passId === passId ? { ...pass, cancelled_date } : pass
        ),
      }));

      return passId;
    } catch (err) {
      console.error('Failed to cancel monthly pass:', err);
      throw err;
    }
  }, []);


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

  const createLoyaltyMember = useCallback(async (id, name, issueDate, lastVisitDate, visitCount, notes, email = '') => {
    try {
      await createLoyaltyMemberInDB(id, name, issueDate, lastVisitDate, visitCount, notes, email);

      const newMember = {
        id,
        name,
        issueDate,
        lastVisitDate,
        visitCount,
        notes,
        email,
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

  const createPrepaidMember = useCallback(async (id, name, issueDate, lastVisitDate, prepaidWashes, notes, email = '') => {
    try {
      await createPrepaidMemberInDB(id, name, issueDate, lastVisitDate, prepaidWashes, notes, email);

      const newMember = {
        id,
        name,
        issueDate,
        lastVisitDate,
        prepaidWashes,
        notes,
        email,
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
    upsertMember,
    updateMember,
    deleteMember,
    refreshMembers,
    // Monthly Passes
    monthlyPassesByUser,
    isMonthlyPassLoading,
    monthlyPassError,
    getMonthlyPassesForUser,
    refreshMonthlyPassesForUser,
    getMonthlyPass,
    getMemberByMonthlyPassId,
    createMonthlyPass,
    upsertMonthlyPass,
    updateMembership,
    cancelMonthlyPass,
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
