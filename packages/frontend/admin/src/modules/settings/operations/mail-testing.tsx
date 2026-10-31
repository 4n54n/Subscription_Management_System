import { Button } from '@affine/admin/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@affine/admin/components/ui/card';
import { useMutation } from '@affine/admin/use-mutation';
import { useQuery } from '@affine/admin/use-query';
import { notify } from '@affine/component';
import type { UserFriendlyError } from '@affine/error';
import { availableMailTemplatesQuery, sendTestMailTemplateMutation } from '@affine/graphql';
import { useCallback, Suspense, useState, useMemo } from 'react';
import { Mail, Send, Loader2, Search, Shield, Users, HardDrive, Video, FileText, Sparkles } from 'lucide-react';

import type { AppConfig } from '../config';

const TEMPLATE_DETAILS: Record<string, { description: string; category: string; icon: any }> = {
  TestMail: {
    description: 'Test system render template & connection verification',
    category: 'System',
    icon: Sparkles,
  },
  WorkspaceGuestAccess: {
    description: 'Passcode & one-time verification code to access shared project space',
    category: 'Workspace',
    icon: Shield,
  },
  WorkspaceGuestInvitation: {
    description: 'Direct project workspace guest access invitation link',
    category: 'Workspace',
    icon: Users,
  },
  SignIn: {
    description: 'Passcode & magic link verification code for workspace access',
    category: 'Authentication',
    icon: Shield,
  },
  SignUp: {
    description: 'New user welcome & account registration verification',
    category: 'Authentication',
    icon: Shield,
  },
  SetPassword: {
    description: 'Initial account password creation link',
    category: 'Authentication',
    icon: Shield,
  },
  ChangePassword: {
    description: 'Password reset link & security alert notification',
    category: 'Authentication',
    icon: Shield,
  },
  VerifyEmail: {
    description: 'Primary email address verification code',
    category: 'Authentication',
    icon: Shield,
  },
  ChangeEmail: {
    description: 'Email address update request verification link',
    category: 'Authentication',
    icon: Shield,
  },
  VerifyChangeEmail: {
    description: 'Verification link for updated secondary email address',
    category: 'Authentication',
    icon: Shield,
  },
  EmailChanged: {
    description: 'Security notice sent after primary email address change',
    category: 'Authentication',
    icon: Shield,
  },
  StorageIncreaseRequest: {
    description: 'Administrator notice for user storage quota upgrade request',
    category: 'System',
    icon: HardDrive,
  },
  MemberInvitation: {
    description: 'Workspace team member invitation link',
    category: 'Workspace',
    icon: Users,
  },
  MemberAccepted: {
    description: 'Notification sent when invited member joins workspace',
    category: 'Workspace',
    icon: Users,
  },
  MemberLeave: {
    description: 'Notification sent when a member leaves the workspace',
    category: 'Workspace',
    icon: Users,
  },
  LinkInvitationReviewRequest: {
    description: 'Admin alert for pending workspace join request review',
    category: 'Workspace',
    icon: Users,
  },
  LinkInvitationApprove: {
    description: 'Notification sent when workspace join request is approved',
    category: 'Workspace',
    icon: Users,
  },
  LinkInvitationDecline: {
    description: 'Notification sent when workspace join request is declined',
    category: 'Workspace',
    icon: Users,
  },
  MemberRemoved: {
    description: 'Notification sent when a member is removed from workspace',
    category: 'Workspace',
    icon: Users,
  },
  OwnershipTransferred: {
    description: 'Security alert for transferred workspace ownership',
    category: 'Workspace',
    icon: Users,
  },
  OwnershipReceived: {
    description: 'Notification sent to the new workspace owner',
    category: 'Workspace',
    icon: Users,
  },
  MeetingInvitation: {
    description: 'Live presentation room & guest invitation session link',
    category: 'Media & Docs',
    icon: Video,
  },
  Mention: {
    description: 'Notification sent when user is tagged inside a document',
    category: 'Media & Docs',
    icon: FileText,
  },
  TeamBecomeAdmin: {
    description: 'Role alert when user is promoted to team administrator',
    category: 'Workspace',
    icon: Users,
  },
  TeamBecomeCollaborator: {
    description: 'Role update notification for team collaborator',
    category: 'Workspace',
    icon: Users,
  },
  TeamWorkspaceDeleted: {
    description: 'Notice sent when a team workspace is deleted',
    category: 'Workspace',
    icon: Users,
  },
  RecurringInvoice: {
    description: 'Automated recurring commercial invoice PDF delivery notification to client & billing contacts',
    category: 'Billing & Invoices',
    icon: FileText,
  },
  DocumentActionOtp: {
    description: 'One-time security passcode for invoice payment status, document modification & deletion',
    category: 'Billing & Invoices',
    icon: Shield,
  },
  PaymentReceipt: {
    description: 'Official payment receipt PDF confirmation notification dispatched when an invoice is marked as Paid',
    category: 'Billing & Invoices',
    icon: FileText,
  },
  OverduePaymentNotice: {
    description: 'Urgent overdue payment reminder sent when an invoice due date has elapsed with dynamic Late Payment Fee Policy button',
    category: 'Billing & Invoices',
    icon: Shield,
  },
  DocumentCreated: {
    description: 'Notification sent to project manager & team when a new project document is created',
    category: 'Projects & Docs',
    icon: FileText,
  },
  DocumentEdited: {
    description: 'Notification sent to project manager & team when a project document is updated or modified',
    category: 'Projects & Docs',
    icon: FileText,
  },
  DocumentDeleted: {
    description: 'Notification sent when a project document is deleted from the project space',
    category: 'Projects & Docs',
    icon: FileText,
  },
  ProjectEdited: {
    description: 'Notification sent when project details, visibility, or metadata are updated',
    category: 'Projects & Docs',
    icon: FileText,
  },
  ProjectDeleted: {
    description: 'Notification sent when a project is removed or deleted from the workspace',
    category: 'Projects & Docs',
    icon: FileText,
  },
  InternalDocumentApproved: {
    description: 'Notification sent to project manager when internal document approval is completed',
    category: 'Projects & Docs',
    icon: Shield,
  },
  ClientDocumentApproved: {
    description: 'Notification sent to client & project manager when a client approves a shared document',
    category: 'Projects & Docs',
    icon: Shield,
  },
  ClientDocumentSigned: {
    description: 'Notification sent when a client digitally signs and authorizes a project document with OTP',
    category: 'Projects & Docs',
    icon: Shield,
  },
  DocumentsSentForApproval: {
    description: 'Notification sent to client with secure access link when documents are submitted for approval',
    category: 'Projects & Docs',
    icon: FileText,
  },
  ClientKeyAccessGranted: {
    description: 'Passcode & one-time verification link for client guest project space authorization',
    category: 'Projects & Docs',
    icon: Shield,
  },
};

function MailTestingInner({ appConfig }: { appConfig: AppConfig }) {
  const { data } = useQuery({
    query: availableMailTemplatesQuery,
  });

  const { trigger } = useMutation({
    mutation: sendTestMailTemplateMutation,
  });

  const [sendingTemplate, setSendingTemplate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const onSendTest = useCallback((templateName: string) => {
    setSendingTemplate(templateName);
    trigger({
      accessKeyId: appConfig.mailer.SES.accessKeyId || '',
      secretAccessKey: appConfig.mailer.SES.secretAccessKey || '',
      region: appConfig.mailer.SES.region || '',
      sender: appConfig.mailer.SES.sender || '',
      template: templateName,
    })
      .then(() => {
        notify.success({
          title: 'Test Email Sent',
          message: `Test email for template "${templateName}" delivered successfully to your admin inbox.`,
        });
      })
      .catch((err: UserFriendlyError) => {
        notify.error({
          title: 'Failed to Send Test Email',
          message: err.message || `An error occurred while sending ${templateName}`,
        });
      })
      .finally(() => {
        setSendingTemplate(null);
      });
  }, [appConfig, trigger]);

  const rawTemplates = data?.availableMailTemplates || [];

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return rawTemplates;
    const query = searchQuery.toLowerCase();
    return rawTemplates.filter(name => {
      const detail = TEMPLATE_DETAILS[name]?.description || '';
      const cat = TEMPLATE_DETAILS[name]?.category || '';
      return (
        name.toLowerCase().includes(query) ||
        detail.toLowerCase().includes(query) ||
        cat.toLowerCase().includes(query)
      );
    });
  }, [rawTemplates, searchQuery]);

  if (rawTemplates.length === 0) {
    return <div className="text-sm text-muted-foreground p-4">No active system mail templates found.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg border border-border/40">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search templates by name, detail, or category..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-background border border-border/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="text-xs text-muted-foreground font-medium shrink-0 px-1">
          Showing {filteredTemplates.length} of {rawTemplates.length} active templates
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredTemplates.map(templateName => {
          const isSending = sendingTemplate === templateName;
          const meta = TEMPLATE_DETAILS[templateName] || {
            description: 'System transactional email template',
            category: 'General',
            icon: Mail,
          };
          const IconComp = meta.icon || Mail;

          return (
            <Card
              key={templateName}
              className="border border-border/50 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <CardHeader className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-primary/10 rounded-md text-primary shrink-0">
                      <IconComp size={16} />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold truncate text-foreground">
                        {templateName}
                      </CardTitle>
                      <span className="inline-block text-[10px] font-medium px-2 py-0.5 mt-0.5 rounded-full bg-accent/20 text-muted-foreground border border-border/30">
                        {meta.category}
                      </span>
                    </div>
                  </div>
                </div>
                <CardDescription className="text-xs text-muted-foreground leading-relaxed line-clamp-2 pt-1">
                  {meta.description}
                </CardDescription>
              </CardHeader>

              <div className="px-4 pb-4 pt-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2 text-xs font-medium h-8 bg-background hover:bg-primary hover:text-primary-foreground border-border/60 transition-colors"
                  onClick={() => onSendTest(templateName)}
                  disabled={sendingTemplate !== null}
                >
                  {isSending ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Sending Test...
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      Test Send
                    </>
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function MailTesting({ appConfig }: { appConfig: AppConfig }) {
  return (
    <Card className="mt-6 border border-primary/30 shadow-sm bg-card">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Mail className="text-primary" size={20} />
              Active System Mail Templates Testing
            </CardTitle>
            <CardDescription className="text-xs mt-1 text-muted-foreground">
              Trigger direct SMTP/SES test deliveries of all active system transactional templates populated with production dummy variables to your administrator email.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <Suspense
          fallback={
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-6 justify-center">
              <Loader2 size={18} className="animate-spin text-primary" />
              Loading active system email templates catalog...
            </div>
          }
        >
          <MailTestingInner appConfig={appConfig} />
        </Suspense>
      </CardContent>
    </Card>
  );
}
