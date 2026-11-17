import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n/i18n-context';
import { AuthProvider } from '@/lib/state/auth-context';
import { SubscriptionProvider } from '@/lib/state/subscription-context';
import { AstrologyProvider } from '@/lib/state/astrology-context';
import { ChatProvider } from '@/lib/state/chat-context';
import { ConsultantProvider } from '@/lib/state/consultant-context';
import { CommunityProvider } from '@/lib/state/community-context';
import { CookieConsentBanner } from '@/components/company/CookieConsentBanner';
import { ExtensionErrorShield } from '@/components/common/ExtensionErrorShield';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover' as const,
  themeColor: '#171719',
};

export const metadata: Metadata = {
  title: 'AstroRashi — Modern Vedic Astrology & Cosmic Intelligence',
  description:
    'AstroRashi is an ultra-modern AI-powered Vedic astrology platform, authentic Lagna chart suite, Kundli matching engine, and Panchang calendar.',
  keywords: [
    'astrology',
    'natal chart',
    'birth chart',
    'ai assistant',
    'vedic astrology',
    'astronomy',
    'horoscope',
    'consultations',
    'transits',
    'kundli',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const extensionGuardScript = `
    (function () {
      if (typeof window === 'undefined') return;
      function isExtErr(msg, src, stack) {
        var s = ((msg || '') + ' ' + (src || '') + ' ' + (stack || '')).toLowerCase();
        return (
          s.indexOf('chrome-extension://') !== -1 ||
          s.indexOf('moz-extension://') !== -1 ||
          s.indexOf('safari-extension://') !== -1 ||
          s.indexOf('chrome: call method') !== -1 ||
          s.indexOf('bekkpoinfafbjglppgdobfdeckghdhlo') !== -1 ||
          s.indexOf('crxemulator') !== -1
        );
      }
      window.addEventListener('error', function (e) {
        var msg = e && (e.message || (e.error && e.error.message));
        var src = e && e.filename;
        var stk = e && e.error && e.error.stack;
        if (isExtErr(msg, src, stk)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return true;
        }
      }, true);
      window.addEventListener('unhandledrejection', function (e) {
        var r = e && e.reason;
        var msg = r && typeof r === 'object' ? (r.message || String(r)) : String(r || '');
        var stk = r && typeof r === 'object' ? r.stack : '';
        if (isExtErr(msg, '', stk)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return true;
        }
      }, true);
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: extensionGuardScript }} />
      </head>
      <body suppressHydrationWarning>
        <ExtensionErrorShield />
        <I18nProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <AstrologyProvider>
                <ChatProvider>
                  <ConsultantProvider>
                    <CommunityProvider>
                    {children}
                    <CookieConsentBanner />
                  </CommunityProvider>
                  </ConsultantProvider>
                </ChatProvider>
              </AstrologyProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
