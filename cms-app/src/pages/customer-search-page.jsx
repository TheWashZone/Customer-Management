import React, { useState } from "react";
import "../css/customer-search-page.css";
import { useMembers } from "../context/MembersContext";
import HamburgerMenu from "../components/HamburgerMenu";
import { logDailyVisit } from "../api/analytics-crud";

function CustomerSearchPage() {
  const { getMember, getLoyaltyMember, updateLoyaltyMember, getPrepaidMember, updatePrepaidMember } = useMembers();

  const [code, setCode] = useState("");
  const [memberData, setMemberData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggingVisit, setIsLoggingVisit] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [logError, setLogError] = useState(null);
  const [memberType, setMemberType] = useState(null); // 'subscription' | 'loyalty' | 'prepaid'
  const [freeWashEarned, setFreeWashEarned] = useState(false);
  const [showWashSelect, setShowWashSelect] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashLogSuccess, setCashLogSuccess] = useState(false);
  const [cashLogError, setCashLogError] = useState(null);
  const [isLoggingCash, setIsLoggingCash] = useState(false);

  const handleInput = (value) => {
    setCode((prev) => {
      if (prev.length >= 7) return prev;
      return prev + value.toUpperCase();
    });
  };

  const handleBackspace = () => {
    setCode((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (!/^([BDUL]\d{3,5}|[BDU]B\d{3,5})$/.test(code)) {
      setError("Code must be B/D/U/L + 3-5 digits (e.g. B123) or BB/DB/UB + 3-5 digits for prepaid (e.g. BB101)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let member = null;

      if (code[0] === "L") {
        member = await getLoyaltyMember(code);
        if (member) setMemberType("loyalty");
      } else if ((code[0] === "B" || code[0] === "D" || code[0] === "U") && code[1] === "B") {
        member = await getPrepaidMember(code);
        if (member) setMemberType("prepaid");
      } else if (code[0] === "B" || code[0] === "D" || code[0] === "U") {
        member = await getMember(code);
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
        await logDailyVisit('subscription', code[0]);
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
          setFreeWashEarned(true);
          setLogSuccess(true);
          setTimeout(() => setLogSuccess(false), 3000);
        } else {
          setIsLoggingVisit(false);
          setShowWashSelect(true);
          return;
        }
      } else if (memberType === "prepaid") {
        if (memberData.prepaidWashes <= 0) {
          setLogError("No prepaid washes remaining. Cannot log visit.");
          return;
        }
        const today = new Date().toISOString().split("T")[0];
        const newPrepaidWashes = memberData.prepaidWashes - 1;
        await updatePrepaidMember(memberData.id, {
          lastVisitDate: today,
          prepaidWashes: newPrepaidWashes,
        });
        setMemberData((prev) => ({
          ...prev,
          lastVisitDate: today,
          prepaidWashes: newPrepaidWashes,
        }));
        await logDailyVisit('prepaid', code[0]);
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
      setCashLogSuccess(true);
      setTimeout(() => setCashLogSuccess(false), 3000);
    } catch (err) {
      setCashLogError(`Failed to log cash customer: ${err.message}`);
    } finally {
      setIsLoggingCash(false);
    }
  };

  const buttons = [
    ["B", "D", "U", "L"],
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
  ];

  // If member data is loaded, show member details view
  if (memberData) {
    const formatYesNo = (val) => {
      return val ? "Yes" : "No";
    };

    const getPrepaidWashesClass = () => {
      if (memberData.prepaidWashes === 0) return "no-washes-card";
      if (memberData.prepaidWashes <= 2) return "warning-card";
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
                  <span className="header-label">ID:</span>
                  <span className="header-value">{memberData.id}</span>
                </div>
                <div className="header-row">
                  <span className="header-label">Name:&nbsp;</span>
                  <span className="header-value">{memberData.name}</span>
                </div>
                <div className="header-row">
                  <span className="header-label">Car:&nbsp;</span>
                  <span className="header-value">{memberData.car}</span>
                </div>
                {memberData.email && (
                  <div className="header-row">
                    <span className="header-label">Email:&nbsp;</span>
                    <span className="header-value">{memberData.email}</span>
                  </div>
                )}
              </div>

              <div className="status-section">
                <div
                  className={`status-card ${memberData.isActive === "No" || memberData.isActive === false
                    ? "inactive-card"
                    : "ok-card"
                    }`}
                >
                  <span className="status-label">Active:</span>
                  <span className="status-value">{formatYesNo(memberData.isActive)}</span>
                </div>

                <div
                  className={`status-card ${memberData.validPayment === "No" || memberData.validPayment === false
                    ? "invalid-payment-card"
                    : "ok-card"
                    }`}
                >
                  <span className="status-label">Valid Payment:</span>
                  <span className="status-value">{formatYesNo(memberData.validPayment)}</span>
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

          {/* PREPAID (P) DISPLAY */}
          {memberType === "prepaid" && (
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
                <div className={`status-card ${getPrepaidWashesClass()}`}>
                  <span className="status-label">Prepaid Washes:</span>
                  <span className="status-value">{memberData.prepaidWashes}</span>
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

          {/* LOG CUSTOMER COUNT BUTTON */}
          <div className="log-visit-container">
            <button
              onClick={handleLogVisit}
              className="log-visit-btn"
              disabled={isLoggingVisit || (memberType === "prepaid" && memberData.prepaidWashes <= 0)}
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
        </div>
      </div>
    );
  }

  return (
    <div className="search-page-container">
      <HamburgerMenu />
      <div className="keypad-container">

        {/* Cash Customer Button */}
        <button
          className="cash-customer-btn"
          onClick={() => { setCashLogSuccess(false); setCashLogError(null); setShowCashModal(true); }}
          disabled={isLoggingCash}
          aria-label="Log cash customer"
        >
          {isLoggingCash ? "Logging..." : "Log Cash Customer"}
        </button>

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
    </div>
  );
}

export default CustomerSearchPage;

// adding a comment so I can push this branch to github
