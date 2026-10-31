import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from '@affine/component';

interface DashboardData {
  activeSubscriptions: number;
  totalRevenue: number;
  outstandingPayments: number;
  overdueInvoices: number;
  recentInvoices: any[];
  recentSubscriptions: any[];
  generatedAt: string;
}

// IBM Carbon Style SVGs
const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M13.65 3.88A6.98 6.98 0 0 0 8 1C4.13 1 1 4.13 1 8s3.13 7 7 7c3.15 0 5.86-2.07 6.72-5h-1.55A5.5 5.5 0 0 1 8 13.5 5.5 5.5 0 0 1 2.5 8 5.5 5.5 0 0 1 8 2.5c1.47 0 2.8.58 3.78 1.52L9 6.8h6V.8l-1.35 1.58z" />
  </svg>
);

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M4 2v12l10-6L4 2z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '4px' }}>
    <path d="M9.3 3.3L8 4.6l3.4 3.4H1v2h10.4L8 13.4l1.3 1.3L15 9.4z" />
  </svg>
);

const TableEmptyIcon = () => (
  <svg width="24" height="24" viewBox="0 0 16 16" fill="#8d8d8d" style={{ display: 'block', margin: '0 auto 8px auto' }}>
    <path d="M14 2H2C1.4 2 1 2.4 1 3v10c0 .6.4 1 1 1h12c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1zm-1 2v2H3V4h10zm-10 4h10v5H3V8z" />
  </svg>
);

export const Component = () => {
  const params = useParams();
  const workspaceId = params.workspaceId || 'default';
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningBilling, setRunningBilling] = useState(false);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/dashboard`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [workspaceId]);

  const handleRunBilling = async () => {
    try {
      setRunningBilling(true);
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/invoices/generate-due`, {
        method: 'POST',
      });
      if (res.ok) {
        const generated = await res.json();
        toast(`Billing Engine: Generated ${generated.length} automated recurring invoices.`);
        fetchMetrics();
      } else {
        toast('Failed to run automated recurring billing engine.');
      }
    } catch {
      toast('Error triggering billing run.');
    } finally {
      setRunningBilling(false);
    }
  };

  // Helper for IBM Carbon status tag styling
  const getStatusTagStyle = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'PAID' || s === 'ACTIVE' || s === 'CONFIRMED') {
      return {
        backgroundColor: '#edf5ff',
        color: '#0043ce',
        border: '1px solid #d0e2ff',
      };
    }
    if (s === 'OVERDUE' || s === 'CLOSED' || s === 'EXPIRED') {
      return {
        backgroundColor: '#fff1f1',
        color: '#da1e28',
        border: '1px solid #ffd7d9',
      };
    }
    // Pending / Paused / Draft
    return {
      backgroundColor: '#f4f4f4',
      color: '#393939',
      border: '1px solid #e0e0e0',
    };
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        backgroundColor: '#f4f4f4',
        color: '#161616',
        fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: '32px 40px',
      }}
    >
      {/* Carbon App Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '28px',
          borderBottom: '1px solid #e0e0e0',
          paddingBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.32px',
                color: '#0f62fe',
                textTransform: 'uppercase',
                backgroundColor: '#edf5ff',
                padding: '2px 8px',
                border: '1px solid #d0e2ff',
              }}
            >
              Brightloop Software ERP
            </span>
          </div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 400,
              color: '#161616',
              margin: '0 0 4px 0',
              letterSpacing: '-0.3px',
            }}
          >
            Subscription & Revenue Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: '#525252', margin: 0 }}>
            Centralized financial intelligence, recurring billing lifecycle, and subscription analytics.
          </p>
        </div>

        {/* Action Buttons in IBM Carbon Blue Theme */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              border: '1px solid #0f62fe',
              background: '#ffffff',
              color: '#0f62fe',
              fontSize: '13px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              borderRadius: '0px',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#edf5ff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ffffff'; }}
          >
            <RefreshIcon />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleRunBilling}
            disabled={runningBilling}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              border: '1px solid #0f62fe',
              background: '#0f62fe',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: runningBilling ? 'not-allowed' : 'pointer',
              borderRadius: '0px',
              opacity: runningBilling ? 0.75 : 1,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={e => { if (!runningBilling) (e.currentTarget as HTMLElement).style.backgroundColor = '#0043ce'; }}
            onMouseLeave={e => { if (!runningBilling) (e.currentTarget as HTMLElement).style.backgroundColor = '#0f62fe'; }}
          >
            <PlayIcon />
            <span>{runningBilling ? 'Running Billing Engine...' : 'Run Recurring Billing Engine'}</span>
          </button>
        </div>
      </div>

      {/* KPI Tiles (IBM Carbon Grid Style) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {/* Active Subscriptions */}
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '20px 24px',
            border: '1px solid #e0e0e0',
            borderTop: '3px solid #0f62fe',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.32px' }}>
            Active Subscriptions
          </div>
          <div style={{ fontSize: '36px', fontWeight: 300, color: '#161616', marginTop: '10px', lineHeight: 1.1 }}>
            {loading ? '—' : data?.activeSubscriptions ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: '#525252', marginTop: '10px' }}>
            Active & Confirmed recurring plans
          </div>
        </div>

        {/* Revenue Received */}
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '20px 24px',
            border: '1px solid #e0e0e0',
            borderTop: '3px solid #0f62fe',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.32px' }}>
            Revenue Received
          </div>
          <div style={{ fontSize: '36px', fontWeight: 300, color: '#161616', marginTop: '10px', lineHeight: 1.1 }}>
            ${loading ? '—' : (data?.totalRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: '#525252', marginTop: '10px' }}>
            Total reconciled payments
          </div>
        </div>

        {/* Outstanding Balance */}
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '20px 24px',
            border: '1px solid #e0e0e0',
            borderTop: '3px solid #0f62fe',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.32px' }}>
            Outstanding Balance
          </div>
          <div style={{ fontSize: '36px', fontWeight: 300, color: '#161616', marginTop: '10px', lineHeight: 1.1 }}>
            ${loading ? '—' : (data?.outstandingPayments ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: '#525252', marginTop: '10px' }}>
            Unpaid invoice balances
          </div>
        </div>

        {/* Overdue Invoices */}
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '20px 24px',
            border: '1px solid #e0e0e0',
            borderTop: '3px solid #0f62fe',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.32px' }}>
            Overdue Invoices
          </div>
          <div style={{ fontSize: '36px', fontWeight: 300, color: '#161616', marginTop: '10px', lineHeight: 1.1 }}>
            {loading ? '—' : data?.overdueInvoices ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: '#525252', marginTop: '10px' }}>
            Past due date requiring follow-up
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Invoices & Recent Subscriptions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Recent Invoices Tile */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e0e0e0',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f4f4f4',
            }}
          >
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#161616', margin: 0 }}>
              Recent Invoices
            </h2>
            <Link
              to={`/workspace/${workspaceId}/invoices`}
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#0f62fe',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              View all invoices <ArrowRightIcon />
            </Link>
          </div>

          <div style={{ flex: 1, padding: 0 }}>
            {loading ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#525252', fontSize: '13px' }}>
                Loading recent invoices...
              </div>
            ) : !data?.recentInvoices || data.recentInvoices.length === 0 ? (
              <div style={{ padding: '36px 24px', textAlign: 'center', color: '#525252', fontSize: '13px' }}>
                <TableEmptyIcon />
                No invoices generated yet. Click "Run Recurring Billing Engine" or create subscriptions to generate invoices.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e0e0e0', textAlign: 'left', color: '#525252', fontWeight: 600, fontSize: '12px' }}>
                    <th style={{ padding: '10px 16px' }}>Invoice #</th>
                    <th style={{ padding: '10px 16px' }}>Customer</th>
                    <th style={{ padding: '10px 16px' }}>Amount</th>
                    <th style={{ padding: '10px 16px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentInvoices.map((inv: any) => (
                    <tr
                      key={inv.id}
                      style={{ borderBottom: '1px solid #f4f4f4', transition: 'background-color 0.1s ease' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#edf5ff'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f62fe' }}>
                        {inv.invoiceNumber}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#161616' }}>
                        {inv.customer?.name || inv.customer?.email}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#161616' }}>
                        ${Number(inv.totalAmount).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '0px',
                            fontSize: '11px',
                            fontWeight: 600,
                            letterSpacing: '0.32px',
                            textTransform: 'uppercase',
                            ...getStatusTagStyle(inv.status),
                          }}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Subscriptions Tile */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e0e0e0',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f4f4f4',
            }}
          >
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#161616', margin: 0 }}>
              Recent Subscriptions
            </h2>
            <Link
              to={`/workspace/${workspaceId}/subscriptions`}
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#0f62fe',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Manage all subscriptions <ArrowRightIcon />
            </Link>
          </div>

          <div style={{ flex: 1, padding: 0 }}>
            {loading ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#525252', fontSize: '13px' }}>
                Loading recent subscriptions...
              </div>
            ) : !data?.recentSubscriptions || data.recentSubscriptions.length === 0 ? (
              <div style={{ padding: '36px 24px', textAlign: 'center', color: '#525252', fontSize: '13px' }}>
                <TableEmptyIcon />
                No active subscriptions found. Create a quotation or subscription to begin recurring billing.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e0e0e0', textAlign: 'left', color: '#525252', fontWeight: 600, fontSize: '12px' }}>
                    <th style={{ padding: '10px 16px' }}>Sub #</th>
                    <th style={{ padding: '10px 16px' }}>Customer</th>
                    <th style={{ padding: '10px 16px' }}>Plan / Frequency</th>
                    <th style={{ padding: '10px 16px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSubscriptions.map((sub: any) => (
                    <tr
                      key={sub.id}
                      style={{ borderBottom: '1px solid #f4f4f4', transition: 'background-color 0.1s ease' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#edf5ff'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f62fe' }}>
                        {sub.subscriptionNumber}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#161616' }}>
                        {sub.customer?.name || sub.customer?.email}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#161616' }}>
                        {sub.plan?.name}{' '}
                        <span style={{ color: '#525252', fontSize: '11px' }}>({sub.billingFrequency})</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '0px',
                            fontSize: '11px',
                            fontWeight: 600,
                            letterSpacing: '0.32px',
                            textTransform: 'uppercase',
                            ...getStatusTagStyle(sub.status),
                          }}
                        >
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
