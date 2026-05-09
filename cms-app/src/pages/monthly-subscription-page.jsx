import React, { useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router';
import { createMember } from '../api/firebase-crud';
import HamburgerMenu from '../components/HamburgerMenu';
import '../css/monthly-subscription-page.css';

function MonthlySubscriptionPage() {
  const [form, setForm] = useState({
    date: '',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleColor: '',
    name: '',
    contactPerson: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    plan: '',
    passNumber: '',
    authorized: false,
    printName: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.phone.trim()) newErrors.phone = 'Phone is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Email is invalid';
    if (!form.vehicleMake.trim()) newErrors.vehicleMake = 'Vehicle make is required';
    if (!form.vehicleModel.trim()) newErrors.vehicleModel = 'Vehicle model is required';
    if (!form.plan) newErrors.plan = 'Please select a plan';
    if (!form.authorized) newErrors.authorized = 'Authorization is required';
    if (!form.printName.trim()) newErrors.printName = 'Print name is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formErrors = validate();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      const id = crypto.randomUUID();
      const car = [
        form.vehicleYear.trim(),
        form.vehicleMake.trim(),
        form.vehicleModel.trim(),
        form.vehicleColor.trim() ? `(${form.vehicleColor.trim()})` : '',
      ]
        .filter(Boolean)
        .join(' ');
      const address = [form.streetAddress.trim(), form.city.trim(), form.state.trim(), form.zipCode.trim()]
        .filter(Boolean)
        .join(', ');
      const notes = [
        `Plan: ${form.plan}`,
        `Phone: ${form.phone.trim()}`,
        address ? `Address: ${address}` : '',
        form.contactPerson.trim() ? `Contact: ${form.contactPerson.trim()}` : '',
        form.passNumber.trim() ? `Pass #: ${form.passNumber.trim()}` : '',
        'Pending payment',
      ]
        .filter(Boolean)
        .join(' | ');

      await createMember(id, form.name.trim(), car, false, false, notes, form.email.trim());

      const cloverUrl = import.meta.env.VITE_CLOVER_PAYMENT_URL;
      if (cloverUrl) {
        window.location.href = cloverUrl;
      } else {
        navigate('/');
      }
    } catch {
      setErrors({ general: 'Failed to save. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="subscription-wrapper">
      <HamburgerMenu />
      <div className="subscription-form-container">
        <h2 className="subscription-title">Monthly Pass Registration Form</h2>

        <Form onSubmit={handleSubmit} className="subscription-form">
          {errors.general && (
            <div className="alert alert-danger" role="alert">
              {errors.general}
            </div>
          )}

          {/* Date + Vehicle */}
          <Row className="mb-3">
            <Col md={3}>
              <Form.Group controlId="date">
                <Form.Label>Date</Form.Label>
                <Form.Control
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col md={9}>
              <Form.Label>Vehicle (year, make, model, color)</Form.Label>
              <Row>
                <Col md={3}>
                  <Form.Control
                    type="text"
                    name="vehicleYear"
                    placeholder="Year"
                    value={form.vehicleYear}
                    onChange={handleChange}
                  />
                </Col>
                <Col md={3}>
                  <Form.Control
                    type="text"
                    name="vehicleMake"
                    placeholder="Make"
                    value={form.vehicleMake}
                    onChange={handleChange}
                    isInvalid={!!errors.vehicleMake}
                  />
                  <Form.Control.Feedback type="invalid">{errors.vehicleMake}</Form.Control.Feedback>
                </Col>
                <Col md={3}>
                  <Form.Control
                    type="text"
                    name="vehicleModel"
                    placeholder="Model"
                    value={form.vehicleModel}
                    onChange={handleChange}
                    isInvalid={!!errors.vehicleModel}
                  />
                  <Form.Control.Feedback type="invalid">{errors.vehicleModel}</Form.Control.Feedback>
                </Col>
                <Col md={3}>
                  <Form.Control
                    type="text"
                    name="vehicleColor"
                    placeholder="Color"
                    value={form.vehicleColor}
                    onChange={handleChange}
                  />
                </Col>
              </Row>
            </Col>
          </Row>

          {/* Name + Contact */}
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group controlId="name">
                <Form.Label>Name</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  placeholder="Full name"
                  value={form.name}
                  onChange={handleChange}
                  isInvalid={!!errors.name}
                />
                <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="contactPerson">
                <Form.Label>Contact Person <span className="text-muted fw-normal">(if different)</span></Form.Label>
                <Form.Control
                  type="text"
                  name="contactPerson"
                  placeholder="Contact person"
                  value={form.contactPerson}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Address */}
          <Form.Group className="mb-3" controlId="streetAddress">
            <Form.Label>Street Address</Form.Label>
            <Form.Control
              type="text"
              name="streetAddress"
              placeholder="Street address"
              value={form.streetAddress}
              onChange={handleChange}
            />
          </Form.Group>

          <Row className="mb-3">
            <Col md={5}>
              <Form.Group controlId="city">
                <Form.Label>City</Form.Label>
                <Form.Control
                  type="text"
                  name="city"
                  placeholder="City"
                  value={form.city}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group controlId="state">
                <Form.Label>State</Form.Label>
                <Form.Control
                  type="text"
                  name="state"
                  placeholder="WA"
                  value={form.state}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="zipCode">
                <Form.Label>Zip Code</Form.Label>
                <Form.Control
                  type="text"
                  name="zipCode"
                  placeholder="99362"
                  value={form.zipCode}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Phone + Email */}
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group controlId="phone">
                <Form.Label>Phone <span className="text-danger">(required)</span></Form.Label>
                <Form.Control
                  type="tel"
                  name="phone"
                  placeholder="(509) 555-5555"
                  value={form.phone}
                  onChange={handleChange}
                  isInvalid={!!errors.phone}
                />
                <Form.Control.Feedback type="invalid">{errors.phone}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="email">
                <Form.Label>Email Address <span className="text-muted fw-normal">(for monthly receipt)</span></Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={handleChange}
                  isInvalid={!!errors.email}
                />
                <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          {/* Plan Selection + Pass Number */}
          <Row className="mb-3 align-items-start">
            <Col md={8}>
              <Form.Label className="d-block">Select Plan</Form.Label>
              <Form.Check
                type="radio"
                id="plan-deluxe"
                name="plan"
                value="deluxe"
                label="Deluxe Monthly Pass — $27/month"
                checked={form.plan === 'deluxe'}
                onChange={handleChange}
                isInvalid={!!errors.plan}
                className="mb-2 fs-5"
              />
              <Form.Check
                type="radio"
                id="plan-ultimate"
                name="plan"
                value="ultimate"
                label="Ultimate Monthly Pass — $33/month"
                checked={form.plan === 'ultimate'}
                onChange={handleChange}
                isInvalid={!!errors.plan}
                className="fs-5"
              />
              {errors.plan && <div className="text-danger small mt-1">{errors.plan}</div>}
            </Col>
            <Col md={4}>
              <Form.Group controlId="passNumber">
                <Form.Label>Pass Number Assigned</Form.Label>
                <Form.Control
                  type="text"
                  name="passNumber"
                  placeholder="Staff fills in"
                  value={form.passNumber}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Terms */}
          <div className="subscription-terms mb-3">
            <ul>
              <li>Winter months our hours are weather dependent. If it gets too cold, for the safety of your vehicle, we cannot wash your car (ice tends to dent, not wash).</li>
              <li>If your credit card on account has expired, your monthly pass will not be honored until a payment has been received.</li>
              <li>NOT for commercial users without prior okay.</li>
              <li>Prices subject to change yearly.</li>
              <li>Credit cards will be charged on the <strong>last day of the month</strong> for the following month.</li>
              <li>This monthly pass is good for one vehicle only, the sticker needs to be stuck to your window.</li>
            </ul>
          </div>

          {/* Authorization */}
          <Form.Group className="mb-3" controlId="authorized">
            <Form.Check
              type="checkbox"
              name="authorized"
              label="I authorize my credit card information to be securely stored (required)."
              checked={form.authorized}
              onChange={handleChange}
              isInvalid={!!errors.authorized}
            />
            {errors.authorized && <div className="text-danger small mt-1">{errors.authorized}</div>}
          </Form.Group>

          <p className="mb-3 fw-bold">I hereby authorize charges to be made on the above credit card monthly.</p>

          {/* Print Name */}
          <Form.Group className="mb-4" controlId="printName">
            <Form.Label>Print Name</Form.Label>
            <Form.Control
              type="text"
              name="printName"
              placeholder="Print your full name"
              value={form.printName}
              onChange={handleChange}
              isInvalid={!!errors.printName}
            />
            <Form.Control.Feedback type="invalid">{errors.printName}</Form.Control.Feedback>
          </Form.Group>

          <Button
            variant="primary"
            type="submit"
            className="subscription-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Proceed to Payment'}
          </Button>
        </Form>
      </div>
    </div>
  );
}

export default MonthlySubscriptionPage;
