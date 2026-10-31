import { style } from '@vanilla-extract/css';
export const root = style({
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 0%',
  width: '100%',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
});
