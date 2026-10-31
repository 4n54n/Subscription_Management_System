import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Set env mock
globalThis.env = { testing: false };

import { Renderers } from './dist/mails/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const outputDir = path.join(__dirname, 'rendered-emails');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // 1. Guest Access
  const guestAccess = await Renderers.SignIn({
    url: 'https://one.intoai.ai/magic-link?token=123456&email=test@test.com',
    otp: '151457',
  });
  fs.writeFileSync(path.join(outputDir, 'guest-access.html'), guestAccess.html);

  // 2. Storage Increase
  const storageRequest = await Renderers.StorageIncreaseRequest({
    userName: 'business',
    userEmail: 'business@intoai.ai',
    currentUsageFormatted: '0 B',
    currentQuotaFormatted: '10 GB',
    requestedGb: 450,
    requestedAtFormatted: 'Monday, July 27, 2026 at 8:01:13 PM',
  });
  fs.writeFileSync(path.join(outputDir, 'storage-request.html'), storageRequest.html);

  // 3. Meeting Invitation
  const meetingInvite = await Renderers.MeetingInvitation({
    user: { name: 'Alex River', email: 'alex@intoai.ai' },
    workspace: { name: 'workspace' },
    docTitle: 'How to use folder and Tags',
    url: 'https://one.intoai.ai/join/sample-token',
  });
  fs.writeFileSync(path.join(outputDir, 'meeting-invite.html'), meetingInvite.html);

  // 4. Workspace Invitation
  const workspaceInvite = await Renderers.MemberInvitation({
    user: { name: 'Sarah Jenkins', email: 'sarah@intoai.ai' },
    workspace: { name: 'design-team' },
    url: 'https://one.intoai.ai/accept/sample-token',
  });
  fs.writeFileSync(path.join(outputDir, 'workspace-invite.html'), workspaceInvite.html);

  // 5. Verify Email
  const verifyEmail = await Renderers.VerifyEmail({
    url: 'https://one.intoai.ai/verify?token=123456',
  });
  fs.writeFileSync(path.join(outputDir, 'verify-email.html'), verifyEmail.html);

  // 6. Password Change
  const passwordChange = await Renderers.ChangePassword({
    url: 'https://one.intoai.ai/secure-account?token=123456',
  });
  fs.writeFileSync(path.join(outputDir, 'password-change.html'), passwordChange.html);

  console.log('All emails rendered successfully to rendered-emails/');
}

run().catch(console.error);
