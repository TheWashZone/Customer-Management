import React, { useState, useEffect, useMemo } from 'react';
import { Card, ButtonGroup, Button, Spinner, Alert } from 'react-bootstrap';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getDailyVisitsInRange } from '../api/analytics-crud';

function VisitsChart() {
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' or 'monthly'
  const [chartType, setChartType] = useState('line'); // 'line' or 'bar'
  const [visitsData, setVisitsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

    // Create a map of all dates in range with 0 counts
    const dateMap = new Map();
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dateMap.set(dateStr, {
        date: dateStr,
        count: 0,
        displayDate: formatDate(dateStr)
      });
    }

    // Fill in actual visit counts
    visitsData.forEach(visit => {
      if (dateMap.has(visit.dateString)) {
        dateMap.set(visit.dateString, {
          date: visit.dateString,
          count: visit.count || 0,
          displayDate: formatDate(visit.dateString)
        });
      }
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [visitsData, dateRange]);

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
    </div>
  );
}

export default VisitsChart;
