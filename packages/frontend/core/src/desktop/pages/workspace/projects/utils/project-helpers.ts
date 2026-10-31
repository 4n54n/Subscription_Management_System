export const isOverdue = (dateStr: string | null | undefined, status?: string) => {
  if (!dateStr) return false;
  const lowerStatus = status ? status.toLowerCase() : '';
  if (lowerStatus === 'done' || lowerStatus === 'completed' || lowerStatus === 'released') return false;
  return new Date(dateStr) < new Date();
};

export const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'critical': return { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444' };
    case 'high': return { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b' };
    case 'medium': return { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6' };
    default: return { bg: 'rgba(100, 116, 139, 0.12)', text: '#64748b' };
  }
};

export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'done': return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
    case 'testing': return { bg: '#fdf2f8', text: '#db2777', border: '#fbcfe8' };
    case 'inreview': return { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' };
    case 'inprogress': return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
    case 'todo': return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
    default: return { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' }; // Backlog
  }
};
