import React, { useState, useEffect, useMemo } from 'react';
import { Card, ButtonGroup, Button, Spinner, Alert, Row, Col, Modal, Form } from 'react-bootstrap';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getDailyVisitsInRange } from '../api/analytics-crud';
import { getWashPrices, updateWashPrices } from '../api/settings-crud';

const WASH_COLORS = { B: '#0d6efd', U: '#198754', D: '#dc3545' };
const WASH_NAMES = { B: 'Basic', U: 'Unlimited', D: 'Deluxe' };
const DEFAULT_PRICES = { B: 10.00, D: 13.50, U: 16.50 };

function CashStats() {
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' or 'monthly'
  const [chartType, setChartType] = useState('line'); // 'line' or 'bar'
  const [visitsData, setVisitsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [washPrices, setWashPrices] = useState(DEFAULT_PRICES);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceForm, setPriceForm] = useState({});
  const [isSavingPrices, setIsSavingPrices] = useState(false);
  const [priceError, setPriceError] = useState(null);

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

  // Fetch visits data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getDailyVisitsInRange(dateRange.start, dateRange.end);
        setVisitsData(data);
      } catch (err) {
        console.error('Failed to load visits data:', err);
        setError('Failed to load cash visits data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

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

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00Z');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Process data for chart display - CASH ONLY
  const chartData = useMemo(() => {
    if (!visitsData || visitsData.length === 0) {
      return [];
    }

    // Only include cash breakdown fields
    const breakdownFields = ['cashB', 'cashD', 'cashU'];

    // Create a map of all dates in range with 0 counts
    const dateMap = new Map();
    const start = new Date(dateRange.start + 'T00:00:00Z');
    const end = new Date(dateRange.end + 'T00:00:00Z');

    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const entry = { date: dateStr, count: 0, displayDate: formatDate(dateStr) };
      breakdownFields.forEach(f => { entry[f] = 0; });
      dateMap.set(dateStr, entry);
    }

    // Fill in actual visit counts and breakdown data for cash only
    visitsData.forEach(visit => {
      if (dateMap.has(visit.dateString)) {
        const cashCount = (visit.cashB || 0) + (visit.cashD || 0) + (visit.cashU || 0);
        const entry = {
          date: visit.dateString,
          count: cashCount,
          displayDate: formatDate(visit.dateString),
          cashB: visit.cashB || 0,
          cashD: visit.cashD || 0,
          cashU: visit.cashU || 0,
        };
        dateMap.set(visit.dateString, entry);
      }
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [visitsData, dateRange]);

  // Default selectedDayIndex to last day when chartData changes
  useEffect(() => {
    if (chartData.length > 0) {
      setSelectedDayIndex(chartData.length - 1);
    }
  }, [chartData]);

  // Calculate summary statistics for cash visits
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
      return <div className="text-center py-5 text-muted">No cash visit data available for this period</div>;
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
          <YAxis label={{ value: 'Cash Visits', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            labelFormatter={(label) => `Date: ${label}`}
            formatter={(value) => [`${value} visits`, 'Count']}
          />
          <Legend />
          <DataComponent
            type="monotone"
            dataKey="count"
            name="Cash Visits"
            stroke="#6f42c1"
            fill="#6f42c1"
            strokeWidth={2}
          />
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  return (
    <div>
      <h2 className="mb-4">Cash Visits Analytics</h2>

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary mb-2">{stats.total}</h3>
              <Card.Text className="text-muted">Total Cash Visits</Card.Text>
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
            <h5 className="mb-0">Cash Visit Trends</h5>
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
          {isLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <div className="mt-2">Loading cash visit data...</div>
            </div>
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : (
            renderChart()
          )}
        </Card.Body>
      </Card>

      {/* Daily Breakdown Navigator */}
      {!isLoading && !error && chartData.length > 0 && selectedDayIndex !== null && selectedDayIndex < chartData.length && (
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
                {new Date(chartData[selectedDayIndex].date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
              const hasBreakdown = day.cashB > 0 || day.cashD > 0 || day.cashU > 0;

              return (
                <>
                  {!hasBreakdown && day.count > 0 && (
                    <div className="text-center text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                      No breakdown data available for this date.
                    </div>
                  )}
                  <Row>
                    {/* Cash Card */}
                    <Col md={4}>
                      <Card className="text-center h-100">
                        <Card.Body>
                          <Card.Text className="text-muted mb-1">Cash Visits</Card.Text>
                          <h3 className="mb-2">{day.count}</h3>
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

                    {/* Wash Type Totals */}
                    <Col md={8}>
                      <h6 className="text-center text-muted mb-3">Totals by Wash Type</h6>
                      <Row>
                        {['B', 'D', 'U'].map(w => (
                          <Col md={4} key={w}>
                            <Card className="text-center h-100">
                              <Card.Body>
                                <Card.Text className="text-muted mb-1" style={{ color: WASH_COLORS[w] }}>
                                  {WASH_NAMES[w]}
                                </Card.Text>
                                <h3 className="mb-2" style={{ color: WASH_COLORS[w] }}>
                                  {day['cash' + w]}
                                </h3>
                                <div style={{ fontSize: '0.85rem' }}>
                                  Revenue: ${(day['cash' + w] * washPrices[w]).toFixed(2)}
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </Col>
                  </Row>
                </>
              );
            })()}
          </Card.Body>
        </Card>
      )}

      {/* Price Edit Modal */}
      <Modal show={showPriceModal} onHide={() => setShowPriceModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Wash Prices</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {priceError && <Alert variant="danger">{priceError}</Alert>}
          <Form>
            {['B', 'D', 'U'].map(w => (
              <Form.Group key={w} className="mb-3">
                <Form.Label>{WASH_NAMES[w]} Price</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={`${WASH_NAMES[w]} price`}
                  value={priceForm[w] || ''}
                  onChange={(e) => handlePriceChange(w, e.target.value)}
                  disabled={isSavingPrices}
                />
              </Form.Group>
            ))}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPriceModal(false)} disabled={isSavingPrices}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handlePriceSave} disabled={isSavingPrices}>
            {isSavingPrices ? 'Saving...' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default CashStats;
