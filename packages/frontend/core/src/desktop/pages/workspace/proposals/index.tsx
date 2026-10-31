import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useService } from '@toeverything/infra';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { cssVar } from '@toeverything/theme';
import { toast } from '@affine/component';
import YAML from 'yaml';
import * as styles from './styles.css';
import { applyCopilotEditToYaml } from '../../../components/copilot/yaml-copilot-editor';

import {
  getAllLinePaths,
  findLineIndexForPath,
  getPlaceholderText,
  safeInsertItem,
  safeDeleteItem,
  safeAddItem,
} from '../documents-shared/yaml-utils';
import {
  parseInlineFormatting,
  htmlToMarkdown,
  MarkdownRenderer,
} from '../documents-shared/markdown-utils';
import { CloseIconSvg } from './components/icons';
import { BumpModal } from './components/bump-modal';
import { OtpModal } from './components/otp-modal';
import { ProposalModal } from './components/proposal-modal';
import { CopilotDrawer } from './components/copilot-drawer';
import { useWorkspaceCopilot } from '../../../components/copilot/copilot-context-provider';

// Type definition for proposals loaded from database
interface Proposal {
  id: string;
  workspaceId: string;
  proposalId: string;
  version: string;
  title: string;
  preparedFor: string;
  preparedDate: string;
  content: string;
  projectIdConnect?: string;
}

function getInitialsFromName(name: string): string {
  if (!name || typeof name !== 'string') return 'NM';
  const clean = name
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim();
  if (!clean) return 'NM';
  const words = clean.split(/ +/).filter(Boolean);
  if (words.length === 0) return 'NM';
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  const first = words[0].charAt(0).toUpperCase();
  const last = words[words.length - 1].charAt(0).toUpperCase();
  return first + last;
}

function renderDistributionList(dataObj: any): string {
  const list = dataObj?.document_info?.distribution_list || dataObj?.cover?.distribution_list || [];
  const isOnlyOne = list.length <= 1;
  return list.map((item: any, idx: number) => {
    const name = item?.name || '';
    const initials = getInitialsFromName(name) || item?.initials || 'NM';
    const role = item?.role || '';
    
    const deleteBtn = isOnlyOne ? '' : `
      <button class="list-action-btn delete" onclick="event.stopPropagation(); window.parent.postMessage({type: 'PROPOSAL_LIST_DELETE', listType: 'distribution_list', index: ${idx}}, '*')" title="Delete member">×</button>
    `;

    return `
      <div class="avatar-block" style="position: relative;">
        <div class="avatar-circle">${initials}</div>
        <div class="avatar-info">
          <span data-key="document_info.distribution_list.${idx}.name" class="editable-proposal-field avatar-name" contenteditable="true">${name}</span>
          <span data-key="document_info.distribution_list.${idx}.role" class="editable-proposal-field avatar-role" contenteditable="true">${role}</span>
        </div>
        <div class="list-action-btn-col" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%);">
          <button class="list-action-btn" onclick="event.stopPropagation(); window.parent.postMessage({type: 'PROPOSAL_LIST_ADD', listType: 'distribution_list', index: ${idx}}, '*')" title="Insert member">+</button>
          ${deleteBtn}
        </div>
      </div>
    `;
  }).join('\n') + `
    <div class="list-actions-footer" style="padding: 10px 0;">
      <button class="add-member-btn" onclick="event.stopPropagation(); window.parent.postMessage({type: 'PROPOSAL_LIST_ADD_NEW', listType: 'distribution_list'}, '*')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Add Distribution Member
      </button>
    </div>
  `;
}

function renderDeliverablesList(dataObj: any): string {
  const list = dataObj?.deliverables || [];
  const isOnlyOneStage = list.length <= 1;
  return list.map((stageItem: any, stageIdx: number) => {
    const stageName = stageItem?.stage || '';
    const items = stageItem?.items || [];
    const isOnlyOneItem = items.length <= 1;
    
    const itemsHtml = items.map((item: any, itemIdx: number) => {
      const name = item?.name || '';
      const format = item?.format || '';
      const deleteItemBtn = isOnlyOneItem ? '' : `
        <button class="list-action-btn delete" onclick="event.stopPropagation(); window.parent.postMessage({type: 'PROPOSAL_LIST_DELETE', listType: 'deliverables_items', stageIndex: ${stageIdx}, itemIndex: ${itemIdx}}, '*')" title="Delete item">×</button>
      `;

      return `
        <div class="deliv-item-card" style="position: relative;">
          <span data-key="deliverables.${stageIdx}.items.${itemIdx}.name" class="editable-proposal-field deliv-item-name" contenteditable="true">${name}</span>
          <span data-key="deliverables.${stageIdx}.items.${itemIdx}.format" class="editable-proposal-field deliv-item-format" contenteditable="true">${format}</span>
          <div class="list-action-btn-col" style="position: absolute; right: 8px; top: 8px;">
            <button class="list-action-btn" onclick="event.stopPropagation(); window.parent.postMessage({type: 'PROPOSAL_LIST_ADD', listType: 'deliverables_items', stageIndex: ${stageIdx}, itemIndex: ${itemIdx}}, '*')" title="Insert item">+</button>
            ${deleteItemBtn}
          </div>
        </div>
      `;
    }).join('\n');
    
    const deleteStageBtn = isOnlyOneStage ? '' : `
      <button class="list-action-btn delete" onclick="event.stopPropagation(); window.parent.postMessage({type: 'PROPOSAL_LIST_DELETE', listType: 'deliverables_stage', index: ${stageIdx}}, '*')" title="Delete Stage">×</button>
    `;

    return `
      <div class="glass-panel deliv-group-card" style="position: relative; margin-bottom: 20px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <div data-key="deliverables.${stageIdx}.stage" class="editable-proposal-field deliv-group-title" contenteditable="true" style="font-size: 16px; font-weight: 700; color: #1e3a8a;">${stageName}</div>
          <div class="list-action-btn-col">
            <button class="list-action-btn" onclick="event.stopPropagation(); window.parent.postMessage({type: 'PROPOSAL_LIST_ADD', listType: 'deliverables_stage', index: ${stageIdx}}, '*')" title="Insert Stage">+</button>
            ${deleteStageBtn}
          </div>
        </div>
        <div class="deliv-items-grid">
          ${itemsHtml}
        </div>
        <div class="list-actions-footer" style="margin-top: 12px;">
          <button class="add-new-btn" onclick="event.stopPropagation(); window.parent.postMessage({type: 'PROPOSAL_LIST_ADD_NEW', listType: 'deliverables_items', stageIndex: ${stageIdx}}, '*')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Item
          </button>
        </div>
      </div>
    `;
  }).join('\n') + `
    <div class="list-actions-footer" style="padding: 10px 0;">
      <button class="add-new-btn" onclick="event.stopPropagation(); window.parent.postMessage({type: 'PROPOSAL_LIST_ADD_NEW', listType: 'deliverables_stage'}, '*')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Add Deliverable Stage
      </button>
    </div>
  `;
}

function renderTimelinePhases(dataObj: any): string {
  const list = dataObj?.timeline?.milestones || [];
  const N = list.length || 1;
  const itemWidth = 100 / N;
  const isOnlyOne = list.length <= 1;
  
  return list.map((item: any, idx: number) => {
    const phase = item?.phase || '';
    const duration = item?.duration || '';
    const startMargin = idx * itemWidth;
    
    const deletePhaseBtn = isOnlyOne ? '' : `
      <button class="list-action-btn delete" onclick="event.stopPropagation(); window.parent.postMessage({type: 'PROPOSAL_LIST_DELETE', listType: 'timeline_milestones', index: ${idx}}, '*')" title="Delete phase">×</button>
    `;

    return `
      <div class="timeline-bar-line" style="position: relative;">
        <div class="timeline-phase-info">
          <div data-key="timeline.milestones.${idx}.phase" class="editable-proposal-field" contenteditable="true" style="font-weight: 600;">${phase}</div>
          <div data-key="timeline.milestones.${idx}.duration" class="editable-proposal-field timeline-phase-duration" contenteditable="true">${duration}</div>
        </div>
        <div class="timeline-progress-track">
          <div class="timeline-progress-fill" style="width: ${itemWidth}%; margin-left: ${startMargin}%;"></div>
        </div>
        <div class="list-action-btn-col" style="position: absolute; right: 10px; top: 10px;">
          <button class="list-action-btn" onclick="event.stopPropagation(); window.parent.postMessage({type: 'PROPOSAL_LIST_ADD', listType: 'timeline_milestones', index: ${idx}}, '*')" title="Insert phase">+</button>
          ${deletePhaseBtn}
        </div>
      </div>
    `;
  }).join('\n') + `
    <div class="list-actions-footer" style="padding: 10px 0;">
      <button class="add-new-btn" onclick="event.stopPropagation(); window.parent.postMessage({type: 'PROPOSAL_LIST_ADD_NEW', listType: 'timeline_milestones'}, '*')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Add Timeline Phase
      </button>
    </div>
  `;
}

function renderDeliveryGates(dataObj: any): string {
  const list = dataObj?.timeline?.milestones || [];
  const isOnlyOne = list.length <= 1;
  return list.map((item: any, idx: number) => {
    const phase = item?.phase || '';
    const milestone = item?.milestone || '';
    const duration = item?.duration || '';
    const gateNumStr = String(idx + 1).padStart(2, '0');
    
    const deleteGateBtn = isOnlyOne ? '' : `
      <button class="list-action-btn delete" onclick="event.stopPropagation(); window.parent.postMessage({type: 'PROPOSAL_LIST_DELETE', listType: 'timeline_milestones', index: ${idx}}, '*')" title="Delete gate">×</button>
    `;

    return `
      <div class="glass-panel milestone-price-card" style="position: relative; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div class="milestone-price-left" style="display: flex; align-items: center; gap: 15px;">
          <div class="milestone-price-num">${idx + 1}</div>
          <div>
            <div data-key="timeline.milestones.${idx}.phase" class="editable-proposal-field milestone-price-desc" contenteditable="true">${phase}</div>
            <div class="milestone-price-trigger">Trigger: <span data-key="timeline.milestones.${idx}.milestone" class="editable-proposal-field" contenteditable="true">${milestone}</span></div>
          </div>
        </div>
        <div class="milestone-price-right" style="text-align: right;">
          <div data-key="timeline.milestones.${idx}.duration" class="editable-proposal-field milestone-price-amount" contenteditable="true" style="font-size: 14pt; font-weight: 700; color: #2563eb;">${duration}</div>
          <div class="milestone-price-share">Target Gate ${gateNumStr}</div>
        </div>
        <div class="list-action-btn-col" style="position: absolute; right: 10px; top: 10px;">
          <button class="list-action-btn" onclick="event.stopPropagation(); window.parent.postMessage({type: 'PROPOSAL_LIST_ADD', listType: 'timeline_milestones', index: ${idx}}, '*')" title="Insert gate">+</button>
          ${deleteGateBtn}
        </div>
      </div>
    `;
  }).join('\n') + `
    <div class="list-actions-footer" style="padding: 10px 0;">
      <button class="add-new-btn" onclick="event.stopPropagation(); window.parent.postMessage({type: 'PROPOSAL_LIST_ADD_NEW', listType: 'timeline_milestones'}, '*')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Add Delivery Gate Phase
      </button>
    </div>
  `;
}

import {
  useCompanyProfile,
  DEFAULT_COMPANY_PROFILE,
  resolveCompanyLogo,
  getCompanyFieldStaticVal,
  updateCompanyProfileInHtmlDom,
  type CompanyProfile,
} from '../documents-shared/use-company-profile';

// Helper to inject YAML data into template placeholders
// Handles both object keys and numeric array indices (e.g. kpis.0.value)
function injectData(templateHtml: string, dataObj: any, companyProfile?: CompanyProfile): string {
  if (!templateHtml) return '';
  const cp = companyProfile || DEFAULT_COMPANY_PROFILE;
  let html = updateCompanyProfileInHtmlDom(templateHtml, cp, dataObj);

  // 1. Replaces for list fields
  html = html.replace(/\{\{distribution_list_items\}\}/g, () => {
    return `<div id="distribution-list-container">${renderDistributionList(dataObj)}</div>`;
  });

  html = html.replace(/\{\{version_history_rows\}\}/g, () => {
    const list = dataObj?.document_info?.version_history || [];
    return list.map((item: any) => {
      return `
        <tr>
          <td class="ver-num">${item?.version || ''}</td>
          <td>${item?.date || ''}</td>
          <td>${item?.author || ''}</td>
          <td>${item?.description || ''}</td>
        </tr>
      `;
    }).join('\n');
  });

  html = html.replace(/\{\{deliverables_list\}\}/g, () => {
    return `<div id="deliverables-list-container">${renderDeliverablesList(dataObj)}</div>`;
  });

  html = html.replace(/\{\{timeline_phases\}\}/g, () => {
    return `<div id="timeline-list-container">${renderTimelinePhases(dataObj)}</div>`;
  });

  html = html.replace(/\{\{delivery_gates\}\}/g, () => {
    return `<div id="delivery-gates-container">${renderDeliveryGates(dataObj)}</div>`;
  });

  // 2. Generic replace for single fields
  const resHtml = html.replace(/\{\{([^}]+)\}\}/g, (_match, pathStr) => {
    const cleanPath = pathStr.trim();
    if (
      cleanPath === 'distribution_list_items' ||
      cleanPath === 'version_history_rows' ||
      cleanPath === 'deliverables_list' ||
      cleanPath === 'timeline_phases' ||
      cleanPath === 'delivery_gates'
    ) {
      return '';
    }

    const companyStatic = getCompanyFieldStaticVal(cleanPath, cp, dataObj);
    if (companyStatic !== null) {
      return `<span class="locked-company-field" contenteditable="false" data-company-field="${cleanPath}">${companyStatic}</span>`;
    }

    const path = cleanPath.split('.');
    let val = dataObj;
    for (const p of path) {
      if (val && typeof val === 'object') {
        // Handle numeric path segments as array indices
        const idx = /^\d+$/.test(p) ? parseInt(p, 10) : p;
        val = val[idx];
      } else {
        val = undefined;
        break;
      }
    }
    const hasValue = val !== undefined && val !== null && String(val).trim() !== '';
    let displayVal = hasValue ? parseInlineFormatting(String(val)) : getPlaceholderText(cleanPath);
    if (cleanPath === 'cover.title') {
      displayVal = displayVal.replace(/\s+/g, '<br>');
    }
    // Wrap it in a span with data-key and class name
    return `<span data-key="${cleanPath}" class="editable-proposal-field" contenteditable="true">${displayVal}</span>`;
  });

  return updateCompanyProfileInHtmlDom(resHtml, cp, dataObj);
}

// Helper to extract presented_by company_name from YAML content dynamically
function getPreparedBy(p: Proposal): string {
  try {
    const data = YAML.parse(p.content);
    return data?.cover?.presented_by?.company_name || data?.cover?.prepared_by?.company_name || data?.cover?.presented_by?.lead || 'Brightloop Software';
  } catch (e) {
    return 'Brightloop Software';
  }
}

function getDescriptionForProposal(p: Proposal): string {
  try {
    const data = YAML.parse(p.content);
    const history = data?.document_info?.version_history || [];
    const item = history.find((h: any) => String(h.version) === String(p.version));
    return item?.description || '';
  } catch (e) {
    return '';
  }
}


// Extra styles and scripts to inject into the iframe for editing and selection listening
const scriptToInject = `
<style>
.editable-proposal-field {
  border-radius: 3px;
  transition: background 0.15s, outline 0.15s;
  outline: none;
  cursor: text;
  min-width: 15px;
  display: inline-block;
  pointer-events: auto !important;
}
.editable-proposal-field:hover {
  background-color: rgba(37, 99, 235, 0.06);
  outline: 1px dashed rgba(37, 99, 235, 0.35);
}
.editable-proposal-field:focus {
  background-color: rgba(37, 99, 235, 0.08);
  outline: 1.5px solid rgba(37, 99, 235, 0.55);
}
.locked-company-field {
  pointer-events: none !important;
  user-select: text !important;
}
footer, .footer-container, .page-footer, .footer-strip, .footer {
  user-select: text !important;
}
footer *, .footer-container *, .page-footer *, .footer-strip *, .footer * {
  contenteditable: false !important;
  pointer-events: auto !important;
  user-select: text !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  border-color: transparent !important;
}
footer .editable-proposal-field,
.footer-container .editable-proposal-field,
.page-footer .editable-proposal-field,
.footer-strip .editable-proposal-field,
.footer .editable-proposal-field {
  outline: none !important;
  background: transparent !important;
  cursor: default !important;
  pointer-events: none !important;
}
foreignObject, .svg-editable-container {
  pointer-events: auto !important;
}
@keyframes flash-highlight {
  0% { background-color: rgba(251, 191, 36, 0.4); box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.6); }
  100% { background-color: transparent; box-shadow: none; }
}
.highlight-flash {
  animation: flash-highlight 1.5s ease-out;
  border-radius: 2px;
}
.list-action-btn-col {
  opacity: 0;
  transition: opacity 0.2s;
  display: flex;
  gap: 4px;
  pointer-events: auto !important;
  z-index: 10;
}
.avatar-block:hover .list-action-btn-col,
.deliv-item-card:hover .list-action-btn-col,
.deliv-group-card:hover .list-action-btn-col,
.timeline-bar-line:hover .list-action-btn-col,
.milestone-price-card:hover .list-action-btn-col {
  opacity: 1;
}
.list-action-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: all 0.15s;
  padding: 0;
  pointer-events: auto !important;
}
.list-action-btn:hover {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
  transform: scale(1.1);
}
.list-action-btn.delete:hover {
  background: #ef4444;
  color: #ffffff;
  border-color: #ef4444;
}
.list-actions-footer {
  pointer-events: auto !important;
}
.add-new-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #2563eb;
  background: rgba(37, 99, 235, 0.05);
  border: 1px dashed rgba(37, 99, 235, 0.4);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
  outline: none;
  pointer-events: auto !important;
}
.add-new-btn:hover {
  background: rgba(37, 99, 235, 0.1);
  border-color: #2563eb;
  color: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08);
}
.add-new-btn:active {
  transform: translateY(0);
}
.add-member-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
  transition: all 0.2s ease;
  outline: none;
  font-family: inherit;
  pointer-events: auto !important;
}
.add-member-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.3);
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
}
.add-member-btn:active {
  transform: translateY(0);
}
@media print {
  .list-action-btn, .list-action-btn-col, .list-actions-footer, .add-new-btn, .add-member-btn {
    display: none !important;
  }
}
</style>
<script>
function parseInlineFormatting(valStr) {
  let formatted = valStr.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\\*([^*]+)\\*/g, '<em>$1</em>');
  formatted = formatted.replace(/\\\`([^\\\`]+)\\\`/g, '<code>$1</code>');
  formatted = formatted.replace(/\\n/g, '<br>');
  return formatted;
}

function getInitialsFromName(name) {
  if (!name || typeof name !== 'string') return 'NM';
  var clean = name
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim();
  if (!clean) return 'NM';
  var words = clean.split(/ +/).filter(Boolean);
  if (words.length === 0) return 'NM';
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  var first = words[0].charAt(0).toUpperCase();
  var last = words[words.length - 1].charAt(0).toUpperCase();
  return first + last;
}

function getPlaceholderText(key) {
  if (key === 'cover.title_platform') return 'Platform';
  const lastPart = key.split('.').pop() || key;
  const words = lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const formatted = words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  return '[Enter ' + formatted + ']';
}

// Make fields editable
document.querySelectorAll('.editable-proposal-field').forEach(el => {
  el.contentEditable = "true";
});

document.querySelectorAll('.locked-company-field').forEach(el => {
  el.contentEditable = "false";
});

document.querySelectorAll('footer *, .footer-container *, .page-footer *, .footer-strip *, .footer *').forEach(function(el) {
  el.removeAttribute('contenteditable');
  el.contentEditable = "false";
  el.classList.remove('editable-proposal-field');
  el.classList.add('locked-company-field');
});

// Broadcast edits back to parent window
document.addEventListener('input', (event) => {
  let rawTarget = event.target;
  if (!rawTarget) return;
  const target = rawTarget.closest ? rawTarget.closest('[data-key]') : (rawTarget.parentElement ? rawTarget.parentElement.closest('[data-key]') : null);
  if (target) {
    const key = target.getAttribute('data-key');
    const value = target.innerHTML;

    // Real-time update of distribution list initials circle
    if (key && key.includes('distribution_list') && key.endsWith('.name')) {
      const avatarBlock = target.closest('.avatar-block');
      if (avatarBlock) {
        const circle = avatarBlock.querySelector('.avatar-circle');
        if (circle) {
          const rawText = target.innerText || target.textContent || '';
          circle.textContent = getInitialsFromName(rawText);
        }
      }
    }

    // Sync short title edits immediately to other page headers
    if (key === 'metadata.short_title') {
      document.querySelectorAll('[data-key="metadata.short_title"]').forEach(el => {
        if (el !== target && el.innerHTML !== value) {
          el.innerHTML = value;
        }
      });
    }

    window.parent.postMessage({
      type: 'PROPOSAL_EDIT',
      key: key,
      value: value
    }, '*');
  }
});

// Handle click on editable field to sync with YAML editor on right
document.addEventListener('click', (event) => {
  const target = event.target.closest('.editable-proposal-field');
  if (target && target.hasAttribute('data-key')) {
    const key = target.getAttribute('data-key');
    window.parent.postMessage({
      type: 'PROPOSAL_FIELD_CLICK',
      key: key
    }, '*');
  }
});

// Broadcast text selections for AI Copilot
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  if (selectedText) {
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      const isBold = document.queryCommandState('bold');
      const isItalic = document.queryCommandState('italic');
      const isUnderline = document.queryCommandState('underline');
      
      let isCode = false;
      let node = range.commonAncestorContainer;
      while (node && node.nodeName !== 'BODY') {
        if (node.nodeName === 'CODE') {
          isCode = true;
          break;
        }
        node = node.parentNode;
      }

      window.parent.postMessage({
        type: 'PROPOSAL_SELECTION',
        text: selectedText,
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        },
        states: {
          bold: isBold,
          italic: isItalic,
          underline: isUnderline,
          code: isCode
        }
      }, '*');
    }
  } else {
    window.parent.postMessage({
      type: 'PROPOSAL_SELECTION_CLEAR'
    }, '*');
  }
});

// Handle selection replacement and field updates from parent
window.addEventListener('message', (event) => {
  if (event.data?.type === 'FORMAT_COMMAND') {
    const cmd = event.data.command;
    if (cmd === 'strong') {
      document.execCommand('bold', false, null);
    } else if (cmd === 'em') {
      document.execCommand('italic', false, null);
    } else if (cmd === 'u') {
      document.execCommand('underline', false, null);
    } else if (cmd === 'code') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let codeNode = null;
        let node = range.commonAncestorContainer;
        while (node && node.nodeName !== 'BODY') {
          if (node.nodeName === 'CODE') {
            codeNode = node;
            break;
          }
          node = node.parentNode;
        }
        if (codeNode) {
          const textNode = document.createTextNode(codeNode.textContent);
          codeNode.parentNode.replaceChild(textNode, codeNode);
        } else {
          const code = document.createElement('code');
          code.textContent = selection.toString();
          range.deleteContents();
          range.insertNode(code);
        }
      }
    }
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      let parent = selection.getRangeAt(0).commonAncestorContainer;
      if (parent.nodeType === Node.TEXT_NODE) {
        parent = parent.parentNode;
      }
      const editableField = parent.closest('.editable-proposal-field');
      if (editableField) {
        editableField.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    document.dispatchEvent(new Event('selectionchange'));
  } else if (event.data?.type === 'REPLACE_SELECTION') {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const div = document.createElement('div');
      div.innerHTML = event.data.value;
      const fragment = document.createDocumentFragment();
      while (div.firstChild) {
        fragment.appendChild(div.firstChild);
      }
      range.insertNode(fragment);
      
      // Trigger input event to synchronize changes back
      let parent = range.commonAncestorContainer;
      if (parent.nodeType === Node.TEXT_NODE) {
        parent = parent.parentNode;
      }
      const editableField = parent.closest('.editable-proposal-field');
      if (editableField) {
        editableField.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  } else if (event.data?.type === 'UPDATE_FIELDS') {
    const data = event.data.data;

    // 1. Update Distribution List
    if (event.data.distributionHtml) {
      const renderedCount = document.querySelectorAll('#distribution-list-container .avatar-block').length;
      const dataCount = (data.document_info?.distribution_list || data.cover?.distribution_list || []).length;
      if (renderedCount !== dataCount) {
        const container = document.getElementById('distribution-list-container');
        if (container) {
          container.innerHTML = event.data.distributionHtml;
        }
      }
    }

    // Sync distribution list avatar initials circles
    const distList = data?.document_info?.distribution_list || data?.cover?.distribution_list || [];
    const avatarBlocks = document.querySelectorAll('#distribution-list-container .avatar-block');
    avatarBlocks.forEach((block, idx) => {
      const circle = block.querySelector('.avatar-circle');
      const item = distList[idx];
      if (circle && item && item.name) {
        const newInitials = getInitialsFromName(item.name);
        if (circle.textContent !== newInitials) {
          circle.textContent = newInitials;
        }
      }
    });

    // 2. Update Deliverables List
    if (event.data.deliverablesHtml) {
      const renderedStages = document.querySelectorAll('#deliverables-list-container .deliv-group-card').length;
      const renderedItems = document.querySelectorAll('#deliverables-list-container .deliv-item-card').length;
      const dataStages = (data.deliverables || []).length;
      const dataItems = (data.deliverables || []).reduce((acc, stage) => acc + (stage?.items || []).length, 0);
      if (renderedStages !== dataStages || renderedItems !== dataItems) {
        const container = document.getElementById('deliverables-list-container');
        if (container) {
          container.innerHTML = event.data.deliverablesHtml;
        }
      }
    }

    // 3. Update Timeline Phases
    if (event.data.timelineHtml) {
      const renderedCount = document.querySelectorAll('#timeline-list-container .timeline-bar-line').length;
      const dataCount = (data.timeline?.milestones || []).length;
      if (renderedCount !== dataCount) {
        const container = document.getElementById('timeline-list-container');
        if (container) {
          container.innerHTML = event.data.timelineHtml;
        }
      }
    }

    // 4. Update Delivery Gates
    if (event.data.deliveryGatesHtml) {
      const renderedCount = document.querySelectorAll('#delivery-gates-container .milestone-price-card').length;
      const dataCount = (data.timeline?.milestones || []).length;
      if (renderedCount !== dataCount) {
        const container = document.getElementById('delivery-gates-container');
        if (container) {
          container.innerHTML = event.data.deliveryGatesHtml;
        }
      }
    }

    document.querySelectorAll('.editable-proposal-field').forEach(el => {
      const key = el.getAttribute('data-key');
      if (!key) return;
      const path = key.split('.');
      let val = data;
      for (const p of path) {
        if (val && typeof val === 'object') {
          const idx = /^\d+$/.test(p) ? parseInt(p, 10) : p;
          val = val[idx];
        } else {
          val = undefined;
          break;
        }
      }
      const hasValue = val !== undefined && val !== null && String(val).trim() !== '';
      const formattedVal = hasValue ? parseInlineFormatting(String(val)) : getPlaceholderText(key);
      if (document.activeElement === el) return;
      if (el.innerHTML !== formattedVal) {
        el.innerHTML = formattedVal;
      }
    });

    // Update short title elements in headers
    const shortTitle = data?.metadata?.short_title || '';
    const formattedShortTitle = shortTitle.trim() !== '' ? parseInlineFormatting(shortTitle) : getPlaceholderText('metadata.short_title');
    document.querySelectorAll('[data-key="metadata.short_title"]').forEach(el => {
      if (document.activeElement === el) return;
      if (el.innerHTML !== formattedShortTitle) {
        el.innerHTML = formattedShortTitle;
      }
    });

    // Trigger header/footer refresh
    if (typeof applyEnterpriseHeadersAndFooters === 'function') {
      applyEnterpriseHeadersAndFooters();
    }
  } else if (event.data?.type === 'HIGHLIGHT_FIELD') {
    const key = event.data.key;
    const el = document.querySelector(\`.editable-proposal-field[data-key="\${key}"]\`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('highlight-flash');
      void el.offsetWidth; // force reflow
      el.classList.add('highlight-flash');
    }
  }
});
</script>
`;

const fallbackTemplateHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Technical Proposal</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap">
  <style>
    body {
      font-family: 'IBM Plex Sans', sans-serif;
      padding: 40px;
      background: #f8f9fb;
      color: #1f2937;
      line-height: 1.5;
    }
    .page-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 60px;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.05);
    }
    h1 {
      font-size: 32px;
      font-weight: 800;
      color: #2563eb;
      margin-bottom: 8px;
    }
    h3 {
      font-size: 18px;
      font-weight: 600;
      color: #4b5563;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    p {
      color: #4b5563;
      margin-bottom: 16px;
    }
    .editable-proposal-field {
      outline: none;
      border-bottom: 1px dashed rgba(37, 99, 235, 0.4);
      padding: 2px 4px;
      transition: background-color 0.2s;
    }
    .editable-proposal-field:hover {
      background-color: rgba(37, 99, 235, 0.05);
    }
    .editable-proposal-field:focus {
      background-color: rgba(37, 99, 235, 0.1);
      border-bottom-style: solid;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div style="font-size: 12px; font-weight: 700; color: #2563eb; letter-spacing: 1px; text-transform: uppercase;">
      Technical Proposal
    </div>
    <h1>{{cover.title}}</h1>
    <p>{{cover.tagline}}</p>
    
    <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
      <div>
        <small style="font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase;">Prepared For</small>
        <div style="font-weight: 600; font-size: 15px; margin-top: 4px;">{{cover.prepared_for.company_name}}</div>
      </div>
      <div>
        <small style="font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase;">Prepared By</small>
        <div style="font-weight: 600; font-size: 15px; margin-top: 4px;">{{cover.presented_by.company_name}}</div>
      </div>
    </div>
    
    <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
      <div>
        <small style="font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase;">Date</small>
        <div style="font-weight: 600; font-size: 15px; margin-top: 4px;">{{metadata.date}}</div>
      </div>
    </div>
  </div>
</body>
</html>
`;

const fallbackYaml = `metadata:
  proposal_id: "PROP-2026-218045"
  version: "1.2"
  short_title: "AI AGENT PM PROPOSAL"
  confidentiality: "Strictly Confidential"
  status: "Under Review"
  date: "June 1, 2026"

cover:
  proposal_tag: "Technical Proposal"
  title: "Integrated<br>Enterprise<br>Intelligence"
  title_platform: "Platform"
  subtitle: "A purpose-built Knowledge Graph and Autonomous AI Agent Orchestration platform, designed after rigorous operational diagnostics—delivering automated scheduling and dynamic task execution across Example Company Inc.'s enterprise workflows."
  tagline: "Enterprise Knowledge Graph, AI Routing Optimisation, and Operational Intelligence Platform designed to improve logistics efficiency and decision-making."
  project_duration: "6 Months"
  prepared_for:
    company_name: "Example Company Inc."
  presented_by:
    company_name: "Brightloop Software"

document_info:
  distribution_list:
    - name: "Sarah Jenkins"
      initials: "SJ"
      role: "Chief Information Officer · Example Company Inc. (Sponsor)"
    - name: "Marcus Chen"
      initials: "MC"
      role: "VP of Engineering · Example Company Inc."
    - name: "Brightloop Admin"
      initials: "BA"
      role: "Managing Director · Brightloop Software"
  version_history:
    - version: "1.0"
      date: "15 May 2026"
      author: "Brightloop Operations"
      description: "Initial draft following workflow diagnostic workshops and telemetry audits."
    - version: "1.1"
      date: "25 May 2026"
      author: "Brightloop Operations"
      description: "Updated core agent orchestration schemas and database specs."
    - version: "1.2"
      date: "1 June 2026"
      author: "Brightloop Operations"
      description: "Finalised timeline milestones and security alignment guidelines for client review."
  research_validation: "Research Validation: This proposal is underpinned by a 3-week workflow diagnostic study of Example Company's project tracking and a feasibility simulation conducted on historical ticket dependencies. All engineering recommendations in this document are derived from empirical analysis, not assumptions."

executive_summary:
  intro: "Based on our diagnostic evaluation, Example Company requires an automated orchestration platform that dynamically routes project tasks and coordinates autonomous agent execution against real-time operational contingencies."
  context_narrative: "Example Company Inc. operates a complex software development and systems engineering workflow that processes over 1,000 tasks daily across multiple business units. Legacy project tools have resulted in a 24.2% increase in scheduling overhead and a 15.6% decrease in milestone completion rates. Dynamic updates are blocked by fragmented project tracking silos."
  challenge_narrative: "Traditional project management systems cannot dynamically schedule complex dependencies or assign tasks based on developer skills, real-time workload profiling, and context history. An enterprise-grade workflow ontology is required to ingest task events, model constraints dynamically, and resolve scheduling issues autonomously."
  solution_narrative: "Brightloop Software proposes the Autonomous AI Agent Project Management Platform—integrating a semantic task graph with specialized LLM worker agents and real-time execution pipelines. This is not simple boilerplate software; every workflow engine decision is grounded in Example Company's operational data."
  metrics:
    - value: "30-35%"
      label: "Admin Overhead Reduction"
    - value: "Sub-second"
      label: "Task Routing Latency"
    - value: "100%"
      label: "Workflow Traceability"
    - value: ">99.9%"
      label: "Platform Reliability"

workflow_research:
  intro: "Prior to formulating this technical proposal, Brightloop Software conducted a three-week deep-dive workflow diagnostic study into Example Company Inc.'s project tracking systems and developer execution streams. By parsing historical task histories and mapping workflow dependency states, we identified key bottlenecks and verified opportunities for AI-driven task orchestration."
  research_duration_days: 21
  research_sessions: 32
  systems_analyzed: 5
  audit_duration_label: "Audit Duration"
  audit_duration_desc: "Auditing JIRA histories and task updates"
  interviews_label: "Stakeholder Interviews"
  interviews_desc: "With product owners, tech leads, and developers"
  systems_label: "Workflow Databases"
  systems_desc: "JIRA, Slack logs, git commit hooks, and ERP repositories"
  stages:
    - title: "1. Diagnostic Audit"
      desc: "Days 1-7 · JIRA Logs"
    - title: "2. System Mapping"
      desc: "Days 8-14 · Telemetry"
    - title: "3. AI Simulations"
      desc: "Days 15-21 · Feasibility"
    - title: "4. Custom Blueprint"
      desc: "Engineering Spec Out"
  findings:
    - title: "Task Routing Overhead"
      description: "Manual task sorting and ticket assignment introduce an average delay of 4.5 hours per sprint block. High-cardinality task dependency paths exhaust project manager capacity, causing delayed handoffs."
    - title: "Context Isolation"
      description: "Project context and technical specification metrics are fragmented across five separate operational tools. Without a central semantic RAG layer, autonomous agents cannot retrieve context needed for task execution."

project_overview:
  research_methodology: "Brightloop does not deliver templated software. We find a problem first, research it deeply, then solve it. For this engagement, we conducted a 3-week diagnostic study including 32 research sessions across 5 distinct systems. Our feasibility study proved that a semantic graph model reduces search spaces for task scheduling by 74% compared to standard queue-based implementations."
  strategic_focus: "Example Company operates a software development and systems engineering workflow that processes over 1,000 tasks daily across multiple business units. Legacy project tools have resulted in a 24.2% increase in scheduling overhead and a 15.6% decrease in milestone completion rates."
  objectives:
    - "Establish a single source of truth for all project workflows by integrating JIRA, GitHub, Slack, and internal database telemetry into a Unified Semantic Graph."
    - "Reduce operational response times for cross-departmental dependencies by automating task routing via intelligent LLM agents."
    - "Improve executive visibility with real-time operational dashboard feeds detailing pipeline bottlenecks and resource utilization."
    - "Enforce strict security-by-design compliance across all custom development pipelines to meet Zero-Trust network parameters."
  feasibility_study: "Brightloop's research-first methodology builds technical solutions based on empirical telemetry diagnostics. Rather than deploying generic software templates, we follow a rigorous 21-day diagnostic pathway."
  delivery_description: "Brightloop does not deliver templated software. We find a problem first, research it deeply, then solve it."
  strategic_alignment: "To ensure complete enterprise compliance, the Operator Interface logs all manual scheduling and assignment override approvals to an immutable AWS CloudWatch ledger."

architecture:
  description: "The proposed platform integrates Jira and Git webhook streams with a semantic dependency layer and a custom LLM-based agent orchestration compute core. The system architecture is mapped out below:"
  columns:
    ingestion: "INGESTION & WEBHOOKS"
    compute: "COMPUTE ORCHESTRATOR"
    data_tier: "SEMANTIC DATA TIER"
    console: "OPERATOR CONSOLE"
  nodes:
    jira_events: "Jira Webhook Events"
    git_integrations: "Git Hook Integrations"
    worker_gateway: "Worker API Gateway"
    agent_core_title: "LLM Agent Core"
    agent_core_desc: "Orchestration Scheduler"
    rag_compiler_title: "RAG Context Compiler"
    rag_compiler_desc: "Prompt Construction"
    notification_dispatch: "Notification Dispatch"
    neo4j_title: "Neo4j Semantic Graph"
    neo4j_desc: "Task Dependency Map"
    pgvector_title: "pgvector Core DB"
    pgvector_desc: "Embedding Retrieval"
    jira_queue: "Jira Event Queue"
    operator_dashboard_title: "Operator Dashboard"
    operator_dashboard_desc: "React Control Center"
    iam_gates_title: "IAM & SSO Gates"
    iam_gates_desc: "Role Access Controls"
    cloudwatch_logs: "AWS CloudWatch logs"
  insight: "Decoupled architecture guarantees that if the frontend operator dashboard is offline, the webhook ingestion gateway and agent queue workers continue processing in AWS, preserving task transaction logs."

scope_of_work:
  description: "Brightloop will deliver a production-ready, custom enterprise intelligence platform, integrating with existing client ticketing systems, code repositories, and secure communication channels."
  in_scope:
    - "Design and deployment of Semantic Task Knowledge Graph (Neo4j/RDF ontology layer)."
    - "Development of Autonomous AI Worker Agent topology with LLM-driven task routing."
    - "Real-time Operator Control Dashboard (React/Next.js) with live agent monitoring."
    - "Integration with existing tools: JIRA, GitHub, Slack, and internal ERP."
    - "Full CI/CD pipeline setup and cloud deployment (AWS / Azure)."
  out_of_scope:
    - "Hardware acquisition or on-premise server provisioning."
    - "Legacy database migrations outside agreed data schemas."
    - "Custom LLM model fine-tuning (available as an extension phase)."
    - "Support or modifications outside the standard warranty period."
  guardrail: "Any development requests falling outside the defined scope items will be deferred to post-deployment support packages or handled under formal change orders."

methodology_steps:
  - step: "Discovery & Setup"
    description: "Environment setup, legacy schema modeling, and kickoff sessions."
  - step: "Graph Engineering"
    description: "Building the custom graph database pipeline and integrating ticketing systems."
  - step: "Agent Core Training"
    description: "Developing LLM routing models, instruction tuning, and prompt engineering."
  - step: "Dashboard & Telemetry"
    description: "Designing the frontend UI/UX, charts, and tracing telemetry ingestion pipelines."
  - step: "UAT & Deployment"
    description: "Conducting user acceptance testing, security penetration audits, and production handover."

features_intro: "Technical feature breakdown for the AI Agent scheduling and orchestration backend modules."
features:
  - module: "Autonomous AI Worker Agents"
    description: "Specialized LLM agents that autonomously schedule, assign, and execute project tasks."
    items:
      - title: "Task Graph Scheduler"
        details: "Semantic graph-driven dependency resolver assigning tasks in sub-second latency."
      - title: "Workload Profiling Engine"
        details: "Real-time developer capacity analysis using skill tags and availability signals."
      - title: "Context RAG Layer"
        details: "Retrieval-Augmented Generation for injecting project history into agent prompts."
      - title: "Verification Gate"
        details: "Automatic validation checks to ensure zero critical failures."
  - module: "Operator Control Dashboard"
    description: "Real-time visibility and control over all AI agent activity across the platform."
    items:
      - title: "Live Agent Monitor"
        details: "Visual task-flow view showing active agent sessions, completions, and stalls."
      - title: "Manual Override Controls"
        details: "Supervisors can pause, reassign, or escalate any agent task in real time."
      - title: "KPI & Impact Analytics"
        details: "Live dashboard showing overhead reduction, velocity improvements, and SLA health."
      - title: "SSO & Audit Logging"
        details: "tamper-proof audit trail for regulatory reviews logged to AWS CloudWatch."
  - module: "Analytics & Reporting"
    intro: "Technical features for the operator-facing frontend portal."
    description: "Post-deployment telemetry and custom analytics tools."
    items:
      - title: "Telemetry Ingestion"
        details: "Real-time database and task event scanning."
      - title: "SLA Tracking"
        details: "Automatic tracking of P1-P4 incidents and response targets."
      - title: "Audit Trail"
        details: "TAM logs of all operator override actions."
      - title: "Graph Analysis Reports"
        details: "Quarterly reports highlighting key task decomposition trends."
      - title: "Custom Dashboard Charts"
        details: "Visual representation of sprint metrics and resource bottlenecks."
      - title: "SSO & Entra Integration"
        details: "Role-based access controls for project managers."

features_compliance_note: "Frontend portals leverage OAuth2/OIDC SSO providers (e.g. Okta or Microsoft Entra ID) to authenticate project management teams and audit every task assignment override event."
features_audit_trail: "To ensure complete enterprise compliance, the Operator Interface logs all manual scheduling and assignment override approvals to an immutable AWS CloudWatch ledger. Each logged entry captures: (a) manager identity via OAuth2/OIDC claims, (b) original computed assignment suggestions, (c) overridden schedule parameters, and (d) structured justification codes—providing a tamper-proof audit trail for regulatory reviews."

deliverables_intro: "Below is the inventory of concrete assets to be handed over upon project completion."
deliverables:
  - stage: "Research & Design Documents"
    items:
      - name: "Technical Architecture & Schema Definition Document"
        format: "PDF"
      - name: "Algorithmic Verification & Feasibility Report"
        format: "IPYNB"
  - stage: "Software Codebases"
    items:
      - name: "Knowledge Graph Service Core (Rust)"
        format: "GIT"
      - name: "Operator Command Dashboard (React)"
        format: "GIT"
      - name: "Infrastructure Deployment Scripts (Terraform)"
        format: "IaC"
      - name: "API Contracts & SDK Wrappers"
        format: "OpenAPI"
  - stage: "Verification & Handover"
    items:
      - name: "Locust Performance Test Scripts"
        format: "SCRIPTS"
      - name: "Operations Manual & Setup Guides"
        format: "MD"

timeline_intro: "The project follows a 20-week lifecycle. Software development (Phase 02/03) begins strictly after research, ontology modeling, and architecture designs are approved."
gates_intro: "Project delivery gates are mapped to technical milestones and verified engineering deliverables."
timeline:
  total_weeks: 20
  milestones:
    - phase: "Phase 1: Research & Ontological Mapping"
      duration: "Weeks 1 - 4"
      milestone: "Approved Schema & Interface Specifications"
    - phase: "Phase 2: Core Engine & Graph Scheduler"
      duration: "Weeks 5 - 10"
      milestone: "Functional Agent Routing Engine (Pre-production)"
    - phase: "Phase 3: Dashboard & Integrations"
      duration: "Weeks 11 - 16"
      milestone: "Beta Release Connected to Staging Environment"
    - phase: "Phase 4: Deployment & Go-Live"
      duration: "Weeks 17 - 20"
      milestone: "Production Handover & Sign-Off"

business_impact_intro: "Our algorithmic simulation runs forecast significant optimization returns across key project management KPIs:"
business_impact:
  stages:
    - title: "1. Audit Inputs"
      desc: "JIRA Logs & Developer Telemetry"
    - title: "2. Optimization Solver"
      desc: "Dependency Path Simulation"
    - title: "3. Industry Benchmarks"
      desc: "Historical Operations Audit"
    - title: "4. Business Impact"
      desc: "Validated KPI Forecasts"
  kpis:
    - label: "Overhead Reduction"
      value: "30-35%"
      note: "Projected decrease in administrative overhead by automating developer task routing."
    - label: "Efficiency Gain"
      value: "74%"
      note: "Reduction in path dependency search space complexity, resolving scheduling conflicts in milliseconds."
    - label: "Consolidation"
      value: "6 -> 1"
      note: "Consolidates six disjointed project repositories (Jira, Git, Slack, ERP) into a single database."
    - label: "SLA Guarantee"
      value: "99.9%"
      note: "System availability target backed by redundant AWS EKS container node clustering."
  footnote: "* Projected outcomes are based on discovery findings, feasibility assessments, historical operational analysis, industry benchmarks, and solution modeling conducted during the proposal phase."

security:
  philosophy: "Security-first development is not a checklist at Brightloop — it is embedded into every phase of our engineering process."
  sdlc_stages:
    - stage: "Secure SDLC"
      tag: "100% Zero-Trust"
      description: "Secure-by-design pipelines with automated vulnerability scans, zero-trust API gateways, strict RBAC, and end-to-end payload encryption (AES-256)."
    - stage: "Security Research"
      tag: "Audit Proven"
      description: "Active in exploit research and threat modeling. We support critical enterprise diagnostics and robust software networks."
    - stage: "Vulnerability Discovery"
      tag: "AI-Assisted Fuzzing"
      description: "Deployment of advanced AI fuzzing rigs during CI/CD to detect zero-day exploits, package vulnerabilities, and library drift before release."
    - stage: "Social Awareness"
      tag: "Phishing Mitigated"
      description: "Administrator training modules, Short educational digests, and ready-to-use phishing awareness alerts to mitigate human-centric security gaps."
    - stage: "Reliability Engineering & Trusted Delivery"
      tag: "Reli360™ Engine"
      description: "Operating under Brightloop's Reli360 Framework for business continuity: redundant multi-region AWS container nodes, continuous load testing, automated version rollbacks, and proactive performance monitoring to guarantee high system availability."
  stages:
    - title: "1. Continuous Fuzzing"
      desc: "AI-Assisted Inputs"
    - title: "2. Exploit Discovery"
      desc: "Threat Zero-Day Isolation"
    - title: "3. Automated Triage"
      desc: "Patch Compilation"
    - title: "4. Zero-Downtime Patch"
      desc: "AWS Elastic Rollout"

assumptions:
  intro: "To ensure delivery timelines are maintained, the engagement assumes the following operational pre-requisites:"
  technical:
    - "Example Company engineers provide environment credentials and VPN access within 5 days of kickoff."
    - "Upstream APIs (Jira event webhooks and systems) are documented and accessible in staging."
    - "Target AWS sandboxes are provisioned with admin permissions for Brightloop's IaC deployments."
  organizational:
    - "Example Company allocates a Product Owner for bi-weekly engineering sign-offs."
    - "Security and compliance reviewers are available for testing audits in Week 18."

about_brightloop:
  tagline: "envision"
  intro: "Brightloop delivers advanced Enterprise software solutions, enabling global industries to innovate efficiently and transform securely in the digital era."
  approach: "Brightloop's approach begins with mathematical problem definition, followed by algorithmic simulations, rigorous validation, and custom engineering."
  differentiators:
    - title: "Security Research"
      description: "Active in vulnerability hunting and advanced fuzzing. We support critical enterprise audits across distributed systems."
    - title: "Reli360™ Framework"
      description: "Our systems are built on Brightloop's proprietary Reli360 engine, incorporating continuous load-testing rigs and error budget tracking."
    - title: "Privacy-First Shield"
      description: "To safeguard proprietary client metadata, we operate under a strict privacy engagement shield. We do not publish client names."
    - title: "Secure Development Lifecycle"
      description: "Every deliverable is constructed under a secure SDLC, integrating static code analysers, automated dependency scanning, and zero-trust boundaries."

risks_intro: "To guarantee delivery of the Autonomous AI Agent Platform, Brightloop proactively logs operational and technical risks alongside active mitigations."
risks:
  - id: "Risk 01"
    title: "Legacy API Schema Changes"
    impact: "Upstream modifications in JIRA or Git webhook payloads could break semantic graph mappings and interrupt agent schedulers."
    mitigation: "Brightloop deploys a decoupled Ingestion Queue gateway with automated schema-drift alerts, buffering raw payloads for replay once parsed."
  - id: "Risk 02"
    title: "LLM Context Token Window Exhaustion"
    impact: "Fragmented project history containing long ticket updates could exceed the LLM's context limit, causing loss of critical task requirements."
    mitigation: "Brightloop compiles a structured context map summarizing historical sprints and filters out redundant stack traces prior to agent execution."

steering_governance: "A joint steering committee (composed of Example Company Sponsor Sarah Jenkins, Marcus Chen, and Brightloop Systems MD) will review milestone velocity bi-weekly. Any architectural deviation or telemetry schema discrepancies will be logged in the project risk register, with impact reviews completed within 48 hours to preserve the 20-week timeline."

support_intro: "Post-deployment stability is covered by structured support agreements and response targets."
support:
  warranty_period: "Brightloop provides a 90-day warranty starting on the date of production handover. This covers critical bug fixes, patch deployments, and data graph ontology corrections at no additional charge."
  extended_maintenance_desc: "For ongoing operations, Brightloop offers an Extended Support SLA tier for $4,500/month, including 24/7 critical incident response, monthly database tuning, and up to 15 hours of minor modifications."
  improvement_cycle_desc: "At the close of each support quarter, Brightloop provides a comprehensive Graph Telemetry Analysis Report. This report audits algorithm performance metrics (e.g. task decomposition latency, solver convergence rates, and manager assignment overrides) and suggests optimization tweaks, ensuring the scheduling core remains tuned to team velocity trends."
  sla_tiers:
    - severity: "P1 · Critical"
      description: "Production system down, or core scheduling operations entirely blocked. No workaround exists."
      response_time: "< 2 Hours"
    - severity: "P2 · Urgent"
      description: "Core agent planning or dashboard interface severely impaired. Workaround is complex."
      response_time: "< 4 Hours"
    - severity: "P3 · Standard"
      description: "Non-critical system feature impairment or minor software bug. Workaround is available."
      response_time: "< 1 Business Day"
    - severity: "P4 · Minor"
      description: "Cosmetic issues, documentation updates, or minor feature enhancement requests."
      response_time: "< 2 Business Days"

terms:
  ip_ownership: "Upon receipt of final payment, Example Company Inc. owns all IP rights to custom application code, database configurations, and portal assets. Brightloop Software retains ownership of its pre-existing core math libraries and research solvers."
  confidentiality: "All scheduling data, business parameters, and ontology schemas represent proprietary secrets. NDA clauses remain active indefinitely. Governing law is the Republic of India."

acceptance:
  criteria:
    - "Scheduling updates calculated in under 1 second."
    - "Ingestion pipeline supports 1k event tasks/sec."
    - "Code coverage >=80% on unit runs."
    - "0 critical vulnerabilities in OWASP."
  client_date_placeholder: "Date: __________________"
  brightloop_date_placeholder: "Date: __________________"
`;




/** Reliably trigger a browser file download with the correct filename & extension.
 *  Uses the File System Access API (showSaveFilePicker) which shows a native
 *  OS "Save As" dialog — this works in all Electron/Chromium contexts regardless
 *  of how the environment handles blob:/data: URL download attributes.
 *  Falls back to FileReader data URL for unsupported browsers. */
const saveBlob = async (blob: Blob, filename: string): Promise<void> => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

const fetchPdfWithProgress = async (
  url: string,
  body: any,
  onProgress: (percent: number) => void
): Promise<Blob> => {
  let currentProgress = 0;
  const progressInterval = setInterval(() => {
    if (currentProgress < 90) {
      currentProgress += Math.floor(Math.random() * 5) + 2;
      if (currentProgress > 90) currentProgress = 90;
      onProgress(currentProgress);
    }
  }, 150);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      clearInterval(progressInterval);
      const errText = await res.text();
      throw new Error(errText || 'Failed to generate PDF');
    }

    clearInterval(progressInterval);

    const reader = res.body?.getReader();
    const contentLength = Number(res.headers.get('Content-Length')) || 0;
    
    if (!reader) {
      onProgress(100);
      const blob = await res.blob();
      return blob;
    }

    let receivedLength = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedLength += value.length;
        if (contentLength > 0) {
          const actualPercent = Math.min(
            90 + Math.floor((receivedLength / contentLength) * 10),
            100
          );
          onProgress(actualPercent);
        }
      }
    }

    onProgress(100);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return new Blob(chunks as any[], { type: 'application/pdf' });
  } catch (error) {
    clearInterval(progressInterval);
    throw error;
  }
};

export const Component = () => {
  const currentWorkspace = useService(WorkspaceService).workspace;
  const workspaceId = currentWorkspace.id;
  const companyProfile = useCompanyProfile();
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlAction = searchParams.get('action');

  // Core proposals list and loading states
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activeProposal, setActiveProposal] = useState<Proposal | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  
  // RAW loaded template and defaults
  const [templateHtml, setTemplateHtml] = useState<string>('');
  const [defaultYaml, setDefaultYaml] = useState<string>('');

  // Active editor states
  const [yamlText, setYamlText] = useState<string>('');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [iframeSrcDoc, setIframeSrcDoc] = useState<string>('');
  const lastChangeSource = useRef<'editor' | 'iframe' | null>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const activeLineIdx = useMemo(() => {
    if (!activeKey || !yamlText) return -1;
    return findLineIndexForPath(yamlText, activeKey);
  }, [activeKey, yamlText]);

  // AI Copilot selections
  const [selection, setSelection] = useState<{
    text: string;
    rect: any;
    states?: {
      bold: boolean;
      italic: boolean;
      underline: boolean;
      code: boolean;
    };
  } | null>(null);

  // Proposals AI Copilot states
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; pendingSuggestion?: string }>>([
    { role: 'assistant', content: 'Welcome to Proposals AI Copilot. Highlight/select any text in the proposal preview on the left, then ask me to rewrite, expand, or format it as a table.' }
  ]);
  const [copilotInput, setCopilotInput] = useState('');
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);

  const [otpModal, setOtpModal] = useState<{
    visible: boolean;
    purpose: 'EditProposal' | 'DeleteProposal';
    pendingSaveData?: any;
  }>({
    visible: false,
    purpose: 'EditProposal',
  });
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Creation & edit popup modal state for Proposals
  const [docModal, setDocModal] = useState<{
    visible: boolean;
    mode: 'create' | 'edit';
    proposal?: Proposal;
    shortTitle: string;
    proposalTag: string;
    title: string;
    titlePlatform: string;
    subtitle: string;
    tagline: string;
    duration: string;
    companyName: string;
    distributionList: string;
    researchValidation: string;
  }>({
    visible: false,
    mode: 'create',
    shortTitle: 'AI AGENT PM PROPOSAL',
    proposalTag: 'Technical Proposal',
    title: 'Integrated Enterprise Intelligence',
    titlePlatform: 'Platform',
    subtitle: "A purpose-built Knowledge Graph and Autonomous AI Agent Orchestration platform, designed after rigorous operational diagnostics—delivering automated scheduling and dynamic task execution across Example Company Inc.'s enterprise workflows.",
    tagline: 'Enterprise Knowledge Graph, AI Routing Optimisation, and Operational Intelligence Platform design document.',
    duration: '20 Weeks',
    companyName: 'Example Company Inc.',
    distributionList: 'Sarah Jenkins (CIO), Marcus Chen (Lead Architect), Ansan Mathew (Systems MD)',
    researchValidation: 'Core solvers validated against operational trace datasets from 14 workspace instances.',
  });

  // Custom version bump modal state
  const [bumpModal, setBumpModal] = useState<{
    visible: boolean;
    baseProposal: Proposal | null;
    newVer: string;
    description: string;
  }>({
    visible: false,
    baseProposal: null,
    newVer: '',
    description: ''
  });

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const splitPaneRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [yamlFlash, setYamlFlash] = useState(false);
  const yamlFlashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // UX improvements state variables
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDocs, setExpandedDocs] = useState<{ [key: string]: boolean }>({});

  // Resize states
  const [splitPercent, setSplitPercent] = useState(70); // default to 70% for render/preview side
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!splitPaneRef.current) return;
      const rect = splitPaneRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      if (percent > 20 && percent < 80) {
        setSplitPercent(percent);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };
  // Dropdown states
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);

  // Dropdown refs for click outside detection
  const versionDropdownRef = useRef<HTMLDivElement>(null);
  const plusDropdownRef = useRef<HTMLDivElement>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (versionDropdownRef.current && !versionDropdownRef.current.contains(target)) {
        setVersionMenuOpen(false);
      }
      if (plusDropdownRef.current && !plusDropdownRef.current.contains(target)) {
        setPlusMenuOpen(false);
      }
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(target)) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter and group proposals
  const getGroupedProposals = () => {
    const filtered = proposals.filter(p => {
      const query = searchQuery.toLowerCase();
      return (
        p.proposalId.toLowerCase().includes(query) ||
        p.title.toLowerCase().includes(query) ||
        p.preparedFor.toLowerCase().includes(query)
      );
    });

    const groups: { [key: string]: Proposal[] } = {};
    filtered.forEach(p => {
      if (!groups[p.proposalId]) {
        groups[p.proposalId] = [];
      }
      groups[p.proposalId].push(p);
    });

    return Object.keys(groups).map(proposalId => {
      const sortedVersions = groups[proposalId].sort((a, b) => {
        const vA = parseFloat(a.version) || 0;
        const vB = parseFloat(b.version) || 0;
        return vB - vA;
      });

      const latest = sortedVersions[0];
      return {
        proposalId,
        title: latest.title,
        preparedFor: latest.preparedFor,
        latestDate: latest.preparedDate,
        versions: sortedVersions
      };
    }).sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
  };

  const toggleDocExpand = (docId: string) => {
    setExpandedDocs(prev => ({
      ...prev,
      [docId]: !prev[docId]
    }));
  };

  // 1. Fetch static templates and database proposals on load
  useEffect(() => {
    const loadStaticAssets = async () => {
      try {
        const templateRes = await fetch('/proposal_template.html');
        const templateTxt = await templateRes.text();
        if (templateTxt && templateTxt.includes('page-cover')) {
          setTemplateHtml(templateTxt);
        } else {
          setTemplateHtml(fallbackTemplateHtml);
        }

        const sampleRes = await fetch('/proposal_sample.yaml');
        const sampleTxt = await sampleRes.text();
        if (sampleTxt && !sampleTxt.trim().startsWith('<!DOCTYPE html>')) {
          setDefaultYaml(sampleTxt);
        } else {
          setDefaultYaml(fallbackYaml);
        }
      } catch (e) {
        console.error('Failed to load proposal static template or sample.', e);
        setTemplateHtml(fallbackTemplateHtml);
        setDefaultYaml(fallbackYaml);
      }
    };

    loadStaticAssets();
    fetchProposals();
    fetchProjects();
  }, [workspaceId]);

  // 1b. Fetch all projects from DB
  const fetchProjects = async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (e) {
      console.error('Failed to fetch workspace projects.', e);
    }
  };

  // 2. Fetch all proposals from DB
  const fetchProposals = async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/proposals`);
      if (res.ok) {
        const data = await res.json();
        setProposals(data);
      }
    } catch (e) {
      console.error('Failed to fetch workspace proposals.', e);
    }
  };

  // 3. Load specific proposal version into state
  const loadProposal = (proposal: Proposal) => {
    setActiveProposal(proposal);
    setActiveKey(null);
    lastChangeSource.current = null;
    setYamlText(proposal.content);
    setExpandedDocs(prev => ({
      ...prev,
      [proposal.proposalId]: true
    }));
    setSearchParams({ id: proposal.proposalId, v: proposal.version });
  };

  // 3b. Sync URL query parameters with activeProposal state
  useEffect(() => {
    const pId = searchParams.get('id');
    const pVer = searchParams.get('v');
    
    if (pId && pVer) {
      if (activeProposal && activeProposal.proposalId === pId && activeProposal.version === pVer) {
        return;
      }
      if (proposals.length > 0) {
        const match = proposals.find(p => p.proposalId === pId && p.version === pVer);
        if (match) {
          loadProposal(match);
        }
      }
    } else {
      if (activeProposal) {
        setActiveProposal(null);
        setActiveKey(null);
        setYamlText('');
      }
    }
  }, [searchParams, proposals, activeProposal]);

  const { setCopilotContext } = useWorkspaceCopilot();

  useEffect(() => {
    setCopilotContext(prev => ({
      ...prev,
      activeTab: 'documents',
      activeDocId: activeProposal ? `${activeProposal.proposalId}-v${activeProposal.version}` : undefined,
      activeDocTitle: activeProposal ? `${activeProposal.title} (v${activeProposal.version})` : undefined,
      activeDocContent: yamlText || (activeProposal ? activeProposal.content : ''),
    }));
  }, [activeProposal, yamlText, setCopilotContext]);

  useEffect(() => {
    const handleCopilotDocEdit = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail || {};
      const { editMode, targetSection, newContent, summary } = detail;
      if (!newContent && !targetSection && !summary) return;

      setYamlText(currentYaml => {
        if (!currentYaml) return currentYaml;
        const updatedYaml = applyCopilotEditToYaml(currentYaml, {
          editMode,
          targetSection,
          newContent,
          summary,
        });

        if (updatedYaml !== currentYaml) {
          toast('Proposal updated by Workspace Copilot');
          return updatedYaml;
        }

        return currentYaml;
      });
    };

    window.addEventListener('workspace-copilot-doc-edit', handleCopilotDocEdit);
    return () => {
      window.removeEventListener('workspace-copilot-doc-edit', handleCopilotDocEdit);
    };
  }, []);

  // 4. Handle URL actions (new / update)
  useEffect(() => {
    if (defaultYaml && templateHtml) {
      if (urlAction === 'new') {
        handleCreateNew();
      } else if (urlAction === 'update') {
        if (activeProposal) {
          handleBumpVersion(activeProposal);
        } else if (proposals.length > 0) {
          handleBumpVersion(proposals[0]);
        } else {
          handleCreateNew();
        }
      }
    }
  }, [urlAction, defaultYaml, templateHtml, proposals]);

  // fallbackYaml is now defined at file scope

  const handleUpdateDescription = (proposal: Proposal, newDesc: string) => {
    const currentDesc = getDescriptionForProposal(proposal);
    if (currentDesc === newDesc) return;

    try {
      const doc = YAML.parseDocument(proposal.content);
      const historyNode = doc.getIn(['document_info', 'version_history']);
      let found = false;

      if (historyNode && typeof (historyNode as any).items !== 'undefined') {
        const listNode = historyNode as any;
        for (const itemNode of listNode.items) {
          if (itemNode && typeof (itemNode as any).get === 'function') {
            if (String(itemNode.get('version')) === String(proposal.version)) {
              itemNode.set('description', newDesc);
              found = true;
              break;
            }
          }
        }
      }

      if (!found) {
        let list: any[] = [];
        try {
          const raw = doc.getIn(['document_info', 'version_history']) as any;
          if (raw) {
            list = typeof raw.toJS === 'function' ? raw.toJS() : JSON.parse(JSON.stringify(raw));
          }
        } catch(e) {}
        if (Array.isArray(list)) {
          const item = list.find(h => String(h.version) === String(proposal.version));
          if (item) {
            item.description = newDesc;
          }
          doc.setIn(['document_info', 'version_history'], list);
        }
      }

      const newYaml = doc.toString();
      const updatedProposal = {
        ...proposal,
        content: newYaml
      };

      // Set state to make it active so handleSave can use it
      setActiveProposal(updatedProposal);
      setYamlText(newYaml);

      const saveData = {
        proposalId: proposal.proposalId,
        version: proposal.version,
        title: proposal.title,
        preparedFor: proposal.preparedFor,
        preparedDate: proposal.preparedDate,
        content: newYaml
      };

      triggerSendOtp('EditProposal', saveData);
    } catch (e) {
      console.error('Failed to update change description', e);
    }
  };

  // Action: Create New Proposal from default template
  const openEditModal = (p: Proposal) => {
    try {
      const parsed = YAML.parse(p.content);
      const metadata = parsed.metadata || {};
      const cover = parsed.cover || {};
      const preparedFor = cover.prepared_for || {};
      
      const rawDist = parsed.document_info?.distribution_list || cover.distribution_list || [];
      const distStr = Array.isArray(rawDist)
        ? rawDist.map((d: any) => `${d.name || ''} (${d.role || ''})`).join(', ')
        : '';

      setDocModal({
        visible: true,
        mode: 'edit',
        proposal: p,
        shortTitle: metadata.short_title || 'AI AGENT PM PROPOSAL',
        proposalTag: cover.proposal_tag || 'Technical Proposal',
        title: cover.title || 'Integrated Enterprise Intelligence',
        titlePlatform: cover.title_platform || 'Platform',
        subtitle: cover.subtitle || '',
        tagline: cover.tagline || '',
        duration: cover.project_duration || cover.duration || '6 Months',
        companyName: preparedFor.company_name || '',
        distributionList: distStr,
        researchValidation: cover.research_validation || '',
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateNew = () => {
    const compName = companyProfile.companyName || 'Brightloop Software';
    setDocModal({
      visible: true,
      mode: 'create',
      shortTitle: 'AI AGENT PM PROPOSAL',
      proposalTag: 'Technical Proposal',
      title: 'Integrated Enterprise Intelligence',
      titlePlatform: 'Platform',
      subtitle: "A purpose-built Knowledge Graph and Autonomous AI Agent Orchestration platform, designed after rigorous operational diagnostics—delivering automated scheduling and dynamic task execution across Example Company Inc.'s enterprise workflows.",
      tagline: 'Enterprise Knowledge Graph, AI Routing Optimisation, and Operational Intelligence Platform design document.',
      duration: '6 Months',
      companyName: 'Example Company Inc.',
      distributionList: `Sarah Jenkins (CIO), Marcus Chen (Lead Architect), Ansan Mathew (MD · ${compName})`,
      researchValidation: 'Core solvers validated against operational trace datasets from 14 workspace instances.',
    });
  };

  const submitDocModal = async () => {
    try {
      const distParts = docModal.distributionList.split(',').map(s => s.trim()).filter(Boolean);
      const parsedDist = distParts.map(part => {
        const match = part.match(/^([^(]+)(?:\(([^)]+)\))?$/);
        const name = match ? match[1].trim() : part;
        const role = match && match[2] ? match[2].trim() : 'Reviewer';
        const initials = getInitialsFromName(name);
        return { name, initials, role };
      });

      if (docModal.mode === 'create') {
        const yamlSource = (defaultYaml && !defaultYaml.trim().startsWith('<!DOCTYPE html>')) 
          ? defaultYaml 
          : fallbackYaml;
        
        let newId = '';
        let isUnique = false;
        while (!isUnique) {
          const rand = Math.floor(100000 + Math.random() * 900000);
          newId = `PROP-2026-${rand}`;
          isUnique = !proposals.some(p => p.proposalId === newId);
        }

        const doc = YAML.parseDocument(yamlSource);
        doc.setIn(['metadata', 'proposal_id'], newId);
        doc.setIn(['metadata', 'version'], '1.0');
        doc.setIn(['metadata', 'short_title'], docModal.shortTitle);
        doc.setIn(['metadata', 'date'], new Date().toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        }));

        doc.setIn(['cover', 'proposal_tag'], docModal.proposalTag);
        doc.setIn(['cover', 'title'], docModal.title);
        doc.setIn(['cover', 'title_platform'], docModal.titlePlatform);
        doc.setIn(['cover', 'subtitle'], docModal.subtitle);
        doc.setIn(['cover', 'tagline'], docModal.tagline);
        doc.setIn(['cover', 'project_duration'], docModal.duration);
        doc.setIn(['cover', 'duration'], docModal.duration);
        doc.setIn(['cover', 'prepared_for', 'company_name'], docModal.companyName);

        const compName = companyProfile?.companyName || 'Brightloop Software';
        doc.setIn(['cover', 'presented_by', 'company_name'], compName);
        if (companyProfile) {
          doc.setIn(['cover', 'presented_by', 'tagline'], companyProfile.companyTagline);
          doc.setIn(['cover', 'presented_by', 'email'], companyProfile.email);
          doc.setIn(['cover', 'presented_by', 'phone'], companyProfile.phone);
          doc.setIn(['cover', 'presented_by', 'address'], companyProfile.address);
          doc.setIn(['cover', 'presented_by', 'website'], companyProfile.websiteUrl);
          doc.setIn(['cover', 'presented_by', 'cin'], companyProfile.cin);
          doc.setIn(['cover', 'presented_by', 'pan'], companyProfile.pan);
          doc.setIn(['cover', 'presented_by', 'gst'], companyProfile.gstin);
        }
        doc.deleteIn(['cover', 'presented_by', 'lead']);
        doc.deleteIn(['cover', 'presented_by', 'lead_title']);

        doc.setIn(['document_info', 'distribution_list'], parsedDist);
        if (doc.hasIn(['cover', 'distribution_list'])) {
          doc.deleteIn(['cover', 'distribution_list']);
        }
        doc.setIn(['cover', 'research_validation'], docModal.researchValidation);

        const author = compName;
        doc.setIn(['document_info', 'version_history'], [
          {
            version: '1.0',
            date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
            author: String(author),
            description: 'Initial version'
          }
        ]);

        const newYaml = doc.toString();
        const newProposal: Proposal = {
          id: '',
          workspaceId,
          proposalId: newId,
          version: '1.0',
          title: docModal.shortTitle || 'Integrated Enterprise Intelligence Platform',
          preparedFor: docModal.companyName || 'Example Company Inc.',
          preparedDate: new Date().toISOString(),
          content: newYaml
        };

        setActiveProposal(newProposal);
        lastChangeSource.current = null;
        setYamlText(newYaml);
        setSearchParams({ id: newId, v: '1.0' });
        setDocModal(prev => ({ ...prev, visible: false }));
        toast('Proposal draft created!');
      } else {
        const target = docModal.proposal;
        if (!target) return;

        const doc = YAML.parseDocument(target.content);
        doc.setIn(['metadata', 'short_title'], docModal.shortTitle);
        doc.setIn(['cover', 'proposal_tag'], docModal.proposalTag);
        doc.setIn(['cover', 'title'], docModal.title);
        doc.setIn(['cover', 'title_platform'], docModal.titlePlatform);
        doc.setIn(['cover', 'subtitle'], docModal.subtitle);
        doc.setIn(['cover', 'tagline'], docModal.tagline);
        doc.setIn(['cover', 'project_duration'], docModal.duration);
        doc.setIn(['cover', 'duration'], docModal.duration);
        doc.setIn(['cover', 'prepared_for', 'company_name'], docModal.companyName);
        doc.setIn(['document_info', 'distribution_list'], parsedDist);
        if (doc.hasIn(['cover', 'distribution_list'])) {
          doc.deleteIn(['cover', 'distribution_list']);
        }
        doc.setIn(['cover', 'research_validation'], docModal.researchValidation);

        const newYaml = doc.toString();
        await handleSave(undefined, target, newYaml);
        setDocModal(prev => ({ ...prev, visible: false }));
      }
    } catch (e: any) {
      toast(`Error processing: ${e.message}`);
    }
  };

  // Action: Bump version of proposal
  const handleBumpVersion = (baseProposal: Proposal | null) => {
    if (!baseProposal) return;
    const currentVer = parseFloat(baseProposal.version);
    const newVer = (isNaN(currentVer) ? 1.0 : currentVer + 0.1).toFixed(1);
    setBumpModal({
      visible: true,
      baseProposal,
      newVer,
      description: ''
    });
  };

  const confirmBumpVersion = () => {
    const { baseProposal, newVer, description } = bumpModal;
    if (!baseProposal) return;
    try {
      const doc = YAML.parseDocument(baseProposal.content);
      doc.setIn(['metadata', 'version'], newVer);
      doc.setIn(['metadata', 'date'], new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }));

      // Append new version entry to version history
      const author = doc.getIn(['cover', 'presented_by', 'lead']) || 'Author';
      const newHistoryItem = {
        version: newVer,
        date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        author: String(author),
        description: description || 'Minor edits'
      };

      let historyNode = doc.getIn(['document_info', 'version_history']);
      if (historyNode && typeof (historyNode as any).add === 'function') {
        (historyNode as any).add(doc.createNode(newHistoryItem));
      } else {
        let list: any[] = [];
        try {
          const raw = doc.getIn(['document_info', 'version_history']) as any;
          if (raw) {
            list = typeof raw.toJS === 'function' ? raw.toJS() : JSON.parse(JSON.stringify(raw));
          }
        } catch(e) {}
        if (!Array.isArray(list)) list = [];
        list.push(newHistoryItem);
        doc.setIn(['document_info', 'version_history'], list);
      }

      const newYaml = doc.toString();
      const updated: Proposal = {
        id: '',
        workspaceId,
        proposalId: baseProposal.proposalId,
        version: newVer,
        title: baseProposal.title,
        preparedFor: baseProposal.preparedFor,
        preparedDate: new Date().toISOString(),
        content: newYaml
      };

      setActiveProposal(updated);
      lastChangeSource.current = null;
      setYamlText(newYaml);
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('id', baseProposal.proposalId);
        next.set('v', newVer);
        next.delete('action');
        return next;
      });
      setBumpModal({ visible: false, baseProposal: null, newVer: '', description: '' });
    } catch (e) {
      console.error(e);
    }
  };

  // Ref to track the last loaded proposal version key
  const lastLoadedProposalRef = useRef<string | null>(null);

  // 5. Update iframe preview whenever YAML text changes
  useEffect(() => {
    if (!activeProposal) {
      lastLoadedProposalRef.current = null;
      return;
    }
    if (!templateHtml || !yamlText) return;

    const proposalKey = `${activeProposal.proposalId}_${activeProposal.version}`;

    if (lastChangeSource.current === 'iframe') {
      lastChangeSource.current = null;
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          const data = YAML.parse(yamlText);
          iframeRef.current.contentWindow.postMessage({
            type: 'UPDATE_FIELDS',
            data,
            distributionHtml: renderDistributionList(data),
            deliverablesHtml: renderDeliverablesList(data),
            timelineHtml: renderTimelinePhases(data),
            deliveryGatesHtml: renderDeliveryGates(data),
          }, '*');
        } catch (e) {}
      }
      return;
    }

    try {
      const data = YAML.parse(yamlText);
      
      if (lastLoadedProposalRef.current !== proposalKey) {
        // Switch document or first load: set iframeSrcDoc to completely load the template HTML
        lastLoadedProposalRef.current = proposalKey;
        let rendered = injectData(templateHtml, data, companyProfile);
        if (rendered.includes('</body>')) {
          rendered = rendered.replace('</body>', scriptToInject + '\n</body>');
        } else {
          rendered = rendered + scriptToInject;
        }
        if (rendered.includes('<head>')) {
          rendered = rendered.replace('<head>', '<head>\n  <base href="/">');
        } else {
          rendered = '<base href="/">' + rendered;
        }
        setIframeSrcDoc(rendered);
      } else {
        // Subsequent edits: post message to iframe for real-time in-place updates
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: 'UPDATE_FIELDS',
            data,
            distributionHtml: renderDistributionList(data),
            deliverablesHtml: renderDeliverablesList(data),
            timelineHtml: renderTimelinePhases(data),
            deliveryGatesHtml: renderDeliveryGates(data),
          }, '*');
        }
      }
    } catch (e) {
      // Silently catch yaml parsing issues during live typing
    }
  }, [yamlText, templateHtml, activeProposal, companyProfile]);

  const scrollYamlToKey = (key: string, shouldFocus = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const lineIdx = findLineIndexForPath(yamlText, key);
    if (lineIdx === -1) return;
    
    const lines = yamlText.split('\n');
    let offset = 0;
    for (let i = 0; i < lineIdx; i++) {
      offset += lines[i].length + 1;
    }
    
    const line = lines[lineIdx];
    const colonIdx = line.indexOf(':');
    let caretPos = offset;
    if (colonIdx !== -1) {
      let valStart = colonIdx + 1;
      while (valStart < line.length && line[valStart] === ' ') {
        valStart++;
      }
      if (valStart < line.length && (line[valStart] === '"' || line[valStart] === "'")) {
        valStart++;
      }
      caretPos = offset + valStart;
    } else {
      const trimmedStart = line.search(/\S/);
      if (trimmedStart !== -1) {
        let valStart = trimmedStart;
        if (line[valStart] === '-') {
          valStart++;
          while (valStart < line.length && line[valStart] === ' ') {
            valStart++;
          }
          if (valStart < line.length && (line[valStart] === '"' || line[valStart] === "'")) {
            valStart++;
          }
        }
        caretPos = offset + valStart;
      }
    }
    
    if (shouldFocus) {
      textarea.focus();
    }
    textarea.setSelectionRange(caretPos, caretPos);
    
    const textareaHeight = textarea.clientHeight;
    const lineHeight = 18; // approx line height in px
    const scrollTopPos = Math.max(0, (lineIdx * lineHeight) - (textareaHeight / 2));
    textarea.scrollTop = scrollTopPos;
    setScrollTop(scrollTopPos);
    
    setYamlFlash(true);
    if (yamlFlashTimeoutRef.current) {
      clearTimeout(yamlFlashTimeoutRef.current);
    }
    yamlFlashTimeoutRef.current = setTimeout(() => {
      setYamlFlash(false);
    }, 1500);
  };

  // Broadcast highlight path to iframe
  const postHighlightToIframe = (key: string) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'HIGHLIGHT_FIELD',
        key: key
      }, '*');
    }
  };

  // Detect cursor position and parse YAML path to highlight on left
  const handleYamlCursorChange = (textarea: HTMLTextAreaElement) => {
    const cursorIdx = textarea.selectionStart;
    const text = textarea.value;
    
    const lines = text.substring(0, cursorIdx).split('\n');
    const currentLineIdx = lines.length - 1;
    
    const paths = getAllLinePaths(text);
    const path = paths[currentLineIdx];
    if (path) {
      postHighlightToIframe(path);
    }
  };

  const handleYamlKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    if (cursorTimeoutRef.current) {
      clearTimeout(cursorTimeoutRef.current);
    }
    cursorTimeoutRef.current = setTimeout(() => {
      handleYamlCursorChange(textarea);
    }, 200);
  };

  const handleYamlMouseUp = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    handleYamlCursorChange(e.currentTarget);
  };

  // 6. Listen for postMessages from inside the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg) return;

      if (msg.type === 'PROPOSAL_EDIT') {
        const { key, value } = msg;
        lastChangeSource.current = 'iframe';
        
        try {
          const doc = YAML.parseDocument(yamlText);
          const path = key.split('.').map((p: string) => /^\d+$/.test(p) ? parseInt(p, 10) : p);
          const markdownValue = htmlToMarkdown(value);
          doc.setIn(path, markdownValue);

          if (key.includes('distribution_list') && key.endsWith('.name')) {
            const initialsPath = [...path.slice(0, -1), 'initials'];
            const newInitials = getInitialsFromName(markdownValue);
            doc.setIn(initialsPath, newInitials);
          }

          setYamlText(doc.toString());
        } catch (e) {
          // YAML parse failure
        }
      } else if (msg.type === 'PROPOSAL_SELECTION') {
        if (selectionTimeoutRef.current) {
          clearTimeout(selectionTimeoutRef.current);
        }
        selectionTimeoutRef.current = setTimeout(() => {
          setSelection({ text: msg.text, rect: msg.rect, states: msg.states });
        }, 100);
      } else if (msg.type === 'PROPOSAL_SELECTION_CLEAR') {
        if (selectionTimeoutRef.current) {
          clearTimeout(selectionTimeoutRef.current);
        }
        selectionTimeoutRef.current = setTimeout(() => {
          setSelection(null);
        }, 100);
      } else if (msg.type === 'PROPOSAL_FIELD_CLICK') {
        setActiveKey(msg.key);
        scrollYamlToKey(msg.key, false);
      } else if (msg.type === 'PROPOSAL_LIST_ADD') {
        const { listType, index, stageIndex, itemIndex } = msg;
        lastChangeSource.current = 'iframe';
        try {
          const doc = YAML.parseDocument(yamlText);
          if (listType === 'distribution_list') {
            safeInsertItem(doc, ['document_info', 'distribution_list'], index + 1, { name: 'New Member', initials: 'NM', role: 'Role' });
          } else if (listType === 'deliverables_stage') {
            safeInsertItem(doc, ['deliverables'], index + 1, { stage: 'New Stage', items: [{ name: 'New Item', format: 'Format' }] });
          } else if (listType === 'deliverables_items') {
            safeInsertItem(doc, ['deliverables', stageIndex, 'items'], itemIndex + 1, { name: 'New Item', format: 'Format' });
          } else if (listType === 'timeline_milestones') {
            safeInsertItem(doc, ['timeline', 'milestones'], index + 1, { phase: 'New Phase', duration: 'Weeks X - Y', milestone: 'New Milestone Trigger' });
          }
          setYamlText(doc.toString());
        } catch (e) {
          console.error(e);
        }
      } else if (msg.type === 'PROPOSAL_LIST_DELETE') {
        const { listType, index, stageIndex, itemIndex } = msg;
        lastChangeSource.current = 'iframe';
        try {
          const doc = YAML.parseDocument(yamlText);
          if (listType === 'distribution_list') {
            safeDeleteItem(doc, ['document_info', 'distribution_list'], index);
          } else if (listType === 'deliverables_stage') {
            safeDeleteItem(doc, ['deliverables'], index);
          } else if (listType === 'deliverables_items') {
            safeDeleteItem(doc, ['deliverables', stageIndex, 'items'], itemIndex);
          } else if (listType === 'timeline_milestones') {
            safeDeleteItem(doc, ['timeline', 'milestones'], index);
          }
          setYamlText(doc.toString());
        } catch (e) {
          console.error(e);
        }
      } else if (msg.type === 'PROPOSAL_LIST_ADD_NEW') {
        const { listType, stageIndex } = msg;
        lastChangeSource.current = 'iframe';
        try {
          const doc = YAML.parseDocument(yamlText);
          if (listType === 'distribution_list') {
            safeAddItem(doc, ['document_info', 'distribution_list'], { name: 'New Member', initials: 'NM', role: 'Role' });
          } else if (listType === 'deliverables_stage') {
            safeAddItem(doc, ['deliverables'], { stage: 'New Stage', items: [{ name: 'New Item', format: 'Format' }] });
          } else if (listType === 'deliverables_items') {
            safeAddItem(doc, ['deliverables', stageIndex, 'items'], { name: 'New Item', format: 'Format' });
          } else if (listType === 'timeline_milestones') {
            safeAddItem(doc, ['timeline', 'milestones'], { phase: 'New Phase', duration: 'Weeks X - Y', milestone: 'New Milestone Trigger' });
          }
          setYamlText(doc.toString());
        } catch (e) {
          console.error(e);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [yamlText]);

  // 7. Save Proposal (with OTP check for overwriting finalized/saved versions)
  const handleSave = async (forceWithOtp?: string, proposalOverride?: Proposal, yamlOverride?: string) => {
    // If we have pendingSaveData from OTP modal and forceWithOtp is provided, use it directly
    if (forceWithOtp && otpModal.pendingSaveData) {
      try {
        const saveData = {
          ...otpModal.pendingSaveData,
          otpCode: forceWithOtp
        };
        const res = await fetch(`/api/workspaces/${workspaceId}/proposals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saveData),
        });

        if (res.ok) {
          const saved = await res.json();
          // Close modal if open
          setOtpModal({ visible: false, purpose: 'EditProposal' });
          setOtpCode('');
          setOtpError('');
          
          // Refresh proposal list and set saved active
          await fetchProposals();
          loadProposal(saved);
          toast('Proposal saved successfully!');
        } else {
          const errorText = await res.text();
          if (res.status === 403 || res.status === 400) {
            setOtpError(`Authorization failed: ${errorText}`);
          } else {
            alert(`Failed to save: ${errorText}`);
          }
        }
      } catch (e: any) {
        console.error(e);
        alert(`Save error: ${e.message}`);
      }
      return;
    }

    const targetProposal = proposalOverride || activeProposal;
    const targetYaml = yamlOverride || yamlText;

    if (!targetProposal || !targetYaml) return;

    try {
      let parsedData: any = {};
      try {
        parsedData = YAML.parse(targetYaml);
      } catch (err) {
        alert('Invalid YAML syntax. Please correct it before saving.');
        return;
      }

      const proposalId = parsedData.metadata?.proposal_id || targetProposal.proposalId;
      const version = parsedData.metadata?.version || targetProposal.version;
      const title = parsedData.cover?.title || targetProposal.title;
      const preparedFor = parsedData.cover?.prepared_for?.company_name || targetProposal.preparedFor;
      const preparedDate = new Date().toISOString();

      const projectIdConnect = parsedData.metadata?.project_id === "[Select Connected Project]" ? undefined : parsedData.metadata?.project_id;

      const saveData = {
        proposalId,
        version,
        title,
        preparedFor,
        preparedDate,
        content: targetYaml,
        projectIdConnect,
        otpCode: forceWithOtp
      };

      // Check if this version already exists in database
      const isExistingVersion = proposals.some(
        p => p.proposalId === proposalId && p.version === version
      );

      if (isExistingVersion && !forceWithOtp) {
        // Must request OTP to overwrite a saved version
        triggerSendOtp('EditProposal', saveData);
        return;
      }

      const res = await fetch(`/api/workspaces/${workspaceId}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      });

      if (res.ok) {
        const saved = await res.json();
        // Close modal if open
        setOtpModal({ visible: false, purpose: 'EditProposal' });
        setOtpCode('');
        setOtpError('');
        
        // Refresh proposal list and set saved active
        await fetchProposals();
        loadProposal(saved);
        toast('Proposal saved successfully!');
      } else {
        const errorText = await res.text();
        if (res.status === 403 || res.status === 400) {
          setOtpError(`Authorization failed: ${errorText}`);
        } else {
          alert(`Failed to save: ${errorText}`);
        }
      }
    } catch (e: any) {
      console.error(e);
      alert(`Save error: ${e.message}`);
    }
  };

  // 8. Delete Proposal Version (OTP Gated)
  const handleDelete = async (forceWithOtp?: string) => {
    if (!activeProposal || !activeProposal.id) return;

    if (!forceWithOtp) {
      triggerSendOtp('DeleteProposal');
      return;
    }

    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/proposals/${activeProposal.proposalId}/${activeProposal.version}?otpCode=${forceWithOtp}`,
        {
          method: 'DELETE',
        }
      );

      if (res.ok) {
        setOtpModal({ visible: false, purpose: 'DeleteProposal' });
        setOtpCode('');
        setOtpError('');
        setActiveProposal(null);
        setYamlText('');
        await fetchProposals();
        alert('Proposal deleted successfully.');
      } else {
        const errorText = await res.text();
        setOtpError(`Authorization failed: ${errorText}`);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Delete error: ${e.message}`);
    }
  };

  // Helper to send OTP and display modal
  const triggerSendOtp = async (purpose: 'EditProposal' | 'DeleteProposal', pendingData?: any) => {
    setOtpModal({ visible: true, purpose, pendingSaveData: pendingData });
    setOtpSending(true);
    setOtpError('');
    setOtpCode('');

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/proposals/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        setOtpError(`Failed to send verification email: ${errorText}`);
      }
    } catch (e: any) {
      setOtpError(`OTP delivery error: ${e.message}`);
    } finally {
      setOtpSending(false);
    }
  };

  // 9. Export PDF (Puppeteer)
  const handleExportPdf = async () => {
    if (!iframeRef.current) return;
    
    try {
      toast('Compiling Proposal PDF...');
      
      // Grab current outerHTML of iframe which contains the live DOM state
      const iframeDoc = iframeRef.current.contentWindow?.document;
      if (!iframeDoc) return;
      
      const htmlContent = iframeDoc.documentElement.outerHTML;
      setDownloadProgress(0);
      const pdfBlob = await fetchPdfWithProgress('/api/proposals/pdf', { html: htmlContent }, setDownloadProgress);
      const filename = `${activeProposal?.proposalId || 'proposal'}_v${activeProposal?.version || '1.0'}.pdf`;
      await saveBlob(pdfBlob, filename);
      toast('Proposal PDF will be downloaded...');
    } catch (e: any) {
      console.error(e);
      toast(`Failed to export PDF: ${e.message}`);
    } finally {
      setDownloadProgress(null);
    }
  };

  const downloadProposalPdf = async (proposal: Proposal) => {
    try {
      toast('Compiling Proposal PDF...');
      let rawTemplate = templateHtml;
      if (!rawTemplate) {
        try {
          const templateRes = await fetch('/proposal_template.html');
          const templateTxt = await templateRes.text();
          if (templateTxt && templateTxt.includes('page-cover')) {
            rawTemplate = templateTxt;
          }
        } catch (e) {}
      }
      if (!rawTemplate) rawTemplate = fallbackTemplateHtml;

      const data = YAML.parse(proposal.content);
      let rendered = injectData(rawTemplate, data, companyProfile);
      
      if (rendered.includes('</body>')) {
        rendered = rendered.replace('</body>', scriptToInject + '\n</body>');
      } else {
        rendered = rendered + scriptToInject;
      }
      if (rendered.includes('<head>')) {
        rendered = rendered.replace('<head>', '<head>\n  <base href="/">');
      } else {
        rendered = '<base href="/">' + rendered;
      }

      setDownloadProgress(0);
      const pdfBlob = await fetchPdfWithProgress('/api/proposals/pdf', { html: rendered }, setDownloadProgress);
      const filename = `${proposal.proposalId || 'proposal'}_v${proposal.version || '1.0'}.pdf`;
      await saveBlob(pdfBlob, filename);
      toast('Proposal PDF will be downloaded...');
    } catch (e: any) {
      console.error(e);
      toast(`Failed to export PDF: ${e.message}`);
    } finally {
      setDownloadProgress(null);
    }
  };

  // 10. YAML File Actions (Import/Export)
  const handleExportYaml = () => {
    if (!yamlText) return;
    const blob = new Blob([yamlText], { type: 'application/x-yaml' });
    const filename = `${activeProposal?.proposalId || 'proposal'}.yaml`;
    saveBlob(blob, filename);
  };

  const handleImportYaml = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        // Validate YAML syntax
        const parsed = YAML.parse(text);
        const metadata = parsed?.metadata || {};
        const cover = parsed?.cover || {};
        
        const proposalId = metadata.proposal_id || `PROP-2026-IMP-${Math.floor(100000 + Math.random() * 900000)}`;
        const version = metadata.version || '1.0';
        const title = cover.title || 'Imported Proposal';
        const preparedFor = cover.prepared_for?.company_name || 'Example Client';
        
        const importedProposal: Proposal = {
          id: '',
          workspaceId,
          proposalId,
          version,
          title,
          preparedFor,
          preparedDate: new Date().toISOString(),
          content: text
        };

        setActiveProposal(importedProposal);
        lastChangeSource.current = null;
        setYamlText(text);
        alert('YAML file imported successfully!');
      } catch (err: any) {
        alert(`Failed to parse YAML: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const activeProposalProjectId = useMemo(() => {
    if (!yamlText) return '';
    try {
      const parsed = YAML.parse(yamlText);
      return parsed.metadata?.project_id || '';
    } catch (e) {
      return '';
    }
  }, [yamlText]);

  const handleConnectProject = (projectId: string) => {
    try {
      const doc = YAML.parseDocument(yamlText);
      doc.setIn(['metadata', 'project_id'], projectId || "[Select Connected Project]");
      
      const selected = projects.find(p => p.id === projectId);
      setYamlText(doc.toString());
      toast(`Connected to Project: ${selected ? selected.name : 'none'}`);
    } catch (e) {
      console.error(e);
    }
  };



  // 11b. Proposals AI Copilot Drawer Handlers
  const handleProposalsCopilotAction = async (action: string, overrideText?: string, overrideInstructions?: string) => {
    const textToProcess = overrideText || selection?.text;
    const inst = overrideInstructions !== undefined ? overrideInstructions : copilotInput.trim();
    
    if (!textToProcess) {
      setCopilotMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Please highlight/select a section of text in the document preview on the left first to apply this action.' }
      ]);
      return;
    }

    setIsCopilotLoading(true);
    setCopilotInput('');

    // Append user query message
    const displayInstructions = inst ? ` (Instructions: "${inst}")` : '';
    setCopilotMessages(prev => [...prev, { role: 'user', content: `Run AI ${action}${displayInstructions} on selection.` }]);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/proposals/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          text: textToProcess,
          instructions: inst,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCopilotMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.result,
            pendingSuggestion: data.result,
          }
        ]);
      } else {
        const errorText = await res.text();
        setCopilotMessages(prev => [
          ...prev,
          { role: 'assistant', content: `**AI Copilot failed:** ${errorText}` }
        ]);
      }
    } catch (e: any) {
      setCopilotMessages(prev => [
        ...prev,
        { role: 'assistant', content: `**Error:** ${e.message}` }
      ]);
    } finally {
      setIsCopilotLoading(false);
    }
  };

  const handleCopilotSend = async () => {
    if (!copilotInput.trim()) return;
    await handleProposalsCopilotAction('rewrite');
  };

  const handleApplySuggestion = (suggestionText: string, msgIndex: number) => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(
        { type: 'REPLACE_SELECTION', value: suggestionText },
        '*'
      );
    }
    // Remove the pending action buttons from that message
    setCopilotMessages(prev => prev.map((msg, idx) => {
      if (idx === msgIndex) {
        return { ...msg, pendingSuggestion: undefined };
      }
      return msg;
    }).concat({ role: 'assistant', content: 'Suggestion applied to document successfully!' }));
    setSelection(null);
  };

  const handleRejectSuggestion = (msgIndex: number) => {
    setCopilotMessages(prev => prev.map((msg, idx) => {
      if (idx === msgIndex) {
        return { ...msg, pendingSuggestion: undefined };
      }
      return msg;
    }).concat({ role: 'assistant', content: 'Suggestion cancelled.' }));
  };



  const formatButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: '#f3f4f6',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  };

  const handleFormatText = (tag: 'strong' | 'em' | 'u' | 'code') => {
    if (!selection) return;
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'FORMAT_COMMAND',
        command: tag
      }, '*');
    }
  };

  // Compute absolute layout bounds of floating formatting toolbar
  const getFloatingToolbarStyle = (): React.CSSProperties => {
    if (!selection || !iframeRef.current) return { display: 'none' };
    const iframeRect = iframeRef.current.getBoundingClientRect();
    
    // Position floating toolbar above the text selection rectangle
    const top = iframeRect.top + selection.rect.top - 48;
    const left = iframeRect.left + selection.rect.left + selection.rect.width / 2 - 68;

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      display: 'flex',
      backgroundColor: '#1f2937',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      padding: '4px',
      gap: '4px',
      zIndex: 99999,
      alignItems: 'center',
      animation: 'fadeIn 0.15s ease-out',
    };
  };

  return (
    <div className={styles.container}>
      {/* 2. Main Edit/Preview Pane */}
      <div className={styles.mainContent}>
        {/* Top Header Actions */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {activeProposal ? (
              <div className={styles.breadcrumbActiveDoc}>
                <button
                  className={styles.btn}
                  style={{ border: 'none', padding: '2px 6px', background: 'transparent', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 500 }}
                  onClick={() => {
                    setActiveProposal(null);
                    setSearchParams({});
                  }}
                >
                  ← Dashboard
                </button>
                <div className={styles.breadcrumbSeparator}>/</div>
                <span className={styles.activeDocId}>{activeProposal.proposalId}</span>
                <div className={styles.breadcrumbSeparator}>/</div>
                <span className={styles.activeDocTitle} title={activeProposal.title}>{activeProposal.title}</span>
                <div className={styles.breadcrumbSeparator}>/</div>
                
                {/* Version switcher dropdown */}
                <div className={styles.versionSwitcherWrapper} ref={versionDropdownRef}>
                  <button 
                    className={styles.versionSwitcherBtn}
                    onClick={() => setVersionMenuOpen(!versionMenuOpen)}
                  >
                    <span>v{activeProposal.version}</span>
                    <svg className={styles.chevronIcon} style={{ transform: versionMenuOpen ? 'rotate(180deg)' : 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  {versionMenuOpen && (
                    <div className={styles.dropdownMenu}>
                      <div className={styles.dropdownHeader}>Document Versions</div>
                      {proposals
                        .filter(p => p.proposalId === activeProposal.proposalId)
                        .sort((a, b) => parseFloat(b.version) - parseFloat(a.version))
                        .map((p) => (
                          <button
                            key={p.version}
                            className={`${styles.dropdownItem} ${p.version === activeProposal.version ? styles.dropdownItemActive : ''}`}
                            onClick={() => {
                              loadProposal(p);
                              setVersionMenuOpen(false);
                            }}
                          >
                            <span className={styles.dropdownItemVersion}>v{p.version}</span>
                            <span className={styles.dropdownItemDate}>{new Date(p.preparedDate).toLocaleDateString()}</span>
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>

                {/* Connected Project Link Selector */}
                <select
                  value={activeProposalProjectId}
                  onChange={e => handleConnectProject(e.target.value)}
                  className={styles.headerSelect}
                  style={{ marginLeft: '16px' }}
                >
                  <option value="">-- Connect to Project --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className={styles.activeDocId} style={{ fontSize: '14px', fontWeight: 600 }}>Proposals Dashboard</span>
            )}

            {/* Direct YAML upload button */}
            <button 
              className={styles.plusBtn}
              onClick={() => fileInputRef.current?.click()}
              title="Import YAML File"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="11" x2="12" y2="17"></line>
                <polyline points="9 14 12 17 15 14"></polyline>
              </svg>
            </button>
          </div>

          <div className={styles.headerActions}>
            {activeProposal && (
              <>
                <button className={styles.btn} onClick={handleExportPdf}>
                  Export PDF
                </button>
                <button 
                  className={styles.btn} 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleBumpVersion(activeProposal);
                  }}
                >
                  Bump Version
                </button>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => handleSave()}>
                  Save Version
                </button>

                {/* More Actions dropdown menu */}
                <div className={styles.actionsMenuWrapper} ref={actionsDropdownRef}>
                  <button 
                    className={styles.iconBtn} 
                    onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
                    title="More Actions"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="19" cy="12" r="1"></circle>
                      <circle cx="5" cy="12" r="1"></circle>
                    </svg>
                  </button>
                  {actionsMenuOpen && (
                    <div className={styles.dropdownMenu} style={{ right: 0, left: 'auto' }}>
                      <button
                        className={styles.dropdownItem}
                        onClick={() => {
                          handleExportYaml();
                          setActionsMenuOpen(false);
                        }}
                        disabled={!yamlText}
                      >
                        <span>Export YAML</span>
                      </button>
                      <button
                        className={styles.dropdownItem}
                        onClick={() => {
                          fileInputRef.current?.click();
                          setActionsMenuOpen(false);
                        }}
                      >
                        <span>Import YAML</span>
                      </button>
                      {activeProposal?.id && (
                        <button
                          className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                          onClick={() => {
                            handleDelete();
                            setActionsMenuOpen(false);
                          }}
                        >
                          <span>Delete Version</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {activeProposal ? (
          /* Split Editor */
          <div ref={splitPaneRef} className={styles.splitPane}>
            {/* Iframe preview */}
            <div className={styles.previewPane} style={{ flex: `0 0 ${splitPercent}%`, width: `${splitPercent}%`, minWidth: 0, position: 'relative' }}>
              {iframeSrcDoc ? (
                <iframe
                  ref={iframeRef}
                  className={styles.iframe}
                  srcDoc={iframeSrcDoc}
                  title="Proposal Preview"
                  style={{ pointerEvents: isResizing ? 'none' : 'auto' }}
                />
              ) : (
                <div style={{ color: '#71717a' }}>No proposal loaded or template empty.</div>
              )}
              {/* Iframe overlay when OTP modal is open - iframe CSS can't be blurred from parent */}
              {otpModal.visible && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                  zIndex: 99999,
                  borderRadius: '12px',
                }} />
              )}
            </div>

            {/* Resize Handle Divider */}
            <div 
              onMouseDown={startResize}
              style={{
                width: '8px',
                cursor: 'col-resize',
                backgroundColor: isResizing ? '#3b82f6' : '#e4e4e7',
                borderLeft: '1px solid #d4d4d8',
                borderRight: '1px solid #d4d4d8',
                transition: 'background-color 0.2s',
                zIndex: 20,
              }}
              onMouseEnter={(e) => { if (!isResizing) e.currentTarget.style.backgroundColor = '#3b82f6'; }}
              onMouseLeave={(e) => { if (!isResizing) e.currentTarget.style.backgroundColor = '#e4e4e7'; }}
            />

            {/* YAML Raw editor */}
            <div className={styles.editorPane} style={{ flex: `0 0 ${100 - splitPercent}%`, width: `${100 - splitPercent}%` }}>
              <div className={styles.editorHeader}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className={styles.editorTitle}>STRUCTURE VIEW (YAML)</div>
                  {activeKey && (
                    <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 500 }}>
                      Active: {activeKey}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#71717a' }}>Save manually to apply changes</div>
              </div>
              <div style={{ position: 'relative', flex: 1, width: '100%', minHeight: 0, overflow: 'hidden', backgroundColor: '#18181b' }}>
                {/* Visual Line Highlight behind the text */}
                {activeLineIdx !== -1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: `${16 + (activeLineIdx * 18) - scrollTop}px`,
                      height: '18px',
                      backgroundColor: 'rgba(37, 99, 235, 0.15)', // Subtle blue highlight
                      borderLeft: '3px solid #2563eb', // Left visual edge marker
                      pointerEvents: 'none',
                      zIndex: 0,
                    }}
                  />
                )}
                <textarea
                  ref={textareaRef}
                  className={styles.textarea}
                  value={yamlText}
                  onChange={(e) => {
                    lastChangeSource.current = 'editor';
                    setYamlText(e.target.value);
                  }}
                  onMouseUp={handleYamlMouseUp}
                  onKeyUp={handleYamlKeyUp}
                  onScroll={(e) => {
                    setScrollTop(e.currentTarget.scrollTop);
                  }}
                  wrap="off"
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    background: 'transparent',
                    lineHeight: '18px',
                    whiteSpace: 'pre',
                    overflowX: 'auto',
                    margin: 0,
                    padding: '16px',
                    transition: 'box-shadow 0.3s ease',
                    boxShadow: yamlFlash ? '0 0 0 2px rgba(251, 191, 36, 0.5)' : undefined,
                  }}
                  placeholder="# YAML proposal content goes here..."
                />
              </div>
            </div>
          </div>
        ) : (
          /* Proposals Dashboard */
          <div className={styles.dashboardContainer}>
            <div className={styles.dashboardHeader}>
              <div>
                <h1 className={styles.dashboardTitle}>Project Proposals</h1>
                <p className={styles.dashboardSubtitle}>
                  Create, manage, and draft technical project proposals with AI Copilot support.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {/* Dashboard Search Input */}
                <div style={{ position: 'relative', width: '240px' }}>
                  <span className={styles.searchIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </span>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search proposals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={handleCreateNew}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>New Proposal</span>
                </button>
              </div>
            </div>

            <div className={styles.dashboardCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>Proposal ID</th>
                    <th style={{ width: '150px' }}>Title</th>
                    <th style={{ width: '140px' }}>Prepared For</th>
                    <th style={{ width: '110px' }}>Connected Project</th>
                    <th style={{ width: '120px' }}>Change Description</th>
                    <th style={{ width: '90px' }}>Date</th>
                    <th style={{ width: '80px' }}>Versions</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getGroupedProposals().map((group) => {
                    const isExpanded = !!expandedDocs[group.proposalId];
                    return (
                      <React.Fragment key={group.proposalId}>
                        <tr 
                          className={styles.tableRow}
                          onClick={() => loadProposal(group.versions[0])}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {group.versions.length > 1 ? (
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleDocExpand(group.proposalId);
                                  }}
                                  style={{ 
                                    cursor: 'pointer', 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    width: '16px',
                                    height: '16px',
                                    transition: 'transform 0.2s ease',
                                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                    color: '#71717a',
                                    fontSize: '10px'
                                  }}
                                >
                                  ▶
                                </span>
                              ) : (
                                <div style={{ width: '16px' }} />
                              )}
                              <span style={{ fontWeight: 600, display: 'inline-block', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={group.proposalId}>
                                {group.proposalId}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span style={{ display: 'inline-block', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={group.title}>
                              {group.title}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-block', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={group.preparedFor}>
                              {group.preparedFor}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-block', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={projects.find(p => p.id === group.versions[0].projectIdConnect)?.name || 'NA'}>
                              {projects.find(p => p.id === group.versions[0].projectIdConnect)?.name || 'NA'}
                            </span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <span
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                const text = e.currentTarget.innerText.trim();
                                handleUpdateDescription(group.versions[0], text);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }
                              }}
                              style={{
                                display: 'inline-block',
                                width: '100%',
                                minWidth: '80px',
                                maxWidth: '110px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                outline: 'none',
                                borderBottom: '1px dashed #d1d5db',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                verticalAlign: 'middle'
                              }}
                              title={getDescriptionForProposal(group.versions[0])}
                            >
                              {getDescriptionForProposal(group.versions[0])}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-block', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={new Date(group.latestDate).toLocaleDateString()}>
                              {new Date(group.latestDate).toLocaleDateString()}
                            </span>
                          </td>
                          <td onClick={(e) => {
                            e.stopPropagation();
                            toggleDocExpand(group.proposalId);
                          }}>
                            <span className={styles.tableVersionBadge} title={`v${group.versions[0].version}${group.versions.length > 1 ? ` (+${group.versions.length - 1} versions)` : ''}`}>
                              v{group.versions[0].version}
                              {group.versions.length > 1 && ` (+${group.versions.length - 1})`}
                            </span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                              <button
                                className={styles.tableActionBtn}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px' }}
                                onClick={() => openEditModal(group.versions[0])}
                                title="Edit Info"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                className={styles.tableActionBtn}
                                onClick={() => loadProposal(group.versions[0])}
                              >
                                Open
                              </button>
                              <button
                                className={styles.tableActionBtn}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px' }}
                                onClick={() => {
                                  downloadProposalPdf(group.versions[0]);
                                }}
                                title="Download PDF"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                  <polyline points="7 10 12 15 17 10"></polyline>
                                  <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {isExpanded && group.versions.length > 1 && group.versions.map((ver, idx) => {
                          if (idx === 0) return null;
                          return (
                            <tr
                              key={ver.version}
                              className={`${styles.tableRow} ${styles.tableSubRow}`}
                              onClick={() => loadProposal(ver)}
                            >
                              <td style={{ paddingLeft: '32px', color: '#71717a' }}>
                                <span style={{ display: 'inline-block', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={`└ ${ver.proposalId}`}>
                                  └ {ver.proposalId}
                                </span>
                              </td>
                              <td style={{ color: '#71717a' }}>
                                <span style={{ display: 'inline-block', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={`${ver.title} (Draft v${ver.version})`}>
                                  {ver.title} (Draft v{ver.version})
                                </span>
                              </td>
                              <td style={{ color: '#71717a' }}>
                                <span style={{ display: 'inline-block', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={ver.preparedFor}>
                                  {ver.preparedFor}
                                </span>
                              </td>
                              <td style={{ color: '#71717a' }}>
                                <span style={{ display: 'inline-block', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={projects.find(p => p.id === ver.projectIdConnect)?.name || 'NA'}>
                                  {projects.find(p => p.id === ver.projectIdConnect)?.name || 'NA'}
                                </span>
                              </td>
                              <td onClick={(e) => e.stopPropagation()}>
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => {
                                    const text = e.currentTarget.innerText.trim();
                                    handleUpdateDescription(ver, text);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  style={{
                                    display: 'inline-block',
                                    width: '100%',
                                    minWidth: '80px',
                                    maxWidth: '110px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    outline: 'none',
                                    borderBottom: '1px dashed #d1d5db',
                                    padding: '2px 4px',
                                    borderRadius: '4px',
                                    color: '#71717a',
                                    verticalAlign: 'middle'
                                  }}
                                  title={getDescriptionForProposal(ver)}
                                >
                                  {getDescriptionForProposal(ver)}
                                </span>
                              </td>
                              <td style={{ color: '#71717a' }}>
                                <span style={{ display: 'inline-block', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={new Date(ver.preparedDate).toLocaleDateString()}>
                                  {new Date(ver.preparedDate).toLocaleDateString()}
                                </span>
                              </td>
                              <td>
                                <span className={styles.tableVersionBadge} style={{ backgroundColor: 'transparent', border: '1px solid rgba(0,0,0,0.1)', color: '#71717a' }} title={`v${ver.version}`}>
                                  v{ver.version}
                                </span>
                              </td>
                              <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                  <button
                                    className={styles.tableActionBtn}
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px' }}
                                    onClick={() => openEditModal(ver)}
                                    title="Edit Info"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                  </button>
                                  <button
                                    className={styles.tableActionBtn}
                                    onClick={() => loadProposal(ver)}
                                  >
                                    Open
                                  </button>
                                  <button
                                    className={styles.tableActionBtn}
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px' }}
                                    onClick={() => {
                                      downloadProposalPdf(ver);
                                    }}
                                    title="Download PDF"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                      <polyline points="7 10 12 15 17 10"></polyline>
                                      <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                  {getGroupedProposals().length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#71717a' }}>
                        No proposals found. Create one to get started!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 3. Floating Formatting Toolbar */}
      {selection && (
        <div style={getFloatingToolbarStyle()}>
          <button
            style={{
              ...formatButtonStyle,
              backgroundColor: selection.states?.bold ? 'rgba(168, 85, 247, 0.35)' : 'transparent',
              border: selection.states?.bold ? '1px solid rgba(168, 85, 247, 0.5)' : 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = selection.states?.bold ? 'rgba(168, 85, 247, 0.45)' : 'rgba(255, 255, 255, 0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selection.states?.bold ? 'rgba(168, 85, 247, 0.35)' : 'transparent'; }}
            onClick={() => handleFormatText('strong')}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            style={{
              ...formatButtonStyle,
              backgroundColor: selection.states?.italic ? 'rgba(168, 85, 247, 0.35)' : 'transparent',
              border: selection.states?.italic ? '1px solid rgba(168, 85, 247, 0.5)' : 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = selection.states?.italic ? 'rgba(168, 85, 247, 0.45)' : 'rgba(255, 255, 255, 0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selection.states?.italic ? 'rgba(168, 85, 247, 0.35)' : 'transparent'; }}
            onClick={() => handleFormatText('em')}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            style={{
              ...formatButtonStyle,
              backgroundColor: selection.states?.underline ? 'rgba(168, 85, 247, 0.35)' : 'transparent',
              border: selection.states?.underline ? '1px solid rgba(168, 85, 247, 0.5)' : 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = selection.states?.underline ? 'rgba(168, 85, 247, 0.45)' : 'rgba(255, 255, 255, 0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selection.states?.underline ? 'rgba(168, 85, 247, 0.35)' : 'transparent'; }}
            onClick={() => handleFormatText('u')}
            title="Underline"
          >
            <u>U</u>
          </button>
          <button
            style={{
              ...formatButtonStyle,
              fontFamily: 'monospace',
              fontSize: '11px',
              backgroundColor: selection.states?.code ? 'rgba(168, 85, 247, 0.35)' : 'transparent',
              border: selection.states?.code ? '1px solid rgba(168, 85, 247, 0.5)' : 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = selection.states?.code ? 'rgba(168, 85, 247, 0.45)' : 'rgba(255, 255, 255, 0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selection.states?.code ? 'rgba(168, 85, 247, 0.35)' : 'transparent'; }}
            onClick={() => handleFormatText('code')}
            title="Code"
          >
            &lt;/&gt;
          </button>
        </div>
      )}

      <OtpModal
        visible={otpModal.visible}
        purpose={otpModal.purpose}
        otpCode={otpCode}
        setOtpCode={setOtpCode}
        otpError={otpError}
        otpSending={otpSending}
        onCancel={() => setOtpModal({ visible: false, purpose: 'EditProposal' })}
        onConfirm={(code) => {
          if (otpModal.purpose === 'DeleteProposal') {
            handleDelete(code);
          } else {
            handleSave(code);
          }
        }}
      />

      <BumpModal
        visible={bumpModal.visible}
        newVer={bumpModal.newVer}
        description={bumpModal.description}
        onDescriptionChange={(val) => setBumpModal(prev => ({ ...prev, description: val }))}
        onCancel={() => setBumpModal({ visible: false, baseProposal: null, newVer: '', description: '' })}
        onConfirm={confirmBumpVersion}
      />

      <ProposalModal
        docModal={docModal}
        setDocModal={setDocModal}
        onSubmit={submitDocModal}
      />

      {/* Hidden file input for YAML imports */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".yaml,.yml"
        onChange={handleImportYaml}
      />

      <CopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        selection={selection}
        onCopilotAction={handleProposalsCopilotAction}
        copilotMessages={copilotMessages}
        onApplySuggestion={handleApplySuggestion}
        onRejectSuggestion={handleRejectSuggestion}
        isLoading={isCopilotLoading}
        inputVal={copilotInput}
        onInputChange={setCopilotInput}
        onSend={handleCopilotSend}
      />

      {/* Global Spinner and Fade-in Keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      {downloadProgress !== null && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100000
        }}>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <div style={{
            backgroundColor: '#ffffff',
            padding: '28px',
            borderRadius: '16px',
            width: '380px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.80)'
          }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '20px' }}>
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '4px solid #f1f5f9',
                borderTopColor: '#2563eb',
                animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite'
              }}></div>
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 700,
                color: '#1e293b',
                fontFamily: 'system-ui, sans-serif'
              }}>
                {downloadProgress}%
              </div>
            </div>
            
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', fontFamily: 'system-ui, sans-serif' }}>
              Generating A4 PDF
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.4 }}>
              Compiling document and applying premium styles. Please wait...
            </p>

            <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                width: `${downloadProgress}%`,
                height: '100%',
                backgroundColor: '#2563eb',
                borderRadius: '3px',
                transition: 'width 0.2s ease-out'
              }}></div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
