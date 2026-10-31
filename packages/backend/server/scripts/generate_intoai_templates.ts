import fs from 'fs';
import path from 'path';
import { Renderers } from '../src/mails/index.js';

(globalThis as any).env = { testing: false };
(globalThis as any).serverConfig = {
  supportEmail: 'custom-admin-support@intoai.ai',
  websiteUrl: 'https://custom-admin.intoai.ai',
  termsOfServiceUrl: 'https://custom-admin.intoai.ai/terms',
  privacyPolicyUrl: 'https://custom-admin.intoai.ai/privacy',
  companyName: 'Custom Admin IntoAI Technologies Pvt. Ltd.',
};

const mockWorkspace = { name: 'IntoAI Workspace', avatar: '' };
const mockUser = { email: 'admin@intoai.tech' };
const mockDoc = { title: 'Test Document', url: 'http://localhost:8080/doc' };

const mockDataMap: Record<string, any> = {
  StorageIncreaseRequest: {
    userName: 'John Doe',
    userEmail: 'john@intoai.tech',
    currentUsageFormatted: '10 GB',
    currentQuotaFormatted: '10 GB',
    requestedGb: 100,
    requestedAtFormatted: '2026-07-31',
  },
  MemberInvitation: { user: mockUser, workspace: mockWorkspace, url: 'http://localhost:8080' },
  MemberAccepted: { user: mockUser, workspace: mockWorkspace, url: 'http://localhost:8080' },
  MemberLeave: { user: mockUser, workspace: mockWorkspace, url: 'http://localhost:8080' },
  LinkInvitationReviewRequest: { user: mockUser, workspace: mockWorkspace, url: 'http://localhost:8080' },
  LinkInvitationApprove: { workspace: mockWorkspace, url: 'http://localhost:8080' },
  LinkInvitationDecline: { workspace: mockWorkspace },
  MemberRemoved: { workspace: mockWorkspace },
  OwnershipTransferred: { workspace: mockWorkspace },
  OwnershipReceived: { workspace: mockWorkspace, url: 'http://localhost:8080' },
  MeetingInvitation: { workspace: mockWorkspace, inviterName: 'Alice', meetingTitle: 'Demo Meeting', meetingUrl: 'http://localhost:8080/meet' },
  Mention: { user: mockUser, doc: mockDoc },
  TeamBecomeAdmin: { workspace: mockWorkspace, url: 'http://localhost:8080' },
  TeamBecomeCollaborator: { workspace: mockWorkspace, url: 'http://localhost:8080' },
  TeamWorkspaceDeleted: { workspace: mockWorkspace },
};

async function main() {
  console.log('Testing rendering of all updated mail templates in Renderers...');
  const keys = Object.keys(Renderers);
  console.log(`Active mail templates count: ${keys.length}`);

  for (const key of keys) {
    try {
      const renderer = (Renderers as any)[key];
      const props = mockDataMap[key] || {};
      const res = await renderer(props);
      console.log(`- ${key}: Subject = "${res.subject}"`);
      if (!res.html.includes('custom-admin-support@intoai.ai') || !res.html.includes('Custom Admin IntoAI Technologies Pvt. Ltd.')) {
        throw new Error(`Footer in ${key} did not contain dynamically overridden /admin company details!`);
      }
    } catch (err) {
      console.error(`Failed rendering ${key}:`, err);
      process.exit(1);
    }
  }

  console.log('\n✅ All active email templates dynamically populated /admin company details in the footer successfully!');
}

main().catch(console.error);
