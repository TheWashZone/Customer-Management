import React, { useState } from "react";
import "../css/customer-search-page.css";
import { useMembers } from "../context/MembersContext";
import HamburgerMenu from "../components/HamburgerMenu";
import { logDailyVisit } from "../api/analytics-crud";
import { createVisit } from "../api/visit-crud.js";
import { getNextVisitId } from "../api/visit-counter.js"

function CustomerSearchPage() {
  const { 
    updateMember, 
    getLoyaltyMember, 
    updateLoyaltyMember, 
    getBookMember, 
    updateBookMember, 
    getMemberByMonthlyPassId,
    updateMembership 
  } = useMembers();

  const [code, setCode] = useState("");
  const [memberData, setMemberData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggingVisit, setIsLoggingVisit] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [logError, setLogError] = useState(null);
  const [memberType, setMemberType] = useState(null); // 'subscription' | 'loyalty' | 'book'
  const [freeWashEarned, setFreeWashEarned] = useState(false);
  const [showWashSelect, setShowWashSelect] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashLogSuccess, setCashLogSuccess] = useState(false);
  const [cashLogError, setCashLogError] = useState(null);
  const [isLoggingCash, setIsLoggingCash] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [loyaltyLogSuccess, setLoyaltyLogSuccess] = useState(false);
  const [loyaltyLogError, setLoyaltyLogError] = useState(null);
  const [isLoggingLoyalty, setIsLoggingLoyalty] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookLogSuccess, setBookLogSuccess] = useState(false);
  const [bookLogError, setBookLogError] = useState(null);
  const [isLoggingBook, setIsLoggingBook] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const handleInput = (value) => {
    setCode((prev) => {
      if (prev.length >= 7) return prev;
      return prev + value.toUpperCase();
    });
  };

  const handleBackspace = () => {
    setCode((prev) => prev.slice(0, -1));
  };

  let member = null;

  const handleSubmit = async () => {
    if (!/^([BDUL]\d{3,5}|[BDU]B\d{3,5})$/.test(code)) {
      setError("Code must be B/D/U/L + 3-5 digits (e.g. B123) or BB/DB/UB + 3-5 digits for book (e.g. BB101)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      member = null;

      if (code[0] === "L") {
        member = await getLoyaltyMember(code);
        if (member) setMemberType("loyalty");
      } else if ((code[0] === "B" || code[0] === "D" || code[0] === "U") && code[1] === "B") {
        member = await getBookMember(code);
        if (member) setMemberType("book");
      } else if (code[0] === "B" || code[0] === "D" || code[0] === "U") {
        // member = await getMember(code);
        member = await getMemberByMonthlyPassId(code);
        if (member) setMemberType("subscription");
      }

      if (member) {
        setMemberData(member);
      } else {
        setError(`No member found with ID: ${code}`);
      }
    } catch (err) {
      setError(`Error fetching member: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setMemberData(null);
    setError(null);
    setCode("");
    setLogSuccess(false);
    setLogError(null);
    setCashLogSuccess(false);
    setCashLogError(null);
    setMemberType(null);
    setFreeWashEarned(false);
    setShowWashSelect(false);
    setShowEditModal(false);
    setEditForm({});
    setEditError(null);
  };

  const handleOpenEdit = () => {
    setEditForm({
       ...memberData,
       car: memberData.vehicle || memberData.car || '',
       notes: memberData.notes || '',
       status: memberData.status || 'active',
      });
    setEditError(null);
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleEditSave = async () => {
    setIsSaving(true);
    setEditError(null);
    try {
      let updates = {};
      // if (memberType === 'subscription') {
      //   updates = {
      //     name: editForm.name || '',
      //     email: editForm.email || '',
      //     notes: editForm.notes || '',
      //     car: editForm.car || '',
      //     status: editForm.status || 'active',
      //   };
      //   await updateMember(memberData.id, updates);
      if (memberType === 'subscription') {
        const userUpdates = {
          name: editForm.name || '',
          email: editForm.email || '',
        };

        const passUpdates = {
          vehicle: editForm.car || '',
          notes: editForm.notes || '',
          status: editForm.status || 'active',
        };

        await updateMember(memberData.id, userUpdates);
        await updateMembership(memberData.id, memberData.passId || code, passUpdates);

        updates = {
          ...userUpdates,
          ...passUpdates,
          car: passUpdates.vehicle,
        };
      } else if (memberType === 'loyalty') {
        updates = {
          name: editForm.name,
          email: editForm.email,
          notes: editForm.notes,
          issueDate: editForm.issueDate,
          lastVisitDate: editForm.lastVisitDate,
          visitCount: Number(editForm.visitCount),
        };
        await updateLoyaltyMember(memberData.id, updates);
      } else if (memberType === 'book') {
        updates = {
          name: editForm.name,
          email: editForm.email,
          notes: editForm.notes,
          issueDate: editForm.issueDate,
          lastVisitDate: editForm.lastVisitDate,
          bookPages: Number(editForm.bookPages),
        };
        await updateBookMember(memberData.id, updates);
      }
      setMemberData(prev => ({ ...prev, ...updates }));
      setShowEditModal(false);
    } catch (err) {
      setEditError(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const isNextWashFree = memberType === 'loyalty' && ((memberData?.visitCount || 0) + 1) % 10 === 0;

  const handleWashSelection = async (washType) => {
    setShowWashSelect(false);
    setIsLoggingVisit(true);
    setLogSuccess(false);
    setLogError(null);
    setFreeWashEarned(false);

    try {
      const today = new Date().toISOString().split("T")[0];
      const newVisitCount = (memberData.visitCount || 0) + 1;
      await updateLoyaltyMember(memberData.id, {
        lastVisitDate: today,
        visitCount: newVisitCount,
      });
      setMemberData((prev) => ({
        ...prev,
        lastVisitDate: today,
        visitCount: newVisitCount,
      }));
      await logDailyVisit('loyalty', washType);
      // Also log to visits collection
      const visitId = String(await getNextVisitId());
      await createVisit(visitId, washType, 'loyalty');
      setLogSuccess(true);
      setTimeout(() => setLogSuccess(false), 3000);
    } catch (err) {
      setLogError(`Failed to log visit: ${err.message}`);
    } finally {
      setIsLoggingVisit(false);
    }
  };

const handleLogVisit = async () => {
  setIsLoggingVisit(true);
  setLogSuccess(false);
  setLogError(null);
  setFreeWashEarned(false);

  try {
    if (memberType === "subscription") {
      const washType = code[0];
      const visitId = String(await getNextVisitId());
      await createVisit(visitId, washType, 'subscription', code);
      await logDailyVisit('subscription', washType);
      setLogSuccess(true);
      setTimeout(() => setLogSuccess(false), 3000);
    } else if (memberType === "loyalty") {
      if (isNextWashFree) {
        const today = new Date().toISOString().split("T")[0];
        const newVisitCount = (memberData.visitCount || 0) + 1;
        await updateLoyaltyMember(memberData.id, {
          lastVisitDate: today,
          visitCount: newVisitCount,
        });
        setMemberData((prev) => ({
          ...prev,
          lastVisitDate: today,
          visitCount: newVisitCount,
        }));
        await logDailyVisit('loyalty', 'U');
        const visitId = String(await getNextVisitId());
        await createVisit(visitId, 'U', 'loyalty');
        setFreeWashEarned(true);
        setLogSuccess(true);
        setTimeout(() => setLogSuccess(false), 3000);
      } else {
        setIsLoggingVisit(false);
        setShowWashSelect(true);
        return;
      }
    } else if (memberType === "book") {
      if (memberData.bookPages <= 0) {
        setLogError("No book pages remaining. Cannot log visit.");
        return;                                        // ← removed dead code after this
      }
      const washType = code[0];
      const today = new Date().toISOString().split("T")[0];
      const newBookPages = memberData.bookPages - 1;
      await updateBookMember(memberData.id, {
        lastVisitDate: today,
        bookPages: newBookPages,
      });
      setMemberData((prev) => ({
        ...prev,
        lastVisitDate: today,
        bookPages: newBookPages,
      }));
      await logDailyVisit('prepaid', washType);
      const visitId = String(await getNextVisitId());
      await createVisit(visitId, washType, 'prepaid');
      setLogSuccess(true);
      setTimeout(() => setLogSuccess(false), 3000);
    }
  } catch (err) {
    setLogError(`Failed to log visit: ${err.message}`);
  } finally {
    setIsLoggingVisit(false);
  }
};

  const handleCashLog = async (washType) => {
    setShowCashModal(false);
    setIsLoggingCash(true);
    setCashLogSuccess(false);
    setCashLogError(null);

    try {
      await logDailyVisit('cash', washType);
      // Also log to visits collection
      const visitId = String(await getNextVisitId());
      await createVisit(visitId, washType, 'cash');
      setCashLogSuccess(true);
      setTimeout(() => setCashLogSuccess(false), 3000);
    } catch (err) {
      setCashLogError(`Failed to log cash customer: ${err.message}`);
    } finally {
      setIsLoggingCash(false);
    }
  };

  const handleLoyaltyLog = async (washType) => {
    setShowLoyaltyModal(false);
    setIsLoggingLoyalty(true);
    setLoyaltyLogSuccess(false);
    setLoyaltyLogError(null);

    try {
      await logDailyVisit('loyalty', washType);
      // Also log to visits collection
      const visitId = String(await getNextVisitId());
      await createVisit(visitId, washType, 'loyalty');
      setLoyaltyLogSuccess(true);
      setTimeout(() => setLoyaltyLogSuccess(false), 3000);
    } catch (err) {
      setLoyaltyLogError(`Failed to log loyalty customer: ${err.message}`);
    } finally {
      setIsLoggingLoyalty(false);
    }
  };

  const handleBookLog = async (washType) => {
    setShowBookModal(false);
    setIsLoggingBook(true);
    setBookLogSuccess(false);
    setBookLogError(null);

    try {
      await logDailyVisit('prepaid', washType);
      // Also log to visits collection
      const visitId = String(await getNextVisitId());
      await createVisit(visitId, washType, 'prepaid');
      setBookLogSuccess(true);
      setTimeout(() => setBookLogSuccess(false), 3000);
    } catch (err) {
      setBookLogError(`Failed to log book customer: ${err.message}`);
    } finally {
      setIsLoggingBook(false);
    }
  };

  const buttons = [
    ["B", "D", "U"],
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
  ];

  // If member data is loaded, show member details view
  if (memberData) {
    const getStatusClass = (status) => {
      if (status === 'inactive') return 'inactive-card';
      if (status === 'payment_needed') return 'invalid-payment-card';
      return 'ok-card';
    };

    const getStatusLabel = (status) => {
      if (status === 'inactive') return 'Inactive';
      if (status === 'payment_needed') return 'Payment Needed';
      return 'Active';
    };

    const getBookPagesClass = () => {
      if (memberData.bookPages === 0) return "no-washes-card";
      if (memberData.bookPages <= 2) return "warning-card";
      return "ok-card";
    };

    return (
      <div className="search-page-container">
        <HamburgerMenu />

        <div className="member-details-container">
          <button onClick={handleBack} className="back-arrow" aria-label="Back to search">
            ← Back
          </button>

          <h2>Member Details</h2>

          {/* FREE WASH BANNER */}
          {freeWashEarned && (
            <div className="free-wash-banner" role="alert">
              <div className="free-wash-title">FREE WASH EARNED!</div>
              <div className="free-wash-subtitle">
                Congratulations! This is visit #{memberData.visitCount}!
              </div>
            </div>
          )}

          {/* SUBSCRIPTION (B/D/U) DISPLAY */}
          {memberType === "subscription" && (
            <>
              <div className="member-header-card">
                <div className="header-row">
                  <span className="header-label">Name:</span>
                  <span className="header-value">{memberData.name}</span>
                </div>
                <div className="header-row">
                  <span className="header-label">Pass ID:&nbsp;</span>
                  <span className="header-value">{code}</span>
                </div>
                <div className="header-row">
                  <span className="header-label">Contact Person:&nbsp;</span>
                  <span className="header-value">{memberData.contact_person}</span>
                </div>
                <div className="header-row">
                  <span className="header-label">Phone Number:&nbsp;</span>
                  <span className="header-value">{memberData.phone_number}</span>
                </div>
                <div className="header-row">
                  <span className="header-label">Address:&nbsp;</span>
                  <span className="header-value">{memberData.address}</span>
                </div>
                {memberData.email && (
                  <div className="header-row">
                    <span className="header-label">Email:&nbsp;</span>
                    <span className="header-value">{memberData.email}</span>
                  </div>
                )}
              </div>

              <div className="status-section">
                <div className={`status-card ${getStatusClass(memberData.status)}`}>
                  <span className="status-label">Status:</span>
                  <span className="status-value">{getStatusLabel(memberData.status)}</span>
                </div>
              </div>
            </>
          )}

          {/* LOYALTY (L) DISPLAY */}
          {memberType === "loyalty" && (
            <>
              <div className="member-header-card">
                <div className="header-row">
                  <span className="header-label">ID:</span>
                  <span className="header-value">{memberData.id}</span>
                </div>
                <div className="header-row">
                  <span className="header-label">Name:&nbsp;</span>
                  <span className="header-value">{memberData.name}</span>
                </div>
                {memberData.email && (
                  <div className="header-row">
                    <span className="header-label">Email:&nbsp;</span>
                    <span className="header-value">{memberData.email}</span>
                  </div>
                )}
                <div className="header-row">
                  <span className="header-label">Issue Date:&nbsp;</span>
                  <span className="header-value">{memberData.issueDate}</span>
                </div>
                <div className="header-row">
                  <span className="header-label">Last Visit:&nbsp;</span>
                  <span className="header-value">{memberData.lastVisitDate}</span>
                </div>
                <div className="header-row">
                  <span className="header-label">Visit Count:&nbsp;</span>
                  <span className="header-value">{memberData.visitCount}</span>
                </div>
              </div>
            </>
          )}

          {/* BOOK DISPLAY */}
          {memberType === "book" && (
            <>
              <div className="member-header-card">
                <div className="header-row">
                  <span className="header-label">ID:</span>
                  <span className="header-value">{memberData.id}</span>
                </div>
                <div className="header-row">
                  <span className="header-label">Name:&nbsp;</span>
                  <span className="header-value">{memberData.name}</span>
                </div>
                {memberData.email && (
                  <div className="header-row">
                    <span className="header-label">Email:&nbsp;</span>
                    <span className="header-value">{memberData.email}</span>
                  </div>
                )}
                <div className="header-row">
                  <span className="header-label">Issue Date:&nbsp;</span>
                  <span className="header-value">{memberData.issueDate}</span>
                </div>
                <div className="header-row">
                  <span className="header-label">Last Visit:&nbsp;</span>
                  <span className="header-value">{memberData.lastVisitDate}</span>
                </div>
              </div>

              <div className="status-section">
                <div className={`status-card ${getBookPagesClass()}`}>
                  <span className="status-label">Book Pages:</span>
                  <span className="status-value">{memberData.bookPages}</span>
                </div>
              </div>
            </>
          )}

          {/* NOTES */}
          {memberData.notes && (
            <div className="notes-card">
              <span className="notes-label">Notes:</span>
              <span className="notes-value">{memberData.notes}</span>
            </div>
          )}

          {/* EDIT MEMBER BUTTON */}
          <div className="log-visit-container">
            <button onClick={handleOpenEdit} className="edit-member-btn">
              Edit Member
            </button>
          </div>

          {/* LOG CUSTOMER COUNT BUTTON */}
          <div className="log-visit-container">
            <button
              onClick={handleLogVisit}
              className="log-visit-btn"
              disabled={isLoggingVisit || (memberType === "book" && memberData.bookPages <= 0)}
              aria-label="Add one to today's total customer count"
            >
              {isLoggingVisit ? "Logging..." : isNextWashFree ? "Log Free Wash" : "Log Customer"}
            </button>
            {logSuccess && (
              <div className="log-success-message" role="status">
                ✓ Customer counted successfully
              </div>
            )}

            {logError && (
              <div className="log-error-message" role="alert">
                {logError}
              </div>
            )}
          </div>

          {/* WASH TYPE SELECTION POPUP */}
          {showWashSelect && (
            <div className="wash-select-overlay" onClick={() => setShowWashSelect(false)}>
              <div className="wash-select-popup" onClick={(e) => e.stopPropagation()}>
                <h3>Select Wash Type</h3>
                <div className="wash-select-buttons">
                  <button
                    className="wash-select-btn"
                    style={{ backgroundColor: '#0d6efd' }}
                    onClick={() => handleWashSelection('B')}
                  >
                    Basic (B)
                  </button>
                  <button
                    className="wash-select-btn"
                    style={{ backgroundColor: '#dc3545' }}
                    onClick={() => handleWashSelection('D')}
                  >
                    Deluxe (D)
                  </button>
                  <button
                    className="wash-select-btn"
                    style={{ backgroundColor: '#198754' }}
                    onClick={() => handleWashSelection('U')}
                  >
                    Unlimited (U)
                  </button>
                </div>
                <button
                  className="wash-select-cancel"
                  onClick={() => setShowWashSelect(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* EDIT MEMBER POPUP */}
          {showEditModal && (
            <div className="wash-select-overlay" onClick={() => setShowEditModal(false)}>
              <div className="edit-popup" onClick={(e) => e.stopPropagation()}>
                <h3>Edit Member</h3>
                <div className="edit-form">

                  {/* All types: Name */}
                  <div className="edit-field">
                    <label className="edit-label" htmlFor="edit-name">Name</label>
                    <input
                      id="edit-name"
                      className="edit-input"
                      type="text"
                      name="name"
                      value={editForm.name || ''}
                      onChange={handleEditChange}
                    />
                  </div>

                  {/* All types: Email */}
                  <div className="edit-field">
                    <label className="edit-label" htmlFor="edit-email">Email</label>
                    <input
                      id="edit-email"
                      className="edit-input"
                      type="email"
                      name="email"
                      value={editForm.email || ''}
                      onChange={handleEditChange}
                    />
                  </div>

                  {/* All types: Notes */}
                  <div className="edit-field">
                    <label className="edit-label" htmlFor="edit-notes">Notes</label>
                    <textarea
                      id="edit-notes"
                      className="edit-textarea"
                      name="notes"
                      value={editForm.notes || ''}
                      onChange={handleEditChange}
                    />
                  </div>

                  {/* Subscription only */}
                  {memberType === 'subscription' && (
                    <>
                      <div className="edit-field">
                        <label className="edit-label" htmlFor="edit-car">Car</label>
                        <input
                          id="edit-car"
                          className="edit-input"
                          type="text"
                          name="car"
                          value={editForm.car || ''}
                          onChange={handleEditChange}
                        />
                      </div>

                      <div className="edit-toggle-row">
                        <span className="edit-label">Status</span>
                        <div className="edit-toggle-group">
                          <button
                            type="button"
                            className={`edit-toggle-btn${editForm.status === 'active' ? ' selected' : ''}`}
                            onClick={() => setEditForm(prev => ({ ...prev, status: 'active' }))}
                          >
                            Active
                          </button>
                          <button
                            type="button"
                            className={`edit-toggle-btn${editForm.status === 'inactive' ? ' selected' : ''}`}
                            onClick={() => setEditForm(prev => ({ ...prev, status: 'inactive' }))}
                          >
                            Inactive
                          </button>
                          <button
                            type="button"
                            className={`edit-toggle-btn${editForm.status === 'payment_needed' ? ' selected' : ''}`}
                            onClick={() => setEditForm(prev => ({ ...prev, status: 'payment_needed' }))}
                          >
                            Pmt Needed
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Loyalty only */}
                  {memberType === 'loyalty' && (
                    <>
                      <div className="edit-field">
                        <label className="edit-label" htmlFor="edit-issueDate">Issue Date</label>
                        <input
                          id="edit-issueDate"
                          className="edit-input"
                          type="date"
                          name="issueDate"
                          value={editForm.issueDate || ''}
                          onChange={handleEditChange}
                        />
                      </div>
                      <div className="edit-field">
                        <label className="edit-label" htmlFor="edit-lastVisitDate">Last Visit</label>
                        <input
                          id="edit-lastVisitDate"
                          className="edit-input"
                          type="date"
                          name="lastVisitDate"
                          value={editForm.lastVisitDate || ''}
                          onChange={handleEditChange}
                        />
                      </div>
                      <div className="edit-field">
                        <label className="edit-label" htmlFor="edit-visitCount">Visit Count</label>
                        <input
                          id="edit-visitCount"
                          className="edit-input"
                          type="number"
                          name="visitCount"
                          min="0"
                          value={editForm.visitCount ?? ''}
                          onChange={handleEditChange}
                        />
                      </div>
                    </>
                  )}

                  {/* Book only */}
                  {memberType === 'book' && (
                    <>
                      <div className="edit-field">
                        <label className="edit-label" htmlFor="edit-issueDate">Issue Date</label>
                        <input
                          id="edit-issueDate"
                          className="edit-input"
                          type="date"
                          name="issueDate"
                          value={editForm.issueDate || ''}
                          onChange={handleEditChange}
                        />
                      </div>
                      <div className="edit-field">
                        <label className="edit-label" htmlFor="edit-lastVisitDate">Last Visit</label>
                        <input
                          id="edit-lastVisitDate"
                          className="edit-input"
                          type="date"
                          name="lastVisitDate"
                          value={editForm.lastVisitDate || ''}
                          onChange={handleEditChange}
                        />
                      </div>
                      <div className="edit-field">
                        <label className="edit-label" htmlFor="edit-bookPages">Book Pages</label>
                        <input
                          id="edit-bookPages"
                          className="edit-input"
                          type="number"
                          name="bookPages"
                          min="0"
                          value={editForm.bookPages ?? ''}
                          onChange={handleEditChange}
                        />
                      </div>
                    </>
                  )}

                </div>

                {editError && (
                  <div className="edit-error-message" role="alert">{editError}</div>
                )}

                <div className="edit-actions">
                  <button
                    className="edit-save-btn"
                    onClick={handleEditSave}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    className="wash-select-cancel"
                    onClick={() => setShowEditModal(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="search-page-container">
      <HamburgerMenu />
      <div className="keypad-container">

        {/* Customer Quick Log Buttons Row */}
        <div className="customer-log-buttons-row">
          {/* Cash Customer Button */}
          <button
            className="cash-customer-btn"
            onClick={() => { setCashLogSuccess(false); setCashLogError(null); setShowCashModal(true); }}
            disabled={isLoggingCash}
            aria-label="Log cash customer"
            title="Log Cash Customer"
          >
            Cash
          </button>

          {/* Loyalty Customer Button */}
          <button
            className="loyalty-customer-btn"
            onClick={() => { setLoyaltyLogSuccess(false); setLoyaltyLogError(null); setShowLoyaltyModal(true); }}
            disabled={isLoggingLoyalty}
            aria-label="Log loyalty customer"
            title="Log Loyalty Customer"
          >
            Loyalty
          </button>

          {/* Book Customer Button */}
          <button
            className="book-customer-btn"
            onClick={() => { setBookLogSuccess(false); setBookLogError(null); setShowBookModal(true); }}
            disabled={isLoggingBook}
            aria-label="Log book customer"
            title="Log Book Customer"
          >
            Book
          </button>
        </div>

        {cashLogSuccess && (
          <div className="log-success-message" role="status" style={{ marginBottom: '8px' }}>
            ✓ Cash customer logged
          </div>
        )}
        {cashLogError && (
          <div className="log-error-message" role="alert" style={{ marginBottom: '8px' }}>
            {cashLogError}
          </div>
        )}

        {loyaltyLogSuccess && (
          <div className="log-success-message" role="status" style={{ marginBottom: '8px' }}>
            ✓ Loyalty customer logged
          </div>
        )}
        {loyaltyLogError && (
          <div className="log-error-message" role="alert" style={{ marginBottom: '8px' }}>
            {loyaltyLogError}
          </div>
        )}

        {bookLogSuccess && (
          <div className="log-success-message" role="status" style={{ marginBottom: '8px' }}>
            ✓ Book customer logged
          </div>
        )}
        {bookLogError && (
          <div className="log-error-message" role="alert" style={{ marginBottom: '8px' }}>
            {bookLogError}
          </div>
        )}

        {/* Display Box */}
        <div
          className="display-box"
          role="textbox"
          aria-label="Customer code input"
          aria-readonly="true"
        >
          {code}
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="loading-message">
            Loading...
          </div>
        )}

        {/* Keypad Grid */}
        <div className="keypad-grid">
          {/* Letter row (5 buttons) */}
          <div className="letter-row">
            {buttons[0].map((btn) => (
              <button
                key={btn}
                onClick={() => handleInput(btn)}
                className="keypad-btn"
                disabled={loading}
              >
                {btn}
              </button>
            ))}
          </div>

          {/* Number rows (3 buttons each) */}
          {buttons.slice(1).flat().map((btn) => (
            <button
              key={btn}
              onClick={() => handleInput(btn)}
              className="keypad-btn"
              disabled={loading}
            >
              {btn}
            </button>
          ))}

          {/* Backspace */}
          <button onClick={handleBackspace} className="keypad-btn" disabled={loading}>
            ←
          </button>

          {/* Zero */}
          <button
            onClick={() => handleInput("0")}
            className="keypad-btn"
            disabled={loading}
          >
            0
          </button>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            className="submit-btn"
            disabled={!/^([BDUL]\d{3,5}|[BDU]B\d{3,5})$/.test(code) || loading}
            aria-label="Submit customer code"
          >
            ✓
          </button>
        </div>
      </div>

      {/* Cash Customer Modal */}
      {showCashModal && (
        <div className="wash-select-overlay" onClick={() => setShowCashModal(false)}>
          <div className="wash-select-popup" onClick={(e) => e.stopPropagation()}>
            <h3>Log Cash Customer</h3>
            <div className="wash-select-buttons">
              <button
                className="wash-select-btn"
                style={{ backgroundColor: '#0d6efd' }}
                onClick={() => handleCashLog('B')}
              >
                Basic (B)
              </button>
              <button
                className="wash-select-btn"
                style={{ backgroundColor: '#dc3545' }}
                onClick={() => handleCashLog('D')}
              >
                Deluxe (D)
              </button>
              <button
                className="wash-select-btn"
                style={{ backgroundColor: '#198754' }}
                onClick={() => handleCashLog('U')}
              >
                Unlimited (U)
              </button>
            </div>
            <button
              className="wash-select-cancel"
              onClick={() => setShowCashModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loyalty Customer Modal */}
      {showLoyaltyModal && (
        <div className="wash-select-overlay" onClick={() => setShowLoyaltyModal(false)}>
          <div className="wash-select-popup" onClick={(e) => e.stopPropagation()}>
            <h3>Log Loyalty Customer</h3>
            <div className="wash-select-buttons">
              {/* <button
                className="wash-select-btn"
                style={{ backgroundColor: '#0d6efd' }}
                onClick={() => handleLoyaltyLog('B')}
              >
                Basic (B)
              </button>
              <button
                className="wash-select-btn"
                style={{ backgroundColor: '#dc3545' }}
                onClick={() => handleLoyaltyLog('D')}
              >
                Deluxe (D)
              </button> */}
              <button
                className="wash-select-btn"
                style={{ backgroundColor: '#198754' }}
                onClick={() => handleLoyaltyLog('U')}
              >
                Unlimited (U)
              </button>
            </div>
            <button
              className="wash-select-cancel"
              onClick={() => setShowLoyaltyModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Book Customer Modal */}
      {showBookModal && (
        <div className="wash-select-overlay" onClick={() => setShowBookModal(false)}>
          <div className="wash-select-popup" onClick={(e) => e.stopPropagation()}>
            <h3>Log Book Customer</h3>
            <div className="wash-select-buttons">
              <button
                className="wash-select-btn"
                style={{ backgroundColor: '#0d6efd' }}
                onClick={() => handleBookLog('B')}
              >
                Basic (B)
              </button>
              <button
                className="wash-select-btn"
                style={{ backgroundColor: '#dc3545' }}
                onClick={() => handleBookLog('D')}
              >
                Deluxe (D)
              </button>
              <button
                className="wash-select-btn"
                style={{ backgroundColor: '#198754' }}
                onClick={() => handleBookLog('U')}
              >
                Unlimited (U)
              </button>
            </div>
            <button
              className="wash-select-cancel"
              onClick={() => setShowBookModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerSearchPage;
