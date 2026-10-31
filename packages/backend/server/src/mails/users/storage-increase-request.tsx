import { Content, P, SecondaryText, Template, Title, Bold } from '../components';

export interface StorageIncreaseRequestProps {
  userName: string;
  userEmail: string;
  currentUsageFormatted: string;
  currentQuotaFormatted: string;
  requestedGb: number;
  requestedAtFormatted: string;
}

export default function StorageIncreaseRequest({
  userName,
  userEmail,
  currentUsageFormatted,
  currentQuotaFormatted,
  requestedGb,
  requestedAtFormatted,
}: StorageIncreaseRequestProps) {
  return (
    <Template>
      <Title>Storage Increase Request</Title>
      <Content>
        <P>
          A new storage increase request has been submitted by <Bold>{userName}</Bold>.
        </P>
        <div
          className="email-box"
          style={{
            backgroundColor: '#f4f4f5',
            border: '1px solid #e0e0e0',
            borderLeft: '4px solid #0f62fe',
            padding: '18px 22px',
            borderRadius: '6px',
            margin: '20px 0',
            fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
            fontSize: '14px',
            color: '#161616',
            lineHeight: '1.6',
          }}
        >
          <div style={{ marginBottom: '8px' }}>
            <span className="email-muted" style={{ color: '#525252' }}>User Name:</span>{' '}
            <Bold>{userName}</Bold>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <span className="email-muted" style={{ color: '#525252' }}>User Email:</span>{' '}
            <Bold>{userEmail}</Bold>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <span className="email-muted" style={{ color: '#525252' }}>Current Storage Usage:</span>{' '}
            <Bold>{currentUsageFormatted}</Bold>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <span className="email-muted" style={{ color: '#525252' }}>Current Quota:</span>{' '}
            <Bold>{currentQuotaFormatted}</Bold>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <span className="email-muted" style={{ color: '#525252' }}>Requested Storage:</span>{' '}
            <Bold>{requestedGb} GB</Bold>
          </div>
          <div>
            <span className="email-muted" style={{ color: '#525252' }}>Requested At:</span>{' '}
            <Bold>{requestedAtFormatted}</Bold>
          </div>
        </div>
        <P>
          <SecondaryText>
            You can manage or grant additional storage quota for this user in the Admin Dashboard under Accounts Management.
          </SecondaryText>
        </P>
      </Content>
    </Template>
  );
}
