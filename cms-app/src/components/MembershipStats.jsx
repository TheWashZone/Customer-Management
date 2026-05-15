import React, { useMemo, useEffect } from 'react';
import { Card, Row, Col, Badge } from 'react-bootstrap';
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

  const chartData = useMemo(() => {
    const dateMap = new Map();

    visits.forEach((visit) => {
      if(visit.payment_type != "subscription"){
        return;
      }
      const date = visit.visit_date;

      if (!date) return;

      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date, count: 0,
        });
      }

      dateMap.get(date).count++;
    });

    return Array.from(dateMap.values()).sort((a,b) =>
      a.date.localeCompare(b.date)
    );
  }, [visits]);

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
          <XAxis dataKey="date" />
          <YAxis />
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
            <h5 className="mb-3">Visits By Members</h5>
            {renderChart()}
          </Card.Body>
        </Card>
      </Row>
    </div>
  );
}

export default MembershipStats;
