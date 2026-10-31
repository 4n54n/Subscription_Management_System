import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from '@affine/component';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  billingFrequency: string;
  minQuantity: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  _count?: { subscriptions: number };
}

export const Component = () => {
  const params = useParams();
  const workspaceId = params.workspaceId || 'default';

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('299.00');
  const [billingFrequency, setBillingFrequency] = useState('MONTHLY');
  const [minQuantity, setMinQuantity] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/plans`);
      if (res.ok) {
        const json = await res.json();
        setPlans(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [workspaceId]);

  const handleCreatePlan = async () => {
    if (!name.trim()) {
      toast('Plan name is required.');
      return;
    }
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description,
          price: parseFloat(price) || 0,
          billingFrequency,
          minQuantity: parseInt(minQuantity, 10) || 1,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });

      if (res.ok) {
        toast('Subscription plan created.');
        setShowModal(false);
        setName('');
        setDescription('');
        fetchPlans();
      } else {
        const err = await res.json();
        toast(err.message || 'Failed to create plan.');
      }
    } catch {
      toast('Error saving plan.');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription plan?')) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/plans/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast('Plan deleted.');
        fetchPlans();
      }
    } catch {
      toast('Failed to delete plan.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', backgroundColor: '#f9fafb', color: '#111827', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#2563eb', textTransform: 'uppercase', backgroundColor: '#eff6ff', padding: '3px 8px', borderRadius: '4px' }}>
            Recurring Plans
          </span>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginTop: '6px', marginBottom: '4px' }}>
            Subscription Plans Management
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            Define plan pricing, billing cycles (Daily, Weekly, Monthly, Yearly), minimum quantities, and validity periods.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          + Create Subscription Plan
        </button>
      </div>

      {/* Grid of Plans */}
      {loading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>Loading subscription plans...</div>
      ) : plans.length === 0 ? (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>No subscription plans found.</div>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Create your first plan to start offering recurring subscriptions.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {plans.map(plan => (
            <div key={plan.id} style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>{plan.name}</h3>
                  <span style={{ padding: '3px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, backgroundColor: plan.isActive ? '#dcfce7' : '#f3f4f6', color: plan.isActive ? '#15803d' : '#6b7280' }}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div style={{ fontSize: '28px', fontWeight: 800, color: '#2563eb', margin: '12px 0 6px 0' }}>
                  ${Number(plan.price).toFixed(2)}
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}> / {plan.billingFrequency.toLowerCase()}</span>
                </div>

                {plan.description && (
                  <p style={{ fontSize: '12px', color: '#4b5563', lineHeight: '1.5', margin: '0 0 16px 0' }}>{plan.description}</p>
                )}

                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px', fontSize: '12px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div>Min Quantity: <strong style={{ color: '#111827' }}>{plan.minQuantity}</strong></div>
                  <div>Frequency: <strong style={{ color: '#111827' }}>{plan.billingFrequency}</strong></div>
                  {plan.startDate && <div>Valid From: <strong>{new Date(plan.startDate).toLocaleDateString()}</strong></div>}
                  {plan.endDate && <div>Valid Until: <strong>{new Date(plan.endDate).toLocaleDateString()}</strong></div>}
                  <div>Active Subscriptions: <strong style={{ color: '#2563eb' }}>{plan._count?.subscriptions || 0}</strong></div>
                </div>
              </div>

              <div style={{ marginTop: '20px', borderTop: '1px solid #f3f4f6', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleDeletePlan(plan.id)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}
                >
                  Delete Plan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Plan Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 16px 0', color: '#111827' }}>Create Subscription Plan</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Plan Name</label>
                <input
                  type="text"
                  placeholder="e.g. Pro SaaS Monthly Plan"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Description</label>
                <textarea
                  rows={2}
                  placeholder="Plan features, SLA, and terms..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Price ($)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Billing Frequency</label>
                  <select
                    value={billingFrequency}
                    onChange={e => setBillingFrequency(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box', backgroundColor: '#fff' }}
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Min Quantity</label>
                  <input
                    type="number"
                    value={minQuantity}
                    onChange={e => setMinQuantity(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>End Date (Optional)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
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
                onClick={handleCreatePlan}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Save Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

