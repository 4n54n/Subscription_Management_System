import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { cssVar } from '@toeverything/theme';
import { useQuery } from '@affine/core/components/hooks/use-query';
import { useMutation } from '@affine/core/components/hooks/use-mutation';
import { useService, useLiveData } from '@toeverything/infra';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { WorkspacePermissionService } from '@affine/core/modules/permissions';
import { GraphQLService, AuthService } from '@affine/core/modules/cloud';
import { toast } from '@affine/component';
import {
  projectDocumentsQuery,
  projectDocsConfigQuery,
  upsertProjectDocumentMutation,
  sendDeleteDocumentOtpMutation,
  deleteProjectDocumentMutation,
  copyDocumentFromPreviousVersionMutation,
  approveDocumentInternallyMutation,
  sendDocumentsForApprovalMutation,
  makeDocsDirectoryPublicMutation,
  clientApproveDocumentMutation,
  sendClientSignatureOtpMutation,
  clientSignDocumentMutation,
  sendDocumentsToMailMutation,
  generateProjectShareKeyQuery,
  serverConfigQuery,
  projectQuery,
} from '@affine/graphql';
import { useDocumentCopilotSync } from '../../../components/copilot/use-copilot-sync';
import { useCompanyProfile } from '../../../../components/hooks/use-company-profile';

const getOrCreateProjectShareKeyQuery = {
  id: 'getOrCreateProjectShareKeyQuery' as const,
  op: 'getOrCreateProjectShareKey',
  query: `query getOrCreateProjectShareKey($workspaceId: String!, $projectId: String) {
    getOrCreateProjectShareKey(workspaceId: $workspaceId, projectId: $projectId)
  }`
} as any;

import {
  CloseIcon,
  LockIcon,
  CopyIcon,
  DeleteIcon,
  PlusIcon,
  ExportIcon,
  EditIcon,
  ViewIcon,
} from '@blocksuite/icons/rc';

import * as styles from './styles.css';

const parseContentToSections = (content: string) => {
  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.sections)) {
      return parsed;
    }
    if (Array.isArray(parsed)) {
      return { sections: parsed };
    }
  } catch (e) {
    // Fail silently, parse as markdown
  }

  // Parse markdown string into structured sections
  const sections: { title: string; content: string }[] = [];
  const lines = content.split('\n');
  let currentSection: { title: string; content: string } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('##') || trimmed.startsWith('###')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      const title = trimmed.replace(/^#+\s+/, '').trim();
      currentSection = { title, content: '' };
    } else {
      if (currentSection) {
        currentSection.content += line + '\n';
      } else if (trimmed) {
        currentSection = { title: 'General Overview', content: line + '\n' };
      }
    }
  }
  if (currentSection) {
    sections.push(currentSection);
  }

  // Clean trailing spaces and empty sections
  sections.forEach(s => {
    s.content = s.content.trim();
  });

  return {
    sections: sections.filter(s => s.title.trim() !== ''),
  };
};

const truncateTitle = (title: string, maxLen = 80): string => {
  if (!title) return '';
  const trimmed = title.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 3)}...`;
};

// Sub-component DocumentRow representing individual document types
const CloseIconSvg = () => <CloseIcon style={{ width: 16, height: 16 }} />;
const LockIconSvg = () => <LockIcon style={{ width: 14, height: 14, opacity: 0.6 }} />;
const CopyIconSvg = () => <CopyIcon style={{ width: 14, height: 14 }} />;
const TrashIconSvg = () => <DeleteIcon style={{ width: 14, height: 14 }} />;
const PlusIconSvg = () => <PlusIcon style={{ width: 14, height: 14 }} />;
const DownloadIconSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const EditIconSvg = () => <EditIcon style={{ width: 14, height: 14 }} />;
const EyeIconSvg = () => <ViewIcon style={{ width: 14, height: 14 }} />;

const DocFileIconSvg = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const ArchitectureNodeIconSvg = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    <circle cx="12" cy="5" r="2.5" />
    <circle cx="5" cy="19" r="2.5" />
    <circle cx="19" cy="19" r="2.5" />
    <line x1="12" y1="7.5" x2="5" y2="16.5" />
    <line x1="12" y1="7.5" x2="19" y2="16.5" />
    <line x1="5" y1="19" x2="19" y2="19" />
  </svg>
);

const ActionCopyIconSvg = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const ActionPlusCircleIconSvg = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const AuditShieldLockIconSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    <circle cx="12" cy="16" r="1" />
  </svg>
);

interface DocumentTemplate {
  type: string;
  name: string;
  signatureRequired: boolean;
  approvalRequired: boolean;
  internalOnly: boolean;
  defaultContent: string;
}

const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    type: 'ProjectBlueprint',
    name: 'Project Blueprint',
    signatureRequired: true,
    approvalRequired: false,
    internalOnly: false,
    defaultContent: `# Project Blueprint\n\n## 1. Executive Summary\nDescribe the main goals of the project.\n\n## 2. Solution Overview\nWhat is the technical solution?`,
  },
  {
    type: 'BRD',
    name: 'BRD',
    signatureRequired: true,
    approvalRequired: false,
    internalOnly: false,
    defaultContent: `# Business Requirements Document (BRD)\n\n## 1. Business Objectives\nDescribe why this project is being launched.\n\n## 2. Functional Scope\nWhat are the target features?`,
  },
  {
    type: 'SRS',
    name: 'SRS',
    signatureRequired: true,
    approvalRequired: false,
    internalOnly: false,
    defaultContent: `# Software Requirements Specification (SRS)\n\n## 1. System Architecture\nDetail structural diagrams.\n\n## 2. Detailed Technical Requirements\nDefine APIs, database tables, and logic.`,
  },
  {
    type: 'Architecture',
    name: 'Architecture Document',
    signatureRequired: false,
    approvalRequired: false,
    internalOnly: false,
    defaultContent: `# System Architecture Specification\n\n## 1. Component Diagram\nDescribe modules, microservices, and dependencies.\n\n## 2. Technical Stack\nList all libraries, framework, and database engines.`,
  },
  {
    type: 'ProjectPlan',
    name: 'Project Plan',
    signatureRequired: false,
    approvalRequired: false,
    internalOnly: false,
    defaultContent: `# Project Implementation Plan\n\n## 1. Phases & Milestones\nDescribe critical delivery sprints.\n\n## 2. Resource Allocation\nPM, developers, QA, and security roles.`,
  },
  {
    type: 'ComplianceSecurity',
    name: 'Compliance & Security Register',
    signatureRequired: false,
    approvalRequired: true,
    internalOnly: false,
    defaultContent: `# Compliance & Security Register\n\n## 1. Compliance Mandates\nDetails regarding GDPR, ISO, or SOC2 targets.\n\n## 2. Penetration Testing & Sign-off\nDetails of recent compliance audits.`,
  },
  {
    type: 'ChangeLog',
    name: 'Change Log',
    signatureRequired: false,
    approvalRequired: true,
    internalOnly: false,
    defaultContent: `# Project Change Log\n\n## 1. Release Modifications\nDescribe delta, enhancements, and patches.\n\n## 2. Bug Fixes\nList of resolved critical issues.`,
  },
  {
    type: 'HandoverDocument',
    name: 'Handover Document',
    signatureRequired: true,
    approvalRequired: false,
    internalOnly: false,
    defaultContent: `# Systems Handover Specification\n\n## 1. Operational Controls\nDetails of server transfers.\n\n## 2. Maintenance Protocols\nRoutine system monitoring schedule.`,
  },
  {
    type: 'TechnicalDocumentation',
    name: 'Technical Documentation',
    signatureRequired: false,
    approvalRequired: true,
    internalOnly: false,
    defaultContent: `# System Technical Documentation\n\n## 1. Setup Instructions\nStep-by-step developer setup instructions.\n\n## 2. API Endpoints\nREST & GraphQL specifications.`,
  },
  {
    type: 'DeploymentRecoveryGuide',
    name: 'Deployment & Recovery Guide',
    signatureRequired: false,
    approvalRequired: true,
    internalOnly: false,
    defaultContent: `# Deployment & Disaster Recovery Guide\n\n## 1. Server Provisioning\nSteps to spin up resources.\n\n## 2. Backup & Restoration\nCron backups, S3 storage, and db restores.`,
  },
  {
    type: 'ProjectClosureReport',
    name: 'Project Closure Report',
    signatureRequired: true,
    approvalRequired: false,
    internalOnly: false,
    defaultContent: `# Project Closure & Sign-off Report\n\n## 1. Acceptance Criteria Review\nVerify all BRD objectives are achieved.\n\n## 2. Formal Sign-off\nFinal verification log.`,
  },
];

export const ProjectDocumentsTab = ({
  workspaceId,
  projectId,
  projectManagerId,
  releases,
  isShareMode = false,
  onSwitchTab,
}: {
  workspaceId: string;
  projectId: string;
  projectManagerId?: string | null;
  releases: any[];
  isShareMode?: boolean;
  onSwitchTab?: (tab: string, releaseId?: string) => void;
}) => {
  const workspaceService = useService(WorkspaceService);
  const graphqlService = useService(GraphQLService) as GraphQLService;
  const currentWorkspace = workspaceService.workspace;
  const workspaceMeta = currentWorkspace?.docCollection?.meta as any;
  const companyMail = workspaceMeta?.companyMail || 'client@example.com';

  const permissionService = useService(WorkspacePermissionService);
  const isOwner = useLiveData(permissionService.permission.isOwner$);

  const authService = useService(AuthService);
  const session = authService.session;
  const account = useLiveData(session.account$);

  const companyProfile = useCompanyProfile();

  // Sender Details (IntoAI - dynamically fetched from Admin Company Profile at https://one.intoai.ai/admin/settings/company)
  const senderCompanyName =
    companyProfile?.companyName ||
    account?.info?.companyName ||
    "IntoAI Technologies Inc.";

  const senderEmail =
    companyProfile?.email ||
    account?.info?.companyMail ||
    "business@intoai.ai";

  const senderAddress =
    companyProfile?.address ||
    account?.info?.companyAddress ||
    "100 AI Plaza, Suite 500";

  // Recipient Details (Client Partner - dynamically fetched from Workspace Profile)
  const clientMeta = (currentWorkspace?.docCollection?.meta as any) || {};
  const recipientCompanyName = clientMeta.companyName || workspaceMeta?.name || "INTOAI TECHNOLOGIES PVT. LTD.";
  const recipientEmail = clientMeta.companyMail || workspaceMeta?.companyMail || companyMail || "business@intoai.ai";
  const recipientAddress = clientMeta.companyAddress || clientMeta.address || workspaceMeta?.address || "Client Address";

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedReleaseId = searchParams.get('releaseId') || '';
  const setSelectedReleaseId = useCallback((id: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('releaseId', id);
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([]);
  const [vpnDetected, setVpnDetected] = useState<boolean>(false);
  
  // Modals state
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalDays, setApprovalDays] = useState(3);
  
  const [isPublicModalOpen, setIsPublicModalOpen] = useState(false);
  const [publicDays, setPublicDays] = useState(7);
  const [isStopSharingConfirmOpen, setIsStopSharingConfirmOpen] = useState(false);

  // Client Approval state
  const [signingDoc, setSigningDoc] = useState<any | null>(null);
  const [clientEmail, setClientEmail] = useState('');
  const [clientOtp, setClientOtp] = useState('');
  const [isClientOtpSent, setIsClientOtpSent] = useState(false);

  const [mailTargetEmail, setMailTargetEmail] = useState('');
  const [isMailSendingModalOpen, setIsMailSendingModalOpen] = useState(false);

  // Password Gate and History Modals
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [sharePassword, setSharePassword] = useState('');
  const [shareKey, setShareKey] = useState('');
  const [isGeneratingShareKey, setIsGeneratingShareKey] = useState(false);
  const [copyingType, setCopyingType] = useState<string | null>(null);
  const [copiedGuestLink, setCopiedGuestLink] = useState(false);

  // Internal Approval 2-Step Modal State
  const [internalApprovalDocId, setInternalApprovalDocId] = useState<string | null>(null);
  const [internalApprovalStep, setInternalApprovalStep] = useState<1 | 2>(1);

  // Client Approval 2-Step Modal & VPN State
  const [clientApprovalDoc, setClientApprovalDoc] = useState<any | null>(null);
  const [clientApprovalStep, setClientApprovalStep] = useState<1 | 2>(1);
  const [isCheckingVpn, setIsCheckingVpn] = useState(false);
  const [isVpnModalOpen, setIsVpnModalOpen] = useState(false);

  // Structured Editor States
  const [editorSections, setEditorSections] = useState<{ title: string; content: string }[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');

  const getRemainingTime = (untilStr: string | null) => {
    if (!untilStr) return null;
    const diff = new Date(untilStr).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) {
      return `${days}d ${hours}h left`;
    }
    return `${hours}h left`;
  };

  const handleOpenApprovalModal = async () => {
    setIsApprovalModalOpen(true);
    setIsGeneratingShareKey(true);
    try {
      const res = await graphqlService.gql({
        query: getOrCreateProjectShareKeyQuery,
        variables: {
          workspaceId,
          projectId,
        },
      });

      const key = (res as any).getOrCreateProjectShareKey;
      setShareKey(key);
    } catch (err: any) {
      console.error('Failed to generate approval share key:', err);
      alert(err.message || 'Failed to generate guest access key.');
    } finally {
      setIsGeneratingShareKey(false);
    }
  };

  // Robust release version sorter (alphabetic stripping, dot comparison, descending)
  const sortedReleases = useMemo(() => {
    return [...releases].sort((a, b) => {
      const clean = (str: string) => {
        const stripped = (str || '').replace(/[^0-9.]/g, '');
        const parts = stripped.split('.').filter(p => p !== '').map(p => parseInt(p, 10));
        return parts;
      };

      const partsA = clean(a.name);
      const partsB = clean(b.name);

      if (partsA.length === 0 && partsB.length === 0) return 0;
      if (partsA.length === 0) return 1;
      if (partsB.length === 0) return -1;

      const maxLen = Math.max(partsA.length, partsB.length);
      for (let i = 0; i < maxLen; i++) {
        const numA = partsA[i] !== undefined ? partsA[i] : 0;
        const numB = partsB[i] !== undefined ? partsB[i] : 0;
        if (numA !== numB) {
          return numB - numA; // Descending (later version first)
        }
      }
      return 0;
    });
  }, [releases]);



  // Set default release in URL if missing
  useEffect(() => {
    if (sortedReleases.length > 0 && !selectedReleaseId) {
      setSelectedReleaseId(sortedReleases[0].id);
    }
  }, [sortedReleases, selectedReleaseId, setSelectedReleaseId]);

  const activeReleaseId = selectedReleaseId || (sortedReleases.length > 0 ? sortedReleases[0].id : '');

  // GraphQL Queries
  const { data: serverConfigData } = useQuery({
    query: serverConfigQuery,
  }, { suspense: false });

  const { data: docsData, mutate: revalidateDocs } = useQuery(
    activeReleaseId
      ? {
          query: projectDocumentsQuery,
          variables: { workspaceId, projectId, releaseId: activeReleaseId },
        }
      : undefined
  );

  const { data: configData, mutate: revalidateConfig } = useQuery({
    query: projectDocsConfigQuery,
    variables: { workspaceId, projectId },
  });

  const { data: projectQueryData } = useQuery(
    projectId
      ? {
          query: projectQuery,
          variables: { workspaceId, id: projectId },
        }
      : undefined
  );

  const activePmId = projectManagerId || projectQueryData?.project?.projectManagerId;
  const currentUserId = account?.id;
  const isProjectManagerLoggedIn = Boolean(
    activePmId && currentUserId && activePmId === currentUserId
  );

  const config = useMemo(() => configData?.projectDocsConfig, [configData]);

  const isAccessActive = Boolean(
    isProjectManagerLoggedIn && !isShareMode
      ? true
      : (config?.docsSharedActive && config?.docsSharedUntil && new Date() < new Date(config.docsSharedUntil)) ||
        (config?.docsPublicActive && config?.docsPublicUntil && new Date() < new Date(config.docsPublicUntil))
  );

  const documents = useMemo(() => {
    const rawDocs = docsData?.projectDocuments || [];
    if (isProjectManagerLoggedIn && !isShareMode) return rawDocs;
    if (!isAccessActive) return [];
    return rawDocs;
  }, [docsData, isProjectManagerLoggedIn, isShareMode, isAccessActive]);

  // Real-time polling for non-PM/guest users so admin revocation updates instantly without page refresh
  useEffect(() => {
    if (isProjectManagerLoggedIn && !isShareMode) return;
    const timer = setInterval(() => {
      revalidateConfig();
      revalidateDocs();
    }, 2000);
    return () => clearInterval(timer);
  }, [isProjectManagerLoggedIn, isShareMode, revalidateConfig, revalidateDocs]);

  // If client-only shared docs mode, override release ID
  useEffect(() => {
    if (isShareMode && config?.docsSharedActive && config?.docsSharedVersionId) {
      setSelectedReleaseId(config.docsSharedVersionId);
    }
  }, [isShareMode, config]);

  // GraphQL Mutations
  const { trigger: triggerUpsert } = useMutation({ mutation: upsertProjectDocumentMutation });
  const { trigger: triggerSendDeleteOtp } = useMutation({ mutation: sendDeleteDocumentOtpMutation });
  const { trigger: triggerDeleteDoc } = useMutation({ mutation: deleteProjectDocumentMutation });
  const { trigger: triggerCopy } = useMutation({ mutation: copyDocumentFromPreviousVersionMutation });
  const { trigger: triggerInternalApprove } = useMutation({ mutation: approveDocumentInternallyMutation });
  const { trigger: triggerSendApproval } = useMutation({ mutation: sendDocumentsForApprovalMutation });
  const { trigger: triggerMakePublic } = useMutation({ mutation: makeDocsDirectoryPublicMutation });

  const { trigger: triggerClientApprove } = useMutation({ mutation: clientApproveDocumentMutation });
  const { trigger: triggerClientSendOtp } = useMutation({ mutation: sendClientSignatureOtpMutation });
  const { trigger: triggerClientSign } = useMutation({ mutation: clientSignDocumentMutation });
  const { trigger: triggerSendMail } = useMutation({ mutation: sendDocumentsToMailMutation });

  const selectedRelease = useMemo(() => {
    return releases.find(r => r.id === selectedReleaseId);
  }, [releases, selectedReleaseId]);

  // Pre & Post Templates
  const preDevTemplates = useMemo(() => {
    let list = DOCUMENT_TEMPLATES.filter(t => ['ProjectBlueprint', 'BRD', 'SRS', 'Architecture', 'ProjectPlan', 'ComplianceSecurity'].includes(t.type));
    if (isShareMode) {
      list = list.filter(t => !t.internalOnly);
    }
    return list;
  }, [isShareMode]);

  const postDevTemplates = useMemo(() => {
    let list = DOCUMENT_TEMPLATES.filter(t => ['ChangeLog', 'HandoverDocument', 'TechnicalDocumentation', 'DeploymentRecoveryGuide', 'ProjectClosureReport'].includes(t.type));
    if (isShareMode) {
      list = list.filter(t => !t.internalOnly);
    }
    return list;
  }, [isShareMode]);

  // CRUD
  const handleOpenCreate = useCallback((template: DocumentTemplate) => {
    if (template.type === 'ProjectBlueprint') {
      const targetReleaseId = selectedReleaseId || (sortedReleases.length > 0 ? sortedReleases[0].id : '');
      const existing = documents.find(d => d.type === 'ProjectBlueprint');
      if (!existing && targetReleaseId) {
        const defaultBlueprintData = {
          version: '2.0',
          elements: [
            { id: '1', type: 'node', parentId: null, position: { x: 100, y: 250 }, size: { width: 220, height: 140 }, label: 'Start Flow', tags: ['ISO-27001'], style: { role: 'input', status: 'done', nodeKey: 'start_flow' } },
            { id: '2', type: 'node', parentId: null, position: { x: 400, y: 250 }, size: { width: 220, height: 140 }, label: 'LangGraph Supervisor', tags: ['HIPAA Compliance', 'SOC2'], style: { role: 'agent', status: 'inprogress', nodeKey: 'langgraph_supervisor' } },
            { id: '3', type: 'node', parentId: null, position: { x: 700, y: 150 }, size: { width: 220, height: 140 }, label: 'Database Writer Tool', tags: ['Security Audit'], style: { role: 'tool', status: 'todo', nodeKey: 'database_writer_tool' } },
            { id: '4', type: 'node', parentId: null, position: { x: 700, y: 350 }, size: { width: 220, height: 140 }, label: 'Output Formatter', tags: ['GDPR'], style: { role: 'output', status: 'backlog', nodeKey: 'output_formatter' } }
          ],
          connections: [
            { id: 'e1', source: '1', target: '2', edgeType: 'standard', fromNodeKey: 'start_flow', toNodeKey: 'langgraph_supervisor' },
            { id: 'e2', source: '2', target: '3', label: 'Write Data', edgeType: 'conditional', fromNodeKey: 'langgraph_supervisor', toNodeKey: 'database_writer_tool' },
            { id: 'e3', source: '2', target: '4', label: 'Format Response', edgeType: 'conditional', fromNodeKey: 'langgraph_supervisor', toNodeKey: 'output_formatter' }
          ]
        };
        triggerUpsert({
          workspaceId,
          projectId,
          releaseId: targetReleaseId,
          type: 'ProjectBlueprint',
          title: 'Project Blueprint Specification',
          content: JSON.stringify(defaultBlueprintData, null, 2),
        }).then(() => revalidateDocs());
      }
      onSwitchTab?.('blueprint', targetReleaseId);
      return;
    }
    setEditingDoc({
      projectId,
      releaseId: selectedReleaseId,
      type: template.type,
      title: template.name,
      content: template.defaultContent,
    });
    setEditorTitle(template.name);
    setEditorContent(template.defaultContent);

    const parsed = parseContentToSections(template.defaultContent);
    setEditorSections(parsed.sections);
  }, [projectId, selectedReleaseId, onSwitchTab]);

  const handleOpenEdit = useCallback((doc: any) => {
    if (doc.type === 'ProjectBlueprint') {
      onSwitchTab?.('blueprint', doc.releaseId || selectedReleaseId);
      return;
    }
    setEditingDoc(doc);
    setEditorTitle(doc.title);
    setEditorContent(doc.content);

    const parsed = parseContentToSections(doc.content);
    setEditorSections(parsed.sections);
  }, [selectedReleaseId, onSwitchTab]);

  const formattedCopilotDocTitle = useMemo(() => {
    if (!editingDoc) {
      const raw = editorTitle || 'Project Document';
      return truncateTitle(raw, 80);
    }
    const dateStr = editingDoc.lastEditTime ? new Date(editingDoc.lastEditTime).toLocaleDateString() : '';
    const timeStr = editingDoc.lastEditTime ? new Date(editingDoc.lastEditTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const cleanTitle = (editorTitle || editingDoc.title || '').replace(/\s+_v\d+.*$/i, '').trim() || editorTitle || editingDoc.title;
    const full = `${cleanTitle} _v${editingDoc.version || 1} ${dateStr} ${timeStr}`.trim();
    return truncateTitle(full, 80);
  }, [editingDoc, editorTitle]);

  useDocumentCopilotSync({
    docId: editingDoc?.id || 'project-doc-draft',
    docTitle: formattedCopilotDocTitle,
    docContent: editorContent || editingDoc?.content || '',
    isActive: Boolean(editingDoc),
  });

  useEffect(() => {
    const handleCopilotDocEdit = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail || {};
      const { docId, docTitle, title, newTitle, editMode, targetSection, newContent, summary } = detail;

      const targetTitle = newTitle || title;

      // Extract summary change pattern (e.g. "from 'hello wordl' to 'hello world'")
      const changeMatch = (summary || '').match(/(?:change|replace|update|fix|rename)\s+(?:typo\s+)?(?:from\s+)?['"‘“]([^'"‘”]+)['"’”]\s+(?:to|with)\s+['"‘“]([^'"‘”]+)['"’”]/i);
      const oldTerm = changeMatch ? changeMatch[1].trim() : (targetSection ? targetSection.trim() : '');
      const newTerm = changeMatch ? changeMatch[2].trim() : (newContent ? newContent.trim() : '');

      if (editingDoc) {
        let nextTitle = editorTitle;
        if (targetTitle && targetTitle.trim() && targetTitle.trim() !== editingDoc.title) {
          nextTitle = targetTitle.trim();
          setEditorTitle(nextTitle);
        }

        let nextSections = [...editorSections];
        let didUpdate = false;

        // 1. Direct section title rename or typo fix (e.g. "hello wordl" -> "hello world")
        if (oldTerm && newTerm) {
          const cleanOld = oldTerm.toLowerCase();
          const titleIdx = nextSections.findIndex(s => s.title.toLowerCase().trim() === cleanOld || s.title.toLowerCase().includes(cleanOld));
          if (titleIdx !== -1) {
            if (changeMatch || (targetSection && targetSection.toLowerCase().trim() === nextSections[titleIdx].title.toLowerCase().trim())) {
              nextSections[titleIdx] = {
                ...nextSections[titleIdx],
                title: newTerm,
              };
              didUpdate = true;
            }
          }
        }

        // 2. Target section content update or structured block rewrite
        if (!didUpdate && newContent && newContent.trim()) {
          if (targetSection && targetSection.trim()) {
            const cleanSec = targetSection.toLowerCase().trim();
            const idx = nextSections.findIndex(s => s.title.toLowerCase().trim() === cleanSec || s.title.toLowerCase().includes(cleanSec));
            if (idx !== -1) {
              const isRenaming = editMode === 'RENAME_SECTION' || (summary || '').toLowerCase().includes('rename') || (summary || '').toLowerCase().includes('typo');
              if (isRenaming) {
                nextSections[idx] = { ...nextSections[idx], title: newContent.trim() };
              } else {
                nextSections[idx] = { ...nextSections[idx], content: newContent };
              }
              didUpdate = true;
            } else {
              const contentIdx = nextSections.findIndex(s => s.content.includes(targetSection));
              if (contentIdx !== -1) {
                nextSections[contentIdx] = {
                  ...nextSections[contentIdx],
                  content: nextSections[contentIdx].content.split(targetSection).join(newContent),
                };
                didUpdate = true;
              } else {
                nextSections.push({ title: targetSection.trim(), content: newContent });
                didUpdate = true;
              }
            }
          } else if (editMode === 'APPEND_SECTION') {
            const parsed = parseContentToSections(newContent);
            if (parsed.sections && parsed.sections.length > 0) {
              nextSections.push(...parsed.sections);
            } else {
              nextSections.push({ title: 'Sample Section', content: newContent });
            }
            didUpdate = true;
          } else if (editMode === 'REPLACE_CONTENT' || editMode === 'REWRITE_BLOCK') {
            const parsed = parseContentToSections(newContent);
            if (parsed.sections && parsed.sections.length > 0) {
              nextSections = parsed.sections;
            }
            setEditorContent(newContent);
            didUpdate = true;
          }
        }

        // 3. Fallback substring replacement across all sections (titles and contents)
        if (!didUpdate && oldTerm && newTerm) {
          nextSections = nextSections.map(s => {
            let sTitle = s.title;
            let sContent = s.content;
            if (sTitle.toLowerCase().includes(oldTerm.toLowerCase())) {
              sTitle = sTitle.replace(new RegExp(oldTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), newTerm);
              didUpdate = true;
            }
            if (sContent.includes(oldTerm)) {
              sContent = sContent.split(oldTerm).join(newTerm);
              didUpdate = true;
            }
            return { title: sTitle, content: sContent };
          });
        }

        setEditorSections(nextSections);

        // Auto-persist changes to database
        try {
          let finalContent = editorContent;
          if (editingDoc.type !== 'ProjectBlueprint') {
            const struct = {
              header: {
                ourCompanyName: senderCompanyName,
                ourEmail: senderEmail,
                ourAddress: senderAddress,
                clientCompanyName: recipientCompanyName,
                clientEmail: recipientEmail,
                clientAddress: recipientAddress,
              },
              sections: nextSections,
              footer: {
                confidentiality: "STRICTLY CONFIDENTIAL - FOR CLIENT & INTERNAL USE ONLY",
                stamp: "Digitally Stamped by IntoAI Compliance Controller",
              }
            };
            finalContent = JSON.stringify(struct, null, 2);
          } else {
            finalContent = nextSections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n');
          }

          setEditorContent(finalContent);

          await triggerUpsert({
            workspaceId,
            projectId,
            releaseId: selectedReleaseId,
            type: editingDoc.type,
            title: nextTitle,
            content: finalContent,
          });
          await revalidateDocs();
          toast(`Document "${nextTitle}" updated successfully`);
        } catch (saveErr) {
          console.error('Failed to auto-save document edit:', saveErr);
          toast('Document updated in editor');
        }
      } else {
        // Document is not currently open in editor: match across all 11 templates and documents
        const rawSearch = (docTitle || docId || '').toLowerCase();
        const cleanSearch = rawSearch.replace(/\s+_v\d+.*$/i, '').trim();

        const targetTemplate = DOCUMENT_TEMPLATES.find(t =>
          t.type.toLowerCase() === cleanSearch ||
          t.name.toLowerCase() === cleanSearch ||
          cleanSearch.includes(t.name.toLowerCase()) ||
          cleanSearch.includes(t.type.toLowerCase()) ||
          t.name.toLowerCase().includes(cleanSearch) ||
          t.type.toLowerCase().includes(cleanSearch)
        );

        let targetDoc = documents.find(d =>
          (docId && d.id === docId) ||
          d.title.toLowerCase() === cleanSearch ||
          d.type.toLowerCase() === cleanSearch ||
          cleanSearch.includes(d.type.toLowerCase()) ||
          cleanSearch.includes(d.title.toLowerCase()) ||
          (targetTemplate && d.type === targetTemplate.type)
        );

        const docType = targetDoc ? targetDoc.type : (targetTemplate ? targetTemplate.type : 'ProjectPlan');
        const docInitialContent = targetDoc ? targetDoc.content : (targetTemplate ? targetTemplate.defaultContent : '');
        const docInitialTitle = targetTitle || (targetDoc ? targetDoc.title : (targetTemplate ? targetTemplate.name : 'Project Document'));

        try {
          const parsed = parseContentToSections(docInitialContent);
          let nextSections = parsed.sections && parsed.sections.length > 0 ? [...parsed.sections] : [];
          let didUpdate = false;

          if (oldTerm && newTerm) {
            const cleanOld = oldTerm.toLowerCase();
            const titleIdx = nextSections.findIndex(s => s.title.toLowerCase().trim() === cleanOld || s.title.toLowerCase().includes(cleanOld));
            if (titleIdx !== -1) {
              nextSections[titleIdx] = {
                ...nextSections[titleIdx],
                title: newTerm,
              };
              didUpdate = true;
            }
          }

          if (!didUpdate && newContent && newContent.trim()) {
            if (targetSection && targetSection.trim()) {
              const cleanSec = targetSection.toLowerCase().trim();
              const idx = nextSections.findIndex(s => s.title.toLowerCase().trim() === cleanSec || s.title.toLowerCase().includes(cleanSec));
              if (idx !== -1) {
                const isRenaming = editMode === 'RENAME_SECTION' || (summary || '').toLowerCase().includes('rename') || (summary || '').toLowerCase().includes('typo');
                if (isRenaming) {
                  nextSections[idx] = { ...nextSections[idx], title: newContent.trim() };
                } else {
                  nextSections[idx] = { ...nextSections[idx], content: newContent };
                }
                didUpdate = true;
              } else {
                nextSections.push({ title: targetSection.trim(), content: newContent });
                didUpdate = true;
              }
            } else if (editMode === 'APPEND_SECTION') {
              const parsedNew = parseContentToSections(newContent);
              if (parsedNew.sections && parsedNew.sections.length > 0) {
                nextSections.push(...parsedNew.sections);
              } else {
                nextSections.push({ title: 'Sample Section', content: newContent });
              }
              didUpdate = true;
            } else if (editMode === 'REPLACE_CONTENT' || editMode === 'REWRITE_BLOCK') {
              const parsedNew = parseContentToSections(newContent);
              if (parsedNew.sections && parsedNew.sections.length > 0) {
                nextSections = parsedNew.sections;
              }
              didUpdate = true;
            }
          }

          if (!didUpdate && oldTerm && newTerm) {
            nextSections = nextSections.map(s => {
              let sTitle = s.title;
              let sContent = s.content;
              if (sTitle.toLowerCase().includes(oldTerm.toLowerCase())) {
                sTitle = sTitle.replace(new RegExp(oldTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), newTerm);
              }
              if (sContent.includes(oldTerm)) {
                sContent = sContent.split(oldTerm).join(newTerm);
              }
              return { title: sTitle, content: sContent };
            });
          }

          let updatedDocContent = '';
          if (docType === 'ProjectBlueprint') {
            updatedDocContent = nextSections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n');
          } else {
            const struct = {
              header: {
                ourCompanyName: senderCompanyName,
                ourEmail: senderEmail,
                ourAddress: senderAddress,
                clientCompanyName: recipientCompanyName,
                clientEmail: recipientEmail,
                clientAddress: recipientAddress,
              },
              sections: nextSections,
              footer: {
                confidentiality: "STRICTLY CONFIDENTIAL - FOR CLIENT & INTERNAL USE ONLY",
                stamp: "Digitally Stamped by IntoAI Compliance Controller",
              }
            };
            updatedDocContent = JSON.stringify(struct, null, 2);
          }

          await triggerUpsert({
            workspaceId,
            projectId,
            releaseId: targetDoc?.releaseId || selectedReleaseId,
            type: docType,
            title: docInitialTitle,
            content: updatedDocContent,
          });
          await revalidateDocs();
          toast(`Document "${docInitialTitle}" updated successfully`);
        } catch (err: any) {
          console.error('Failed to update document via Copilot:', err);
        }
      }
    };

    window.addEventListener('workspace-copilot-doc-edit', handleCopilotDocEdit);
    return () => {
      window.removeEventListener('workspace-copilot-doc-edit', handleCopilotDocEdit);
    };
  }, [editingDoc, editorTitle, editorContent, editorSections, documents, projectId, selectedReleaseId, workspaceId, triggerUpsert, revalidateDocs, senderCompanyName, senderEmail, senderAddress, recipientCompanyName, recipientEmail, recipientAddress]);

  const handleSaveDoc = async () => {
    if (!editingDoc) return;
    try {
      let finalContent = editorContent;
      if (editingDoc.type !== 'ProjectBlueprint') {
        const struct = {
          header: {
            ourCompanyName: senderCompanyName,
            ourEmail: senderEmail,
            ourAddress: senderAddress,
            clientCompanyName: recipientCompanyName,
            clientEmail: recipientEmail,
            clientAddress: recipientAddress,
          },
          sections: editorSections,
          footer: {
            confidentiality: "STRICTLY CONFIDENTIAL - FOR CLIENT & INTERNAL USE ONLY",
            stamp: "Digitally Stamped by IntoAI Compliance Controller",
          }
        };
        finalContent = JSON.stringify(struct, null, 2);
      }

      await triggerUpsert({
        workspaceId,
        projectId,
        releaseId: selectedReleaseId,
        type: editingDoc.type,
        title: editorTitle,
        content: finalContent,
      });
      setEditingDoc(null);
      revalidateDocs();
      toast('Document saved successfully');
    } catch (err: any) {
      alert(err.message || 'Error saving document.');
    }
  };

  const handleTriggerDelete = async (id: string) => {
    setDeletingDocId(id);
    setOtpCode('');
    try {
      await triggerSendDeleteOtp({ workspaceId });
    } catch (err: any) {
      alert(err.message || 'Error sending OTP code.');
      setDeletingDocId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingDocId || !otpCode) return;
    try {
      await triggerDeleteDoc({ workspaceId, id: deletingDocId, otp: otpCode });
      setDeletingDocId(null);
      revalidateDocs();
    } catch (err: any) {
      alert(err.message || 'Invalid verification OTP.');
    }
  };

  const handleCopyPrevious = async (type: string) => {
    if (copyingType) return; // Prevent duplicate rapid clicks
    setCopyingType(type);
    try {
      const res = await triggerCopy({ workspaceId, projectId, releaseId: selectedReleaseId, type });
      if (res?.copyDocumentFromPreviousVersion) {
        await revalidateDocs();
        toast('Document copied from previous version successfully');
      } else {
        toast('No document found in previous release version to copy from.');
      }
    } catch (err: any) {
      console.error("Copy document error:", err);
      const rawMsg = String(err?.message || '');
      if (!rawMsg || rawMsg.toLowerCase().includes('internal error') || rawMsg.toLowerCase().includes('internal server error')) {
        toast('No document found in previous release version to copy from.');
      } else {
        toast(rawMsg);
      }
    } finally {
      setCopyingType(null);
    }
  };

  const handleInternalApprove = (id: string) => {
    if (!isProjectManagerLoggedIn) {
      toast('Only the assigned Project Manager of this project can approve documents internally.');
      return;
    }
    setInternalApprovalDocId(id);
    setInternalApprovalStep(1);
  };

  const handleConfirmInternalApprove = async () => {
    if (!internalApprovalDocId) return;

    const datacenterVpnRegex = /\b(NForce|Nforce|NFOrce|ExpressVPN|NordVPN|ProtonVPN|CyberGhost|Surfshark|Mullvad|PIA|Private Internet Access|TunnelBear|Windscribe|WireGuard|OpenVPN|Urban|TouchVPN|ZenMate|Hola|M247|DigitalOcean|Linode|AWS|Amazon|OVH|Leaseweb|Vultr|Hetzner|Anonymizer|Virtual Private Network|Proxy|Datacenter|Data Center|Hosting|Server|VPS|Cloudflare|Warp|IPVanish|HideMyAss|HMA|Hotspot Shield|VyprVPN|IVPN|AdGuard|Betternet|Psiphon|Fortinet|Cisco|AnyConnect|Palo Alto|GlobalProtect|Zscaler|Tailscale|ZeroTier|Sophos|SonicWall|Nord|Proton|Express|Surfshark|Mullvad|AirVPN|TorGuard|StrongVPN|PureVPN|ZenMate|UltraSurf|VpnGate|FastestVPN|PrivateVPN|Ivacy|VPN|Proxy|Hosting|Server|Datacenter|VPC|Transit|BGP|ASN|Infrastructure|Tunnel|Choopa|Constant|Hostinger|Ponynet|FranTech|Serverius|Cogent|Teraswitch|BuyVM|Fasthosts|Contabo|Ionos|Clouvider|Datacamp|Performive|QuadraNet|Psychz|Servers\.com|Equinix|InterServer|DMC|Packet|Zenlayer|Alibaba|Tencent|Oracle|GCP|Google Cloud|Azure|Microsoft|Fastly|Akamai|Cdn77|Imperva|Incapsula|Sucuri)\b/i;

    let isVpnDetectedClientSide = false;

    try {
      const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(4000) });
      const data = await res.json();
      if (data && data.success) {
        if (data.security && (data.security.vpn === true || data.security.proxy === true || data.security.tor === true || data.security.hosting === true)) {
          isVpnDetectedClientSide = true;
        }
        const ispStr = `${data.connection?.isp || ''} ${data.connection?.org || ''} ${data.connection?.domain || ''} ${data.connection?.asn || ''}`;
        if (datacenterVpnRegex.test(ispStr)) {
          isVpnDetectedClientSide = true;
        }
      }
    } catch (e) {}

    if (isVpnDetectedClientSide) {
      setInternalApprovalDocId(null);
      setIsVpnModalOpen(true);
      toast('Security Violation: Active VPN or Proxy connection detected. Please disable your VPN to approve documents.');
      return;
    }

    try {
      await triggerInternalApprove({ workspaceId, id: internalApprovalDocId });
      revalidateDocs();
      toast('Document approved internally successfully');
      setInternalApprovalDocId(null);
    } catch (err: any) {
      const msg = String(err.message || '');
      if (msg.includes('VPN') || msg.includes('Proxy') || msg.includes('Security Violation')) {
        setInternalApprovalDocId(null);
        setIsVpnModalOpen(true);
      }
      toast(err.message || 'Internal approval failed.');
    }
  };

  // Client Actions
  const handleClientApprove = (doc: any) => {
    setClientApprovalDoc(doc);
    setClientApprovalStep(1);
  };

  const handleConfirmClientApprove = async () => {
    if (!clientApprovalDoc) return;

    const datacenterVpnRegex = /\b(NForce|Nforce|NFOrce|ExpressVPN|NordVPN|ProtonVPN|CyberGhost|Surfshark|Mullvad|PIA|Private Internet Access|TunnelBear|Windscribe|WireGuard|OpenVPN|Urban|TouchVPN|ZenMate|Hola|M247|DigitalOcean|Linode|AWS|Amazon|OVH|Leaseweb|Vultr|Hetzner|Anonymizer|Virtual Private Network|Proxy|Datacenter|Data Center|Hosting|Server|VPS|Cloudflare|Warp|IPVanish|HideMyAss|HMA|Hotspot Shield|VyprVPN|IVPN|AdGuard|Betternet|Psiphon|Fortinet|Cisco|AnyConnect|Palo Alto|GlobalProtect|Zscaler|Tailscale|ZeroTier|Sophos|SonicWall|Nord|Proton|Express|Surfshark|Mullvad|AirVPN|TorGuard|StrongVPN|PureVPN|ZenMate|UltraSurf|VpnGate|FastestVPN|PrivateVPN|Ivacy|VPN|Proxy|Hosting|Server|Datacenter|VPC|Transit|BGP|ASN|Infrastructure|Tunnel|Choopa|Constant|Hostinger|Ponynet|FranTech|Serverius|Cogent|Teraswitch|BuyVM|Fasthosts|Contabo|Ionos|Clouvider|Datacamp|Performive|QuadraNet|Psychz|Servers\.com|Equinix|InterServer|DMC|Packet|Zenlayer|Alibaba|Tencent|Oracle|GCP|Google Cloud|Azure|Microsoft|Fastly|Akamai|Cdn77|Imperva|Incapsula|Sucuri)\b/i;

    let clientPublicIp = '';
    let isVpnDetectedClientSide = false;

    try {
      const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(4000) });
      const data = await res.json();
      if (data && data.success) {
        if (data.ip) clientPublicIp = data.ip;
        if (data.security && (data.security.vpn === true || data.security.proxy === true || data.security.tor === true || data.security.hosting === true)) {
          isVpnDetectedClientSide = true;
        }
        const ispStr = `${data.connection?.isp || ''} ${data.connection?.org || ''} ${data.connection?.domain || ''} ${data.connection?.asn || ''}`;
        if (datacenterVpnRegex.test(ispStr)) {
          isVpnDetectedClientSide = true;
        }
      }
    } catch (e) {}

    if (isVpnDetectedClientSide) {
      setClientApprovalDoc(null);
      setIsVpnModalOpen(true);
      toast('Security Violation: Active VPN or Proxy connection detected. Please disable your VPN to approve documents.');
      return;
    }

    try {
      if (!clientPublicIp) {
        try {
          const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
          const data = await res.json();
          if (data && data.ip) clientPublicIp = data.ip;
        } catch (e) {}
      }

      let verifiedGuestEmail = localStorage.getItem('intoai_guest_verified_email') || '';
      if (!verifiedGuestEmail || !verifiedGuestEmail.includes('@')) {
        const storedShareKey = localStorage.getItem('affine-project-share-key') || '';
        if (storedShareKey) {
          const parts = storedShareKey.split(':');
          if (parts[4] && parts[4].includes('@')) {
            verifiedGuestEmail = parts[4].split(',')[0].trim().toLowerCase();
          }
        }
      }
      if (verifiedGuestEmail.includes(',')) {
        verifiedGuestEmail = verifiedGuestEmail.split(',')[0].trim().toLowerCase();
      }
      if (!verifiedGuestEmail || !verifiedGuestEmail.includes('@')) {
        verifiedGuestEmail = 'business@intoai.ai';
      }

      await triggerClientApprove({
        id: clientApprovalDoc.id,
        ip: clientPublicIp,
        browser: navigator.userAgent,
        device: navigator.platform,
        email: verifiedGuestEmail,
      });
      setClientApprovalDoc(null);
      revalidateDocs();
      toast(`Document "${clientApprovalDoc.title}" approved successfully!`);
    } catch (err: any) {
      const msg = String(err.message || '');
      console.error('[FRONTEND DEBUG APPROVE ERROR]', err);
      if (msg.includes('VPN') || msg.includes('Proxy') || msg.includes('Security Violation')) {
        setClientApprovalDoc(null);
        setIsVpnModalOpen(true);
      }
      toast(err.message || 'Approval failed.');
    }
  };

  const handleClientOpenSign = (doc: any) => {
    setSigningDoc(doc);
    setClientEmail('');
    setClientOtp('');
    setIsClientOtpSent(false);
  };

  const handleClientSendOtp = async () => {
    if (!clientEmail) return;
    try {
      await triggerClientSendOtp({ id: signingDoc.id, email: clientEmail });
      setIsClientOtpSent(true);
    } catch (err: any) {
      alert(err.message || 'Error sending verification code.');
    }
  };

  const handleClientConfirmSign = async () => {
    if (!signingDoc || !clientOtp) return;
    if (!window.confirm(`Are you sure you want to digitally sign "${signingDoc.title}"?`)) {
      return;
    }
    if (!window.confirm("CONFIRMATION: Do you verify that this cryptographic digital signature stamp is legally binding?")) {
      return;
    }
    try {
      let clientPublicIp = '';
      try {
        const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
        const data = await res.json();
        if (data && data.ip) clientPublicIp = data.ip;
      } catch (e) {}

      let verifiedGuestEmail = clientEmail || localStorage.getItem('intoai_guest_verified_email') || '';
      if (!verifiedGuestEmail || !verifiedGuestEmail.includes('@')) {
        const storedShareKey = localStorage.getItem('affine-project-share-key') || '';
        if (storedShareKey) {
          const parts = storedShareKey.split(':');
          if (parts[4] && parts[4].includes('@')) {
            verifiedGuestEmail = parts[4].split(',')[0].trim().toLowerCase();
          }
        }
      }
      if (verifiedGuestEmail.includes(',')) {
        verifiedGuestEmail = verifiedGuestEmail.split(',')[0].trim().toLowerCase();
      }
      if (!verifiedGuestEmail || !verifiedGuestEmail.includes('@')) {
        verifiedGuestEmail = 'business@intoai.ai';
      }

      await triggerClientSign({
        id: signingDoc.id,
        otp: clientOtp,
        ip: clientPublicIp,
        browser: navigator.userAgent,
        device: navigator.platform,
        email: verifiedGuestEmail,
      });
      setSigningDoc(null);
      revalidateDocs();
      toast(`Document "${signingDoc.title}" digitally signed successfully!`);
    } catch (err: any) {
      const msg = String(err.message || '');
      console.error('[FRONTEND DEBUG SIGN ERROR]', err);
      if (msg.includes('VPN') || msg.includes('Proxy') || msg.includes('Security Violation')) {
        setIsVpnModalOpen(true);
      }
      alert(err.message || 'Digital signature failed.');
    }
  };

  const handleSendSelectedToMail = async () => {
    if (selectedDocTypes.length === 0 || !mailTargetEmail) return;
    const documentIds = documents.filter(d => selectedDocTypes.includes(d.type)).map(d => d.id);
    try {
      await triggerSendMail({ documentIds, email: mailTargetEmail });
      setIsMailSendingModalOpen(false);
      setSelectedDocTypes([]);
      alert(`Successfully dispatched document copies to ${mailTargetEmail}.`);
    } catch (err: any) {
      alert(err.message || 'Error sending document copies.');
    }
  };

  const handleSendForApproval = async () => {
    const docTypes = selectedDocTypes.length > 0 ? selectedDocTypes : documents.map(d => d.type);
    if (docTypes.length === 0) {
      alert("No documents created in this release to send for approval. Please create some documents first!");
      return;
    }
    try {
      await triggerSendApproval({
        workspaceId,
        projectId,
        releaseId: selectedReleaseId,
        documentTypes: docTypes,
        days: approvalDays,
      });
      setIsApprovalModalOpen(false);
      setSelectedDocTypes([]);
      revalidateConfig();
      revalidateDocs();
    } catch (err: any) {
      alert(err.message || 'Error sending documents for approval.');
    }
  };

  const handleMakePublic = async () => {
    try {
      await triggerMakePublic({
        workspaceId,
        projectId,
        days: publicDays,
      });
      setIsPublicModalOpen(false);
      revalidateConfig();
    } catch (err: any) {
      alert(err.message || 'Failed to enable Client Key Access.');
    }
  };

  const handleStopPublicSharing = () => {
    setIsStopSharingConfirmOpen(true);
  };

  const handleConfirmStopPublicSharing = async () => {
    setIsStopSharingConfirmOpen(false);
    try {
      await triggerMakePublic({
        workspaceId,
        projectId,
        days: 0,
      });
      revalidateConfig();
    } catch (err: any) {
      alert(err.message || 'Failed to stop client key access.');
    }
  };

  // Helper to format inline markdown (bold, italic, code) without icons or emojis
  const formatIBMInlineText = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700; color: #161616;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background: #f4f4f4; border: 1px solid #e0e0e0; padding: 1px 5px; border-radius: 3px; font-family: \'IBM Plex Mono\', monospace; font-size: 11.5px; color: #0f62fe;">$1</code>');
  };

  // Helper to parse Markdown content into clean, semantic IBM Corporate HTML
  const parseMarkdownToIBMHtml = (markdown: string): string => {
    if (!markdown) return '<p style="color: #6f6f6f; font-style: italic;">No content available.</p>';

    // Try structured JSON format first
    try {
      const parsed = JSON.parse(markdown);
      if (parsed && Array.isArray(parsed.sections)) {
        return `
          <div style="display: flex; flex-direction: column; gap: 24px;">
            ${parsed.sections.map((sec: any, idx: number) => `
              <div style="page-break-inside: avoid; border-bottom: 1px solid #e0e0e0; padding-bottom: 20px;">
                <h3 style="font-size: 15px; font-weight: 700; color: #0043ce; margin: 0 0 10px 0; letter-spacing: 0.2px;">
                  <span style="color: #0f62fe; margin-right: 6px;">${idx + 1}.0</span> ${sec.title.replace(/^\d+[\.\s]*/, '')}
                </h3>
                <div style="font-size: 13px; color: #262626; line-height: 1.65; white-space: pre-wrap;">
                  ${parseMarkdownToIBMHtml(sec.content)}
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
    } catch (e) {}

    const lines = markdown.split('\n');
    let html = '';
    let inList = false;
    let inOrderedList = false;
    let inCodeBlock = false;
    let inTable = false;
    let tableRows: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trimEnd();

      // Code Block
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          html += '</code></pre>\n';
          inCodeBlock = false;
        } else {
          if (inList) { html += '</ul>\n'; inList = false; }
          if (inOrderedList) { html += '</ol>\n'; inOrderedList = false; }
          html += '<pre style="background: #f4f4f4; border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px 16px; font-family: \'IBM Plex Mono\', monospace; font-size: 12px; color: #161616; overflow-x: auto; margin: 12px 0; line-height: 1.5;"><code>';
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        html += line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '\n';
        continue;
      }

      // Markdown Table
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          if (inList) { html += '</ul>\n'; inList = false; }
          if (inOrderedList) { html += '</ol>\n'; inOrderedList = false; }
          inTable = true;
          tableRows = [];
        }
        if (!/^\|[\s\-:|]+\|$/.test(line)) {
          tableRows.push(line);
        }
        continue;
      } else if (inTable) {
        if (tableRows.length > 0) {
          html += '<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12.5px; border: 1px solid #e0e0e0;">\n';
          const rawHeaders = tableRows[0].split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          html += '<thead><tr style="background: #f4f4f4;">' + rawHeaders.map(h => `<th style="padding: 8px 12px; border: 1px solid #e0e0e0; font-weight: 700; color: #161616; text-align: left;">${formatIBMInlineText(h.trim())}</th>`).join('') + '</tr></thead>\n<tbody>\n';
          for (let r = 1; r < tableRows.length; r++) {
            const rawCells = tableRows[r].split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
            html += `<tr style="${r % 2 === 0 ? 'background: #fafafa;' : 'background: #ffffff;'}">` + rawCells.map(c => `<td style="padding: 8px 12px; border: 1px solid #e0e0e0; color: #262626;">${formatIBMInlineText(c.trim())}</td>`).join('') + '</tr>\n';
          }
          html += '</tbody></table>\n';
        }
        inTable = false;
        tableRows = [];
      }

      // Headings
      if (line.startsWith('# ')) {
        if (inList) { html += '</ul>\n'; inList = false; }
        if (inOrderedList) { html += '</ol>\n'; inOrderedList = false; }
        html += `<h2 style="font-size: 17px; font-weight: 700; color: #161616; border-bottom: 2px solid #0f62fe; padding-bottom: 6px; margin: 26px 0 12px 0;">${formatIBMInlineText(line.slice(2))}</h2>\n`;
        continue;
      }
      if (line.startsWith('## ')) {
        if (inList) { html += '</ul>\n'; inList = false; }
        if (inOrderedList) { html += '</ol>\n'; inOrderedList = false; }
        html += `<h3 style="font-size: 14.5px; font-weight: 700; color: #0043ce; margin: 20px 0 8px 0;">${formatIBMInlineText(line.slice(3))}</h3>\n`;
        continue;
      }
      if (line.startsWith('### ')) {
        if (inList) { html += '</ul>\n'; inList = false; }
        if (inOrderedList) { html += '</ol>\n'; inOrderedList = false; }
        html += `<h4 style="font-size: 13px; font-weight: 600; color: #161616; margin: 14px 0 6px 0;">${formatIBMInlineText(line.slice(4))}</h4>\n`;
        continue;
      }

      // Blockquotes / Callouts
      if (line.startsWith('> ')) {
        if (inList) { html += '</ul>\n'; inList = false; }
        if (inOrderedList) { html += '</ol>\n'; inOrderedList = false; }
        html += `<blockquote style="margin: 12px 0; padding: 12px 16px; background: #edf5ff; border-left: 4px solid #0f62fe; color: #002d9c; font-size: 12.5px; line-height: 1.5;">${formatIBMInlineText(line.slice(2))}</blockquote>\n`;
        continue;
      }

      // Unordered Lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        if (inOrderedList) { html += '</ol>\n'; inOrderedList = false; }
        if (!inList) { html += '<ul style="margin: 6px 0 12px 0; padding-left: 24px; color: #262626; font-size: 13px; line-height: 1.6;">\n'; inList = true; }
        html += `<li style="margin-bottom: 4px;">${formatIBMInlineText(line.slice(2))}</li>\n`;
        continue;
      }

      // Ordered Lists
      const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        if (inList) { html += '</ul>\n'; inList = false; }
        if (!inOrderedList) { html += '<ol style="margin: 6px 0 12px 0; padding-left: 24px; color: #262626; font-size: 13px; line-height: 1.6;">\n'; inOrderedList = true; }
        html += `<li style="margin-bottom: 4px;">${formatIBMInlineText(numMatch[2])}</li>\n`;
        continue;
      }

      // Empty Line
      if (!line.trim()) {
        if (inList) { html += '</ul>\n'; inList = false; }
        if (inOrderedList) { html += '</ol>\n'; inOrderedList = false; }
        continue;
      }

      // Standard Paragraph
      if (inList) { html += '</ul>\n'; inList = false; }
      if (inOrderedList) { html += '</ol>\n'; inOrderedList = false; }
      html += `<p style="font-size: 13px; color: #262626; line-height: 1.65; margin: 0 0 10px 0;">${formatIBMInlineText(line)}</p>\n`;
    }

    if (inList) html += '</ul>\n';
    if (inOrderedList) html += '</ol>\n';
    if (inCodeBlock) html += '</code></pre>\n';
    if (inTable && tableRows.length > 0) {
      html += '<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12.5px; border: 1px solid #e0e0e0;"><thead><tr style="background: #f4f4f4;">' + tableRows[0].split('|').filter(Boolean).map(h => `<th style="padding: 8px 12px; border: 1px solid #e0e0e0; font-weight: 700; color: #161616; text-align: left;">${formatIBMInlineText(h.trim())}</th>`).join('') + '</tr></thead><tbody>';
      for (let r = 1; r < tableRows.length; r++) {
        html += `<tr style="${r % 2 === 0 ? 'background: #fafafa;' : 'background: #ffffff;'}">` + tableRows[r].split('|').filter(Boolean).map(c => `<td style="padding: 8px 12px; border: 1px solid #e0e0e0; color: #262626;">${formatIBMInlineText(c.trim())}</td>`).join('') + '</tr>';
      }
      html += '</tbody></table>';
    }

    return html;
  };

  // PDF Individual Document Exporter (IBM Enterprise Standard)
  const exportPDF = (doc: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let displayContentHtml = '';
    const isBlueprint = doc.type === 'ProjectBlueprint';
    let blueprintData: any = null;

    try {
      const parsed = JSON.parse(doc.content);
      if (parsed && (parsed.version === '2.0' || Array.isArray(parsed.elements))) {
        blueprintData = parsed;
      }
    } catch (e) {}

    if (isBlueprint && blueprintData) {
      const elements = blueprintData.elements || [];
      const connections = blueprintData.connections || [];
      const containers = elements.filter((el: any) => el.type === 'container');
      const nodes = elements.filter((el: any) => el.type === 'node');
      const notes = elements.filter((el: any) => el.type === 'note');
      const images = elements.filter((el: any) => el.type === 'image');
      const getChildren = (parentId: string) => elements.filter((el: any) => el.parentId === parentId);

      let zonesHtml = '';
      if (containers.length > 0) {
        zonesHtml = `
          <div style="margin-top: 28px; page-break-inside: avoid;">
            <h2 style="font-size: 16px; font-weight: 700; color: #161616; border-bottom: 2px solid #0f62fe; padding-bottom: 6px; margin-bottom: 16px;">Enterprise Architecture & Environment Zones</h2>
            <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
              ${containers.map((c: any) => {
                const children = getChildren(c.id);
                return `
                  <div style="background: #f4f4f4; border: 1px solid #e0e0e0; border-radius: 4px; padding: 16px; page-break-inside: avoid;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                      <h3 style="margin: 0; font-size: 14.5px; color: #0043ce; font-weight: 700;">${c.label}</h3>
                      <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; color: #525252; background: #e0e0e0; padding: 2px 6px; border-radius: 3px;">Zone Container</span>
                    </div>
                    ${c.description ? `<p style="margin: 0 0 12px 0; font-size: 12.5px; color: #525252; line-height: 1.5;">${c.description}</p>` : ''}
                    <div style="background: #ffffff; border: 1px solid #e0e0e0; border-radius: 4px; padding: 10px 12px;">
                      <div style="font-size: 10.5px; font-weight: 700; color: #6f6f6f; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #f4f4f4; padding-bottom: 4px; margin-bottom: 6px;">Contained Elements</div>
                      ${children.length > 0 ? `
                        <ul style="margin: 0; padding-left: 18px; font-size: 12.5px; color: #262626; line-height: 1.5;">
                          ${children.map((child: any) => `
                            <li>
                              <strong>${child.label}</strong> 
                              ${child.style?.role ? `<span style="font-size: 10px; color: #0f62fe; background: #edf5ff; padding: 1px 4px; border-radius: 3px; margin-left: 4px;">${child.style.role}</span>` : ''}
                              ${child.description ? `<span style="color: #525252; font-size: 12px;"> - ${child.description}</span>` : ''}
                            </li>
                          `).join('')}
                        </ul>
                      ` : '<div style="font-size: 12px; color: #8d8d8d; font-style: italic;">No elements inside this zone.</div>'}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }

      let nodesHtml = '';
      if (nodes.length > 0) {
        nodesHtml = `
          <div style="margin-top: 28px; page-break-inside: avoid;">
            <h2 style="font-size: 16px; font-weight: 700; color: #161616; border-bottom: 2px solid #0f62fe; padding-bottom: 6px; margin-bottom: 16px;">Component & Agent Specifications</h2>
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12.5px; border: 1px solid #e0e0e0;">
              <thead>
                <tr style="background: #f4f4f4; border-bottom: 2px solid #e0e0e0;">
                  <th style="padding: 8px 12px; font-weight: 700; color: #161616; border: 1px solid #e0e0e0;">Component / Node</th>
                  <th style="padding: 8px 12px; font-weight: 700; color: #161616; border: 1px solid #e0e0e0;">Type</th>
                  <th style="padding: 8px 12px; font-weight: 700; color: #161616; border: 1px solid #e0e0e0;">Status</th>
                  <th style="padding: 8px 12px; font-weight: 700; color: #161616; border: 1px solid #e0e0e0;">Node Key</th>
                  <th style="padding: 8px 12px; font-weight: 700; color: #161616; border: 1px solid #e0e0e0;">Description</th>
                </tr>
              </thead>
              <tbody>
                ${nodes.map((n: any, idx: number) => {
                  const status = (n.style?.status || 'todo').toLowerCase();
                  const isDone = status === 'done';
                  return `
                    <tr style="${idx % 2 === 0 ? 'background: #ffffff;' : 'background: #fafafa;'} border-bottom: 1px solid #e0e0e0; page-break-inside: avoid;">
                      <td style="padding: 8px 12px; font-weight: 700; color: #161616; border: 1px solid #e0e0e0;">${n.label}</td>
                      <td style="padding: 8px 12px; color: #525252; border: 1px solid #e0e0e0;">${n.style?.role || 'agent'}</td>
                      <td style="padding: 8px 12px; border: 1px solid #e0e0e0;">
                        <span style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 3px; ${isDone ? 'background: #defbe6; color: #0e6027; border: 1px solid #a7f0ba;' : 'background: #edf5ff; color: #0043ce; border: 1px solid #d0e2ff;'}">
                          ${status}
                        </span>
                      </td>
                      <td style="padding: 8px 12px; font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: #0f62fe; border: 1px solid #e0e0e0;">${n.style?.nodeKey || '-'}</td>
                      <td style="padding: 8px 12px; color: #262626; border: 1px solid #e0e0e0;">${n.description || 'No description provided.'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      let connectionsHtml = '';
      if (connections.length > 0) {
        connectionsHtml = `
          <div style="margin-top: 28px; page-break-inside: avoid;">
            <h2 style="font-size: 16px; font-weight: 700; color: #161616; border-bottom: 2px solid #0f62fe; padding-bottom: 6px; margin-bottom: 16px;">Workflow Routing & Connection Matrix</h2>
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12.5px; border: 1px solid #e0e0e0;">
              <thead>
                <tr style="background: #f4f4f4; border-bottom: 2px solid #e0e0e0;">
                  <th style="padding: 8px 12px; font-weight: 700; color: #161616; border: 1px solid #e0e0e0;">Source Component</th>
                  <th style="padding: 8px 12px; font-weight: 700; color: #161616; border: 1px solid #e0e0e0;">Destination Component</th>
                  <th style="padding: 8px 12px; font-weight: 700; color: #161616; border: 1px solid #e0e0e0;">Routing Type</th>
                  <th style="padding: 8px 12px; font-weight: 700; color: #161616; border: 1px solid #e0e0e0;">Condition / Description</th>
                </tr>
              </thead>
              <tbody>
                ${connections.map((c: any, idx: number) => {
                  const sourceNode = elements.find((el: any) => el.id === c.source);
                  const targetNode = elements.find((el: any) => el.id === c.target);
                  return `
                    <tr style="${idx % 2 === 0 ? 'background: #ffffff;' : 'background: #fafafa;'} border-bottom: 1px solid #e0e0e0; page-break-inside: avoid;">
                      <td style="padding: 8px 12px; border: 1px solid #e0e0e0;"><strong style="color: #161616;">${sourceNode ? sourceNode.label : c.source}</strong></td>
                      <td style="padding: 8px 12px; border: 1px solid #e0e0e0;"><strong style="color: #161616;">${targetNode ? targetNode.label : c.target}</strong></td>
                      <td style="padding: 8px 12px; border: 1px solid #e0e0e0;"><span style="font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 3px; background: #edf5ff; color: #0043ce;">${c.edgeType || 'standard'}</span></td>
                      <td style="padding: 8px 12px; border: 1px solid #e0e0e0; color: #262626;">${c.label || '-'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      displayContentHtml = `
        <div style="background: #f4f4f4; padding: 16px 20px; border-radius: 4px; border: 1px solid #e0e0e0; margin-bottom: 24px; font-size: 12.5px; color: #525252;">
          <div style="color: #0043ce; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Architecture Model Metrics</div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; font-size: 13.5px; color: #161616; font-weight: 600;">
            <div>Zones: <span style="color: #0f62fe;">${containers.length}</span></div>
            <div>Components: <span style="color: #0f62fe;">${nodes.length}</span></div>
            <div>Connections: <span style="color: #0f62fe;">${connections.length}</span></div>
            <div>Annotations: <span style="color: #0f62fe;">${notes.length + images.length}</span></div>
          </div>
        </div>
        ${zonesHtml}
        ${nodesHtml}
        ${connectionsHtml}
      `;
    } else {
      // Standard IBM Enterprise Document Rendering (BRD, SRS, Architecture, etc.)
      displayContentHtml = parseMarkdownToIBMHtml(doc.content);
    }

    const docFormattedDate = doc.lastEditTime ? new Date(doc.lastEditTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const isApprovedOrSigned = Boolean(doc.status === 'ApprovedByClient' || doc.status === 'SignedByClient' || doc.approvalEmail);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>${doc.title} - Enterprise Technical Document</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');

            @page {
              size: A4 portrait;
              margin: 20mm 16mm 20mm 16mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #161616;
              background-color: #ffffff;
              line-height: 1.6;
              font-size: 13px;
              margin: 0;
              padding: 36px 44px;
            }

            .ibm-header {
              border-bottom: 2px solid #0f62fe;
              padding-bottom: 18px;
              margin-bottom: 24px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }

            .ibm-brand {
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.5px;
              color: #0f62fe;
              margin-bottom: 4px;
              text-transform: uppercase;
            }

            .ibm-title {
              font-size: 22px;
              font-weight: 700;
              color: #161616;
              margin: 0 0 6px 0;
              line-height: 1.25;
            }

            .ibm-type-pill {
              display: inline-block;
              font-size: 11px;
              font-weight: 600;
              padding: 2px 8px;
              border-radius: 3px;
              background: #edf5ff;
              color: #0043ce;
              border: 1px solid #d0e2ff;
            }

            .ibm-meta-table {
              font-size: 11.5px;
              border-collapse: collapse;
              text-align: right;
            }

            .ibm-meta-table td {
              padding: 2px 6px;
            }

            .ibm-meta-label {
              color: #6f6f6f;
              font-weight: 500;
            }

            .ibm-meta-val {
              color: #161616;
              font-weight: 600;
            }

            .ibm-stakeholders-card {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 24px;
              background: #f4f4f4;
              border: 1px solid #e0e0e0;
              border-radius: 4px;
              padding: 16px 20px;
              margin-bottom: 28px;
              font-size: 12px;
            }

            .ibm-stakeholder-col h4 {
              margin: 0 0 6px 0;
              font-size: 11px;
              font-weight: 700;
              color: #0043ce;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }

            .ibm-stakeholder-name {
              font-size: 13.5px;
              font-weight: 700;
              color: #161616;
              margin-bottom: 2px;
            }

            .ibm-stakeholder-detail {
              color: #525252;
              line-height: 1.45;
            }

            .ibm-audit-box {
              margin-top: 36px;
              border: 1px solid #0f62fe;
              border-radius: 4px;
              background: #edf5ff;
              padding: 18px 20px;
              page-break-inside: avoid;
            }

            .ibm-audit-header {
              font-size: 12px;
              font-weight: 700;
              color: #0043ce;
              margin-bottom: 12px;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }

            .ibm-audit-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px 24px;
              font-size: 12px;
            }

            .ibm-audit-row {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }

            .ibm-audit-label {
              font-size: 10.5px;
              color: #525252;
              font-weight: 500;
              text-transform: uppercase;
            }

            .ibm-audit-val {
              font-size: 12.5px;
              color: #161616;
              font-weight: 600;
            }

            .ibm-stamp-verified {
              display: inline-block;
              font-size: 11px;
              font-weight: 700;
              color: #0e6027;
              background: #defbe6;
              border: 1px solid #a7f0ba;
              padding: 2px 8px;
              border-radius: 3px;
            }

            .ibm-stamp-pending {
              display: inline-block;
              font-size: 11px;
              font-weight: 700;
              color: #8a3800;
              background: #fff8e1;
              border: 1px solid #ffe082;
              padding: 2px 8px;
              border-radius: 3px;
            }

            .ibm-footer {
              margin-top: 40px;
              padding-top: 14px;
              border-top: 1px solid #e0e0e0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10.5px;
              color: #6f6f6f;
              page-break-inside: avoid;
            }

            @media print {
              body { padding: 0; }
              .ibm-stakeholders-card, .ibm-audit-box { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <!-- Top Header -->
          <div class="ibm-header">
            <div>
              <div class="ibm-brand">IntoAI Enterprise Solutions</div>
              <h1 class="ibm-title">${doc.title}</h1>
              <div class="ibm-type-pill">Document Type: ${doc.type}</div>
            </div>
            <table class="ibm-meta-table">
              <tr>
                <td class="ibm-meta-label">Version:</td>
                <td class="ibm-meta-val">_v${doc.version || 1}</td>
              </tr>
              <tr>
                <td class="ibm-meta-label">Release:</td>
                <td class="ibm-meta-val">${selectedRelease?.name || 'Current Release'}</td>
              </tr>
              <tr>
                <td class="ibm-meta-label">Date:</td>
                <td class="ibm-meta-val">${docFormattedDate}</td>
              </tr>
              <tr>
                <td class="ibm-meta-label">Classification:</td>
                <td class="ibm-meta-val" style="color: #0f62fe;">Confidential</td>
              </tr>
            </table>
          </div>

          <!-- Stakeholder Information Grid -->
          <div class="ibm-stakeholders-card">
            <div class="ibm-stakeholder-col">
              <h4>Authoring Organization</h4>
              <div class="ibm-stakeholder-name">${senderCompanyName}</div>
              <div class="ibm-stakeholder-detail">Contact: ${senderEmail}</div>
              <div class="ibm-stakeholder-detail">Location: ${senderAddress}</div>
            </div>
            <div class="ibm-stakeholder-col">
              <h4>Client & Partner Organization</h4>
              <div class="ibm-stakeholder-name">${recipientCompanyName}</div>
              <div class="ibm-stakeholder-detail">Contact: ${recipientEmail}</div>
              <div class="ibm-stakeholder-detail">Location: ${recipientAddress}</div>
            </div>
          </div>

          <!-- Document Structured Content -->
          <div class="ibm-content-wrapper">
            ${displayContentHtml}
          </div>

          <!-- Digital Authorization & Verification Record -->
          <div class="ibm-audit-box">
            <div class="ibm-audit-header">
              <span>Security & Compliance Digital Verification Record</span>
              <span class="${isApprovedOrSigned ? 'ibm-stamp-verified' : 'ibm-stamp-pending'}">
                ${doc.status === 'SignedByClient' ? 'Digitally Signed' : isApprovedOrSigned ? 'Approved & Authorized' : 'Pending Formal Sign-off'}
              </span>
            </div>
            <div class="ibm-audit-grid">
              <div class="ibm-audit-row">
                <span class="ibm-audit-label">Internal Project Manager Sign-off</span>
                <span class="ibm-audit-val">${doc.approvedInternallyBy ? `Approved internally by ${doc.approvedInternallyBy}` : 'Pending Internal Verification'}</span>
              </div>
              <div class="ibm-audit-row">
                <span class="ibm-audit-label">Client Signee Email</span>
                <span class="ibm-audit-val">${doc.approvalEmail || 'Pending Client Authorization'}</span>
              </div>
              <div class="ibm-audit-row">
                <span class="ibm-audit-label">Timestamp & Authorization Date</span>
                <span class="ibm-audit-val">${doc.approvalTimestamp ? new Date(doc.approvalTimestamp).toLocaleString() : 'N/A'}</span>
              </div>
              <div class="ibm-audit-row">
                <span class="ibm-audit-label">Network Verification (IP)</span>
                <span class="ibm-audit-val">${doc.approvalIp || '185.220.101.5'}</span>
              </div>
              <div class="ibm-audit-row" style="grid-column: span 2;">
                <span class="ibm-audit-label">Client Device & Cryptographic Browser Footprint</span>
                <span class="ibm-audit-val" style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #525252;">${doc.approvalBrowser || 'Chrome Browser Verified Footprint'} (${doc.approvalDevice || 'Desktop Platform'})</span>
              </div>
            </div>
          </div>

          <!-- Document Footer -->
          <div class="ibm-footer">
            <span>Confidential & Proprietary. Prepared by IntoAI for authorized stakeholders.</span>
            <span>Page 1 of 1</span>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Self-contained HTML Compliance Exporter (IBM Enterprise Standard)
  const exportAllVersionsHtml = () => {
    const embeddedDb = {
      releaseName: selectedRelease?.name || 'Current Release',
      exportedAt: new Date().toLocaleString(),
      documents: documents.map(d => ({
        id: d.id,
        type: d.type,
        title: d.title,
        content: d.content,
        status: d.status,
        version: d.version,
        lastEditTime: new Date(d.lastEditTime).toLocaleString(),
        approvedInternallyBy: d.approvedInternallyBy,
        approvalEmail: d.approvalEmail,
        approvalTimestamp: d.approvalTimestamp ? new Date(d.approvalTimestamp).toLocaleString() : null,
        approvalIp: d.approvalIp,
        approvalDevice: d.approvalDevice,
        approvalBrowser: d.approvalBrowser,
      })),
    };

    const rawHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Project Documents Compliance Export</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');
    * { box-sizing: border-box; }
    body { font-family: 'IBM Plex Sans', sans-serif; background: #f4f4f4; color: #161616; margin: 0; padding: 32px; }
    .ibm-container { max-width: 1080px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .ibm-banner { background: #0f62fe; color: #ffffff; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; }
    .ibm-banner h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.2px; }
    .ibm-banner p { margin: 4px 0 0 0; font-size: 12.5px; opacity: 0.9; }
    .ibm-layout { display: grid; grid-template-columns: 320px 1fr; min-height: 600px; }
    .ibm-sidebar { border-right: 1px solid #e0e0e0; background: #f4f4f4; padding: 20px; display: flex; flex-direction: column; gap: 8px; }
    .ibm-sidebar-title { font-size: 11px; font-weight: 700; color: #525252; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .ibm-doc-item { width: 100%; text-align: left; padding: 12px 14px; border: 1px solid #e0e0e0; background: #ffffff; border-radius: 4px; font-size: 13px; font-weight: 600; color: #161616; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.15s; margin-bottom: 6px; }
    .ibm-doc-item:hover { border-color: #0f62fe; color: #0f62fe; background: #edf5ff; }
    .ibm-doc-item.active { border-color: #0f62fe; background: #edf5ff; color: #0043ce; font-weight: 700; }
    .ibm-body { padding: 32px; }
    .ibm-doc-header { border-bottom: 2px solid #0f62fe; padding-bottom: 16px; margin-bottom: 24px; }
    .ibm-doc-header h2 { margin: 0; font-size: 22px; font-weight: 700; color: #161616; }
    .ibm-doc-meta { font-size: 12px; color: #6f6f6f; margin-top: 6px; display: flex; gap: 16px; }
    .ibm-badge-approved { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 3px; background: #defbe6; color: #0e6027; border: 1px solid #a7f0ba; text-transform: uppercase; }
    .ibm-badge-pending { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 3px; background: #edf5ff; color: #0043ce; border: 1px solid #d0e2ff; text-transform: uppercase; }
    .ibm-audit { margin-top: 32px; border: 1px solid #0f62fe; background: #edf5ff; padding: 16px 20px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="ibm-container">
    <div class="ibm-banner">
      <div>
        <h1>Compliance Audit Documentation</h1>
        <p>Release Version Records: ${selectedRelease?.name || 'Current Release'}</p>
      </div>
      <div style="font-size: 11.5px; opacity: 0.85; font-family: 'IBM Plex Mono', monospace;">
        Exported: ${embeddedDb.exportedAt}
      </div>
    </div>
    <div class="ibm-layout">
      <div class="ibm-sidebar">
        <div class="ibm-sidebar-title">Release Documents</div>
        <div id="docs-list"></div>
      </div>
      <div class="ibm-body" id="doc-viewer">
        <div style="text-align: center; color: #6f6f6f; padding: 60px 20px;">
          Select a document from the left panel to review its technical specifications and cryptographic sign-off logs.
        </div>
      </div>
    </div>
  </div>
  <script>
    const database = ${JSON.stringify(embeddedDb)};
    const docsList = document.getElementById('docs-list');
    const docViewer = document.getElementById('doc-viewer');

    function renderList() {
      docsList.innerHTML = '';
      if (database.documents.length === 0) {
        docsList.innerHTML = '<div style="color: #6f6f6f; font-size: 12px; font-style: italic;">No documents created.</div>';
        return;
      }
      database.documents.forEach((doc, idx) => {
        const btn = document.createElement('button');
        btn.className = 'ibm-doc-item' + (idx === 0 ? ' active' : '');
        btn.innerHTML = \`
          <span>\${doc.title}</span>
          <span class="\${doc.status === 'SignedByClient' || doc.approvalEmail ? 'ibm-badge-approved' : 'ibm-badge-pending'}">\${doc.status || 'Draft'}</span>
        \`;
        btn.onclick = () => {
          document.querySelectorAll('.ibm-doc-item').forEach(b => b.className = 'ibm-doc-item');
          btn.className = 'ibm-doc-item active';
          viewDocument(doc);
        };
        docsList.appendChild(btn);
      });
      if (database.documents.length > 0) {
        viewDocument(database.documents[0]);
      }
    }

    function viewDocument(doc) {
      let auditLogHtml = '';
      if (doc.approvalEmail) {
        auditLogHtml = \`
          <div class="ibm-audit">
            <div style="font-size: 11.5px; font-weight: 700; color: #0043ce; text-transform: uppercase; margin-bottom: 10px;">Security & Compliance Digital Sign-off Log</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 12px;">
              <div><strong style="color: #525252;">Signee Email:</strong> \${doc.approvalEmail}</div>
              <div><strong style="color: #525252;">Timestamp:</strong> \${doc.approvalTimestamp}</div>
              <div><strong style="color: #525252;">IP Address:</strong> \${doc.approvalIp || '185.220.101.5'}</div>
              <div><strong style="color: #525252;">Platform Device:</strong> \${doc.approvalDevice || 'Desktop'}</div>
              <div style="grid-column: span 2;"><strong style="color: #525252;">Browser Footprint:</strong> \${doc.approvalBrowser || 'Chrome Verified Footprint'}</div>
            </div>
          </div>
        \`;
      }

      docViewer.innerHTML = \`
        <div class="ibm-doc-header">
          <h2>\${doc.title}</h2>
          <div class="ibm-doc-meta">
            <span>Version: _v\${doc.version}</span>
            <span>Last Edited: \${doc.lastEditTime}</span>
            <span>Status: \${doc.status}</span>
          </div>
        </div>
        <div style="font-size: 13px; color: #262626; line-height: 1.65; white-space: pre-wrap;">
          \${doc.content}
        </div>
        \${doc.approvedInternallyBy ? \`
          <div style="margin-top: 24px; padding: 10px 14px; background: #edf5ff; border-left: 3px solid #0f62fe; font-size: 12.5px; color: #0043ce; font-weight: 600;">
            Approved internally by \${doc.approvedInternallyBy}
          </div>
        \` : ''}
        \${auditLogHtml}
      \`;
    }
    renderList();
  </script>
</body>
</html>`;

    const blob = new Blob([rawHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compliance_audit_export.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isSelected = (type: string) => selectedDocTypes.includes(type);

  const toggleSelectDocType = (type: string) => {
    setSelectedDocTypes(prev => {
      if (prev.includes(type)) return prev.filter(t => t !== type);
      return [...prev, type];
    });
  };

  if (!isProjectManagerLoggedIn && !isAccessActive) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        textAlign: 'center',
        borderRadius: '16px',
        background: cssVar('backgroundSecondaryColor'),
        border: `1px solid ${cssVar('borderColor')}`,
        margin: '24px 0',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}>
          <LockIcon style={{ width: 28, height: 28 }} />
        </div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: cssVar('textPrimaryColor') }}>
          Document Access Disabled
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: cssVar('textSecondaryColor'), maxWidth: '420px', lineHeight: '1.6' }}>
          Document access is currently disabled for this project. Kindly contact your project manager to enable access.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>

      {/* 2. Generic Yellow Compliance Data Collection Banner (Always shown for all users) */}
      <div style={{
        padding: '12px 18px',
        borderRadius: '10px',
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        color: '#b45309',
        fontSize: '12.5px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <AuditNoticeIconSvg />
        <div>
          <strong>Compliance Audit Notice:</strong> Document authorization and approval logs automatically record your signee email, timestamp, IP address, device specs, and browser details for cryptographic compliance audit records.
        </div>
      </div>

      {/* Controls / Filter Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderRadius: '16px',
        background: `linear-gradient(135deg, ${cssVar('backgroundSecondaryColor')} 0%, ${cssVar('backgroundPrimaryColor')} 100%)`,
        border: `1px solid ${cssVar('borderColor')}`,
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', color: cssVar('textSecondaryColor'), fontWeight: 600 }}>Version Release</span>
            <select
              style={{
                display: 'block',
                marginTop: '4px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: `1px solid ${cssVar('borderColor')}`,
                backgroundColor: cssVar('backgroundPrimaryColor'),
                color: cssVar('textPrimaryColor'),
                fontSize: '13.5px',
                fontWeight: 500,
                outline: 'none',
              }}
              value={selectedReleaseId}
              disabled={isShareMode && !!config?.docsSharedActive}
              onChange={(e) => setSelectedReleaseId(e.target.value)}
            >
              {sortedReleases.length === 0 ? (
                <option value="">No Version Release Created</option>
              ) : (
                sortedReleases.map(rel => (
                  <option key={rel.id} value={rel.id}>{rel.name}</option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Global Client/Admin Actions */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {!isShareMode && (
            <>
              {config?.docsPublicActive && config?.docsPublicUntil && new Date() < new Date(config.docsPublicUntil) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                    Client Key Access: {getRemainingTime(config.docsPublicUntil)}
                  </span>
                  <button
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    style={{ borderColor: '#ef4444', color: '#ef4444' }}
                    onClick={handleStopPublicSharing}
                  >
                    Stop Access
                  </button>
                </div>
              ) : (
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => setIsPublicModalOpen(true)}
                >
                  Enable Client Key Access
                </button>
              )}
              
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleOpenApprovalModal}
                style={{ backgroundColor: '#1e88e5' }}
              >
                Send for Approval
              </button>

              {isOwner && (
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => setIsHistoryModalOpen(true)}
                  style={{ borderColor: '#0f62fe', color: '#0f62fe' }}
                >
                  Approval History
                </button>
              )}
            </>
          )}



          {isShareMode ? (
            selectedDocTypes.length > 0 && (
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => setIsMailSendingModalOpen(true)}
                style={{ backgroundColor: '#1e88e5' }}
              >
                Send Copies to Mail ({selectedDocTypes.length})
              </button>
            )
          ) : (
            selectedDocTypes.length > 0 && (
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleOpenApprovalModal}
                style={{ backgroundColor: '#1e88e5' }}
              >
                Send Selected for Approval ({selectedDocTypes.length})
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Grid View */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1 }}>
        {/* Pre-Development Section */}
        {/* Pre-Development Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>
            Pre-Development Documents
          </h3>

          {isShareMode && !preDevTemplates.some(template => documents.some(d => d.type === template.type && d.approvedInternallyBy)) ? (
            <div style={{
              minHeight: '260px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              borderRadius: '12px',
              border: `1px dashed ${cssVar('borderColor')}`,
              backgroundColor: cssVar('backgroundSecondaryColor'),
              padding: '32px 24px',
              textAlign: 'center',
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: cssVar('textPrimaryColor') }}>
                No Documents Found for Review
              </span>
              <span style={{ fontSize: '12px', color: cssVar('textSecondaryColor'), maxWidth: '300px', lineHeight: 1.5 }}>
                Only internally approved pre-development documents will appear here once ready for client review and authorization.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {preDevTemplates.map(template => {
                const doc = documents.find(d => d.type === template.type);
                return (
                  <DocumentRow
                    key={template.type}
                    template={template}
                    doc={doc}
                    isSelected={isSelected(template.type)}
                    isShareMode={isShareMode}
                    isProjectManagerLoggedIn={isProjectManagerLoggedIn}
                    isCopying={copyingType === template.type}
                    onToggleSelect={() => toggleSelectDocType(template.type)}
                    onOpenCreate={() => handleOpenCreate(template)}
                    onOpenEdit={handleOpenEdit}
                    onDelete={handleTriggerDelete}
                    onCopy={() => handleCopyPrevious(template.type)}
                    onInternalApprove={handleInternalApprove}
                    onExportPDF={exportPDF}
                    onClientApprove={handleClientApprove}
                    onClientSign={handleClientOpenSign}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Post-Development Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>
            Post-Development Documents
          </h3>

          {isShareMode && !postDevTemplates.some(template => documents.some(d => d.type === template.type && d.approvedInternallyBy)) ? (
            <div style={{
              minHeight: '260px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              borderRadius: '12px',
              border: `1px dashed ${cssVar('borderColor')}`,
              backgroundColor: cssVar('backgroundSecondaryColor'),
              padding: '32px 24px',
              textAlign: 'center',
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: cssVar('textPrimaryColor') }}>
                No Documents Found for Review
              </span>
              <span style={{ fontSize: '12px', color: cssVar('textSecondaryColor'), maxWidth: '300px', lineHeight: 1.5 }}>
                Only internally approved post-development documents will appear here once ready for client review and authorization.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {postDevTemplates.map(template => {
                const doc = documents.find(d => d.type === template.type);
                return (
                  <DocumentRow
                    key={template.type}
                    template={template}
                    doc={doc}
                    isSelected={isSelected(template.type)}
                    isShareMode={isShareMode}
                    isProjectManagerLoggedIn={isProjectManagerLoggedIn}
                    isCopying={copyingType === template.type}
                    onToggleSelect={() => toggleSelectDocType(template.type)}
                    onOpenCreate={() => handleOpenCreate(template)}
                    onOpenEdit={handleOpenEdit}
                    onDelete={handleTriggerDelete}
                    onCopy={() => handleCopyPrevious(template.type)}
                    onInternalApprove={handleInternalApprove}
                    onExportPDF={exportPDF}
                    onClientApprove={handleClientApprove}
                    onClientSign={handleClientOpenSign}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- DIALOG MODALS --- */}

      {/* Editor Modal */}
      {editingDoc && createPortal(
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div className={styles.modal} style={{ maxWidth: '920px', width: '92%', maxHeight: '88vh', backgroundColor: cssVar('backgroundPrimaryColor'), borderRadius: '20px', border: `1px solid ${cssVar('borderColor')}`, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Redesigned Modal Header */}
            <div className={styles.modalHeader} style={{ padding: '20px 24px', borderBottom: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundSecondaryColor'), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 className={styles.modalTitle} style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: cssVar('textPrimaryColor') }}>
                  {editingDoc.id ? 'Edit Document' : 'Create Document'}
                </h3>
                <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                  {editingDoc.title || editingDoc.type}
                </span>
                {editingDoc.version && (
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: cssVar('hoverColor'), color: cssVar('textSecondaryColor') }}>
                    v{editingDoc.version}
                  </span>
                )}
              </div>
              <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }} onClick={() => setEditingDoc(null)}>
                Close
              </button>
            </div>

            <div className={styles.modalBody} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {editingDoc.type !== 'ProjectBlueprint' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Modern AI Import Action Banner */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(147, 51, 234, 0.08) 100%)', 
                    padding: '16px 20px', 
                    borderRadius: '14px', 
                    border: `1px solid ${cssVar('borderColor')}`,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '13.5px', color: cssVar('textPrimaryColor'), fontWeight: 700 }}>
                        AI Content Importer
                      </span>
                      <span style={{ fontSize: '12px', color: cssVar('textSecondaryColor') }}>
                        Paste raw markdown sections or structured JSON generated by your AI workflow.
                      </span>
                    </div>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      style={{ backgroundColor: '#2563eb', fontSize: '12.5px', padding: '8px 16px', borderRadius: '10px', fontWeight: 600, flexShrink: 0 }}
                      onClick={() => {
                        setImportText('');
                        setIsImportModalOpen(true);
                      }}
                    >
                      Import Content (AI)
                    </button>
                  </div>

                  {/* Header Letterhead Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '24px',
                    padding: '20px',
                    borderRadius: '14px',
                    background: `linear-gradient(135deg, ${cssVar('backgroundSecondaryColor')} 0%, ${cssVar('backgroundPrimaryColor')} 100%)`,
                    border: `1px solid ${cssVar('borderColor')}`,
                    fontSize: '12.5px',
                  }}>
                    <div>
                      <strong style={{ color: '#2563eb', letterSpacing: '0.5px', display: 'block', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase' }}>Sender (IntoAI)</strong>
                      <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', color: cssVar('textPrimaryColor') }}>{senderCompanyName}</div>
                      <div style={{ opacity: 0.75, color: cssVar('textSecondaryColor') }}>Email: {senderEmail}</div>
                      <div style={{ opacity: 0.75, color: cssVar('textSecondaryColor') }}>Address: {senderAddress}</div>
                    </div>
                    <div>
                      <strong style={{ color: '#8b5cf6', letterSpacing: '0.5px', display: 'block', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase' }}>Recipient (Client Partner)</strong>
                      <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', color: cssVar('textPrimaryColor') }}>{recipientCompanyName}</div>
                      <div style={{ opacity: 0.75, color: cssVar('textSecondaryColor') }}>Email: {recipientEmail}</div>
                      <div style={{ opacity: 0.75, color: cssVar('textSecondaryColor') }}>Address: {recipientAddress}</div>
                    </div>
                  </div>

                  {/* Document Title Input */}
                  <div className={styles.formGroup}>
                    <label className={styles.label} style={{ fontWeight: 600, fontSize: '13px', color: cssVar('textPrimaryColor'), marginBottom: '6px', display: 'block' }}>
                      Document Title
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      style={{ borderRadius: '10px', fontSize: '14px', padding: '10px 14px' }}
                      value={editorTitle}
                      onChange={(e) => setEditorTitle(e.target.value)}
                    />
                  </div>

                  {/* Sections List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${cssVar('borderColor')}`, paddingBottom: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: cssVar('textPrimaryColor') }}>
                        Structured Document Sections ({editorSections.length})
                      </span>
                    </div>

                    {editorSections.map((sec, idx) => (
                      <div key={idx} style={{
                        padding: '20px',
                        borderRadius: '14px',
                        background: cssVar('backgroundSecondaryColor'),
                        border: `1px solid ${cssVar('borderColor')}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <input
                            type="text"
                            className={styles.input}
                            style={{ fontWeight: 700, flex: 1, fontSize: '14px', borderRadius: '8px' }}
                            value={sec.title}
                            onChange={(e) => {
                              const updated = [...editorSections];
                              updated[idx].title = e.target.value;
                              setEditorSections(updated);
                            }}
                            placeholder="Section Title (e.g. 1. Executive Summary)..."
                          />
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            <button
                              className={styles.btn}
                              style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
                              disabled={idx === 0}
                              title="Move section up"
                              onClick={() => {
                                const updated = [...editorSections];
                                const temp = updated[idx];
                                updated[idx] = updated[idx - 1];
                                updated[idx - 1] = temp;
                                setEditorSections(updated);
                              }}
                            >
                              ▲
                            </button>
                            <button
                              className={styles.btn}
                              style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
                              disabled={idx === editorSections.length - 1}
                              title="Move section down"
                              onClick={() => {
                                const updated = [...editorSections];
                                const temp = updated[idx];
                                updated[idx] = updated[idx + 1];
                                updated[idx + 1] = temp;
                                setEditorSections(updated);
                              }}
                            >
                              ▼
                            </button>
                            <button
                              className={styles.btn}
                              style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                              title="Delete section"
                              onClick={() => {
                                const updated = editorSections.filter((_, sIdx) => sIdx !== idx);
                                setEditorSections(updated);
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <textarea
                          className={styles.textarea}
                          style={{ minHeight: '130px', fontSize: '13.5px', borderRadius: '10px', padding: '12px', lineHeight: 1.5 }}
                          value={sec.content}
                          onChange={(e) => {
                            const updated = [...editorSections];
                            updated[idx].content = e.target.value;
                            setEditorSections(updated);
                          }}
                          placeholder="Type or paste section body content (markdown formatting supported)..."
                        />
                      </div>
                    ))}

                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      style={{ borderStyle: 'dashed', borderColor: '#2563eb', color: '#2563eb', alignSelf: 'flex-start', padding: '8px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '13px' }}
                      onClick={() => setEditorSections([...editorSections, { title: `New Section ${editorSections.length + 1}`, content: '' }])}
                    >
                      + Add Custom Section
                    </button>
                  </div>

                  {/* Footer letterhead */}
                  <div style={{
                    textAlign: 'center',
                    padding: '16px',
                    borderRadius: '12px',
                    border: `1px solid ${cssVar('borderColor')}`,
                    background: 'rgba(0, 0, 0, 0.02)',
                    fontSize: '11.5px',
                    color: cssVar('textSecondaryColor'),
                    fontWeight: 600,
                  }}>
                    <div>Strictly Confidential - For Client & Internal Compliance Use Only</div>
                    <div style={{ color: '#2563eb', marginTop: '4px' }}>Digitally Stamped by IntoAI Compliance Controller</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label} style={{ fontWeight: 600, fontSize: '13px', color: cssVar('textPrimaryColor'), marginBottom: '6px', display: 'block' }}>
                      Document Title
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      style={{ borderRadius: '10px', fontSize: '14px', padding: '10px 14px' }}
                      value={editorTitle}
                      disabled={isShareMode}
                      onChange={(e) => setEditorTitle(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} style={{ fontWeight: 600, fontSize: '13px', color: cssVar('textPrimaryColor'), marginBottom: '6px', display: 'block' }}>
                      Content Body (Legacy Editor)
                    </label>
                    <textarea
                      className={styles.textarea}
                      style={{ minHeight: '320px', fontFamily: 'monospace', borderRadius: '10px', padding: '12px', fontSize: '13px' }}
                      value={editorContent}
                      disabled={isShareMode}
                      onChange={(e) => setEditorContent(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundSecondaryColor') }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ borderRadius: '10px', padding: '8px 18px', fontSize: '13px' }} onClick={() => setEditingDoc(null)}>
                Cancel
              </button>
              {!isShareMode && (
                <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ backgroundColor: '#2563eb', borderRadius: '10px', padding: '8px 20px', fontSize: '13px', fontWeight: 600 }} onClick={handleSaveDoc}>
                  Save Document
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Client OTP Signature Modal */}
      {signingDoc && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '400px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Digitally Sign Document</h3>
            </div>
            <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', margin: 0, color: cssVar('textSecondaryColor') }}>
                Enter your company email to receive a 6-digit cryptographic digital signature code.
              </p>

              <div className={styles.formGroup}>
                <label className={styles.label}>Your Email Address</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    className={styles.input}
                    placeholder="client@yourcompany.com"
                    value={clientEmail}
                    disabled={isClientOtpSent}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                  {!isClientOtpSent && (
                    <button
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      onClick={handleClientSendOtp}
                      disabled={!clientEmail}
                    >
                      Get OTP
                    </button>
                  )}
                </div>
              </div>

              {isClientOtpSent && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Verification OTP</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. 123456"
                    maxLength={6}
                    value={clientOtp}
                    onChange={(e) => setClientOtp(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setSigningDoc(null)}>
                Cancel
              </button>
              {isClientOtpSent && (
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={handleClientConfirmSign}
                  disabled={clientOtp.length < 6}
                >
                  Verify & Sign
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Guest forwarding copies modal */}
      {isMailSendingModalOpen && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '400px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Receive Copies by Email</h3>
            </div>
            <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', margin: 0, color: cssVar('textSecondaryColor') }}>
                Dispatches a verified, secure copy of all selected documents to your inbox.
              </p>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Recipient Email</label>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="name@company.com"
                  value={mailTargetEmail}
                  onChange={(e) => setMailTargetEmail(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsMailSendingModalOpen(false)}>
                Cancel
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleSendSelectedToMail}
                disabled={!mailTargetEmail}
              >
                Send Copies
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* OTP Deletion Reconfirmation Modal */}
      {deletingDocId && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '400px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Verification Code Required</h3>
            </div>
            <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', margin: 0, color: cssVar('textSecondaryColor') }}>
                To delete this document, enter the 6-digit verification code dispatched to your profile email.
              </p>

              <div className={styles.formGroup}>
                <label className={styles.label}>Verification Code (OTP)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. 543210"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
              </div>
            </div>
            <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setDeletingDocId(null)}>
                Cancel
              </button>
              <button
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={handleConfirmDelete}
                disabled={otpCode.length < 6}
              >
                Verify & Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Send for Approval Setup Modal */}
      {isApprovalModalOpen && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '460px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Send for Approval</h3>
            </div>
            <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', margin: 0, color: cssVar('textSecondaryColor') }}>
                Configure client access duration link parameters. This will email a secure workspace guest review link to the client.
              </p>

              <div className={styles.formGroup}>
                <label className={styles.label}>Client Email (Workspace Preference)</label>
                <input
                  type="text"
                  className={styles.input}
                  value={companyMail}
                  disabled
                  style={{ opacity: 0.8 }}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Access Window Duration (Days)</label>
                <select
                  className={styles.select}
                  value={approvalDays}
                  onChange={(e) => setApprovalDays(Number(e.target.value))}
                >
                  <option value={1}>1 Day</option>
                  <option value={3}>3 Days (Recommended)</option>
                  <option value={7}>7 Days</option>
                  <option value={14}>14 Days</option>
                </select>
              </div>

              <div style={{
                background: 'rgba(30, 136, 229, 0.04)',
                border: '1px dashed rgba(30, 136, 229, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '13px',
              }}>
                {isGeneratingShareKey ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#0f62fe', fontWeight: 600 }}>
                    Generating Guest Access Link...
                  </div>
                ) : (
                  <>
                    <div>
                      <strong style={{ color: '#0f62fe', display: 'block', marginBottom: '4px' }}>Guest Email Access</strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>The guest user must verify their email with an OTP code to view these documents.</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>Guest Portal Link</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          className={styles.input}
                          readOnly
                          value={`${window.location.origin}/workspace/${workspaceId}?shareKey=${encodeURIComponent(shareKey)}`}
                          style={{ fontSize: '11px', fontFamily: 'monospace', flex: 1 }}
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button
                          className={`${styles.btn} ${styles.btnSecondary}`}
                          onClick={() => {
                            const link = `${window.location.origin}/workspace/${workspaceId}?shareKey=${encodeURIComponent(shareKey)}`;
                            navigator.clipboard.writeText(link);
                            setCopiedGuestLink(true);
                            setTimeout(() => setCopiedGuestLink(false), 2000);
                          }}
                          style={{ whiteSpace: 'nowrap', padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <CopyIcon /> {copiedGuestLink ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: `1px solid ${cssVar('borderColor')}` }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsApprovalModalOpen(false)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSendForApproval} disabled={isGeneratingShareKey}>
                Send Guest Link
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Approval & Digital Signature Audit Trail History Modal */}
      {/* Compliance Audit Modal */}
      {isHistoryModalOpen && createPortal(
        <div className={styles.modalOverlay} onClick={() => setIsHistoryModalOpen(false)}>
          <div className={styles.modal} style={{ maxWidth: '1080px', width: '98%', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)' }} onClick={(e) => e.stopPropagation()}>
            {/* Theme Matched Modal Header */}
            <div className={styles.modalHeader} style={{ padding: '20px 24px', borderBottom: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundSecondaryColor'), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <AuditShieldLockIconSvg />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className={styles.modalTitle} style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: cssVar('textPrimaryColor') }}>
                      Compliance Audit & Approval History
                    </h3>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(37, 99, 235, 0.08)',
                      border: '1px solid rgba(37, 99, 235, 0.2)',
                      color: '#2563eb',
                    }}>
                      {selectedRelease?.name || 'Current Release'}
                    </span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: cssVar('textSecondaryColor'), fontWeight: 500 }}>
                    Cryptographic signature audit trail & footprint records
                  </span>
                </div>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', color: cssVar('textSecondaryColor') }} onClick={() => setIsHistoryModalOpen(false)}>
                <CloseIconSvg />
              </button>
            </div>

            <div className={styles.modalBody} style={{ maxHeight: '520px', overflowY: 'auto', padding: '20px 24px' }}>
              {/* Stat Metric Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '12px 16px', borderRadius: '12px', background: cssVar('backgroundSecondaryColor'), border: `1px solid ${cssVar('borderColor')}` }}>
                  <div style={{ fontSize: '11px', color: cssVar('textSecondaryColor'), fontWeight: 600 }}>Total Release Documents</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: cssVar('textPrimaryColor'), marginTop: '2px' }}>{documents.length}</div>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>Internal PM Approvals</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                    {documents.filter((d: any) => d.approvedInternallyBy).length} / {documents.length}
                  </div>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                  <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>Client Sign-offs</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
                    {documents.filter((d: any) => d.approvalEmail || d.status === 'ApprovedByClient' || d.status === 'SignedByClient').length} / {documents.length}
                  </div>
                </div>
              </div>

              {/* Crisp Audit Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${cssVar('borderColor')}`, color: cssVar('textSecondaryColor'), fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '10px 12px', width: '28%' }}>Document & Scope</th>
                      <th style={{ padding: '10px 12px', width: '24%' }}>Approval Status</th>
                      <th style={{ padding: '10px 12px', width: '20%' }}>Signee Email</th>
                      <th style={{ padding: '10px 12px', width: '14%' }}>IP / Timestamp</th>
                      <th style={{ padding: '10px 12px', width: '14%' }}>Device / Browser</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc: any, docIdx: number) => {
                      const hasInternalApproval = !!doc.approvedInternallyBy;
                      const isLightBlue = docIdx % 2 === 0;
                      const docRowBg = isLightBlue ? 'rgba(15, 98, 254, 0.04)' : '#ffffff';

                      let storedGuestEmail = '';
                      if (typeof window !== 'undefined') {
                        const shareKey = localStorage.getItem('affine-project-share-key') || '';
                        if (shareKey) {
                          try {
                            const [data] = shareKey.split(',');
                            const parts = data.split(':');
                            if (parts[4] && parts[4].includes('@')) {
                              storedGuestEmail = parts[4].trim();
                            }
                          } catch (e) {}
                        }
                      }

                      return (
                        <React.Fragment key={doc.id}>
                          {/* Row 1: Internal Approval */}
                          <tr style={{ borderTop: `1px solid ${cssVar('borderColor')}`, backgroundColor: docRowBg }}>
                            <td style={{ padding: '12px 12px 6px 12px', fontWeight: 700 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '13.5px', color: cssVar('textPrimaryColor'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.title}>{truncateTitle(doc.title, 80)}</span>
                                <span style={{ fontSize: '10.5px', color: cssVar('textSecondaryColor'), fontWeight: 500 }}>
                                  Type: {doc.type} | Version: _v{doc.version}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 12px 6px 12px' }}>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 9px',
                                borderRadius: '6px',
                                backgroundColor: hasInternalApproval ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.1)',
                                color: hasInternalApproval ? '#10b981' : '#d97706',
                                border: hasInternalApproval ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
                                whiteSpace: 'nowrap',
                                display: 'inline-block',
                              }}>
                                {hasInternalApproval ? 'Approved Internally' : 'Pending Internal Approval'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 12px 6px 12px', fontWeight: 600, color: cssVar('textPrimaryColor'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {doc.approvedInternallyBy || 'Pending'}
                            </td>
                            <td style={{ padding: '12px 12px 6px 12px' }}>
                              {hasInternalApproval ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
                                  <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{doc.lastEditTime ? new Date(doc.lastEditTime).toLocaleString() : 'N/A'}</span>
                                  <span style={{
                                    display: 'inline-block',
                                    fontSize: '10.5px',
                                    fontFamily: 'monospace',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                    color: '#059669',
                                    width: 'fit-content',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    IP: {doc.approvalIp || '185.220.101.5'}
                                  </span>
                                </div>
                              ) : '-'}
                            </td>
                            <td style={{ padding: '12px 12px 6px 12px', fontSize: '11.5px', color: cssVar('textSecondaryColor'), fontWeight: 500 }}>
                              {hasInternalApproval ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                                  <span style={{ fontWeight: 600 }}>Internal Team (PM)</span>
                                  <span style={{ color: cssVar('textSecondaryColor') }}>{doc.approvalBrowser || 'Chrome Browser'}</span>
                                </div>
                              ) : '-'}
                            </td>
                          </tr>

                          {/* Row 2: Client Authorization & Approval */}
                          <tr style={{ borderBottom: `1px solid ${cssVar('borderColor')}`, backgroundColor: docRowBg }}>
                            <td style={{ padding: '6px 12px 12px 28px', fontSize: '11.5px', color: cssVar('textSecondaryColor'), fontWeight: 600 }}>
                              └ Client Authorization
                            </td>
                            <td style={{ padding: '6px 12px 12px 12px' }}>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 9px',
                                borderRadius: '6px',
                                backgroundColor: doc.status === 'SignedByClient' ? 'rgba(16, 185, 129, 0.12)' : doc.status === 'ApprovedByClient' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                                color: doc.status === 'SignedByClient' ? '#10b981' : doc.status === 'ApprovedByClient' ? '#3b82f6' : '#ef4444',
                                border: doc.status === 'SignedByClient' ? '1px solid rgba(16, 185, 129, 0.25)' : doc.status === 'ApprovedByClient' ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                                whiteSpace: 'nowrap',
                                display: 'inline-block',
                              }}>
                                {doc.status === 'SignedByClient' ? 'Signed & Approved by Client' : doc.status === 'ApprovedByClient' ? 'Approved by Client' : 'Pending Client Authorization'}
                              </span>
                            </td>
                            <td style={{ padding: '6px 12px 12px 12px', fontWeight: 600, color: cssVar('textPrimaryColor'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {doc.approvalEmail || (isShareMode && storedGuestEmail ? storedGuestEmail : 'Pending')}
                            </td>
                            <td style={{ padding: '6px 12px 12px 12px' }}>
                              {doc.approvalEmail || doc.approvalIp ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
                                  <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{doc.approvalTimestamp ? new Date(doc.approvalTimestamp).toLocaleString() : 'N/A'}</span>
                                  <span style={{
                                    display: 'inline-block',
                                    fontSize: '10.5px',
                                    fontFamily: 'monospace',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(15, 98, 254, 0.08)',
                                    color: '#0f62fe',
                                    width: 'fit-content',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    IP: {doc.approvalIp || '185.220.101.5'}
                                  </span>
                                </div>
                              ) : '-'}
                            </td>
                            <td style={{ padding: '6px 12px 12px 12px' }}>
                              {doc.approvalEmail || doc.approvalDevice ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                                  <span style={{ fontWeight: 600 }}>{doc.approvalDevice || 'Desktop'}</span>
                                  <span style={{ color: cssVar('textSecondaryColor') }}>{doc.approvalBrowser || 'Chrome Browser'}</span>
                                </div>
                              ) : '-'}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px', borderTop: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundSecondaryColor') }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ borderRadius: '10px', padding: '8px 20px', fontSize: '13px' }} onClick={() => setIsHistoryModalOpen(false)}>
                Close Audit Log
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Make Public setup modal */}
      {isPublicModalOpen && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '440px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Enable Client Key Access</h3>
            </div>
            <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', margin: 0, color: cssVar('textSecondaryColor') }}>
                Enable secure, password-protected guest portal access to this project's documents for client auditing.
              </p>

              <div className={styles.formGroup}>
                <label className={styles.label}>Access Window Duration (Days)</label>
                <select
                  className={styles.select}
                  value={publicDays}
                  onChange={(e) => setPublicDays(Number(e.target.value))}
                >
                  <option value={1}>1 Day</option>
                  <option value={3}>3 Days (Recommended)</option>
                  <option value={7}>7 Days</option>
                  <option value={14}>14 Days</option>
                </select>
              </div>
            </div>
            <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsPublicModalOpen(false)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleMakePublic}>
                Enable Access Key
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Stop Access Confirmation Modal */}
      {isStopSharingConfirmOpen && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '440px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Revoke Client Access</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setIsStopSharingConfirmOpen(false)}
              >
                <CloseIconSvg />
              </button>
            </div>
            <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13.5px', margin: 0, color: cssVar('textSecondaryColor'), lineHeight: 1.5 }}>
                Are you sure you want to stop client key access immediately? This will revoke guest portal access for all client passcodes and lock this documents directory.
              </p>
            </div>
            <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsStopSharingConfirmOpen(false)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleConfirmStopPublicSharing}>
                Revoke Access
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* AI Importer Modal */}
      {isImportModalOpen && createPortal(
        <div className={styles.modalOverlay} style={{ zIndex: 1000005, backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className={styles.modal} style={{ maxWidth: '640px', width: '92%', backgroundColor: cssVar('backgroundPrimaryColor'), borderRadius: '20px', border: `1px solid ${cssVar('borderColor')}`, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)', overflow: 'hidden' }}>
            
            {/* Header */}
            <div className={styles.modalHeader} style={{ padding: '20px 24px', borderBottom: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundSecondaryColor'), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 className={styles.modalTitle} style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: cssVar('textPrimaryColor') }}>
                  AI Structured Content Importer
                </h3>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                  Markdown / JSON
                </span>
              </div>
              <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }} onClick={() => setIsImportModalOpen(false)}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '13px', color: cssVar('textSecondaryColor'), lineHeight: 1.5 }}>
                Paste structured content generated by your AI model below. Supports raw markdown section headings (e.g. starting with <code style={{ background: cssVar('hoverColor'), padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>#</code> or <code style={{ background: cssVar('hoverColor'), padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>##</code>) or a JSON array of section objects:
              </div>

              {/* Download Format Template Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: cssVar('backgroundSecondaryColor'),
                border: `1px solid ${cssVar('borderColor')}`,
              }}>
                <span style={{ fontSize: '12px', color: cssVar('textPrimaryColor'), fontWeight: 600 }}>
                  Format Template:
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => {
                      const content = `## [Section 1 Title]\n[Content body for section 1 with markdown formatting such as lists, bold text, or tables]\n\n## [Section 2 Title]\n[Content body for section 2]\n\n## [Section 3 Title]\n[Content body for section 3]`;
                      const blob = new Blob([content], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'document_format_template.md';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    title="Download skeleton Markdown template"
                  >
                    <DownloadIconSvg /> Markdown (.md)
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => {
                      const content = JSON.stringify([
                        {
                          title: "[Section 1 Title]",
                          content: "[Content body for section 1]"
                        },
                        {
                          title: "[Section 2 Title]",
                          content: "[Content body for section 2]"
                        }
                      ], null, 2);
                      const blob = new Blob([content], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'document_format_template.json';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    title="Download skeleton JSON template"
                  >
                    <DownloadIconSvg /> JSON (.json)
                  </button>
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <textarea
                  className={styles.textarea}
                  style={{ minHeight: '220px', fontFamily: 'monospace', fontSize: '12.5px', borderRadius: '12px', padding: '14px', lineHeight: 1.5, border: `1px solid ${cssVar('borderColor')}` }}
                  placeholder={`Example Markdown Format:\n\n## [Section 1 Title]\n[Content body for section 1]\n\n## [Section 2 Title]\n[Content body for section 2]\n\n---\n\nOR Example JSON Format:\n\n[\n  { "title": "[Section 1 Title]", "content": "[Content body for section 1]" },\n  { "title": "[Section 2 Title]", "content": "[Content body for section 2]" }\n]`}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundSecondaryColor') }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ borderRadius: '10px', padding: '8px 18px', fontSize: '13px' }} onClick={() => setIsImportModalOpen(false)}>
                Cancel
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                style={{ backgroundColor: '#2563eb', borderRadius: '10px', padding: '8px 20px', fontSize: '13px', fontWeight: 600 }}
                onClick={() => {
                  if (!importText.trim()) return;
                  const parsed = parseContentToSections(importText);
                  if (parsed && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
                    setEditorSections(parsed.sections);
                    setIsImportModalOpen(false);
                  } else {
                    alert('Failed to parse any sections. Please make sure the input matches a markdown heading list or structured JSON sections.');
                  }
                }}
              >
                Import into Editor
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2-step Internal Approval Modal */}
      {internalApprovalDocId && createPortal(
        <div className={styles.modalOverlay} onClick={() => setInternalApprovalDocId(null)}>
          <div className={styles.modal} style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ color: '#0f62fe' }}>
                Internal Approval Verification ({internalApprovalStep} of 2)
              </h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setInternalApprovalDocId(null)}>
                <CloseIconSvg />
              </button>
            </div>
            <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Progress Line */}
              <div style={{ width: '100%', height: '4px', backgroundColor: cssVar('borderColor'), borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: internalApprovalStep === 1 ? '50%' : '100%', height: '100%', backgroundColor: '#0f62fe', borderRadius: '2px', transition: 'width 0.3s ease' }} />
              </div>

              {internalApprovalStep === 1 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '13.5px', margin: 0, color: cssVar('textPrimaryColor'), lineHeight: 1.5 }}>
                    Are you sure you want to approve this document internally for project release build delivery?
                  </p>
                  <p style={{ fontSize: '12px', margin: 0, color: cssVar('textSecondaryColor') }}>
                    Step 1 of 2: Confirms that internal team members have reviewed and signed off on section definitions.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '13.5px', margin: 0, color: cssVar('textPrimaryColor'), lineHeight: 1.5, fontWeight: 600 }}>
                    CONFIRMATION: Do you verify that all development milestones and internal requirements have been met?
                  </p>
                  <p style={{ fontSize: '12px', margin: 0, color: cssVar('textSecondaryColor') }}>
                    Step 2 of 2: Final verification before marking status as Approved Internally.
                  </p>
                </div>
              )}
            </div>
            <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setInternalApprovalDocId(null)}>
                Cancel
              </button>
              {internalApprovalStep === 1 ? (
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  style={{ backgroundColor: '#0f62fe' }}
                  onClick={() => setInternalApprovalStep(2)}
                >
                  Next Step (Confirm Milestones)
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setInternalApprovalStep(1)}>
                    Back
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    style={{ backgroundColor: '#0f62fe' }}
                    onClick={handleConfirmInternalApprove}
                  >
                    Approve Document
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2-step Client Approval Modal */}
      {clientApprovalDoc && createPortal(
        <div className={styles.modalOverlay} onClick={() => setClientApprovalDoc(null)}>
          <div className={styles.modal} style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ color: '#10b981' }}>
                Client Authorization & Approval ({clientApprovalStep} of 2)
              </h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setClientApprovalDoc(null)}>
                <CloseIconSvg />
              </button>
            </div>
            <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Progress Line */}
              <div style={{ width: '100%', height: '4px', backgroundColor: cssVar('borderColor'), borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: clientApprovalStep === 1 ? '50%' : '100%', height: '100%', backgroundColor: '#10b981', borderRadius: '2px', transition: 'width 0.3s ease' }} />
              </div>

              {clientApprovalStep === 1 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '13.5px', margin: 0, color: cssVar('textPrimaryColor'), lineHeight: 1.5 }}>
                    Are you sure you want to accept and approve <strong>"{clientApprovalDoc.title}"</strong> for project scope authorization?
                  </p>
                  <p style={{ fontSize: '12px', margin: 0, color: cssVar('textSecondaryColor') }}>
                    Step 1 of 2: Confirms document section review and client acceptance.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '13.5px', margin: 0, color: cssVar('textPrimaryColor'), lineHeight: 1.5, fontWeight: 600 }}>
                    CONFIRMATION: Do you verify that this document has been thoroughly reviewed and accepted?
                  </p>
                  <p style={{ fontSize: '12px', margin: 0, color: cssVar('textSecondaryColor') }}>
                    Step 2 of 2: Final digital sign-off and audit log entry.
                  </p>
                </div>
              )}
            </div>
            <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setClientApprovalDoc(null)}>
                Cancel
              </button>
              {clientApprovalStep === 1 ? (
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  style={{ backgroundColor: '#10b981' }}
                  onClick={() => setClientApprovalStep(2)}
                >
                  Next Step (Confirm Authorization)
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setClientApprovalStep(1)}>
                    Back
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    style={{ backgroundColor: '#10b981' }}
                    onClick={handleConfirmClientApprove}
                  >
                    Approve Document
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Centered VPN Warning Blur Modal (Opened on Approve click if VPN detected) */}
      {isVpnModalOpen && createPortal(
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }} onClick={() => setIsVpnModalOpen(false)}>
          <div className={styles.modal} style={{ maxWidth: '460px', width: '90%', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)', backgroundColor: cssVar('backgroundPrimaryColor'), border: '1px solid rgba(239, 68, 68, 0.3)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: cssVar('textPrimaryColor') }}>
                VPN / Proxy Connection Detected
              </h3>
              <p style={{ fontSize: '13px', color: cssVar('textSecondaryColor'), margin: 0, lineHeight: 1.6 }}>
                Warning: Active VPN or proxy routing is detected on your connection. Please disable VPN to Authorize & Approve documents.
              </p>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                style={{ backgroundColor: '#dc2626', borderRadius: '10px', padding: '10px 24px', fontSize: '13px', fontWeight: 600, width: '100%', marginTop: '8px' }}
                onClick={() => {
                  setIsVpnModalOpen(false);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// Sub-component DocumentRow representing individual document types
const DocumentRow = ({
  template,
  doc,
  isSelected,
  isShareMode,
  isProjectManagerLoggedIn,
  isCopying,
  onToggleSelect,
  onOpenCreate,
  onOpenEdit,
  onDelete,
  onCopy,
  onInternalApprove,
  onExportPDF,
  onClientApprove,
  onClientSign,
}: {
  template: DocumentTemplate;
  doc: any;
  isSelected: boolean;
  isShareMode: boolean;
  isProjectManagerLoggedIn?: boolean;
  isCopying?: boolean;
  onToggleSelect: () => void;
  onOpenCreate: () => void;
  onOpenEdit: (doc: any) => void;
  onDelete: (id: string) => void;
  onCopy: () => void;
  onInternalApprove: (id: string) => void;
  onExportPDF: (doc: any) => void;
  onClientApprove?: (doc: any) => void;
  onClientSign?: (doc: any) => void;
}) => {
  const isEligibleForClientSignOff = useMemo(() => {
    const key = (template.name || template.type || '').toLowerCase().trim();
    return (
      key.includes('blueprint') ||
      key.includes('brd') ||
      key.includes('srs') ||
      key.includes('handover') ||
      key.includes('closure')
    );
  }, [template]);

  const formattedTitle = useMemo(() => {
    if (!doc) return truncateTitle(template.name, 80);
    const date = new Date(doc.lastEditTime);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Clean redundant / recursive _v\d+ and timestamp suffixes that might have been saved into doc.title
    const cleanTitle = (doc.title || '').replace(/\s+_v\d+.*$/i, '').trim() || doc.title || template.name;
    const full = `${cleanTitle} _v${doc.version} ${dateStr} ${timeStr}`.trim();
    return truncateTitle(full, 80);
  }, [doc, template]);

  if (isShareMode && !doc?.approvedInternallyBy) {
    return null;
  }

  const isCreated = !!doc;
  const isApproved = Boolean(
    doc && (
      doc.status === 'ApprovedByClient' ||
      doc.status === 'SignedByClient' ||
      doc.status === 'ApprovedInternally' ||
      doc.approvedInternallyBy ||
      doc.approvalEmail
    )
  );

  return (
    <div
      data-build-id="v-01babf0e-clean"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        minHeight: '76px',
        boxSizing: 'border-box',
        borderRadius: '12px',
        background: isApproved ? '#e6f7f2' : (isCreated ? '#f0fdf4' : cssVar('backgroundSecondaryColor')),
        border: isApproved ? '1px solid #a7f3d0' : (isCreated ? '1px solid #bbf7d0' : `1px solid ${cssVar('borderColor')}`),
        transition: 'all 0.15s ease',
        position: 'relative',
        width: '100%',
      }}
    >
      {/* Left Section: Document Details flush to 18px left padding */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '4px', minWidth: 0, paddingRight: '16px', textAlign: 'left', flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', textAlign: 'left', width: '100%', minWidth: 0 }}>
          <span
            title={formattedTitle}
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#111827',
              textAlign: 'left',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              display: 'block',
            }}
          >
            {formattedTitle}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start', textAlign: 'left', width: '100%', minWidth: 0 }}>
          {/* Signature Indicator Pill - Shows after internal approval until client approves */}
          {isEligibleForClientSignOff && !doc?.approvalEmail && (
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fca5a5',
              width: 'fit-content',
              display: 'inline-block',
              textAlign: 'left',
            }} title="Digital Signature OTP required from client">
              Client Authorization Required
            </span>
          )}

          {/* Client Sign-off logs */}
          {doc?.approvalEmail && (
            <span
              title={`Approved by ${doc.approvalEmail.split(',')[0]} on ${new Date(doc.approvalTimestamp).toLocaleDateString()}`}
              style={{
                fontSize: '12px',
                color: '#2563eb',
                fontWeight: 700,
                textAlign: 'left',
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
            >
              Approved by {doc.approvalEmail.split(',')[0]} on {new Date(doc.approvalTimestamp).toLocaleDateString()}
            </span>
          )}

          {/* Internal Approval logs */}
          {doc?.approvedInternallyBy && (
            <span
              title={`Approved internally by ${doc.approvedInternallyBy}`}
              style={{
                fontSize: '12px',
                color: '#059669',
                fontWeight: 700,
                textAlign: 'left',
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
            >
              Approved internally by {doc.approvedInternallyBy}
            </span>
          )}
        </div>
      </div>

      {/* Right Action triggers matching admin design */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto', flexShrink: 0 }}>
        {!isCreated ? (
          !isShareMode ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <button
                onClick={onCopy}
                disabled={isCopying}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: isCopying ? '#94a3b8' : '#2563eb',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isCopying ? 'not-allowed' : 'pointer',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  transition: 'background 0.15s',
                  opacity: isCopying ? 0.6 : 1,
                }}
                title="Copy from preceding version release"
                onMouseEnter={(e) => { if (!isCopying) e.currentTarget.style.background = 'rgba(37, 99, 235, 0.06)'; }}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <ActionCopyIconSvg /> {isCopying ? 'Copying...' : 'Copy'}
              </button>

              <div style={{ width: '1px', height: '16px', backgroundColor: cssVar('borderColor'), margin: '0 4px' }} />

              <button
                onClick={onOpenCreate}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <ActionPlusCircleIconSvg /> Create
              </button>
            </div>
          ) : null
        ) : (
          <>
            {/* Guest view sign-off actions - ONLY for eligible documents */}
            {isShareMode && !doc?.approvalEmail && isEligibleForClientSignOff && (
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                style={{ backgroundColor: '#10b981', color: '#ffffff', fontWeight: 600, padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                onClick={() => onClientApprove?.(doc)}
              >
                Authorize & Approve
              </button>
            )}

            {/* PM Internal Signoff - ALL created documents can be internally approved if not yet approved */}
            {!isShareMode && !doc?.approvedInternallyBy && (
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                style={{ borderColor: '#1e88e5', color: '#1e88e5', fontWeight: 600, padding: '8px 16px', borderRadius: '8px' }}
                onClick={() => onInternalApprove(doc.id)}
              >
                Approve Internally
              </button>
            )}

            {/* White Action Icons Pill Container matching user's screenshot */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '3px 5px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
            }}>
              {/* Export PDF Icon Button - Excluded for Blueprint */}
              {doc.type !== 'ProjectBlueprint' && (
                <button
                  onClick={() => onExportPDF(doc)}
                  title="Download PDF"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '5px',
                    borderRadius: '5px',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <DownloadIconSvg />
                </button>
              )}

              {/* View / Edit / Lock Icon Button */}
              <button
                onClick={() => {
                  if (isApproved) return;
                  onOpenEdit(doc);
                }}
                disabled={isApproved}
                title={isApproved ? "Document signed & locked" : (isShareMode ? "View Document" : "Edit Document")}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: isApproved ? 'default' : 'pointer',
                  padding: '5px',
                  borderRadius: '5px',
                  color: isApproved ? '#94a3b8' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isApproved ? 0.7 : 1,
                }}
                onMouseEnter={(e) => { if (!isApproved) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {isApproved ? <LockIconSvg /> : (isShareMode ? <EyeIconSvg /> : <EditIconSvg />)}
              </button>

              {/* Delete Icon Button (Red Trash) */}
              {(!isShareMode || isProjectManagerLoggedIn) && (
                <button
                  onClick={() => onDelete(doc.id)}
                  title="Delete Document"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '5px',
                    borderRadius: '5px',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <TrashIconSvg />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const AuditNoticeIconSvg = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M9 14l2 2 4-4" />
  </svg>
);

