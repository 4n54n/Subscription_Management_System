import React, { useState, useEffect, useRef, useMemo } from 'react';

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '元', name: 'Chinese Yuan' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'SR', name: 'Saudi Riyal' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
];

export const CurrencyDropdown = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    return CURRENCIES.filter(c =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const selectedCurrency = useMemo(() => {
    return CURRENCIES.find(c => c.symbol === value) || { code: 'INR', symbol: '₹', name: 'Indian Rupee' };
  }, [value]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', fontFamily: 'system-ui, sans-serif' }}>
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '13px',
          backgroundColor: '#fff',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none'
        }}
      >
        <span style={{ color: '#1f2937' }}>
          {selectedCurrency.code} ({selectedCurrency.symbol}) - {selectedCurrency.name}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#4b5563"
          strokeWidth="2.5"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
            marginLeft: '8px'
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          zIndex: 100001,
          padding: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <input
            type="text"
            placeholder="Search currency..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '6px 10px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '12px',
              outline: 'none',
              backgroundColor: '#f9fafb',
              boxSizing: 'border-box'
            }}
          />
          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filtered.map(c => (
              <div
                key={c.code}
                onClick={() => {
                  onChange(c.symbol);
                  setIsOpen(false);
                }}
                style={{
                  padding: '6px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#374151',
                  cursor: 'pointer',
                  backgroundColor: value === c.symbol ? '#f3e8ff' : 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{c.code} - {c.name}</span>
                <span style={{ fontWeight: 600, color: '#6b21a8' }}>{c.symbol}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '8px', fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
                No currency found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
