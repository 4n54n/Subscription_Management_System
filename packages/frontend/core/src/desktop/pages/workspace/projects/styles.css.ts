import { cssVar } from '@toeverything/theme';
import { style, globalStyle, keyframes } from '@vanilla-extract/css';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  width: '100%',
  backgroundColor: cssVar('backgroundPrimaryColor'),
  color: cssVar('textPrimaryColor'),
  fontFamily: cssVar('fontFamily'),
  overflow: 'hidden',
});

export const header = style({
  display: 'flex',
  flexDirection: 'column',
  padding: '24px 32px 16px 32px',
  borderBottom: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundPrimaryColor'),
  position: 'sticky',
  top: 0,
  zIndex: 10,
  flexShrink: 0,
});

export const headerTop = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '16px',
});

export const title = style({
  fontSize: '24px',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  color: cssVar('textPrimaryColor'),
});

export const headerActions = style({
  display: 'flex',
  gap: '12px',
  alignItems: 'center',
});

export const btn = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  height: '32px',
  minHeight: '32px',
  padding: '0 12px',
  boxSizing: 'border-box',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease',
  border: 'none',
  userSelect: 'none',
});

export const btnModal = style([btn, {
  height: '36px',
  minHeight: '36px',
  padding: '0 16px',
  borderRadius: '8px',
  fontSize: '13px',
}]);

export const btnPrimary = style({
  backgroundColor: cssVar('primaryColor'),
  color: '#ffffff',
  ':hover': {
    filter: 'brightness(1.08)',
  },
  ':active': {
    filter: 'brightness(0.95)',
  },
});

export const createWorkItemBtn = style({
  ':hover': {
    filter: 'brightness(1.08)',
  },
});

export const btnSecondary = style({
  backgroundColor: cssVar('backgroundSecondaryColor'),
  color: cssVar('textPrimaryColor'),
  border: `1px solid ${cssVar('borderColor')}`,
  ':hover': {
    backgroundColor: cssVar('hoverColor'),
    borderColor: cssVar('primaryColor'),
    color: cssVar('primaryColor'),
  },
  ':active': {
    backgroundColor: cssVar('hoverColor'),
  },
});

export const btnDanger = style({
  backgroundColor: '#ef4444',
  color: '#ffffff',
  ':hover': {
    filter: 'brightness(1.08)',
  },
  ':active': {
    filter: 'brightness(0.95)',
  },
});

export const searchBar = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  width: '280px',
});

export const searchInput = style({
  width: '100%',
  padding: '8px 12px 8px 36px',
  borderRadius: '8px',
  border: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundSecondaryColor'),
  color: cssVar('textPrimaryColor'),
  fontSize: '14px',
  transition: 'all 0.15s ease-in-out',
  outline: 'none',
  ':focus': {
    borderColor: cssVar('primaryColor'),
    boxShadow: `0 0 0 2px ${cssVar('primaryColor')}22`,
  },
});

export const searchIcon = style({
  position: 'absolute',
  left: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  alignItems: 'center',
  color: cssVar('textSecondaryColor'),
  pointerEvents: 'none',
});

export const tabsContainer = style({
  display: 'flex',
  gap: '4px',
  marginTop: '16px',
  borderBottom: `1px solid ${cssVar('borderColor')}`,
  paddingBottom: '2px',
});

export const tabButton = style({
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 500,
  color: cssVar('textSecondaryColor'),
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  borderRadius: '6px 6px 0 0',
  transition: 'all 0.2s ease-in-out',
  position: 'relative',
  ':hover': {
    color: cssVar('textPrimaryColor'),
    backgroundColor: cssVar('hoverColor'),
  },
  selectors: {
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: '-3px',
      left: '16px',
      right: '16px',
      height: '2px',
      backgroundColor: 'transparent',
      borderRadius: '2px',
      transition: 'all 0.2s ease-in-out',
    }
  }
});

export const tabActive = style({
  color: cssVar('primaryColor'),
  fontWeight: 600,
  selectors: {
    '&::after': {
      backgroundColor: cssVar('primaryColor'),
    }
  }
});

export const bodyContent = style({
  flex: 1,
  padding: '32px',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflowY: 'auto',
});

export const projectGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '24px',
  width: '100%',
});

export const projectCard = style({
  backgroundColor: cssVar('backgroundSecondaryColor'),
  borderRadius: '12px',
  border: `1px solid ${cssVar('borderColor')}`,
  padding: '24px',
  cursor: 'pointer',
  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  minHeight: '180px',
  ':hover': {
    backgroundColor: cssVar('hoverColorFilled'),
    borderColor: 'var(--project-color, #3b82f6)',
  },
});

export const projectCardBanner = style({
  height: '6px',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
});

export const projectCardHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
});

export const projectCardTitle = style({
  fontSize: '18px',
  fontWeight: 600,
  color: cssVar('textPrimaryColor'),
});

export const projectCardDesc = style({
  fontSize: '14px',
  color: cssVar('textSecondaryColor'),
  lineHeight: 1.5,
  flex: 1,
});

export const projectCardFooter = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '12px',
  fontSize: '12px',
  color: cssVar('textSecondaryColor'),
  borderTop: `1px solid ${cssVar('borderColor')}`,
  paddingTop: '12px',
});

export const statusBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 8px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'capitalize',
});

export const overviewGrid = style({
  display: 'grid',
  gridTemplateColumns: '2fr 1fr',
  gap: '32px',
  alignItems: 'start',
});

export const overviewMain = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
});

export const overviewSidebar = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  backgroundColor: cssVar('backgroundSecondaryColor'),
  borderRadius: '12px',
  border: `1px solid ${cssVar('borderColor')}`,
  padding: '24px',
});

export const dashboardCard = style({
  backgroundColor: cssVar('backgroundSecondaryColor'),
  borderRadius: '12px',
  border: `1px solid ${cssVar('borderColor')}`,
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
});

export const statsRow = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '16px',
  width: '100%',
  marginBottom: '24px',
});

export const statBox = style({
  backgroundColor: cssVar('backgroundSecondaryColor'),
  borderRadius: '12px',
  padding: '16px 20px',
  border: `1px solid ${cssVar('borderColor')}`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '12px',
  textAlign: 'left',
  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  cursor: 'default',
  position: 'relative',
  overflow: 'hidden',
});

export const statValue = style({
  fontSize: '26px',
  fontWeight: 700,
  color: cssVar('textPrimaryColor'),
  lineHeight: 1.1,
});

export const statLabel = style({
  fontSize: '12px',
  color: cssVar('textSecondaryColor'),
  fontWeight: 600,
});

// Kanban Board styling
export const boardContainer = style({
  display: 'flex',
  gap: '16px',
  overflowX: 'auto',
  flex: 1,
  paddingBottom: '16px',
  minHeight: 0,
});

export const boardColumn = style({
  flex: '1 0 280px',
  backgroundColor: cssVar('backgroundSecondaryColor'),
  borderRadius: '12px',
  border: `1px solid ${cssVar('borderColor')}`,
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '100%',
  padding: '16px',
});

export const boardColumnHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '16px',
  fontWeight: 600,
  fontSize: '14px',
  color: cssVar('textPrimaryColor'),
});

export const boardColumnList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  overflowY: 'auto',
  overflowX: 'hidden',
  flex: 1,
  minHeight: '150px',
  width: '100%',
  boxSizing: 'border-box',
});

globalStyle(`${boardColumnList} div[data-virtuoso-scroller]`, {
  overflowX: 'hidden !important' as any,
});

export const boardColumnEmpty = style({
  fontSize: '12px',
  color: cssVar('textSecondaryColor'),
  textAlign: 'center',
  padding: '24px 0',
  border: `1px dashed ${cssVar('borderColor')}`,
  borderRadius: '8px',
});

export const issueCard = style({
  backgroundColor: cssVar('backgroundPrimaryColor'),
  borderRadius: '8px',
  border: `1px solid ${cssVar('borderColor')}`,
  padding: '14px',
  cursor: 'pointer',
  overflow: 'hidden',
  boxSizing: 'border-box',
  maxWidth: '100%',
  width: '100%',
  transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: cssVar('shadow1'),
    borderColor: cssVar('primaryColor'),
  },
  ':active': {
    cursor: 'grabbing',
  },
});

export const issueCardHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '8px',
});

export const issueCardTitle = style({
  fontSize: '14px',
  fontWeight: 500,
  lineHeight: 1.4,
  color: cssVar('textPrimaryColor'),
  flex: 1,
});

export const issueMetaRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  fontSize: '12px',
  color: cssVar('textSecondaryColor'),
});

export const priorityBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: 600,
  textTransform: 'uppercase',
});

// Table/List View
export const tableContainer = style({
  backgroundColor: cssVar('backgroundSecondaryColor'),
  borderRadius: '12px',
  border: `1px solid ${cssVar('borderColor')}`,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
});

export const th = style({
  padding: '14px 18px',
  fontSize: '13px',
  fontWeight: 600,
  color: cssVar('textSecondaryColor'),
  borderBottom: `1px solid ${cssVar('borderColor')}`,
  cursor: 'pointer',
  userSelect: 'none',
  ':hover': {
    color: cssVar('textPrimaryColor'),
    backgroundColor: cssVar('hoverColor'),
  },
});

export const tr = style({
  borderBottom: `1px solid ${cssVar('borderColor')}`,
  transition: 'background-color 0.15s',
  ':hover': {
    backgroundColor: cssVar('hoverColor'),
  },
});

export const td = style({
  padding: '14px 18px',
  fontSize: '14px',
  color: cssVar('textPrimaryColor'),
});

// Form and Modal Elements
// Keyframes for premium popup micro-animations
const fadeIn = keyframes({
  '0%': { opacity: 0 },
  '100%': { opacity: 1 },
});

const fadeInUp = keyframes({
  '0%': {
    opacity: 0,
    transform: 'translateY(12px) scale(0.98)',
  },
  '100%': {
    opacity: 1,
    transform: 'translateY(0) scale(1)',
  },
});

export const modalOverlay = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.4)',
  backdropFilter: 'blur(12px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 99999,
  animation: `${fadeIn} 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
});

export const modal = style({
  backgroundColor: cssVar('backgroundSecondaryColor'),
  borderRadius: '16px',
  border: `1px solid ${cssVar('borderColor')}`,
  width: '100%',
  maxWidth: '650px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  animation: `${fadeInUp} 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
});

globalStyle(`${modal} form`, {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  overflow: 'hidden',
  minHeight: 0,
});

export const modalHeader = style({
  padding: '22px 28px',
  borderBottom: `1px solid ${cssVar('borderColor')}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const modalTitle = style({
  fontSize: '18px',
  fontWeight: 600,
  color: cssVar('textPrimaryColor'),
});

export const modalBody = style({
  padding: '28px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  flex: 1,
  minHeight: 0,
});

export const closeBtn = style({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  borderRadius: '50%',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: cssVar('textSecondaryColor'),
  transition: 'all 0.2s ease-in-out',
  ':hover': {
    backgroundColor: cssVar('hoverColor'),
    color: cssVar('textPrimaryColor'),
  },
});

export const modalFooter = style({
  padding: '18px 28px',
  borderTop: `1px solid ${cssVar('borderColor')}`,
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  backgroundColor: cssVar('backgroundPrimaryColor'),
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
});

export const label = style({
  fontSize: '12px',
  fontWeight: 600,
  color: cssVar('textSecondaryColor'),
  letterSpacing: '0.03em',
  marginBottom: '2px',
});

export const input = style({
  width: '100%',
  boxSizing: 'border-box',
  height: '38px',
  minHeight: '38px',
  lineHeight: '36px',
  padding: '0 14px',
  borderRadius: '8px',
  border: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundPrimaryColor'),
  color: cssVar('textPrimaryColor'),
  fontSize: '14px',
  outline: 'none',
  transition: 'all 0.15s ease-in-out',
  ':focus': {
    borderColor: cssVar('primaryColor'),
    boxShadow: `0 0 0 3px ${cssVar('primaryColor')}1a`,
  },
  ':hover': {
    borderColor: cssVar('primaryColor'),
  },
});

export const textarea = style({
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px',
  borderRadius: '8px',
  border: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundPrimaryColor'),
  color: cssVar('textPrimaryColor'),
  fontSize: '14px',
  outline: 'none',
  resize: 'vertical',
  minHeight: '100px',
  fontFamily: 'inherit',
  transition: 'all 0.15s ease-in-out',
  ':focus': {
    borderColor: cssVar('primaryColor'),
    boxShadow: `0 0 0 3px ${cssVar('primaryColor')}1a`,
  },
  ':hover': {
    borderColor: cssVar('primaryColor'),
  },
});

export const select = style({
  width: '100%',
  boxSizing: 'border-box',
  height: '38px',
  minHeight: '38px',
  padding: '0 14px',
  borderRadius: '8px',
  border: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundPrimaryColor'),
  color: cssVar('textPrimaryColor'),
  fontSize: '14px',
  outline: 'none',
  cursor: 'pointer',
  transition: 'all 0.15s ease-in-out',
  ':focus': {
    borderColor: cssVar('primaryColor'),
    boxShadow: `0 0 0 3px ${cssVar('primaryColor')}1a`,
  },
  ':hover': {
    backgroundColor: cssVar('hoverColor'),
    borderColor: cssVar('primaryColor'),
  },
});

export const formRow = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
});

// Analytics styles
export const chartWrapper = style({
  width: '100%',
  height: '300px',
  backgroundColor: cssVar('backgroundPrimaryColor'),
  borderRadius: '8px',
  border: `1px solid ${cssVar('borderColor')}`,
  padding: '16px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
});

export const commentsSection = style({
  borderTop: `1px solid ${cssVar('borderColor')}`,
  paddingTop: '24px',
  marginTop: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
});

export const commentInputArea = style({
  display: 'flex',
  flexDirection: 'row !important' as any,
  gap: '12px',
  alignItems: 'center',
});

export const commentBubble = style({
  backgroundColor: cssVar('backgroundPrimaryColor'),
  border: `1px solid ${cssVar('borderColor')}`,
  borderRadius: '12px',
  padding: '12px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
});

export const commentHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '12px',
  color: cssVar('textSecondaryColor'),
});

export const commentText = style({
  fontSize: '14px',
  color: cssVar('textPrimaryColor'),
  whiteSpace: 'pre-wrap',
  lineHeight: '1.4',
});

export const avatar = style({
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  backgroundColor: cssVar('primaryColor'),
  color: '#ffffff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '11px',
  fontWeight: 'bold',
});

export const avatarLarge = style({
  width: '40px',
  height: '40px',
  fontSize: '16px',
});

export const multipleSelectArea = style({
  boxSizing: 'border-box',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  padding: '12px',
  border: `1px solid ${cssVar('borderColor')}`,
  borderRadius: '10px',
  backgroundColor: cssVar('backgroundPrimaryColor'),
  maxHeight: '120px',
  overflowY: 'auto',
  transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
  ':focus-within': {
    borderColor: cssVar('primaryColor'),
    boxShadow: `0 0 0 3px ${cssVar('primaryColor')}1a`,
  },
});

export const selectChip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  backgroundColor: cssVar('hoverColor'),
  border: `1px solid ${cssVar('borderColor')}`,
  borderRadius: '16px',
  fontSize: '12.5px',
  fontWeight: 500,
  color: cssVar('textPrimaryColor'),
  cursor: 'pointer',
  transition: 'all 0.15s ease-in-out',
  userSelect: 'none',
  ':hover': {
    backgroundColor: cssVar('borderColor'),
    transform: 'translateY(-1px)',
  },
});

export const canvasContainer = style({
  position: 'relative',
  width: '100%',
  borderRadius: '12px',
  overflow: 'hidden',
});

