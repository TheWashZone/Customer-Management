import React, { useMemo } from 'react';
import { Card, Row, Col, Badge } from 'react-bootstrap';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useMembers } from '../context/MembersContext';

const COLORS = {
  B: '#0d6efd', // Blue for Basic
  U: '#198754', // Green for Unlimited
  D: '#dc3545', // Red for Deluxe
};

const MEMBERSHIP_NAMES = {
  B: 'Basic',
  U: 'Unlimited',
  D: 'Deluxe',
};

function MembershipStats() {
  const { members, isLoading } = useMembers();

  if (error) {
    return (
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Membership Overview</Card.Title>
          <p className="text-danger mb-0">Failed to load membership data: {typeof error === 'string' ? error : 'Please try again later.'}</p>
        </Card.Body>
      </Card>
    )
  }

  const stats = useMemo(() => {
    if (!members || members.length === 0) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        byType: { B: 0, U: 0, D: 0 },
        byTypeActive: { B: 0, U: 0, D: 0 },
      };
    }

    const stats = {
      total: members.length,
      active: 0,
      inactive: 0,
      byType: { B: 0, U: 0, D: 0 },
      byTypeActive: { B: 0, U: 0, D: 0 },
    };

    members.forEach(member => {
      // Count active/inactive
      if (member.isActive) {
        stats.active++;
      } else {
        stats.inactive++;
      }

      // Extract membership type from ID (first character)
      const type = member.id?.[0]?.toUpperCase();
      if (type === 'B' || type === 'U' || type === 'D') {
        stats.byType[type]++;
        if (member.isActive) {
          stats.byTypeActive[type]++;
        }
      }
    });

    return stats;
  }, [members]);

  // Prepare data for pie chart
  const pieData = useMemo(() => {
    return Object.entries(stats.byType)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        name: MEMBERSHIP_NAMES[type],
        value: count,
        type: type,
      }));
  }, [stats]);

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
      <h2 className="mb-4">Membership Overview</h2>

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary mb-2">{stats.total}</h3>
              <Card.Text className="text-muted">Total Members</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success mb-2">{stats.active}</h3>
              <Card.Text className="text-muted">Active Members</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-secondary mb-2">{stats.inactive}</h3>
              <Card.Text className="text-muted">Inactive Members</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-info mb-2">
                {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
              </h3>
              <Card.Text className="text-muted">Active Rate</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Membership Type Breakdown */}
      <Row>
        <Col md={6}>
          <Card>
            <Card.Body>
              <h5 className="mb-3">Members by Type</h5>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry) => (
                        <Cell key={`cell-${entry.type}`} fill={COLORS[entry.type]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5 text-muted">No membership data available</div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Body>
              <h5 className="mb-3">Detailed Breakdown</h5>
              <div className="d-flex flex-column gap-3">
                {Object.entries(MEMBERSHIP_NAMES).map(([type, name]) => (
                  <div key={type} className="d-flex justify-content-between align-items-center p-3 border rounded">
                    <div>
                      <Badge bg="secondary" className="me-2">{type}</Badge>
                      <strong>{name}</strong>
                    </div>
                    <div className="text-end">
                      <div>
                        <span className="text-success fw-bold">{stats.byTypeActive[type]} active</span>
                        {' / '}
                        <span className="text-muted">{stats.byType[type]} total</span>
                      </div>
                      {stats.byType[type] > 0 && (
                        <small className="text-muted">
                          ({Math.round((stats.byTypeActive[type] / stats.byType[type]) * 100)}% active)
                        </small>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default MembershipStats;
