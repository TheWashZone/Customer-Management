import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/customer-list-page.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import React, { useEffect, useState } from 'react';
import {
  Container,
  Row,
  Col,
  Table,
  Form,
  Button,
  InputGroup,
  Spinner,
  Alert,
  Modal,
  Card,
  Stack,
  Badge,
} from 'react-bootstrap';

import { useMembers } from '../context/MembersContext';

import { getAllLoyaltyMembers, createLoyaltyMember, updateLoyaltyMember, deleteLoyaltyMember } from '../api/loyalty-crud';
import { getAllPrepaidMembers, createPrepaidMember, updatePrepaidMember, deletePrepaidMember } from '../api/prepaid-crud';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import HamburgerMenu from '../components/HamburgerMenu';

function MembersPage() {
  const { members, isLoading, createMember, updateMember, deleteMember } = useMembers();

  // --- TAB STATE ---
  const [activeTab, setActiveTab] = useState('subscription');

  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [idError, setIdError] = useState('');

  // --- SUBSCRIPTION Add/Edit/Delete state (existing) ---
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    id: '',
    name: '',
    car: '',
    isActive: true,
    validPayment: true,
    notes: '',
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    car: '',
    isActive: true,
    validPayment: true,
    notes: '',
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  const [filterSubscription, setFilterSubscription] = useState('all');
  const [filterActive, setFilterActive] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');

  // --- LOYALTY STATE ---
  const [loyaltyMembers, setLoyaltyMembers] = useState([]);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyLoaded, setLoyaltyLoaded] = useState(false);
  const [filteredLoyaltyMembers, setFilteredLoyaltyMembers] = useState([]);
  const [loyaltySearchTerm, setLoyaltySearchTerm] = useState('');

  const [showLoyaltyAddForm, setShowLoyaltyAddForm] = useState(false);
  const [loyaltyAddForm, setLoyaltyAddForm] = useState({
    id: '', name: '', issueDate: '', lastVisitDate: '', visitCount: 0, notes: ''
  });

  const [showLoyaltyEditModal, setShowLoyaltyEditModal] = useState(false);
  const [loyaltyEditForm, setLoyaltyEditForm] = useState({
    id: '', name: '', issueDate: '', lastVisitDate: '', visitCount: 0, notes: ''
  });

  const [showLoyaltyDeleteModal, setShowLoyaltyDeleteModal] = useState(false);
  const [loyaltyMemberToDelete, setLoyaltyMemberToDelete] = useState(null);

  // --- PREPAID STATE ---
  const [prepaidMembers, setPrepaidMembers] = useState([]);
  const [prepaidLoading, setPrepaidLoading] = useState(false);
  const [prepaidLoaded, setPrepaidLoaded] = useState(false);
  const [filteredPrepaidMembers, setFilteredPrepaidMembers] = useState([]);
  const [prepaidSearchTerm, setPrepaidSearchTerm] = useState('');
  const [filterPrepaidType, setFilterPrepaidType] = useState('all');

  const [showPrepaidAddForm, setShowPrepaidAddForm] = useState(false);
  const [prepaidAddForm, setPrepaidAddForm] = useState({
    id: '', name: '', type: 'B', issueDate: '', lastVisitDate: '', prepaidWashes: 0, notes: ''
  });

  const [showPrepaidEditModal, setShowPrepaidEditModal] = useState(false);
  const [prepaidEditForm, setPrepaidEditForm] = useState({
    id: '', name: '', type: 'B', issueDate: '', lastVisitDate: '', prepaidWashes: 0, notes: ''
  });

  const [showPrepaidDeleteModal, setShowPrepaidDeleteModal] = useState(false);
  const [prepaidMemberToDelete, setPrepaidMemberToDelete] = useState(null);

  // --- LOAD LOYALTY / PREPAID DATA ON TAB SWITCH ---
  useEffect(() => {
    if (activeTab === 'loyalty' && !loyaltyLoaded) {
      loadLoyaltyMembers();
    } else if (activeTab === 'prepaid' && !prepaidLoaded) {
      loadPrepaidMembers();
    }
  }, [activeTab, loyaltyLoaded, prepaidLoaded]);

  const loadLoyaltyMembers = async () => {
    setLoyaltyLoading(true);
    try {
      const data = await getAllLoyaltyMembers();
      setLoyaltyMembers(data);
      setLoyaltyLoaded(true);
    } catch (err) {
      console.error(err);
      setError('Failed to load loyalty members.');
    } finally {
      setLoyaltyLoading(false);
    }
  };

  const loadPrepaidMembers = async () => {
    setPrepaidLoading(true);
    try {
      const data = await getAllPrepaidMembers();
      setPrepaidMembers(data);
      setPrepaidLoaded(true);
    } catch (err) {
      console.error(err);
      setError('Failed to load prepaid members.');
    } finally {
      setPrepaidLoading(false);
    }
  };

  // --- EXPORT HANDLER (per-tab) ---
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();

    if (activeTab === 'subscription') {
      const worksheet = workbook.addWorksheet('Subscription Members');
      worksheet.addRow(['ID', 'Name', 'Car', 'Active', 'Valid Payment', 'Notes']);
      filteredMembers.forEach((m) => {
        const row = worksheet.addRow([
          m.id, m.name, m.car,
          m.isActive ? 'Yes' : 'No',
          m.validPayment ? 'Yes' : 'No',
          m.notes,
        ]);
        if (!m.isActive) {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFAAAAAA' } };
          });
        } else if (!m.validPayment) {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } };
          });
        }
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'SubscriptionMembers.xlsx');

    } else if (activeTab === 'loyalty') {
      const worksheet = workbook.addWorksheet('Loyalty Members');
      worksheet.addRow(['ID', 'Name', 'Issue Date', 'Last Visit', 'Visit Count', 'Notes']);
      filteredLoyaltyMembers.forEach((m) => {
        worksheet.addRow([m.id, m.name, m.issueDate, m.lastVisitDate, m.visitCount, m.notes]);
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'LoyaltyMembers.xlsx');

    } else if (activeTab === 'prepaid') {
      const worksheet = workbook.addWorksheet('Prepaid Members');
      worksheet.addRow(['ID', 'Name', 'Type', 'Issue Date', 'Last Visit', 'Washes Remaining', 'Notes']);
      filteredPrepaidMembers.forEach((m) => {
        worksheet.addRow([m.id, m.name, m.type, m.issueDate, m.lastVisitDate, m.prepaidWashes, m.notes]);
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'PrepaidMembers.xlsx');
    }
  };

  // --- SUBSCRIPTION FILTER (existing) ---
  useEffect(() => {
    const term = (searchTerm || '').trim().toLowerCase();

    const filtered = (members || []).filter((m) => {
      const name = (m.name || '').toLowerCase();
      const id = (m.id || '').toString().toLowerCase();
      const subscription = (m.subscription || (m.id ? m.id[0] : '')).toUpperCase();
      const subscriptionId = (m.subscriptionId || m.subId || '').toString().toLowerCase();

      let matchesSearch =
        !term ||
        name.includes(term) ||
        id.includes(term) ||
        (subscription + id).replace(/\s+/g, '').includes(term) ||
        subscriptionId.includes(term);

      if (!matchesSearch) return false;
      if (filterSubscription !== 'all' && subscription !== filterSubscription) return false;

      const isActive = m.isActive === true || m.isActive === 'true';
      if (filterActive === 'active' && !isActive) return false;
      if (filterActive === 'inactive' && isActive) return false;

      const hasPayment = m.validPayment === true || m.validPayment === 'true';
      if (filterPayment === 'paid' && !hasPayment) return false;
      if (filterPayment === 'needed' && hasPayment) return false;

      return true;
    });

    setFilteredMembers(filtered);
  }, [searchTerm, members, filterSubscription, filterActive, filterPayment]);

  // --- LOYALTY FILTER ---
  useEffect(() => {
    const term = (loyaltySearchTerm || '').trim().toLowerCase();
    const filtered = loyaltyMembers.filter((m) => {
      const name = (m.name || '').toLowerCase();
      const id = (m.id || '').toString().toLowerCase();
      return !term || name.includes(term) || id.includes(term);
    });
    setFilteredLoyaltyMembers(filtered);
  }, [loyaltySearchTerm, loyaltyMembers]);

  // --- PREPAID FILTER ---
  useEffect(() => {
    const term = (prepaidSearchTerm || '').trim().toLowerCase();
    const filtered = prepaidMembers.filter((m) => {
      const name = (m.name || '').toLowerCase();
      const id = (m.id || '').toString().toLowerCase();
      const matchesSearch = !term || name.includes(term) || id.includes(term);
      const matchesType = filterPrepaidType === 'all' || m.type === filterPrepaidType;
      return matchesSearch && matchesType;
    });
    setFilteredPrepaidMembers(filtered);
  }, [prepaidSearchTerm, prepaidMembers, filterPrepaidType]);


  // =============================================
  //  SUBSCRIPTION HANDLERS (existing, unchanged)
  // =============================================
  const handleAddInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIdError('');

    const idPattern = /^[BDU]\d{3}$/;
    if (!idPattern.test(addForm.id.trim())) {
      setIdError("User ID must be in format B###, D###, or U###.");
      return;
    }
    if (!addForm.name.trim()) {
      setError("Name is required to create a member.");
      return;
    }

    try {
      await createMember(
        addForm.id.trim(),
        addForm.name.trim(),
        addForm.car.trim(),
        addForm.isActive,
        addForm.validPayment,
        addForm.notes.trim()
      );
      setAddForm({ id: '', name: '', car: '', isActive: true, validPayment: true, notes: '' });
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
      setError("Failed to create member. Please check the console for details.");
    }
  };

  const handleOpenEditModal = (member) => {
    setEditForm({
      id: member.id,
      name: member.name || '',
      car: member.car || '',
      isActive: !!member.isActive,
      validPayment: !!member.validPayment,
      notes: member.notes || '',
    });
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!editForm.id.trim() || !editForm.name.trim()) {
      setError('ID and Name are required.');
      return;
    }

    try {
      const updates = {
        name: editForm.name.trim(),
        car: editForm.car.trim(),
        isActive: editForm.isActive,
        validPayment: editForm.validPayment,
        notes: editForm.notes.trim(),
      };
      await updateMember(editForm.id, updates);
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
      setError('Failed to update member. Please check the console for details.');
    }
  };

  const handleOpenDeleteModal = (member) => {
    setMemberToDelete(member);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setError('');
    try {
      await deleteMember(memberToDelete.id);
      setShowDeleteModal(false);
      setMemberToDelete(null);
    } catch (err) {
      console.error(err);
      setError('Failed to delete member. Please check the console for details.');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setMemberToDelete(null);
  };


  // =============================================
  //  LOYALTY HANDLERS
  // =============================================
  const handleLoyaltyAddInputChange = (e) => {
    const { name, value } = e.target;
    setLoyaltyAddForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoyaltyAddSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIdError('');

    const idPattern = /^L\d{3,5}$/;
    if (!idPattern.test(loyaltyAddForm.id.trim())) {
      setIdError("Loyalty ID must be L followed by 3-5 digits (e.g. L101).");
      return;
    }
    if (!loyaltyAddForm.name.trim()) {
      setError("Name is required.");
      return;
    }

    try {
      await createLoyaltyMember(
        loyaltyAddForm.id.trim(),
        loyaltyAddForm.name.trim(),
        loyaltyAddForm.issueDate,
        loyaltyAddForm.lastVisitDate,
        Number(loyaltyAddForm.visitCount) || 0,
        loyaltyAddForm.notes.trim()
      );
      setLoyaltyMembers((prev) => [...prev, {
        id: loyaltyAddForm.id.trim(),
        name: loyaltyAddForm.name.trim(),
        issueDate: loyaltyAddForm.issueDate,
        lastVisitDate: loyaltyAddForm.lastVisitDate,
        visitCount: Number(loyaltyAddForm.visitCount) || 0,
        notes: loyaltyAddForm.notes.trim(),
      }]);
      setLoyaltyAddForm({ id: '', name: '', issueDate: '', lastVisitDate: '', visitCount: 0, notes: '' });
      setShowLoyaltyAddForm(false);
    } catch (err) {
      console.error(err);
      setError("Failed to create loyalty member.");
    }
  };

  const handleOpenLoyaltyEditModal = (member) => {
    setLoyaltyEditForm({
      id: member.id,
      name: member.name || '',
      issueDate: member.issueDate || '',
      lastVisitDate: member.lastVisitDate || '',
      visitCount: member.visitCount || 0,
      notes: member.notes || '',
    });
    setShowLoyaltyEditModal(true);
  };

  const handleLoyaltyEditInputChange = (e) => {
    const { name, value } = e.target;
    setLoyaltyEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoyaltyEditSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!loyaltyEditForm.name.trim()) {
      setError('Name is required.');
      return;
    }

    try {
      const updates = {
        name: loyaltyEditForm.name.trim(),
        issueDate: loyaltyEditForm.issueDate,
        lastVisitDate: loyaltyEditForm.lastVisitDate,
        visitCount: Number(loyaltyEditForm.visitCount) || 0,
        notes: loyaltyEditForm.notes.trim(),
      };
      await updateLoyaltyMember(loyaltyEditForm.id, updates);
      setLoyaltyMembers((prev) =>
        prev.map((m) => m.id === loyaltyEditForm.id ? { ...m, ...updates } : m)
      );
      setShowLoyaltyEditModal(false);
    } catch (err) {
      console.error(err);
      setError('Failed to update loyalty member.');
    }
  };

  const handleOpenLoyaltyDeleteModal = (member) => {
    setLoyaltyMemberToDelete(member);
    setShowLoyaltyDeleteModal(true);
  };

  const handleConfirmLoyaltyDelete = async () => {
    if (!loyaltyMemberToDelete) return;
    setError('');
    try {
      await deleteLoyaltyMember(loyaltyMemberToDelete.id);
      setLoyaltyMembers((prev) => prev.filter((m) => m.id !== loyaltyMemberToDelete.id));
      setShowLoyaltyDeleteModal(false);
      setLoyaltyMemberToDelete(null);
    } catch (err) {
      console.error(err);
      setError('Failed to delete loyalty member.');
    }
  };

  const handleCancelLoyaltyDelete = () => {
    setShowLoyaltyDeleteModal(false);
    setLoyaltyMemberToDelete(null);
  };


  // =============================================
  //  PREPAID HANDLERS
  // =============================================
  const handlePrepaidAddInputChange = (e) => {
    const { name, value } = e.target;
    setPrepaidAddForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePrepaidAddSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIdError('');

    const idPattern = /^P\d{3,5}$/;
    if (!idPattern.test(prepaidAddForm.id.trim())) {
      setIdError("Prepaid ID must be P followed by 3-5 digits (e.g. P101).");
      return;
    }
    if (!prepaidAddForm.name.trim()) {
      setError("Name is required.");
      return;
    }

    try {
      await createPrepaidMember(
        prepaidAddForm.id.trim(),
        prepaidAddForm.name.trim(),
        prepaidAddForm.type,
        prepaidAddForm.issueDate,
        prepaidAddForm.lastVisitDate,
        Number(prepaidAddForm.prepaidWashes) || 0,
        prepaidAddForm.notes.trim()
      );
      setPrepaidMembers((prev) => [...prev, {
        id: prepaidAddForm.id.trim(),
        name: prepaidAddForm.name.trim(),
        type: prepaidAddForm.type,
        issueDate: prepaidAddForm.issueDate,
        lastVisitDate: prepaidAddForm.lastVisitDate,
        prepaidWashes: Number(prepaidAddForm.prepaidWashes) || 0,
        notes: prepaidAddForm.notes.trim(),
      }]);
      setPrepaidAddForm({ id: '', name: '', type: 'B', issueDate: '', lastVisitDate: '', prepaidWashes: 0, notes: '' });
      setShowPrepaidAddForm(false);
    } catch (err) {
      console.error(err);
      setError("Failed to create prepaid member.");
    }
  };

  const handleOpenPrepaidEditModal = (member) => {
    setPrepaidEditForm({
      id: member.id,
      name: member.name || '',
      type: member.type || 'B',
      issueDate: member.issueDate || '',
      lastVisitDate: member.lastVisitDate || '',
      prepaidWashes: member.prepaidWashes || 0,
      notes: member.notes || '',
    });
    setShowPrepaidEditModal(true);
  };

  const handlePrepaidEditInputChange = (e) => {
    const { name, value } = e.target;
    setPrepaidEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePrepaidEditSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!prepaidEditForm.name.trim()) {
      setError('Name is required.');
      return;
    }

    try {
      const updates = {
        name: prepaidEditForm.name.trim(),
        type: prepaidEditForm.type,
        issueDate: prepaidEditForm.issueDate,
        lastVisitDate: prepaidEditForm.lastVisitDate,
        prepaidWashes: Number(prepaidEditForm.prepaidWashes) || 0,
        notes: prepaidEditForm.notes.trim(),
      };
      await updatePrepaidMember(prepaidEditForm.id, updates);
      setPrepaidMembers((prev) =>
        prev.map((m) => m.id === prepaidEditForm.id ? { ...m, ...updates } : m)
      );
      setShowPrepaidEditModal(false);
    } catch (err) {
      console.error(err);
      setError('Failed to update prepaid member.');
    }
  };

  const handleOpenPrepaidDeleteModal = (member) => {
    setPrepaidMemberToDelete(member);
    setShowPrepaidDeleteModal(true);
  };

  const handleConfirmPrepaidDelete = async () => {
    if (!prepaidMemberToDelete) return;
    setError('');
    try {
      await deletePrepaidMember(prepaidMemberToDelete.id);
      setPrepaidMembers((prev) => prev.filter((m) => m.id !== prepaidMemberToDelete.id));
      setShowPrepaidDeleteModal(false);
      setPrepaidMemberToDelete(null);
    } catch (err) {
      console.error(err);
      setError('Failed to delete prepaid member.');
    }
  };

  const handleCancelPrepaidDelete = () => {
    setShowPrepaidDeleteModal(false);
    setPrepaidMemberToDelete(null);
  };


  // --- Helper: "New Member" button label per tab ---
  const getShowAddForm = () => {
    if (activeTab === 'subscription') return showAddForm;
    if (activeTab === 'loyalty') return showLoyaltyAddForm;
    if (activeTab === 'prepaid') return showPrepaidAddForm;
    return false;
  };

  const toggleAddForm = () => {
    if (activeTab === 'subscription') setShowAddForm((prev) => !prev);
    else if (activeTab === 'loyalty') setShowLoyaltyAddForm((prev) => !prev);
    else if (activeTab === 'prepaid') setShowPrepaidAddForm((prev) => !prev);
  };

  // --- Helper: prepaid washes badge color ---
  const getWashesBadgeVariant = (count) => {
    const n = Number(count) || 0;
    if (n === 0) return 'danger';
    if (n <= 2) return 'warning';
    return 'success';
  };

  return (
    <div className="customer-list-page-container">
      <HamburgerMenu />
      <Container fluid className="page-wrap">
        {/* Header + controls */}
        <div className="header-section py-3">

          {/* --- ROW 1: HEADER (Title & Global Actions) --- */}
          <div className="page-header-row">
            <h1 className="page-title">Customer List</h1>
            <div className="header-actions">
              <Button
                variant="outline-secondary"
                onClick={handleExportExcel}
              >
                Export
              </Button>
              <Button
                variant="primary"
                className="fw-bold"
                onClick={toggleAddForm}
              >
                {getShowAddForm() ? 'Close' : '+ New Member'}
              </Button>
            </div>
          </div>

          {/* --- TAB BUTTONS --- */}
          <Stack direction="horizontal" gap={2} className="mb-3 tab-row">
            <Button
              variant={activeTab === 'subscription' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('subscription')}
            >
              Subscription
            </Button>
            <Button
              variant={activeTab === 'loyalty' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('loyalty')}
            >
              Loyalty
            </Button>
            <Button
              variant={activeTab === 'prepaid' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('prepaid')}
            >
              Prepaid
            </Button>
          </Stack>

          {/* Error Alert */}
          {error && (
            <Row className="mb-3 px-4">
              <Col><Alert variant="danger">{error}</Alert></Col>
            </Row>
          )}

          {/* ============================================= */}
          {/*  SUBSCRIPTION TAB                             */}
          {/* ============================================= */}
          {activeTab === 'subscription' && (
            <>
              {/* Toolbar */}
              <div className="toolbar-wrapper">
                <InputGroup className="search-input-group">
                  <InputGroup.Text className="bg-white border-end-0 text-muted">
                    <FontAwesomeIcon icon={faSearch} />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search by Name or ID"
                    className="border-start-0 ps-0"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>

                <Form.Select
                  className="filter-select"
                  value={filterSubscription}
                  onChange={(e) => setFilterSubscription(e.target.value)}
                  style={{ width: 'auto', minWidth: '130px' }}
                >
                  <option value="all">Level: All</option>
                  <option value="B">Basic</option>
                  <option value="D">Deluxe</option>
                  <option value="U">Ultimate</option>
                </Form.Select>

                <Form.Select
                  className="filter-select"
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value)}
                  style={{ width: 'auto', minWidth: '130px' }}
                >
                  <option value="all">Status: All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Form.Select>

                <Form.Select
                  className="filter-select"
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value)}
                  style={{ width: 'auto', minWidth: '145px' }}
                >
                  <option value="all">Payment: All</option>
                  <option value="paid">Paid</option>
                  <option value="needed">Needed</option>
                </Form.Select>
              </div>

              {/* Add Member Form */}
              {showAddForm && (
                <Row className="mt-3 mb-3 px-4">
                  <Col>
                    <Card className="add-member-card">
                      <Card.Body className="p-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <Card.Title className="mb-0 fw-bold">Add New Subscription Member</Card.Title>
                          <Button variant="close" onClick={() => setShowAddForm(false)} />
                        </div>
                        <Form onSubmit={handleAddSubmit}>
                          <Row className="mb-3">
                            <Col md={4}>
                              <Form.Group controlId="addId">
                                <Form.Label>ID <span className="text-danger">*</span></Form.Label>
                                <Form.Control type="text" name="id" value={addForm.id} onChange={handleAddInputChange} placeholder="e.g. B101" required isInvalid={!!idError} />
                                <Form.Control.Feedback type="invalid">{idError}</Form.Control.Feedback>
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group controlId="addName">
                                <Form.Label>Name <span className="text-danger">*</span></Form.Label>
                                <Form.Control type="text" name="name" value={addForm.name} onChange={handleAddInputChange} required />
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group controlId="addCar">
                                <Form.Label>Vehicle</Form.Label>
                                <Form.Control type="text" name="car" value={addForm.car} onChange={handleAddInputChange} />
                              </Form.Group>
                            </Col>
                          </Row>
                          <Row className="mb-3">
                            <Col md={3}>
                              <Form.Group controlId="addIsActive" className="pt-4">
                                <Form.Check type="checkbox" label="Active" name="isActive" checked={addForm.isActive} onChange={handleAddInputChange} />
                              </Form.Group>
                            </Col>
                            <Col md={3}>
                              <Form.Group controlId="addValidPayment" className="pt-4">
                                <Form.Check type="checkbox" label="Valid Payment" name="validPayment" checked={addForm.validPayment} onChange={handleAddInputChange} />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group controlId="addNotes">
                                <Form.Label>Notes</Form.Label>
                                <Form.Control as="textarea" rows={1} name="notes" value={addForm.notes} onChange={handleAddInputChange} />
                              </Form.Group>
                            </Col>
                          </Row>
                          <div className="text-end">
                            <Button type="submit" variant="success" className="fw-bold">
                              Create Member
                            </Button>
                          </div>
                        </Form>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}
            </>
          )}

          {/* ============================================= */}
          {/*  LOYALTY TAB                                  */}
          {/* ============================================= */}
          {activeTab === 'loyalty' && (
            <>
              {/* Toolbar */}
              <div className="toolbar-wrapper">
                <InputGroup className="search-input-group">
                  <InputGroup.Text className="bg-white border-end-0 text-muted">
                    <FontAwesomeIcon icon={faSearch} />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search by Name or ID"
                    className="border-start-0 ps-0"
                    value={loyaltySearchTerm}
                    onChange={(e) => setLoyaltySearchTerm(e.target.value)}
                  />
                </InputGroup>
              </div>

              {/* Add Loyalty Form */}
              {showLoyaltyAddForm && (
                <Row className="mt-3 mb-3 px-4">
                  <Col>
                    <Card className="add-member-card">
                      <Card.Body className="p-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <Card.Title className="mb-0 fw-bold">Add New Loyalty Member</Card.Title>
                          <Button variant="close" onClick={() => setShowLoyaltyAddForm(false)} />
                        </div>
                        <Form onSubmit={handleLoyaltyAddSubmit}>
                          <Row className="mb-3">
                            <Col md={4}>
                              <Form.Group controlId="loyaltyAddId">
                                <Form.Label>ID <span className="text-danger">*</span></Form.Label>
                                <Form.Control type="text" name="id" value={loyaltyAddForm.id} onChange={handleLoyaltyAddInputChange} placeholder="e.g. L101" required isInvalid={!!idError} />
                                <Form.Control.Feedback type="invalid">{idError}</Form.Control.Feedback>
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group controlId="loyaltyAddName">
                                <Form.Label>Name <span className="text-danger">*</span></Form.Label>
                                <Form.Control type="text" name="name" value={loyaltyAddForm.name} onChange={handleLoyaltyAddInputChange} required />
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group controlId="loyaltyAddVisitCount">
                                <Form.Label>Visit Count</Form.Label>
                                <Form.Control type="number" name="visitCount" value={loyaltyAddForm.visitCount} onChange={handleLoyaltyAddInputChange} min="0" />
                              </Form.Group>
                            </Col>
                          </Row>
                          <Row className="mb-3">
                            <Col md={4}>
                              <Form.Group controlId="loyaltyAddIssueDate">
                                <Form.Label>Issue Date</Form.Label>
                                <Form.Control type="date" name="issueDate" value={loyaltyAddForm.issueDate} onChange={handleLoyaltyAddInputChange} />
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group controlId="loyaltyAddLastVisit">
                                <Form.Label>Last Visit Date</Form.Label>
                                <Form.Control type="date" name="lastVisitDate" value={loyaltyAddForm.lastVisitDate} onChange={handleLoyaltyAddInputChange} />
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group controlId="loyaltyAddNotes">
                                <Form.Label>Notes</Form.Label>
                                <Form.Control as="textarea" rows={1} name="notes" value={loyaltyAddForm.notes} onChange={handleLoyaltyAddInputChange} />
                              </Form.Group>
                            </Col>
                          </Row>
                          <div className="text-end">
                            <Button type="submit" variant="success" className="fw-bold">
                              Create Member
                            </Button>
                          </div>
                        </Form>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}
            </>
          )}

          {/* ============================================= */}
          {/*  PREPAID TAB                                  */}
          {/* ============================================= */}
          {activeTab === 'prepaid' && (
            <>
              {/* Toolbar */}
              <div className="toolbar-wrapper">
                <InputGroup className="search-input-group">
                  <InputGroup.Text className="bg-white border-end-0 text-muted">
                    <FontAwesomeIcon icon={faSearch} />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search by Name or ID"
                    className="border-start-0 ps-0"
                    value={prepaidSearchTerm}
                    onChange={(e) => setPrepaidSearchTerm(e.target.value)}
                  />
                </InputGroup>

                <Form.Select
                  className="filter-select"
                  value={filterPrepaidType}
                  onChange={(e) => setFilterPrepaidType(e.target.value)}
                  style={{ width: 'auto', minWidth: '130px' }}
                >
                  <option value="all">Type: All</option>
                  <option value="B">Basic</option>
                  <option value="D">Deluxe</option>
                  <option value="U">Ultimate</option>
                </Form.Select>
              </div>

              {/* Add Prepaid Form */}
              {showPrepaidAddForm && (
                <Row className="mt-3 mb-3 px-4">
                  <Col>
                    <Card className="add-member-card">
                      <Card.Body className="p-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <Card.Title className="mb-0 fw-bold">Add New Prepaid Member</Card.Title>
                          <Button variant="close" onClick={() => setShowPrepaidAddForm(false)} />
                        </div>
                        <Form onSubmit={handlePrepaidAddSubmit}>
                          <Row className="mb-3">
                            <Col md={3}>
                              <Form.Group controlId="prepaidAddId">
                                <Form.Label>ID <span className="text-danger">*</span></Form.Label>
                                <Form.Control type="text" name="id" value={prepaidAddForm.id} onChange={handlePrepaidAddInputChange} placeholder="e.g. P101" required isInvalid={!!idError} />
                                <Form.Control.Feedback type="invalid">{idError}</Form.Control.Feedback>
                              </Form.Group>
                            </Col>
                            <Col md={3}>
                              <Form.Group controlId="prepaidAddName">
                                <Form.Label>Name <span className="text-danger">*</span></Form.Label>
                                <Form.Control type="text" name="name" value={prepaidAddForm.name} onChange={handlePrepaidAddInputChange} required />
                              </Form.Group>
                            </Col>
                            <Col md={3}>
                              <Form.Group controlId="prepaidAddType">
                                <Form.Label>Type</Form.Label>
                                <Form.Select name="type" value={prepaidAddForm.type} onChange={handlePrepaidAddInputChange}>
                                  <option value="B">Basic</option>
                                  <option value="D">Deluxe</option>
                                  <option value="U">Ultimate</option>
                                </Form.Select>
                              </Form.Group>
                            </Col>
                            <Col md={3}>
                              <Form.Group controlId="prepaidAddWashes">
                                <Form.Label>Prepaid Washes</Form.Label>
                                <Form.Control type="number" name="prepaidWashes" value={prepaidAddForm.prepaidWashes} onChange={handlePrepaidAddInputChange} min="0" />
                              </Form.Group>
                            </Col>
                          </Row>
                          <Row className="mb-3">
                            <Col md={4}>
                              <Form.Group controlId="prepaidAddIssueDate">
                                <Form.Label>Issue Date</Form.Label>
                                <Form.Control type="date" name="issueDate" value={prepaidAddForm.issueDate} onChange={handlePrepaidAddInputChange} />
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group controlId="prepaidAddLastVisit">
                                <Form.Label>Last Visit Date</Form.Label>
                                <Form.Control type="date" name="lastVisitDate" value={prepaidAddForm.lastVisitDate} onChange={handlePrepaidAddInputChange} />
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group controlId="prepaidAddNotes">
                                <Form.Label>Notes</Form.Label>
                                <Form.Control as="textarea" rows={1} name="notes" value={prepaidAddForm.notes} onChange={handlePrepaidAddInputChange} />
                              </Form.Group>
                            </Col>
                          </Row>
                          <div className="text-end">
                            <Button type="submit" variant="success" className="fw-bold">
                              Create Member
                            </Button>
                          </div>
                        </Form>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}
            </>
          )}
        </div>

        {/* ============================================= */}
        {/*  TABLE SECTION (per-tab)                      */}
        {/* ============================================= */}

        {/* --- SUBSCRIPTION TABLE --- */}
        {activeTab === 'subscription' && (
          <Row className="table-section g-0">
            <Col className="d-flex flex-column h-100">
              <div className="border rounded table-scroll">
                {isLoading ? (
                  <div className="d-flex justify-content-center align-items-center h-100">
                    <Spinner animation="border" role="status" className="me-2" />
                    <span>Loading members...</span>
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="p-3 text-center text-muted">No members found.</div>
                ) : (
                  <Table hover size="sm" className="mb-0 w-100">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '10%' }}>ID</th>
                        <th style={{ width: '20%' }}>Member</th>
                        <th style={{ width: '15%' }}>Vehicle</th>
                        <th className="text-center" style={{ width: '10%' }}>Status</th>
                        <th className="text-center" style={{ width: '10%' }}>Payment</th>
                        <th style={{ width: '18%' }}>Notes</th>
                        <th className="text-end" style={{ width: '17%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((member) => {
                        const isActive =
                          member.isActive === true ||
                          member.isActive === 'true' ||
                          member.isActive === 1 ||
                          member.isActive === '1';

                        const validPayment =
                          member.validPayment === true ||
                          member.validPayment === 'true' ||
                          member.validPayment === 1 ||
                          member.validPayment === '1';

                        return (
                          <tr key={member.id}>
                            <td title={member.id}>{member.id}</td>
                            <td className="cell-truncate" title={member.name}>{member.name}</td>
                            <td className="cell-truncate" title={member.car}>{member.car}</td>
                            <td className="text-center">
                              {isActive
                                ? <span className="badge bg-success">Active</span>
                                : <span className="badge bg-secondary">Inactive</span>
                              }
                            </td>
                            <td className="text-center">
                              {validPayment
                                ? <span className="badge bg-success">Paid</span>
                                : <span className="badge bg-warning">Needed</span>
                              }
                            </td>
                            <td className="cell-truncate" title={member.notes}>{member.notes}</td>
                            <td className="text-end">
                              <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleOpenEditModal(member)}>
                                Edit
                              </Button>
                              <Button variant="outline-danger" size="sm" onClick={() => handleOpenDeleteModal(member)}>
                                Delete
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                )}
              </div>
            </Col>
          </Row>
        )}

        {/* --- LOYALTY TABLE --- */}
        {activeTab === 'loyalty' && (
          <Row className="table-section g-0">
            <Col className="d-flex flex-column h-100">
              <div className="border rounded table-scroll">
                {loyaltyLoading ? (
                  <div className="d-flex justify-content-center align-items-center h-100">
                    <Spinner animation="border" role="status" className="me-2" />
                    <span>Loading loyalty members...</span>
                  </div>
                ) : filteredLoyaltyMembers.length === 0 ? (
                  <div className="p-3 text-center text-muted">No loyalty members found.</div>
                ) : (
                  <Table hover size="sm" className="mb-0 w-100">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '10%' }}>ID</th>
                        <th style={{ width: '20%' }}>Name</th>
                        <th style={{ width: '14%' }}>Issue Date</th>
                        <th style={{ width: '14%' }}>Last Visit</th>
                        <th className="text-center" style={{ width: '10%' }}>Visit Count</th>
                        <th style={{ width: '18%' }}>Notes</th>
                        <th className="text-end" style={{ width: '14%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLoyaltyMembers.map((member) => (
                        <tr key={member.id}>
                          <td title={member.id}>{member.id}</td>
                          <td className="cell-truncate" title={member.name}>{member.name}</td>
                          <td>{member.issueDate}</td>
                          <td>{member.lastVisitDate}</td>
                          <td className="text-center">{member.visitCount}</td>
                          <td className="cell-truncate" title={member.notes}>{member.notes}</td>
                          <td className="text-end">
                            <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleOpenLoyaltyEditModal(member)}>
                              Edit
                            </Button>
                            <Button variant="outline-danger" size="sm" onClick={() => handleOpenLoyaltyDeleteModal(member)}>
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            </Col>
          </Row>
        )}

        {/* --- PREPAID TABLE --- */}
        {activeTab === 'prepaid' && (
          <Row className="table-section g-0">
            <Col className="d-flex flex-column h-100">
              <div className="border rounded table-scroll">
                {prepaidLoading ? (
                  <div className="d-flex justify-content-center align-items-center h-100">
                    <Spinner animation="border" role="status" className="me-2" />
                    <span>Loading prepaid members...</span>
                  </div>
                ) : filteredPrepaidMembers.length === 0 ? (
                  <div className="p-3 text-center text-muted">No prepaid members found.</div>
                ) : (
                  <Table hover size="sm" className="mb-0 w-100">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '8%' }}>ID</th>
                        <th style={{ width: '18%' }}>Name</th>
                        <th className="text-center" style={{ width: '8%' }}>Type</th>
                        <th style={{ width: '12%' }}>Issue Date</th>
                        <th style={{ width: '12%' }}>Last Visit</th>
                        <th className="text-center" style={{ width: '12%' }}>Washes Remaining</th>
                        <th style={{ width: '16%' }}>Notes</th>
                        <th className="text-end" style={{ width: '14%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPrepaidMembers.map((member) => (
                        <tr key={member.id}>
                          <td title={member.id}>{member.id}</td>
                          <td className="cell-truncate" title={member.name}>{member.name}</td>
                          <td className="text-center">{member.type}</td>
                          <td>{member.issueDate}</td>
                          <td>{member.lastVisitDate}</td>
                          <td className="text-center">
                            <Badge bg={getWashesBadgeVariant(member.prepaidWashes)}>
                              {member.prepaidWashes}
                            </Badge>
                          </td>
                          <td className="cell-truncate" title={member.notes}>{member.notes}</td>
                          <td className="text-end">
                            <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleOpenPrepaidEditModal(member)}>
                              Edit
                            </Button>
                            <Button variant="outline-danger" size="sm" onClick={() => handleOpenPrepaidDeleteModal(member)}>
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            </Col>
          </Row>
        )}

        {/* ============================================= */}
        {/*  MODALS                                       */}
        {/* ============================================= */}

        {/* --- Subscription Edit Modal --- */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Edit Member</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleEditSubmit}>
            <Modal.Body>
              <Form.Group className="mb-3" controlId="editId">
                <Form.Label>User ID (read-only)</Form.Label>
                <Form.Control type="text" value={editForm.id} disabled />
              </Form.Group>
              <Form.Group className="mb-3" controlId="editName">
                <Form.Label>Name</Form.Label>
                <Form.Control type="text" name="name" value={editForm.name} onChange={handleEditInputChange} required />
              </Form.Group>
              <Form.Group className="mb-3" controlId="editCar">
                <Form.Label>Car</Form.Label>
                <Form.Control type="text" name="car" value={editForm.car} onChange={handleEditInputChange} />
              </Form.Group>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group controlId="editIsActive">
                    <Form.Check type="checkbox" label="Active" name="isActive" checked={editForm.isActive} onChange={handleEditInputChange} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="editValidPayment">
                    <Form.Check type="checkbox" label="Valid Payment" name="validPayment" checked={editForm.validPayment} onChange={handleEditInputChange} />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3" controlId="editNotes">
                <Form.Label>Notes</Form.Label>
                <Form.Control as="textarea" rows={3} name="notes" value={editForm.notes} onChange={handleEditInputChange} />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Save Changes</Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* --- Subscription Delete Modal --- */}
        <Modal show={showDeleteModal} onHide={handleCancelDelete} centered>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Delete</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {memberToDelete ? (
              <>
                Are you sure you want to delete member{' '}
                <strong>{memberToDelete.name}</strong> (ID: {memberToDelete.id})?
                This action cannot be undone.
              </>
            ) : (
              'Are you sure you want to delete this member?'
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCancelDelete}>Cancel</Button>
            <Button variant="danger" onClick={handleConfirmDelete}>Delete</Button>
          </Modal.Footer>
        </Modal>

        {/* --- Loyalty Edit Modal --- */}
        <Modal show={showLoyaltyEditModal} onHide={() => setShowLoyaltyEditModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Edit Loyalty Member</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleLoyaltyEditSubmit}>
            <Modal.Body>
              <Form.Group className="mb-3" controlId="loyaltyEditId">
                <Form.Label>ID (read-only)</Form.Label>
                <Form.Control type="text" value={loyaltyEditForm.id} disabled />
              </Form.Group>
              <Form.Group className="mb-3" controlId="loyaltyEditName">
                <Form.Label>Name</Form.Label>
                <Form.Control type="text" name="name" value={loyaltyEditForm.name} onChange={handleLoyaltyEditInputChange} required />
              </Form.Group>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group controlId="loyaltyEditIssueDate">
                    <Form.Label>Issue Date</Form.Label>
                    <Form.Control type="date" name="issueDate" value={loyaltyEditForm.issueDate} onChange={handleLoyaltyEditInputChange} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="loyaltyEditLastVisit">
                    <Form.Label>Last Visit Date</Form.Label>
                    <Form.Control type="date" name="lastVisitDate" value={loyaltyEditForm.lastVisitDate} onChange={handleLoyaltyEditInputChange} />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3" controlId="loyaltyEditVisitCount">
                <Form.Label>Visit Count</Form.Label>
                <Form.Control type="number" name="visitCount" value={loyaltyEditForm.visitCount} onChange={handleLoyaltyEditInputChange} min="0" />
              </Form.Group>
              <Form.Group className="mb-3" controlId="loyaltyEditNotes">
                <Form.Label>Notes</Form.Label>
                <Form.Control as="textarea" rows={3} name="notes" value={loyaltyEditForm.notes} onChange={handleLoyaltyEditInputChange} />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowLoyaltyEditModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Save Changes</Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* --- Loyalty Delete Modal --- */}
        <Modal show={showLoyaltyDeleteModal} onHide={handleCancelLoyaltyDelete} centered>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Delete</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {loyaltyMemberToDelete ? (
              <>
                Are you sure you want to delete loyalty member{' '}
                <strong>{loyaltyMemberToDelete.name}</strong> (ID: {loyaltyMemberToDelete.id})?
                This action cannot be undone.
              </>
            ) : (
              'Are you sure you want to delete this member?'
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCancelLoyaltyDelete}>Cancel</Button>
            <Button variant="danger" onClick={handleConfirmLoyaltyDelete}>Delete</Button>
          </Modal.Footer>
        </Modal>

        {/* --- Prepaid Edit Modal --- */}
        <Modal show={showPrepaidEditModal} onHide={() => setShowPrepaidEditModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Edit Prepaid Member</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handlePrepaidEditSubmit}>
            <Modal.Body>
              <Form.Group className="mb-3" controlId="prepaidEditId">
                <Form.Label>ID (read-only)</Form.Label>
                <Form.Control type="text" value={prepaidEditForm.id} disabled />
              </Form.Group>
              <Form.Group className="mb-3" controlId="prepaidEditName">
                <Form.Label>Name</Form.Label>
                <Form.Control type="text" name="name" value={prepaidEditForm.name} onChange={handlePrepaidEditInputChange} required />
              </Form.Group>
              <Form.Group className="mb-3" controlId="prepaidEditType">
                <Form.Label>Type</Form.Label>
                <Form.Select name="type" value={prepaidEditForm.type} onChange={handlePrepaidEditInputChange}>
                  <option value="B">Basic</option>
                  <option value="D">Deluxe</option>
                  <option value="U">Ultimate</option>
                </Form.Select>
              </Form.Group>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group controlId="prepaidEditIssueDate">
                    <Form.Label>Issue Date</Form.Label>
                    <Form.Control type="date" name="issueDate" value={prepaidEditForm.issueDate} onChange={handlePrepaidEditInputChange} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="prepaidEditLastVisit">
                    <Form.Label>Last Visit Date</Form.Label>
                    <Form.Control type="date" name="lastVisitDate" value={prepaidEditForm.lastVisitDate} onChange={handlePrepaidEditInputChange} />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3" controlId="prepaidEditWashes">
                <Form.Label>Prepaid Washes</Form.Label>
                <Form.Control type="number" name="prepaidWashes" value={prepaidEditForm.prepaidWashes} onChange={handlePrepaidEditInputChange} min="0" />
              </Form.Group>
              <Form.Group className="mb-3" controlId="prepaidEditNotes">
                <Form.Label>Notes</Form.Label>
                <Form.Control as="textarea" rows={3} name="notes" value={prepaidEditForm.notes} onChange={handlePrepaidEditInputChange} />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowPrepaidEditModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Save Changes</Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* --- Prepaid Delete Modal --- */}
        <Modal show={showPrepaidDeleteModal} onHide={handleCancelPrepaidDelete} centered>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Delete</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {prepaidMemberToDelete ? (
              <>
                Are you sure you want to delete prepaid member{' '}
                <strong>{prepaidMemberToDelete.name}</strong> (ID: {prepaidMemberToDelete.id})?
                This action cannot be undone.
              </>
            ) : (
              'Are you sure you want to delete this member?'
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCancelPrepaidDelete}>Cancel</Button>
            <Button variant="danger" onClick={handleConfirmPrepaidDelete}>Delete</Button>
          </Modal.Footer>
        </Modal>

      </Container>
    </div>
  );
}

export default MembersPage;
