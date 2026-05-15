import React, { useState, useEffect, useMemo } from 'react';
import { Card, ButtonGroup, Button, Spinner, Alert, Row, Col, Modal, Form } from 'react-bootstrap';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getWashPrices, updateWashPrices } from '../api/settings-crud';
import { useVisits } from '../context/VisitsContext';


const WASH_COLORS = { B: '#0d6efd', U: '#198754', D: '#dc3545' };
const WASH_NAMES = { B: 'Basic', U: 'Unlimited', D: 'Deluxe' };
const DEFAULT_PRICES = { B: 10.00, D: 13.50, U: 16.50 };

function VisitsChart() {
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' or 'monthly'
  const [chartType, setChartType] = useState('line'); // 'line' or 'bar'
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [washPrices, setWashPrices] = useState(DEFAULT_PRICES);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceForm, setPriceForm] = useState({});
  const [isSavingPrices, setIsSavingPrices] = useState(false);
  const [priceError, setPriceError] = useState(null);

  const { visits, isVisitsLoading, visitsError } = useVisits();

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];

    const startDate = new Date(today);
    if (viewMode === 'weekly') {
      startDate.setDate(today.getDate() - 7);
    } else {
      startDate.setDate(today.getDate() - 30);
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate
    };
  }, [viewMode]);


  const normalizeWashType = (washType) => {
    if (washType === 'Basic') return 'B';
    if (washType === 'Deluxe') return 'D';
    if (washType === 'Ultimate' || washType === 'Unlimited') return 'U';
    return washType;
  };

  // Format date for display
  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };


  const chartData = useMemo(() => {
    const breakdownFields = [
      'subscription', 'loyalty', 'prepaid', 'cash',
      'subB', 'subD', 'subU',
      'preB', 'preD', 'preU',
      'loyB', 'loyD', 'loyU',
      'cashB', 'cashD', 'cashU',
    ];

    const dateMap = new Map();
    const start = new Date(dateRange.start + 'T00:00:00Z');
    const end = new Date(dateRange.end + 'T00:00:00Z');

    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const entry = {
        date: dateStr,
        count: 0,
        displayDate: formatDate(dateStr),
      };

      breakdownFields.forEach((field) => {
        entry[field] = 0;
      });

      dateMap.set(dateStr, entry);
    }

    visits.forEach((visit) => {
      const date = visit.visit_date;

      if (!dateMap.has(date)) return;

      const entry = dateMap.get(date);
      const paymentType = visit.payment_type;
      const washType = normalizeWashType(visit.wash_type);

      entry.count++;

      if (paymentType === 'subscription') {
        entry.subscription++;
        if (washType) entry['sub' + washType]++;
      } else if (paymentType === 'loyalty') {
        entry.loyalty++;
        if (washType) entry['loy' + washType]++;
      } else if (paymentType === 'prepaid') {
        entry.prepaid++;
        if (washType) entry['pre' + washType]++;
      } else if (paymentType === 'cash') {
        entry.cash++;
        if (washType) entry['cash' + washType]++;
      }
    });

    return Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [visits, dateRange]);


  // Fetch wash prices on mount
  useEffect(() => {
    getWashPrices().then(setWashPrices).catch(() => {/* silently use defaults */});
  }, []);

  const handleOpenPriceModal = () => {
    setPriceForm({ ...washPrices });
    setPriceError(null);
    setShowPriceModal(true);
  };

  const handlePriceChange = (washType, value) => {
    setPriceForm(prev => ({ ...prev, [washType]: value }));
  };

  const handlePriceSave = async () => {
    const parsed = {
      B: parseFloat(priceForm.B),
      D: parseFloat(priceForm.D),
      U: parseFloat(priceForm.U),
    };
    if (Object.values(parsed).some(v => isNaN(v) || v < 0)) {
      setPriceError('All prices must be valid non-negative numbers.');
      return;
    }
    setIsSavingPrices(true);
    setPriceError(null);
    try {
      await updateWashPrices(parsed);
      setWashPrices(parsed);
      setShowPriceModal(false);
    } catch (err) {
      setPriceError(`Failed to save: ${err.message}`);
    } finally {
      setIsSavingPrices(false);
    }
  };

  // Default selectedDayIndex to last day when chartData changes
  useEffect(() => {
    if (chartData.length > 0) {
      setSelectedDayIndex(chartData.length - 1);
    }
  }, [chartData]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { total: 0, average: 0, max: 0, min: 0 };
    }

    const counts = chartData.map(d => d.count);
    const total = counts.reduce((sum, count) => sum + count, 0);
    const average = Math.round(total / chartData.length);
    const max = Math.max(...counts);
    const min = Math.min(...counts);

    return { total, average, max, min };
  }, [chartData]);

  const renderChart = () => {
    if (chartData.length === 0) {
      return <div className="text-center py-5 text-muted">No visit data available for this period</div>;
    }

    const ChartComponent = chartType === 'line' ? LineChart : BarChart;
    const DataComponent = chartType === 'line' ? Line : Bar;

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ChartComponent data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="displayDate"
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis label={{ value: 'Visits', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            labelFormatter={(label) => `Date: ${label}`}
            formatter={(value) => [`${value} visits`, 'Count']}
          />
          <Legend />
          <DataComponent
            type="monotone"
            dataKey="count"
            name="Daily Visits"
            stroke="#0d6efd"
            fill="#0d6efd"
            strokeWidth={2}
          />
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  return (
    <div>
      <h2 className="mb-4">Customer Visits Analytics</h2>

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary mb-2">{stats.total}</h3>
              <Card.Text className="text-muted">Total Visits</Card.Text>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success mb-2">{stats.average}</h3>
              <Card.Text className="text-muted">Average/Day</Card.Text>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-info mb-2">{stats.max}</h3>
              <Card.Text className="text-muted">Peak Day</Card.Text>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-secondary mb-2">{stats.min}</h3>
              <Card.Text className="text-muted">Lowest Day</Card.Text>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Chart Card */}
      <Card>
        <Card.Body>
          {/* Controls */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Visit Trends</h5>
            <div className="d-flex gap-3">
              <ButtonGroup size="sm">
                <Button
                  variant={viewMode === 'weekly' ? 'primary' : 'outline-primary'}
                  onClick={() => setViewMode('weekly')}
                >
                  Last 7 Days
                </Button>
                <Button
                  variant={viewMode === 'monthly' ? 'primary' : 'outline-primary'}
                  onClick={() => setViewMode('monthly')}
                >
                  Last 30 Days
                </Button>
              </ButtonGroup>

              <ButtonGroup size="sm">
                <Button
                  variant={chartType === 'line' ? 'secondary' : 'outline-secondary'}
                  onClick={() => setChartType('line')}
                >
                  Line
                </Button>
                <Button
                  variant={chartType === 'bar' ? 'secondary' : 'outline-secondary'}
                  onClick={() => setChartType('bar')}
                >
                  Bar
                </Button>
              </ButtonGroup>
            </div>
          </div>

          {/* Chart or Loading/Error State */}
          {isVisitsLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <div className="mt-2">Loading visit data...</div>
            </div>
          ) : visitsError ? (
            <Alert variant="danger">{error}</Alert>
          ) : (
            renderChart()
          )}
        </Card.Body>
      </Card>

      {/* Daily Breakdown Navigator */}
      {!isVisitsLoading && !visitsError && chartData.length > 0 && selectedDayIndex !== null && selectedDayIndex < chartData.length && (
        <Card className="mt-4">
          <Card.Body>
            {/* Day Navigation */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={selectedDayIndex === 0}
                onClick={() => setSelectedDayIndex(i => i - 1)}
              >
                &larr; Prev
              </Button>
              <h5 className="mb-0">
                {formatDate(chartData[selectedDayIndex].date)}
                <span className="ms-3 text-muted" style={{ fontSize: '0.9rem' }}>
                  Total: {chartData[selectedDayIndex].count}
                </span>
              </h5>
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={selectedDayIndex === chartData.length - 1}
                onClick={() => setSelectedDayIndex(i => i + 1)}
              >
                Next &rarr;
              </Button>
            </div>

            {(() => {
              const day = chartData[selectedDayIndex];
              const hasBreakdown = day.subscription > 0 || day.loyalty > 0 || day.prepaid > 0 || day.cash > 0;

              return (
                <>
                  {!hasBreakdown && day.count > 0 && (
                    <div className="text-center text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                      No breakdown data available for this date (recorded before tracking was enabled).
                    </div>
                  )}
                  <Row>
                    {/* Subscription Card */}
                    <Col md={3}>
                      <Card className="text-center h-100">
                        <Card.Body>
                          <Card.Text className="text-muted mb-1">Subscriptions</Card.Text>
                          <h3 className="mb-2">{day.subscription}</h3>
                          <div className="d-flex justify-content-center gap-3">
                            {['B', 'D', 'U'].map(w => (
                              <span key={w} style={{ color: WASH_COLORS[w], fontWeight: 600 }}>
                                {WASH_NAMES[w]}: {day['sub' + w]}
                              </span>
                            ))}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* Loyalty Card */}
                    <Col md={3}>
                      <Card className="text-center h-100">
                        <Card.Body>
                          <Card.Text className="text-muted mb-1">Loyalty</Card.Text>
                          <h3 className="mb-2">{day.loyalty}</h3>
                          <div className="d-flex justify-content-center gap-3">
                            {['B', 'D', 'U'].map(w => (
                              <span key={w} style={{ color: WASH_COLORS[w], fontWeight: 600 }}>
                                {WASH_NAMES[w]}: {day['loy' + w]}
                              </span>
                            ))}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* Prepaid Card */}
                    <Col md={3}>
                      <Card className="text-center h-100">
                        <Card.Body>
                          <Card.Text className="text-muted mb-1">Prepaid</Card.Text>
                          <h3 className="mb-2">{day.prepaid}</h3>
                          <div className="d-flex justify-content-center gap-3">
                            {['B', 'D', 'U'].map(w => (
                              <span key={w} style={{ color: WASH_COLORS[w], fontWeight: 600 }}>
                                {WASH_NAMES[w]}: {day['pre' + w]}
                              </span>
                            ))}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* Cash Card */}
                    <Col md={3}>
                      <Card className="text-center h-100">
                        <Card.Body>
                          <Card.Text className="text-muted mb-1">Cash</Card.Text>
                          <h3 className="mb-2">{day.cash}</h3>
                          <div className="d-flex justify-content-center gap-3">
                            {['B', 'D', 'U'].map(w => (
                              <span key={w} style={{ color: WASH_COLORS[w], fontWeight: 600 }}>
                                {WASH_NAMES[w]}: {day['cash' + w]}
                              </span>
                            ))}
                          </div>
                          <div className="mt-2 text-success fw-semibold">
                            Expected: ${(['B', 'D', 'U'].reduce((sum, w) => sum + (day['cash' + w] || 0) * washPrices[w], 0)).toFixed(2)}
                          </div>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="mt-2"
                            onClick={handleOpenPriceModal}
                          >
                            Edit Prices
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  {/* Wash Type Totals */}
                  <h6 className="text-center text-muted mt-4 mb-3">Totals by Wash Type</h6>
                  <Row>
                    {['B', 'D', 'U'].map(w => (
                      <Col md={4} key={w}>
                        <Card className="text-center h-100">
                          <Card.Body>
                            <Card.Text className="text-muted mb-1" style={{ color: WASH_COLORS[w] }}>
                              {WASH_NAMES[w]}
                            </Card.Text>
                            <h3 className="mb-2" style={{ color: WASH_COLORS[w] }}>
                              {day['sub' + w] + day['loy' + w] + day['pre' + w] + day['cash' + w]}
                            </h3>
                            <div className="d-flex justify-content-center gap-3" style={{ fontSize: '0.85rem' }}>
                              <span>Sub: {day['sub' + w]}</span>
                              <span>Loy: {day['loy' + w]}</span>
                              <span>Pre: {day['pre' + w]}</span>
                              <span>Cash: {day['cash' + w]}</span>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </>
              );
            })()}
          </Card.Body>
        </Card>
      )}

      {/* Wash Price Editor */}
      <Modal show={showPriceModal} onHide={() => setShowPriceModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Wash Prices</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {['B', 'D', 'U'].map(w => (
            <Form.Group key={w} className="mb-3">
              <Form.Label>{WASH_NAMES[w]} (${washPrices[w].toFixed(2)} current)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.01"
                value={priceForm[w] ?? ''}
                onChange={e => handlePriceChange(w, e.target.value)}
              />
            </Form.Group>
          ))}
          {priceError && <Alert variant="danger" className="mb-0">{priceError}</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPriceModal(false)} disabled={isSavingPrices}>
            Cancel
          </Button>
          <Button variant="success" onClick={handlePriceSave} disabled={isSavingPrices}>
            {isSavingPrices ? 'Saving…' : 'Save Prices'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default VisitsChart;
