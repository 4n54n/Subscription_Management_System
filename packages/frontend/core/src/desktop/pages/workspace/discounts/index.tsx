import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from '@affine/component';

interface DiscountRule {
  id: string;
  code: string;
  description?: string;
  discountType: string;
  value: number;
  minPurchase: number;
  minQuantity: number;
  startDate?: string;
  endDate?: string;
  maxUses?: number;
  currentUses: number;
  appliesToAll: boolean;
  isActive: boolean;
  product?: { name: string };
}

export const Component = () => {
  const params = useParams();
  const workspaceId = params.workspaceId || 'default';

  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [value, setValue] = useState('10');
  const [minPurchase, setMinPurchase] = useState('0');
  const [minQuantity, setMinQuantity] = useState('1');
  const [maxUses, setMaxUses] = useState('100');
  const [endDate, setEndDate] = useState('');

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/discounts`);
      if (res.ok) {
        const json = await res.json();
        setDiscounts(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, [workspaceId]);

  const handleCreateDiscount = async () => {
    if (!code.trim()) {
      toast('Discount code is required.');
      return;
    }
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/discounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          description,
          discountType,
          value: parseFloat(value) || 0,
          minPurchase: parseFloat(minPurchase) || 0,
          minQuantity: parseInt(minQuantity, 10) || 1,
          maxUses: parseInt(maxUses, 10) || undefined,
          endDate: endDate || undefined,
          appliesToAll: true,
        }),
      });

      if (res.ok) {
        toast('Discount rule created.');
        setShowModal(false);
        setCode('');
        setDescription('');
        fetchDiscounts();
      } else {
        const err = await res.json();
        toast(err.message || 'Failed to create discount.');
      }
    } catch {
      toast('Error saving discount.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount rule?')) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/discounts/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast('Discount deleted.');
        fetchDiscounts();
      }
    } catch {
      toast('Failed to delete discount.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', backgroundColor: '#f9fafb', color: '#111827', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#2563eb', textTransform: 'uppercase', backgroundColor: '#eff6ff', padding: '3px 8px', borderRadius: '4px' }}>
            Promotions & Rules
          </span>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginTop: '6px', marginBottom: '4px' }}>
            Discount Rules Management
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            Configure fixed or percentage-based discount rules, minimum purchase requirements, and maximum usage caps.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          + Create Discount Rule
        </button>
      </div>

      {/* Discounts Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>Loading discount rules...</div>
        ) : discounts.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
            No discount rules found. Click "+ Create Discount Rule" to create fixed or percentage discounts.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#4b5563', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Discount Code</th>
                <th style={{ padding: '12px 16px' }}>Type & Value</th>
                <th style={{ padding: '12px 16px' }}>Conditions</th>
                <th style={{ padding: '12px 16px' }}>Usage / Max</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827' }}>
                    <span style={{ backgroundColor: '#f3f4f6', padding: '3px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
                      {d.code}
                    </span>
                    {d.description && <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400, marginTop: '2px' }}>{d.description}</div>}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#2563eb' }}>
                    {d.discountType === 'PERCENTAGE' ? `${d.value}% Off` : `$${d.value} Off`}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '12px' }}>
                    <div>Min Purchase: <strong>${Number(d.minPurchase).toFixed(2)}</strong></div>
                    <div>Min Qty: <strong>{d.minQuantity}</strong></div>
                    {d.endDate && <div>Valid Until: <strong>{new Date(d.endDate).toLocaleDateString()}</strong></div>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{d.currentUses} / {d.maxUses || '∞'}</div>
                    <div style={{ width: '100px', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (d.currentUses / (d.maxUses || 100)) * 100)}%`, height: '100%', backgroundColor: '#2563eb' }} />
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700,
                      backgroundColor: d.isActive ? '#dcfce7' : '#f3f4f6',
                      color: d.isActive ? '#15803d' : '#6b7280'
                    }}>
                      {d.isActive ? 'Active' : 'Expired'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(d.id)}
                      style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 16px 0', color: '#111827' }}>Create Discount Rule</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Discount Code</label>
                <input
                  type="text"
                  placeholder="e.g. BRIGHT20"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Description</label>
                <input
                  type="text"
                  placeholder="e.g. 20% off for new subscription signups"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Discount Type</label>
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box', backgroundColor: '#fff' }}
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount ($)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    {discountType === 'PERCENTAGE' ? 'Discount Percentage (%)' : 'Discount Value ($)'}
                  </label>
                  <input
                    type="number"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Min Purchase ($)</label>
                  <input
                    type="number"
                    value={minPurchase}
                    onChange={e => setMinPurchase(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Max Total Uses</label>
                  <input
                    type="number"
                    value={maxUses}
                    onChange={e => setMaxUses(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Expiration Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDiscount}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

