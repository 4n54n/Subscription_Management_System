import { render as rawRender } from '@react-email/components';

import { Mention } from './docs';
import {
  ClientDocumentApproved,
  ClientDocumentSigned,
  ClientKeyAccessGranted,
  DocumentsSentForApproval,
  InternalDocumentApproved,
  DocumentCreated,
  DocumentEdited,
  DocumentDeleted,
  ProjectDeleted,
  ProjectEdited,
  RecurringInvoice,
  DocumentActionOtp,
  PaymentReceipt,
  OverduePaymentNotice,
} from './projects';
import {
  TeamBecomeAdmin,
  TeamBecomeCollaborator,
  TeamWorkspaceDeleted,
} from './teams';
import TestMail from './test-mail';
import {
  ChangeEmail,
  ChangeEmailNotification,
  ChangePassword,
  SetPassword,
  SignIn,
  SignUp,
  StorageIncreaseRequest,
  VerifyChangeEmail,
  VerifyEmail,
} from './users';
import {
  Invitation,
  InvitationAccepted,
  LinkInvitationApproved,
  LinkInvitationReviewDeclined,
  LinkInvitationReviewRequest,
  MeetingInvitation,
  MemberLeave,
  MemberRemoved,
  OwnershipReceived,
  OwnershipTransferred,
} from './workspaces';

type EmailContent = {
  subject: string;
  html: string;
};

function render(component: React.ReactElement) {
  return rawRender(component, {
    pretty: env.testing,
  });
}

type Props<T> = T extends React.ComponentType<infer P> ? P : never;
export type EmailRenderer<Props> = (props: Props) => Promise<EmailContent>;

function make<T extends React.ComponentType<any>>(
  Component: T,
  subject: string | ((props: Props<T>) => string)
): EmailRenderer<Props<T>> {
  return async props => {
    if (!props && env.testing) {
      // @ts-expect-error test only
      props = Component.PreviewProps;
    }
    return {
      subject: typeof subject === 'function' ? subject(props) : subject,
      html: await render(<Component {...props} />),
    };
  };
}

export const Renderers = {
  //#region Test
  TestMail: make(TestMail, 'Test Email - One by IntoAI Technologies Pvt. Ltd.'),
  //#endregion

  //#region User
  WorkspaceGuestAccess: make(SignIn, 'IntoAI Workspace Guest Access'),
  SignIn: make(SignIn, 'IntoAI Workspace Guest Access'),
  SignUp: make(SignUp, 'Your One account is waiting for you'),
  SetPassword: make(SetPassword, 'Set your One password'),
  ChangePassword: make(ChangePassword, 'Reset your One password'),
  VerifyEmail: make(VerifyEmail, 'Verify your email address'),
  ChangeEmail: make(ChangeEmail, 'Change your email address'),
  VerifyChangeEmail: make(VerifyChangeEmail, 'Verify your new email address'),
  EmailChanged: make(ChangeEmailNotification, 'Account email address changed'),
  StorageIncreaseRequest: make(
    StorageIncreaseRequest,
    props => `Storage Increase Request from ${props.userName} (${props.requestedGb} GB)`
  ),
  //#endregion

  //#region Workspace
  WorkspaceGuestInvitation: make(
    Invitation,
    props => `${props.user.email} invited you as a guest to ${props.workspace.name}`
  ),
  MemberInvitation: make(
    Invitation,
    props => `${props.user.email} invited you to join ${props.workspace.name}`
  ),
  MemberAccepted: make(
    InvitationAccepted,
    props => `${props.user.email} accepted your invitation`
  ),
  MemberLeave: make(
    MemberLeave,
    props => `${props.user.email} left ${props.workspace.name}`
  ),
  LinkInvitationReviewRequest: make(
    LinkInvitationReviewRequest,
    props => `New request to join ${props.workspace.name}`
  ),
  LinkInvitationApprove: make(
    LinkInvitationApproved,
    props => `Your request to join ${props.workspace.name} has been approved`
  ),
  LinkInvitationDecline: make(
    LinkInvitationReviewDeclined,
    props => `Your request to join ${props.workspace.name} was declined`
  ),
  MemberRemoved: make(
    MemberRemoved,
    props => `You have been removed from ${props.workspace.name}`
  ),
  OwnershipTransferred: make(
    OwnershipTransferred,
    props => `Your ownership of ${props.workspace.name} has been transferred`
  ),
  OwnershipReceived: make(
    OwnershipReceived,
    props => `You are now the owner of ${props.workspace.name}`
  ),
  MeetingInvitation: make(
    MeetingInvitation,
    props => `Invitation: Join live presentation in ${props.workspace.name}`
  ),
  //#endregion

  //#region Doc
  Mention: make(
    Mention,
    props => `${props.user.email} mentioned you in ${props.doc.title}`
  ),
  //#endregion

  //#region Team
  TeamBecomeAdmin: make(
    TeamBecomeAdmin,
    props => `You are now an admin of ${props.workspace.name}`
  ),
  TeamBecomeCollaborator: make(
    TeamBecomeCollaborator,
    props => `Your role has been changed in ${props.workspace.name}`
  ),
  TeamWorkspaceDeleted: make(
    TeamWorkspaceDeleted,
    props => `Your workspace ${props.workspace.name} has been deleted`
  ),
  //#region Projects
  DocumentsSentForApproval: make(
    DocumentsSentForApproval,
    props => `Review & Approval Request for ${props.projectName}`
  ),
  ClientKeyAccessGranted: make(
    ClientKeyAccessGranted,
    props => `Document Access Granted for ${props.projectName}`
  ),
  ClientDocumentApproved: make(
    ClientDocumentApproved,
    props => `Document Approved: ${props.documentTitle}`
  ),
  ClientDocumentSigned: make(
    ClientDocumentSigned,
    props => `Document Digitally Signed: ${props.documentTitle}`
  ),
  InternalDocumentApproved: make(
    InternalDocumentApproved,
    props => `Internal Approval Completed: ${props.documentTitle}`
  ),
  DocumentCreated: make(
    DocumentCreated,
    props => `New Document Created: ${props.documentTitle}`
  ),
  DocumentEdited: make(
    DocumentEdited,
    props => `Document Updated: ${props.documentTitle}`
  ),
  DocumentDeleted: make(
    DocumentDeleted,
    props => `Document Deleted: ${props.documentTitle}`
  ),
  ProjectEdited: make(
    ProjectEdited,
    props => `Project Updated: ${props.projectName}`
  ),
  ProjectDeleted: make(
    ProjectDeleted,
    props => `Project Deleted: ${props.projectName}`
  ),
  RecurringInvoice: make(
    RecurringInvoice,
    props => `Autogenerated Invoice: ${props.invoiceId} - ${props.invoiceTitle || 'Commercial Invoice'}`
  ),
  DocumentActionOtp: make(
    DocumentActionOtp,
    props => `[IntoAI Workspace] ${props.title || 'Security Verification Code'}`
  ),
  PaymentReceipt: make(
    PaymentReceipt,
    props => `Payment Receipt: ${props.receiptNumber} (${props.invoiceId})`
  ),
  OverduePaymentNotice: make(
    OverduePaymentNotice,
    props => `[Overdue Notice] Payment Due Date Exceeded for Invoice ${props.invoiceId}`
  ),
  //#endregion
} as const;

export type MailName = keyof typeof Renderers;
export type MailProps<T extends MailName> = Parameters<
  (typeof Renderers)[T]
>[0];
