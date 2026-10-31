import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from '@affine/component';

interface Variant {
  id?: string;
  name: string;
  variantType: string;
  priceAdjustment: number;
  sku?: string;
}

interface Product {
  id: string;
  name: string;
  productType: string;
  salesPrice: number;
  costPrice: number;
  notes?: string;
  variants: Variant[];
  createdAt: string;
}

// IBM Carbon Icons
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M9 7V1H7v6H1v2h6v6h2V9h6V7H9z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M6 6h1v6H6V6zm3 0h1v6H9V6zm4-3v1H3V3h2.5l1-1h3l1 1H13zM4 5h8v9c0 .6-.4 1-1 1H5c-.6 0-1-.4-1-1V5z" />
  </svg>
);

const TagIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M14.7 8.3L8.4 2H3C2.4 2 2 2.4 2 3v5.4l6.3 6.3c.4.4 1 .4 1.4 0l5-5c.4-.4.4-1 0-1.4zM5 6c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z" />
  </svg>
);

const CalculatorIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M13 1H3C2.4 1 2 1.4 2 2v12c0 .6.4 1 1 1h10c.6 0 1-.4 1-1V2c0-.6-.4-1-1-1zm-1 2v3H4V3h8zm-8 10V8h2v2H4v3zm3 0v-2h2v2H7zm0-3v-2h2v2H7zm3 3v-5h2v5h-2z" />
  </svg>
);

export const Component = () => {
  const params = useParams();
  const workspaceId = params.workspaceId || 'default';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Selected variant per product for real-time live price calculation: { [productId]: variantId }
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  // Product Form states
  const [name, setName] = useState('');
  const [productType, setProductType] = useState('SERVICE');
  const [salesPrice, setSalesPrice] = useState('100.00');
  const [costPrice, setCostPrice] = useState('50.00');
  const [notes, setNotes] = useState('');
  const [initialVariants, setInitialVariants] = useState<Variant[]>([
    { name: 'Standard Brand', variantType: 'brand', priceAdjustment: 0 },
    { name: 'Odoo Brand', variantType: 'brand', priceAdjustment: 560 },
  ]);

  // Dynamic new variant inputs in create modal
  const [newVarName, setNewVarName] = useState('');
  const [newVarPrice, setNewVarPrice] = useState('');

  // Add Variant to Existing Product Form
  const [varName, setVarName] = useState('');
  const [varType, setVarType] = useState('brand');
  const [varPriceAdj, setVarPriceAdj] = useState('0');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/products`);
      if (res.ok) {
        const json = await res.json();
        setProducts(json);

        // Pre-select first variant or Odoo brand if available
        const initialSelections: Record<string, string> = {};
        json.forEach((p: Product) => {
          if (p.variants && p.variants.length > 0) {
            // Find Odoo Brand if exists, else first
            const odooVar = p.variants.find(v => v.name.toLowerCase().includes('odoo'));
            initialSelections[p.id] = odooVar?.id || p.variants[0].id || '';
          }
        });
        setSelectedVariants(prev => ({ ...initialSelections, ...prev }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [workspaceId]);

  const handleCreateProduct = async () => {
    if (!name.trim()) {
      toast('Product name is required.');
      return;
    }
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          productType,
          salesPrice: parseFloat(salesPrice) || 0,
          costPrice: parseFloat(costPrice) || 0,
          notes,
          variants: initialVariants,
        }),
      });

      if (res.ok) {
        toast('Product and variants created successfully.');
        setShowModal(false);
        setName('');
        setNotes('');
        setSalesPrice('100.00');
        setCostPrice('50.00');
        setInitialVariants([
          { name: 'Standard Brand', variantType: 'brand', priceAdjustment: 0 },
          { name: 'Odoo Brand', variantType: 'brand', priceAdjustment: 560 },
        ]);
        fetchProducts();
      } else {
        const err = await res.json();
        toast(err.message || 'Failed to create product.');
      }
    } catch {
      toast('Error saving product.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/products/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast('Product removed.');
        fetchProducts();
      }
    } catch {
      toast('Failed to delete product.');
    }
  };

  const handleAddVariant = async () => {
    if (!selectedProductId || !varName.trim()) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/products/${selectedProductId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: varName.trim(),
          variantType: varType,
          priceAdjustment: parseFloat(varPriceAdj) || 0,
        }),
      });
      if (res.ok) {
        toast('Variant added.');
        setShowVariantModal(false);
        setVarName('');
        setVarPriceAdj('0');
        fetchProducts();
      }
    } catch {
      toast('Failed to add variant.');
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/variants/${variantId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast('Variant removed.');
        fetchProducts();
      }
    } catch {
      toast('Failed to remove variant.');
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.productType.toLowerCase().includes(search.toLowerCase())
  );

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
              Product Catalog & Pricing
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
            Products & Variants Management
          </h1>
          <p style={{ fontSize: '13px', color: '#525252', margin: 0 }}>
            Configure sales price, cost price, and brand variant adjustments (e.g. selecting Odoo brand dynamically adds +560 to price).
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
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
          <span>Add New Product</span>
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search products by name or type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '360px',
            padding: '10px 14px',
            backgroundColor: '#ffffff',
            border: '1px solid #8d8d8d',
            borderBottom: '2px solid #0f62fe',
            fontSize: '13px',
            outline: 'none',
            color: '#161616',
          }}
        />
        <div style={{ fontSize: '12px', color: '#525252' }}>
          Showing {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
        </div>
      </div>

      {/* Product List Table (IBM Carbon Data Table) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e0e0e0',
        }}
      >
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#525252', fontSize: '13px' }}>
            Loading products catalog...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#525252', fontSize: '13px' }}>
            No products found. Click "Add New Product" to create products and brand variants.
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
                <th style={{ padding: '12px 16px' }}>Product & Notes</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Base Sales Price</th>
                <th style={{ padding: '12px 16px' }}>Cost Price</th>
                <th style={{ padding: '12px 16px' }}>Brand Variants (Modifiers)</th>
                <th style={{ padding: '12px 16px', backgroundColor: '#edf5ff', color: '#0043ce' }}>
                  Live Variant Price (Selector)
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const selectedVarId = selectedVariants[p.id];
                const activeVariant = p.variants?.find(v => v.id === selectedVarId);
                const priceAdjustment = activeVariant ? Number(activeVariant.priceAdjustment) : 0;
                const effectivePrice = Number(p.salesPrice) + priceAdjustment;
                const margin = effectivePrice - Number(p.costPrice);

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid #e0e0e0',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f4f4f4'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                  >
                    {/* Name & Notes */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600, color: '#161616' }}>{p.name}</div>
                      {p.notes && (
                        <div style={{ fontSize: '12px', color: '#525252', marginTop: '2px' }}>
                          {p.notes}
                        </div>
                      )}
                    </td>

                    {/* Type */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: '#f4f4f4',
                          color: '#393939',
                          border: '1px solid #e0e0e0',
                          textTransform: 'uppercase',
                        }}
                      >
                        {p.productType}
                      </span>
                    </td>

                    {/* Sales Price */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'top', fontWeight: 600, color: '#161616' }}>
                      ${Number(p.salesPrice).toFixed(2)}
                    </td>

                    {/* Cost Price */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'top', color: '#525252' }}>
                      ${Number(p.costPrice).toFixed(2)}
                    </td>

                    {/* Brand Variants */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                          {p.variants?.map(v => (
                            <span
                              key={v.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '2px 8px',
                                fontSize: '11px',
                                backgroundColor: '#edf5ff',
                                color: '#0043ce',
                                border: '1px solid #d0e2ff',
                              }}
                            >
                              <TagIcon />
                              <span>{v.name}:</span>
                              <span style={{ fontWeight: 700 }}>
                                {Number(v.priceAdjustment) >= 0 ? `+$${Number(v.priceAdjustment).toFixed(2)}` : `-$${Math.abs(Number(v.priceAdjustment)).toFixed(2)}`}
                              </span>
                              <button
                                onClick={() => handleDeleteVariant(v.id!)}
                                title="Remove variant"
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#da1e28',
                                  cursor: 'pointer',
                                  padding: '0 2px',
                                  fontSize: '13px',
                                  lineHeight: 1,
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>

                        <div>
                          <button
                            onClick={() => {
                              setSelectedProductId(p.id);
                              setShowVariantModal(true);
                            }}
                            style={{
                              border: '1px dashed #0f62fe',
                              background: 'transparent',
                              padding: '2px 8px',
                              fontSize: '11px',
                              color: '#0f62fe',
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                          >
                            + Add Brand / Variant
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Dynamic Variant Selector & Real-Time Calculated Price */}
                    <td
                      style={{
                        padding: '14px 16px',
                        verticalAlign: 'top',
                        backgroundColor: '#f8f9fa',
                        borderLeft: '1px solid #e0e0e0',
                        borderRight: '1px solid #e0e0e0',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CalculatorIcon />
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#525252' }}>
                            Select Brand:
                          </label>
                        </div>
                        <select
                          value={selectedVarId || ''}
                          onChange={e => setSelectedVariants({ ...selectedVariants, [p.id]: e.target.value })}
                          style={{
                            padding: '4px 8px',
                            border: '1px solid #0f62fe',
                            backgroundColor: '#ffffff',
                            color: '#161616',
                            fontSize: '12px',
                            fontWeight: 500,
                            outline: 'none',
                          }}
                        >
                          <option value="">Base Product (No Variant: +$0.00)</option>
                          {p.variants?.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.name} ({Number(v.priceAdjustment) >= 0 ? `+$${v.priceAdjustment}` : `-$${Math.abs(Number(v.priceAdjustment))}`})
                            </option>
                          ))}
                        </select>

                        <div style={{ fontSize: '12px', marginTop: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#525252' }}>
                            <span>Calculation:</span>
                            <span>${Number(p.salesPrice).toFixed(2)} + ${priceAdjustment.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', fontWeight: 700, color: '#0043ce', fontSize: '13px' }}>
                            <span>Final Price:</span>
                            <span>${effectivePrice.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', fontSize: '11px', color: '#525252' }}>
                            <span>Est. Margin:</span>
                            <span style={{ color: margin >= 0 ? '#0043ce' : '#da1e28' }}>${margin.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #ffd7d9',
                          background: '#fff1f1',
                          color: '#da1e28',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <TrashIcon />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Product Modal (IBM Carbon Style) */}
      {showModal && (
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
              width: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid #e0e0e0',
              boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ borderBottom: '1px solid #e0e0e0', paddingBottom: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f62fe', textTransform: 'uppercase', letterSpacing: '0.32px' }}>
                Catalog Configuration
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 400, margin: '4px 0 0 0', color: '#161616' }}>
                Create New Product
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#161616', marginBottom: '6px' }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cloud ERP Core Suite"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #8d8d8d',
                    borderBottom: '2px solid #0f62fe',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#161616', marginBottom: '6px' }}>
                    Product Type
                  </label>
                  <select
                    value={productType}
                    onChange={e => setProductType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #8d8d8d',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                    }}
                  >
                    <option value="SERVICE">Service</option>
                    <option value="SOFTWARE">Software</option>
                    <option value="SUBSCRIPTION">Subscription</option>
                    <option value="PHYSICAL">Physical</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#161616', marginBottom: '6px' }}>
                    Sales Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={salesPrice}
                    onChange={e => setSalesPrice(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #8d8d8d',
                      borderBottom: '2px solid #0f62fe',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#161616', marginBottom: '6px' }}>
                  Cost Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={costPrice}
                  onChange={e => setCostPrice(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #8d8d8d',
                    borderBottom: '2px solid #0f62fe',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#161616', marginBottom: '6px' }}>
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional internal notes or product descriptions..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #8d8d8d',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Product Variants (e.g. Odoo brand adds 560) */}
              <div style={{ border: '1px solid #e0e0e0', padding: '16px', backgroundColor: '#f4f4f4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#161616' }}>
                    Brand Variants & Pricing Adjustments
                  </label>
                  <span style={{ fontSize: '11px', color: '#525252' }}>
                    Example: Odoo brand adds +560.00
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {initialVariants.map((v, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#ffffff',
                        padding: '8px 12px',
                        border: '1px solid #e0e0e0',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TagIcon />
                        <strong>{v.name}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: 600, color: '#0043ce' }}>
                          {Number(v.priceAdjustment) >= 0 ? `+$${Number(v.priceAdjustment).toFixed(2)}` : `-$${Math.abs(Number(v.priceAdjustment)).toFixed(2)}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setInitialVariants(initialVariants.filter((_, i) => i !== idx))}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#da1e28',
                            cursor: 'pointer',
                            fontSize: '14px',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add dynamic variant in modal */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Brand name (e.g. Enterprise Edition)"
                    value={newVarName}
                    onChange={e => setNewVarName(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #8d8d8d', backgroundColor: '#ffffff' }}
                  />
                  <input
                    type="number"
                    placeholder="Adj (+/-)"
                    value={newVarPrice}
                    onChange={e => setNewVarPrice(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #8d8d8d', backgroundColor: '#ffffff' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newVarName.trim()) return;
                      setInitialVariants([
                        ...initialVariants,
                        { name: newVarName.trim(), variantType: 'brand', priceAdjustment: parseFloat(newVarPrice) || 0 },
                      ]);
                      setNewVarName('');
                      setNewVarPrice('');
                    }}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #0f62fe',
                      backgroundColor: '#0f62fe',
                      color: '#ffffff',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid #e0e0e0', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
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
                onClick={handleCreateProduct}
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
                Save Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Variant to Existing Product Modal */}
      {showVariantModal && (
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
            <div style={{ borderBottom: '1px solid #e0e0e0', paddingBottom: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f62fe', textTransform: 'uppercase', letterSpacing: '0.32px' }}>
                Variant Configuration
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: 400, margin: '4px 0 0 0', color: '#161616' }}>
                Add Brand / Variant
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#161616', marginBottom: '6px' }}>
                  Variant / Brand Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Odoo Brand, Enterprise Cloud"
                  value={varName}
                  onChange={e => setVarName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #8d8d8d',
                    borderBottom: '2px solid #0f62fe',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#161616', marginBottom: '6px' }}>
                  Price Adjustment ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 560"
                  value={varPriceAdj}
                  onChange={e => setVarPriceAdj(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #8d8d8d',
                    borderBottom: '2px solid #0f62fe',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#525252', marginTop: '4px', display: 'block' }}>
                  Amount added to base sales price (e.g. selecting Odoo brand adds +560).
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid #e0e0e0', paddingTop: '14px' }}>
              <button
                type="button"
                onClick={() => setShowVariantModal(false)}
                style={{
                  padding: '8px 14px',
                  border: '1px solid #8d8d8d',
                  background: '#ffffff',
                  color: '#161616',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddVariant}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #0f62fe',
                  background: '#0f62fe',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Add Variant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
