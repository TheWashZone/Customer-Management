import React, { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';
import '../css/analytics-page.css';
import HamburgerMenu from '../components/HamburgerMenu';
import MembershipStats from '../components/MembershipStats';
import LoyaltyStats from '../components/LoyaltyStats';
import PrepaidStats from '../components/PrepaidStats';
import VisitsChart from '../components/VisitsChart';
import WeatherAnalytics from '../components/WeatherAnalytics';

function AnalyticsPage() {
  // Definition of state to track the active view
  const [activeView, setActiveView] = useState('subscriptions');

  // Function to render content based on state
  const renderTab = () => {
    switch (activeView) {
      case 'subscriptions': return <MembershipStats />;
      case 'loyalty': return <LoyaltyStats />;
      case 'prepaid': return <PrepaidStats />;
      case 'visits': return <VisitsChart />;
      case 'weather': return <WeatherAnalytics />;
      default: return <p>Something went wrong.</p>
    }
  }

  // Main render
  return (
    <div className="p-3 analytics-page-container">
      <HamburgerMenu />
      <div className="analytics-content" style={{ marginLeft: '60px' }}>
        <h1 className="mb-3">Analytics Dashboard</h1>
        <Stack direction="horizontal" gap={2} className='mb-3'>
          <Button variant={activeView === 'subscriptions' ? 'primary' : 'outline-primary'} onClick={() => setActiveView('subscriptions')}>
            Subscriptions
          </Button>
          <Button variant={activeView === 'loyalty' ? 'primary' : 'outline-primary'} onClick={() => setActiveView('loyalty')}>
            Loyalty
          </Button>
          <Button variant={activeView === 'prepaid' ? 'primary' : 'outline-primary'} onClick={() => setActiveView('prepaid')}>
            Prepaid
          </Button>
          <Button variant={activeView === 'visits' ? 'primary' : 'outline-primary'} onClick={() => setActiveView('visits')}>
            Visits
          </Button>
          <Button variant={activeView === 'weather' ? 'primary' : 'outline-primary'} onClick={() => setActiveView('weather')}>
            Weather
          </Button>
        </Stack>
        {renderTab()}
      </div>
    </div>
  );
}

export default AnalyticsPage;
