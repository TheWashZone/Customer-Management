import React, { useEffect, useMemo } from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { useMembers } from '../context/MembersContext';

function LoyaltyStats() {
  const { loyaltyMembers, isLoyaltyLoading, loyaltyError, ensureLoyaltyLoaded } = useMembers();

  useEffect(() => {
    ensureLoyaltyLoaded();
  }, [ensureLoyaltyLoaded]);

  const stats = useMemo(() => {
    if (!loyaltyMembers || loyaltyMembers.length === 0) {
      return { total: 0, avgVisits: 0, highestVisits: 0, nearFreeWash: 0 };
    }

    const total = loyaltyMembers.length;

    const visitCounts = loyaltyMembers.map((m) => m.visitCount || 0);
    const avgVisits = Math.round(visitCounts.reduce((sum, v) => sum + v, 0) / total);
    const highestVisits = Math.max(...visitCounts);
    const nearFreeWash = loyaltyMembers.filter((m) => (m.visitCount || 0) % 10 >= 8).length;

    return { total, avgVisits, highestVisits, nearFreeWash };
  }, [loyaltyMembers]);

  if (isLoyaltyLoading) {
    return (
      <Card>
        <Card.Body>
          <div className="text-center py-5">Loading loyalty data...</div>
        </Card.Body>
      </Card>
    );
  }

  if (loyaltyError) {
    return (
      <Card>
        <Card.Body>
          <div className="text-center py-5 text-danger">{loyaltyError}</div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="mb-4">Loyalty Overview</h2>
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
              <h3 className="text-success mb-2">{stats.avgVisits}</h3>
              <Card.Text className="text-muted">Avg Visit Count</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-info mb-2">{stats.highestVisits}</h3>
              <Card.Text className="text-muted">Highest Visits</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-warning mb-2">{stats.nearFreeWash}</h3>
              <Card.Text className="text-muted">Near Free Wash</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default LoyaltyStats;
