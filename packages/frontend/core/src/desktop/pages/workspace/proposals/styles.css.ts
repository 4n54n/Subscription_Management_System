import { cssVar } from '@toeverything/theme';
import { style, globalStyle } from '@vanilla-extract/css';

export const container = style({
  display: 'flex',
  flexDirection: 'row',
  height: '100%',
  flex: 1,
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  backgroundColor: cssVar('backgroundPrimaryColor'),
  color: cssVar('textPrimaryColor'),
});

export const sidebar = style({
  height: '100%',
  backgroundColor: cssVar('backgroundSecondaryColor'),
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  overflowX: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
});

export const sidebarOpen = style({
  width: '320px',
  padding: '16px',
  borderRight: `1px solid ${cssVar('borderColor')}`,
  opacity: 1,
  visibility: 'visible',
});

export const sidebarClosed = style({
  width: '0px',
  padding: '0px',
  borderRight: '0px solid transparent',
  opacity: 0,
  visibility: 'hidden',
});

export const sidebarTitle = style({
  fontSize: '15px',
  fontWeight: 700,
  marginBottom: '12px',
  color: cssVar('textPrimaryColor'),
  whiteSpace: 'nowrap',
});

export const searchContainer = style({
  position: 'relative',
  marginBottom: '16px',
  width: '100%',
});

export const searchInput = style({
  width: '100%',
  padding: '8px 12px 8px 32px',
  fontSize: '12px',
  borderRadius: '8px',
  border: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundPrimaryColor'),
  color: cssVar('textPrimaryColor'),
  outline: 'none',
  transition: 'all 0.2s',
  ':focus': {
    borderColor: '#2563eb',
    boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.1)',
  },
});

export const searchIcon = style({
  position: 'absolute',
  left: '10px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: cssVar('textSecondaryColor'),
  pointerEvents: 'none',
});

export const docGroup = style({
  display: 'flex',
  flexDirection: 'column',
  marginBottom: '8px',
  borderRadius: '8px',
  border: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundPrimaryColor'),
  overflow: 'hidden',
});

export const docGroupHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 12px',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  ':hover': {
    backgroundColor: cssVar('hoverColor'),
  },
});

export const docGroupHeaderActive = style({
  backgroundColor: 'rgba(37, 99, 235, 0.04)',
});

export const docGroupTitle = style({
  fontSize: '13px',
  fontWeight: 600,
  color: cssVar('textPrimaryColor'),
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  maxWidth: '180px',
});

export const docGroupMeta = style({
  fontSize: '11px',
  color: cssVar('textSecondaryColor'),
  marginTop: '2px',
  display: 'flex',
  justifyContent: 'space-between',
});

export const docGroupArrow = style({
  color: cssVar('textSecondaryColor'),
  transition: 'transform 0.2s ease',
});

export const docGroupArrowExpanded = style({
  transform: 'rotate(90deg)',
});

export const versionsList = style({
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: cssVar('backgroundSecondaryColor'),
  borderTop: `1px solid ${cssVar('borderColor')}`,
  padding: '4px 0',
});

export const versionListItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 16px 8px 24px',
  cursor: 'pointer',
  fontSize: '12px',
  transition: 'background-color 0.2s',
  color: cssVar('textPrimaryColor'),
  ':hover': {
    backgroundColor: cssVar('hoverColor'),
  },
});

export const versionListItemActive = style({
  backgroundColor: 'rgba(37, 99, 235, 0.08)',
  color: '#2563eb',
  fontWeight: 600,
});

export const versionItemMeta = style({
  fontSize: '10px',
  color: cssVar('textSecondaryColor'),
});

export const versionDeleteBtn = style({
  padding: '4px',
  borderRadius: '4px',
  color: cssVar('textSecondaryColor'),
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
  ':hover': {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
  },
});

export const headerLeft = style({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap',
});

export const explorerToggleBtn = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  border: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundSecondaryColor'),
  color: cssVar('textPrimaryColor'),
  transition: 'all 0.2s',
  ':hover': {
    backgroundColor: cssVar('hoverColor'),
  },
});

export const explorerToggleBtnActive = style({
  backgroundColor: '#2563eb',
  color: '#ffffff',
  borderColor: '#2563eb',
  ':hover': {
    backgroundColor: '#1d4ed8',
  },
});

export const explorerToggleBtnText = style({
  fontSize: '13px',
});

export const breadcrumbSeparator = style({
  color: cssVar('textSecondaryColor'),
  fontSize: '16px',
  fontWeight: 300,
});

export const breadcrumbActiveDoc = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});

export const activeDocId = style({
  fontSize: '14px',
  fontWeight: 700,
  color: cssVar('textPrimaryColor'),
});

export const activeDocTitle = style({
  fontSize: '13px',
  color: cssVar('textSecondaryColor'),
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '240px',
  display: 'inline-block',
});

export const versionSwitcherWrapper = style({
  position: 'relative',
  display: 'inline-block',
});

export const versionSwitcherBtn = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 8px',
  borderRadius: '12px',
  fontSize: '11px',
  fontWeight: 600,
  backgroundColor: 'rgba(37, 99, 235, 0.08)',
  color: '#2563eb',
  border: '1px solid rgba(37, 99, 235, 0.2)',
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
  },
});

export const chevronIcon = style({
  transition: 'transform 0.2s',
});

export const plusMenuWrapper = style({
  position: 'relative',
  display: 'inline-block',
});

export const plusBtn = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  backgroundColor: cssVar('backgroundSecondaryColor'),
  border: `1px solid ${cssVar('borderColor')}`,
  color: cssVar('textPrimaryColor'),
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    backgroundColor: cssVar('hoverColor'),
    borderColor: cssVar('textSecondaryColor'),
  },
});

export const plusBtnActive = style({
  backgroundColor: '#2563eb',
  color: '#ffffff',
  borderColor: '#2563eb',
  ':hover': {
    backgroundColor: '#1d4ed8',
  },
});

export const dropdownMenu = style({
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  minWidth: '220px',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: `1px solid rgba(209, 213, 219, 0.5)`,
  borderRadius: '8px',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
  padding: '6px',
  zIndex: 100,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  animation: 'fadeIn 0.15s ease-out',
});

export const dropdownHeader = style({
  fontSize: '10px',
  fontWeight: 700,
  color: cssVar('textSecondaryColor'),
  textTransform: 'uppercase',
  padding: '6px 10px',
  letterSpacing: '0.5px',
});

export const dropdownItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 10px',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: 'transparent',
  color: '#1f2937',
  fontSize: '12px',
  fontWeight: 500,
  textAlign: 'left',
  width: '100%',
  cursor: 'pointer',
  transition: 'all 0.15s',
  ':hover': {
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    color: '#2563eb',
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
    backgroundColor: 'transparent',
    color: '#9ca3af',
  },
});

export const dropdownItemActive = style({
  backgroundColor: 'rgba(37, 99, 235, 0.08)',
  color: '#2563eb',
  fontWeight: 600,
});

export const dropdownItemDanger = style({
  color: '#ef4444',
  ':hover': {
    backgroundColor: '#fee2e2',
    color: '#ef4444',
  },
});

export const dropdownItemIcon = style({
  color: 'inherit',
});

export const dropdownItemVersion = style({
  fontWeight: 600,
});

export const dropdownItemDate = style({
  fontSize: '10px',
  color: '#6b7280',
  marginLeft: 'auto',
});

export const actionsMenuWrapper = style({
  position: 'relative',
  display: 'inline-block',
});

export const iconBtn = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  borderRadius: '6px',
  backgroundColor: cssVar('backgroundPrimaryColor'),
  border: `1px solid ${cssVar('borderColor')}`,
  color: cssVar('textPrimaryColor'),
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    backgroundColor: cssVar('hoverColor'),
  },
});


export const mainContent = style({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  overflow: 'hidden',
  minWidth: 0,
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 24px',
  backgroundColor: cssVar('backgroundPrimaryColor'),
  borderBottom: `1px solid ${cssVar('borderColor')}`,
  zIndex: 10,
  flexWrap: 'wrap',
  gap: '12px',
  '@media': {
    'screen and (max-width: 768px)': {
      padding: '12px 16px',
      flexDirection: 'column',
      alignItems: 'flex-start',
    }
  }
});

export const headerTitle = style({
  fontSize: '18px',
  fontWeight: 700,
  color: cssVar('textPrimaryColor'),
});

export const headerActions = style({
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  flexWrap: 'wrap',
});

export const splitPane = style({
  display: 'flex',
  flexDirection: 'row',
  flex: 1,
  height: 'calc(100% - 56px)',
  overflow: 'hidden',
  '@media': {
    'screen and (max-width: 1024px)': {
      flexDirection: 'column',
      overflowY: 'auto',
      height: 'auto',
    }
  }
});

export const previewPane = style({
  flex: '1 1 55%',
  height: '100%',
  position: 'relative',
  backgroundColor: '#f1f5f9',
  padding: '16px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  '@media': {
    'screen and (max-width: 1024px)': {
      width: '100% !important',
      flex: 'none !important',
      height: '600px',
    }
  }
});

export const iframe = style({
  width: '100%',
  height: '100%',
  border: 'none',
  borderRadius: '12px',
  boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
  backgroundColor: '#ffffff',
});

export const editorPane = style({
  flex: '1 1 45%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#18181b',
  borderLeft: `1px solid ${cssVar('borderColor')}`,
  '@media': {
    'screen and (max-width: 1024px)': {
      width: '100% !important',
      flex: 'none !important',
      height: '500px',
      borderLeft: 'none',
      borderTop: `1px solid ${cssVar('borderColor')}`,
    }
  }
});

export const resizeHandle = style({
  width: '8px',
  cursor: 'col-resize',
  backgroundColor: '#e4e4e7',
  borderLeft: '1px solid #d4d4d8',
  borderRight: '1px solid #d4d4d8',
  transition: 'background-color 0.2s',
  zIndex: 20,
  ':hover': {
    backgroundColor: '#3b82f6',
  },
  '@media': {
    'screen and (max-width: 1024px)': {
      display: 'none !important',
    }
  }
});

export const editorHeader = style({
  padding: '8px 16px',
  backgroundColor: '#27272a',
  borderBottom: '1px solid #3f3f46',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const editorTitle = style({
  fontSize: '12px',
  fontWeight: 600,
  color: '#a1a1aa',
});

export const textarea = style({
  flex: 1,
  width: '100%',
  height: '100%',
  padding: '16px',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '13px',
  color: '#f4f4f5',
  backgroundColor: '#18181b',
  border: 'none',
  resize: 'none',
  outline: 'none',
  lineHeight: '1.6',
});

export const btn = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
  border: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundPrimaryColor'),
  color: cssVar('textPrimaryColor'),
  gap: '6px',
  ':hover': {
    backgroundColor: cssVar('hoverColor'),
  },
});

export const btnPrimary = style({
  backgroundColor: '#2563eb',
  color: '#ffffff',
  borderColor: '#2563eb',
  ':hover': {
    backgroundColor: '#1d4ed8',
  },
});

export const btnDanger = style({
  backgroundColor: '#ef4444',
  color: '#ffffff',
  borderColor: '#ef4444',
  ':hover': {
    backgroundColor: '#dc2626',
  },
});

export const btnSecondary = style({
  backgroundColor: cssVar('backgroundSecondaryColor'),
  color: cssVar('textPrimaryColor'),
  border: `1px solid ${cssVar('borderColor')}`,
  ':hover': {
    backgroundColor: cssVar('hoverColor'),
    borderColor: cssVar('borderColor'),
  },
});

export const dashboardContainer = style({
  padding: '32px',
  overflowY: 'auto',
  overflowX: 'hidden',
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  backgroundColor: cssVar('backgroundPrimaryColor'),
});

export const dashboardHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '16px',
  '@media': {
    'screen and (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
    }
  }
});

export const dashboardTitle = style({
  fontSize: '24px',
  fontWeight: 700,
  color: cssVar('textPrimaryColor'),
});

export const dashboardSubtitle = style({
  fontSize: '14px',
  color: cssVar('textSecondaryColor'),
  marginTop: '4px',
});

export const dashboardCard = style({
  backgroundColor: cssVar('backgroundPrimaryColor'),
  border: `1px solid ${cssVar('borderColor')}`,
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
  overflowX: 'auto',
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
  fontSize: '13px',
});

export const tableRow = style({
  borderBottom: `1px solid ${cssVar('borderColor')}`,
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    backgroundColor: cssVar('hoverColor'),
  },
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export const tableSubRow = style({
  backgroundColor: 'rgba(0,0,0,0.01)',
});

export const tableVersionBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: '10px',
  fontSize: '11px',
  fontWeight: '600',
  backgroundColor: 'rgba(37, 99, 235, 0.08)',
  color: '#2563eb',
});

export const tableActionBtn = style({
  padding: '4px 8px',
  borderRadius: '4px',
  border: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundPrimaryColor'),
  color: cssVar('textPrimaryColor'),
  fontSize: '12px',
  cursor: 'pointer',
  transition: 'all 0.15s',
  ':hover': {
    backgroundColor: cssVar('hoverColor'),
  },
});

// Table td/th base spacing
globalStyle(`${table} th`, {
  padding: '12px 16px',
  fontWeight: 600,
  color: cssVar('textSecondaryColor'),
  borderBottom: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundSecondaryColor'),
});

globalStyle(`${table} td`, {
  padding: '12px 16px',
  verticalAlign: 'middle',
  color: cssVar('textPrimaryColor'),
});

export const headerSelect = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  border: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundPrimaryColor'),
  color: cssVar('textPrimaryColor'),
  outline: 'none',
  transition: 'all 0.2s',
  maxWidth: '240px',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  ':hover': {
    backgroundColor: cssVar('hoverColor'),
  },
  '@media': {
    'screen and (max-width: 480px)': {
      maxWidth: '100%',
    }
  }
});


