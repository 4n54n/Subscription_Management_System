import React from 'react';
import { ActionExecutedCard, parseExecutedContent } from './action-executed-card';

function parseInlineMarkdown(text: string): React.ReactNode[] {
  const regex = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          style={{
            fontFamily:
              'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace',
            fontSize: '11.5px',
            background: 'var(--affine-background-secondary-color, #f4f4f5)',
            border: '1px solid var(--affine-border-color, #e4e4e7)',
            padding: '2px 4px',
            borderRadius: '4px',
            color: 'var(--affine-text-primary-color, #18181b)',
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} style={{ fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={idx} style={{ fontStyle: 'italic' }}>
          {part.slice(1, -1)}
        </em>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--affine-brand-color, #1e88e5)', textDecoration: 'underline' }}
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}

export const PresentMarkdown = ({ content }: { content: string }) => {
  if (!content) return null;

  if (parseExecutedContent(content)) {
    return <ActionExecutedCard content={content} />;
  }

  // Split by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontSize: '13px',
        lineHeight: '1.6',
        wordBreak: 'break-word',
        color: 'var(--affine-text-primary-color)',
      }}
    >
      {parts.map((part, partIdx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // It's a code block
          const match = part.match(/^```(\w*)\n([\s\S]*?)```$/);
          const lang = match ? match[1] : '';
          const code = match ? match[2] : part.slice(3, -3);

          return (
            <div
              key={partIdx}
              style={{
                margin: '6px 0',
                borderRadius: '6px',
                border: '1px solid var(--affine-border-color, #e4e4e7)',
                background: 'var(--affine-background-secondary-color, #f4f4f5)',
                overflow: 'hidden',
                width: '100%',
              }}
            >
              {lang && (
                <div
                  style={{
                    background:
                      'var(--affine-background-primary-color, #ffffff)',
                    borderBottom:
                      '1px solid var(--affine-border-color, #e4e4e7)',
                    padding: '4px 10px',
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'var(--affine-text-secondary-color, #71717a)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{lang}</span>
                </div>
              )}
              <pre
                style={{
                  margin: 0,
                  padding: '10px',
                  overflowX: 'auto',
                  fontFamily:
                    'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace',
                  fontSize: '12px',
                  whiteSpace: 'pre',
                  lineHeight: '1.4',
                  color: 'var(--affine-text-primary-color, #18181b)',
                }}
              >
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // It is regular text. We parse line by line to handle blocks (headers, lists, tables, paragraphs)
        const lines = part.split('\n');
        const elements: React.ReactNode[] = [];
        let listBuffer: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null =
          null;

        const flushList = (key: string | number) => {
          if (listBuffer) {
            const Tag = listBuffer.type;
            elements.push(
              <Tag
                key={key}
                style={{
                  margin: '4px 0 8px 0',
                  paddingLeft: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  listStyleType: listBuffer.type === 'ul' ? 'disc' : 'decimal',
                }}
              >
                {listBuffer.items}
              </Tag>
            );
            listBuffer = null;
          }
        };

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
          const line = lines[lineIdx];
          const trimmed = line.trim();

          // Table detection
          if (trimmed.startsWith('|') && trimmed.endsWith('|') && lineIdx + 1 < lines.length && lines[lineIdx + 1].trim().includes('---')) {
            flushList(`list-before-table-${lineIdx}`);
            const headers = trimmed.slice(1, -1).split('|').map(h => h.trim());
            lineIdx += 2; // Skip divider row
            const rows: string[][] = [];
            while (lineIdx < lines.length && lines[lineIdx].trim().startsWith('|') && lines[lineIdx].trim().endsWith('|')) {
              rows.push(lines[lineIdx].trim().slice(1, -1).split('|').map(c => c.trim()));
              lineIdx++;
            }
            lineIdx--; // Step back for outer loop increment

            elements.push(
              <div key={`table-${lineIdx}`} style={{ overflowX: 'auto', margin: '8px 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid var(--affine-border-color, #e4e4e7)' }}>
                  <thead>
                    <tr style={{ background: 'var(--affine-background-secondary-color, #f4f4f5)' }}>
                      {headers.map((h, i) => (
                        <th key={i} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--affine-border-color, #e4e4e7)', fontWeight: 650 }}>
                          {parseInlineMarkdown(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, ri) => (
                      <tr key={ri} style={{ borderBottom: '1px solid var(--affine-border-color, #e4e4e7)' }}>
                        {r.map((c, ci) => (
                          <td key={ci} style={{ padding: '6px 10px' }}>
                            {parseInlineMarkdown(c)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            continue;
          }

          // 1. Headers: #, ##, ###
          const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
          if (headerMatch) {
            flushList(`list-before-h-${lineIdx}`);
            const level = headerMatch[1].length;
            const text = headerMatch[2];
            const size = level === 1 ? '17px' : level === 2 ? '15px' : '13.5px';
            const margin = level === 1 ? '12px 0 6px 0' : '8px 0 4px 0';
            elements.push(
              <div
                key={`h-${lineIdx}`}
                style={{
                  fontWeight: 700,
                  fontSize: size,
                  margin: margin,
                  color: 'var(--affine-text-primary-color)',
                }}
              >
                {parseInlineMarkdown(text)}
              </div>
            );
            continue;
          }

          // 2. Unordered List Items: starts with * or - or +
          const ulMatch = line.match(/^([*\-+])\s+(.*)$/);
          if (ulMatch) {
            if (!listBuffer || listBuffer.type !== 'ul') {
              flushList(`list-flush-ul-${lineIdx}`);
              listBuffer = { type: 'ul', items: [] };
            }
            const text = ulMatch[2];
            listBuffer.items.push(
              <li
                key={`li-ul-${lineIdx}`}
                style={{ color: 'var(--affine-text-primary-color)' }}
              >
                {parseInlineMarkdown(text)}
              </li>
            );
            continue;
          }

          // 3. Ordered List Items: starts with 1., 2., etc.
          const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
          if (olMatch) {
            if (!listBuffer || listBuffer.type !== 'ol') {
              flushList(`list-flush-ol-${lineIdx}`);
              listBuffer = { type: 'ol', items: [] };
            }
            const text = olMatch[2];
            listBuffer.items.push(
              <li
                key={`li-ol-${lineIdx}`}
                style={{ color: 'var(--affine-text-primary-color)' }}
              >
                {parseInlineMarkdown(text)}
              </li>
            );
            continue;
          }

          // 4. Horizontal Rules: --- or ***
          if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
            flushList(`list-before-hr-${lineIdx}`);
            elements.push(
              <hr
                key={`hr-${lineIdx}`}
                style={{
                  border: 'none',
                  borderTop: '1px solid var(--affine-border-color, #e4e4e7)',
                  margin: '12px 0',
                }}
              />
            );
            continue;
          }

          // 5. Blockquotes: > quote
          const bqMatch = line.match(/^>\s+(.*)$/);
          if (bqMatch) {
            flushList(`list-before-bq-${lineIdx}`);
            const text = bqMatch[1];
            elements.push(
              <blockquote
                key={`bq-${lineIdx}`}
                style={{
                  margin: '6px 0',
                  paddingLeft: '12px',
                  borderLeft: '3px solid var(--affine-border-color, #e4e4e7)',
                  color: 'var(--affine-text-secondary-color, #71717a)',
                  fontStyle: 'italic',
                }}
              >
                {parseInlineMarkdown(text)}
              </blockquote>
            );
            continue;
          }

          // 6. Paragraph or Empty line
          if (trimmed === '') {
            flushList(`list-before-empty-${lineIdx}`);
            elements.push(
              <div key={`spacer-${lineIdx}`} style={{ height: '4px' }} />
            );
          } else {
            flushList(`list-before-para-${lineIdx}`);
            elements.push(
              <p key={`p-${lineIdx}`} style={{ margin: '4px 0' }}>
                {parseInlineMarkdown(line)}
              </p>
            );
          }
        }

        // Flush any remaining lists
        flushList(`list-final-${partIdx}`);

        return <div key={partIdx}>{elements}</div>;
      })}
    </div>
  );
};
