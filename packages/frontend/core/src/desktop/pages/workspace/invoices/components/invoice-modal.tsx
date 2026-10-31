import React from 'react';
import { createPortal } from 'react-dom';
import { CloseIconSvg, TablerRepeatIcon } from './icons';
import { CurrencyDropdown } from '../../documents-shared/currency-dropdown';
import * as styles from '../../proposals/styles.css';

interface DocModalData {
  visible: boolean;
  mode: 'create' | 'edit';
  invoice?: any | null;
  shortTitle: string;
  invoiceDate?: string;
  dueDate?: string;
  dueDays?: number;
  companyName: string;
  lead: string;
  address: string;
  email: string;
  phone: string;
  gst: string;
  currency: string;
  isRecurringMaster?: boolean;
}

interface InvoiceModalProps {
  docModal: DocModalData;
  setDocModal: React.Dispatch<React.SetStateAction<DocModalData>>;
  onSubmit: () => void;
}

const toInputDateFormat = (dateStr?: string, defaultDaysOffset = 0): string => {
  if (!dateStr) {
    const target = new Date(Date.now() + defaultDaysOffset * 24 * 60 * 60 * 1000);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return dateStr;
};

const calculateDueDateOffset = (dateStr?: string, days = 20): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  let d: Date;
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    d = new Date(year, month, day);
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const InvoiceModal = ({
  docModal,
  setDocModal,
  onSubmit,
}: InvoiceModalProps) => {
  if (!docModal.visible || typeof document === 'undefined') return null;

  const isRecurring = docModal.isRecurringMaster ?? false;

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100000
    }}>
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937', margin: 0 }}>
              {docModal.mode === 'create' ? 'Create New Invoice' : 'Edit Invoice Details'}
            </h3>
            {docModal.mode === 'create' && (
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>
                Set invoice properties, dates, and recurring schedule mode.
              </p>
            )}
          </div>
          <button onClick={() => setDocModal(prev => ({ ...prev, visible: false }))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}>
            <CloseIconSvg />
          </button>
        </div>

        {/* Top Recurring Master Toggle (Only during creation) */}
        {docModal.mode === 'create' && (
          <div style={{
            marginBottom: '16px',
            padding: '12px 14px',
            backgroundColor: isRecurring ? '#eff6ff' : '#f9fafb',
            border: `1px solid ${isRecurring ? '#93c5fd' : '#e5e7eb'}`,
            borderRadius: '8px',
            transition: 'all 0.2s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: isRecurring ? '#dbeafe' : '#f3f4f6',
                  color: isRecurring ? '#2563eb' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}>
                  <TablerRepeatIcon style={{ width: '16px', height: '16px' }} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: isRecurring ? '#1e40af' : '#374151' }}>
                    Recurring Master Invoice
                  </div>
                  <div style={{ fontSize: '11px', color: isRecurring ? '#2563eb' : '#6b7280' }}>
                    Auto-generate monthly, quarterly, or yearly sub-invoices
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <label style={{ position: 'relative', display: 'inline-block', width: '42px', height: '22px', cursor: 'pointer', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setDocModal(prev => ({
                      ...prev,
                      isRecurringMaster: checked,
                      invoiceDate: checked ? (toInputDateFormat() || prev.invoiceDate) : prev.invoiceDate,
                      dueDays: prev.dueDays ?? 20,
                    }));
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: isRecurring ? '#2563eb' : '#cbd5e1',
                  borderRadius: '22px',
                  transition: '0.2s',
                }}>
                  <span style={{
                    position: 'absolute',
                    height: '16px',
                    width: '16px',
                    left: isRecurring ? '23px' : '3px',
                    bottom: '3px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                    transition: '0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </span>
              </label>
            </div>

            {isRecurring && (
              <div style={{
                marginTop: '10px',
                padding: '8px 10px',
                backgroundColor: '#dbeafe',
                borderRadius: '6px',
                fontSize: '11px',
                lineHeight: '1.4',
                color: '#1e3a8a',
                borderLeft: '3px solid #2563eb',
              }}>
                <strong>Note:</strong> When enabled, this becomes a <strong>Recurring Master Template</strong> that spawns payable sub-invoices. The master template itself is non-payable, and once created this cannot be converted back to a standard invoice.
              </div>
            )}
          </div>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Short Title</label>
            <input
              type="text"
              placeholder="e.g. AI PM INVOICE"
              value={docModal.shortTitle}
              onChange={e => setDocModal(prev => ({ ...prev, shortTitle: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>
                {isRecurring ? 'Master invoice created date' : 'Invoice Date'}
              </label>
              {isRecurring ? (
                <input
                  type="date"
                  value={docModal.invoiceDate || toInputDateFormat()}
                  disabled={true}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: '#f3f4f6',
                    cursor: 'not-allowed',
                    color: '#6b7280',
                  }}
                />
              ) : (
                <input
                  type="date"
                  value={docModal.invoiceDate || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setDocModal(prev => ({
                      ...prev,
                      invoiceDate: val,
                      dueDate: calculateDueDateOffset(val, prev.dueDays ?? 20) || prev.dueDate,
                    }));
                  }}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                />
              )}
            </div>
            {isRecurring ? (
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>
                  Payment Due In (Days)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    placeholder="20"
                    value={docModal.dueDays ?? 20}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      setDocModal(prev => ({
                        ...prev,
                        dueDays: isNaN(val) ? undefined : val,
                      }));
                    }}
                    style={{ width: '100%', padding: '8px 45px 8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                  />
                  <span style={{ position: 'absolute', right: '12px', fontSize: '12px', color: '#6b7280', fontWeight: 500, pointerEvents: 'none' }}>
                    Days
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Due Date</label>
                <input
                  type="date"
                  value={docModal.dueDate || ''}
                  onChange={e => setDocModal(prev => ({ ...prev, dueDate: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                />
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Client Company Name</label>
            <input
              type="text"
              placeholder="e.g. Example Company Inc."
              value={docModal.companyName}
              onChange={e => setDocModal(prev => ({ ...prev, companyName: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Client Contact (Lead)</label>
            <input
              type="text"
              placeholder="e.g. Sarah Jenkins · Chief Information Officer"
              value={docModal.lead}
              onChange={e => setDocModal(prev => ({ ...prev, lead: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Client Address</label>
            <input
              type="text"
              placeholder="e.g. No.100 Pine Street, Suite 2400, San Francisco, CA 94111"
              value={docModal.address}
              onChange={e => setDocModal(prev => ({ ...prev, address: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Client Email</label>
              <input
                type="text"
                placeholder="e.g. sarah.jenkins@example.com"
                value={docModal.email}
                onChange={e => setDocModal(prev => ({ ...prev, email: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Client Phone</label>
              <input
                type="text"
                placeholder="e.g. +1 (555) 902-3481"
                value={docModal.phone}
                onChange={e => setDocModal(prev => ({ ...prev, phone: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Client GSTIN</label>
              <input
                type="text"
                placeholder="e.g. [Client GSTIN]"
                value={docModal.gst}
                onChange={e => setDocModal(prev => ({ ...prev, gst: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Currency Symbol</label>
              <CurrencyDropdown
                value={docModal.currency}
                onChange={val => setDocModal(prev => ({ ...prev, currency: val }))}
              />
            </div>
          </div>
        </div>

        <button
          className={styles.btnPrimary}
          style={{ width: '100%', padding: '10px', fontWeight: 600 }}
          onClick={onSubmit}
        >
          {docModal.mode === 'create' ? 'Create Document' : 'Save Properties'}
        </button>
      </div>
    </div>,
    document.body
  );
};
