import {
  Body,
  Button as EmailButton,
  Head,
  Html,
  Section,
  Text as EmailText,
} from '@react-email/components';
import type { PropsWithChildren } from 'react';

import { BasicTextStyle } from './common';
import { FooterContent } from './footer';

const IBMPlexSans = "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export function Title(props: PropsWithChildren) {
  return (
    <EmailText
      className="email-title e-title"
      style={{
        ...BasicTextStyle,
        fontFamily: IBMPlexSans,
        fontSize: '24px',
        fontWeight: '600',
        lineHeight: '32px',
        color: '#161616',
        letterSpacing: '-0.01em',
        marginTop: '0',
        marginBottom: '16px',
      }}
    >
      {props.children}
    </EmailText>
  );
}

export function P(props: PropsWithChildren) {
  return (
    <EmailText
      className="email-text e-text"
      style={{
        ...BasicTextStyle,
        fontFamily: IBMPlexSans,
        fontSize: '15px',
        lineHeight: '24px',
        color: '#161616',
        marginTop: '0',
        marginBottom: '16px',
      }}
    >
      {props.children}
    </EmailText>
  );
}

export function Text(props: PropsWithChildren) {
  return (
    <span
      className="email-text e-text"
      style={{
        ...BasicTextStyle,
        fontFamily: IBMPlexSans,
        color: '#161616',
      }}
    >
      {props.children}
    </span>
  );
}

export function SecondaryText(
  props: PropsWithChildren<{ style?: React.CSSProperties }>
) {
  return (
    <span
      className="email-muted e-muted"
      style={{
        ...BasicTextStyle,
        fontFamily: IBMPlexSans,
        color: '#525252',
        fontSize: '13px',
        lineHeight: '20px',
        ...props.style,
      }}
    >
      {props.children}
    </span>
  );
}

export function Bold(props: PropsWithChildren) {
  return (
    <span
      className="email-bold e-bold"
      style={{
        fontFamily: IBMPlexSans,
        fontWeight: 600,
        color: '#161616',
      }}
    >
      {props.children}
    </span>
  );
}

export const OnelineCodeBlock = (props: PropsWithChildren) => {
  return (
    <pre
      className="email-codeblock e-code"
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '32px',
        fontWeight: '700',
        letterSpacing: '0.25em',
        color: '#0f62fe',
        backgroundColor: '#f4f4f5',
        border: '1px dashed #0f62fe',
        padding: '20px 24px',
        borderRadius: '6px',
        margin: '24px 0',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {props.children}
    </pre>
  );
};

export const Name = (props: PropsWithChildren) => {
  return <Bold>{props.children}</Bold>;
};

export const AvatarWithName = (props: {
  img?: string;
  name: string;
  width?: string;
  height?: string;
}) => {
  return <Name>{props.name}</Name>;
};

export function Content(props: PropsWithChildren) {
  if (typeof props.children === 'string') {
    return (
      <EmailText
        className="email-text e-text"
        style={{
          ...BasicTextStyle,
          fontFamily: IBMPlexSans,
          fontSize: '15px',
          lineHeight: '24px',
          color: '#161616',
        }}
      >
        {props.children}
      </EmailText>
    );
  }

  return (
    <div
      className="email-text e-text"
      style={{
        ...BasicTextStyle,
        fontFamily: IBMPlexSans,
        fontSize: '15px',
        lineHeight: '24px',
        color: '#161616',
      }}
    >
      {props.children}
    </div>
  );
}

export function Button(
  props: PropsWithChildren<{ type?: 'primary' | 'secondary'; href: string }>
) {
  const style = {
    ...BasicTextStyle,
    fontFamily: IBMPlexSans,
    backgroundColor: props.type === 'secondary' ? '#27272a' : '#0f62fe',
    color: '#ffffff',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
    padding: '12px 26px',
    borderRadius: '4px',
    border: props.type === 'secondary' ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
    display: 'inline-block',
    marginTop: '20px',
    marginBottom: '8px',
  };

  return (
    <EmailButton className="email-button e-btn" style={style} href={props.href}>
      {props.children}
    </EmailButton>
  );
}

function fetchTitle(
  children: React.ReactElement<PropsWithChildren>[]
): React.ReactElement {
  const title = children.find(child => child.type === Title);

  if (!title || !title.props.children) {
    throw new Error('<Title /> is required for an email.');
  }

  return title;
}

function fetchContent(
  children: React.ReactElement<PropsWithChildren>[]
): React.ReactElement | React.ReactElement[] {
  const content = children.find(child => child.type === Content);

  if (!content || !content.props.children) {
    throw new Error('<Content /> is required for an email.');
  }

  if (Array.isArray(content.props.children)) {
    return content.props.children.map((child, i) => {
      if (typeof child === 'string') {
        return (
          <div key={i} style={{ marginBottom: '12px' }}>
            <EmailText
              className="email-text e-text"
              style={{
                ...BasicTextStyle,
                fontFamily: IBMPlexSans,
                fontSize: '15px',
                lineHeight: '24px',
                color: '#f4f4f5',
              }}
            >
              {child}
            </EmailText>
          </div>
        );
      }
      return <div key={i} style={{ marginBottom: '12px' }}>{child}</div>;
    });
  }

  return content;
}

function assertChildrenIsArray(
  children: React.ReactNode
): asserts children is React.ReactElement<PropsWithChildren>[] {
  if (!Array.isArray(children) || !children.every(child => 'type' in child)) {
    throw new Error(
      'Children of `Template` element must be an array of [<Title />, <Content />, ...]'
    );
  }
}

function renderTopLeftLogo(serverConfig?: any) {
  const brandName = serverConfig?.brandName || 'IntoAI';

  return (
    <span
      className="email-brand e-brand"
      style={{
        fontFamily: IBMPlexSans,
        fontWeight: 700,
        fontSize: '24px',
        color: '#161616',
        letterSpacing: '-0.02em',
      }}
    >
      {brandName}
    </span>
  );
}

export function Template(props: PropsWithChildren) {
  assertChildrenIsArray(props.children);

  const content = (
    <>
      <Section>{fetchTitle(props.children)}</Section>
      <Section>{fetchContent(props.children)}</Section>
    </>
  );

  if (globalThis.env?.testing) {
    return content;
  }

  const envConfig = (globalThis.env as any)?.config?.server || {};
  const globalConfig = (globalThis as any).serverConfig || {};
  const serverConfig = { ...globalConfig, ...envConfig };

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
        />
        <style>{`
          :root {
            color-scheme: light;
            supported-color-schemes: light;
          }
          body, .email-body {
            background-color: transparent !important;
            font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
          }
          .card-top {
            border-radius: 12px 12px 0 0 !important;
            border-top: 2px solid #1d4ed8 !important;
            border-left: 2px solid #1d4ed8 !important;
            border-right: 2px solid #1d4ed8 !important;
            border-bottom: none !important;
            background-color: #ffffff !important;
            background-image: linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #1d4ed8 0%, #60a5fa 50%, #0284c7 100%) !important;
            background-origin: border-box !important;
            background-clip: padding-box, border-box !important;
          }
          .card-footer {
            border-radius: 0 0 12px 12px !important;
            border-bottom: 2px solid #0284c7 !important;
            border-left: 2px solid #1d4ed8 !important;
            border-right: 2px solid #0284c7 !important;
            border-top: none !important;
            background-color: #ffffff !important;
            background-image: linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #1d4ed8 0%, #60a5fa 50%, #0284c7 100%) !important;
            background-origin: border-box !important;
            background-clip: padding-box, border-box !important;
          }
          .card-top-cell, .card-footer-cell {
            background-color: transparent !important;
          }
          .email-title, .e-title { color: #161616; }
          .email-brand, .e-brand { color: #161616; }
          .email-text, .e-text { color: #161616; }
          .email-bold, .e-bold { color: #161616; }
          .email-muted, .e-muted { color: #525252; }
          .email-box, .e-box { background-color: #f4f4f5; border-left: 4px solid #0f62fe; border-color: #e0e0e0; color: #161616; }
          .email-codeblock, .e-code { background-color: #f4f4f5; border-color: #0f62fe; color: #0f62fe; }
          .email-button, .e-btn { background-color: #0f62fe; color: #ffffff; }
          .card-middle-border {
            background-color: #1d4ed8 !important;
            background-image: linear-gradient(90deg, #1d4ed8 0%, #38bdf8 50%, #0284c7 100%) !important;
            border: none !important;
            height: 2px !important;
            line-height: 2px !important;
            font-size: 2px !important;
          }
          .email-grey-divider { border-top: 1px solid #e0e0e0 !important; }
          .email-link, .e-link { color: #0f62fe; }
        `}</style>
      </Head>
      <Body
        className="email-body"
        style={{
          backgroundColor: 'transparent',
          fontFamily: IBMPlexSans,
          margin: 0,
          padding: '32px 0',
        }}
      >
        <table
          role="presentation"
          border={0}
          cellPadding={0}
          cellSpacing={0}
          width="100%"
          style={{
            maxWidth: '580px',
            margin: '0 auto',
            backgroundColor: 'transparent',
          }}
        >
          <tbody>
            <tr>
              <td>
                <table
                  role="presentation"
                  border={0}
                  cellPadding={0}
                  cellSpacing={0}
                  width="100%"
                  className="card-top"
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px 12px 0 0',
                    borderTop: '2px solid #1d4ed8',
                    borderLeft: '2px solid #1d4ed8',
                    borderRight: '2px solid #1d4ed8',
                    borderBottom: 'none',
                    backgroundImage: 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #1d4ed8 0%, #60a5fa 50%, #0284c7 100%)',
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        className="card-top-cell"
                        style={{
                          backgroundColor: 'transparent',
                          borderRadius: '12px 12px 0 0',
                          padding: '36px',
                          color: '#161616',
                        }}
                      >
                        <Section style={{ marginBottom: '24px' }}>
                          {renderTopLeftLogo(serverConfig)}
                        </Section>
                        {content}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td
                className="card-middle-border"
                style={{
                  height: '2px',
                  lineHeight: '2px',
                  fontSize: '2px',
                  backgroundColor: '#1d4ed8',
                  borderLeft: '2px solid #1d4ed8',
                  borderRight: '2px solid #0284c7',
                  borderTop: 'none',
                  borderBottom: 'none',
                  background: 'linear-gradient(90deg, #1d4ed8 0%, #38bdf8 50%, #0284c7 100%)',
                }}
              >
                &nbsp;
              </td>
            </tr>
            <tr>
              <td>
                <table
                  role="presentation"
                  border={0}
                  cellPadding={0}
                  cellSpacing={0}
                  width="100%"
                  className="card-footer"
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '0 0 12px 12px',
                    borderBottom: '2px solid #0284c7',
                    borderLeft: '2px solid #1d4ed8',
                    borderRight: '2px solid #0284c7',
                    borderTop: 'none',
                    backgroundImage: 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #1d4ed8 0%, #60a5fa 50%, #0284c7 100%)',
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        className="card-footer-cell"
                        style={{
                          backgroundColor: 'transparent',
                          borderRadius: '0 0 12px 12px',
                          padding: '24px 36px',
                          color: '#161616',
                        }}
                      >
                        <FooterContent />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}
