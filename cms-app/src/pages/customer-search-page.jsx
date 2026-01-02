import React, { useState } from "react";
import "../css/customer-search-page.css";
import { useMembers } from "../context/MembersContext";
import HamburgerMenu from "../components/hamburger-menu";
import { logDailyVisit } from "../api/analytics-crud";

function CustomerSearchPage() {
  const { getMember } = useMembers();

  const [code, setCode] = useState("");
  const [memberData, setMemberData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggingVisit, setIsLoggingVisit] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [logError, setLogError] = useState(null);

  const handleInput = (value) => {
    setCode((prev) => {
      if (prev.length >= 5) return prev;
      return prev + value.toUpperCase();
    });
  };

  const handleBackspace = () => {
    setCode((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (!/^[BDU]\d{3,4}$/.test(code)) {
      setError("Code must be B/D/U + 3 or 4 digits (example: B123/B1234)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const member = await getMember(code);

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
  };

  const handleLogVisit = async () => {
    setIsLoggingVisit(true);
    setLogSuccess(false);
    setLogError(null);

    try {
      await logDailyVisit();
      setLogSuccess(true);
      setTimeout(() => setLogSuccess(false), 3000);
    } catch (err) {
      setLogError(`Failed to log visit: ${err.message}`);
    } finally {
      setIsLoggingVisit(false);
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
    const formatYesNo = (val) => {
      return val ? "Yes" : "No";
    };

    return (
      <div className="search-page-container">
        <HamburgerMenu />

        <div className="member-details-container">
          <button onClick={handleBack} className="back-arrow" aria-label="Back to search">
            ← Back
          </button>

          <h2>Member Details</h2>

          {/* HEADER BLOCK */}
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
          </div>

          {/* STATUS SECTION */}
          <div className="status-section">
            {/* Active Card */}
            <div
              className={`status-card ${memberData.isActive === "No" || memberData.isActive === false
                  ? "inactive-card"
                  : "ok-card"
                }`}
            >
              <span className="status-label">Active:</span>
              <span className="status-value">{formatYesNo(memberData.isActive)}</span>
            </div>

            {/* Valid Payment Card */}
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

          {/* NOTES */}
          {memberData.notes && (
            <div className="notes-card">
              <span className="notes-label">Notes:</span>
              <span className="notes-value">{memberData.notes}</span>
            </div>
          )}

          {/* LOG VISIT BUTTON */}
          <div className="log-visit-container">
            <button
              onClick={handleLogVisit}
              className="log-visit-btn"
              disabled={isLoggingVisit}
              aria-label="Log customer visit"
            >
              {isLoggingVisit ? "Logging..." : "Log Visit"}
            </button>

            {logSuccess && (
              <div className="log-success-message" role="status">
                ✓ Visit logged successfully
              </div>
            )}

            {logError && (
              <div className="log-error-message" role="alert">
                {logError}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="search-page-container">
      <HamburgerMenu />
      <div className="keypad-container">

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
          {buttons.flat().map((btn) => (
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
            disabled={!/^[BDU]\d{3,4}$/.test(code) || loading}
            aria-label="Submit customer code"
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomerSearchPage;

// adding a comment so I can push this branch to github
