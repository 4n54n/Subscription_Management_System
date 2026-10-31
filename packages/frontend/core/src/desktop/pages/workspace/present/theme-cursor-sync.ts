/**
 * IntoAI Custom Theme Cursor & Toolbar Style Synchronizer
 * Injects Light & Dark theme cursors and edgeless toolbar active button styles
 * into Document Head AND recursively into all Web Component Shadow Roots.
 */

const CURSOR_THEME_CSS = `
/* --- 1. LIGHT THEME CURSORS & TOOLBAR BUTTONS --- */

/* Select Hand Icon (Pan / Grab) in Light Theme: White with Grey-Black (#1e293b) Border */
body:not(.dark-theme) [data-edgeless-tool="pan"],
body:not(.dark-theme) [data-edgeless-tool="pan"] *,
body:not(.dark-theme) [data-edgeless-tool="hand"],
body:not(.dark-theme) [data-edgeless-tool="hand"] *,
body:not(.dark-theme) [data-edgeless-tool="default"],
body:not(.dark-theme) [data-edgeless-tool="default"] *,
[data-app-theme='light'] [data-edgeless-tool="pan"],
[data-app-theme='light'] [data-edgeless-tool="pan"] *,
body:not(.dark-theme) .affine-edgeless-viewport.grab,
[data-app-theme='light'] .affine-edgeless-viewport.grab {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M18 11V6a2 2 0 0 0-4 0v1a2 2 0 0 0-4 0v-1a2 2 0 0 0-4 0v9l-2.5-2.5a1.5 1.5 0 0 0-2.1 2.1l4.6 4.6A6 6 0 0 0 10.2 21H16a5 5 0 0 0 5-5v-5a2 2 0 0 0-2-2z' stroke='%2364748b' stroke-width='1.2' stroke-linejoin='round' fill='white'/%3E%3C/svg%3E") 12 12, grab !important;
}

/* Small Dragging Hand (Grabbing) in Light Theme: White with Grey-Black (#1e293b) Border */
body:not(.dark-theme) [data-edgeless-tool="pan"]:active,
body:not(.dark-theme) [data-edgeless-tool="pan"]:active *,
body:not(.dark-theme) .affine-edgeless-viewport.grabbing,
body:not(.dark-theme) .affine-edgeless-viewport.grabbing *,
[data-app-theme='light'] .affine-edgeless-viewport.grabbing,
body:not(.dark-theme) .dragging-hand,
[data-app-theme='light'] .dragging-hand,
body:not(.dark-theme) .edgeless-draggable-control-overlay-mask,
body:not(.dark-theme) .affine-drag-handle-container {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M18 11.5v-2a1.5 1.5 0 0 0-3 0v.5a1.5 1.5 0 0 0-3 0v.5a1.5 1.5 0 0 0-3 0v-1a1.5 1.5 0 0 0-3 0v6c0 5 4 8 8 8s8-3 8-8v-3.5a1.5 1.5 0 0 0-3 0z' fill='white' stroke='%231e293b' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, grabbing !important;
}

/* "+" Icon (Shape, Connector, Frame, Note, Brush, Highlighter, Eraser) in Light Theme: White with Grey-Black (#1e293b) Border */
body:not(.dark-theme) [data-edgeless-tool="shape"],
body:not(.dark-theme) [data-edgeless-tool="shape"] *,
body:not(.dark-theme) [data-edgeless-tool="connector"],
body:not(.dark-theme) [data-edgeless-tool="connector"] *,
body:not(.dark-theme) [data-edgeless-tool="frame"],
body:not(.dark-theme) [data-edgeless-tool="frame"] *,
body:not(.dark-theme) [data-edgeless-tool="note"],
body:not(.dark-theme) [data-edgeless-tool="note"] *,
body:not(.dark-theme) [data-edgeless-tool="brush"],
body:not(.dark-theme) [data-edgeless-tool="brush"] *,
body:not(.dark-theme) [data-edgeless-tool="highlighter"],
body:not(.dark-theme) [data-edgeless-tool="highlighter"] *,
[data-app-theme='light'] [data-edgeless-tool="shape"],
[data-app-theme='light'] [data-edgeless-tool="shape"] * {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M12 4V20M4 12H20' stroke='white' stroke-width='4.5' stroke-linecap='round'/%3E%3Cpath d='M12 4V20M4 12H20' stroke='%231e293b' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E") 12 12, crosshair !important;
}

/* "|" Text Typing Caret Cursor & Caret Color in Light Theme: Grey-Black (#1e293b) across ENTIRE One Workspace */
body:not(.dark-theme) [data-edgeless-tool="text"],
body:not(.dark-theme) [data-edgeless-tool="text"] *,
[data-app-theme='light'] [data-edgeless-tool="text"],
[data-app-theme='light'] [data-edgeless-tool="text"] * {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M8 4H16M12 4V20M8 20H16' stroke='white' stroke-width='4.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M8 4H16M12 4V20M8 20H16' stroke='%231e293b' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, text !important;
}

body:not(.dark-theme),
body:not(.dark-theme) *,
[data-app-theme='light'],
[data-app-theme='light'] *,
:root:not(.dark-theme) * {
  caret-color: #1e293b !important;
}

/* Light Theme Edgeless Toolbar Active Buttons (Hand & + Button) */
body:not(.dark-theme) edgeless-tool-icon-button[data-active="true"],
body:not(.dark-theme) edgeless-tool-icon-button[active],
body:not(.dark-theme) edgeless-tool-icon-button.active,
body:not(.dark-theme) .edgeless-toolbar-button.active,
body:not(.dark-theme) .edgeless-toolbar-button[data-selected="true"],
[data-app-theme='light'] edgeless-tool-icon-button[data-active="true"],
[data-app-theme='light'] edgeless-tool-icon-button[active],
[data-app-theme='light'] edgeless-tool-icon-button.active {
  background-color: #ffffff !important;
  border: 1.5px solid #1e293b !important;
  color: #1e293b !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12) !important;
}

body:not(.dark-theme) edgeless-tool-icon-button[data-active="true"] svg,
body:not(.dark-theme) edgeless-tool-icon-button[active] svg,
body:not(.dark-theme) edgeless-tool-icon-button.active svg,
[data-app-theme='light'] edgeless-tool-icon-button[data-active="true"] svg,
[data-app-theme='light'] edgeless-tool-icon-button[active] svg {
  color: #1e293b !important;
  stroke: #1e293b !important;
}


/* --- 2. DARK THEME CURSORS & TOOLBAR BUTTONS --- */

/* Hand Icon (Pan / Grab) in Dark Theme: Full White */
body.dark-theme [data-edgeless-tool="pan"],
body.dark-theme [data-edgeless-tool="pan"] *,
body.dark-theme [data-edgeless-tool="hand"],
body.dark-theme [data-edgeless-tool="hand"] *,
body.dark-theme [data-edgeless-tool="default"],
body.dark-theme [data-edgeless-tool="default"] *,
[data-app-theme='dark'] [data-edgeless-tool="pan"],
[data-app-theme='dark'] [data-edgeless-tool="pan"] *,
body.dark-theme .affine-edgeless-viewport.grab,
[data-app-theme='dark'] .affine-edgeless-viewport.grab {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M18 11V6a2 2 0 0 0-4 0v1a2 2 0 0 0-4 0v-1a2 2 0 0 0-4 0v9l-2.5-2.5a1.5 1.5 0 0 0-2.1 2.1l4.6 4.6A6 6 0 0 0 10.2 21H16a5 5 0 0 0 5-5v-5a2 2 0 0 0-2-2z' stroke='white' stroke-width='2.2' stroke-linejoin='round' fill='white'/%3E%3C/svg%3E") 12 12, grab !important;
}

/* Small Dragging Hand (Grabbing) in Dark Theme: Full White */
body.dark-theme [data-edgeless-tool="pan"]:active,
body.dark-theme [data-edgeless-tool="pan"]:active *,
body.dark-theme .affine-edgeless-viewport.grabbing,
body.dark-theme .affine-edgeless-viewport.grabbing *,
[data-app-theme='dark'] .affine-edgeless-viewport.grabbing,
body.dark-theme .dragging-hand,
[data-app-theme='dark'] .dragging-hand,
body.dark-theme .edgeless-draggable-control-overlay-mask,
body.dark-theme .affine-drag-handle-container {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M18 11.5v-2a1.5 1.5 0 0 0-3 0v.5a1.5 1.5 0 0 0-3 0v.5a1.5 1.5 0 0 0-3 0v-1a1.5 1.5 0 0 0-3 0v6c0 5 4 8 8 8s8-3 8-8v-3.5a1.5 1.5 0 0 0-3 0z' fill='white' stroke='white' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, grabbing !important;
}

/* "+" Icon (Shape, Connector, Frame, Note, Brush, Highlighter, Eraser) in Dark Theme: Full White */
body.dark-theme [data-edgeless-tool="shape"],
body.dark-theme [data-edgeless-tool="shape"] *,
body.dark-theme [data-edgeless-tool="connector"],
body.dark-theme [data-edgeless-tool="connector"] *,
body.dark-theme [data-edgeless-tool="frame"],
body.dark-theme [data-edgeless-tool="frame"] *,
body.dark-theme [data-edgeless-tool="note"],
body.dark-theme [data-edgeless-tool="note"] *,
body.dark-theme [data-edgeless-tool="brush"],
body.dark-theme [data-edgeless-tool="brush"] *,
body.dark-theme [data-edgeless-tool="highlighter"],
body.dark-theme [data-edgeless-tool="highlighter"] *,
[data-app-theme='dark'] [data-edgeless-tool="shape"],
[data-app-theme='dark'] [data-edgeless-tool="shape"] * {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M12 4V20M4 12H20' stroke='%23ffffff' stroke-width='3.2' stroke-linecap='round'/%3E%3C/svg%3E") 12 12, crosshair !important;
}

/* "|" Text Typing Caret Cursor & Caret Color in Dark Theme: Full White across ENTIRE One Workspace */
body.dark-theme [data-edgeless-tool="text"],
body.dark-theme [data-edgeless-tool="text"] *,
[data-app-theme='dark'] [data-edgeless-tool="text"],
[data-app-theme='dark'] [data-edgeless-tool="text"] * {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M8 4H16M12 4V20M8 20H16' stroke='%23ffffff' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, text !important;
}

body.dark-theme,
body.dark-theme *,
[data-app-theme='dark'],
[data-app-theme='dark'] *,
:root.dark-theme * {
  caret-color: #ffffff !important;
}

/* Dark Theme Edgeless Toolbar Active Buttons (Hand & + Button) */
body.dark-theme edgeless-tool-icon-button[data-active="true"],
body.dark-theme edgeless-tool-icon-button[active],
body.dark-theme edgeless-tool-icon-button.active,
body.dark-theme .edgeless-toolbar-button.active,
body.dark-theme .edgeless-toolbar-button[data-selected="true"],
[data-app-theme='dark'] edgeless-tool-icon-button[data-active="true"],
[data-app-theme='dark'] edgeless-tool-icon-button[active],
[data-app-theme='dark'] edgeless-tool-icon-button.active {
  background-color: #ffffff !important;
  border: 1.5px solid #ffffff !important;
  color: #000000 !important;
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.25) !important;
}

body.dark-theme edgeless-tool-icon-button[data-active="true"] svg,
body.dark-theme edgeless-tool-icon-button[active] svg,
body.dark-theme edgeless-tool-icon-button.active svg,
[data-app-theme='dark'] edgeless-tool-icon-button[data-active="true"] svg,
[data-app-theme='dark'] edgeless-tool-icon-button[active] svg {
  color: #000000 !important;
  stroke: #000000 !important;
}
`;

export function syncThemeCustomCursorStyles(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const styleId = 'intoai-custom-theme-cursor-styles';

  const applyStyleToTarget = (target: Document | ShadowRoot) => {
    try {
      let existing = target.querySelector<HTMLStyleElement>(`#${styleId}`);
      if (!existing) {
        existing = document.createElement('style');
        existing.id = styleId;
        target.appendChild(existing);
      }
      if (existing.textContent !== CURSOR_THEME_CSS) {
        existing.textContent = CURSOR_THEME_CSS;
      }
    } catch {
      // Ignore security/shadowRoot errors
    }
  };

  const walkAndApplyShadowRoots = (rootNode: Node) => {
    if (!rootNode) return;
    const elements = (rootNode as Element).querySelectorAll
      ? (rootNode as Element).querySelectorAll('*')
      : [];

    elements.forEach(el => {
      if (el.shadowRoot) {
        applyStyleToTarget(el.shadowRoot);
        walkAndApplyShadowRoots(el.shadowRoot);
      }
    });
  };

  const runSync = () => {
    applyStyleToTarget(document);
    walkAndApplyShadowRoots(document.body || document.documentElement);
  };

  runSync();

  // Setup periodic sync & MutationObserver to instantly inject into dynamically created Shadow DOMs
  if (!(window as any).__intoai_cursor_sync_initialized) {
    (window as any).__intoai_cursor_sync_initialized = true;

    try {
      const observer = new MutationObserver(() => runSync());
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
      });
    } catch {
      // Ignore if body not ready
    }

    setInterval(runSync, 1000);
  }
}
