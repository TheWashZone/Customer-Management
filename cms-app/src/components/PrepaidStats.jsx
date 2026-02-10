import React, { useEffect, useMemo } from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { useMembers } from '../context/MembersContext';

function PrepaidStats() {
  const { prepaidMembers, isPrepaidLoading, ensurePrepaidLoaded } = useMembers();

  useEffect(() => {
    ensurePrepaidLoaded();
  }, [ensurePrepaidLoaded]);

  const stats = useMemo(() => {
    if (!prepaidMembers || prepaidMembers.length === 0) {
      return { total: 0, avgWashes: 0, noWashesLeft: 0, lowWashes: 0 };
    }

    const total = prepaidMembers.length;

    const washes = prepaidMembers.map((m) => m.prepaidWashes || 0);
    const avgWashes = Math.round(washes.reduce((sum, w) => sum + w, 0) / total);
    const noWashesLeft = prepaidMembers.filter((m) => (m.prepaidWashes || 0) === 0).length;
    const lowWashes = prepaidMembers.filter((m) => {
      const w = m.prepaidWashes || 0;
      return w >= 1 && w <= 2;
    }).length;

    return { total, avgWashes, noWashesLeft, lowWashes };
  }, [prepaidMembers]);

  if (isPrepaidLoading) {
    return (
      <Card>
        <Card.Body>
          <div className="text-center py-5">Loading prepaid data...</div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="mb-4">Prepaid Overview</h2>
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
              <h3 className="text-success mb-2">{stats.avgWashes}</h3>
              <Card.Text className="text-muted">Avg Washes Remaining</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-danger mb-2">{stats.noWashesLeft}</h3>
              <Card.Text className="text-muted">No Washes Left</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-warning mb-2">{stats.lowWashes}</h3>
              <Card.Text className="text-muted">Low Washes (1-2)</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default PrepaidStats;
