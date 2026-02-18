import React, { useState, useEffect, useMemo } from 'react';
import { Card, ButtonGroup, Button, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getDailyVisitsInRange } from '../api/analytics-crud';

const WASH_COLORS = { B: '#0d6efd', U: '#198754', D: '#dc3545' };
const WASH_NAMES = { B: 'Basic', U: 'Unlimited', D: 'Deluxe' };

function VisitsChart() {
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' or 'monthly'
  const [chartType, setChartType] = useState('line'); // 'line' or 'bar'
  const [visitsData, setVisitsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);

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
        setError('Failed to load visits data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00Z');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Process data for chart display
  const chartData = useMemo(() => {
    if (!visitsData || visitsData.length === 0) {
      return [];
    }

    // Breakdown field names to carry through
    const breakdownFields = ['subscription', 'loyalty', 'prepaid', 'subB', 'subD', 'subU', 'preB', 'preD', 'preU', 'loyB', 'loyD', 'loyU'];

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

    // Fill in actual visit counts and breakdown data
    visitsData.forEach(visit => {
      if (dateMap.has(visit.dateString)) {
        const entry = {
          date: visit.dateString,
          count: visit.count || 0,
          displayDate: formatDate(visit.dateString)
        };
        breakdownFields.forEach(f => { entry[f] = visit[f] || 0; });
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
          {isLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <div className="mt-2">Loading visit data...</div>
            </div>
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : (
            renderChart()
          )}
        </Card.Body>
      </Card>

      {/* Daily Breakdown Navigator */}
      {!isLoading && !error && chartData.length > 0 && selectedDayIndex !== null && (
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
              const hasBreakdown = day.subscription > 0 || day.loyalty > 0 || day.prepaid > 0;

              return (
                <>
                  {!hasBreakdown && day.count > 0 && (
                    <div className="text-center text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                      No breakdown data available for this date (recorded before tracking was enabled).
                    </div>
                  )}
                  <Row>
                    {/* Subscription Card */}
                    <Col md={4}>
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
                    <Col md={4}>
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
                    <Col md={4}>
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
                  </Row>
                </>
              );
            })()}
          </Card.Body>
        </Card>
      )}
    </div>
  );
}

export default VisitsChart;
