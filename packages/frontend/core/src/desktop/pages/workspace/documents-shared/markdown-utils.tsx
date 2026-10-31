import React, { useMemo } from 'react';
import { cssVar } from '@toeverything/theme';

export function parseInlineFormatting(valStr: string): string {
  let formatted = valStr.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
}

export function htmlToMarkdown(html: string): string {
  let text = html;
  text = text.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**');
  text = text.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*');
  text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  text = text.replace(/<div><br\s*\/?>\s*<\/div>/gi, '\n');
  text = text.replace(/<div>(.*?)<\/div>/gi, '\n$1');
  text = text.replace(/<p>(.*?)<\/p>/gi, '\n$1\n');
  
  if (typeof document !== 'undefined') {
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    text = txt.value;
  }
  return text;
}

export const MarkdownRenderer = ({ text }: { text: string }) => {
  const parts = useMemo(() => {
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];

    const renderedElements: React.ReactNode[] = [];

    const parseInline = (lineText: string): React.ReactNode[] => {
      const inlineRegex = /(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+`)/g;
      const tokens = lineText.split(inlineRegex);
      return tokens.map((tok, idx) => {
        if (tok.startsWith('**') && tok.endsWith('**')) {
          return <strong key={idx} style={{ fontWeight: 700 }}>{tok.slice(2, -2)}</strong>;
        }
        if (tok.startsWith('*') && tok.endsWith('*')) {
          return <em key={idx} style={{ fontStyle: 'italic' }}>{tok.slice(1, -1)}</em>;
        }
        if (tok.startsWith('`') && tok.endsWith('`')) {
          return (
            <code
              key={idx}
              style={{
                background: 'rgba(168, 85, 247, 0.1)',
                color: '#a855f7',
                padding: '2px 5px',
                borderRadius: '4px',
                fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace',
                fontSize: '11px',
              }}
            >
              {tok.slice(1, -1)}
            </code>
          );
        }
        return tok;
      });
    };

    lines.forEach((line, lineIdx) => {
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          const codeText = codeBlockContent.join('\n');
          renderedElements.push(
            <pre
              key={`code-${lineIdx}`}
              style={{
                background: 'rgba(0, 0, 0, 0.05)',
                padding: '12px',
                borderRadius: '8px',
                fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace',
                fontSize: '11.5px',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                margin: '10px 0',
                border: `1px solid ${cssVar('borderColor')}`,
              }}
            >
              {codeText}
            </pre>
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      if (line.startsWith('# ')) {
        renderedElements.push(<h1 key={lineIdx} style={{ fontSize: '18px', fontWeight: 700, margin: '12px 0 6px 0', color: cssVar('textPrimaryColor') }}>{parseInline(line.slice(2))}</h1>);
        return;
      }
      if (line.startsWith('## ')) {
        renderedElements.push(<h2 key={lineIdx} style={{ fontSize: '16px', fontWeight: 650, margin: '10px 0 6px 0', color: cssVar('textPrimaryColor') }}>{parseInline(line.slice(3))}</h2>);
        return;
      }
      if (line.startsWith('### ')) {
        renderedElements.push(<h3 key={lineIdx} style={{ fontSize: '14px', fontWeight: 600, margin: '8px 0 4px 0', color: cssVar('textPrimaryColor') }}>{parseInline(line.slice(4))}</h3>);
        return;
      }

      if (line.startsWith('> ')) {
        renderedElements.push(
          <blockquote
            key={lineIdx}
            style={{
              borderLeft: '3px solid #a855f7',
              paddingLeft: '10px',
              color: cssVar('textSecondaryColor'),
              fontStyle: 'italic',
              margin: '6px 0',
            }}
          >
            {parseInline(line.slice(2))}
          </blockquote>
        );
        return;
      }

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const cleanLine = line.trim().slice(2);
        renderedElements.push(
          <div key={lineIdx} style={{ display: 'flex', gap: '6px', margin: '4px 0 4px 12px' }}>
            <span style={{ color: '#a855f7' }}>•</span>
            <span>{parseInline(cleanLine)}</span>
          </div>
        );
        return;
      }

      const numMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numMatch) {
        const indent = numMatch[1];
        const num = numMatch[2];
        const rest = numMatch[3];
        renderedElements.push(
          <div key={lineIdx} style={{ display: 'flex', gap: '6px', margin: `4px 0 4px ${12 + indent.length * 4}px` }}>
            <span style={{ color: '#a855f7', fontWeight: 600 }}>{num}.</span>
            <span>{parseInline(rest)}</span>
          </div>
        );
        return;
      }

      if (line.trim() === '') {
        renderedElements.push(<div key={lineIdx} style={{ height: '8px' }} />);
      } else {
        renderedElements.push(<p key={lineIdx} style={{ margin: '4px 0', lineHeight: 1.5 }}>{parseInline(line)}</p>);
      }
    });

    if (inCodeBlock && codeBlockContent.length > 0) {
      const codeText = codeBlockContent.join('\n');
      renderedElements.push(
        <pre
          key={`code-end`}
          style={{
            background: 'rgba(0, 0, 0, 0.05)',
            padding: '12px',
            borderRadius: '8px',
            fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace',
            fontSize: '11.5px',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            margin: '10px 0',
            border: `1px solid ${cssVar('borderColor')}`,
          }}
        >
          {codeText}
        </pre>
      );
    }

    return renderedElements;
  }, [text]);

  return <>{parts}</>;
};
