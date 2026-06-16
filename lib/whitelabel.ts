/**
 * lib/whitelabel.ts — Dynamic branding configuration for white-label deployments.
 *
 * Reads brand overrides from environment variables. Falls back to Ayojit Intelligence
 * defaults when no overrides are set. Government partners and resellers can rebrand
 * the entire portal by setting these variables at deploy time.
 */

export interface WhitelabelConfig {
  brandName: string
  brandTagline: string
  brandColor: string
  brandColorLight: string
  logoUrl: string | null
  supportEmail: string
  dashboardTitle: string
  footerText: string
}

const defaults: WhitelabelConfig = {
  brandName: 'Ayojit Intelligence',
  brandTagline: 'Civic AI for 1.4 Billion Citizens',
  brandColor: '#FCD34D',
  brandColorLight: '#FEF3C7',
  logoUrl: null,
  supportEmail: 'tarai.ashwinikumar@gmail.com',
  dashboardTitle: 'Ayojit Intelligence — AIKosh App Suite',
  footerText:
    'This application uses publicly available AI models/datasets sourced via AIKosh (aikosh.indiaai.gov.in), maintained by IndiaAI under the Ministry of Electronics & Information Technology, Government of India. Ayojit Intelligence is an independent product and is not affiliated with, endorsed by, or sponsored by AIKosh, IndiaAI, or the Government of India.',
}

export function getWhitelabelConfig(): WhitelabelConfig {
  return {
    brandName:
      process.env.NEXT_PUBLIC_BRAND_NAME || defaults.brandName,
    brandTagline:
      process.env.NEXT_PUBLIC_BRAND_TAGLINE || defaults.brandTagline,
    brandColor:
      process.env.NEXT_PUBLIC_BRAND_COLOR || defaults.brandColor,
    brandColorLight:
      process.env.NEXT_PUBLIC_BRAND_COLOR_LIGHT || defaults.brandColorLight,
    logoUrl:
      process.env.NEXT_PUBLIC_BRAND_LOGO_URL || defaults.logoUrl,
    supportEmail:
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL || defaults.supportEmail,
    dashboardTitle:
      process.env.NEXT_PUBLIC_DASHBOARD_TITLE || defaults.dashboardTitle,
    footerText:
      process.env.NEXT_PUBLIC_FOOTER_TEXT || defaults.footerText,
  }
}
