import React, { useState } from "react";
import { Offcanvas, Nav } from "react-bootstrap";
import { Link, useLocation } from "react-router";
import "../css/hamburger-menu.css";

function HamburgerMenu() {
  const [show, setShow] = useState(false);
  const location = useLocation();

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const menuItems = [
    { path: "/", label: "Customer Search" },
    { path: "/customers", label: "Customer List" },
    { path: "/analytics", label: "Analytics" },
    { path: "/test", label: "Upload" },
  ];

  return (
    <>
      {/* Hamburger Button */}
      <button
        className={`hamburger-btn ${show ? "active" : ""}`}
        onClick={handleShow}
        aria-label="Open menu"
        aria-expanded={show}
      >
        <span className="line"></span>
        <span className="line"></span>
        <span className="line"></span>
      </button>

      {/* Offcanvas Sidebar */}
      <Offcanvas show={show} onHide={handleClose} placement="start">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column">
            {menuItems.map((item) => (
              <Nav.Link
                key={item.path}
                as={Link}
                to={item.path}
                onClick={handleClose}
                className={`menu-item ${
                  location.pathname === item.path ? "active" : ""
                }`}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.label}</span>
              </Nav.Link>
            ))}
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

export default HamburgerMenu;
