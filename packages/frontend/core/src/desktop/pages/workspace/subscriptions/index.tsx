import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from '@affine/component';

interface Subscription {
  id: string;
  subscriptionNumber: string;
  customerId: string;
  customer?: { id: string; name: string; email: string };
  plan?: { id: string; name: string };
  status: string;
  startDate: string;
  expiryDate?: string;
  nextBillingDate: string;
  paymentTerms: string;
  billingFrequency: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  items: Array<{
    id: string;
    product: { name: string };
    variant?: { name: string };
    quantity: number;
    unitPrice: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
  }>;
  invoices: any[];
}

interface Product {
  id: string;
  name: string;
  salesPrice: number;
  variants: Array<{
    id: string;
    name: string;
    priceAdjustment: number;
  }>;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  billingFrequency: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  userRole: string;
}

// IBM Carbon Icons
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M9 7V1H7v6H1v2h6v6h2V9h6V7H9z" />
  </svg>
);

const CycleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M8 1a7 7 0 1 0 7 7h-2a5 5 0 1 1-5-5v3l4-4-4-4v3z" />
  </svg>
);

export const Component = () => {
  const params = useParams();
  const workspaceId = params.workspaceId || 'default';

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingSubId, setClosingSubId] = useState<string | null>(null);
  const [closeReason, setCloseReason] = useState('Requested by customer');

  const [showCreateModal, setShowCreateModal] = useState(false);
  // Create form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('100.00');
  const [taxRate, setTaxRate] = useState('18');
  const [paymentTerms, setPaymentTerms] = useState('Immediate Payment (Net 0)');

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/subscriptions`);
      if (res.ok) {
        const json = await res.json();
        setSubscriptions(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxiliaryData = async () => {
    try {
      const [prodRes, planRes, userRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/brightloop/products`),
        fetch(`/api/workspaces/${workspaceId}/brightloop/plans`),
        fetch(`/api/auth/users`),
      ]);
      if (prodRes.ok) {
        const pJson = await prodRes.json();
        setProducts(pJson);
        if (pJson.length > 0) {
          setSelectedProductId(pJson[0].id);
        }
      }
      if (planRes.ok) {
        const plJson = await planRes.json();
        setPlans(plJson);
        if (plJson.length > 0) {
          setSelectedPlanId(plJson[0].id);
        }
      }
      if (userRes.ok) {
        const uJson = await userRes.json();
        setCustomers(uJson);
        if (uJson.length > 0) {
          setSelectedCustomerId(uJson[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching auxiliary data:', e);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchAuxiliaryData();
  }, [workspaceId]);

  // Recalculate unit price when selected product or variant changes
  useEffect(() => {
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    let base = Number(prod.salesPrice) || 0;
    let adjustment = 0;
    if (selectedVariantId && prod.variants) {
      const v = prod.variants.find(item => item.id === selectedVariantId);
      if (v) {
        adjustment = Number(v.priceAdjustment) || 0;
      }
    }
    const finalPrice = base + adjustment;
    setUnitPrice(finalPrice.toFixed(2));
  }, [selectedProductId, selectedVariantId, products]);

  const handlePause = async (id: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/subscriptions/${id}/pause`, { method: 'POST' });
      if (res.ok) {
        toast('Subscription paused.');
        fetchSubscriptions();
      }
    } catch {
      toast('Failed to pause subscription.');
    }
  };

  const handleResume = async (id: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/subscriptions/${id}/resume`, { method: 'POST' });
      if (res.ok) {
        toast('Subscription resumed & active.');
        fetchSubscriptions();
      }
    } catch {
      toast('Failed to resume subscription.');
    }
  };

  const handleClose = async () => {
    if (!closingSubId) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/subscriptions/${closingSubId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: closeReason }),
      });
      if (res.ok) {
        toast('Subscription closed.');
        setShowCloseModal(false);
        fetchSubscriptions();
      }
    } catch {
      toast('Failed to close subscription.');
    }
  };

  const handleRenew = async (id: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/subscriptions/${id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionMonths: 12 }),
      });
      if (res.ok) {
        toast('Subscription renewed for 12 months.');
        fetchSubscriptions();
      }
    } catch {
      toast('Failed to renew subscription.');
    }
  };

  const handleCreateSubscription = async () => {
    if (!selectedCustomerId || !selectedPlanId || !selectedProductId) {
      toast('Customer, Plan, and Product are required.');
      return;
    }
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          planId: selectedPlanId,
          paymentTerms,
          items: [
            {
              productId: selectedProductId,
              variantId: selectedVariantId || undefined,
              quantity: parseInt(quantity, 10) || 1,
              unitPrice: parseFloat(unitPrice) || 0,
              taxRate: parseFloat(taxRate) || 18,
            },
          ],
        }),
      });

      if (res.ok) {
        toast('Subscription created successfully.');
        setShowCreateModal(false);
        fetchSubscriptions();
      } else {
        const err = await res.json();
        toast(err.message || 'Failed to create subscription.');
      }
    } catch {
      toast('Error saving subscription.');
    }
  };

  const filtered = subscriptions.filter(s => {
    if (filterStatus === 'ALL') return true;
    return s.status === filterStatus;
  });

  const getStatusTagStyle = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'ACTIVE' || s === 'CONFIRMED') {
      return { backgroundColor: '#edf5ff', color: '#0043ce', border: '1px solid #d0e2ff' };
    }
    if (s === 'CLOSED' || s === 'EXPIRED') {
      return { backgroundColor: '#fff1f1', color: '#da1e28', border: '1px solid #ffd7d9' };
    }
    return { backgroundColor: '#f4f4f4', color: '#393939', border: '1px solid #e0e0e0' };
  };

  // Compute live totals for new subscription preview
  const currentProd = products.find(p => p.id === selectedProductId);
  const currentVar = currentProd?.variants?.find(v => v.id === selectedVariantId);
  const qtyNum = parseInt(quantity, 10) || 1;
  const unitNum = parseFloat(unitPrice) || 0;
  const lineSubtotal = qtyNum * unitNum;
  const taxPct = parseFloat(taxRate) || 0;
  const lineTax = (lineSubtotal * taxPct) / 100;
  const lineTotal = lineSubtotal + lineTax;

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
              Lifecycle & Recurring Contracts
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
            Subscriptions Management
          </h1>
          <p style={{ fontSize: '13px', color: '#525252', margin: 0 }}>
            Monitor active subscriptions, automated next billing dates, taxes, pause/renew, and early closures.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
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
            cursor: 'pointer',
            borderRadius: '0px',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#0043ce'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#0f62fe'; }}
        >
          <PlusIcon />
          <span>New Subscription</span>
        </button>
      </div>

      {/* Filter Tabs (IBM Carbon Style) */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '20px', backgroundColor: '#e0e0e0', padding: '2px', width: 'fit-content' }}>
        {['ALL', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED', 'EXPIRED'].map(st => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            style={{
              padding: '6px 14px',
              border: 'none',
              backgroundColor: filterStatus === st ? '#ffffff' : '#f4f4f4',
              color: filterStatus === st ? '#0f62fe' : '#525252',
              fontWeight: filterStatus === st ? 600 : 400,
              fontSize: '12px',
              cursor: 'pointer',
              letterSpacing: '0.32px',
            }}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Subscriptions Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e0e0e0',
        }}
      >
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#525252', fontSize: '13px' }}>
            Loading subscriptions...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#525252', fontSize: '13px' }}>
            No subscriptions matching status "{filterStatus}". Click "New Subscription" or convert a quotation.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: '#f4f4f4',
                  borderBottom: '1px solid #e0e0e0',
                  textAlign: 'left',
                  color: '#161616',
                  fontWeight: 600,
                  fontSize: '12px',
                }}
              >
                <th style={{ padding: '12px 16px' }}>Subscription #</th>
                <th style={{ padding: '12px 16px' }}>Customer</th>
                <th style={{ padding: '12px 16px' }}>Plan / Frequency</th>
                <th style={{ padding: '12px 16px' }}>Products & Brand Variants</th>
                <th style={{ padding: '12px 16px' }}>Next Billing</th>
                <th style={{ padding: '12px 16px' }}>Total Amount</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sub => (
                <tr
                  key={sub.id}
                  style={{
                    borderBottom: '1px solid #e0e0e0',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f4f4f4'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  <td style={{ padding: '14px 16px', verticalAlign: 'top', fontWeight: 500, color: '#0f62fe' }}>
                    {sub.subscriptionNumber}
                    <div style={{ fontSize: '11px', color: '#525252', marginTop: '2px' }}>
                      Started: {new Date(sub.startDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 600, color: '#161616' }}>{sub.customer?.name || 'Customer'}</div>
                    <div style={{ fontSize: '11px', color: '#525252' }}>{sub.customer?.email}</div>
                  </td>
                  <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                    <div style={{ color: '#161616' }}>{sub.plan?.name}</div>
                    <div style={{ fontSize: '11px', color: '#525252' }}>
                      {sub.billingFrequency} ({sub.paymentTerms})
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                    {sub.items?.map((item, idx) => (
                      <div key={idx} style={{ fontSize: '12px', marginBottom: '2px' }}>
                        <strong>{item.product?.name}</strong>
                        {item.variant?.name && (
                          <span style={{ color: '#0043ce', marginLeft: '4px', fontWeight: 500 }}>
                            [{item.variant.name}]
                          </span>
                        )}
                        <span style={{ color: '#525252', marginLeft: '6px' }}>
                          x{item.quantity} @ ${Number(item.unitPrice).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </td>
                  <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 600, color: '#161616' }}>
                      {new Date(sub.nextBillingDate).toLocaleDateString()}
                    </div>
                    {sub.expiryDate && (
                      <div style={{ fontSize: '11px', color: '#8d8d8d' }}>
                        Expires: {new Date(sub.expiryDate).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', verticalAlign: 'top', fontWeight: 600, color: '#161616' }}>
                    ${Number(sub.totalAmount).toFixed(2)}
                    <div style={{ fontSize: '11px', color: '#525252', fontWeight: 400 }}>
                      Tax: ${Number(sub.taxAmount).toFixed(2)}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                    <span
                      style={{
                        padding: '2px 8px',
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
                  <td style={{ padding: '14px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      {sub.status === 'ACTIVE' || sub.status === 'CONFIRMED' ? (
                        <button
                          onClick={() => handlePause(sub.id)}
                          style={{
                            padding: '4px 10px',
                            border: '1px solid #8d8d8d',
                            background: '#ffffff',
                            color: '#161616',
                            fontSize: '11px',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Pause
                        </button>
                      ) : sub.status === 'PAUSED' ? (
                        <button
                          onClick={() => handleResume(sub.id)}
                          style={{
                            padding: '4px 10px',
                            border: '1px solid #0f62fe',
                            background: '#edf5ff',
                            color: '#0043ce',
                            fontSize: '11px',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Resume
                        </button>
                      ) : null}

                      {sub.status !== 'CLOSED' && sub.status !== 'EXPIRED' ? (
                        <button
                          onClick={() => { setClosingSubId(sub.id); setShowCloseModal(true); }}
                          style={{
                            padding: '4px 10px',
                            border: '1px solid #ffd7d9',
                            background: '#fff1f1',
                            color: '#da1e28',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Close Early
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRenew(sub.id)}
                          style={{
                            padding: '4px 10px',
                            border: '1px solid #0f62fe',
                            background: '#0f62fe',
                            color: '#ffffff',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Renew
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Subscription Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(22, 22, 22, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '32px',
              width: '580px',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid #e0e0e0',
              boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ borderBottom: '1px solid #e0e0e0', paddingBottom: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f62fe', textTransform: 'uppercase', letterSpacing: '0.32px' }}>
                Subscription Creation
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 400, margin: '4px 0 0 0', color: '#161616' }}>
                Create New Subscription Contract
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Customer */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#161616', marginBottom: '6px' }}>
                  Customer *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #8d8d8d', fontSize: '13px', backgroundColor: '#ffffff' }}
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.email} ({c.userRole})
                    </option>
                  ))}
                </select>
              </div>

              {/* Subscription Plan */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#161616', marginBottom: '6px' }}>
                  Subscription Plan *
                </label>
                <select
                  value={selectedPlanId}
                  onChange={e => setSelectedPlanId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #8d8d8d', fontSize: '13px', backgroundColor: '#ffffff' }}
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${p.price} / {p.billingFrequency}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product and Variant Selection Section */}
              <div style={{ border: '1px solid #e0e0e0', padding: '16px', backgroundColor: '#f4f4f4' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#161616', display: 'block', marginBottom: '10px' }}>
                  Product Line Item & Brand Variant
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#525252', marginBottom: '4px' }}>
                      Product *
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={e => {
                        setSelectedProductId(e.target.value);
                        setSelectedVariantId('');
                      }}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #8d8d8d', fontSize: '12px', backgroundColor: '#ffffff' }}
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (${Number(p.salesPrice).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Brand Variant: selecting Odoo adds 560 */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#0043ce', marginBottom: '4px' }}>
                      Brand Variant (Modifier)
                    </label>
                    <select
                      value={selectedVariantId}
                      onChange={e => setSelectedVariantId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #0f62fe',
                        fontSize: '12px',
                        backgroundColor: '#edf5ff',
                        color: '#0043ce',
                        fontWeight: 600,
                      }}
                    >
                      <option value="">Standard Base (+ $0.00)</option>
                      {currentProd?.variants?.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({Number(v.priceAdjustment) >= 0 ? `+$${v.priceAdjustment}` : `-$${Math.abs(Number(v.priceAdjustment))}`})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Price, Qty, Tax */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#525252', marginBottom: '4px' }}>
                      Effective Unit Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={unitPrice}
                      onChange={e => setUnitPrice(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #8d8d8d', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                    {currentVar && (
                      <span style={{ fontSize: '10px', color: '#0043ce', marginTop: '2px', display: 'block' }}>
                        Includes {currentVar.name} (+${currentVar.priceAdjustment})
                      </span>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#525252', marginBottom: '4px' }}>
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #8d8d8d', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#525252', marginBottom: '4px' }}>
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      value={taxRate}
                      onChange={e => setTaxRate(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #8d8d8d', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Calculated Line Totals */}
                <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed #c6c6c6', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#525252' }}>Subtotal: </span>
                    <strong>${lineSubtotal.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#525252' }}>Tax ({taxRate}%): </span>
                    <strong>${lineTax.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#0043ce', fontWeight: 700 }}>Total Subscription Price: </span>
                    <strong style={{ fontSize: '14px', color: '#0043ce' }}>${lineTotal.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              {/* Payment Terms */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#161616', marginBottom: '6px' }}>
                  Payment Terms
                </label>
                <select
                  value={paymentTerms}
                  onChange={e => setPaymentTerms(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #8d8d8d', fontSize: '13px', backgroundColor: '#ffffff' }}
                >
                  <option value="Immediate Payment (Net 0)">Immediate Payment (Net 0)</option>
                  <option value="Net 15 Days">Net 15 Days</option>
                  <option value="Net 30 Days">Net 30 Days</option>
                  <option value="Net 60 Days">Net 60 Days</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid #e0e0e0', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '10px 18px',
                  border: '1px solid #8d8d8d',
                  background: '#ffffff',
                  color: '#161616',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateSubscription}
                style={{
                  padding: '10px 22px',
                  border: '1px solid #0f62fe',
                  background: '#0f62fe',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Create Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Early Modal */}
      {showCloseModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(22, 22, 22, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '28px',
              width: '420px',
              border: '1px solid #e0e0e0',
              boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 400, margin: '0 0 12px 0', color: '#161616' }}>
              Close Subscription Early
            </h3>
            <p style={{ fontSize: '13px', color: '#525252', margin: '0 0 16px 0' }}>
              Are you sure you want to transition this subscription into the <strong>Closed</strong> final state?
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#161616', marginBottom: '6px' }}>
                Closure Reason
              </label>
              <input
                type="text"
                value={closeReason}
                onChange={e => setCloseReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #8d8d8d',
                  borderBottom: '2px solid #da1e28',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setShowCloseModal(false)}
                style={{
                  padding: '8px 14px',
                  border: '1px solid #8d8d8d',
                  background: '#ffffff',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleClose}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #da1e28',
                  background: '#da1e28',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Confirm Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
