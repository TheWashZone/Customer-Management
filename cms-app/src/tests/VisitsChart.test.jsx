// @vitest-environment jsdom
/* eslint-env vitest */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mock recharts entirely — we're testing price logic, not chart rendering,
// and recharts requires ResizeObserver / layout APIs unavailable in jsdom.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  LineChart: () => <div data-testid="line-chart" />,
  BarChart: () => <div data-testid="bar-chart" />,
  Line: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

vi.mock('../api/settings-crud', () => ({
  getWashPrices: vi.fn(),
  updateWashPrices: vi.fn(),
}));

vi.mock('../api/analytics-crud', () => ({
  getDailyVisitsInRange: vi.fn(),
}));

import * as settingsCrud from '../api/settings-crud';
import * as analyticsCrud from '../api/analytics-crud';
import VisitsChart from '../components/VisitsChart';

const DEFAULT_PRICES = { B: 10.00, D: 13.50, U: 16.50 };

// Mock visit data for today: cashB=1, cashD=1 → Expected at defaults = $10 + $13.50 = $23.50
function mockVisitData() {
  const today = new Date().toISOString().split('T')[0];
  return [{
    dateString: today,
    count: 6,
    subscription: 2, loyalty: 1, prepaid: 1, cash: 2,
    subB: 1, subD: 1, subU: 0,
    loyB: 1, loyD: 0, loyU: 0,
    preB: 0, preD: 1, preU: 0,
    cashB: 1, cashD: 1, cashU: 0,
  }];
}

// Wait for the daily breakdown section to appear (loading finished, data rendered)
async function waitForBreakdown() {
  await waitFor(() => expect(screen.getByText('Cash')).toBeInTheDocument());
}

describe('VisitsChart – wash price editing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsCrud.getWashPrices.mockResolvedValue({ ...DEFAULT_PRICES });
    settingsCrud.updateWashPrices.mockResolvedValue();
    analyticsCrud.getDailyVisitsInRange.mockResolvedValue(mockVisitData());
  });

  // --- Price display ---

  test('displays Expected cash total using fetched prices', async () => {
    render(<VisitsChart />);
    await waitForBreakdown();
    // cashB=1 @ $10.00 + cashD=1 @ $13.50 = $23.50
    expect(screen.getByText(/Expected: \$23\.50/)).toBeInTheDocument();
  });

  test('uses custom prices when Firestore returns non-default values', async () => {
    settingsCrud.getWashPrices.mockResolvedValue({ B: 12.00, D: 15.00, U: 20.00 });
    render(<VisitsChart />);
    await waitForBreakdown();
    // cashB=1 @ $12.00 + cashD=1 @ $15.00 = $27.00
    expect(screen.getByText(/Expected: \$27\.00/)).toBeInTheDocument();
  });

  test('falls back to default prices when the Firestore fetch fails', async () => {
    settingsCrud.getWashPrices.mockRejectedValue(new Error('Network error'));
    render(<VisitsChart />);
    await waitForBreakdown();
    // Defaults still apply: $23.50
    expect(screen.getByText(/Expected: \$23\.50/)).toBeInTheDocument();
  });

  // --- Edit Prices button ---

  test('"Edit Prices" button is visible on the cash card', async () => {
    render(<VisitsChart />);
    await waitForBreakdown();
    expect(screen.getByRole('button', { name: /edit prices/i })).toBeInTheDocument();
  });

  test('clicking "Edit Prices" opens the modal', async () => {
    render(<VisitsChart />);
    await waitForBreakdown();
    fireEvent.click(screen.getByRole('button', { name: /edit prices/i }));
    expect(screen.getByText('Edit Wash Prices')).toBeInTheDocument();
  });

  // --- Modal pre-fill ---

  test('modal inputs are pre-filled with the current prices', async () => {
    render(<VisitsChart />);
    await waitForBreakdown();
    fireEvent.click(screen.getByRole('button', { name: /edit prices/i }));

    const modal = screen.getByRole('dialog');
    const inputs = within(modal).getAllByRole('spinbutton');
    const values = inputs.map(i => parseFloat(i.value));

    expect(values).toContain(10.00);
    expect(values).toContain(13.50);
    expect(values).toContain(16.50);
  });

  // --- Saving ---

  test('saving calls updateWashPrices with parsed values, closes modal, and updates Expected', async () => {
    render(<VisitsChart />);
    await waitForBreakdown();
    fireEvent.click(screen.getByRole('button', { name: /edit prices/i }));

    // Change Basic price from $10.00 to $15.00; leave D and U unchanged
    const modal = screen.getByRole('dialog');
    const [basicInput] = within(modal).getAllByRole('spinbutton'); // B, D, U order
    fireEvent.change(basicInput, { target: { value: '15.00' } });

    fireEvent.click(screen.getByRole('button', { name: /save prices/i }));

    await waitFor(() => {
      expect(settingsCrud.updateWashPrices).toHaveBeenCalledWith({ B: 15, D: 13.5, U: 16.5 });
    });

    // Modal should close after a successful save
    await waitFor(() => {
      expect(screen.queryByText('Edit Wash Prices')).not.toBeInTheDocument();
    });

    // Expected total updates: cashB=1 @ $15 + cashD=1 @ $13.50 = $28.50
    expect(screen.getByText(/Expected: \$28\.50/)).toBeInTheDocument();
  });

  // --- Cancel ---

  test('Cancel closes the modal without calling updateWashPrices', async () => {
    render(<VisitsChart />);
    await waitForBreakdown();
    fireEvent.click(screen.getByRole('button', { name: /edit prices/i }));
    expect(screen.getByText('Edit Wash Prices')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText('Edit Wash Prices')).not.toBeInTheDocument();
    });
    expect(settingsCrud.updateWashPrices).not.toHaveBeenCalled();
  });

  // --- Validation ---

  test('shows validation error and blocks save for a negative price', async () => {
    render(<VisitsChart />);
    await waitForBreakdown();
    fireEvent.click(screen.getByRole('button', { name: /edit prices/i }));

    const modal = screen.getByRole('dialog');
    const [basicInput] = within(modal).getAllByRole('spinbutton');
    fireEvent.change(basicInput, { target: { value: '-5' } });

    fireEvent.click(screen.getByRole('button', { name: /save prices/i }));

    expect(screen.getByText(/valid non-negative numbers/i)).toBeInTheDocument();
    expect(settingsCrud.updateWashPrices).not.toHaveBeenCalled();
  });

  test('shows validation error and blocks save for a non-numeric price', async () => {
    render(<VisitsChart />);
    await waitForBreakdown();
    fireEvent.click(screen.getByRole('button', { name: /edit prices/i }));

    const modal = screen.getByRole('dialog');
    const inputs = within(modal).getAllByRole('spinbutton');
    fireEvent.change(inputs[1], { target: { value: 'abc' } }); // Deluxe field

    fireEvent.click(screen.getByRole('button', { name: /save prices/i }));

    expect(screen.getByText(/valid non-negative numbers/i)).toBeInTheDocument();
    expect(settingsCrud.updateWashPrices).not.toHaveBeenCalled();
  });

  // --- Save failure ---

  test('shows error message and keeps modal open when save fails', async () => {
    settingsCrud.updateWashPrices.mockRejectedValue(new Error('Firestore unavailable'));
    render(<VisitsChart />);
    await waitForBreakdown();
    fireEvent.click(screen.getByRole('button', { name: /edit prices/i }));

    fireEvent.click(screen.getByRole('button', { name: /save prices/i }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to save.*Firestore unavailable/i)).toBeInTheDocument();
    });
    // Modal stays open so the user can retry
    expect(screen.getByText('Edit Wash Prices')).toBeInTheDocument();
  });
});
