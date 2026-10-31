import {
  Bold,
  Content,
  P,
  Template,
  Title,
} from '../components';

export type RecurringInvoiceProps = {
  invoiceId: string;
  invoiceTitle: string;
  workspaceName?: string;
  clientName?: string;
  issueDate: string;
  dueDate: string;
  billingInterval: string;
  totalAmount?: string;
  status?: string;
  companyName?: string;
  companyEmail?: string;
};

export default function RecurringInvoice(props: RecurringInvoiceProps) {
  const {
    invoiceId,
    invoiceTitle,
    workspaceName,
    clientName,
    issueDate,
    dueDate,
    billingInterval,
    totalAmount,
    status = 'Unpaid / Pending Payment',
    companyName = 'IntoAI Technologies Pvt. Ltd.',
    companyEmail = 'connect@intoai.ai',
  } = props;

  // Never expose raw UUIDs in the email
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceName?.trim() || '');
  const cleanWorkspaceName = (!isUuid && workspaceName?.trim() && workspaceName.trim().toLowerCase() !== 'workspace')
    ? workspaceName.trim()
    : '';

  const intervalLabel =
    billingInterval === 'half_year'
      ? 'Half-Yearly (Every 6 Months)'
      : billingInterval === 'year'
        ? 'Yearly (Annual)'
        : 'Monthly';

  return (
    <Template>
      <Title>Commercial Invoice: {invoiceId}</Title>
      <Content>
        <P>
          Dear {clientName || 'Client'},
        </P>
        <P>
          This is an automated recurring commercial invoice from <Bold>{companyName}</Bold>{cleanWorkspaceName ? <> for your active services in <Bold>{cleanWorkspaceName}</Bold>.</> : <> for your active services.</>}
        </P>
        
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #2563eb',
          borderRadius: '6px',
          padding: '16px 20px',
          margin: '20px 0',
          fontSize: '14px',
          lineHeight: '22px',
          color: '#1e293b',
        }}>
          <div style={{ marginBottom: '6px' }}>
            <Bold>Invoice ID:</Bold> <span style={{ fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>{invoiceId}</span>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <Bold>Document Title:</Bold> {invoiceTitle}
          </div>
          <div style={{ marginBottom: '6px' }}>
            <Bold>Billing Interval:</Bold> {intervalLabel}
          </div>
          <div style={{ marginBottom: '6px' }}>
            <Bold>Issue Date:</Bold> {issueDate}
          </div>
          <div style={{ marginBottom: '6px' }}>
            <Bold>Due Date:</Bold> {dueDate}
          </div>
          {totalAmount && (
            <div style={{ marginBottom: '6px' }}>
              <Bold>Amount Due:</Bold> <span style={{ fontWeight: 700, color: '#0f172a' }}>{totalAmount}</span>
            </div>
          )}
          <div>
            <Bold>Payment Status:</Bold> <span style={{ color: '#d97706', fontWeight: 600 }}>{status}</span>
          </div>
        </div>

        <P>
          Please find the complete official commercial invoice in PDF format attached to this email.
        </P>
        <P>
          If you have any questions, require modifications, or need billing support, please reach out to our team at <a href={`mailto:${companyEmail}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>{companyEmail}</a>.
        </P>
      </Content>
    </Template>
  );
}

RecurringInvoice.PreviewProps = {
  invoiceId: 'INV-2026-894215',
  invoiceTitle: 'Annual Enterprise Cloud Infrastructure & SLA',
  workspaceName: 'Acme Global Workspace',
  clientName: 'Acme Corporation Ltd.',
  issueDate: 'August 15, 2026',
  dueDate: 'August 29, 2026',
  billingInterval: 'monthly',
  totalAmount: '₹1,47,500.00',
  status: 'Unpaid / Pending Payment',
  companyName: 'IntoAI Technologies Pvt. Ltd.',
  companyEmail: 'connect@intoai.ai',
};
