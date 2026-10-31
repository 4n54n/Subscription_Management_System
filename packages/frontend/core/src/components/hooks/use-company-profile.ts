import { useState, useEffect } from 'react';

export interface AuthorizedPersonnel {
  id: string;
  name: string;
  role: string;
  signatureData?: string;
}

export interface CompanyProfile {
  companyName: string;
  companyTagline: string;
  companyLogoUrl: string;
  companyLogoData: string;
  oneLogoData: string;
  cin: string;
  pan: string;
  gstin: string;
  email: string;
  supportEmail: string;
  phone: string;
  address: string;
  websiteUrl: string;
  contactUsUrl: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  logoSrc: string;
  authorizedPersonnels?: AuthorizedPersonnel[];
}

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyName: 'Brightloop Software Solutions',
  companyTagline: 'Subscription Management & Recurring Billing ERP',
  companyLogoUrl: '',
  companyLogoData: '',
  oneLogoData: '',
  cin: 'U72900KA2023PTC174829',
  pan: 'AAACI4567B',
  gstin: '29AAACI4567B1Z4',
  email: 'connect@brightloop.local',
  supportEmail: 'support@brightloop.local',
  phone: '+91 7510711617',
  address: 'No.472/7 Balaji Arcade, 2nd & 3rd Floor, Koramangala, Bangalore — 560095',
  websiteUrl: 'https://brightloop.local',
  contactUsUrl: 'https://brightloop.local/contact',
  privacyPolicyUrl: 'https://brightloop.local/privacy',
  termsOfServiceUrl: 'https://brightloop.local/terms',
  bankName: 'ICICI Bank',
  bankAccountName: 'Brightloop Software Solutions',
  bankAccountNumber: '98765432101',
  bankIfsc: 'ICIC0000104',
  logoSrc: '/brightloop-icon.png',
  authorizedPersonnels: [
    {
      id: 'signatory-1',
      name: 'Brightloop Administrator',
      role: 'Operations Director',
      signatureData: '',
    },
  ],
};

// Resolve company logo fallback hierarchy: 1. Company Logo URL (Primary) -> 2. Uploaded Base64 Data (Secondary Fallback) -> 3. Default Asset
export function resolveCompanyLogo(
  url?: string,
  data?: string,
  fallback = '/brightloop-icon.png',
  _oneLogoData?: string
): string {
  if (url && url.trim().length > 0 && url.trim() !== 'CompanyLogo.png' && url.trim() !== '/brightloop-icon.png') return url.trim();
  if (data && data.trim().length > 0) return data.trim();
  return fallback;
}

const STORED_CP_KEY = 'brightloop_company_profile';

export function getInitialCompanyProfile(): CompanyProfile {
  try {
    const raw = localStorage.getItem(STORED_CP_KEY) || localStorage.getItem('intoai_company_profile');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const logoSrc = resolveCompanyLogo(
          parsed.companyLogoUrl,
          parsed.companyLogoData,
          'CompanyLogo.png',
          parsed.oneLogoData
        );
        return {
          ...DEFAULT_COMPANY_PROFILE,
          ...parsed,
          logoSrc,
        };
      }
    }
  } catch {}
  return DEFAULT_COMPANY_PROFILE;
}

export function useCompanyProfile(): CompanyProfile {
  const [profile, setProfile] = useState<CompanyProfile>(getInitialCompanyProfile);

  useEffect(() => {
    let active = true;
    const fetchProfile = async () => {
      try {
        const res = await fetch('/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetCompanyProfile {
                companyProfile
              }
            `,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const cp = json?.data?.companyProfile;
          if (cp && active) {
            const logoSrc = resolveCompanyLogo(
              cp.companyLogoUrl,
              cp.companyLogoData,
              'CompanyLogo.png',
              cp.oneLogoData
            );
            const fullCp = {
              ...DEFAULT_COMPANY_PROFILE,
              ...cp,
              logoSrc,
            };
            try {
              localStorage.setItem(STORED_CP_KEY, JSON.stringify(fullCp));
            } catch {}
            setProfile(fullCp);
          }
        }
      } catch (err) {
        console.error('[CompanyProfile] Failed to fetch profile:', err);
      }
    };

    fetchProfile();
    window.addEventListener('focus', fetchProfile);
    return () => {
      active = false;
      window.removeEventListener('focus', fetchProfile);
    };
  }, []);

  return profile;
}

export function extractEffectiveCompanyProfile(cp: CompanyProfile, dataObj?: any): CompanyProfile {
  if (!dataObj) return cp;

  const src =
    dataObj.cover?.presented_by ||
    dataObj.cover?.prepared_by ||
    dataObj.company ||
    {};

  const hasSavedCompany = Boolean(
    src.company_name ||
    src.company ||
    src.name ||
    dataObj.company?.name
  );

  if (!hasSavedCompany) {
    return cp;
  }

  const bankSrc = dataObj.payment?.bank_details || {};

  return {
    ...cp,
    companyName: src.company_name || src.company || src.name || dataObj.company?.name || cp.companyName,
    companyTagline: src.tagline || dataObj.company?.tagline || cp.companyTagline,
    companyLogoUrl: src.logo_url || src.logoUrl || cp.companyLogoUrl,
    companyLogoData: src.logo_data || src.logoData || cp.companyLogoData,
    oneLogoData: cp.oneLogoData,
    cin: src.cin || dataObj.company?.cin || cp.cin,
    pan: src.pan || dataObj.company?.pan || cp.pan,
    gstin: src.gst || src.gstin || dataObj.company?.gstin || dataObj.company?.gst || cp.gstin,
    email: src.email || dataObj.company?.email || cp.email,
    supportEmail: src.support_email || cp.supportEmail,
    phone: src.phone || dataObj.company?.phone || cp.phone,
    address: src.address || dataObj.company?.address || cp.address,
    websiteUrl: src.website || src.website_url || dataObj.company?.website || cp.websiteUrl,
    contactUsUrl: cp.contactUsUrl,
    privacyPolicyUrl: cp.privacyPolicyUrl,
    termsOfServiceUrl: cp.termsOfServiceUrl,
    bankName: bankSrc.bank_name || src.bank_name || cp.bankName,
    bankAccountName: bankSrc.beneficiary || bankSrc.account_name || src.bank_account_name || cp.bankAccountName,
    bankAccountNumber: bankSrc.account_number || src.bank_account_number || cp.bankAccountNumber,
    bankIfsc: bankSrc.ifsc || src.bank_ifsc || cp.bankIfsc,
    logoSrc: resolveCompanyLogo(src.logo_url || cp.companyLogoUrl, src.logo_data || cp.companyLogoData, cp.logoSrc || 'CompanyLogo.png', cp.oneLogoData),
    authorizedPersonnels: cp.authorizedPersonnels || [],
  };
}

export function getCompanyFieldStaticVal(cleanPath: string, cp: CompanyProfile, dataObj?: any): string | null {
  const effectiveCp = extractEffectiveCompanyProfile(cp, dataObj);
  const p = cleanPath.toLowerCase().trim();
  if (
    p === 'cover.prepared_by.company_name' ||
    p === 'cover.prepared_by.company' ||
    p === 'cover.presented_by.company_name' ||
    p === 'cover.presented_by.company' ||
    p === 'presented_by.company_name' ||
    p === 'company.name' ||
    p === 'company_name' ||
    p === 'prepared_by.company_name' ||
    p === 'company'
  ) {
    return effectiveCp.companyName;
  }
  if (
    p === 'cover.prepared_by.lead' ||
    p === 'cover.prepared_by.author' ||
    p === 'cover.prepared_by.name' ||
    p === 'cover.presented_by.lead' ||
    p === 'cover.presented_by.author' ||
    p === 'cover.presented_by.name' ||
    p === 'prepared_by.lead' ||
    p === 'presented_by.lead'
  ) {
    const leadVal = dataObj?.cover?.presented_by?.lead || dataObj?.cover?.prepared_by?.lead;
    return leadVal ? String(leadVal) : effectiveCp.companyName;
  }
  if (
    p === 'cover.prepared_by.tagline' ||
    p === 'cover.presented_by.tagline' ||
    p === 'company.tagline' ||
    p === 'brand-sub' ||
    p === 'prepared_by.tagline'
  ) {
    return effectiveCp.companyTagline;
  }
  if (
    p === 'cover.prepared_by.email' ||
    p === 'cover.presented_by.email' ||
    p === 'company.email' ||
    p === 'company_email' ||
    p === 'prepared_by.email'
  ) {
    return effectiveCp.email;
  }
  if (
    p === 'cover.prepared_by.phone' ||
    p === 'cover.presented_by.phone' ||
    p === 'company.phone' ||
    p === 'company_phone' ||
    p === 'prepared_by.phone'
  ) {
    return effectiveCp.phone;
  }
  if (
    p === 'cover.prepared_by.address' ||
    p === 'cover.presented_by.address' ||
    p === 'company.address' ||
    p === 'company_address' ||
    p === 'prepared_by.address'
  ) {
    return effectiveCp.address;
  }
  if (
    p === 'cover.prepared_by.website' ||
    p === 'cover.presented_by.website' ||
    p === 'company.website' ||
    p === 'websiteurl' ||
    p === 'prepared_by.website'
  ) {
    return effectiveCp.websiteUrl;
  }
  if (p === 'cover.prepared_by.cin' || p === 'cover.presented_by.cin' || p === 'company.cin' || p === 'cin') {
    return effectiveCp.cin;
  }
  if (p === 'cover.prepared_by.pan' || p === 'cover.presented_by.pan' || p === 'company.pan' || p === 'pan') {
    return effectiveCp.pan;
  }
  if (
    p === 'cover.prepared_by.gst' ||
    p === 'cover.prepared_by.gstin' ||
    p === 'cover.presented_by.gst' ||
    p === 'cover.presented_by.gstin' ||
    p === 'company.gstin' ||
    p === 'company.gst' ||
    p === 'gstin'
  ) {
    return effectiveCp.gstin || '-';
  }
  if (p === 'company.gst_info') {
    return `${effectiveCp.companyName} GSTIN: ${effectiveCp.gstin || '-'}`;
  }
  if (p === 'cover.prepared_by.reg_info' || p === 'cover.presented_by.reg_info' || p === 'company.reg_info') {
    return `CIN: ${effectiveCp.cin} · PAN: ${effectiveCp.pan}`;
  }
  if (p === 'payment.account_name') return effectiveCp.bankAccountName;
  if (p === 'payment.bank_name') return effectiveCp.bankName;
  if (p === 'payment.account_number') return effectiveCp.bankAccountNumber;
  if (p === 'payment.ifsc') return effectiveCp.bankIfsc;

  return null;
}

function decodeCloudflareEmail(encoded: string): string {
  try {
    let email = '';
    const k = parseInt(encoded.substr(0, 2), 16);
    for (let n = 2; n < encoded.length; n += 2) {
      email += String.fromCharCode(parseInt(encoded.substr(n, 2), 16) ^ k);
    }
    return email;
  } catch {
    return '';
  }
}

export function updateCompanyProfileInHtmlDom(html: string, cp: CompanyProfile, dataObj?: any): string {
  if (!html) return html;
  const effectiveCp = extractEffectiveCompanyProfile(cp, dataObj);
  const logoSrc = resolveCompanyLogo(
    effectiveCp.companyLogoUrl,
    effectiveCp.companyLogoData,
    effectiveCp.logoSrc || 'CompanyLogo.png',
    effectiveCp.oneLogoData
  ) || effectiveCp.logoSrc || 'CompanyLogo.png';
  let updated = html;

  // 1. Always update all logo images (src containing CompanyLogo or class containing logo/brand)
  if (logoSrc) {
    updated = updated.replace(/src="[^"]*CompanyLogo[^"]*"/gi, `src="${logoSrc}"`);
    updated = updated.replace(/(<img[^>]*class="[^"]*(logo|brand|cover-logo-img)[^"]*"[^>]*)src="[^"]*"/gi, `$1src="${logoSrc}"`);
  }

  // 2. Update data-company-field elements
  updated = updated.replace(/<span([^>]*data-company-field="([^"]+)"[^>]*)>[\s\S]*?<\/span>/gi, (_match, attrs, fieldKey) => {
    const val = getCompanyFieldStaticVal(fieldKey, effectiveCp, dataObj) || effectiveCp.companyName;
    return `<span${attrs} contenteditable="false" data-company-field="${fieldKey}">${val}</span>`;
  });
  updated = updated.replace(/<div([^>]*data-company-field="([^"]+)"[^>]*)>[\s\S]*?<\/div>/gi, (_match, attrs, fieldKey) => {
    const val = getCompanyFieldStaticVal(fieldKey, effectiveCp, dataObj) || effectiveCp.companyName;
    return `<div${attrs} contenteditable="false" data-company-field="${fieldKey}">${val}</div>`;
  });

  // 3. Brand name and tagline
  updated = updated.replace(/<span class="brand-name">[\s\S]*?<\/span>/gi, `<span class="brand-name locked-company-field" contenteditable="false" data-company-field="company.name">${effectiveCp.companyName}</span>`);
  updated = updated.replace(/<span class="header-brand-name">[\s\S]*?<\/span>/gi, `<span class="header-brand-name locked-company-field" contenteditable="false" data-company-field="company.name">${effectiveCp.companyName}</span>`);
  updated = updated.replace(/<span class="brand-sub">[\s\S]*?<\/span>/gi, `<span class="brand-sub locked-company-field" contenteditable="false" data-company-field="company.tagline">${effectiveCp.companyTagline}</span>`);

  // 4. Contact Block (Address, Email, Web, Phone)
  const cleanWeb = (effectiveCp.websiteUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const formattedAddressLines = (effectiveCp.address || '').split('\n').map((l: string) => l.trim()).filter(Boolean);
  let addressHtml = '';
  if (formattedAddressLines.length > 0) {
    addressHtml = formattedAddressLines.map((line: string) => `<p>${line}</p>`).join('\n              ');
  } else {
    addressHtml = `<p>${effectiveCp.address}</p>`;
  }
  const contactBlockHtml = `<div class="company-contact">
              ${addressHtml}
              <p><span>Email:</span> ${effectiveCp.email} &nbsp;|&nbsp; <span>Web:</span> ${cleanWeb} &nbsp;|&nbsp; <span>Phone:</span> ${effectiveCp.phone}</p>
            </div>`;
  updated = updated.replace(/<div class="company-contact">[\s\S]*?<\/div>/gi, contactBlockHtml);

  // 5. Signature card titles and signer company fields
  updated = updated.replace(/<div class="sig-title-label">Approved for [^<]*<\/div>/gi, (match) => {
    if (match.includes('the Client')) return match;
    return `<div class="sig-title-label">Approved for <span contenteditable="false" data-company-field="company.name">${effectiveCp.companyName}</span></div>`;
  });
  updated = updated.replace(/<div class="sig-signer-company">[^<]*<\/div>/gi, `<div class="sig-signer-company" data-company-field="company.name">${effectiveCp.companyName}</div>`);
  updated = updated.replace(/This receipt confirms that [^<]*? has successfully received/gi, `This receipt confirms that ${effectiveCp.companyName} has successfully received`);

  // 6. Decode or replace any Cloudflare protected email tags
  updated = updated.replace(/<a[^>]*class="[^"]*__cf_email__[^"]*"[^>]*data-cfemail="([0-9a-fA-F]+)"[^>]*>[\s\S]*?<\/a>/gi, (_match, hex) => {
    const decoded = decodeCloudflareEmail(hex);
    return (decoded && decoded.includes('@')) ? decoded : (effectiveCp.email || 'connect@intoai.ai');
  });
  updated = updated.replace(/<span[^>]*class="[^"]*__cf_email__[^"]*"[^>]*data-cfemail="([0-9a-fA-F]+)"[^>]*>[\s\S]*?<\/span>/gi, (_match, hex) => {
    const decoded = decodeCloudflareEmail(hex);
    return (decoded && decoded.includes('@')) ? decoded : (effectiveCp.email || 'connect@intoai.ai');
  });
  updated = updated.replace(/IntoAI Confidential/gi, `${effectiveCp.companyName} Confidential`);

  return updated;
}
