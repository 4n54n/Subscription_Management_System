import {
  Bold,
  Button,
  Content,
  P,
  Template,
  Title,
} from '../components';

export type OverduePaymentNoticeProps = {
  invoiceId: string;
  invoiceTitle: string;
  workspaceName?: string;
  clientName?: string;
  dueDate: string;
  amountDue: string;
  latePaymentPolicyUrl?: string;
  companyName?: string;
  companyEmail?: string;
};

export default function OverduePaymentNotice(props: OverduePaymentNoticeProps) {
  const {
    invoiceId,
    invoiceTitle = 'Commercial Invoice',
    workspaceName,
    clientName,
    dueDate,
    amountDue,
    latePaymentPolicyUrl = 'https://www.intoai.ai/terms#late-payment-policy',
    companyName = 'IntoAI Technologies Pvt. Ltd.',
    companyEmail = 'connect@intoai.ai',
  } = props;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceName?.trim() || '');
  const cleanWorkspaceName = (!isUuid && workspaceName?.trim() && workspaceName.trim().toLowerCase() !== 'workspace')
    ? workspaceName.trim()
    : '';

  return (
    <Template>
      <Title>Urgent: Payment Due Date Exceeded ({invoiceId})</Title>
      <Content>
        <P>
          Dear {clientName || 'Valued Client'},
        </P>
        <P>
          We are writing to inform you that payment for commercial invoice <Bold>{invoiceId}</Bold> issued by <Bold>{companyName}</Bold>{cleanWorkspaceName ? <> for <Bold>{cleanWorkspaceName}</Bold></> : ''} is now <Bold>past due</Bold>.
        </P>
        
        <div style={{
          backgroundColor: '#fff7ed',
          border: '1px solid #fed7aa',
          borderLeft: '4px solid #ea580c',
          borderRadius: '6px',
          padding: '16px 20px',
          margin: '20px 0',
          fontSize: '14px',
          lineHeight: '22px',
          color: '#1e293b',
        }}>
          <div style={{ marginBottom: '6px' }}>
            <Bold>Invoice Reference:</Bold> <span style={{ fontFamily: 'monospace', color: '#ea580c', fontWeight: 700 }}>{invoiceId}</span>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <Bold>Description / Title:</Bold> {invoiceTitle}
          </div>
          <div style={{ marginBottom: '6px' }}>
            <Bold>Original Due Date:</Bold> <span style={{ color: '#dc2626', fontWeight: 600 }}>{dueDate}</span>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <Bold>Outstanding Amount Due:</Bold> <span style={{ fontWeight: 700, color: '#991b1b', fontSize: '15px' }}>{amountDue}</span>
          </div>
          <div>
            <Bold>Payment Status:</Bold> <span style={{ color: '#dc2626', fontWeight: 700 }}>OVERDUE / UNPAID</span>
          </div>
        </div>

        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          padding: '12px 16px',
          margin: '16px 0',
          fontSize: '13px',
          lineHeight: '20px',
          color: '#991b1b',
        }}>
          <strong>Important Notice:</strong> As the agreed payment due date has exceeded, additional late payment charges or interest fees may be assessed according to our payment terms.
        </div>

        {latePaymentPolicyUrl && (
          <div style={{ margin: '20px 0', textAlign: 'center' }}>
            <Button href={latePaymentPolicyUrl}>
              View Late Payment Fee Policy
            </Button>
          </div>
        )}

        <P>
          A copy of the invoice is attached to this email in PDF format. Please arrange for the settlement of this invoice at your earliest convenience to avoid any disruption of ongoing services.
        </P>
        <P>
          If you have already processed this payment, please disregard this notice or share the payment transaction reference with our accounts team at <a href={`mailto:${companyEmail}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>{companyEmail}</a>.
        </P>
      </Content>
    </Template>
  );
}

OverduePaymentNotice.PreviewProps = {
  invoiceId: 'INV-2026-INTOAI-084',
  invoiceTitle: 'Autonomous AI Agent Platform Development',
  workspaceName: 'Acme Enterprise Workspace',
  clientName: 'Sarah Jenkins',
  dueDate: '10 August 2026',
  amountDue: '₹41,77,200.00',
  latePaymentPolicyUrl: 'https://www.intoai.ai/terms#late-payment-policy',
  companyName: 'IntoAI Technologies Pvt. Ltd.',
  companyEmail: 'connect@intoai.ai',
} as OverduePaymentNoticeProps;
