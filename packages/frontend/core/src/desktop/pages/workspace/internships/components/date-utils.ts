/**
 * Utility functions for converting between HTML5 calendar input values (YYYY-MM-DD)
 * and formal certificate display dates (e.g. "01 OCTOBER 2026").
 */

export const formatDisplayDate = (val?: string): string => {
  if (!val) return '';
  const trimmed = val.trim();
  const parts = trimmed.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m, d);
    if (!isNaN(dateObj.getTime())) {
      const day = String(d).padStart(2, '0');
      const month = dateObj.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
      return `${day} ${month} ${y}`;
    }
  }
  const dateObj = new Date(trimmed);
  if (!isNaN(dateObj.getTime())) {
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = dateObj.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
    return `${day} ${month} ${dateObj.getFullYear()}`;
  }
  return val;
};

export const toCalendarValue = (dateStr?: string): string => {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
};
