import YAML from 'yaml';

/**
 * Intelligent YAML Copilot Edit Engine
 * Supports Invoices, Quotes, Proposals, and Letterheads
 */

function formatIndianNumber(val: string | number): string {
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(num)) return String(val);
  return num.toLocaleString('en-IN');
}

function formatWesternNumber(val: string | number): string {
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(num)) return String(val);
  return num.toLocaleString('en-US');
}

// Recursive deep key finder across all hierarchy levels in YAML AST
export const findDeepKeyPath = (node: any, target: string, currentPath: string[] = []): string[] | null => {
  if (!node) return null;
  const normTarget = target.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');

  if (YAML.isMap(node)) {
    for (const item of (node as any).items || []) {
      const itemKey = (item as any)?.key;
      const rawKey = String(itemKey?.value || itemKey || '');
      const lowerKey = rawKey.toLowerCase();
      const normKey = lowerKey.replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');

      const nextPath = [...currentPath, rawKey];
      if (
        lowerKey === target.toLowerCase() ||
        normKey === normTarget ||
        (normTarget.length >= 4 && (normKey.includes(normTarget) || normTarget.includes(normKey)))
      ) {
        return nextPath;
      }

      const sub = findDeepKeyPath((item as any)?.value, target, nextPath);
      if (sub) return sub;
    }
  } else if (typeof node === 'object' && node !== null) {
    for (const k of Object.keys(node)) {
      const lowerKey = k.toLowerCase();
      const normKey = lowerKey.replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
      const nextPath = [...currentPath, k];

      if (
        lowerKey === target.toLowerCase() ||
        normKey === normTarget ||
        (normTarget.length >= 4 && (normKey.includes(normTarget) || normTarget.includes(normKey)))
      ) {
        return nextPath;
      }

      const sub = findDeepKeyPath(node[k], target, nextPath);
      if (sub) return sub;
    }
  }
  return null;
};

// Exact dot-separated key finder (e.g. cover.research_validation)
export const findExactPath = (node: any, parts: string[]): string[] | null => {
  if (!node || parts.length === 0) return null;
  const currentPart = parts[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');

  if (YAML.isMap(node)) {
    for (const item of (node as any).items || []) {
      const itemKey = (item as any)?.key;
      const rawKey = String(itemKey?.value || itemKey || '');
      const normKey = rawKey.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');

      if (normKey === currentPart) {
        if (parts.length === 1) return [rawKey];
        const sub = findExactPath((item as any)?.value, parts.slice(1));
        if (sub) return [rawKey, ...sub];
      }
    }
  } else if (typeof node === 'object' && node !== null) {
    for (const k of Object.keys(node)) {
      const normKey = k.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
      if (normKey === currentPart) {
        if (parts.length === 1) return [k];
        const sub = findExactPath(node[k], parts.slice(1));
        if (sub) return [k, ...sub];
      }
    }
  }
  return null;
};

export function applyCopilotEditToYaml(
  currentYaml: string,
  detail: {
    editMode?: string;
    targetSection?: string;
    newContent?: string;
    summary?: string;
  }
): string {
  if (!currentYaml) return currentYaml;
  const { editMode, targetSection, newContent, summary } = detail;
  let updatedYaml = currentYaml;

  // 1. Full document replacement if editMode is REPLACE_CONTENT and newContent is multi-line YAML
  if (
    editMode === 'REPLACE_CONTENT' &&
    (!targetSection || targetSection === 'all' || targetSection === 'document' || targetSection === 'full') &&
    newContent &&
    (newContent.includes(':\n') || newContent.includes(': ') || newContent.startsWith('---'))
  ) {
    return newContent.trim();
  }

  // 2. Target Section represents a YAML Key/Property (e.g. "body", "notes", "terms", "subject", "research_validation", "cover.title", "cover")
  if (targetSection && newContent) {
    try {
      const doc = YAML.parseDocument(currentYaml);
      const cleanTarget = targetSection.trim();
      const targetParts = cleanTarget.split('.');

      let matchedPath =
        (targetParts.length > 1 ? findExactPath(doc.contents, targetParts) : null) ||
        findDeepKeyPath(doc.contents, cleanTarget);

      // Semantic title mapping fallback: if targetSection contains "title", check cover.title, metadata.short_title, etc.
      if (!matchedPath && (cleanTarget.toLowerCase().includes('title') || cleanTarget.toLowerCase().includes('heading'))) {
        if (doc.getIn(['cover', 'title']) !== undefined) {
          matchedPath = ['cover', 'title'];
        } else if (doc.getIn(['metadata', 'short_title']) !== undefined) {
          matchedPath = ['metadata', 'short_title'];
        } else if (doc.getIn(['metadata', 'title']) !== undefined) {
          matchedPath = ['metadata', 'title'];
        } else if (doc.getIn(['title']) !== undefined) {
          matchedPath = ['title'];
        }
      }

      // Semantic subtitle mapping fallback
      if (!matchedPath && cleanTarget.toLowerCase().includes('subtitle')) {
        if (doc.getIn(['cover', 'subtitle']) !== undefined) {
          matchedPath = ['cover', 'subtitle'];
        } else if (doc.getIn(['subtitle']) !== undefined) {
          matchedPath = ['subtitle'];
        }
      }

      if (matchedPath && matchedPath.length > 0) {
        let valToSet: any = newContent.trim();
        if (
          (valToSet.startsWith('{') && valToSet.endsWith('}')) ||
          (valToSet.startsWith('[') && valToSet.endsWith(']')) ||
          valToSet.startsWith('- ') ||
          valToSet.includes(':\n') ||
          valToSet.includes(': ')
        ) {
          try {
            valToSet = YAML.parse(valToSet);
          } catch {}
        }

        // Unwrap if valToSet is an object matching the leaf key (e.g. setting cover.title with newContent: `title: "Hello world"` => "Hello world")
        const leafKey = matchedPath[matchedPath.length - 1];
        if (
          typeof valToSet === 'object' &&
          valToSet !== null &&
          !Array.isArray(valToSet) &&
          valToSet[leafKey] !== undefined
        ) {
          valToSet = valToSet[leafKey];
        }

        // If valToSet is an object (container of key-values) and the target node in doc is also a Map/Object:
        // MERGE keys instead of destroying other sibling fields in the container!
        if (typeof valToSet === 'object' && valToSet !== null && !Array.isArray(valToSet)) {
          const existingNode = doc.getIn(matchedPath);
          if (existingNode && (YAML.isMap(existingNode) || typeof existingNode === 'object')) {
            for (const [subKey, subVal] of Object.entries(valToSet)) {
              doc.setIn([...matchedPath, subKey], subVal);
            }
            return doc.toString();
          }
        }

        doc.setIn(matchedPath, valToSet);
        return doc.toString();
      }
    } catch (e) {
      console.warn('YAML Document AST search failed, continuing to item-based replacement', e);
    }
  }

  // 3. Intelligent Line Item / Array Item Targeting (e.g. Phase 1 rate to 100, item 2 qty to 5)
  if (targetSection || newContent || summary) {
    try {
      const doc = YAML.parseDocument(currentYaml);
      const itemsNode = doc.get('items') as any;

      if (itemsNode && Array.isArray(itemsNode.items)) {
        const combinedText = `${targetSection || ''} ${summary || ''}`.toLowerCase();

        // Detect item/phase number
        const phaseMatch =
          combinedText.match(/(?:phase|item|stage|milestone|task)\s*(\d+)/i) ||
          (targetSection || '').match(/^(\d+)/);
        const targetPhaseNum = phaseMatch ? parseInt(phaseMatch[1], 10) : null;

        let bestIndex = -1;
        let highestScore = 0;

        itemsNode.items.forEach((itemNode: any, idx: number) => {
          let score = 0;
          const numVal = parseInt(String(itemNode.get?.('num') || idx + 1), 10);
          if (targetPhaseNum !== null && numVal === targetPhaseNum) {
            score += 10;
          }

          const nameStr = String(itemNode.get?.('name') || '').toLowerCase();
          const descStr = String(itemNode.get?.('desc') || '').toLowerCase();

          const keywords = (targetSection || '')
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter(
              w =>
                w.length >= 3 &&
                !['the', 'and', 'for', 'with', 'rate', 'phase', 'item', 'from'].includes(w)
            );

          for (const kw of keywords) {
            if (nameStr.includes(kw)) score += 2;
            if (descStr.includes(kw)) score += 2;
          }

          if (score > highestScore) {
            highestScore = score;
            bestIndex = idx;
          }
        });

        if (bestIndex !== -1 && highestScore >= 2) {
          const targetItemNode = itemsNode.items[bestIndex];
          if (targetItemNode) {
            let changed = false;

            // Extract rate/price value
            const rateMatch =
              (newContent || '').match(/rate\s*:\s*([\d,]+(?:\.\d+)?)/i) ||
              (summary || '').match(/rate\s+(?:to|is|=|by)?\s*['"‘“]?([\d,]+(?:\.\d+)?)['"’”]?/i) ||
              (summary || '').match(/(?:to|is|=|set to)\s+['"‘“]?([\d,]+(?:\.\d+)?)['"’”]?/i);

            if (rateMatch && rateMatch[1]) {
              const newRate = parseFloat(rateMatch[1].replace(/,/g, ''));
              if (!isNaN(newRate)) {
                targetItemNode.set('rate', newRate);
                const currentQty = parseFloat(String(targetItemNode.get('qty') || 1)) || 1;
                targetItemNode.set('amount', newRate * currentQty);
                changed = true;
              }
            }

            // Extract quantity value
            const qtyMatch = (newContent || '').match(/qty\s*:\s*([\d,]+(?:\.\d+)?)/i);
            if (qtyMatch && qtyMatch[1]) {
              const newQty = parseFloat(qtyMatch[1].replace(/,/g, ''));
              if (!isNaN(newQty)) {
                targetItemNode.set('qty', newQty);
                const currentRate = parseFloat(String(targetItemNode.get('rate') || 0)) || 0;
                targetItemNode.set('amount', newQty * currentRate);
                changed = true;
              }
            }

            // Extract other key-values from newContent
            if ((newContent || '').includes(':\n') || (newContent || '').includes(': ')) {
              try {
                const parsedFields = YAML.parse(newContent || '');
                if (typeof parsedFields === 'object' && parsedFields !== null) {
                  for (const [k, v] of Object.entries(parsedFields)) {
                    targetItemNode.set(k, v);
                    changed = true;
                  }
                }
              } catch {}
            }

            if (changed) {
              // Recalculate summary subtotal and total if present
              const summaryNode = doc.get('summary') as any;
              if (summaryNode && typeof summaryNode.get === 'function') {
                let newSubtotal = 0;
                itemsNode.items.forEach((it: any) => {
                  const itAmt = parseFloat(String(it.get?.('amount') || 0)) || 0;
                  newSubtotal += itAmt;
                });
                summaryNode.set('subtotal', newSubtotal);
                summaryNode.set('total', newSubtotal);
                summaryNode.set('balance_due', newSubtotal);
              }

              return doc.toString();
            }
          }
        }
      }
    } catch (e) {
      console.warn('Item targeting in YAML failed, continuing with text replacement', e);
    }
  }

  // 4. Numeric / Rate / Quantity / Price changes from summary
  const numChangeMatches = [
    ...(summary || '').matchAll(/(?:from|by|to)\s+(?:₹|Rs\.?|\$|INR)?\s*['"‘“]?([\d,]+(?:\.\d+)?)['"’”]?\s+(?:to|with|and)\s+(?:₹|Rs\.?|\$|INR)?\s*['"‘“]?([\d,]+(?:\.\d+)?)['"’”]?/gi),
    ...(summary || '').matchAll(/['"‘“]?([\d,]+(?:\.\d+)?)['"’”]?\s*(?:₹|Rs\.?|\$|INR)?\s*(?:to|->|→)\s*(?:₹|Rs\.?|\$|INR)?\s*['"‘“]?([\d,]+(?:\.\d+)?)['"’”]?/gi),
    ...(summary || '').matchAll(/(?:increase|decrease|change|update)\s+.*?(?:from\s+)?(?:₹|Rs\.?|\$|INR)?\s*['"‘“]?([\d,]+(?:\.\d+)?)['"’”]?\s+(?:to|with)\s+(?:₹|Rs\.?|\$|INR)?\s*['"‘“]?([\d,]+(?:\.\d+)?)['"’”]?/gi),
  ];

  for (const match of numChangeMatches) {
    const fromStr = match[1];
    const toStr = match[2];
    if (!fromStr || !toStr) continue;

    const rawFrom = fromStr.replace(/,/g, '');
    const rawTo = toStr.replace(/,/g, '');

    const indianFrom = formatIndianNumber(rawFrom);
    const westernFrom = formatWesternNumber(rawFrom);
    const indianTo = formatIndianNumber(rawTo);
    const westernTo = formatWesternNumber(rawTo);

    const candidates = [
      { search: rawFrom, replace: rawTo },
      { search: fromStr, replace: toStr },
      { search: indianFrom, replace: indianTo },
      { search: westernFrom, replace: westernTo },
      { search: `${rawFrom}.00`, replace: `${rawTo}.00` },
      { search: `${indianFrom}.00`, replace: `${indianTo}.00` },
      { search: `${westernFrom}.00`, replace: `${westernTo}.00` },
    ];

    for (const cand of candidates) {
      if (cand.search && updatedYaml.includes(cand.search)) {
        try {
          const escaped = cand.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const boundaryRegex = new RegExp(`(?<=[:\\s"']|^)${escaped}(?=[\\s"',\\n\\r]|$)`, 'g');
          if (boundaryRegex.test(updatedYaml)) {
            updatedYaml = updatedYaml.replace(boundaryRegex, () => cand.replace);
          } else {
            updatedYaml = updatedYaml.split(cand.search).join(cand.replace);
          }
        } catch {
          updatedYaml = updatedYaml.split(cand.search).join(cand.replace);
        }
      }
    }
  }

  // 5. String phrase / term replacements (e.g. "change '3-week' to '4-week'", "replace X with Y", "from 'A' to 'B'")
  const strChangeMatches = [
    ...(summary || '').matchAll(/(?:change|replace|update|fix|rename)\s+(?:typo\s+)?(?:from\s+)?['"‘“]([^'"‘”]+)['"’”]\s+(?:to|with)\s+['"‘“]([^'"‘”]+)['"’”]/gi),
    ...(summary || '').matchAll(/from\s+['"‘“]([^'"‘”]+)['"’”]\s+to\s+['"‘“]([^'"‘”]+)['"’”]/gi),
    ...(summary || '').matchAll(/(?:change|replace|update|fix)\s+['"‘“]?(\b\d+\s*-\s*\w+|\b\w+\b)['"‘”]?\s+to\s+['"‘“]?(\b\d+\s*-\s*\w+|\b\w+\b)['"‘”]?/gi),
  ];

  for (const match of strChangeMatches) {
    const oldVal = match[1]?.trim();
    const newVal = match[2]?.trim();
    if (oldVal && newVal && updatedYaml.includes(oldVal)) {
      updatedYaml = updatedYaml.split(oldVal).join(newVal);
    }
  }

  // 6. Target Section & New Content Block Replacement
  if (targetSection && newContent && (updatedYaml === currentYaml || editMode === 'REWRITE_BLOCK' || editMode === 'REPLACE_CONTENT')) {
    const cleanTarget = targetSection.trim();
    const cleanNew = newContent.trim();

    if (cleanNew.startsWith('- ') || cleanNew.includes(':\n') || cleanNew.includes(': ')) {
      const lines = updatedYaml.split('\n');
      const targetIdx = lines.findIndex(l => l.toLowerCase().includes(cleanTarget.toLowerCase()));

      if (targetIdx !== -1) {
        // Locate start of array item block (line starting with '- ')
        let blockStart = targetIdx;
        while (
          blockStart > 0 &&
          !lines[blockStart].trim().startsWith('- ') &&
          (lines[blockStart].startsWith('  ') || lines[blockStart].startsWith('\t'))
        ) {
          blockStart--;
        }

        // Locate end of block
        let blockEnd = targetIdx + 1;
        while (
          blockEnd < lines.length &&
          !lines[blockEnd].trim().startsWith('- ') &&
          (lines[blockEnd].startsWith('    ') ||
            lines[blockEnd].startsWith('\t\t') ||
            (lines[blockEnd].startsWith('  ') && !lines[blockEnd].trim().startsWith('- ')))
        ) {
          blockEnd++;
        }

        const indentMatch = lines[blockStart].match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '  ';
        const formattedNew = cleanNew
          .split('\n')
          .map((l, i) => {
            const trimmed = l.trim();
            if (i === 0) {
              return trimmed.startsWith('- ') ? `${indent}${trimmed}` : `${indent}- ${trimmed}`;
            }
            return `${indent}  ${trimmed}`;
          })
          .join('\n');

        const before = lines.slice(0, blockStart).join('\n');
        const after = lines.slice(blockEnd).join('\n');
        updatedYaml = `${before}\n${formattedNew}\n${after}`.replace(/\n{3,}/g, '\n\n').trim();
      } else if (updatedYaml.includes(cleanTarget)) {
        updatedYaml = updatedYaml.split(cleanTarget).join(cleanNew);
      }
    } else if (updatedYaml.includes(cleanTarget)) {
      // If cleanTarget is followed immediately by a colon (key name), update value safely using YAML doc
      try {
        const doc = YAML.parseDocument(updatedYaml);
        const p = findDeepKeyPath(doc.contents, cleanTarget);
        if (p) {
          doc.setIn(p, cleanNew);
          updatedYaml = doc.toString();
        } else {
          updatedYaml = updatedYaml.split(cleanTarget).join(cleanNew);
        }
      } catch {
        updatedYaml = updatedYaml.split(cleanTarget).join(cleanNew);
      }
    } else {
      const unformattedTarget = cleanTarget.replace(/,/g, '');
      const unformattedNew = cleanNew.replace(/,/g, '');
      if (updatedYaml.includes(unformattedTarget)) {
        updatedYaml = updatedYaml.split(unformattedTarget).join(unformattedNew);
      }
    }
  }

  // 7. Fallback string tokens from summary
  if (updatedYaml === currentYaml && newContent) {
    const tokens =
      (summary || '')
        .match(/['"‘“]([^'"‘”]+)['"’”]/g)
        ?.map((s: string) => s.replace(/['"‘”]/g, '')) || [];
    for (const token of tokens) {
      if (token !== newContent && updatedYaml.includes(token)) {
        updatedYaml = updatedYaml.split(token).join(newContent);
        break;
      }
      const unformattedToken = token.replace(/,/g, '');
      const unformattedNew = newContent.replace(/,/g, '');
      if (unformattedToken !== unformattedNew && updatedYaml.includes(unformattedToken)) {
        updatedYaml = updatedYaml.split(unformattedToken).join(unformattedNew);
        break;
      }
    }
  }

  return updatedYaml;
}
