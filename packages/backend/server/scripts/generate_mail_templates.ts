import fs from 'fs';
import path from 'path';

// Define global env to prevent ReferenceError in render()
(globalThis as any).env = { testing: false };

import { Renderers } from '../src/mails/index.js';

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

const mockDataMap: Record<string, any> = {
  TestMail: {},
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
    workspace: mockWorkspace,
    inviterName: 'Alice',
    meetingTitle: 'Product Review Meeting',
    meetingUrl: 'http://localhost:8080/workspace/bf6e6a85-a0c2-4c99-8df7-fae01645f979/present/123',
  },
  Mention: {
    user: { email: 'colleague@intoai.tech' },
    doc: mockDoc,
  },
  TeamWorkspaceUpgraded: {
    isOwner: true,
    workspace: mockWorkspace,
    url: 'http://localhost:8080/workspace/bf6e6a85-a0c2-4c99-8df7-fae01645f979',
  },
  TeamBecomeAdmin: {
    workspace: mockWorkspace,
    url: 'http://localhost:8080/workspace/bf6e6a85-a0c2-4c99-8df7-fae01645f979',
  },
  TeamBecomeCollaborator: {
    workspace: mockWorkspace,
    url: 'http://localhost:8080/workspace/bf6e6a85-a0c2-4c99-8df7-fae01645f979',
  },
  TeamDeleteIn24Hours: {
    workspace: mockWorkspace,
    deletionDate: new Date('2026-08-01T00:00:00Z'),
    url: 'http://localhost:3010/admin/settings',
  },
  TeamDeleteInOneMonth: {
    workspace: mockWorkspace,
    expirationDate: new Date('2026-08-01T00:00:00Z'),
    deletionDate: new Date('2026-08-31T00:00:00Z'),
    url: 'http://localhost:3010/admin/settings',
  },
  TeamWorkspaceDeleted: {
    workspace: mockWorkspace,
  },
  TeamWorkspaceExpireSoon: {
    workspace: mockWorkspace,
    expirationDate: new Date('2026-08-15T00:00:00Z'),
    url: 'http://localhost:3010/admin/settings',
  },
  TeamWorkspaceExpired: {
    workspace: mockWorkspace,
    expirationDate: new Date('2026-07-20T00:00:00Z'),
    url: 'http://localhost:3010/admin/settings',
  },
  TeamLicense: {
    licenseKey: 'INTOAI-LICENSE-KEY-2026-PREMIUM-ENTERPRISE-884920',
    url: 'http://localhost:3010/admin/settings',
  },
};

const categoryMap: Record<string, { category: string; target: string }> = {
  TestMail: { category: 'Admin Operations', target: 'Admin (/admin 3010)' },
  SignIn: { category: 'User & Auth', target: 'Workspace (/workspace 8080)' },
  SignUp: { category: 'User & Auth', target: 'Workspace (/workspace 8080)' },
  SetPassword: { category: 'User & Auth', target: 'Workspace (/workspace 8080)' },
  ChangePassword: { category: 'User & Auth', target: 'Workspace (/workspace 8080)' },
  VerifyEmail: { category: 'User & Auth', target: 'Workspace (/workspace 8080)' },
  ChangeEmail: { category: 'User & Auth', target: 'Workspace (/workspace 8080)' },
  VerifyChangeEmail: { category: 'User & Auth', target: 'Workspace (/workspace 8080)' },
  EmailChanged: { category: 'User & Auth', target: 'Workspace (/workspace 8080)' },
  MemberInvitation: { category: 'Workspace', target: 'Workspace (/workspace 8080)' },
  MemberAccepted: { category: 'Workspace', target: 'Workspace (/workspace 8080)' },
  MemberLeave: { category: 'Workspace', target: 'Workspace (/workspace 8080)' },
  LinkInvitationReviewRequest: { category: 'Workspace', target: 'Workspace (/workspace 8080)' },
  LinkInvitationApprove: { category: 'Workspace', target: 'Workspace (/workspace 8080)' },
  LinkInvitationDecline: { category: 'Workspace', target: 'Workspace (/workspace 8080)' },
  MemberRemoved: { category: 'Workspace', target: 'Workspace (/workspace 8080)' },
  OwnershipTransferred: { category: 'Workspace', target: 'Workspace (/workspace 8080)' },
  OwnershipReceived: { category: 'Workspace', target: 'Workspace (/workspace 8080)' },
  Mention: { category: 'Collaboration', target: 'Workspace (/workspace 8080)' },
  TeamWorkspaceUpgraded: { category: 'Team & License', target: 'Workspace (/workspace 8080)' },
  TeamBecomeAdmin: { category: 'Team & License', target: 'Workspace (/workspace 8080)' },
  TeamBecomeCollaborator: { category: 'Team & License', target: 'Workspace (/workspace 8080)' },
  TeamDeleteIn24Hours: { category: 'Team & License', target: 'Admin (/admin 3010)' },
  TeamDeleteInOneMonth: { category: 'Team & License', target: 'Admin (/admin 3010)' },
  TeamWorkspaceDeleted: { category: 'Team & License', target: 'Admin (/admin 3010)' },
  TeamWorkspaceExpireSoon: { category: 'Team & License', target: 'Admin (/admin 3010)' },
  TeamWorkspaceExpired: { category: 'Team & License', target: 'Admin (/admin 3010)' },
  TeamLicense: { category: 'Team & License', target: 'Admin (/admin 3010)' },
};

async function main() {
  const templatesData: Array<{
    id: string;
    name: string;
    subject: string;
    category: string;
    target: string;
    html: string;
  }> = [];

  for (const [key, renderer] of Object.entries(Renderers)) {
    try {
      const props = mockDataMap[key] || {};
      // @ts-expect-error test call
      const res = await renderer(props);
      templatesData.push({
        id: key,
        name: key,
        subject: res.subject,
        category: categoryMap[key]?.category || 'General',
        target: categoryMap[key]?.target || 'Workspace (8080)',
        html: res.html,
      });
      console.log(`Rendered template: ${key} | Subject: "${res.subject}"`);
    } catch (err) {
      console.error(`Failed to render template ${key}:`, err);
    }
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>One Email Templates Catalogue</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-main: #0f172a;
      --bg-sidebar: #1e293b;
      --bg-card: #1e293b;
      --border-color: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --accent-admin: #ec4899;
      --accent-workspace: #10b981;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-main);
      color: var(--text-main);
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* Sidebar Styling */
    .sidebar {
      width: 340px;
      background-color: var(--bg-sidebar);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }

    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid var(--border-color);
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    }

    .sidebar-header h1 {
      font-size: 1.1rem;
      font-weight: 700;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .sidebar-header p {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 6px;
    }

    .search-box {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .search-input {
      width: 100%;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: #0f172a;
      color: #fff;
      font-family: inherit;
      font-size: 0.85rem;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--primary);
    }

    .nav-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px 8px;
    }

    .category-group {
      margin-bottom: 16px;
    }

    .category-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      font-weight: 700;
      padding: 8px 12px 4px;
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      padding: 10px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      margin-bottom: 4px;
      border: 1px solid transparent;
    }

    .nav-item:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }

    .nav-item.active {
      background-color: rgba(59, 130, 246, 0.15);
      border-color: var(--primary);
    }

    .nav-item-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .nav-item-name {
      font-size: 0.9rem;
      font-weight: 600;
      color: #fff;
    }

    .badge {
      font-size: 0.65rem;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-admin {
      background-color: rgba(236, 72, 153, 0.2);
      color: var(--accent-admin);
      border: 1px solid rgba(236, 72, 153, 0.3);
    }

    .badge-workspace {
      background-color: rgba(16, 185, 129, 0.2);
      color: var(--accent-workspace);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .nav-item-subject {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-top: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Main Preview Content */
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      background-color: #0f172a;
      overflow: hidden;
    }

    .top-bar {
      padding: 16px 24px;
      background-color: var(--bg-sidebar);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .template-info h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .subject-line {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .view-controls {
      display: flex;
      gap: 8px;
    }

    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--border-color);
      background-color: var(--bg-main);
      color: var(--text-main);
      transition: all 0.15s ease;
    }

    .btn:hover {
      background-color: var(--primary);
      border-color: var(--primary);
      color: #fff;
    }

    .btn.active {
      background-color: var(--primary);
      border-color: var(--primary);
      color: #fff;
    }

    .preview-container {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
    }

    .iframe-wrapper {
      width: 100%;
      max-width: 600px;
      height: 720px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
      overflow: hidden;
      border: 1px solid var(--border-color);
    }

    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    /* All Grid View */
    .grid-view {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 24px;
      width: 100%;
      max-width: 1400px;
      padding: 12px;
    }

    .grid-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .grid-card-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
      background: rgba(0,0,0,0.2);
    }

    .grid-card-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .grid-card-subject {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .grid-card-iframe-wrapper {
      height: 520px;
      background: #fff;
    }
  </style>
</head>
<body>

  <!-- Sidebar -->
  <div class="sidebar">
    <div class="sidebar-header">
      <h1>✉️ Mail Templates (${templatesData.length})</h1>
      <p>Previews for Admin (:3010) & Workspace (:8080)</p>
    </div>

    <div class="search-box">
      <input type="text" id="searchInput" class="search-input" placeholder="Search templates or subjects...">
    </div>

    <div class="nav-list" id="navList"></div>
  </div>

  <!-- Main Content -->
  <div class="main-content">
    <div class="top-bar">
      <div class="template-info">
        <h2 id="activeTitle">Select a Template</h2>
        <div class="subject-line" id="activeSubject">Click any item from sidebar to view rendered email HTML</div>
      </div>
      <div class="view-controls">
        <button class="btn active" id="btnSingle" onclick="setViewMode('single')">Single View</button>
        <button class="btn" id="btnGrid" onclick="setViewMode('grid')">All Templates View</button>
      </div>
    </div>

    <div class="preview-container" id="previewContainer">
      <div class="iframe-wrapper" id="singleWrapper">
        <iframe id="previewIframe" srcdoc="<body style='font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#666;'>Select a template from the left sidebar</body>"></iframe>
      </div>
      <div class="grid-view" id="gridView" style="display: none;"></div>
    </div>
  </div>

  <script>
    const templates = ${JSON.stringify(templatesData)};
    let activeId = templates[0]?.id || '';
    let viewMode = 'single';

    function groupByCategory(items) {
      return items.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {});
    }

    function renderSidebar(filterText = '') {
      const navList = document.getElementById('navList');
      navList.innerHTML = '';

      const filtered = templates.filter(t => 
        t.name.toLowerCase().includes(filterText.toLowerCase()) ||
        t.subject.toLowerCase().includes(filterText.toLowerCase()) ||
        t.category.toLowerCase().includes(filterText.toLowerCase())
      );

      const grouped = groupByCategory(filtered);

      for (const [category, items] of Object.entries(grouped)) {
        const groupEl = document.createElement('div');
        groupEl.className = 'category-group';

        const titleEl = document.createElement('div');
        titleEl.className = 'category-title';
        titleEl.innerText = category;
        groupEl.appendChild(titleEl);

        items.forEach(item => {
          const itemEl = document.createElement('div');
          itemEl.className = 'nav-item' + (item.id === activeId ? ' active' : '');
          itemEl.onclick = () => selectTemplate(item.id);

          const isAdmin = item.target.includes('Admin');
          const badgeClass = isAdmin ? 'badge-admin' : 'badge-workspace';
          const badgeText = isAdmin ? 'Admin :3010' : 'Workspace :8080';

          itemEl.innerHTML = \`
            <div class="nav-item-header">
              <span class="nav-item-name">\${item.name}</span>
              <span class="badge \${badgeClass}">\${badgeText}</span>
            </div>
            <div class="nav-item-subject" title="\${item.subject}">Subject: \${item.subject}</div>
          \`;

          groupEl.appendChild(itemEl);
        });

        navList.appendChild(groupEl);
      }
    }

    function selectTemplate(id) {
      activeId = id;
      renderSidebar(document.getElementById('searchInput').value);
      
      const item = templates.find(t => t.id === id);
      if (!item) return;

      document.getElementById('activeTitle').innerHTML = \`
        \${item.name}
        <span class="badge \${item.target.includes('Admin') ? 'badge-admin' : 'badge-workspace'}">
          \${item.target}
        </span>
      \`;
      document.getElementById('activeSubject').innerText = 'Subject: ' + item.subject;

      if (viewMode === 'single') {
        const iframe = document.getElementById('previewIframe');
        iframe.srcdoc = item.html;
      }
    }

    function setViewMode(mode) {
      viewMode = mode;
      document.getElementById('btnSingle').classList.toggle('active', mode === 'single');
      document.getElementById('btnGrid').classList.toggle('active', mode === 'grid');

      const singleWrapper = document.getElementById('singleWrapper');
      const gridView = document.getElementById('gridView');

      if (mode === 'single') {
        singleWrapper.style.display = 'block';
        gridView.style.display = 'none';
        selectTemplate(activeId);
      } else {
        singleWrapper.style.display = 'none';
        gridView.style.display = 'grid';
        renderGridView();
      }
    }

    function renderGridView() {
      const gridView = document.getElementById('gridView');
      gridView.innerHTML = '';

      templates.forEach(item => {
        const card = document.createElement('div');
        card.className = 'grid-card';

        const isAdmin = item.target.includes('Admin');
        const badgeClass = isAdmin ? 'badge-admin' : 'badge-workspace';
        const badgeText = isAdmin ? 'Admin :3010' : 'Workspace :8080';

        card.innerHTML = \`
          <div class="grid-card-header">
            <div class="grid-card-title">
              <span>\${item.name}</span>
              <span class="badge \${badgeClass}">\${badgeText}</span>
            </div>
            <div class="grid-card-subject">Subject: \${item.subject}</div>
          </div>
          <div class="grid-card-iframe-wrapper">
            <iframe srcdoc="\${item.html.replace(/"/g, '&quot;')}"></iframe>
          </div>
        \`;

        gridView.appendChild(card);
      });
    }

    document.getElementById('searchInput').addEventListener('input', (e) => {
      renderSidebar(e.target.value);
    });

    // Initialize
    renderSidebar();
    if (templates.length > 0) {
      selectTemplate(templates[0].id);
    }
  </script>
</body>
</html>`;

  const rootPath = path.resolve(process.cwd(), '../../../mail_templates.html');
  const packagesPath = path.resolve(process.cwd(), '../../mail_templates.html');
  fs.writeFileSync(rootPath, htmlContent, 'utf-8');
  fs.writeFileSync(packagesPath, htmlContent, 'utf-8');
  console.log(`\n==================================================`);
  console.log(`✅ Successfully generated mail_templates.html (${templatesData.length} templates)`);
  console.log(`📄 Root Path: ${rootPath}`);
  console.log(`📄 Packages Path: ${packagesPath}`);
  console.log(`==================================================\n`);
}

main().catch(err => {
  console.error('Error generating templates:', err);
  process.exit(1);
});
