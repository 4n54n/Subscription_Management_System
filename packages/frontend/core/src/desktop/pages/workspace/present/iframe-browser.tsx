import React, { useEffect, useRef, useState } from 'react';
import { useLiveData } from '@toeverything/infra';
import { LockIcon } from '@blocksuite/icons/rc';

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
}

interface BrowserRoomState {
  terminalActive?: boolean;
  browserActive?: boolean;
  browserUrl?: string;
  browserHideUrl?: boolean;
  browserDisableClick?: boolean;
  browserBookmarks?: BookmarkItem[];
  [key: string]: any;
}

interface IframeBrowserProps {
  isBrowserOpen: boolean;
  isHost: boolean;
  isTerminalOpen: boolean;
  browserInputUrl: string;
  setBrowserInputUrl: (url: string) => void;
  browserUrl: string;
  roomId: string;
  sessionId: string;
  wsService: any;
  toggleBrowser: () => void;
  isEnlarged?: boolean;
  toggleEnlarge?: () => void;
}

export const IframeBrowser: React.FC<IframeBrowserProps> = ({
  isBrowserOpen,
  isHost,
  isTerminalOpen,
  browserInputUrl,
  setBrowserInputUrl,
  browserUrl,
  roomId,
  sessionId,
  wsService,
  toggleBrowser,
  isEnlarged = false,
  toggleEnlarge,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bookmarkDropdownRef = useRef<HTMLDivElement>(null);

  // Bookmark popover & input focus state
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isAddressBarFocused, setIsAddressBarFocused] = useState(false);
  const [customBookmarkTitle, setCustomBookmarkTitle] = useState('');
  const [customBookmarkUrl, setCustomBookmarkUrl] = useState('');
  const [showAddBookmarkForm, setShowAddBookmarkForm] = useState(false);
  const [isWheelScrolling, setIsWheelScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronized Room State from WebSocket with explicit type casting
  const roomState = useLiveData(wsService?.roomStateSync$) as BrowserRoomState | null | undefined;

  // Browser Configs (Host & Guest sync, default to true)
  const hideUrl = roomState?.browserHideUrl ?? true;
  const disableClick = roomState?.browserDisableClick ?? true;

  // Bookmarks from Room State + LocalStorage fallback
  const storageKey = `meeting_bookmarks_${roomId || 'default'}`;
  const [localBookmarks, setLocalBookmarks] = useState<BookmarkItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const serverBookmarks = roomState?.browserBookmarks;
  const bookmarks: BookmarkItem[] = serverBookmarks && serverBookmarks.length > 0
    ? serverBookmarks
    : localBookmarks;

  // Sync bookmarks between server state and localStorage
  useEffect(() => {
    if (serverBookmarks && serverBookmarks.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(serverBookmarks));
        setLocalBookmarks(serverBookmarks);
      } catch (_) {}
    }
  }, [serverBookmarks, storageKey]);

  // Initial sync from localStorage to server if host connects and server list is empty
  useEffect(() => {
    if (isHost && roomId && wsService && (!serverBookmarks || serverBookmarks.length === 0) && localBookmarks.length > 0) {
      wsService.sendBrowserBookmarks?.(roomId, sessionId, localBookmarks);
    }
  }, [isHost, roomId, sessionId, wsService, serverBookmarks, localBookmarks]);

  // Close bookmarks popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        bookmarkDropdownRef.current &&
        !bookmarkDropdownRef.current.contains(e.target as Node)
      ) {
        setIsBookmarksOpen(false);
        setShowAddBookmarkForm(false);
      }
    };
    if (isBookmarksOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isBookmarksOpen]);

  // Handle wheel scrolling for guest when disableClick is enabled
  const handleGuestWheel = () => {
    if (!isHost && disableClick) {
      setIsWheelScrolling(true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsWheelScrolling(false);
      }, 350);
    }
  };

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Host Config Toggles
  const handleToggleHideUrl = () => {
    if (!isHost || !roomId) return;
    const nextVal = !hideUrl;
    wsService?.sendBrowserConfig?.(roomId, sessionId, { hideUrl: nextVal });
  };

  const handleToggleDisableClick = () => {
    if (!isHost || !roomId) return;
    const nextVal = !disableClick;
    wsService?.sendBrowserConfig?.(roomId, sessionId, { disableClick: nextVal });
  };

  // Bookmark Management
  const handleAddBookmark = (urlToAdd?: string, titleToAdd?: string) => {
    const targetUrl = (urlToAdd || customBookmarkUrl || browserUrl || browserInputUrl || '').trim();
    if (!targetUrl) return;

    let targetTitle = (titleToAdd || customBookmarkTitle).trim();
    if (!targetTitle) {
      try {
        const parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
        targetTitle = parsed.hostname.replace(/^www\./, '') + (parsed.pathname !== '/' ? parsed.pathname : '');
      } catch (_) {
        targetTitle = targetUrl;
      }
    }

    const newBookmark: BookmarkItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: targetTitle,
      url: targetUrl,
    };

    const updated = [newBookmark, ...bookmarks.filter(b => b.url !== targetUrl)];
    setLocalBookmarks(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (_) {}

    if (isHost && roomId) {
      wsService?.sendBrowserBookmarks?.(roomId, sessionId, updated);
    }

    setCustomBookmarkTitle('');
    setCustomBookmarkUrl('');
    setShowAddBookmarkForm(false);
  };

  const handleRemoveBookmark = (idToRemove: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = bookmarks.filter(b => b.id !== idToRemove);
    setLocalBookmarks(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (_) {}

    if (isHost && roomId) {
      wsService?.sendBrowserBookmarks?.(roomId, sessionId, updated);
    }
  };

  const handleOpenBookmark = (item: BookmarkItem) => {
    setBrowserInputUrl(item.url);
    if (isHost && roomId) {
      wsService?.sendBrowserUrl(roomId, sessionId, item.url);
    }
    setIsBookmarksOpen(false);
  };

  // Find currently matched bookmark if loaded page is a bookmarked site
  const matchedBookmark = bookmarks.find(b => {
    if (!b.url) return false;
    const clean = (u: string) => (u || '').trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/$/, '');
    const bUrl = clean(b.url);
    const currentBrowserUrl = clean(browserUrl);
    const currentInputUrl = clean(browserInputUrl);
    return (currentBrowserUrl && bUrl === currentBrowserUrl) || (currentInputUrl && bUrl === currentInputUrl);
  });

  if (!isBrowserOpen) return null;

  // Determine displayed Value and Placeholder for Address Bar
  const isUrlHiddenForViewer = !isHost && hideUrl;
  const addressPlaceholder = isHost
    ? 'Enter URL (e.g. intoai.ai) and press Enter...'
    : isUrlHiddenForViewer
    ? '🔒 Protected Synchronized Session (URL Hidden)'
    : "Presenter's URL";

  // When a bookmark matches and user isn't editing, show the bookmark title for the HOST ONLY
  const addressValue = isHost
    ? isAddressBarFocused
      ? browserInputUrl
      : matchedBookmark
      ? matchedBookmark.title
      : browserInputUrl
    : isUrlHiddenForViewer
    ? '••••••••••••••••••••••••••••'
    : browserUrl;

  const isCurrentUrlBookmarked = Boolean(matchedBookmark);

  const rawUrl = (browserUrl || '').trim();
  const normalizedUrl = rawUrl
    ? /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : `https://${rawUrl}`
    : '';

  return (
    <div
      style={{
        position: 'absolute',
        top: isEnlarged ? '24px' : 'auto',
        left: isEnlarged ? '24px' : 'auto',
        bottom: '24px',
        right: isEnlarged ? '24px' : isTerminalOpen ? '564px' : '24px',
        width: isEnlarged ? 'calc(100% - 48px)' : '680px',
        height: isEnlarged ? 'calc(100% - 48px)' : '460px',
        background: 'var(--affine-background-primary-color)',
        border: '1px solid var(--affine-border-color)',
        borderRadius: '12px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.22)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
        zIndex: isEnlarged ? 9999 : 998,
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        fontFamily: 'var(--affine-font-family)',
      }}
    >
      {/* ── Row 1: Top Navigation / URL Bar ── */}
      <div
        style={{
          height: '44px',
          background: 'var(--affine-background-secondary-color)',
          borderBottom: '1px solid var(--affine-border-color)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          justifyContent: 'space-between',
          userSelect: 'none',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
          gap: '8px',
        }}
      >
        {/* macOS Circles */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#ff5f56',
            }}
          />
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#ffbd2e',
            }}
          />
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#27c93f',
            }}
          />
        </div>

        {/* Address Bar */}
        <div
          style={{
            flex: 1,
            height: '28px',
            margin: '0 4px',
            display: 'flex',
            alignItems: 'center',
            background: isUrlHiddenForViewer
              ? 'rgba(0, 0, 0, 0.04)'
              : 'var(--affine-background-primary-color)',
            border: isHost && matchedBookmark && !isUrlHiddenForViewer
              ? '1px solid rgba(30, 144, 255, 0.35)'
              : '1px solid var(--affine-border-color)',
            borderRadius: '20px',
            padding: '0 10px',
            gap: '6px',
            minWidth: '160px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              opacity: isUrlHiddenForViewer ? 0.9 : 0.7,
              color: isUrlHiddenForViewer
                ? 'var(--affine-warning-color, #f59e0b)'
                : isHost && matchedBookmark
                ? 'var(--affine-primary-color, #1e90ff)'
                : 'inherit',
            }}
          >
            {isHost && matchedBookmark && !isUrlHiddenForViewer ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            ) : (
              <LockIcon style={{ width: 13, height: 13 }} />
            )}
          </span>
          <input
            type="text"
            disabled={!isHost}
            placeholder={addressPlaceholder}
            value={addressValue}
            onFocus={() => {
              if (isHost) setIsAddressBarFocused(true);
            }}
            onBlur={() => {
              if (isHost) setIsAddressBarFocused(false);
            }}
            onChange={e => {
              if (isHost) setBrowserInputUrl(e.target.value);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && isHost) {
                wsService.sendBrowserUrl(roomId, sessionId, browserInputUrl);
                (e.target as HTMLInputElement).blur();
              }
            }}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '11.5px',
              fontWeight: isHost && matchedBookmark && !isAddressBarFocused && !isUrlHiddenForViewer ? 600 : 400,
              letterSpacing: isUrlHiddenForViewer ? '2px' : 'normal',
              color: isUrlHiddenForViewer
                ? 'var(--affine-text-secondary-color)'
                : isHost && matchedBookmark && !isAddressBarFocused
                ? 'var(--affine-primary-color, #1e90ff)'
                : 'var(--affine-text-primary-color)',
              cursor: isHost ? 'text' : 'default',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Top-Right Action Controls (Open in Tab, Enlarge, Close) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          {/* Open in new tab button: Visible to HOST always; Visible to GUEST ONLY when hideUrl is disabled */}
          {(isHost || !hideUrl) && (
            <button
              onClick={() => {
                const url = browserUrl || browserInputUrl;
                if (url) {
                  let targetUrl = url;
                  if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'https://' + targetUrl;
                  window.open(targetUrl, '_blank');
                }
              }}
              style={{
                padding: '4px 9px',
                fontSize: '11px',
                fontWeight: 500,
                borderRadius: '6px',
                background: 'var(--affine-background-primary-color)',
                border: '1px solid var(--affine-border-color)',
                color: 'var(--affine-text-primary-color)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontFamily: 'inherit',
                transition: 'background 0.15s ease',
              }}
              title="Open website in new browser tab"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span>Open in tab</span>
            </button>
          )}

          {/* Enlarge / Restore Button (Host only) */}
          {isHost && (
            <button
              onClick={toggleEnlarge}
              style={{
                border: 'none',
                background: 'none',
                color: 'var(--affine-text-secondary-color)',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '0 4px',
                display: 'flex',
                alignItems: 'center',
              }}
              title={isEnlarged ? 'Restore size' : 'Enlarge full window'}
            >
              {isEnlarged ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              )}
            </button>
          )}

          {/* Close Button (Host only) */}
          {isHost ? (
            <button
              onClick={toggleBrowser}
              style={{
                border: 'none',
                background: 'none',
                color: 'var(--affine-text-secondary-color)',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 4px',
                lineHeight: 1,
              }}
              title="Close browser panel"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Row 2: Host Control Bar (Host Only - Below the URL row) ── */}
      {isHost && (
        <div
          style={{
            height: '36px',
            background: 'var(--affine-background-primary-color)',
            borderBottom: '1px solid var(--affine-border-color)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            gap: '8px',
            userSelect: 'none',
          }}
        >
          {/* 1. Hide URL Button */}
          <button
            onClick={handleToggleHideUrl}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              fontSize: '11px',
              fontWeight: 500,
              borderRadius: '6px',
              border: '1px solid',
              borderColor: hideUrl
                ? 'var(--affine-primary-color, #1e90ff)'
                : 'var(--affine-border-color)',
              background: hideUrl
                ? 'var(--affine-primary-color, #1e90ff)'
                : 'transparent',
              color: hideUrl ? '#ffffff' : 'var(--affine-text-secondary-color)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              lineHeight: '16px',
            }}
            title={
              hideUrl
                ? 'Hide URL is ENABLED: End users cannot see the URL or open it in a tab'
                : 'Hide URL is DISABLED: End users can view URL and open in new tab'
            }
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {hideUrl ? (
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="3" />
                </>
              )}
            </svg>
            <span>Hide URL</span>
          </button>

          {/* 2. Disable Click Button */}
          <button
            onClick={handleToggleDisableClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              fontSize: '11px',
              fontWeight: 500,
              borderRadius: '6px',
              border: '1px solid',
              borderColor: disableClick
                ? 'var(--affine-primary-color, #1e90ff)'
                : 'var(--affine-border-color)',
              background: disableClick
                ? 'var(--affine-primary-color, #1e90ff)'
                : 'transparent',
              color: disableClick ? '#ffffff' : 'var(--affine-text-secondary-color)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              lineHeight: '16px',
            }}
            title={
              disableClick
                ? 'Disable Click is ENABLED: End users can scroll but cannot click links or elements'
                : 'Disable Click is DISABLED: End users can interact with website'
            }
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              {disableClick && <line x1="13" y1="13" x2="21" y2="21" stroke="currentColor" strokeWidth="2.5" />}
            </svg>
            <span>Disable Click</span>
          </button>

          {/* 3. Bookmark Dropdown Toggle */}
          <div style={{ position: 'relative' }} ref={bookmarkDropdownRef}>
            <button
              onClick={() => setIsBookmarksOpen(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 9px',
                fontSize: '11px',
                fontWeight: 500,
                borderRadius: '6px',
                border: '1px solid',
                borderColor: isBookmarksOpen || isCurrentUrlBookmarked
                  ? 'var(--affine-primary-color, #1e90ff)'
                  : 'var(--affine-border-color)',
                background: isBookmarksOpen
                  ? 'var(--affine-primary-color, #1e90ff)'
                  : isCurrentUrlBookmarked
                  ? 'rgba(30, 144, 255, 0.12)'
                  : 'transparent',
                color: isBookmarksOpen
                  ? '#ffffff'
                  : isCurrentUrlBookmarked
                  ? 'var(--affine-primary-color, #1e90ff)'
                  : 'var(--affine-text-secondary-color)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                lineHeight: '16px',
              }}
              title="Meeting Bookmarks: Save and quickly switch between websites"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill={isCurrentUrlBookmarked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <span>Bookmarks</span>
              {bookmarks.length > 0 && (
                <span
                  style={{
                    background: isBookmarksOpen ? '#ffffff' : 'var(--affine-primary-color, #1e90ff)',
                    color: isBookmarksOpen ? 'var(--affine-primary-color, #1e90ff)' : '#ffffff',
                    fontSize: '9.5px',
                    padding: '1px 4px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    marginLeft: '2px',
                    lineHeight: 1,
                  }}
                >
                  {bookmarks.length}
                </span>
              )}
            </button>

            {/* Bookmark Popover Menu */}
            {isBookmarksOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  width: '300px',
                  background: 'var(--affine-background-primary-color)',
                  border: '1px solid var(--affine-border-color)',
                  borderRadius: '10px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
                  padding: '12px',
                  zIndex: 10001,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  animation: 'fadeInMenu 0.15s ease',
                }}
              >
                <style>{`@keyframes fadeInMenu { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '8px',
                    borderBottom: '1px solid var(--affine-border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--affine-primary-color, #1e90ff)" stroke="var(--affine-primary-color, #1e90ff)" strokeWidth="2">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--affine-text-primary-color)' }}>
                      Meeting Bookmarks
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAddBookmarkForm(prev => !prev)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--affine-primary-color, #1e90ff)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: 500,
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {showAddBookmarkForm ? 'Cancel' : '+ Add Custom'}
                  </button>
                </div>

                {/* Quick Bookmark Current Page Button */}
                {(browserUrl || browserInputUrl) && (
                  <button
                    onClick={() => handleAddBookmark(browserUrl || browserInputUrl)}
                    disabled={isCurrentUrlBookmarked}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px dashed var(--affine-border-color)',
                      background: isCurrentUrlBookmarked
                        ? 'rgba(0, 0, 0, 0.02)'
                        : 'rgba(30, 144, 255, 0.06)',
                      color: isCurrentUrlBookmarked
                        ? 'var(--affine-text-secondary-color)'
                        : 'var(--affine-primary-color, #1e90ff)',
                      fontSize: '11.5px',
                      fontWeight: 500,
                      cursor: isCurrentUrlBookmarked ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {isCurrentUrlBookmarked ? 'Current Page is Bookmarked' : 'Bookmark Current Page'}
                  </button>
                )}

                {/* Custom Add Form */}
                {showAddBookmarkForm && (
                  <div
                    style={{
                      background: 'var(--affine-background-secondary-color)',
                      padding: '8px',
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Bookmark Title (e.g. Documentation)"
                      value={customBookmarkTitle}
                      onChange={e => setCustomBookmarkTitle(e.target.value)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: '1px solid var(--affine-border-color)',
                        background: 'var(--affine-background-primary-color)',
                        color: 'var(--affine-text-primary-color)',
                        outline: 'none',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Website URL (e.g. intoai.ai)"
                      value={customBookmarkUrl}
                      onChange={e => setCustomBookmarkUrl(e.target.value)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: '1px solid var(--affine-border-color)',
                        background: 'var(--affine-background-primary-color)',
                        color: 'var(--affine-text-primary-color)',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleAddBookmark()}
                      style={{
                        padding: '5px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        background: 'var(--affine-primary-color, #1e90ff)',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Save Bookmark
                    </button>
                  </div>
                )}

                {/* Bookmarks List: Title only */}
                <div
                  style={{
                    maxHeight: '180px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {bookmarks.length === 0 ? (
                    <div
                      style={{
                        padding: '16px 8px',
                        textAlign: 'center',
                        fontSize: '11.5px',
                        color: 'var(--affine-text-secondary-color)',
                      }}
                    >
                      No bookmarks saved for this meeting yet.
                    </div>
                  ) : (
                    bookmarks.map(item => {
                      const isSelected = matchedBookmark?.id === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleOpenBookmark(item)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            background: isSelected
                              ? 'rgba(30, 144, 255, 0.08)'
                              : 'transparent',
                            border: isSelected
                              ? '1px solid rgba(30, 144, 255, 0.2)'
                              : '1px solid transparent',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                          }}
                          title={`Click to open ${item.title}`}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              overflow: 'hidden',
                              flex: 1,
                              marginRight: '8px',
                            }}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill={isSelected ? 'var(--affine-primary-color, #1e90ff)' : 'none'}
                              stroke={isSelected ? 'var(--affine-primary-color, #1e90ff)' : 'currentColor'}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ flexShrink: 0, opacity: 0.8 }}
                            >
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                            </svg>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: isSelected ? 600 : 500,
                                color: isSelected
                                  ? 'var(--affine-primary-color, #1e90ff)'
                                  : 'var(--affine-text-primary-color)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {item.title}
                            </span>
                          </div>
                          <button
                            onClick={(e) => handleRemoveBookmark(item.id, e)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--affine-text-secondary-color)',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              opacity: 0.7,
                              flexShrink: 0,
                            }}
                            title="Delete bookmark"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Iframe Viewport Container ── */}
      <div
        ref={containerRef}
        onWheel={handleGuestWheel}
        style={{
          flex: 1,
          background: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px',
        }}
      >
        {normalizedUrl ? (
          <>
            <iframe
              ref={iframeRef}
              src={normalizedUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#ffffff',
                pointerEvents: !isHost && disableClick && !isWheelScrolling ? 'none' : 'auto',
                display: 'block',
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              loading="lazy"
            />
            {/* Guest overlay for Disable Click (allows wheel scrolling while intercepting clicks) */}
            {!isHost && disableClick && (
              <div
                onWheel={handleGuestWheel}
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 20,
                  cursor: 'default',
                  background: 'transparent',
                  pointerEvents: isWheelScrolling ? 'none' : 'auto',
                }}
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseDown={e => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseUp={e => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
            )}
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--affine-text-secondary-color)',
              fontSize: '13px',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            {isHost
              ? 'Enter a website URL above to present synchronized browsing.'
              : 'Presenter has not loaded a synchronized web page yet.'}
          </div>
        )}
      </div>
    </div>
  );
};
