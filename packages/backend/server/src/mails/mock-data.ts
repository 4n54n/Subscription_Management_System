const mockWorkspace = {
  name: 'IntoAI Workspace',
  avatar: 'https://app.affine.pro/favicon-192.png',
};

const mockUser = {
  email: 'admin@intoai.tech',
};

const mockDoc = {
  title: 'Q3 Product Roadmap & Strategy',
  url: 'http://localhost:8080/workspace/bf6e6a85-a0c2-4c99-8df7-fae01645f979/doc-123',
};

export const MOCK_DATA_MAP: Record<string, any> = {
  TestMail: {},
  WorkspaceGuestAccess: {
    url: 'http://localhost:8080/guest-passcode?token=guest_token_123',
    otp: '151457',
  },
  SignIn: {
    url: 'http://localhost:8080/magic-link?token=sign_in_token_123',
    otp: '592814',
  },
  SignUp: {
    url: 'http://localhost:8080/magic-link?token=sign_up_token_456',
    otp: '849301',
  },
  SetPassword: {
    url: 'http://localhost:8080/set-password?token=set_pwd_789',
  },
  ChangePassword: {
    url: 'http://localhost:8080/reset-password?token=reset_pwd_987',
  },
  VerifyEmail: {
    url: 'http://localhost:8080/verify-email?token=verify_email_654',
  },
  ChangeEmail: {
    url: 'http://localhost:8080/change-email?token=change_email_321',
  },
  VerifyChangeEmail: {
    url: 'http://localhost:8080/verify-change-email?token=verify_change_111',
  },
  EmailChanged: {
    to: 'new.email@intoai.tech',
  },
  StorageIncreaseRequest: {
    userName: 'John Doe',
    userEmail: 'john@intoai.tech',
    currentUsageFormatted: '10 GB',
    currentQuotaFormatted: '10 GB',
    requestedGb: 100,
    requestedAtFormatted: '2026-07-31',
  },
  WorkspaceGuestInvitation: {
    user: mockUser,
    workspace: mockWorkspace,
    url: 'http://localhost:8080/workspace/bf6e6a85-a0c2-4c99-8df7-fae01645f979/accept-invite?role=guest',
  },
  MemberInvitation: {
    user: mockUser,
    workspace: mockWorkspace,
    url: 'http://localhost:8080/workspace/bf6e6a85-a0c2-4c99-8df7-fae01645f979/accept-invite',
  },
  MemberAccepted: {
    user: { email: 'john.doe@intoai.tech' },
    workspace: mockWorkspace,
    url: 'http://localhost:8080/workspace/bf6e6a85-a0c2-4c99-8df7-fae01645f979/members',
  },
  MemberLeave: {
    user: { email: 'sarah.smith@intoai.tech' },
    workspace: mockWorkspace,
    url: 'http://localhost:8080/workspace/bf6e6a85-a0c2-4c99-8df7-fae01645f979',
  },
  LinkInvitationReviewRequest: {
    user: { email: 'candidate.user@intoai.tech' },
    workspace: mockWorkspace,
    url: 'http://localhost:8080/workspace/bf6e6a85-a0c2-4c99-8df7-fae01645f979/settings/invites',
  },
  LinkInvitationApprove: {
    workspace: mockWorkspace,
    url: 'http://localhost:8080/workspace/bf6e6a85-a0c2-4c99-8df7-fae01645f979',
  },
  LinkInvitationDecline: {
    workspace: mockWorkspace,
  },
  MemberRemoved: {
    workspace: mockWorkspace,
  },
  OwnershipTransferred: {
    workspace: mockWorkspace,
  },
  OwnershipReceived: {
    workspace: mockWorkspace,
    url: 'http://localhost:8080/workspace/bf6e6a85-a0c2-4c99-8df7-fae01645f979',
  },
  MeetingInvitation: {
    user: mockUser,
    workspace: mockWorkspace,
    docTitle: 'How to use folder and Tags',
    url: 'https://one.intoai.ai/join/sample-token',
    note: 'Looking forward to reviewing the new laboratory canvas features with everyone.',
  },
  Mention: {
    user: { email: 'colleague@intoai.tech' },
    doc: mockDoc,
  },
  TeamBecomeAdmin: {
    workspace: mockWorkspace,
    url: 'http://localhost:8080/workspace/bf6e6a85-a0c2-4c99-8df7-fae01645f979',
  },
  TeamBecomeCollaborator: {
    workspace: mockWorkspace,
    url: 'http://localhost:8080/workspace/bf6e6a85-a0c2-4c99-8df7-fae01645f979',
  },
  TeamWorkspaceDeleted: {
    workspace: mockWorkspace,
  },
  RecurringInvoice: {
    invoiceId: 'INV-2026-894215',
    invoiceTitle: 'Annual Enterprise Cloud Infrastructure & Advisory Services',
    workspaceName: 'Acme Global Workspace',
    clientName: 'Acme Corporation Ltd.',
    issueDate: 'August 15, 2026',
    dueDate: 'August 29, 2026',
    billingInterval: 'monthly',
    totalAmount: '₹1,47,500.00',
    status: 'Unpaid / Pending Payment',
    companyName: 'IntoAI Technologies Pvt. Ltd.',
    companyEmail: 'connect@intoai.ai',
  },
  DocumentActionOtp: {
    title: 'Invoice Payment Status Authorization',
    actionDescription: 'Please enter the following one-time verification code to authorize updating the payment status for your commercial invoice:',
    otp: '784912',
    expiresInMinutes: 5,
    userName: 'Ansan Mathew',
  },
  PaymentReceipt: {
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
  },
  OverduePaymentNotice: {
    invoiceId: 'INV-2026-INTOAI-084',
    invoiceTitle: 'Autonomous AI Agent Platform Development',
    workspaceName: 'Acme Enterprise Workspace',
    clientName: 'Sarah Jenkins',
    dueDate: '10 August 2026',
    amountDue: '₹41,77,200.00',
    latePaymentPolicyUrl: 'https://brightloop.local/terms#late-payment-policy',
    companyName: 'Brightloop Software Solutions',
    companyEmail: 'connect@brightloop.local',
  },
  DocumentCreated: {
    user: mockUser,
    workspace: mockWorkspace,
    projectName: 'Brightloop Subscription Platform',
    documentTitle: 'Architecture Document _v1',
    createdByName: 'Brightloop Admin',
    timestamp: new Date().toLocaleString(),
  },
  DocumentEdited: {
    user: mockUser,
    workspace: mockWorkspace,
    projectName: 'Brightloop Subscription Platform',
    documentTitle: 'SRS _v2',
    editedByName: 'Brightloop Admin',
    timestamp: new Date().toLocaleString(),
  },
  DocumentDeleted: {
    user: mockUser,
    workspace: mockWorkspace,
    projectName: 'Brightloop Subscription Platform',
    documentTitle: 'Draft Specifications _v1',
    deletedByName: 'Brightloop Admin',
    timestamp: new Date().toLocaleString(),
  },
  ProjectEdited: {
    user: mockUser,
    workspace: mockWorkspace,
    projectName: 'Brightloop Subscription Platform',
    editedByName: 'Brightloop Admin',
    timestamp: new Date().toLocaleString(),
  },
  ProjectDeleted: {
    user: mockUser,
    workspace: mockWorkspace,
    projectName: 'Legacy Prototype Project',
    deletedByName: 'Brightloop Admin',
    timestamp: new Date().toLocaleString(),
  },
  InternalDocumentApproved: {
    user: mockUser,
    workspace: mockWorkspace,
    projectName: 'Brightloop Subscription Platform',
    documentTitle: 'Business Requirements Document (BRD)',
    approvedByName: 'Brightloop Operations',
    timestamp: new Date().toLocaleString(),
  },
  ClientDocumentApproved: {
    user: mockUser,
    workspace: mockWorkspace,
    projectName: 'Brightloop Subscription Platform',
    documentTitle: 'Software Requirements Specification (SRS)',
    clientEmail: 'business@brightloop.local',
    timestamp: new Date().toLocaleString(),
  },
  ClientDocumentSigned: {
    user: mockUser,
    workspace: mockWorkspace,
    projectName: 'Brightloop Subscription Platform',
    documentTitle: 'Systems Handover Document',
    clientEmail: 'business@brightloop.local',
    timestamp: new Date().toLocaleString(),
  },
  DocumentsSentForApproval: {
    user: mockUser,
    workspace: mockWorkspace,
    projectName: 'Brightloop Subscription Platform',
    documentTitles: ['Architecture Document', 'SRS Specification'],
    clientEmail: 'business@brightloop.local',
    guestLink: 'https://brightloop.local/share?key=sample',
  },
  ClientKeyAccessGranted: {
    user: mockUser,
    workspace: mockWorkspace,
    projectName: 'Brightloop Subscription Platform',
    clientEmail: 'business@brightloop.local',
    guestLink: 'https://brightloop.local/share?key=sample',
  },
};
