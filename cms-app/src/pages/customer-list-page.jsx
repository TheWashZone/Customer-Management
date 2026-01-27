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
} from 'react-bootstrap';

import { useMembers } from '../context/MembersContext';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import HamburgerMenu from '../components/HamburgerMenu';

function MembersPage() {
  const { members, isLoading, createMember, updateMember, deleteMember } = useMembers();

  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [idError, setIdError] = useState('');

  // Add Member form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    id: '',
    name: '',
    car: '',
    isActive: true,
    validPayment: true,
    notes: '',
  });

  // Edit Member modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    car: '',
    isActive: true,
    validPayment: true,
    notes: '',
  });

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  const [filterSubscription, setFilterSubscription] = useState('all');
  const [filterActive, setFilterActive] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');

  const handleExportExcel = async (members) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Members');

    // Add header row
    worksheet.addRow(['ID', 'Name', 'Car', 'Active', 'Valid Payment', 'Notes']);

    // Add data rows
    members.forEach((m) => {
      const row = worksheet.addRow([
        m.id,
        m.name,
        m.car,
        m.isActive ? 'Yes' : 'No',
        m.validPayment ? 'Yes' : 'No',
        m.notes,
      ]);

      // Apply row color based on status
      if (!m.isActive) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFAAAAAA' }, // gray
          };
        });
      } else if (!m.validPayment) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFF99' }, // yellow
          };
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'CustomerList.xlsx');
  };


  // Filter members whenever searchTerm or members changes
  useEffect(() => {
    const term = (searchTerm || '').trim().toLowerCase();

    const filtered = (members || []).filter((m) => {
      // --- Search Term Filtering ---
      const name = (m.name || '').toLowerCase();
      const id = (m.id || '').toString().toLowerCase();

      // Determine subscription level
      const subscription = (m.subscription || (m.id ? m.id[0] : '')).toUpperCase();
      const subscriptionId = (m.subscriptionId || m.subId || '').toString().toLowerCase();

      let matchesSearch =
        !term ||
        name.includes(term) ||
        id.includes(term) ||
        (subscription + id).replace(/\s+/g, '').includes(term) ||
        subscriptionId.includes(term);

      if (!matchesSearch) return false;

      // --- Subscription Filter ---
      if (filterSubscription !== 'all' && subscription !== filterSubscription) return false;

      // --- Active Filter ---
      const isActive = m.isActive === true || m.isActive === 'true';
      if (filterActive === 'active' && !isActive) return false;
      if (filterActive === 'inactive' && isActive) return false;

      // --- Payment Filter ---
      const hasPayment = m.validPayment === true || m.validPayment === 'true';
      if (filterPayment === 'paid' && !hasPayment) return false;
      if (filterPayment === 'needed' && hasPayment) return false;

      return true;
    });

    setFilteredMembers(filtered);
  }, [searchTerm, members, filterSubscription, filterActive, filterPayment]);


  // --- ADD MEMBER HANDLERS ---
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

    const idPattern = /^[BDU]\d{3}$/; // B/D/U followed by 3 digits

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

  // --- EDIT MEMBER HANDLERS ---
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

  // --- DELETE MEMBER HANDLERS ---
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

  return (
    <div className="customer-list-page-container">
      <HamburgerMenu />
      <Container fluid className="page-wrap">
        {/* Header + controls */}
        <div className="header-section py-3">
          
          {/* --- ROW 1: HEADER (Title & Global Actions) --- */}
          <div className="page-header-row">
            {/* Title */}
            <h1 className="page-title">Customer List</h1>

            {/* Actions (Moved Up!) */}
            <div className="header-actions">
              <Button
                variant="outline-secondary"
                onClick={() => handleExportExcel(filteredMembers)}
              >
                Export
              </Button>
              <Button
                variant="primary"
                className="fw-bold" // Bold text for emphasis
                onClick={() => setShowAddForm((prev) => !prev)}
              >
                {showAddForm ? 'Close' : '+ New Member'}
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Row className="mb-3 px-4">
              <Col><Alert variant="danger">{error}</Alert></Col>
            </Row>
          )}

          {/* --- ROW 2: TOOLBAR (Search & Filters) --- */}
          <div className="toolbar-wrapper">
            
            {/* Search - Takes up available space */}
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

            {/* Filter: Level */}
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

            {/* Filter: Status */}
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

            {/* Filter: Payment */}
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
            <Row className="mt-3 mb-3 px-4"> {/* Added px-4 to align with your content padding */}
              <Col>
                {/* UPDATED CARD CLASS HERE */}
                <Card className="add-member-card">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <Card.Title className="mb-0 fw-bold">Add New Member</Card.Title>
                      <Button variant="close" onClick={() => setShowAddForm(false)} />
                    </div>
                    
                    <Form onSubmit={handleAddSubmit}>
                      {/* ... (Keep your existing form fields exactly as they are) ... */}
                      
                      {/* Example of your existing fields for context: */}
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
        </div>

        {/* Scrollable table section */}
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
                          {/* Truncate with Tooltip for ID, Name, Car, Notes */}
                          <td title={member.id}>
                            {member.id}
                          </td>
                          <td className="cell-truncate" title={member.name}>
                            {member.name}
                          </td>
                          <td className="cell-truncate" title={member.car}>
                            {member.car}
                          </td>

                          {/* Standard Boolean Columns */}
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

                          <td className="cell-truncate" title={member.notes}>
                            {member.notes}
                          </td>

                          <td className="text-end">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => handleOpenEditModal(member)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleOpenDeleteModal(member)}
                            >
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

        {/* --- MODALS (Restored) --- */}
        
        {/* Edit Member Modal */}
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
                <Form.Control
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditInputChange}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="editCar">
                <Form.Label>Car</Form.Label>
                <Form.Control
                  type="text"
                  name="car"
                  value={editForm.car}
                  onChange={handleEditInputChange}
                />
              </Form.Group>

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group controlId="editIsActive">
                    <Form.Check
                      type="checkbox"
                      label="Active"
                      name="isActive"
                      checked={editForm.isActive}
                      onChange={handleEditInputChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="editValidPayment">
                    <Form.Check
                      type="checkbox"
                      label="Valid Payment"
                      name="validPayment"
                      checked={editForm.validPayment}
                      onChange={handleEditInputChange}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3" controlId="editNotes">
                <Form.Label>Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="notes"
                  value={editForm.notes}
                  onChange={handleEditInputChange}
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Save Changes
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Delete Confirmation Modal */}
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
            <Button variant="secondary" onClick={handleCancelDelete}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </Modal.Footer>
        </Modal>

      </Container>
    </div>
  );
}

export default MembersPage;