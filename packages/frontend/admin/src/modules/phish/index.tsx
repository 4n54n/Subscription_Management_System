import { useState, useEffect, useCallback } from 'react';
import { Header } from '../header';
import { affineFetch } from '../../fetch-utils';

interface PhishUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface PhishMonitoredUser {
  id: string;
  userId: string;
  email: string;
  status: string;
  msUserId?: string;
  msMailboxStatus?: string;
  totalReceivedMails: number;
  lastCheckedAt?: string;
  createdAt: string;
  user: PhishUser;
  emailsCount: number;
  incidentsCount: number;
}

interface PhishIncident {
  id: string;
  emailQueueId: string;
  monitoredUserId: string;
  riskLevel: 'clean' | 'suspicious' | 'phishing';
  riskScore: number;
  summary: string;
  indicators: string[];
  alertSent: boolean;
  createdAt: string;
}

interface PhishEmailQueueItem {
  id: string;
  monitoredUserId: string;
  messageId?: string;
  sender: string;
  recipient: string;
  subject: string;
  bodySnippet?: string;
  attachmentNames: string[];
  status: string;
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
  incident?: PhishIncident;
}

interface PhishCredentials {
  enabled: boolean;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  lastErrorMsg?: string;
  lastErrorAt?: string;
}

export function PhishDashboard() {
  const [monitoredUsers, setMonitoredUsers] = useState<PhishMonitoredUser[]>([]);
  const [incidents, setIncidents] = useState<PhishIncident[]>([]);
  const [credentials, setCredentials] = useState<PhishCredentials | null>(null);
  const [allQueue, setAllQueue] = useState<PhishEmailQueueItem[]>([]);
  const [activeTab, setActiveTab] = useState<'accounts' | 'queue'>('accounts');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'clean' | 'issues' | 'pending'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<PhishMonitoredUser | null>(null);
  const [userQueue, setUserQueue] = useState<PhishEmailQueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [fetchLoadingId, setFetchLoadingId] = useState<string | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState({
    userEmail: '',
    sender: 'security-update@account-verify-support.com',
    subject: 'Urgent: Verify your Microsoft 365 credentials immediately',
    bodySnippet: 'Dear user, your account access will be terminated in 24 hours. Click here to verify password.',
    attachmentNames: 'Invoice_Security_Update.exe',
  });
  const [testingInProg, setTestingInProg] = useState(false);

  const filterQueue = (queue: PhishEmailQueueItem[]) => {
    if (categoryFilter === 'clean') {
      return queue.filter(q => q.status === 'completed' && (!q.incident || q.incident.riskLevel === 'clean'));
    }
    if (categoryFilter === 'issues') {
      return queue.filter(q => q.incident?.riskLevel === 'phishing' || q.incident?.riskLevel === 'suspicious' || q.status === 'failed');
    }
    if (categoryFilter === 'pending') {
      return queue.filter(q => q.status === 'pending' || q.status === 'analyzing');
    }
    return queue;
  };

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const query = `
        query GetPhishDashboardData {
          phishCredentials {
            enabled
            tenantId
            clientId
            clientSecret
            lastErrorMsg
            lastErrorAt
          }
          phishMonitoredUsers {
            id
            userId
            email
            status
            msUserId
            msMailboxStatus
            totalReceivedMails
            lastCheckedAt
            createdAt
            user {
              id
              name
              email
              avatarUrl
            }
            emailsCount
            incidentsCount
          }
          phishIncidents {
            id
            emailQueueId
            monitoredUserId
            riskLevel
            riskScore
            summary
            indicators
            alertSent
            createdAt
          }
          phishAllInspectionQueue {
            id
            monitoredUserId
            messageId
            sender
            recipient
            subject
            bodySnippet
            attachmentNames
            status
            retryCount
            errorMessage
            createdAt
            incident {
              id
              riskLevel
              riskScore
              summary
              indicators
              alertSent
              createdAt
            }
          }
        }
      `;

      const res = await affineFetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      if (data?.data) {
        setCredentials(data.data.phishCredentials || null);
        setMonitoredUsers(data.data.phishMonitoredUsers || []);
        setIncidents(data.data.phishIncidents || []);
        setAllQueue(data.data.phishAllInspectionQueue || []);
      }
    } catch (e) {
      console.error('Failed to load phish dashboard data', e);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const loadUserQueue = useCallback(async (user: PhishMonitoredUser, showLoading = true) => {
    setSelectedUser(user);
    if (showLoading) setQueueLoading(true);
    try {
      const query = `
        query GetUserQueue($userId: String!) {
          phishUserInspectionQueue(userId: $userId) {
            id
            monitoredUserId
            messageId
            sender
            recipient
            subject
            bodySnippet
            attachmentNames
            status
            retryCount
            errorMessage
            createdAt
            incident {
              id
              riskLevel
              riskScore
              summary
              indicators
              alertSent
              createdAt
            }
          }
        }
      `;

      const res = await affineFetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { userId: user.userId } }),
      });

      const data = await res.json();
      if (data?.data?.phishUserInspectionQueue) {
        setUserQueue(data.data.phishUserInspectionQueue);
      }
    } catch (e) {
      console.error('Failed to load user queue', e);
    } finally {
      if (showLoading) setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Real-time auto-polling so pending emails automatically update to completed (green) live
  useEffect(() => {
    const timer = setInterval(() => {
      loadData(false);
      if (selectedUser) {
        loadUserQueue(selectedUser, false);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [loadData, loadUserQueue, selectedUser]);

  const handleFetchMailbox = async (userId: string) => {
    setFetchLoadingId(userId);
    try {
      const mutation = `
        mutation FetchMailbox($userId: String!) {
          fetchUserMicrosoftMailbox(userId: $userId) {
            id
            status
            msMailboxStatus
          }
        }
      `;

      const res = await affineFetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: mutation, variables: { userId } }),
      });

      const data = await res.json();
      if (data?.data?.fetchUserMicrosoftMailbox) {
        await loadData(false);
      }
    } catch (e) {
      console.error('Failed to fetch Microsoft mailbox', e);
    } finally {
      setFetchLoadingId(null);
    }
  };

  const handleRunTestIngest = async () => {
    if (!testEmail.userEmail) return;
    setTestingInProg(true);
    try {
      const attachments = testEmail.attachmentNames
        ? testEmail.attachmentNames.split(',').map(a => a.trim()).filter(Boolean)
        : [];

      const mutation = `
        mutation TestIngest($userEmail: String!, $sender: String!, $subject: String!, $bodySnippet: String, $attachmentNames: [String!]) {
          ingestEmailForPhishCheck(userEmail: $userEmail, sender: $sender, subject: $subject, bodySnippet: $bodySnippet, attachmentNames: $attachmentNames) {
            id
            status
            incident {
              riskLevel
              riskScore
              summary
            }
          }
        }
      `;

      await affineFetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: mutation,
          variables: {
            userEmail: testEmail.userEmail,
            sender: testEmail.sender,
            subject: testEmail.subject,
            bodySnippet: testEmail.bodySnippet,
            attachmentNames: attachments,
          },
        }),
      });

      setTestModalOpen(false);
      await loadData(false);
      if (selectedUser && selectedUser.email === testEmail.userEmail) {
        await loadUserQueue(selectedUser, false);
      }
    } catch (e) {
      console.error('Test ingestion failed', e);
    } finally {
      setTestingInProg(false);
    }
  };

  const totalInspected = allQueue.filter(q => q.status === 'completed').length;
  const totalPending = allQueue.filter(q => q.status === 'pending' || q.status === 'analyzing').length;
  const totalThreats = incidents.length;

  const renderQueueCard = (item: PhishEmailQueueItem) => {
    const threat = item.incident;
    const isPending = item.status === 'pending' || item.status === 'analyzing';
    const isFailed = item.status === 'failed';
    const isPhish = threat?.riskLevel === 'phishing';
    const isSusp = threat?.riskLevel === 'suspicious';
    const isCompletedClean = item.status === 'completed' && (!threat || threat.riskLevel === 'clean');

    // Clean neutral email client card styling by default (no full card background colors)
    const cardBg = '#ffffff';
    const cardBorder = '#e2e8f0';

    let badgeBg = '#dcfce7';
    let badgeBorder = '#86efac';
    let badgeColor = '#15803d';
    let badgeText = 'Clean (No Issues)';

    if (isPending) {
      badgeBg = '#fef9c3';
      badgeBorder = '#fde047';
      badgeColor = '#a16207';
      badgeText = 'Pending AI Inspection...';
    } else if (isFailed) {
      badgeBg = '#fee2e2';
      badgeBorder = '#fca5a5';
      badgeColor = '#b91c1c';
      badgeText = 'Inspection Failed';
    } else if (isPhish) {
      badgeBg = '#fee2e2';
      badgeBorder = '#fca5a5';
      badgeColor = '#b91c1c';
      badgeText = 'Issues Found: Phishing Threat';
    } else if (isSusp) {
      badgeBg = '#ffedd5';
      badgeBorder = '#fed7aa';
      badgeColor = '#c2410c';
      badgeText = 'Issues Found: Suspicious';
    } else if (isCompletedClean) {
      badgeBg = '#dcfce7';
      badgeBorder = '#86efac';
      badgeColor = '#15803d';
      badgeText = 'Clean (No Issues)';
    }

    return (
      <div
        key={item.id}
        style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
            background: badgeBg,
            color: badgeColor,
            border: `1px solid ${badgeBorder}`,
            letterSpacing: '0.3px',
          }}>
            {isPending && (
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706', animation: 'pulse 1.5s infinite' }}></span>
            )}
            {isCompletedClean && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
            )}
            {badgeText}
          </span>

          <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: "'IBM Plex Mono', monospace" }}>
            {new Date(item.createdAt).toLocaleString()}
          </span>
        </div>

        <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>{item.subject}</div>
        
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b', marginBottom: '8px', fontFamily: "'IBM Plex Mono', monospace" }}>
          <div>From: <span style={{ color: '#0f172a' }}>{item.sender}</span></div>
          <div>To: <span style={{ color: '#0f172a' }}>{item.recipient}</span></div>
        </div>

        {item.bodySnippet && (
          <div style={{ fontSize: '12px', color: '#475569', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
            "{item.bodySnippet}"
          </div>
        )}

        {item.attachmentNames && item.attachmentNames.length > 0 && (
          <div style={{ fontSize: '12px', color: '#334155', background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #cbd5e1' }}>
            <strong>Attachments:</strong> {item.attachmentNames.join(', ')}
          </div>
        )}

        {threat && (isPhish || isSusp) && (
          <div style={{ background: isPhish ? '#fef2f2' : '#fffbe6', borderLeft: `4px solid ${isPhish ? '#ef4444' : '#f59e0b'}`, padding: '12px 14px', borderRadius: '6px', marginTop: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: isPhish ? '#991b1b' : '#8c6b00', marginBottom: '4px' }}>
              AI Threat Breakdown (Risk Score: {threat.riskScore}/100)
            </div>
            <div style={{ fontSize: '12px', color: isPhish ? '#7f1d1d' : '#735100', marginBottom: '6px' }}>{threat.summary}</div>
            {threat.indicators && threat.indicators.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: isPhish ? '#991b1b' : '#8c6b00' }}>
                {threat.indicators.map((ind, i) => <li key={i}>{ind}</li>)}
              </ul>
            )}
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', fontWeight: 600 }}>
              Alert Email Status: {threat.alertSent ? 'Dispatched to user & CC company support' : 'No alert'}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderQueueStatsHeader = (
    queueList: PhishEmailQueueItem[],
    currentFilter: 'all' | 'clean' | 'issues' | 'pending',
    onFilterChange: (filter: 'all' | 'clean' | 'issues' | 'pending') => void,
    title?: string
  ) => {
    const total = queueList.length;
    const clean = queueList.filter(q => q.status === 'completed' && (!q.incident || q.incident.riskLevel === 'clean')).length;
    const issues = queueList.filter(q => q.incident?.riskLevel === 'phishing' || q.incident?.riskLevel === 'suspicious' || q.status === 'failed').length;
    const pending = queueList.filter(q => q.status === 'pending' || q.status === 'analyzing').length;

    return (
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        {title && (
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            {title} Email Inspection Categories (Click card to filter)
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          <div
            onClick={() => onFilterChange('all')}
            style={{
              background: currentFilter === 'all' ? '#e2e8f0' : '#f8fafc',
              border: `1px solid ${currentFilter === 'all' ? '#94a3b8' : '#e2e8f0'}`,
              borderRadius: '6px',
              padding: '8px 10px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>All Received Mails</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', fontFamily: "'IBM Plex Mono', monospace" }}>{total}</div>
          </div>
          <div
            onClick={() => onFilterChange('clean')}
            style={{
              background: currentFilter === 'clean' ? '#dcfce7' : '#f0fdf4',
              border: `1px solid ${currentFilter === 'clean' ? '#16a34a' : '#86efac'}`,
              borderRadius: '6px',
              padding: '8px 10px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#15803d', textTransform: 'uppercase' }}>Clean (No Issues)</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#16a34a', fontFamily: "'IBM Plex Mono', monospace" }}>{clean}</div>
          </div>
          <div
            onClick={() => onFilterChange('issues')}
            style={{
              background: currentFilter === 'issues' ? '#fee2e2' : '#fef2f2',
              border: `1px solid ${currentFilter === 'issues' ? '#dc2626' : '#f87171'}`,
              borderRadius: '6px',
              padding: '8px 10px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#b91c1c', textTransform: 'uppercase' }}>Issues Found</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#dc2626', fontFamily: "'IBM Plex Mono', monospace" }}>{issues}</div>
          </div>
          <div
            onClick={() => onFilterChange('pending')}
            style={{
              background: currentFilter === 'pending' ? '#fef9c3' : '#fffbe6',
              border: `1px solid ${currentFilter === 'pending' ? '#d97706' : '#facc15'}`,
              borderRadius: '6px',
              padding: '8px 10px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#a16207', textTransform: 'uppercase' }}>Pending AI</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#d97706', fontFamily: "'IBM Plex Mono', monospace" }}>{pending}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif", color: '#0f172a', background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header title="Phish Mail Monitoring & AI Defense" />

      <div style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        
        {/* System Error & Auto-Retry Status Banner */}
        {credentials?.lastErrorMsg && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b' }}>
                  Recent Phish Inspection System Alert
                </div>
                <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '2px' }}>
                  {credentials.lastErrorMsg}
                </div>
                {credentials.lastErrorAt && (
                  <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', fontFamily: "'IBM Plex Mono', monospace" }}>
                    Occurred at: {new Date(credentials.lastErrorAt).toLocaleString()} &bull; Auto-retry active (5 mins delay timer)
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => loadData(true)}
              style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
            >
              Retry Now
            </button>
          </div>
        )}

        {/* Status Notification Bar */}
        {credentials && !credentials.enabled && (
          <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: '#8c6b00' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
              <span>Phish mail monitoring is currently disabled. Go to Admin &gt; Settings &gt; Phish Auth to configure Microsoft credentials and enable background AI inspection.</span>
            </div>
            <a href="/admin/settings/phish" style={{ color: '#0565ff', fontWeight: 600, textDecoration: 'none' }}>Open Settings &rarr;</a>
          </div>
        )}

        {/* Top Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Monitored Accounts</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', fontFamily: "'IBM Plex Mono', monospace" }}>{monitoredUsers.length}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Registered users in database</div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Pending Inspection</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: totalPending > 0 ? '#f59e0b' : '#64748b', fontFamily: "'IBM Plex Mono', monospace" }}>{totalPending}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Emails queued for AI check</div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Completed Inspections</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981', fontFamily: "'IBM Plex Mono', monospace" }}>{totalInspected}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Turned green after verification</div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Threat Alerts</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: totalThreats > 0 ? '#ef4444' : '#10b981', fontFamily: "'IBM Plex Mono', monospace" }}>{totalThreats}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Alerts dispatched</div>
          </div>
        </div>

        {/* Tab Navigation Header & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '2px' }}>
            <button
              onClick={() => setActiveTab('accounts')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'accounts' ? '3px solid #0565ff' : '3px solid transparent',
                padding: '8px 16px',
                fontSize: '15px',
                fontWeight: activeTab === 'accounts' ? 700 : 500,
                color: activeTab === 'accounts' ? '#0565ff' : '#64748b',
                cursor: 'pointer',
                marginBottom: '-2px',
              }}
            >
              Monitored Accounts ({monitoredUsers.length})
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'queue' ? '3px solid #0565ff' : '3px solid transparent',
                padding: '8px 16px',
                fontSize: '15px',
                fontWeight: activeTab === 'queue' ? 700 : 500,
                color: activeTab === 'queue' ? '#0565ff' : '#64748b',
                cursor: 'pointer',
                marginBottom: '-2px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Global Inspection Queue ({allQueue.length})</span>
              {totalPending > 0 && (
                <span style={{ background: '#f59e0b', color: '#ffffff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                  {totalPending} pending
                </span>
              )}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setTestModalOpen(true)}
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              <span>Test AI Phish Check</span>
            </button>

            <button
              onClick={() => loadData(true)}
              style={{ background: '#0565ff', border: 'none', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Monitored Accounts Table */}
        {activeTab === 'accounts' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>User Account</th>
                  <th style={{ padding: '12px 16px' }}>MS Mailbox Status</th>
                  <th style={{ padding: '12px 16px' }}>Monitoring State</th>
                  <th style={{ padding: '12px 16px' }}>Total Received Mails</th>
                  <th style={{ padding: '12px 16px' }}>Inspected Incoming Mails</th>
                  <th style={{ padding: '12px 16px' }}>Threat Alerts</th>
                  <th style={{ padding: '12px 16px' }}>Last Checked</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Loading monitored accounts data...</td>
                  </tr>
                ) : monitoredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No monitored accounts found. New accounts are automatically added upon registration.</td>
                  </tr>
                ) : (
                  monitoredUsers.map(item => {
                    const isMonitored = item.status === 'monitored';
                    const isNotReg = item.status === 'not_registered';

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#475569', fontSize: '12px' }}>
                              {item.user?.name ? item.user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.user?.name || 'User'}</div>
                              <div style={{ fontSize: '12px', color: '#64748b', fontFamily: "'IBM Plex Mono', monospace" }}>{item.email}</div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <span
                            title={item.msMailboxStatus || undefined}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: isMonitored ? '#ecfdf5' : (isNotReg ? '#f1f5f9' : '#fef2f2'),
                              color: isMonitored ? '#047857' : (isNotReg ? '#64748b' : '#b91c1c'),
                              border: `1px solid ${isMonitored ? '#a7f3d0' : (isNotReg ? '#cbd5e1' : '#fca5a5')}`,
                              maxWidth: '220px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isMonitored ? '#10b981' : (isNotReg ? '#94a3b8' : '#ef4444'), flexShrink: 0 }}></span>
                            <span>{isMonitored ? 'Mailbox Active' : (isNotReg ? 'No MS Mailbox' : (item.msMailboxStatus || 'Query Failed'))}</span>
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontWeight: 600, color: isMonitored ? '#0f172a' : '#64748b', textTransform: 'capitalize' }}>
                            {item.status.replace('_', ' ')}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: '#0f172a' }}>
                          {item.totalReceivedMails || 0}
                        </td>

                        <td style={{ padding: '12px 16px', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: '#0565ff' }}>
                          {item.emailsCount || 0}
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: item.incidentsCount > 0 ? '#fef2f2' : '#f1f5f9',
                            color: item.incidentsCount > 0 ? '#b91c1c' : '#64748b',
                            fontFamily: "'IBM Plex Mono', monospace"
                          }}>
                            {item.incidentsCount} threats
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                          {item.lastCheckedAt ? new Date(item.lastCheckedAt).toLocaleString() : 'Never'}
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              onClick={() => handleFetchMailbox(item.userId)}
                              disabled={fetchLoadingId === item.userId}
                              title="Re-query Microsoft Graph API to check mailbox status"
                              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '5px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              {fetchLoadingId === item.userId ? 'Checking...' : 'Fetch MS Mailbox'}
                            </button>

                            <button
                              onClick={() => loadUserQueue(item, true)}
                              style={{ background: '#0565ff', border: 'none', color: '#ffffff', padding: '5px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              View Queue &amp; History
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Global Inspection Queue */}
        {activeTab === 'queue' && (
          <div>
            <div style={{ marginBottom: '14px', fontSize: '13px', color: '#64748b' }}>
              Real-time feed of all received emails. Click any category card below to filter by status (All, Clean, Issues Found, Pending AI).
            </div>

            {renderQueueStatsHeader(allQueue, categoryFilter, setCategoryFilter, 'Global')}

            <div style={{ maxHeight: 'calc(100vh - 440px)', overflowY: 'auto', paddingRight: '6px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>Loading global inspection queue...</div>
              ) : filterQueue(allQueue).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>No emails match the selected category filter ({categoryFilter}).</div>
              ) : (
                filterQueue(allQueue).map(renderQueueCard)
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Queue & Inspection History Drawer / Modal */}
      {selectedUser && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '640px', background: '#ffffff', borderLeft: '1px solid #cbd5e1', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Inspection Queue &amp; Logs</div>
              <div style={{ fontSize: '12px', color: '#64748b', fontFamily: "'IBM Plex Mono', monospace" }}>{selectedUser.email}</div>
            </div>
            <button onClick={() => setSelectedUser(null)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
          </div>

          <div style={{ padding: '16px 24px 0 24px' }}>
            {renderQueueStatsHeader(userQueue, categoryFilter, setCategoryFilter, 'Account')}
          </div>

          <div style={{ padding: '0 24px 20px 24px', flex: 1, overflowY: 'auto' }}>
            {queueLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading email queue...</div>
            ) : filterQueue(userQueue).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No email inspection records match the selected category filter ({categoryFilter}).</div>
            ) : (
              filterQueue(userQueue).map(renderQueueCard)
            )}
          </div>
        </div>
      )}

      {/* Test AI Inspection Modal */}
      {testModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '540px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Test AI Phishing Inspection</div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>Simulate an incoming mail event to test Google Gemini AI analysis and threat alerting.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Target User Account Email</label>
                <select
                  value={testEmail.userEmail}
                  onChange={e => setTestEmail({ ...testEmail, userEmail: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                >
                  <option value="">-- Select Monitored User --</option>
                  {monitoredUsers.map(u => (
                    <option key={u.id} value={u.email}>{u.user?.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Sender Email Address</label>
                <input
                  type="text"
                  value={testEmail.sender}
                  onChange={e => setTestEmail({ ...testEmail, sender: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Email Subject</label>
                <input
                  type="text"
                  value={testEmail.subject}
                  onChange={e => setTestEmail({ ...testEmail, subject: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Attachment Names (comma separated)</label>
                <input
                  type="text"
                  value={testEmail.attachmentNames}
                  onChange={e => setTestEmail({ ...testEmail, attachmentNames: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Email Body Snippet</label>
                <textarea
                  value={testEmail.bodySnippet}
                  onChange={e => setTestEmail({ ...testEmail, bodySnippet: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button
                onClick={() => setTestModalOpen(false)}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRunTestIngest}
                disabled={testingInProg || !testEmail.userEmail}
                style={{ background: '#0565ff', border: 'none', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                {testingInProg ? 'Analyzing with AI...' : 'Run Phish Check'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { PhishDashboard as Component };
