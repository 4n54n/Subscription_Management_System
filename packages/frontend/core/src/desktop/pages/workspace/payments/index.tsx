import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from '@affine/component';

interface PaymentRecord {
  id: string;
  paymentNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    customer: { name: string; email: string };
  };
}

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  balanceAmount: number;
  customer?: { name: string; email: string };
}

export const Component = () => {
  const params = useParams();
  const workspaceId = params.workspaceId || 'default';

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [payRes, invRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/brightloop/payments`),
        fetch(`/api/workspaces/${workspaceId}/brightloop/invoices`),
      ]);

      if (payRes.ok) {
        const json = await payRes.json();
        setPayments(json);
      }

      if (invRes.ok) {
        const json = await invRes.json();
        setInvoices(json);
        const unpaid = json.find((i: any) => Number(i.balanceAmount) > 0);
        if (unpaid) {
          setSelectedInvoiceId(unpaid.id);
          setAmount(String(unpaid.balanceAmount));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [workspaceId]);

  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = invoices.find(i => i.id === invId);
    if (inv) {
      setAmount(String(inv.balanceAmount));
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoiceId || !amount || parseFloat(amount) <= 0) {
      toast('Please select an invoice and enter a valid payment amount.');
      return;
    }

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoiceId,
          amount: parseFloat(amount),
          paymentMethod,
          referenceNumber,
          notes,
        }),
      });

      if (res.ok) {
        toast('Payment recorded and reconciled against invoice.');
        setShowModal(false);
        setReferenceNumber('');
        setNotes('');
        fetchData();
      } else {
        const err = await res.json();
        toast(err.message || 'Failed to record payment.');
      }
    } catch {
      toast('Error saving payment record.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', backgroundColor: '#f9fafb', color: '#111827', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#2563eb', textTransform: 'uppercase', backgroundColor: '#eff6ff', padding: '3px 8px', borderRadius: '4px' }}>
            Financial Reconciliation
          </span>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginTop: '6px', marginBottom: '4px' }}>
            Payment Management & Tracking
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            Record payments, reconcile invoices in real time, and audit transaction logs.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          + Record Payment
        </button>
      </div>

      {/* Payments Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>Loading payment records...</div>
        ) : payments.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
            No payments recorded yet. Click "+ Record Payment" to reconcile outstanding invoices.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#4b5563', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Payment #</th>
                <th style={{ padding: '12px 16px' }}>Reconciled Invoice</th>
                <th style={{ padding: '12px 16px' }}>Customer</th>
                <th style={{ padding: '12px 16px' }}>Method & Ref</th>
                <th style={{ padding: '12px 16px' }}>Payment Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827' }}>
                    {p.paymentNumber}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#2563eb' }}>
                    {p.invoice?.invoiceNumber}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {p.invoice?.customer?.name || p.invoice?.customer?.email}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#f3f4f6', color: '#374151' }}>
                      {p.paymentMethod.replace('_', ' ')}
                    </span>
                    {p.referenceNumber && (
                      <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '6px' }}>Ref: {p.referenceNumber}</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#6b7280' }}>
                    {new Date(p.paymentDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#10b981', textAlign: 'right' }}>
                    +${Number(p.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Record Payment Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 16px 0', color: '#111827' }}>Record Invoice Payment</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Target Invoice</label>
                <select
                  value={selectedInvoiceId}
                  onChange={e => handleInvoiceChange(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box', backgroundColor: '#fff' }}
                >
                  <option value="">Select Invoice...</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - Balance: ${Number(inv.balanceAmount).toFixed(2)} ({inv.customer?.name || 'Customer'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Amount to Pay ($)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box', backgroundColor: '#fff' }}
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Reference / Cheque Number</label>
                <input
                  type="text"
                  placeholder="e.g. TXN-9988224, Cheque #00441"
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Payment Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional payment notes or terms..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
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
                onClick={handleRecordPayment}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

