import {
  Bold,
  Content,
  P,
  Template,
  Title,
} from '../components';

export type PaymentReceiptProps = {
  receiptNumber: string;
  invoiceId: string;
  invoiceTitle?: string;
  workspaceName?: string;
  clientName?: string;
  amountPaid: string;
  paymentDate: string;
  paymentMethod?: string;
  transactionId?: string;
  companyName?: string;
  companyEmail?: string;
};

export default function PaymentReceipt(props: PaymentReceiptProps) {
  const {
    receiptNumber,
    invoiceId,
    invoiceTitle = 'Commercial Invoice',
    workspaceName,
    clientName,
    amountPaid,
    paymentDate,
    paymentMethod = 'Bank Transfer',
    transactionId,
    companyName = 'IntoAI Technologies Pvt. Ltd.',
    companyEmail = 'connect@intoai.ai',
  } = props;

  // Never expose raw UUIDs in the email
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceName?.trim() || '');
  const cleanWorkspaceName = (!isUuid && workspaceName?.trim() && workspaceName.trim().toLowerCase() !== 'workspace')
    ? workspaceName.trim()
    : '';

  return (
    <Template>
      <Title>Payment Receipt: {receiptNumber}</Title>
      <Content>
        <P>
          Dear {clientName || 'Valued Client'},
        </P>
        <P>
          Thank you for your payment. This email confirms that your payment to <Bold>{companyName}</Bold>{cleanWorkspaceName ? <> for <Bold>{cleanWorkspaceName}</Bold></> : ''} has been successfully received and recorded.
        </P>
        
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderLeft: '4px solid #16a34a',
          borderRadius: '6px',
          padding: '16px 20px',
          margin: '20px 0',
          fontSize: '14px',
          lineHeight: '22px',
          color: '#1e293b',
        }}>
          <div style={{ marginBottom: '6px' }}>
            <Bold>Receipt Number:</Bold> <span style={{ fontFamily: 'monospace', color: '#15803d', fontWeight: 700 }}>{receiptNumber}</span>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <Bold>Invoice Reference:</Bold> <span style={{ fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>{invoiceId}</span> {invoiceTitle ? `(${invoiceTitle})` : ''}
          </div>
          <div style={{ marginBottom: '6px' }}>
            <Bold>Amount Paid:</Bold> <span style={{ fontWeight: 700, color: '#15803d', fontSize: '15px' }}>{amountPaid}</span>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <Bold>Payment Date:</Bold> {paymentDate}
          </div>
          <div style={{ marginBottom: '6px' }}>
            <Bold>Payment Method:</Bold> {paymentMethod}
          </div>
          {transactionId && (
            <div style={{ marginBottom: '6px' }}>
              <Bold>Transaction Ref / ID:</Bold> <span style={{ fontFamily: 'monospace', color: '#475569' }}>{transactionId}</span>
            </div>
          )}
          <div>
            <Bold>Payment Status:</Bold> <span style={{ color: '#16a34a', fontWeight: 700 }}>PAID / SETTLED</span>
          </div>
        </div>

        <P>
          Your official payment receipt is attached to this email in PDF format for your accounting records.
        </P>
        <P>
          If you have any questions or require additional billing assistance, please contact our accounts team at <a href={`mailto:${companyEmail}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>{companyEmail}</a>.
        </P>
      </Content>
    </Template>
  );
}

PaymentReceipt.PreviewProps = {
  receiptNumber: 'REC-2026-08421',
  invoiceId: 'INV-2026-INTOAI-084',
  invoiceTitle: 'Autonomous AI Agent Platform Development',
  workspaceName: 'Acme Enterprise Workspace',
  clientName: 'Sarah Jenkins',
  amountPaid: '₹41,77,200.00',
  paymentDate: '18 August 2026',
  paymentMethod: 'Bank Transfer (NEFT/RTGS)',
  transactionId: 'TXN_9872164',
  companyName: 'IntoAI Technologies Pvt. Ltd.',
  companyEmail: 'connect@intoai.ai',
} as PaymentReceiptProps;
