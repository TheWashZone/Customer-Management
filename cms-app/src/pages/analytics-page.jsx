import React, { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';
import Card from 'react-bootstrap/Card';
import '../css/analytics-page.css';
import HamburgerMenu from '../components/hamburger-menu';
import MembershipStats from '../components/MembershipStats';
import VisitsChart from '../components/VisitsChart';

const DataTableView = () => <Card>Place Holder for data tables with raw data</Card>;
const ExportOptions = () => <Card>Place Holder for export options like file type or attribute selection</Card>;

function AnalyticsPage() {
  // Definition of state to track the active view
  const [activeView, setActiveView] = useState('membership');

  // Function to render content based on state
  const renderTab = () => {
    switch (activeView) {
      case 'membership': return <MembershipStats />;
      case 'visits': return <VisitsChart />;
      case 'data': return <DataTableView />;
      case 'export': return <ExportOptions />;
      default: return <p>How did we get here?</p> // should never happen. Little Joke
    }
  }

  // Main render
  return (
    <div className="p-3">
      <HamburgerMenu />
      <div style={{ marginLeft: '60px' }}>
        <h1 className="mb-3">Analytics Dashboard</h1>
        <Stack direction="horizontal" gap={2} className='mb-3'>
          <Button variant={activeView === 'membership' ? 'primary' : 'outline-primary'} onClick={() => setActiveView('membership')}>
            Membership
          </Button>
          <Button variant={activeView === 'visits' ? 'primary' : 'outline-primary'} onClick={() => setActiveView('visits')}>
            Visits
          </Button>
          <Button variant={activeView === 'data' ? 'primary' : 'outline-primary'} onClick={() => setActiveView('data')}>
            Raw Data
          </Button>
          <Button variant={activeView === 'export' ? 'primary' : 'outline-primary'} onClick={() => setActiveView('export')}>
            Export
          </Button>
        </Stack>
        {renderTab()}
      </div>
    </div>
  );
}

export default AnalyticsPage;
