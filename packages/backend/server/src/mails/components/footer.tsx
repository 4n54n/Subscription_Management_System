import { Link, Section, Text } from '@react-email/components';
import type { CSSProperties } from 'react';

import { BasicTextStyle } from './common';

const FooterTextStyles: CSSProperties = {
  ...BasicTextStyle,
  fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  color: '#525252',
  fontSize: '12px',
  lineHeight: '18px',
  marginTop: '8px',
  marginBottom: '0',
};

function getActiveServerConfig() {
  const envConfig = (globalThis.env as any)?.config?.server || {};
  const globalConfig = (globalThis as any).serverConfig || {};
  const active = { ...globalConfig, ...envConfig };

  if (!active.supportEmail || !active.companyName || !active.websiteUrl) {
    try {
      const { getDefaultConfig } = require('../../base/config/register');
      const defaultConfig = getDefaultConfig()?.server || {};
      return { ...defaultConfig, ...active };
    } catch {
      // ignore fallback error
    }
  }

  return active;
}

export const FooterContent = () => {
  const serverConfig = getActiveServerConfig();
  const supportEmail = serverConfig?.supportEmail || 'support@intoai.ai';
  const websiteUrl = serverConfig?.websiteUrl || 'https://www.intoai.ai';
  const termsUrl = serverConfig?.termsOfServiceUrl || 'https://www.intoai.ai/terms';
  const privacyUrl = serverConfig?.privacyPolicyUrl || 'https://www.intoai.ai/privacy';
  const rawCompanyName = serverConfig?.companyName || 'IntoAI Technologies Pvt. Ltd.';
  const companyName = rawCompanyName.endsWith('.') ? rawCompanyName.slice(0, -1) : rawCompanyName;
  const currentYear = new Date().getUTCFullYear();

  return (
    <>
      <Section align="left" style={{ marginBottom: '12px' }}>
        <Text className="email-muted" style={FooterTextStyles}>
          Administrative Support: Contact{' '}
          <Link
            href={`mailto:${supportEmail}`}
            style={{ color: '#0f62fe', textDecoration: 'none', fontWeight: 500 }}
            className="email-link"
          >
            {supportEmail}
          </Link>
        </Text>
      </Section>

      <Section
        className="email-grey-divider e-divider"
        style={{
          borderTop: '1px solid #e0e0e0',
          paddingTop: '16px',
          marginTop: '16px',
        }}
      >
        <Text className="email-muted" style={FooterTextStyles}>
          <Link
            href={websiteUrl}
            style={{
              color: '#0f62fe',
              textDecoration: 'none',
              marginRight: '16px',
              fontWeight: 500,
            }}
            className="email-link"
          >
            Website
          </Link>
          <Link
            href={termsUrl}
            style={{
              color: '#0f62fe',
              textDecoration: 'none',
              marginRight: '16px',
              fontWeight: 500,
            }}
            className="email-link"
          >
            Terms of Service
          </Link>
          <Link
            href={privacyUrl}
            style={{ color: '#0f62fe', textDecoration: 'none', fontWeight: 500 }}
            className="email-link"
          >
            Privacy Policy
          </Link>
        </Text>
        <Text className="email-muted" style={{ ...FooterTextStyles, marginTop: '8px' }}>
          &copy; {currentYear} {companyName}. All rights reserved.
        </Text>
      </Section>
    </>
  );
};
