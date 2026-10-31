import { cssVar } from '@toeverything/theme';
import { style } from '@vanilla-extract/css';

export const root = style({
  display: 'flex',
  height: '100%',
  overflow: 'clip',
  width: '100%',
  position: 'relative',
  flexDirection: 'column',
  minWidth: 0,
  background: cssVar('backgroundPrimaryColor'),
});

export const header = style({
  display: 'flex',
  height: '52px',
  width: '100%',
  alignItems: 'center',
  flexShrink: 0,
  background: cssVar('backgroundPrimaryColor'),
  padding: '0 16px',
  contain: 'strict',
  '@media': {
    print: {
      display: 'none',
    },
  },
});

export const viewBodyContainer = style({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  contain: 'strict',
  selectors: {
    '&:empty': {
      display: 'none !important',
      flex: '0 !important',
      height: '0 !important',
    },
  },
});

export const leftSidebarButton = style({
  margin: '0 16px 0 0',
});

export const rightSidebarButton = style({
  transition: 'all 0.2s ease-in-out',
  selectors: {
    '&[data-show=true]': {
      opacity: 1,
      width: 32,
      maxWidth: 32,
      marginLeft: 16,
    },
    '&[data-show=false]': {
      opacity: 0,
      maxWidth: 0,
      marginLeft: 0,
    },
  },
});

export const viewHeaderContainer = style({
  display: 'flex',
  height: '100%',
  width: 0,
  flexGrow: 1,
  minWidth: 12,
});
