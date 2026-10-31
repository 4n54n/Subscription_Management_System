import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { cssVar } from '@toeverything/theme';
import { toast } from '@affine/component';
import { useQuery } from '@affine/core/components/hooks/use-query';
import { useMutation } from '@affine/core/components/hooks/use-mutation';
import {
  projectDocumentsQuery,
  upsertProjectDocumentMutation,
  projectIssuesQuery,
  createProjectIssueMutation,
  updateProjectIssueMutation,
  projectCyclesQuery,
  projectModulesQuery,
  getMembersByWorkspaceIdQuery,
} from '@affine/graphql';
import { useBlueprintCopilotSync } from '../../../components/copilot/use-copilot-sync';
import { CloseIcon } from '@blocksuite/icons/rc';

import * as styles from './styles.css';

// SVG Icons (Tabler Theme)
const CloseIconSvg = () => <CloseIcon style={{ width: 16, height: 16 }} />;

// Type Definitions
export interface ElementStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  borderWidth?: number;
  textColor?: string;
  fontSize?: number;

  // Type-specific options
  role?: 'agent' | 'tool' | 'router' | 'input' | 'output'; // For nodes
  status?: 'backlog' | 'todo' | 'inprogress' | 'inreview' | 'testing' | 'done' | 'unassigned'; // For nodes
  nodeKey?: string; // For nodes (python key)
  containerHeaderColor?: string; // For container title area
}

export interface DiagramElement {
  id: string;
  type: 'node' | 'container' | 'group';
  parentId: string | null;
  position: { x: number; y: number };
  size: { width: number; height: number };
  label: string;
  description?: string;
  tags: string[];
  style: ElementStyle;
  issueId?: string; // Work item integration
}

export interface DiagramConnection {
  id: string;
  source: string;
  target: string;
  label?: string;
  edgeType?: 'standard' | 'conditional';
  fromNodeKey?: string;
  toNodeKey?: string;
}

export interface DiagramDataV2 {
  version: '2.0';
  elements: DiagramElement[];
  connections: DiagramConnection[];
}

// Helper to generate a Python-safe variable/function name
const toPythonKey = (label: string): string => {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_') // Replace non-alphanumeric/non-underscore characters with _
    .replace(/_+/g, '_')          // Collapse multiple underscores
    .replace(/^_+|_+$/g, '');     // Strip leading/trailing underscores
};

const generateLangGraphCode = (elements: DiagramElement[], connections: DiagramConnection[]): string => {
  const nodes = elements.filter(e => e.type === 'node');
  if (nodes.length === 0) {
    return `# Create nodes in the canvas to generate LangGraph code!`;
  }

  let code = `"""
Auto-generated LangGraph Workflow Specification
Generated from Project Blueprint canvas.
"""

from typing import TypedDict, Annotated, Sequence, Union, Dict, Any
import operator
from langchain_core.messages import BaseMessage
from langgraph.graph import StateGraph, END

# 1. Define the workflow state schema
class GraphState(TypedDict):
    """
    Represents the shared state of the LangGraph workflow.
    Add or customize state parameters as needed for your application.
    """
    messages: Annotated[Sequence[BaseMessage], operator.add]
    next_node: str
    context: Dict[str, Any]
    error_occurred: bool

`;

  // 2. Define Node execution steps
  code += `# 2. Define workflow nodes (agents, tools, routers, inputs, outputs)\n`;
  nodes.forEach(node => {
    const key = node.style.nodeKey || toPythonKey(node.label);
    const desc = node.description ? `    # ${node.description}\n` : '';
    const nodeRole = node.style.role || 'agent';
    const nodeStatus = node.style.status || 'todo';
    code += `def ${key}(state: GraphState) -> Dict[str, Any]:
    """
    Executes the "${node.label}" step (${nodeRole.toUpperCase()}).
    Workflow Status: ${nodeStatus.toUpperCase()}
    Compliance Tags: ${node.tags.length > 0 ? node.tags.join(', ') : 'None'}
    """
    print(f"--- EXECUTING NODE: ${key} (${node.label}) ---")
${desc}    # TODO: Implement custom LLM prompt/tool logic here
    return {
        "messages": [f"Executed ${node.label} step."],
        "next_node": "${key}"
    }

`;
  });

  // 3. Conditional routers if any
  // Let's identify nodes that have multiple outgoing edges or are routers with conditional edges
  const routerNodes = nodes.filter(n => {
    const outgoing = connections.filter(c => c.source === n.id);
    return outgoing.length > 1 || outgoing.some(c => c.edgeType === 'conditional') || n.style.role === 'router';
  });

  if (routerNodes.length > 0) {
    code += `# 3. Define router / decision functions for conditional routing\n`;
    routerNodes.forEach(node => {
      const key = node.style.nodeKey || toPythonKey(node.label);
      const outgoing = connections.filter(c => c.source === node.id);

      code += `def route_from_${key}(state: GraphState) -> str:
    """
    Decision router for the "${node.label}" step.
    Determines next state route based on LLM response or state conditions.
    """
    messages = state.get("messages", [])
    last_message = messages[-1] if messages else None
    
    # Custom routing evaluation logic goes here
    # Example: Check if the last output contains specific keys or success state
    `;
      if (outgoing.length > 0) {
        outgoing.forEach((edge, idx) => {
          const toNode = nodes.find(n => n.id === edge.target);
          const toKey = toNode ? (toNode.style.nodeKey || toPythonKey(toNode.label)) : 'END';
          const condition = edge.label ? edge.label.toLowerCase() : `condition_${idx}`;
          code += `    if "${condition}" in str(last_message):
        return "${toKey}"
`;
        });
        const firstTargetNode = nodes.find(n => n.id === outgoing[0].target);
        const defaultTarget = firstTargetNode ? (firstTargetNode.style.nodeKey || toPythonKey(firstTargetNode.label)) : 'END';
        code += `    return "${defaultTarget}"  # Default route\n\n`;
      } else {
        code += `    return END  # Default to workflow finish\n\n`;
      }
    });
  }

  // 4. Initialize and compile graph
  code += `# 4. Initialize LangGraph Workflow State Graph\n`;
  code += `workflow = StateGraph(GraphState)\n\n`;

  code += `# 5. Add all nodes to graph\n`;
  nodes.forEach(node => {
    const key = node.style.nodeKey || toPythonKey(node.label);
    code += `workflow.add_node("${key}", ${key})\n`;
  });
  code += `\n`;

  // 6. Set entry point
  // Find node with 'input' role, or first node with no incoming edges, or fallback to first node
  const inputNode = nodes.find(n => n.style.role === 'input') ||
    nodes.find(n => !connections.some(c => c.target === n.id)) ||
    nodes[0];
  const entryKey = inputNode ? (inputNode.style.nodeKey || toPythonKey(inputNode.label)) : 'start';
  code += `# 6. Set Entry Point\n`;
  code += `workflow.set_entry_point("${entryKey}")\n\n`;

  // 7. Add edges
  code += `# 7. Add Connections & Routers\n`;

  // Group edges by 'from' node
  const processedFromNodeIds = new Set<string>();

  connections.forEach(edge => {
    const fromNode = nodes.find(n => n.id === edge.source);
    if (!fromNode) return;

    // If we already processed this node as a router, skip standard processing
    if (processedFromNodeIds.has(fromNode.id)) return;

    const fromKey = fromNode.style.nodeKey || toPythonKey(fromNode.label);
    const outgoing = connections.filter(c => c.source === fromNode.id);

    if (outgoing.length === 1 && outgoing[0].edgeType !== 'conditional' && fromNode.style.role !== 'router') {
      const toNode = nodes.find(n => n.id === outgoing[0].target);
      if (toNode) {
        const toKey = toNode.style.nodeKey || toPythonKey(toNode.label);
        code += `workflow.add_edge("${fromKey}", "${toKey}")\n`;
      }
    } else {
      // Router edge mapping (either explicit conditional type or multiple targets)
      processedFromNodeIds.add(fromNode.id);
      const routeMap: string[] = [];
      outgoing.forEach((e, idx) => {
        const toNode = nodes.find(n => n.id === e.target);
        const toKey = toNode ? (toNode.style.nodeKey || toPythonKey(toNode.label)) : 'END';
        const label = e.label ? e.label.replace(/[^a-zA-Z0-9_]/g, '_') : `route_${idx}`;
        routeMap.push(`    "${label}": "${toKey}"`);
      });
      // Include fallback to END if needed
      routeMap.push(`    "end": END`);

      code += `workflow.add_conditional_edges(
    "${fromKey}",
    route_from_${fromKey},
    {
${routeMap.join(',\n')}
    }
)\n`;
    }
  });

  // Finish workflow
  code += `\n# 8. Compile Graph to Runnable Workflows\n`;
  code += `app = workflow.compile()\n`;
  code += `print("LangGraph Workflow Compiled Successfully!")\n`;

  return code;
};

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  unassigned: { bg: '#f8fafc', border: '#cbd5e1', text: '#64748b' },
  backlog: { bg: '#f1f5f9', border: '#cbd5e1', text: '#64748b' },
  todo: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' },
  inprogress: { bg: '#fffbeb', border: '#fde68a', text: '#d97706' },
  inreview: { bg: '#faf5ff', border: '#e9d5ff', text: '#7c3aed' },
  testing: { bg: '#fdf2f8', border: '#fbcfe8', text: '#db2777' },
  done: { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669' },
};

// Helper to find recursive descendants
const findDescendantsRecursive = (parentId: string, allElements: DiagramElement[]): string[] => {
  const children = allElements.filter(e => e.parentId === parentId);
  return [
    ...children.map(c => c.id),
    ...children.flatMap(c => findDescendantsRecursive(c.id, allElements))
  ];
};

// Helper to check if an element is administrative/governance
const isAdministrativeElement = (el: DiagramElement): boolean => {
  const checkText = (text: string) => {
    const t = text.toLowerCase();
    return t.includes('admin') || t.includes('backoffice') || t.includes('governance') ||
      t.includes('management') || t.includes('audit') || t.includes('compliance') ||
      t.includes('reporting') || t.includes('analytics') || t.includes('control plane') ||
      t.includes('setup') || t.includes('config');
  };
  if (checkText(el.label || '')) return true;
  if (el.tags && el.tags.some(t => checkText(t))) return true;
  return false;
};

// Helper to check if a root element or any of its descendants is administrative
const isRootAdminGlobal = (rootId: string, allElements: DiagramElement[]): boolean => {
  const rootEl = allElements.find(e => e.id === rootId);
  if (!rootEl) return false;
  if (isAdministrativeElement(rootEl)) return true;
  const descendants = findDescendantsRecursive(rootId, allElements);
  return descendants.some(dId => {
    const desc = allElements.find(e => e.id === dId);
    return desc ? isAdministrativeElement(desc) : false;
  });
};

// Classify elements into 8 structural layers (0 to 7)
const getElementRawTier = (el: DiagramElement): number => {
  const label = (el.label || '').toLowerCase();
  const tags = (el.tags || []).map(t => t.toLowerCase());
  const role = (el.style?.role || '').toLowerCase();

  // Tier 0: Users / Public Zone
  if (
    label.includes('public-zone') || label.includes('public zone') ||
    label.includes('user') || label.includes('visitor') || label.includes('customer') ||
    label.includes('actor') || label.includes('client') || label.includes('partner') ||
    role === 'input' ||
    tags.some(t => t.includes('actor') || t.includes('user') || t.includes('client') || t.includes('public'))
  ) {
    return 0;
  }

  // Tier 1: Applications / Frontends
  if (
    label.includes('app') || label.includes('portal') || label.includes('frontend') ||
    label.includes('dashboard') || label.includes('ui') || label.includes('website') ||
    label.includes('webapp') || label.includes('spa') || label.includes('interface') ||
    tags.some(t => t.includes('app') || t.includes('portal') || t.includes('frontend') || t.includes('ui'))
  ) {
    // Differentiate Feature domains from main Apps
    if (label.includes('feature')) {
      return 2;
    }
    return 1;
  }

  // Tier 2: Feature Domains
  if (
    label.includes('feature') || label.includes('proposal-system') || label.includes('proposal system') ||
    label.includes('notifications') || label.includes('payment-system') || label.includes('payment system') ||
    label.includes('booking-mgmt') || label.includes('booking mgmt') || label.includes('white-label') ||
    label.includes('white label') || label.includes('crm') || label.includes('travel-services') ||
    label.includes('travel services') ||
    tags.some(t => t.includes('feature') || t.includes('domain') || t.includes('capability'))
  ) {
    return 2;
  }

  // Tier 3: Security Layer
  if (
    label.includes('security') || label.includes('mfa') || label.includes('auth') ||
    label.includes('oauth') || label.includes('iam') || label.includes('waf') ||
    label.includes('firewall') || label.includes('authenticator') || label.includes('identity') ||
    label.includes('load-balancer') || label.includes('load balancer') || label.includes('cdn') ||
    tags.some(t => t.includes('auth') || t.includes('security') || t.includes('waf') || t.includes('firewall') || t.includes('lb') || t.includes('cdn'))
  ) {
    return 3;
  }

  // Tier 4: API Gateway / Routing
  if (
    label.includes('gateway') || label.includes('proxy') || label.includes('router') ||
    label.includes('api-gateway') || label.includes('api gateway') ||
    tags.some(t => t.includes('gateway') || t.includes('proxy') || t.includes('router'))
  ) {
    return 4;
  }

  // Tier 6: Data Layer / Databases / Storage
  if (
    label.includes('db') || label.includes('database') || label.includes('sql') ||
    label.includes('nosql') || label.includes('postgres') || label.includes('mysql') ||
    label.includes('mongo') || label.includes('redis') || label.includes('cache') ||
    label.includes('store') || label.includes('storage') || label.includes('s3') ||
    label.includes('bucket') || label.includes('queue') || label.includes('kafka') ||
    label.includes('rabbitmq') || label.includes('pubsub') || label.includes('data-layer') ||
    label.includes('data layer') || label.includes('data zone') || label.includes('data tier') ||
    tags.some(t => t.includes('db') || t.includes('database') || t.includes('cache') || t.includes('storage') || t.includes('queue') || t.includes('data'))
  ) {
    return 6;
  }

  // Tier 7: External Systems / SaaS
  if (
    label.includes('external') || label.includes('integration') || label.includes('third-party') ||
    label.includes('stripe') || label.includes('paypal') || label.includes('sendgrid') ||
    label.includes('twilio') || label.includes('notification api') || label.includes('partner api') ||
    label.includes('saas') || label.includes('salesforce') || label.includes('github') ||
    label.includes('whatsapp') || label.includes('email') || label.includes('accounting') ||
    label.includes('flight-api') || label.includes('hotel-api') ||
    tags.some(t => t.includes('external') || t.includes('integration') || t.includes('third-party') || t.includes('api') || t.includes('saas'))
  ) {
    return 7;
  }

  // Tier 5: Core Services (Default)
  return 5;
};

// Helper to determine the aggregated/dominant tier of a root container or group
const getRootTierGlobal = (rootId: string, allNodes: DiagramElement[]): number => {
  const rootEl = allNodes.find(e => e.id === rootId);
  if (!rootEl) return 5;
  const raw = getElementRawTier(rootEl);
  if (rootEl.type === 'container' || rootEl.type === 'group') {
    const descendants = findDescendantsRecursive(rootId, allNodes);
    const childNodes = descendants
      .map(id => allNodes.find(e => e.id === id))
      .filter(Boolean) as DiagramElement[];

    if (childNodes.length > 0) {
      const counts = Array(8).fill(0);
      childNodes.forEach(c => {
        if (c.type === 'node') {
          counts[getElementRawTier(c)]++;
        }
      });
      let maxVal = -1;
      let bestTier = raw;
      for (let t = 0; t < 8; t++) {
        if (counts[t] > maxVal && counts[t] > 0) {
          maxVal = counts[t];
          bestTier = t;
        }
      }
      return bestTier;
    }
  }
  return raw;
};

// Curated Enterprise Architectural Themes for Tiers
const getTierTheme = (tier: number, isAdmin: boolean) => {
  if (isAdmin) {
    return {
      borderColor: '#ec4899',
      backgroundColor: 'rgba(236, 72, 153, 0.03)',
      containerHeaderColor: 'rgba(236, 72, 153, 0.12)'
    };
  }
  switch (tier) {
    case 0: // Users / Public Zone
      return {
        borderColor: '#38bdf8', // Sky Blue
        backgroundColor: 'rgba(56, 189, 248, 0.03)',
        containerHeaderColor: 'rgba(56, 189, 248, 0.12)'
      };
    case 1: // Applications
      return {
        borderColor: '#6366f1', // Indigo
        backgroundColor: 'rgba(99, 102, 241, 0.03)',
        containerHeaderColor: 'rgba(99, 102, 241, 0.12)'
      };
    case 2: // Feature Domains
      return {
        borderColor: '#a78bfa', // Violet/Purple
        backgroundColor: 'rgba(167, 139, 250, 0.03)',
        containerHeaderColor: 'rgba(167, 139, 250, 0.12)'
      };
    case 3: // Security Layer
      return {
        borderColor: '#10b981', // Emerald
        backgroundColor: 'rgba(16, 185, 129, 0.03)',
        containerHeaderColor: 'rgba(16, 185, 129, 0.12)'
      };
    case 4: // API Gateway / Routing
      return {
        borderColor: '#06b6d4', // Cyan
        backgroundColor: 'rgba(6, 182, 212, 0.03)',
        containerHeaderColor: 'rgba(6, 182, 212, 0.12)'
      };
    case 5: // Core Services
      return {
        borderColor: '#3b82f6', // Blue
        backgroundColor: 'rgba(59, 130, 246, 0.03)',
        containerHeaderColor: 'rgba(59, 130, 246, 0.12)'
      };
    case 6: // Data Layer
      return {
        borderColor: '#f43f5e', // Rose
        backgroundColor: 'rgba(244, 63, 94, 0.03)',
        containerHeaderColor: 'rgba(244, 63, 94, 0.12)'
      };
    case 7: // External Systems
    default:
      return {
        borderColor: '#f59e0b', // Amber
        backgroundColor: 'rgba(245, 158, 11, 0.03)',
        containerHeaderColor: 'rgba(245, 158, 11, 0.12)'
      };
  }
};

// Enterprise Architecture Auto-Layout Engine
const performAutoLayout = (inputNodes: DiagramElement[], inputEdges: DiagramConnection[]): DiagramElement[] => {
  const allElements = JSON.parse(JSON.stringify(inputNodes)) as DiagramElement[];
  const connections = inputEdges;

  // Local wrappers for global helper functions to keep local signatures identical
  const findDescendants = (parentId: string): string[] => findDescendantsRecursive(parentId, allElements);
  const isRootAdmin = (rootId: string): boolean => isRootAdminGlobal(rootId, allElements);
  const getRootTier = (rootId: string): number => getRootTierGlobal(rootId, allElements);

  const childSizes = new Map<string, { width: number; height: number }>();
  const relativePositions = new Map<string, { x: number; y: number }>();

  // 4.5. Helper to compute dependency-based ranks of sibling elements in a container
  const computeRanks = (siblingElements: DiagramElement[]): Map<string, number> => {
    const ranks = new Map<string, number>();
    const siblingIds = siblingElements.map(e => e.id);

    // Initialize all ranks to 0
    siblingElements.forEach(e => ranks.set(e.id, 0));

    // Simple topological rank propagation
    let changed = true;
    for (let iter = 0; iter < 10 && changed; iter++) {
      changed = false;
      connections.forEach(edge => {
        if (siblingIds.includes(edge.source) && siblingIds.includes(edge.target)) {
          const srcRank = ranks.get(edge.source) || 0;
          const tgtRank = ranks.get(edge.target) || 0;
          if (tgtRank <= srcRank) {
            ranks.set(edge.target, srcRank + 1);
            changed = true;
          }
        }
      });
    }
    return ranks;
  };

  // 5. Recursive layout to calculate sizes & layouts inside containers
  const layoutElement = (elementId: string): { width: number; height: number } => {
    const el = allElements.find(e => e.id === elementId);
    if (!el) return { width: 0, height: 0 };

    const isElAdmin = isAdministrativeElement(el) || (el.parentId ? isRootAdmin(el.parentId) : false);
    const elTier = el.parentId ? getRootTier(el.parentId) : getElementRawTier(el);
    const theme = getTierTheme(elTier, isElAdmin);

    el.style = {
      ...el.style,
      borderColor: el.style.borderColor || theme.borderColor,
      backgroundColor: el.style.backgroundColor || theme.backgroundColor,
      containerHeaderColor: el.style.containerHeaderColor || theme.containerHeaderColor,
    };

    if (el.type !== 'container' && el.type !== 'group') {
      const size = el.size || { width: 220, height: 140 };
      el.size = size;
      childSizes.set(elementId, size);
      return size;
    }

    const children = allElements.filter(e => e.parentId === elementId);
    if (children.length === 0) {
      const size = el.type === 'container' ? { width: 260, height: 120 } : { width: 220, height: 100 };
      el.size = size;
      childSizes.set(elementId, size);
      return size;
    }

    children.forEach(child => {
      layoutElement(child.id);
    });

    // Compute dependency-based ranks of sibling elements in the container
    const ranks = computeRanks(children);

    // Sort sibling children to prevent crossings (topological Rank → Role → Sibling Connectivity Index)
    const roleOrder: Record<string, number> = {
      input: 0,
      router: 1,
      agent: 2,
      tool: 3,
      output: 4
    };
    const getRoleWeight = (c: DiagramElement) => {
      const r = c.style?.role || 'agent';
      return roleOrder[r] !== undefined ? roleOrder[r] : 2;
    };
    const getInternalBarycenter = (childId: string, siblingIds: string[]): number => {
      let sumIdx = 0;
      let count = 0;
      connections.forEach(edge => {
        if (edge.source === childId && siblingIds.includes(edge.target)) {
          sumIdx += siblingIds.indexOf(edge.target);
          count++;
        } else if (edge.target === childId && siblingIds.includes(edge.source)) {
          sumIdx += siblingIds.indexOf(edge.source);
          count++;
        }
      });
      return count > 0 ? sumIdx / count : 0;
    };

    children.sort((a, b) => {
      const rankA = ranks.get(a.id) || 0;
      const rankB = ranks.get(b.id) || 0;
      if (rankA !== rankB) return rankA - rankB;

      const rA = getRoleWeight(a);
      const rB = getRoleWeight(b);
      if (rA !== rB) return rA - rB;

      const siblingIds = children.map(c => c.id);
      return getInternalBarycenter(a.id, siblingIds) - getInternalBarycenter(b.id, siblingIds);
    });

    const padTop = el.type === 'container' ? 60 : 40;
    const padLeft = el.type === 'container' ? 32 : 24;
    const padRight = el.type === 'container' ? 32 : 24;
    const padBottom = el.type === 'container' ? 32 : 24;
    const gapX = el.type === 'container' ? 32 : 24;
    const gapY = el.type === 'container' ? 32 : 24;

    // Group children by their raw/root tier
    const childrenByTier: Record<number, DiagramElement[]> = {};
    children.forEach(child => {
      const tier = child.type === 'container' || child.type === 'group' ? getRootTier(child.id) : getElementRawTier(child);
      if (!childrenByTier[tier]) {
        childrenByTier[tier] = [];
      }
      childrenByTier[tier].push(child);
    });

    const activeTiers = Object.keys(childrenByTier).map(Number).sort((a, b) => a - b);

    // We will form all rows across all tiers
    const rowElements: DiagramElement[][] = [];

    if (activeTiers.length > 1) {
      // Stack different tiers vertically
      activeTiers.forEach(t => {
        const tierItems = childrenByTier[t] || [];
        // Determine number of columns for this tier
        let cols = 1;
        const numItems = tierItems.length;
        let minDiff = Infinity;
        for (let c = 1; c <= numItems; c++) {
          const r = Math.ceil(numItems / c);
          const colWidths = Array(c).fill(0);
          const rowHeights = Array(r).fill(0);

          tierItems.forEach((child, idx) => {
            const size = childSizes.get(child.id) || { width: 220, height: 140 };
            const colIdx = idx % c;
            const rowIdx = Math.floor(idx / c);
            if (size.width > colWidths[colIdx]) colWidths[colIdx] = size.width;
            if (size.height > rowHeights[rowIdx]) rowHeights[rowIdx] = size.height;
          });

          const estW = colWidths.reduce((sum, w) => sum + w, 0) + (c - 1) * gapX + padLeft + padRight;
          const estH = rowHeights.reduce((sum, h) => sum + h, 0) + (r - 1) * gapY + padTop + padBottom;
          const ratio = estW / estH;
          const diff = Math.abs(ratio - 1.2);

          if (diff < minDiff) {
            minDiff = diff;
            cols = c;
          }
        }

        for (let i = 0; i < numItems; i += cols) {
          rowElements.push(tierItems.slice(i, i + cols));
        }
      });
    } else {
      // Only one tier is present: use standard aspect-ratio grid optimization
      const singleTier = activeTiers[0];
      const tierItems = childrenByTier[singleTier] || [];
      const numItems = tierItems.length;
      let cols = 1;
      let minDiff = Infinity;
      for (let c = 1; c <= numItems; c++) {
        const r = Math.ceil(numItems / c);
        const colWidths = Array(c).fill(0);
        const rowHeights = Array(r).fill(0);

        tierItems.forEach((child, idx) => {
          const size = childSizes.get(child.id) || { width: 220, height: 140 };
          const colIdx = idx % c;
          const rowIdx = Math.floor(idx / c);
          if (size.width > colWidths[colIdx]) colWidths[colIdx] = size.width;
          if (size.height > rowHeights[rowIdx]) rowHeights[rowIdx] = size.height;
        });

        const estW = colWidths.reduce((sum, w) => sum + w, 0) + (c - 1) * gapX + padLeft + padRight;
        const estH = rowHeights.reduce((sum, h) => sum + h, 0) + (r - 1) * gapY + padTop + padBottom;
        const ratio = estW / estH;
        const diff = Math.abs(ratio - 1.2);

        if (diff < minDiff) {
          minDiff = diff;
          cols = c;
        }
      }
      for (let i = 0; i < numItems; i += cols) {
        rowElements.push(tierItems.slice(i, i + cols));
      }
    }

    const numRows = rowElements.length;
    const rowHeights = Array(numRows).fill(0);
    const rowWidths = rowElements.map((row, rIdx) => {
      let rW = 0;
      row.forEach((child) => {
        const size = childSizes.get(child.id) || { width: 220, height: 140 };
        rW += size.width;
        if (size.height > rowHeights[rIdx]) rowHeights[rIdx] = size.height;
      });
      return rW + (row.length - 1) * gapX;
    });

    const maxRowWidth = Math.max(...rowWidths, 0);
    const totalWidth = maxRowWidth + padLeft + padRight;

    const rowY = Array(numRows).fill(0);
    let curY = padTop;
    for (let r = 0; r < numRows; r++) {
      rowY[r] = curY;
      curY += rowHeights[r] + gapY;
    }
    const totalHeight = curY - gapY + padBottom;

    rowElements.forEach((row, rIdx) => {
      const rowW = rowWidths[rIdx];
      let startX = padLeft + (maxRowWidth - rowW) / 2;
      let curX = startX;
      row.forEach((child) => {
        const size = childSizes.get(child.id) || { width: 220, height: 140 };
        const cellHeight = rowHeights[rIdx];
        const offsetY = (cellHeight - size.height) / 2;
        relativePositions.set(child.id, {
          x: curX,
          y: rowY[rIdx] + offsetY
        });
        curX += size.width + gapX;
      });
    });

    const size = { width: totalWidth, height: totalHeight };
    el.size = size;
    childSizes.set(elementId, size);
    return size;
  };

  // Cleanse semantic nesting errors: strip parentId of data nodes if their parent is not a data container
  allElements.forEach(el => {
    if (el.parentId && el.type === 'node') {
      const parent = allElements.find(p => p.id === el.parentId);
      if (parent && getElementRawTier(el) === 5 && getRootTier(parent.id) !== 5) {
        el.parentId = null;
      }
    }
  });

  allElements.forEach(el => {
    layoutElement(el.id);
  });

  // 6. Global Positioning and Alignments
  const roots = allElements.filter(e => !e.parentId);
  const CenterX = 600;
  const gapX = 80;
  const tierGapY = 140;

  const rootPositions = new Map<string, { x: number; y: number }>();
  const operationalRoots = roots.filter(r => !isRootAdmin(r.id));
  const administrativeRoots = roots.filter(r => isRootAdmin(r.id));

  const operationalRootsByTier: DiagramElement[][] = Array.from({ length: 8 }, () => []);
  operationalRoots.forEach(r => {
    const tier = getRootTier(r.id);
    operationalRootsByTier[tier].push(r);
  });

  let currentY = 100;
  const tierStartY = Array(8).fill(100);

  for (let tier = 0; tier < 8; tier++) {
    const tierRoots = operationalRootsByTier[tier] || [];
    if (tierRoots.length === 0) {
      tierStartY[tier] = currentY;
      continue;
    }

    tierStartY[tier] = currentY;

    // Sort using connections (barycenter) to minimize line crossing
    const getRootBarycenter = (rootId: string): number => {
      const ids = [rootId, ...findDescendants(rootId)];
      let sumX = 0;
      let count = 0;
      connections.forEach(edge => {
        const isSource = ids.includes(edge.source);
        const isTarget = ids.includes(edge.target);
        if (isSource || isTarget) {
          const otherId = isSource ? edge.target : edge.source;
          let otherRoot = allElements.find(e => e.id === otherId);
          while (otherRoot && otherRoot.parentId) {
            otherRoot = allElements.find(e => e.id === otherRoot!.parentId);
          }
          if (otherRoot && otherRoot.id !== rootId) {
            const pos = rootPositions.get(otherRoot.id);
            if (pos) {
              sumX += pos.x;
              count++;
            }
          }
        }
      });
      return count > 0 ? sumX / count : CenterX;
    };

    tierRoots.sort((a, b) => getRootBarycenter(a.id) - getRootBarycenter(b.id));

    // Horizontal wrapping (max row width 950px)
    const subRows: DiagramElement[][] = [];
    let currentSubRow: DiagramElement[] = [];
    let currentSubRowWidth = 0;

    tierRoots.forEach(el => {
      const size = childSizes.get(el.id) || { width: 220, height: 140 };
      if (currentSubRow.length > 0 && currentSubRowWidth + gapX + size.width > 950) {
        subRows.push(currentSubRow);
        currentSubRow = [el];
        currentSubRowWidth = size.width;
      } else {
        currentSubRow.push(el);
        currentSubRowWidth += (currentSubRow.length > 1 ? gapX : 0) + size.width;
      }
    });
    if (currentSubRow.length > 0) {
      subRows.push(currentSubRow);
    }

    subRows.forEach((row) => {
      let maxH = 0;
      row.forEach(el => {
        const size = childSizes.get(el.id) || { width: 220, height: 140 };
        if (size.height > maxH) maxH = size.height;
      });

      let rowW = 0;
      row.forEach((el, elIdx) => {
        const size = childSizes.get(el.id) || { width: 220, height: 140 };
        rowW += (elIdx > 0 ? gapX : 0) + size.width;
      });

      let startX = CenterX - rowW / 2;
      if (startX < 50) startX = 50;

      let curX = startX;
      row.forEach(el => {
        rootPositions.set(el.id, { x: curX, y: currentY });
        const size = childSizes.get(el.id) || { width: 220, height: 140 };
        curX += size.width + gapX;
      });

      currentY += maxH + 40;
    });

    currentY += tierGapY - 40;
  }

  // 7. Align administrative roots on the right column
  administrativeRoots.sort((a, b) => getRootTier(a.id) - getRootTier(b.id));
  const adminX = CenterX + 700;
  const adminTierY = new Map<number, number>();

  administrativeRoots.forEach(r => {
    const tier = getRootTier(r.id);
    const size = childSizes.get(r.id) || { width: 220, height: 140 };
    let startY = tierStartY[tier];
    const existingY = adminTierY.get(tier);
    if (existingY !== undefined) {
      startY = existingY;
    }

    rootPositions.set(r.id, { x: adminX, y: startY });
    adminTierY.set(tier, startY + size.height + 30);
  });

  // 8. Resolve all absolute coordinates recursively
  const resolveAbsolutePositions = (elementId: string, parentAbsoluteX: number, parentAbsoluteY: number) => {
    const children = allElements.filter(e => e.parentId === elementId);
    children.forEach(child => {
      const relPos = relativePositions.get(child.id) || { x: 0, y: 0 };
      const absX = Math.round(parentAbsoluteX + relPos.x);
      const absY = Math.round(parentAbsoluteY + relPos.y);

      const el = allElements.find(e => e.id === child.id);
      if (el) {
        el.position = { x: absX, y: absY };
      }

      resolveAbsolutePositions(child.id, absX, absY);
    });
  };

  allElements.filter(e => !e.parentId).forEach(root => {
    const absPos = rootPositions.get(root.id) || { x: 100, y: 100 };
    root.position = {
      x: Math.round(absPos.x),
      y: Math.round(absPos.y)
    };
    resolveAbsolutePositions(root.id, absPos.x, absPos.y);
  });

  return allElements;
};

// Helper to generate a rounded orthogonal path from a list of points
const generateRoundedPath = (pts: { x: number; y: number }[], radius: number = 10): string => {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

  let path = `M ${pts[0].x} ${pts[0].y}`;

  for (let i = 1; i < pts.length - 1; i++) {
    const pPrev = pts[i - 1];
    const pCurr = pts[i];
    const pNext = pts[i + 1];

    const dx1 = pCurr.x - pPrev.x;
    const dy1 = pCurr.y - pPrev.y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

    const dx2 = pNext.x - pCurr.x;
    const dy2 = pNext.y - pCurr.y;
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    if (len1 === 0 || len2 === 0) {
      path += ` L ${pCurr.x} ${pCurr.y}`;
      continue;
    }

    const r = Math.min(radius, len1 / 2, len2 / 2);

    const xStart = pCurr.x - (dx1 / len1) * r;
    const yStart = pCurr.y - (dy1 / len1) * r;

    const xEnd = pCurr.x + (dx2 / len2) * r;
    const yEnd = pCurr.y + (dy2 / len2) * r;

    path += ` L ${xStart} ${yStart} Q ${pCurr.x} ${pCurr.y} ${xEnd} ${yEnd}`;
  }

  path += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
  return path;
};



export const ProjectBlueprintTab = ({
  workspaceId,
  projectId,
  releases,
  isShareMode = false,
  isActive = false,
}: {
  workspaceId: string;
  projectId: string;
  releases: any[];
  isShareMode?: boolean;
  isActive?: boolean;
}) => {
  const isGuest = isShareMode || (typeof window !== 'undefined' && (
    !!localStorage.getItem('affine-project-share-key') ||
    window.location.search.includes('shareKey=') ||
    window.location.search.includes('share_key=') ||
    window.location.pathname.includes('/share')
  ));

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedReleaseId = searchParams.get('releaseId') || '';
  const setSelectedReleaseId = useCallback((id: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('releaseId', id);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

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
        if (numA !== numB) return numB - numA;
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
  const hasSelectedRelease = Boolean(activeReleaseId && activeReleaseId !== '');

  // SWR Queries
  const { data: docsData, mutate: revalidateDocs, isLoading: docsLoading } = useQuery({
    query: projectDocumentsQuery,
    variables: { workspaceId, projectId, releaseId: activeReleaseId },
  }, { suspense: false });

  // Load Blueprint Document Content
  const blueprintDoc = useMemo(() => {
    return docsData?.projectDocuments?.find((d: any) => d.type === 'ProjectBlueprint');
  }, [docsData]);

  const { data: issuesData, mutate: revalidateIssues, isLoading: issuesLoading } = useQuery({
    query: projectIssuesQuery,
    variables: { workspaceId, filter: { projectId } },
  }, { suspense: false });

  const { data: cyclesData, isLoading: cyclesLoading } = useQuery({
    query: projectCyclesQuery,
    variables: { workspaceId, projectId },
  }, { suspense: false });

  const { data: modulesData, isLoading: modulesLoading } = useQuery({
    query: projectModulesQuery,
    variables: { workspaceId, projectId },
  }, { suspense: false });

  const { data: membersData } = useQuery(
    isShareMode
      ? undefined
      : {
          query: getMembersByWorkspaceIdQuery,
          variables: { workspaceId },
        },
    { suspense: false }
  );

  // Mutations
  const { trigger: triggerUpsert } = useMutation({ mutation: upsertProjectDocumentMutation });
  const { trigger: triggerCreateIssue } = useMutation({ mutation: createProjectIssueMutation });
  const { trigger: triggerUpdateIssue } = useMutation({ mutation: updateProjectIssueMutation });

  // Canvas State
  const pendingStatusUpdatesRef = useRef<Record<string, { status: string; timestamp: number }>>({});
  const [nodes, setNodes] = useState<DiagramElement[]>([]);
  const [edges, setEdges] = useState<DiagramConnection[]>([]);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditingState, setIsEditingState] = useState(false);

  const [activeMenuNodeId, setActiveMenuNodeId] = useState<string | null>(null);
  const [nodeMenuPos, setNodeMenuPos] = useState<{ top?: number; bottom?: number; right?: number; maxHeight?: number } | null>(null);

  const currentReleaseName = useMemo(() => {
    return sortedReleases.find(r => r.id === activeReleaseId)?.name || '';
  }, [sortedReleases, activeReleaseId]);

  useBlueprintCopilotSync({
    selectedBlockId: activeMenuNodeId,
    releaseId: activeReleaseId,
    releaseName: currentReleaseName,
    nodes,
  });

  const updateNodeMenuPosition = useCallback((nodeId: string, buttonEl: HTMLElement) => {
    const rect = buttonEl.getBoundingClientRect();
    const menuHeight = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top: number | undefined;
    let bottom: number | undefined;
    let maxHeight = 300;

    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      bottom = window.innerHeight - rect.top + 4;
      maxHeight = Math.min(300, Math.max(120, rect.top - 12));
    } else {
      top = rect.bottom + 4;
      maxHeight = Math.min(300, Math.max(120, window.innerHeight - rect.bottom - 12));
    }

    setNodeMenuPos({
      top,
      bottom,
      right: Math.max(8, window.innerWidth - rect.right),
      maxHeight,
    });
  }, []);

  useEffect(() => {
    if (!activeMenuNodeId) return;

    const handleClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.quick-actions-menu') || (e.target as HTMLElement).closest('.quick-actions-btn')) {
        return;
      }
      setActiveMenuNodeId(null);
    };

    const handleScrollOrResize = () => {
      const btn = document.querySelector(`[data-menu-btn-id="${activeMenuNodeId}"]`) as HTMLElement;
      if (btn) {
        updateNodeMenuPosition(activeMenuNodeId, btn);
      } else {
        setActiveMenuNodeId(null);
      }
    };

    document.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeMenuNodeId, updateNodeMenuPosition]);

  const isApprovedOrSigned = blueprintDoc?.status === 'ApprovedByClient' || blueprintDoc?.status === 'SignedByClient';
  const isEditing = isEditingState && !isApprovedOrSigned && !isShareMode;
  const isLocked = isApprovedOrSigned || isShareMode;

  // H. Relationship Density Modes
  const [densityMode, setDensityMode] = useState<'executive' | 'architecture' | 'dependency'>('dependency');

  const renderedEdges = useMemo(() => {
    return edges.filter(edge => {
      if (densityMode === 'dependency') return true;

      const srcNode = nodes.find(n => n.id === edge.source);
      const tgtNode = nodes.find(n => n.id === edge.target);
      if (!srcNode || !tgtNode) return true;

      const getElementRawTierLocal = getElementRawTier;
      const getRootTierLocal = (rootId: string) => getRootTierGlobal(rootId, nodes);

      const srcTier = srcNode.parentId ? getRootTierLocal(srcNode.parentId) : getElementRawTierLocal(srcNode);
      const tgtTier = tgtNode.parentId ? getRootTierLocal(tgtNode.parentId) : getElementRawTierLocal(tgtNode);

      if (densityMode === 'executive') {
        // Executive Mode: Show only User -> App -> Security -> API Gateway -> Backend Services
        // Hide anything in Data Layer (6) or External (7)
        if (srcTier > 5 || tgtTier > 5) return false;

        // Hide minor utility components (monitoring, redis, storage)
        const lowerLabel = (tgtNode.label || '').toLowerCase();
        if (lowerLabel.includes('redis') || lowerLabel.includes('cache') || lowerLabel.includes('storage') || lowerLabel.includes('monitoring')) {
          return false;
        }
        return true;
      }

      if (densityMode === 'architecture') {
        // Architecture Mode: Show main Postgres/databases but hide Redis cache / storage / logs
        const lowerLabel = (tgtNode.label || '').toLowerCase();
        if (lowerLabel.includes('redis') || lowerLabel.includes('cache') || lowerLabel.includes('storage') || lowerLabel.includes('monitoring')) {
          return false;
        }
        return true;
      }

      return true;
    });
  }, [edges, nodes, densityMode]);

  // Memoized Edge Paths to compute routing exactly ONCE per frame instead of E*E times
  const edgePathsMap = useMemo(() => {
    const paths: Record<string, { path: string; midX: number; midY: number }> = {};
    if (nodes.length === 0 || renderedEdges.length === 0) return paths;

    const getElementRawTierLocal = getElementRawTier;
    const getRootTierLocal = (rootId: string) => getRootTierGlobal(rootId, nodes);

    // 1. Group and classify all edges
    const getEdgeClassification = (edge: DiagramConnection) => {
      const sNode = nodes.find(n => n.id === edge.source);
      const tNode = nodes.find(n => n.id === edge.target);
      if (!sNode || !tNode) return null;

      const sTier = sNode.parentId ? getRootTierLocal(sNode.parentId) : getElementRawTierLocal(sNode);
      const tTier = tNode.parentId ? getRootTierLocal(tNode.parentId) : getElementRawTierLocal(tNode);

      let fromSide: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
      let toSide: 'top' | 'bottom' | 'left' | 'right' = 'top';
      let type: 'vertical-down' | 'vertical-up' | 'horizontal-right' | 'horizontal-left' = 'vertical-down';

      if (sTier < tTier) {
        fromSide = 'bottom';
        toSide = 'top';
        type = 'vertical-down';
      } else if (sTier > tTier) {
        fromSide = 'top';
        toSide = 'bottom';
        type = 'vertical-up';
      } else {
        // Peer connection
        if (sNode.position.x < tNode.position.x) {
          fromSide = 'right';
          toSide = 'left';
          type = 'horizontal-right';
        } else if (sNode.position.x > tNode.position.x) {
          fromSide = 'left';
          toSide = 'right';
          type = 'horizontal-left';
        } else {
          if (sNode.position.y < tNode.position.y) {
            fromSide = 'bottom';
            toSide = 'top';
            type = 'vertical-down';
          } else {
            fromSide = 'top';
            toSide = 'bottom';
            type = 'vertical-up';
          }
        }
      }
      return { sTier, tTier, fromSide, toSide, type, sNode, tNode };
    };

    // 2. Precalculate fanned-out ports for all nodes
    const portsMap: Record<string, { start: { x: number; y: number }; end: { x: number; y: number } }> = {};
    const nodeConns: Record<string, { edgeId: string; isSource: boolean; otherNode: DiagramElement; side: 'top' | 'bottom' | 'left' | 'right' }[]> = {};

    nodes.forEach(n => {
      nodeConns[n.id] = [];
    });

    renderedEdges.forEach(edge => {
      const classif = getEdgeClassification(edge);
      if (!classif) return;
      const { fromSide, toSide } = classif;
      const sNode = nodes.find(n => n.id === edge.source);
      const tNode = nodes.find(n => n.id === edge.target);
      if (!sNode || !tNode) return;

      nodeConns[edge.source].push({
        edgeId: edge.id,
        isSource: true,
        otherNode: tNode,
        side: fromSide
      });
      nodeConns[edge.target].push({
        edgeId: edge.id,
        isSource: false,
        otherNode: sNode,
        side: toSide
      });
      portsMap[edge.id] = { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };
    });

    nodes.forEach(node => {
      const conns = nodeConns[node.id] || [];
      const sides: ('top' | 'bottom' | 'left' | 'right')[] = ['top', 'bottom', 'left', 'right'];

      sides.forEach(side => {
        const sideConns = conns.filter(c => c.side === side);
        if (sideConns.length === 0) return;

        if (side === 'top' || side === 'bottom') {
          sideConns.sort((a, b) => a.otherNode.position.x - b.otherNode.position.x);
        } else {
          sideConns.sort((a, b) => a.otherNode.position.y - b.otherNode.position.y);
        }

        const count = sideConns.length;
        const w = node.size.width;
        const h = node.size.height;
        const x = node.position.x;
        const y = node.position.y;

        sideConns.forEach((conn, index) => {
          const fraction = (index + 1) / (count + 1);
          let portX = x + w / 2;
          let portY = y + h / 2;

          if (side === 'top') {
            portX = x + w * fraction;
            portY = y;
          } else if (side === 'bottom') {
            portX = x + w * fraction;
            portY = y + h;
          } else if (side === 'left') {
            portX = x;
            portY = y + h * fraction;
          } else if (side === 'right') {
            portX = x + w;
            portY = y + h * fraction;
          }

          const entry = portsMap[conn.edgeId];
          if (entry) {
            if (conn.isSource) {
              entry.start = { x: portX, y: portY };
            } else {
              entry.end = { x: portX, y: portY };
            }
          }
        });
      });
    });

    // 3. Compute tier bounding boxes
    const bottomY = Array(8).fill(undefined);
    const topY = Array(8).fill(undefined);
    for (let t = 0; t < 8; t++) {
      const nodesInT = nodes.filter(n => {
        const tier = n.parentId ? getRootTierLocal(n.parentId) : getElementRawTierLocal(n);
        return tier === t;
      });
      if (nodesInT.length > 0) {
        let maxH = -Infinity;
        let minH = Infinity;
        nodesInT.forEach(n => {
          const bottom = n.position.y + n.size.height;
          if (bottom > maxH) maxH = bottom;
          if (n.position.y < minH) minH = n.position.y;
        });
        bottomY[t] = maxH;
        topY[t] = minH;
      }
    }

    // 4. Group horizontal segments into gaps
    interface GapSegment {
      edgeId: string;
      segmentType: 'standard' | 'start' | 'end';
    }
    const gapSegments: GapSegment[][] = Array.from({ length: 7 }, () => []);

    renderedEdges.forEach(edge => {
      const classif = getEdgeClassification(edge);
      if (!classif) return;
      const { sTier: Ta, tTier: Tb, type } = classif;
      const sNode = nodes.find(n => n.id === edge.source);
      const tNode = nodes.find(n => n.id === edge.target);
      if (!sNode || !tNode) return;

      if (type === 'vertical-down') {
        if (Tb === Ta + 1) {
          gapSegments[Ta].push({ edgeId: edge.id, segmentType: 'standard' });
        } else if (Tb > Ta + 1) {
          gapSegments[Ta].push({ edgeId: edge.id, segmentType: 'start' });
          gapSegments[Tb - 1].push({ edgeId: edge.id, segmentType: 'end' });
        }
      } else if (type === 'vertical-up') {
        if (Ta === Tb + 1) {
          gapSegments[Tb].push({ edgeId: edge.id, segmentType: 'standard' });
        } else if (Ta > Tb + 1) {
          gapSegments[Ta - 1].push({ edgeId: edge.id, segmentType: 'start' });
          gapSegments[Tb].push({ edgeId: edge.id, segmentType: 'end' });
        }
      } else if (type === 'horizontal-right' || type === 'horizontal-left') {
        // Peer connection in different containers routes through the gap below
        if (sNode.parentId !== tNode.parentId) {
          const g = Ta === 7 ? 6 : Ta;
          gapSegments[g].push({ edgeId: edge.id, segmentType: 'standard' });
        }
      }
    });

    // Assign Y_lane for all gap segments
    const gapLanes: Record<string, number> = {};
    for (let g = 0; g < 7; g++) {
      const segments = gapSegments[g];
      if (segments.length === 0) continue;

      // Determine the Y boundaries of this gap
      let minY = bottomY[g];
      let maxY = topY[g + 1];
      if (minY === undefined) {
        minY = 100 + g * 280 + 180;
      }
      if (maxY === undefined) {
        maxY = 100 + (g + 1) * 280;
      }
      const midY = (minY + maxY) / 2;

      // Helper to get X position of the segment to sort them horizontally
      const getSegmentX = (seg: GapSegment) => {
        const edge = renderedEdges.find(e => e.id === seg.edgeId);
        if (!edge) return 0;
        const ports = portsMap[edge.id];
        if (!ports) return 0;
        if (seg.segmentType === 'start') return ports.start.x;
        if (seg.segmentType === 'end') return ports.end.x;
        return (ports.start.x + ports.end.x) / 2;
      };

      // Sort segments to prevent crossings
      segments.sort((a, b) => {
        const diff = getSegmentX(a) - getSegmentX(b);
        if (diff !== 0) return diff;
        return a.edgeId.localeCompare(b.edgeId);
      });

      const count = segments.length;
      if (minY + 30 >= maxY) {
        segments.forEach((seg, index) => {
          const laneOffset = (index - (count - 1) / 2) * 12;
          gapLanes[seg.edgeId + '_' + seg.segmentType] = midY + laneOffset;
        });
      } else {
        segments.forEach((seg, index) => {
          const laneOffset = (index - (count - 1) / 2) * 12;
          const Y_lane = Math.min(maxY - 15, Math.max(minY + 15, midY + laneOffset));
          gapLanes[seg.edgeId + '_' + seg.segmentType] = Y_lane;
        });
      }
    }

    // 5. Precalculate bypass lanes
    const leftBypassEdges: string[] = [];
    const rightBypassEdges: string[] = [];
    const CenterX = 600;

    renderedEdges.forEach(edge => {
      const classif = getEdgeClassification(edge);
      if (!classif) return;
      const { sTier: Ta, tTier: Tb } = classif;
      if (Math.abs(Ta - Tb) > 1) {
        const ports = portsMap[edge.id];
        if (ports) {
          const avgX = (ports.start.x + ports.end.x) / 2;
          if (avgX < CenterX) {
            leftBypassEdges.push(edge.id);
          } else {
            rightBypassEdges.push(edge.id);
          }
        }
      }
    });

    const getBypassSortVal = (edgeId: string) => {
      const edge = renderedEdges.find(e => e.id === edgeId);
      if (!edge) return 0;
      const ports = portsMap[edge.id];
      return ports ? Math.min(ports.start.y, ports.end.y) : 0;
    };

    leftBypassEdges.sort((a, b) => getBypassSortVal(a) - getBypassSortVal(b) || a.localeCompare(b));
    rightBypassEdges.sort((a, b) => getBypassSortVal(a) - getBypassSortVal(b) || a.localeCompare(b));

    const bypassXMap: Record<string, number> = {};
    leftBypassEdges.forEach((id, index) => {
      bypassXMap[id] = Math.max(10, 40 - index * 8);
    });
    rightBypassEdges.forEach((id, index) => {
      bypassXMap[id] = 1180 + index * 8;
    });

    // 6. Precalculate internal peer lanes
    const peerLanes: Record<string, number> = {};
    const containerPeers: Record<string, { edgeId: string; type: string; start: { x: number; y: number }; end: { x: number; y: number } }[]> = {};

    renderedEdges.forEach(edge => {
      const classif = getEdgeClassification(edge);
      if (!classif) return;
      const { type, sNode, tNode } = classif;
      if (sNode.parentId === tNode.parentId && sNode.parentId !== null) {
        const cid = sNode.parentId;
        if (!containerPeers[cid]) containerPeers[cid] = [];
        const ports = portsMap[edge.id];
        if (ports) {
          containerPeers[cid].push({ edgeId: edge.id, type, start: ports.start, end: ports.end });
        }
      }
    });

    Object.keys(containerPeers).forEach(cid => {
      const peers = containerPeers[cid];
      const horiz = peers.filter(p => p.type === 'horizontal-right' || p.type === 'horizontal-left');
      const vert = peers.filter(p => p.type === 'vertical-down' || p.type === 'vertical-up');

      horiz.sort((a, b) => Math.min(a.start.y, a.end.y) - Math.min(b.start.y, b.end.y) || a.edgeId.localeCompare(b.edgeId));
      vert.sort((a, b) => Math.min(a.start.x, a.end.x) - Math.min(b.start.x, b.end.x) || a.edgeId.localeCompare(b.edgeId));

      horiz.forEach((p, index) => {
        const midX = (p.start.x + p.end.x) / 2;
        peerLanes[p.edgeId] = midX + (index - (horiz.length - 1) / 2) * 12;
      });

      vert.forEach((p, index) => {
        const midY = (p.start.y + p.end.y) / 2;
        peerLanes[p.edgeId] = midY + (index - (vert.length - 1) / 2) * 12;
      });
    });

    // 7. Generate final paths for all rendered edges
    renderedEdges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.source);
      const toNode = nodes.find(n => n.id === edge.target);
      if (!fromNode || !toNode) return;

      const activePorts = portsMap[edge.id] || {
        start: { x: fromNode.position.x + fromNode.size.width / 2, y: fromNode.position.y + fromNode.size.height },
        end: { x: toNode.position.x + toNode.size.width / 2, y: toNode.position.y }
      };
      const start = activePorts.start;
      const end = activePorts.end;

      const currentClassif = getEdgeClassification(edge);
      if (!currentClassif) return;
      const { sTier: Ta, tTier: Tb, type: currentType, sNode, tNode } = currentClassif;

      let pts: { x: number; y: number }[] = [];
      let midX = 0;
      let midY = 0;

      if (currentType === 'vertical-down' || currentType === 'vertical-up') {
        const isAdjacent = Math.abs(Ta - Tb) === 1;
        const isPeerDiffContainer = Ta === Tb && sNode.parentId !== tNode.parentId;

        if (isAdjacent || isPeerDiffContainer) {
          const Y_lane = gapLanes[edge.id + '_standard'] || (start.y + end.y) / 2;
          pts = [
            start,
            { x: start.x, y: Y_lane },
            { x: end.x, y: Y_lane },
            end
          ];
          midX = (start.x + end.x) / 2;
          midY = Y_lane;
        } else {
          // Multi-tier
          const Y_lane1 = gapLanes[edge.id + '_start'] || (currentType === 'vertical-down' ? start.y + 40 : start.y - 40);
          const Y_lane2 = gapLanes[edge.id + '_end'] || (currentType === 'vertical-down' ? end.y - 40 : end.y + 40);
          const X_bypass = bypassXMap[edge.id] || 40;

          pts = [
            start,
            { x: start.x, y: Y_lane1 },
            { x: X_bypass, y: Y_lane1 },
            { x: X_bypass, y: Y_lane2 },
            { x: end.x, y: Y_lane2 },
            end
          ];
          midX = X_bypass;
          midY = (Y_lane1 + Y_lane2) / 2;
        }
      } else {
        // Peer connection
        if (sNode.parentId === tNode.parentId) {
          // Same container
          if (currentType === 'horizontal-right' || currentType === 'horizontal-left') {
            const X_lane = peerLanes[edge.id] || (start.x + end.x) / 2;
            pts = [
              start,
              { x: X_lane, y: start.y },
              { x: X_lane, y: end.y },
              end
            ];
            midX = X_lane;
            midY = (start.y + end.y) / 2;
          } else {
            const Y_lane = peerLanes[edge.id] || (start.y + end.y) / 2;
            pts = [
              start,
              { x: start.x, y: Y_lane },
              { x: end.x, y: Y_lane },
              end
            ];
            midX = (start.x + end.x) / 2;
            midY = Y_lane;
          }
        } else {
          // Different containers
          const Y_lane = gapLanes[edge.id + '_standard'] || (start.y + end.y) / 2;
          pts = [
            start,
            { x: start.x, y: Y_lane },
            { x: end.x, y: Y_lane },
            end
          ];
          midX = (start.x + end.x) / 2;
          midY = Y_lane;
        }
      }

      const path = generateRoundedPath(pts, 12);
      paths[edge.id] = { path, midX, midY };
    });

    return paths;
  }, [nodes, renderedEdges]);

  useEffect(() => {
    if (isApprovedOrSigned || isShareMode) {
      setIsEditingState(false);
    }
  }, [isApprovedOrSigned, isShareMode]);

  const [isPanning, setIsPanning] = useState(false);
  const [devPanelTab, setDevPanelTab] = useState<'properties' | 'code'>('properties');
  const [copied, setCopied] = useState(false);

  // Zoom handlers
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2.0));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.1));
  const handleResetZoom = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  // Selection and Mode States
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isWorkItemModalOpen, setIsWorkItemModalOpen] = useState(false);
  const [workItemNodeId, setWorkItemNodeId] = useState<string | null>(null);
  const [isAddTagOpen, setIsAddTagOpen] = useState<string | null>(null);
  const [newTagText, setNewTagText] = useState('');

  // Work Item Form
  const [issueForm, setIssueForm] = useState({
    title: '',
    description: '',
    type: 'Task',
    priority: 'Medium',
    status: 'Todo',
    cycleId: '',
    moduleId: '',
    releaseId: '',
    assigneeIds: [] as string[],
  });

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const elementStartPositions = useRef<Record<string, { x: number; y: number }>>({});
  const panStartPos = useRef({ x: 0, y: 0 });

  // 1. Manually register non-passive wheel event listener to support mouse wheel & touchpad canvas zoom (and prevent page zoom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const zoomFactor = e.ctrlKey ? 0.015 : 0.0015;
      const delta = -e.deltaY * zoomFactor;
      setZoom(prev => {
        const nextZoom = prev + delta;
        return Math.min(Math.max(nextZoom, 0.1), 3.0);
      });
    };

    const handleGesture = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
    canvas.addEventListener('gesturestart', handleGesture, { passive: false });
    canvas.addEventListener('gesturechange', handleGesture, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleNativeWheel);
      canvas.removeEventListener('gesturestart', handleGesture);
      canvas.removeEventListener('gesturechange', handleGesture);
    };
  }, [selectedReleaseId, isFullscreen, hasSelectedRelease]);

  // Find all recursive descendant element IDs
  const findDescendantIds = (parentId: string, all: DiagramElement[]): string[] => {
    const children = all.filter(e => e.parentId === parentId);
    return [
      ...children.map(c => c.id),
      ...children.flatMap(c => findDescendantIds(c.id, all))
    ];
  };

  // 2. Globally register mousemove and mouseup listeners to support robust, infinite drag/pan
  useEffect(() => {
    if (!draggedElementId && !isPanning) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (draggedElementId) {
        const dx = (e.clientX - dragStartPos.current.x) / zoom;
        const dy = (e.clientY - dragStartPos.current.y) / zoom;

        setNodes(prev =>
          prev.map(el => {
            const startPos = elementStartPositions.current[el.id];
            if (startPos) {
              return {
                ...el,
                position: {
                  x: Math.round(startPos.x + dx),
                  y: Math.round(startPos.y + dy)
                }
              };
            }
            return el;
          })
        );
      } else if (isPanning) {
        const dx = e.clientX - panStartPos.current.x;
        const dy = e.clientY - panStartPos.current.y;
        setPanX(prev => prev + dx);
        setPanY(prev => prev + dy);
        panStartPos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleGlobalMouseUp = () => {
      if (draggedElementId) {
        setDraggedElementId(null);
        setNodes(latestElements => {
          handleSaveBlueprint(latestElements, edges);
          return latestElements;
        });
      }
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggedElementId, isPanning, zoom, edges]);



  // V1 to V2 Migration Layer
  const migrateV1ToV2 = useCallback((parsed: any): DiagramDataV2 => {
    if (parsed && parsed.version === '2.0') {
      return parsed as DiagramDataV2;
    }

    const elements: DiagramElement[] = [];
    const connections: DiagramConnection[] = [];

    // Parse containers if present
    if (parsed && Array.isArray(parsed.containers)) {
      parsed.containers.forEach((c: any) => {
        elements.push({
          id: c.id || `container-${Date.now()}-${Math.random()}`,
          type: 'container',
          parentId: c.parent || c.parentId || null,
          position: { x: typeof c.x === 'number' ? c.x : 100, y: typeof c.y === 'number' ? c.y : 100 },
          size: { width: typeof c.width === 'number' ? c.width : 400, height: typeof c.height === 'number' ? c.height : 300 },
          label: c.label || 'Container Zone',
          description: c.description || '',
          tags: Array.isArray(c.tags) ? c.tags : [],
          style: {
            backgroundColor: c.style?.backgroundColor || 'rgba(255, 255, 255, 0.02)',
            borderColor: c.style?.borderColor || '#1e88e5',
            containerHeaderColor: c.style?.containerHeaderColor || 'rgba(30, 136, 229, 0.15)',
          },
        });
      });
    }

    // Parse nodes (or other types of diagram elements)
    if (parsed && Array.isArray(parsed.nodes)) {
      parsed.nodes.forEach((n: any) => {
        const type = n.type || 'node';
        elements.push({
          id: n.id || `node-${Date.now()}-${Math.random()}`,
          type: type as any,
          parentId: n.container || n.parent || n.parentId || null,
          position: { x: typeof n.x === 'number' ? n.x : 100, y: typeof n.y === 'number' ? n.y : 200 },
          size: {
            width: typeof n.width === 'number' ? n.width : (type === 'container' ? 400 : (type === 'group' ? 350 : 220)),
            height: typeof n.height === 'number' ? n.height : (type === 'container' ? 300 : (type === 'group' ? 250 : 140)),
          },
          label: n.label || 'Node',
          description: n.description || '',
          tags: Array.isArray(n.tags) ? n.tags : [],
          style: {
            role: n.role || n.type || 'agent',
            status: n.status || 'unassigned',
            nodeKey: n.nodeKey || toPythonKey(n.label || 'node'),
            backgroundColor: n.style?.backgroundColor,
            borderColor: n.style?.borderColor,
            containerHeaderColor: n.style?.containerHeaderColor,
          },
          issueId: n.issueId || undefined,
        });
      });
    }

    // Parse edges/connections
    if (parsed && Array.isArray(parsed.edges)) {
      parsed.edges.forEach((e: any) => {
        connections.push({
          id: e.id || `edge-${Date.now()}-${Math.random()}`,
          source: e.from || e.source,
          target: e.to || e.target,
          label: e.label || undefined,
          edgeType: e.edgeType || 'standard',
          fromNodeKey: e.fromNodeKey || undefined,
          toNodeKey: e.toNodeKey || undefined,
        });
      });
    } else if (parsed && Array.isArray(parsed.connections)) {
      parsed.connections.forEach((c: any) => {
        connections.push({
          id: c.id || `edge-${Date.now()}-${Math.random()}`,
          source: c.source,
          target: c.target,
          label: c.label || undefined,
          edgeType: c.edgeType || 'standard',
          fromNodeKey: c.fromNodeKey || undefined,
          toNodeKey: c.toNodeKey || undefined,
        });
      });
    }

    // Default template flow if empty
    if (elements.length === 0) {
      return {
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
    }

    return {
      version: '2.0',
      elements,
      connections,
    };
  }, []);

  useEffect(() => {
    if (docsLoading || docsData === undefined) {
      return;
    }
    if (blueprintDoc && blueprintDoc.content) {
      try {
        const parsed = JSON.parse(blueprintDoc.content);
        const migrated = migrateV1ToV2(parsed);
        setNodes(migrated.elements);
        setEdges(migrated.connections);
      } catch (e) {
        console.error('Failed to parse blueprint JSON:', e);
      }
    } else {
      const defaultData = migrateV1ToV2(null);
      setNodes(defaultData.elements);
      setEdges(defaultData.connections);
      // Auto-save default blueprint structure if missing from DB (workspace members only)
      const relId = selectedReleaseId || (sortedReleases.length > 0 ? sortedReleases[0].id : '');
      if (relId && !isGuest) {
        handleSaveBlueprint(defaultData.elements, defaultData.connections, relId);
      }
    }
  }, [docsLoading, docsData, blueprintDoc, migrateV1ToV2, selectedReleaseId, sortedReleases, isGuest]);

  // Save Blueprint State
  const handleSaveBlueprint = async (updatedElements = nodes, updatedConnections = edges, customReleaseId?: string) => {
    if (isGuest) {
      // Guests have read-only access and cannot mutate database blueprints
      return;
    }
    const targetReleaseId = customReleaseId || selectedReleaseId || (sortedReleases.length > 0 ? sortedReleases[0].id : '');
    if (!targetReleaseId || targetReleaseId.trim() === '') {
      console.warn('Cannot save Project Blueprint: No release ID available');
      return;
    }
    try {
      // Prior to saving, resolve node keys to edges so the database JSON is completely self-documenting
      const resolvedConnections = updatedConnections.map(c => {
        const fromNode = updatedElements.find(el => el.id === c.source);
        const toNode = updatedElements.find(el => el.id === c.target);
        return {
          ...c,
          edgeType: c.edgeType || 'standard',
          fromNodeKey: fromNode ? (fromNode.style?.nodeKey || toPythonKey(fromNode.label)) : undefined,
          toNodeKey: toNode ? (toNode.style?.nodeKey || toPythonKey(toNode.label)) : undefined,
        };
      });

      const serialized = JSON.stringify({
        version: '2.0',
        elements: updatedElements,
        connections: resolvedConnections,
      }, null, 2);

      await triggerUpsert({
        workspaceId,
        projectId,
        releaseId: targetReleaseId,
        type: 'ProjectBlueprint',
        title: 'Project Blueprint Specification',
        content: serialized,
      });
      await revalidateDocs();
    } catch (e) {
      if (!isGuest) {
        console.error('Failed to save Project Blueprint:', e);
      }
    }
  };

  // Sync Node statuses with actual database Issues in real time!
  const issues = useMemo(() => issuesData?.projectIssues || [], [issuesData]);
  useEffect(() => {
    if (issuesData && nodes.length > 0) {
      let changed = false;
      let unlinked = false;
      const updatedNodes = nodes.map(node => {
        if (node.issueId) {
          const pending = pendingStatusUpdatesRef.current[node.issueId];
          const linkedIssue = issues.find((i: any) => i.id === node.issueId);

          if (pending && Date.now() - pending.timestamp < 10000) {
            if (linkedIssue && linkedIssue.status === pending.status) {
              delete pendingStatusUpdatesRef.current[node.issueId];
            } else {
              // Retain user's optimistic status update without overriding!
              return node;
            }
          }

          if (linkedIssue) {
            const dbStatus = linkedIssue.status.toLowerCase();
            const nodeStatus = dbStatus === 'inprogress' ? 'inprogress' : dbStatus === 'inreview' ? 'inreview' : dbStatus;
            if (node.style.status !== nodeStatus) {
              changed = true;
              return {
                ...node,
                style: {
                  ...node.style,
                  status: nodeStatus as any,
                }
              };
            }
          } else {
            // Linked issue was deleted/missing from issuesData! Auto-heal / unlink
            changed = true;
            unlinked = true;
            return {
              ...node,
              issueId: undefined,
              style: {
                ...node.style,
                status: 'unassigned',
              }
            };
          }
        }
        return node;
      });
      if (changed) {
        setNodes(updatedNodes);
        if (unlinked) {
          handleSaveBlueprint(updatedNodes, edges);
        }
      }
    }
  }, [issuesData, issues]);

  // Auto-Layout Strategy for Aligning Elements Inside Containers and Globally
  const handleAutoLayout = () => {
    const laidOut = performAutoLayout(nodes, edges);
    setNodes(laidOut);
    handleSaveBlueprint(laidOut, edges);
  };

  // Node Drag Handlers
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (!isEditing) {
      e.preventDefault();
      setIsPanning(true);
      panStartPos.current = { x: e.clientX, y: e.clientY };
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(null);
      setActiveMenuNodeId(null);
      return;
    }

    // Do not drag if clicking interactive form inputs, textareas, or buttons
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'SELECT' ||
      target.closest('button') ||
      target.closest('a')
    ) {
      return;
    }

    e.preventDefault(); // Prevent text selection and default browser drag-and-drop behavior!
    e.stopPropagation();

    const element = nodes.find(n => n.id === nodeId);
    if (!element) {
      return;
    }

    setDraggedElementId(nodeId);
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
    dragStartPos.current = { x: e.clientX, y: e.clientY };

    // Record initial coordinates of this element and all of its descendants
    const descendants = findDescendantIds(nodeId, nodes);
    const startPositions: Record<string, { x: number; y: number }> = {};
    startPositions[nodeId] = { x: element.position.x, y: element.position.y };
    descendants.forEach(id => {
      const child = nodes.find(n => n.id === id);
      if (child) {
        startPositions[id] = { x: child.position.x, y: child.position.y };
      }
    });
    elementStartPositions.current = startPositions;
  };

  // Canvas Mouse Down (Pan)
  // Check if a click target lives inside a node card (has data-node-id ancestor)
  const isInsideNodeCard = (target: HTMLElement): boolean => {
    return !!target.closest('[data-node-id]');
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // If in edit mode and target is inside a node card, let the node's own mousedown handler deal with it
    if (isEditing && isInsideNodeCard(e.target as HTMLElement)) return;
    // Otherwise start panning
    e.preventDefault();
    setIsPanning(true);
    panStartPos.current = { x: e.clientX, y: e.clientY };
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setActiveMenuNodeId(null);
  };

  // Node Connection
  const handleConnectStart = (nodeId: string) => {
    if (!isEditing) return;
    setConnectFromId(nodeId);
  };

  const handleConnectEnd = (nodeId: string) => {
    if (!connectFromId || connectFromId === nodeId) {
      setConnectFromId(null);
      return;
    }
    // Check if connection already exists
    if (!edges.some(e => e.source === connectFromId && e.target === nodeId)) {
      const fromNode = nodes.find(n => n.id === connectFromId);
      const toNode = nodes.find(n => n.id === nodeId);
      const newEdge: DiagramConnection = {
        id: `e-${Date.now()}`,
        source: connectFromId,
        target: nodeId,
        edgeType: 'standard',
        fromNodeKey: fromNode ? fromNode.style.nodeKey : undefined,
        toNodeKey: toNode ? toNode.style.nodeKey : undefined,
      };
      const updatedEdges = [...edges, newEdge];
      setEdges(updatedEdges);
      handleSaveBlueprint(nodes, updatedEdges);
    }
    setConnectFromId(null);
  };

  // Add generic element
  const handleAddElement = (type: DiagramElement['type'], role?: ElementStyle['role']) => {
    const id = `el-${Date.now()}`;
    let label = '';
    let size = { width: 220, height: 140 };
    let style: ElementStyle = {};

    switch (type) {
      case 'node':
        const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Agent';
        label = `New ${roleLabel}`;
        style = {
          role: role || 'agent',
          status: 'unassigned',
          nodeKey: toPythonKey(label),
        };
        break;
      case 'container':
        label = 'New Container Zone';
        size = { width: 400, height: 300 };
        style = {
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderColor: '#1e88e5',
          borderStyle: 'solid',
          borderWidth: 2,
        };
        break;
      case 'group':
        label = 'New Group Boundary';
        size = { width: 350, height: 250 };
        style = {
          backgroundColor: 'transparent',
          borderColor: 'rgba(255, 255, 255, 0.25)',
          borderStyle: 'dashed',
          borderWidth: 1.5,
        };
        break;
    }

    const newElement: DiagramElement = {
      id,
      type,
      parentId: null,
      position: {
        x: Math.round(-panX + 250),
        y: Math.round(-panY + 200),
      },
      size,
      label,
      description: '',
      tags: [],
      style,
    };

    const updatedNodes = [...nodes, newElement];
    setNodes(updatedNodes);
    handleSaveBlueprint(updatedNodes, edges);
    setSelectedNodeId(id);
  };

  const handleDeleteNode = (nodeId: string) => {
    // If we delete a parent container, we orphan its children (parentId = null)
    const updatedNodes = nodes
      .filter(n => n.id !== nodeId)
      .map(n => n.parentId === nodeId ? { ...n, parentId: null } : n);

    const updatedEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    setNodes(updatedNodes);
    setEdges(updatedEdges);
    handleSaveBlueprint(updatedNodes, updatedEdges);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleDeleteEdge = (edgeId: string) => {
    const updatedEdges = edges.filter(e => e.id !== edgeId);
    setEdges(updatedEdges);
    handleSaveBlueprint(nodes, updatedEdges);
    if (selectedEdgeId === edgeId) setSelectedEdgeId(null);
  };

  useEffect(() => {
    const handleBlueprintAction = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail || {};
      const {
        actionType = 'UPDATE_NODE',
        label = '',
        role,
        status,
        description,
        releaseName,
        releaseId: targetReleaseIdFromEvent,
      } = detail;

      const matchedRelease = releaseName
        ? sortedReleases.find(r => r.name.toLowerCase().includes(releaseName.toLowerCase()))
        : undefined;
      const effectiveReleaseId = matchedRelease?.id || targetReleaseIdFromEvent || activeReleaseId;

      const rawStatus = (status || '').toLowerCase().replace(/[\s_-]+/g, '');
      const normalizedStatus =
        rawStatus === 'completed' || rawStatus === 'done' || rawStatus === 'finished'
          ? 'done'
          : rawStatus === 'inprogress'
          ? 'inprogress'
          : rawStatus === 'inreview'
          ? 'inreview'
          : rawStatus === 'testing'
          ? 'testing'
          : rawStatus === 'backlog'
          ? 'backlog'
          : rawStatus === 'todo'
          ? 'todo'
          : rawStatus || undefined;

      const issueStatusMap: Record<string, string> = {
        done: 'Done',
        inprogress: 'InProgress',
        inreview: 'InReview',
        testing: 'Testing',
        todo: 'Todo',
        backlog: 'Backlog',
      };

      if (actionType === 'UPDATE_NODE' || !actionType) {
        const search = (label || '').toLowerCase().trim();
        let targetIndex = -1;

        if (search) {
          targetIndex = nodes.findIndex(
            n =>
              n.label.toLowerCase() === search ||
              n.label.toLowerCase().includes(search) ||
              search.includes(n.label.toLowerCase()) ||
              (n.style?.nodeKey && (n.style.nodeKey.includes(search) || search.includes(n.style.nodeKey)))
          );
        }

        if (targetIndex === -1 && nodes.length > 0 && search) {
          const words = search.split(/\s+/).filter((w: string) => !['task', 'node', 'element', 'the', 'in', 'step'].includes(w));
          targetIndex = nodes.findIndex(n => {
            const nl = n.label.toLowerCase();
            return words.some((w: string) => nl.includes(w));
          });
        }

        if (targetIndex !== -1) {
          const targetNode = nodes[targetIndex];
          const updatedNode: DiagramElement = {
            ...targetNode,
            label: detail.newLabel || targetNode.label,
            description: description !== undefined ? description : targetNode.description,
            style: {
              ...targetNode.style,
              status: (normalizedStatus as any) || targetNode.style.status,
              role: (role as any) || targetNode.style.role,
            },
          };

          const updatedNodes = [...nodes];
          updatedNodes[targetIndex] = updatedNode;

          if (targetNode.issueId && normalizedStatus && issueStatusMap[normalizedStatus]) {
            try {
              await triggerUpdateIssue({
                workspaceId,
                id: targetNode.issueId,
                input: {
                  status: issueStatusMap[normalizedStatus] as any,
                },
              });
              await revalidateIssues();
            } catch (err) {
              console.error('Failed to update linked issue for blueprint node:', err);
            }
          }

          setNodes(updatedNodes);
          await handleSaveBlueprint(updatedNodes, edges, effectiveReleaseId);
          toast(`Updated "${targetNode.label}" status to ${normalizedStatus || 'updated'} on release ${matchedRelease?.name || currentReleaseName || 'active'}`);
        } else {
          toast(`Could not find blueprint node matching "${label}".`);
        }
      } else if (actionType === 'ADD_NODE') {
        const id = `el-${Date.now()}`;
        const newElement: DiagramElement = {
          id,
          type: 'node',
          parentId: null,
          position: {
            x: Math.round(-panX + 250),
            y: Math.round(-panY + 200),
          },
          size: { width: 220, height: 140 },
          label: label || 'New Agent Node',
          description: description || '',
          tags: [],
          style: {
            role: (role as any) || 'agent',
            status: (normalizedStatus as any) || 'todo',
            nodeKey: toPythonKey(label || 'new_agent_node'),
          },
        };
        const updatedNodes = [...nodes, newElement];
        setNodes(updatedNodes);
        await handleSaveBlueprint(updatedNodes, edges, effectiveReleaseId);
        toast(`Added new blueprint node "${newElement.label}"`);
      } else if (actionType === 'DELETE_NODE') {
        const search = (label || '').toLowerCase().trim();
        const targetNode = nodes.find(
          n => n.label.toLowerCase() === search || n.label.toLowerCase().includes(search)
        );
        if (targetNode) {
          handleDeleteNode(targetNode.id);
          toast(`Deleted blueprint node "${targetNode.label}"`);
        }
      }
    };

    window.addEventListener('workspace-copilot-blueprint-action', handleBlueprintAction);
    return () => {
      window.removeEventListener('workspace-copilot-blueprint-action', handleBlueprintAction);
    };
  }, [nodes, edges, activeReleaseId, sortedReleases, currentReleaseName, workspaceId, triggerUpdateIssue, revalidateIssues, handleSaveBlueprint, handleDeleteNode, panX, panY]);

  // Toggle Node Status (3-Dot menu action)
  const handleSetNodeStatus = async (nodeId: string, status: ElementStyle['status']) => {
    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode) return;

    const previousNodes = [...nodes];
    const updatedNodes = nodes.map(n => n.id === nodeId ? { ...n, style: { ...n.style, status } } : n);

    if (targetNode.issueId) {
      const dbStatusMap: Record<string, string> = {
        backlog: 'Backlog',
        todo: 'Todo',
        inprogress: 'InProgress',
        inreview: 'InReview',
        testing: 'Testing',
        done: 'Done',
        unassigned: 'Backlog',
      };
      const dbStatus = dbStatusMap[status || ''] || 'Todo';
      pendingStatusUpdatesRef.current[targetNode.issueId] = {
        status: dbStatus,
        timestamp: Date.now(),
      };
    }

    setNodes(updatedNodes);
    setActiveMenuNodeId(null);

    try {
      await handleSaveBlueprint(updatedNodes, edges);

      // If this node is linked to a Work Item, update the Work Item status in GraphQL DB as well!
      if (targetNode.issueId) {
        const dbStatusMap: Record<string, string> = {
          backlog: 'Backlog',
          todo: 'Todo',
          inprogress: 'InProgress',
          inreview: 'InReview',
          testing: 'Testing',
          done: 'Done',
          unassigned: 'Backlog',
        };
        const dbStatus = dbStatusMap[status || ''] || 'Todo';
        await triggerUpdateIssue({
          workspaceId,
          id: targetNode.issueId,
          input: { status: dbStatus } as any,
        });
        revalidateIssues();
      }
    } catch (err) {
      console.error('Failed to sync Work Item status from Blueprint:', err);
      if (targetNode.issueId) {
        delete pendingStatusUpdatesRef.current[targetNode.issueId];
      }
      setNodes(previousNodes);
    }
  };

  // Work Item Integration (Modal Submit)
  const handleCreateWorkItem = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    setWorkItemNodeId(nodeId);
    setIssueForm({
      title: node?.label || 'Blueprint Action Item',
      description: node?.description || 'Created automatically from Blueprint Flow Chart.',
      type: 'Task',
      priority: 'Medium',
      status: 'Todo',
      cycleId: '',
      moduleId: '',
      releaseId: '',
      assigneeIds: [],
    });
    setIsWorkItemModalOpen(true);
    setActiveMenuNodeId(null);
  };

  const handleWorkItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workItemNodeId) return;

    try {
      // Trigger issue mutation
      const res = await triggerCreateIssue({
        workspaceId,
        input: {
          projectId,
          title: issueForm.title,
          description: issueForm.description,
          type: issueForm.type,
          priority: issueForm.priority,
          status: issueForm.status,
          cycleId: issueForm.cycleId || undefined,
          moduleId: issueForm.moduleId || undefined,
          releaseId: issueForm.releaseId || undefined,
          assigneeIds: issueForm.assigneeIds,
        },
      });

      // Fetch the created issue ID
      revalidateIssues();
      const createdIssue = res?.createProjectIssue;
      if (createdIssue?.id) {
        // Link node to issue
        const updatedNodes = nodes.map(n =>
          n.id === workItemNodeId
            ? { ...n, issueId: createdIssue.id, label: issueForm.title, description: issueForm.description }
            : n
        );
        setNodes(updatedNodes);
        handleSaveBlueprint(updatedNodes, edges);
      }
      setIsWorkItemModalOpen(false);
      setWorkItemNodeId(null);
    } catch (err) {
      console.error('Failed to create Work Item from blueprint:', err);
    }
  };

  // Tags/Pills Actions
  const handleAddTag = (nodeId: string) => {
    if (!newTagText.trim()) return;
    const updatedNodes = nodes.map(n =>
      n.id === nodeId
        ? { ...n, tags: Array.from(new Set([...n.tags, newTagText.trim()])) }
        : n
    );
    setNodes(updatedNodes);
    handleSaveBlueprint(updatedNodes, edges);
    setNewTagText('');
    setIsAddTagOpen(null);
  };

  const handleRemoveTag = (nodeId: string, tag: string) => {
    const updatedNodes = nodes.map(n =>
      n.id === nodeId
        ? { ...n, tags: n.tags.filter(t => t !== tag) }
        : n
    );
    setNodes(updatedNodes);
    handleSaveBlueprint(updatedNodes, edges);
  };

  // Full Screen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.error('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error('Exit fullscreen failed:', err);
      });
    }
  };

  // AI Importer Action
  const handleImportSubmit = () => {
    try {
      // 1. Try JSON parsing
      if (importText.trim().startsWith('{') || importText.trim().startsWith('[')) {
        const parsed = JSON.parse(importText);
        const migrated = migrateV1ToV2(parsed);
        if (migrated.elements.length > 0) {
          const laidOut = performAutoLayout(migrated.elements, migrated.connections);
          setNodes(laidOut);
          setEdges(migrated.connections);
          handleSaveBlueprint(laidOut, migrated.connections);
          setIsImportModalOpen(false);
          return;
        }
      }

      // 2. Fallback to Mermaid parser
      const lines = importText.split('\n');
      const tempNodes: DiagramElement[] = [];
      const tempEdges: DiagramConnection[] = [];
      let nodeIdx = 0;

      lines.forEach(line => {
        const trimmed = line.trim();
        const edgeMatch = trimmed.match(/^([A-Za-z0-9_-]+)\s*--+>\s*([A-Za-z0-9_-]+)/) ||
          trimmed.match(/^([A-Za-z0-9_-]+)\s*--\s*(.*?)\s*-->\s*([A-Za-z0-9_-]+)/);

        if (edgeMatch) {
          const from = edgeMatch[1];
          const to = edgeMatch[3] || edgeMatch[2];
          const label = edgeMatch[3] ? edgeMatch[2] : undefined;

          if (!tempNodes.some(n => n.id === from)) {
            tempNodes.push({
              id: from,
              type: 'node',
              parentId: null,
              position: {
                x: 100 + (nodeIdx % 3) * 250,
                y: 150 + Math.floor(nodeIdx / 3) * 180,
              },
              size: { width: 220, height: 140 },
              label: from,
              description: '',
              tags: [],
              style: {
                role: 'agent',
                status: 'todo',
                nodeKey: toPythonKey(from),
              },
            });
            nodeIdx++;
          }
          if (!tempNodes.some(n => n.id === to)) {
            tempNodes.push({
              id: to,
              type: 'node',
              parentId: null,
              position: {
                x: 100 + (nodeIdx % 3) * 250,
                y: 150 + Math.floor(nodeIdx / 3) * 180,
              },
              size: { width: 220, height: 140 },
              label: to,
              description: '',
              tags: [],
              style: {
                role: 'tool',
                status: 'todo',
                nodeKey: toPythonKey(to),
              },
            });
            nodeIdx++;
          }

          const fromNode = tempNodes.find(n => n.id === from);
          const toNode = tempNodes.find(n => n.id === to);

          tempEdges.push({
            id: `edge-${tempEdges.length}-${Date.now()}`,
            source: from,
            target: to,
            label,
            edgeType: 'standard',
            fromNodeKey: fromNode ? fromNode.style.nodeKey : undefined,
            toNodeKey: toNode ? toNode.style.nodeKey : undefined,
          });
        } else {
          const nodeMatch = trimmed.match(/^([A-Za-z0-9_-]+)\s*\[(.*?)\]/);
          if (nodeMatch) {
            const id = nodeMatch[1];
            const label = nodeMatch[2];
            const existingIdx = tempNodes.findIndex(n => n.id === id);
            if (existingIdx !== -1) {
              tempNodes[existingIdx].label = label;
              tempNodes[existingIdx].style.nodeKey = toPythonKey(label);
            } else {
              tempNodes.push({
                id,
                type: 'node',
                parentId: null,
                position: {
                  x: 100 + (nodeIdx % 3) * 250,
                  y: 150 + Math.floor(nodeIdx / 3) * 180,
                },
                size: { width: 220, height: 140 },
                label,
                description: '',
                tags: [],
                style: {
                  role: 'agent',
                  status: 'todo',
                  nodeKey: toPythonKey(label),
                },
              });
              nodeIdx++;
            }
          }
        }
      });

      if (tempNodes.length > 0) {
        const laidOut = performAutoLayout(tempNodes, tempEdges);
        setNodes(laidOut);
        setEdges(tempEdges);
        handleSaveBlueprint(laidOut, tempEdges);
        setIsImportModalOpen(false);
      } else {
        alert('Could not parse JSON or Mermaid flowchart. Please make sure the structure is correct.');
      }
    } catch (e) {
      alert('Error parsing content: ' + e);
    }
  };

  const toggleAssignee = (id: string) => {
    setIssueForm(prev => {
      const active = prev.assigneeIds.includes(id);
      return {
        ...prev,
        assigneeIds: active
          ? prev.assigneeIds.filter(x => x !== id)
          : [...prev.assigneeIds, id],
      };
    });
  };

  const cycles = cyclesData?.projectCycles || [];
  const modules = modulesData?.projectModules || [];
  const workspaceMembers = membersData?.workspace?.members || [];

  // Show full Blueprint section skeleton on initial load (when queries are loading or data not yet cached)
  const isInitialLoading = hasSelectedRelease && (docsLoading || docsData === undefined);

  if (isInitialLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 0 24px 0' }}>
        {/* Skeleton Top Control Action Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderRadius: '16px',
          background: `linear-gradient(135deg, ${cssVar('backgroundSecondaryColor')} 0%, ${cssVar('backgroundPrimaryColor')} 100%)`,
          border: `1px solid ${cssVar('borderColor')}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: cssVar('borderColor'), opacity: 0.4, animation: 'pulse 1.5s infinite' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ width: '150px', height: '18px', borderRadius: '4px', background: cssVar('borderColor'), opacity: 0.5, animation: 'pulse 1.5s infinite' }} />
                <div style={{ width: '110px', height: '22px', borderRadius: '6px', background: cssVar('borderColor'), opacity: 0.3, animation: 'pulse 1.5s infinite' }} />
              </div>
              <div style={{ width: '240px', height: '12px', borderRadius: '4px', background: cssVar('borderColor'), opacity: 0.3, animation: 'pulse 1.5s infinite' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ width: '100px', height: '32px', borderRadius: '8px', background: cssVar('borderColor'), opacity: 0.4, animation: 'pulse 1.5s infinite' }} />
            <div style={{ width: '120px', height: '32px', borderRadius: '8px', background: cssVar('borderColor'), opacity: 0.4, animation: 'pulse 1.5s infinite' }} />
            <div style={{ width: '80px', height: '32px', borderRadius: '8px', background: cssVar('borderColor'), opacity: 0.4, animation: 'pulse 1.5s infinite' }} />
          </div>
        </div>

        {/* Skeleton Canvas Container & Right Inspector Sidebar */}
        <div style={{ height: '700px', display: 'flex', gap: '16px' }}>
          {/* Skeleton Canvas placing box */}
          <div style={{ flex: 1, borderRadius: '16px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundSecondaryColor'), padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '32px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
              <div style={{ width: '200px', height: '120px', borderRadius: '12px', border: `2px dashed ${cssVar('borderColor')}`, background: cssVar('backgroundPrimaryColor'), opacity: 0.6, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', animation: 'pulse 1.5s infinite' }}>
                <div style={{ width: '50%', height: '12px', borderRadius: '4px', background: cssVar('primaryColor'), opacity: 0.4 }} />
                <div style={{ width: '85%', height: '10px', borderRadius: '4px', background: cssVar('borderColor') }} />
                <div style={{ width: '65%', height: '10px', borderRadius: '4px', background: cssVar('borderColor') }} />
              </div>
              <div style={{ width: '60px', height: '2px', background: cssVar('borderColor'), opacity: 0.5 }} />
              <div style={{ width: '240px', height: '140px', borderRadius: '12px', border: `2px dashed ${cssVar('borderColor')}`, background: cssVar('backgroundPrimaryColor'), opacity: 0.6, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', animation: 'pulse 1.5s infinite' }}>
                <div style={{ width: '60%', height: '12px', borderRadius: '4px', background: '#a855f7', opacity: 0.4 }} />
                <div style={{ width: '90%', height: '10px', borderRadius: '4px', background: cssVar('borderColor') }} />
                <div style={{ width: '70%', height: '10px', borderRadius: '4px', background: cssVar('borderColor') }} />
              </div>
            </div>
            <span style={{ fontSize: '13px', color: cssVar('textSecondaryColor'), fontWeight: 600 }}>Loading Blueprint Architecture & Flow Graph...</span>
          </div>

          {/* Skeleton Right Sidebar */}
          <div style={{ width: '380px', borderRadius: '16px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundSecondaryColor'), padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${cssVar('borderColor')}`, paddingBottom: '12px' }}>
              <div style={{ flex: 1, height: '32px', borderRadius: '6px', background: cssVar('borderColor'), opacity: 0.5 }} />
              <div style={{ flex: 1, height: '32px', borderRadius: '6px', background: cssVar('borderColor'), opacity: 0.3 }} />
            </div>
            <div style={{ height: '20px', width: '120px', borderRadius: '4px', background: cssVar('borderColor'), opacity: 0.4 }} />
            <div style={{ height: '36px', width: '100%', borderRadius: '8px', background: cssVar('borderColor'), opacity: 0.3 }} />
            <div style={{ height: '120px', width: '100%', borderRadius: '8px', background: cssVar('borderColor'), opacity: 0.3 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: isFullscreen ? '16px' : '0 0 24px 0',
      position: isFullscreen ? 'fixed' : 'relative',
      top: isFullscreen ? 0 : 'auto',
      left: isFullscreen ? 0 : 'auto',
      width: isFullscreen ? '100vw' : '100%',
      height: isFullscreen ? '100vh' : 'auto',
      zIndex: isFullscreen ? 9999 : 1,
      backgroundColor: isFullscreen ? '#09090b' : 'transparent',
      transition: 'all 0.25s',
      cursor: draggedElementId ? 'grabbing' : isPanning ? 'grabbing' : (!isEditing ? 'grab' : 'default'),
    }}>

      {/* Control Action Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderRadius: isFullscreen ? 0 : '16px',
        background: `linear-gradient(135deg, ${cssVar('backgroundSecondaryColor')} 0%, ${cssVar('backgroundPrimaryColor')} 100%)`,
        borderBottom: isFullscreen ? `1px solid ${cssVar('borderColor')}` : 'none',
        border: isFullscreen ? 'none' : `1px solid ${cssVar('borderColor')}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: cssVar('primaryColor'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
              <path d="M15 3v18" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 style={{ margin: 0, fontWeight: 700 }}>Project Blueprint</h3>
              <select
                className={styles.select}
                style={{ padding: '2px 8px', fontSize: '11px', height: '24px', width: 'auto', border: `1px solid ${cssVar('borderColor')}`, borderRadius: '6px', backgroundColor: cssVar('backgroundPrimaryColor'), color: cssVar('textPrimaryColor') }}
                value={selectedReleaseId}
                onChange={(e) => setSelectedReleaseId(e.target.value)}
              >
                {sortedReleases.length === 0 ? (
                  <option value="">No Version Release Created</option>
                ) : (
                  <>
                    <option value="">Select Release Version...</option>
                    {sortedReleases.map(rel => (
                      <option key={rel.id} value={rel.id}>{rel.name}</option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <span style={{ fontSize: '12px', opacity: 0.6 }}>Interactive LangChain & LangGraph Flow Chart</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {!isShareMode && (
            isApprovedOrSigned ? (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                color: '#10b981',
              }}>
                Approved & Locked
              </div>
            ) : (
              <button
                disabled={!hasSelectedRelease}
                className={`${styles.btn} ${isEditing ? styles.btnPrimary : styles.btnSecondary}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: isEditing ? '#10b981' : undefined,
                  color: isEditing ? '#fff' : undefined,
                  fontWeight: 600,
                  opacity: !hasSelectedRelease ? 0.45 : 1,
                  cursor: !hasSelectedRelease ? 'not-allowed' : 'pointer',
                }}
                onClick={async () => {
                  if (isEditing) {
                    await handleSaveBlueprint();
                    setIsEditingState(false);
                    toast('Project Blueprint saved successfully');
                  } else {
                    setIsEditingState(true);
                  }
                }}
              >
                {isEditing ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    Save Blueprint
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit Blueprint
                  </>
                )}
              </button>
            )
          )}

          {/* Interactive Zoom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.04)', padding: '2px 8px', borderRadius: '8px', border: `1px solid ${cssVar('borderColor')}`, opacity: !hasSelectedRelease ? 0.45 : 1 }}>
            <button disabled={!hasSelectedRelease} className={styles.btn} style={{ padding: '4px 6px', fontSize: '10px', border: 'none', background: 'none', color: cssVar('textPrimaryColor'), cursor: !hasSelectedRelease ? 'not-allowed' : 'pointer' }} onClick={handleZoomOut} title="Zoom Out">-</button>
            <span style={{ fontSize: '10px', minWidth: '36px', textAlign: 'center', fontWeight: 600, color: cssVar('textSecondaryColor') }}>{Math.round(zoom * 100)}%</span>
            <button disabled={!hasSelectedRelease} className={styles.btn} style={{ padding: '4px 6px', fontSize: '10px', border: 'none', background: 'none', color: cssVar('textPrimaryColor'), cursor: !hasSelectedRelease ? 'not-allowed' : 'pointer' }} onClick={handleZoomIn} title="Zoom In">+</button>
            <button disabled={!hasSelectedRelease} className={styles.btn} style={{ padding: '4px 6px', fontSize: '10px', border: 'none', background: 'none', color: cssVar('primaryColor'), cursor: !hasSelectedRelease ? 'not-allowed' : 'pointer' }} onClick={handleResetZoom} title="Reset View">Reset Zoom</button>
          </div>

          {!isShareMode && (
            <button
              disabled={!hasSelectedRelease || isApprovedOrSigned}
              className={`${styles.btn} ${styles.btnSecondary}`}
              style={{
                opacity: (!hasSelectedRelease || isApprovedOrSigned) ? 0.45 : 1,
                cursor: (!hasSelectedRelease || isApprovedOrSigned) ? 'not-allowed' : 'pointer',
                pointerEvents: (!hasSelectedRelease || isApprovedOrSigned) ? 'none' : 'auto',
              }}
              onClick={() => {
                setImportText(JSON.stringify({ version: '2.0', elements: nodes, connections: edges }, null, 2));
                setIsImportModalOpen(true);
              }}
              title={isApprovedOrSigned ? 'Blueprint is approved and locked. Import/export is disabled.' : undefined}
            >
              Import/Export (JSON)
            </button>
          )}

          <button
            disabled={!hasSelectedRelease}
            className={`${styles.btn} ${styles.btnSecondary}`}
            style={{ opacity: !hasSelectedRelease ? 0.45 : 1, cursor: !hasSelectedRelease ? 'not-allowed' : 'pointer', pointerEvents: !hasSelectedRelease ? 'none' : 'auto' }}
            onClick={toggleFullScreen}
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
          </button>
        </div>
      </div>

      {/* Blueprint Content Panel */}
      {!hasSelectedRelease ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          minHeight: '520px',
          width: '100%',
          flex: 1,
          borderRadius: '16px',
          border: `1px solid ${cssVar('borderColor')}`,
          backgroundColor: cssVar('backgroundSecondaryColor'),
          padding: '40px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
              <path d="M15 3v18" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
            </svg>
          </div>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: cssVar('textPrimaryColor') }}>
            {sortedReleases.length === 0 ? 'No Version Release Created' : 'No Release Version Selected'}
          </h4>
          <p style={{ margin: 0, fontSize: '13px', color: cssVar('textSecondaryColor'), maxWidth: '440px', lineHeight: 1.5 }}>
            {sortedReleases.length === 0
              ? 'Please create a project release version in the Releases tab first to specify and build Project Blueprints.'
              : 'Please select a project release version from the dropdown above to view, edit, and interact with its Project Blueprint specification.'}
          </p>
        </div>
      ) : (
        /* Split Pane Layout */
        <div style={{ display: 'flex', gap: '20px', width: '100%', flex: 1, minHeight: '550px' }}>
        {/* Interactive Flow Chart Area */}
        <div
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          style={{
            flex: 1,
            height: isFullscreen ? 'calc(100vh - 100px)' : '550px',
            border: isFullscreen ? 'none' : `1px solid ${cssVar('borderColor')}`,
            borderRadius: isFullscreen ? 0 : '16px',
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: cssVar('backgroundSecondaryColor'),
            cursor: draggedElementId ? 'grabbing' : isPanning ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          <div
            id="canvas-grid"
            onMouseDown={handleCanvasMouseDown}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `radial-gradient(circle, ${cssVar('borderColor')} 1.5px, transparent 1.5px)`,
              backgroundSize: '24px 24px',
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            <svg style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '3000px',
              height: '2000px',
              overflow: 'visible',
              pointerEvents: 'none',
            }}>
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={cssVar('textSecondaryColor')} />
                </marker>
                <marker id="arrow-selected" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#c084fc" />
                </marker>
              </defs>

              {renderedEdges.map(edge => {
                const pathData = edgePathsMap[edge.id];
                if (!pathData) return null;
                const { path: pathD, midX, midY } = pathData;
                const isSelected = selectedEdgeId === edge.id;

                return (
                  <g
                    key={edge.id}
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdgeId(edge.id);
                      setSelectedNodeId(null);
                    }}
                  >
                    {/* Wider transparent overlay for much easier clicking */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={16}
                      style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    />

                    {/* Glowing highlight halo for selected edges */}
                    {isSelected && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#1e88e5"
                        strokeWidth={8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ opacity: 0.4, filter: 'blur(2px)', transition: 'all 0.15s' }}
                      />
                    )}

                    {/* Main connector line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={isSelected ? '#c084fc' : cssVar('borderColor')}
                      strokeWidth={isSelected ? 3.5 : 2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={edge.edgeType === 'conditional' ? '5,5' : undefined}
                      markerEnd={isSelected ? "url(#arrow-selected)" : "url(#arrow)"}
                      style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
                    />
                    {edge.label && (
                      <g>
                        <rect
                          x={midX - (edge.label.length * 6 + 12) / 2}
                          y={midY - 9}
                          width={edge.label.length * 6 + 12}
                          height={18}
                          fill={cssVar('backgroundPrimaryColor')}
                          rx="5"
                          stroke={isSelected ? '#c084fc' : '#1e88e5'}
                          strokeWidth="1"
                        />
                        <text
                          x={midX}
                          y={midY + 3}
                          fill={isSelected ? '#c084fc' : '#1e88e5'}
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {edge.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {(() => {
              // Sort elements: container first, then group, then node
              const drawOrder: Record<string, number> = { container: 1, group: 2, node: 3 };
              const sortedElements = [...nodes].sort((a, b) => {
                if (a.id === selectedNodeId) return 1;
                if (b.id === selectedNodeId) return -1;
                return (drawOrder[a.type] || 3) - (drawOrder[b.type] || 3);
              });

              return sortedElements.map(node => {
                const isNodeSelected = selectedNodeId === node.id;
                const isMenuOpen = activeMenuNodeId === node.id;

                if (node.type === 'container') {
                  return (
                    <div
                      key={node.id}
                      data-node-id={node.id}
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      style={{
                        position: 'absolute',
                        left: `${node.position.x}px`,
                        top: `${node.position.y}px`,
                        width: `${node.size.width}px`,
                        height: `${node.size.height}px`,
                        borderRadius: '12px',
                        background: node.style.backgroundColor || 'rgba(24, 24, 27, 0.45)',
                        backdropFilter: 'blur(8px)',
                        border: isNodeSelected ? `2.5px solid #1e88e5` : `1.5px solid ${node.style.borderColor || 'rgba(30, 136, 229, 0.3)'}`,
                        boxShadow: isNodeSelected ? '0 0 20px rgba(30, 136, 229, 0.3)' : '0 4px 16px rgba(0,0,0,0.4)',
                        color: '#fff',
                        cursor: isEditing ? (draggedElementId === node.id ? 'grabbing' : 'grab') : (isPanning ? 'grabbing' : 'grab'),
                        zIndex: activeMenuNodeId === node.id ? 9999 : (isNodeSelected ? 100 : 2),
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{
                        background: node.style.containerHeaderColor || 'rgba(30, 136, 229, 0.15)',
                        padding: '8px 12px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 700,
                        fontSize: '12px',
                        userSelect: 'none',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isEditing && <span style={{ opacity: 0.5 }}>⠿</span>}
                          <span>{node.label}</span>
                        </div>
                        {!isShareMode && (
                          <div style={{ display: 'flex', gap: '4px', position: 'relative' }}>
                            <button
                              data-menu-btn-id={node.id}
                              className="quick-actions-btn"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (activeMenuNodeId === node.id) {
                                  setActiveMenuNodeId(null);
                                } else {
                                  updateNodeMenuPosition(node.id, e.currentTarget);
                                  setActiveMenuNodeId(node.id);
                                }
                              }}
                              style={{
                                background: isMenuOpen ? 'rgba(255, 255, 255, 0.15)' : 'none',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '4px',
                                borderRadius: '4px',
                                transition: 'all 0.2s',
                              }}
                              title="Quick actions"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="12" cy="5" r="1" />
                                <circle cx="12" cy="19" r="1" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                      {node.description && (
                        <div style={{ padding: '8px 12px', fontSize: '10px', opacity: 0.5 }}>
                          {node.description}
                        </div>
                      )}
                    </div>
                  );
                }

                if (node.type === 'group') {
                  return (
                    <div
                      key={node.id}
                      data-node-id={node.id}
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      style={{
                        position: 'absolute',
                        left: `${node.position.x}px`,
                        top: `${node.position.y}px`,
                        width: `${node.size.width}px`,
                        height: `${node.size.height}px`,
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: isNodeSelected ? `2px solid #1e88e5` : `1.5px dashed rgba(255, 255, 255, 0.25)`,
                        boxShadow: isNodeSelected ? '0 0 12px rgba(30, 136, 229, 0.2)' : 'none',
                        color: '#fff',
                        cursor: isEditing ? (draggedElementId === node.id ? 'grabbing' : 'grab') : (isPanning ? 'grabbing' : 'grab'),
                        zIndex: isNodeSelected ? 100 : 1,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div style={{
                        padding: '6px 10px',
                        fontSize: '11px',
                        color: 'rgba(255, 255, 255, 0.4)',
                        fontWeight: 600,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        userSelect: 'none',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isEditing && <span>⠿</span>}
                          <span>{node.label}</span>
                        </div>
                        {!isShareMode && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '10px' }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                // Default Node Card
                const statusValue = node.style?.status || (node.issueId ? 'todo' : 'unassigned');
                const statusColor = STATUS_COLORS[statusValue] || STATUS_COLORS.unassigned;

                return (
                  <div
                    key={node.id}
                    data-node-id={node.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    style={{
                      position: 'absolute',
                      left: `${node.position.x}px`,
                      top: `${node.position.y}px`,
                      width: '220px',
                      borderRadius: '14px',
                      background: statusColor.bg,
                      border: isNodeSelected ? `2.5px solid #7c3aed` : `1.5px solid ${statusColor.border}`,
                      boxShadow: isNodeSelected ? '0 0 16px rgba(124, 58, 237, 0.4)' : '0 4px 12px rgba(0,0,0,0.06)',
                      color: '#0f172a',
                      cursor: isEditing ? (draggedElementId === node.id ? 'grabbing' : 'grab') : (isPanning ? 'grabbing' : 'grab'),
                      zIndex: activeMenuNodeId === node.id ? 9999 : (isNodeSelected ? 100 : 10),
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isEditing && (
                          <span style={{
                            cursor: draggedElementId === node.id ? 'grabbing' : 'grab',
                            fontSize: '11px',
                            opacity: 0.5,
                            userSelect: 'none',
                          }} title="Drag Card">
                            ⠿
                          </span>
                        )}
                        <span style={{
                          fontSize: '9px',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          letterSpacing: '0.5px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: '#fff',
                          border: `1px solid ${statusColor.border}`,
                          color: statusColor.text,
                        }}>
                          {statusValue === 'inprogress' ? 'IN PROGRESS' : statusValue === 'inreview' ? 'IN REVIEW' : statusValue.toUpperCase()}
                        </span>
                      </div>

                      {!isShareMode && (
                        <div style={{ display: 'flex', gap: '4px', position: 'relative' }}>
                          <button
                            data-menu-btn-id={node.id}
                            className="quick-actions-btn"
                            onMouseDown={(e) => { e.stopPropagation(); }}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (activeMenuNodeId === node.id) {
                                setActiveMenuNodeId(null);
                              } else {
                                updateNodeMenuPosition(node.id, e.currentTarget);
                                setActiveMenuNodeId(node.id);
                              }
                            }}
                            style={{
                              background: isMenuOpen ? 'rgba(0, 0, 0, 0.08)' : 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: statusColor.text || cssVar('textSecondaryColor'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px',
                              borderRadius: '4px',
                              transition: 'all 0.2s',
                            }}
                            title="Quick actions"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="12" cy="5" r="1" />
                              <circle cx="12" cy="19" r="1" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{node.label}</div>
                      {node.style.nodeKey && (
                        <div style={{
                          fontSize: '9px',
                          fontFamily: 'Consolas, Monaco, monospace',
                          color: '#7c3aed',
                          marginTop: '2px',
                          background: 'rgba(124, 58, 237, 0.08)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          display: 'inline-block'
                        }}>
                          key: {node.style.nodeKey}
                        </div>
                      )}
                      {node.description && <div style={{ fontSize: '11px', color: '#334155', marginTop: '4px', lineHeight: '1.4' }}>{node.description}</div>}

                      {(() => {
                        const linkedIssue = issues.find(i => i.id === node.issueId);
                        if (linkedIssue) {
                          return (
                            <div style={{
                              fontSize: '10px',
                              color: '#059669',
                              background: 'rgba(5, 150, 105, 0.08)',
                              border: '1px solid rgba(5, 150, 105, 0.15)',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              marginTop: '8px',
                              fontWeight: 600,
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap'
                            }} title={`Linked Work Item: ${linkedIssue.title}`}>
                              Linked: {linkedIssue.title}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {node.tags.map(tag => (
                        <span
                          key={tag}
                          style={{
                            fontSize: '9px',
                            background: '#fff',
                            border: '1px solid rgba(0, 0, 0, 0.08)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            color: '#7c3aed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          {tag}
                          {isEditing && (
                            <button
                              onClick={() => handleRemoveTag(node.id, tag)}
                              style={{ border: 'none', background: 'none', padding: 0, color: '#ef4444', fontSize: '8px', cursor: 'pointer' }}
                            >
                              x
                            </button>
                          )}
                        </span>
                      ))}

                      {isEditing && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {isAddTagOpen === node.id ? (
                            <input
                              type="text"
                              autoFocus
                              value={newTagText}
                              onChange={(e) => setNewTagText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(node.id); }}
                              onBlur={() => handleAddTag(node.id)}
                              style={{
                                fontSize: '9px',
                                width: '60px',
                                background: '#fff',
                                border: '1px solid #7c3aed',
                                borderRadius: '3px',
                                color: '#0f172a',
                                padding: '1px 4px',
                              }}
                            />
                          ) : (
                            <button
                              onClick={() => setIsAddTagOpen(node.id)}
                              style={{
                                fontSize: '9px',
                                background: '#fff',
                                border: '1px solid rgba(0, 0, 0, 0.08)',
                                color: '#7c3aed',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              + tag
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {isEditing && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid rgba(0,0,0,0.06)',
                        paddingTop: '6px',
                        marginTop: '4px',
                      }}>
                        <button
                          onClick={() => handleConnectStart(node.id)}
                          style={{
                            fontSize: '9px',
                            background: connectFromId === node.id ? '#7c3aed' : 'rgba(0, 0, 0, 0.05)',
                            border: 'none',
                            color: connectFromId === node.id ? '#fff' : '#475569',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          {connectFromId === node.id ? 'Select Target' : 'Link'}
                        </button>

                        {connectFromId && connectFromId !== node.id && (
                          <button
                            onClick={() => handleConnectEnd(node.id)}
                            style={{
                              fontSize: '9px',
                              background: '#059669',
                              border: 'none',
                              color: '#fff',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            Target
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>

          {selectedEdgeId && isEditing && (
            <div style={{
              position: 'absolute',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(24, 24, 27, 0.95)',
              padding: '12px 20px',
              borderRadius: '12px',
              border: `1.5px solid #1e88e5`,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              zIndex: 1000,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}>
              <span style={{ fontSize: '12px', color: cssVar('textPrimaryColor'), fontWeight: 700 }}>Connection Title:</span>
              <input
                type="text"
                style={{
                  width: '180px',
                  height: '28px',
                  fontSize: '11px',
                  padding: '4px 8px',
                  background: cssVar('backgroundPrimaryColor'),
                  color: cssVar('textPrimaryColor'),
                  border: `1.5px solid ${cssVar('borderColor')}`,
                  borderRadius: '6px',
                  outline: 'none',
                }}
                value={edges.find(e => e.id === selectedEdgeId)?.label || ''}
                onChange={(e) => {
                  const updatedEdges = edges.map(edge =>
                    edge.id === selectedEdgeId ? { ...edge, label: e.target.value } : edge
                  );
                  setEdges(updatedEdges);
                  handleSaveBlueprint(nodes, updatedEdges);
                }}
                placeholder="Type link label (e.g., success)..."
              />

              <button
                className={`${styles.btn} ${styles.btnDanger}`}
                style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600 }}
                onClick={() => handleDeleteEdge(selectedEdgeId)}
              >
                Delete Link
              </button>
            </div>
          )}

        </div>
      </div>
    )}

      {isImportModalOpen && createPortal(
        <div
          className={styles.modalOverlay}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setIsImportModalOpen(false)}
        >
          <div className={styles.modal} style={{ maxWidth: '640px', width: '92%', backgroundColor: cssVar('backgroundPrimaryColor'), borderRadius: '20px', border: `1px solid ${cssVar('borderColor')}`, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)', overflow: 'hidden', zIndex: 10001 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader} style={{ padding: '20px 24px', borderBottom: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundSecondaryColor'), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 className={styles.modalTitle} style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: cssVar('textPrimaryColor') }}>
                  Import / Export Flow Chart
                </h3>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                  JSON / Mermaid
                </span>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: cssVar('textSecondaryColor') }} onClick={() => setIsImportModalOpen(false)}>
                <CloseIconSvg />
              </button>
            </div>
            <div className={styles.modalBody} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '13px', color: cssVar('textSecondaryColor'), lineHeight: 1.5 }}>
                Paste a Mermaid.js diagram or custom flow JSON structure below to build the flowchart instantly.
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
                      const content = JSON.stringify({
                        version: "2.0",
                        elements: [
                          {
                            id: "node-1",
                            type: "node",
                            label: "[Node 1 Name]",
                            description: "[Node 1 Description]",
                            tags: [],
                            position: { x: 100, y: 100 },
                            size: { width: 220, height: 140 },
                            style: {
                              role: "agent",
                              status: "todo",
                              nodeKey: "node_1_key"
                            }
                          },
                          {
                            id: "node-2",
                            type: "node",
                            label: "[Node 2 Name]",
                            description: "[Node 2 Description]",
                            tags: [],
                            position: { x: 400, y: 100 },
                            size: { width: 220, height: 140 },
                            style: {
                              role: "tool",
                              status: "todo",
                              nodeKey: "node_2_key"
                            }
                          }
                        ],
                        connections: [
                          {
                            id: "edge-1",
                            source: "node-1",
                            target: "node-2",
                            label: "[Connection Label]",
                            edgeType: "standard"
                          }
                        ]
                      }, null, 2);
                      const blob = new Blob([content], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'blueprint_format_template.json';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    title="Download skeleton Blueprint JSON template"
                  >
                    JSON (.json)
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => {
                      const content = `graph TD;\n  NodeA[ [Node A Name] ] --> NodeB[ [Node B Name] ];\n  NodeB --> NodeC[ [Node C Name] ];`;
                      const blob = new Blob([content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'blueprint_format_template.mmd';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    title="Download skeleton Mermaid template"
                  >
                    Mermaid (.mmd)
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <textarea
                  className={styles.textarea}
                  style={{
                    minHeight: '220px',
                    fontFamily: 'monospace',
                    fontSize: '12.5px',
                    backgroundColor: cssVar('backgroundPrimaryColor'),
                    color: cssVar('textPrimaryColor'),
                    border: `1px solid ${cssVar('borderColor')}`,
                    borderRadius: '12px',
                    padding: '14px',
                    lineHeight: 1.5,
                  }}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`// Option 1: Standard Mermaid Format\ngraph TD;\n  NodeA[ [Node A Name] ] --> NodeB[ [Node B Name] ];\n\n// Option 2: JSON Structure Format\n{\n  "version": "2.0",\n  "elements": [\n    {\n      "id": "node-1",\n      "type": "node",\n      "label": "[Node 1 Name]",\n      "description": "[Node 1 Description]",\n      "tags": [],\n      "position": { "x": 100, "y": 100 },\n      "size": { "width": 220, "height": 140 },\n      "style": { "role": "agent", "status": "todo", "nodeKey": "node_1_key" }\n    }\n  ],\n  "connections": []\n}`}
                />
              </div>
            </div>
            <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundSecondaryColor') }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ borderRadius: '10px', padding: '8px 18px', fontSize: '13px' }} onClick={() => setIsImportModalOpen(false)}>Cancel</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ backgroundColor: cssVar('primaryColor'), borderRadius: '10px', padding: '8px 20px', fontSize: '13px', fontWeight: 600 }} onClick={handleImportSubmit}>Confirm Import</button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {activeMenuNodeId && !isShareMode && nodeMenuPos && (() => {
        const activeNode = nodes.find(n => n.id === activeMenuNodeId);
        if (!activeNode) return null;

        if (activeNode.type === 'container') {
          return createPortal(
            <div
              className="quick-actions-menu"
              style={{
                position: 'fixed',
                top: nodeMenuPos.top !== undefined ? `${nodeMenuPos.top}px` : 'auto',
                bottom: nodeMenuPos.bottom !== undefined ? `${nodeMenuPos.bottom}px` : 'auto',
                right: nodeMenuPos.right !== undefined ? `${nodeMenuPos.right}px` : 'auto',
                maxHeight: nodeMenuPos.maxHeight ? `${nodeMenuPos.maxHeight}px` : '280px',
                overflowY: 'auto',
                backgroundColor: cssVar('backgroundSecondaryColor'),
                color: cssVar('textPrimaryColor'),
                border: `1px solid ${cssVar('borderColor')}`,
                borderRadius: '8px',
                width: '150px',
                boxShadow: '0 16px 36px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)',
                zIndex: 100000,
                display: 'flex',
                flexDirection: 'column',
                padding: '4px 0',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNode(activeNode.id);
                  setActiveMenuNodeId(null);
                }}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#ef4444',
                  padding: '8px 12px',
                  textAlign: 'left',
                  fontSize: '11px',
                  cursor: 'pointer',
                  width: '100%',
                  fontWeight: 500,
                }}
              >
                Delete Container
              </button>
            </div>,
            document.body
          );
        }

        // Default Node Card Menu
        return createPortal(
          <div
            className="quick-actions-menu"
            style={{
              position: 'fixed',
              top: nodeMenuPos.top !== undefined ? `${nodeMenuPos.top}px` : 'auto',
              bottom: nodeMenuPos.bottom !== undefined ? `${nodeMenuPos.bottom}px` : 'auto',
              right: nodeMenuPos.right !== undefined ? `${nodeMenuPos.right}px` : 'auto',
              maxHeight: nodeMenuPos.maxHeight ? `${nodeMenuPos.maxHeight}px` : '280px',
              overflowY: 'auto',
              backgroundColor: cssVar('backgroundSecondaryColor'),
              color: cssVar('textPrimaryColor'),
              border: `1px solid ${cssVar('borderColor')}`,
              borderRadius: '8px',
              width: '180px',
              boxShadow: '0 16px 36px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)',
              zIndex: 100000,
              display: 'flex',
              flexDirection: 'column',
              padding: '4px 0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '9px', textTransform: 'uppercase', color: cssVar('textSecondaryColor'), padding: '6px 12px', fontWeight: 700, letterSpacing: '0.5px' }}>
              Workflow Status
            </div>
            {Object.keys(STATUS_COLORS).map(st => {
              const displayLabel = st === 'inprogress' ? 'In Progress' : st === 'inreview' ? 'In Review' : st === 'unassigned' ? 'Unassigned' : st.charAt(0).toUpperCase() + st.slice(1);
              const isSelected = (activeNode.style?.status || (activeNode.issueId ? 'todo' : 'unassigned')) === st;
              return (
                <button
                  key={st}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetNodeStatus(activeNode.id, st as any);
                  }}
                  style={{
                    border: 'none',
                    background: isSelected ? 'rgba(30, 136, 229, 0.08)' : 'none',
                    color: isSelected ? cssVar('primaryColor') : cssVar('textPrimaryColor'),
                    padding: '6px 12px',
                    textAlign: 'left',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: isSelected ? 600 : 'normal',
                  }}
                >
                  {displayLabel}
                </button>
              );
            })}

            <div style={{ borderTop: `1px solid ${cssVar('borderColor')}`, margin: '4px 0' }} />

            {!activeNode.issueId ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateWorkItem(activeNode.id);
                  setActiveMenuNodeId(null);
                }}
                style={{ border: 'none', background: 'none', color: cssVar('primaryColor'), padding: '8px 12px', textAlign: 'left', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
              >
                Create Work Item
              </button>
            ) : (
              <div style={{ padding: '8px 12px', fontSize: '10px', color: '#10b981', fontWeight: 600 }}>
                Linked to Work Item
              </div>
            )}

            {isEditing && (
              <>
                <div style={{ borderTop: `1px solid ${cssVar('borderColor')}`, margin: '4px 0' }} />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNode(activeNode.id);
                    setActiveMenuNodeId(null);
                  }}
                  style={{ border: 'none', background: 'none', color: '#ef4444', padding: '8px 12px', textAlign: 'left', fontSize: '11px', cursor: 'pointer' }}
                >
                  Delete Node
                </button>
              </>
            )}
          </div>,
          document.body
        );
      })()}

      {isWorkItemModalOpen && createPortal(
        <div
          className={styles.modalOverlay}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setIsWorkItemModalOpen(false)}
        >
          <div className={styles.modal} style={{ maxWidth: '600px', width: '90%', zIndex: 10001 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create Work Item from Node</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }} onClick={() => setIsWorkItemModalOpen(false)}>
                <CloseIconSvg />
              </button>
            </div>
            <form onSubmit={handleWorkItemSubmit}>
              <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Title</label>
                  <input
                    type="text"
                    className={styles.input}
                    required
                    value={issueForm.title}
                    onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Description</label>
                  <textarea
                    className={styles.textarea}
                    value={issueForm.description}
                    onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                  />
                </div>

                <div className={styles.formRow} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Type</label>
                    <select
                      className={styles.select}
                      value={issueForm.type}
                      onChange={(e) => setIssueForm({ ...issueForm, type: e.target.value })}
                    >
                      <option value="Task">Task</option>
                      <option value="Bug">Bug</option>
                      <option value="Feature">Feature</option>
                      <option value="Improvement">Improvement</option>
                      <option value="Research">Research</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Priority</label>
                    <select
                      className={styles.select}
                      value={issueForm.priority}
                      onChange={(e) => setIssueForm({ ...issueForm, priority: e.target.value })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formRow} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Status</label>
                    <select
                      className={styles.select}
                      value={issueForm.status}
                      onChange={(e) => setIssueForm({ ...issueForm, status: e.target.value })}
                    >
                      <option value="Backlog">Backlog</option>
                      <option value="Todo">Todo</option>
                      <option value="InProgress">In Progress</option>
                      <option value="InReview">In Review</option>
                      <option value="Testing">Testing</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Sprint/Cycle</label>
                    <select
                      className={styles.select}
                      value={issueForm.cycleId}
                      onChange={(e) => setIssueForm({ ...issueForm, cycleId: e.target.value })}
                    >
                      <option value="">None</option>
                      {cycles.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formRow} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Functional Module</label>
                    <select
                      className={styles.select}
                      value={issueForm.moduleId}
                      onChange={(e) => setIssueForm({ ...issueForm, moduleId: e.target.value })}
                    >
                      <option value="">None</option>
                      {modules.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Release/Version</label>
                    <select
                      className={styles.select}
                      value={issueForm.releaseId}
                      onChange={(e) => setIssueForm({ ...issueForm, releaseId: e.target.value })}
                    >
                      <option value="">None</option>
                      {releases.map((r: any) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Assignees (Select to Toggle)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', backgroundColor: cssVar('backgroundSecondaryColor'), border: `1px solid ${cssVar('borderColor')}`, borderRadius: '8px' }}>
                    {workspaceMembers.map((member: any) => {
                      const isSelected = issueForm.assigneeIds.includes(member.id);
                      return (
                        <div
                          key={member.id}
                          onClick={() => toggleAssignee(member.id)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            borderRadius: '6px',
                            border: `1px solid ${isSelected ? cssVar('primaryColor') : cssVar('borderColor')}`,
                            backgroundColor: isSelected ? `${cssVar('primaryColor')}22` : cssVar('backgroundPrimaryColor'),
                            color: isSelected ? cssVar('primaryColor') : cssVar('textPrimaryColor'),
                            cursor: 'pointer',
                          }}
                        >
                          {member.name || member.email}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsWorkItemModalOpen(false)}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ backgroundColor: cssVar('primaryColor') }}>Submit Create</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
