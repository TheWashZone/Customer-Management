import React, { useState, useMemo, useEffect } from 'react';
import { Card, Row, Col, Badge } from 'react-bootstrap';
import { ButtonGroup, Button } from 'react-bootstrap';
import { 
  ResponsiveContainer, 
  Legend, 
  Tooltip, 
  XAxis, 
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { useMembers } from '../context/MembersContext';
import { useVisits } from '../context/VisitsContext';

const MEMBERSHIP_NAMES = {
  B: 'Basic',
  U: 'Unlimited',
  D: 'Deluxe',
};

function MembershipStats() {
  const [viewMode, setViewMode] = useState('weekly');

  const { members, isLoading, monthlyPassesByUser, refreshMonthlyPassesForUser, } = useMembers();
  const { visits } = useVisits();

  useEffect(() => {
    async function loadMonthlyPasses() {
      await Promise.all(
        members.map(member => refreshMonthlyPassesForUser(member.id))
      );
    }

    if (members.length > 0) {
      loadMonthlyPasses();
    }
  }, [members, refreshMonthlyPassesForUser]);

  const stats = useMemo(() => {
    if (!members || members.length === 0) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        paymentNeeded: 0,
        byType: { B: 0, U: 0, D: 0 },
      };
    }

    const stats = {
      total: 0,
      active: 0,
      inactive: 0,
      paymentNeeded: 0,
      byType: { B: 0, U: 0, D: 0 },
    };

    members.forEach(member => {
      const passes = monthlyPassesByUser[member.id] || [];

      passes.forEach(pass => {
        stats.total++;

        if (pass.status === 'active') {
          stats.active++;
        } else if (pass.status === 'payment_needed') {
          stats.paymentNeeded++;
        } else {
          stats.inactive++;
        }

        // Extract membership type from ID (first character)
        const type = pass.passId?.[0]?.toUpperCase();
        if (type === 'B' || type === 'U' || type === 'D') {
          stats.byType[type]++;
        }
      });
    });

    return stats;
  }, [members, monthlyPassesByUser]);

  // Format date for display
  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

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


  const chartData = useMemo(() => {
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

      dateMap.set(dateStr, {date: dateStr, count: 0, displayDate: formatDate(dateStr)});
    }


    visits.forEach((visit) => {
      const date = visit.visit_date;
      if (!dateMap.has(date)) return;

      if(visit.payment_type != "subscription"){
        return;
      }

      if (!date) return;

      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          displayDate: formatDate(date),
          count: 0,
        });
      }

      dateMap.get(date).count++;
    });

    return Array.from(dateMap.values()).sort((a,b) =>
      a.date.localeCompare(b.date)
    );
  }, [visits, dateRange]);

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="text-center py-5 text-muted">
          No data available
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="displayDate"
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis label={{ value: 'Visits', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="count"
            name="Visits"
            stroke="#0d6edf"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <Card.Body>
          <div className="text-center py-5">Loading membership data...</div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="mb-4">Subscription Overview</h2>

      <Row>
        <Col md={6}>
          <Card className="h-100">
            <Card.Body className="d-flex flex-column">
              <h5 className="mb-3">Active Members</h5>

              <div className="d-flex flex-column gap-3 flex-grow-1">
                <Card className="text-center flex-fill">
                  <Card.Body>
                    <h3 className="text-primary mb-2">{stats.total}</h3>
                    <Card.Text className="text-muted">Total Members</Card.Text>
                  </Card.Body>
                </Card>

                <Card className="text-center flex-fill">
                  <Card.Body>
                    <h3 className="text-success mb-2">{stats.active}</h3>
                    <Card.Text className="text-muted">Active Members</Card.Text>
                  </Card.Body>
                </Card>

                <Card className="text-center flex-fill">
                  <Card.Body>
                    <h3 className="text-warning mb-2">{stats.paymentNeeded}</h3>
                    <Card.Text className="text-muted">Payment Needed</Card.Text>
                  </Card.Body>
                </Card>
              </div>

            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="h-100">
            <Card.Body className="d-flex flex-column">
              <h5 className="mb-3">Members by Type</h5>

              <div className="d-flex flex-column gap-3 flex-grow-1">
                {Object.entries(MEMBERSHIP_NAMES).map(([type, name]) => (
                  <div key={type} className="d-flex justify-content-between align-items-center p-3 border rounded flex-fill">
                    <div>
                      <Badge bg="secondary" className="me-2">{type}</Badge>
                      <strong>{name}</strong>
                    </div>
                    <div className="text-end">
                      <div>
                        <span className="text-success fw-bold">{stats.byType[type]} Members </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="p-3">
        <Card>
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-3">Visits By Members</h5>

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
            </div>
            {renderChart()}
          </Card.Body>
        </Card>
      </Row>
    </div>
  );
}

export default MembershipStats;
