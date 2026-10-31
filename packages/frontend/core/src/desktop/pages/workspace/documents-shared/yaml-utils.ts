import YAML from 'yaml';

export function getAllLinePaths(yaml: string): string[] {
  const lines = yaml.split('\n');
  const paths: string[] = [];
  interface StackItem {
    key: string;
    indent: number;
    isArray: boolean;
    arrayIdx?: number;
  }
  let stack: StackItem[] = [];
  let blockScalarIndent = -1;
  let blockScalarParentIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      paths.push('');
      continue;
    }

    const indent = line.search(/\S/);

    if (blockScalarIndent !== -1) {
      if (indent <= blockScalarParentIndent) {
        blockScalarIndent = -1;
        blockScalarParentIndent = -1;
      }
    }

    while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    if (blockScalarIndent !== -1) {
      paths.push(stack.map(item => item.key).join('.'));
      continue;
    }

    const isListItem = trimmed.startsWith('-');
    const contentAfterDash = isListItem ? trimmed.slice(1).trim() : trimmed;
    const endsWithBlockIndicator = /[:]\s*[|>][+-]?\s*$/.test(contentAfterDash);

    let colonIdx = contentAfterDash.indexOf(': ');
    if (colonIdx === -1 && contentAfterDash.endsWith(':')) {
      colonIdx = contentAfterDash.length - 1;
    }

    if (isListItem) {
      let parent = stack[stack.length - 1];
      if (parent) {
        if (parent.arrayIdx === undefined) {
          parent.arrayIdx = 0;
        } else {
          parent.arrayIdx++;
        }
      }

      if (colonIdx !== -1) {
        const key = contentAfterDash.slice(0, colonIdx).trim();
        if (parent) {
          stack.push({ key: String(parent.arrayIdx), indent: indent, isArray: true });
          stack.push({ key: key, indent: indent + 2, isArray: false });
        }
      } else {
        if (parent) {
          stack.push({ key: String(parent.arrayIdx), indent: indent, isArray: true });
        }
      }
    } else {
      if (colonIdx !== -1) {
        const key = trimmed.slice(0, trimmed.indexOf(':')).trim();
        stack.push({ key: key, indent: indent, isArray: false });
      }
    }

    if (endsWithBlockIndicator) {
      blockScalarParentIndent = indent;
      blockScalarIndent = indent + 2;
    }

    paths.push(stack.map(item => item.key).join('.'));
  }
  return paths;
}

export function findLineIndexForPath(yaml: string, keyPath: string): number {
  const paths = getAllLinePaths(yaml);
  const idx = paths.indexOf(keyPath);
  if (idx !== -1) return idx;

  // Fallback: leaf key search
  const lines = yaml.split('\n');
  const pathParts = keyPath.split('.');
  const leaf = pathParts[pathParts.length - 1];
  const fallbackRegex = new RegExp(`^(?:-\\s+)?${leaf}\\s*:`);
  for (let i = 0; i < lines.length; i++) {
    if (fallbackRegex.test(lines[i].trim())) {
      return i;
    }
  }
  return -1;
}

export function getPlaceholderText(key: string): string {
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
  return `[Enter ${formatted}]`;
}

export function safeInsertItem(doc: YAML.Document, path: any[], index: number, newItem: any) {
  const node = doc.getIn(path) as any;
  if (node && typeof node.insert === 'function') {
    node.insert(index, doc.createNode(newItem));
  } else if (node && Array.isArray(node.items)) {
    node.items.splice(index, 0, doc.createNode(newItem));
  } else {
    const dataObj = doc.toJS() as any;
    let list = dataObj;
    for (const p of path) {
      list = list?.[p];
    }
    if (!Array.isArray(list)) list = [];
    list.splice(index, 0, newItem);
    doc.setIn(path, list);
  }
}

export function safeDeleteItem(doc: YAML.Document, path: any[], index: number) {
  const node = doc.getIn(path) as any;
  if (node && typeof node.delete === 'function') {
    const len = Array.isArray(node.items) ? node.items.length : 0;
    if (len > 1) {
      node.delete(index);
    }
  } else if (node && Array.isArray(node.items)) {
    if (node.items.length > 1) {
      node.items.splice(index, 1);
    }
  } else {
    const dataObj = doc.toJS() as any;
    let list = dataObj;
    for (const p of path) {
      list = list?.[p];
    }
    if (Array.isArray(list) && list.length > 1) {
      list.splice(index, 1);
      doc.setIn(path, list);
    }
  }
}

export function safeAddItem(doc: YAML.Document, path: any[], newItem: any) {
  const node = doc.getIn(path) as any;
  if (node && typeof node.add === 'function') {
    node.add(doc.createNode(newItem));
  } else {
    const dataObj = doc.toJS() as any;
    let list = dataObj;
    for (const p of path) {
      list = list?.[p];
    }
    if (!Array.isArray(list)) list = [];
    list.push(newItem);
    doc.setIn(path, list);
  }
}
