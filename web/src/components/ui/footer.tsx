'use client'

import Link from 'next/link'
import { Github, Facebook, Twitter, Linkedin, Mail } from 'lucide-react'
import { useTranslation } from '@/app/i18n/client'
import { ClientWrapper } from './client-wrapper'


// interface FooterProps {
//   lng: string
// }

export function Footer({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, 'common')

  return (
    <ClientWrapper>
    <footer className="border-t mt-auto bg-base-200">
      <div className="mx-auto max-w-7xl py-12 px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
           {/* Column 1 - About */}
           <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.about')}</h3>
            <p className="text-sm text-base-content/80">
              {t('footer.description')}
            </p>
          </div>

          {/* Column 2 - Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={`/${lng}`} className="hover:text-primary transition-colors">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link href={`/${lng}/dashboard`} className="hover:text-primary transition-colors">
                  {t('nav.dashboard')}
                </Link>
              </li>
              <li>
                <Link href={`/${lng}/login`} className="hover:text-primary transition-colors">
                  {t('nav.login')}
                </Link>
              </li>
              <li>
                <Link href={`/${lng}/register`} className="hover:text-primary transition-colors">
                  {t('nav.register')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 - Resources */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.resources')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="https://nextjs.org/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Next.js Docs
                </a>
              </li>
              <li>
                <a 
                  href="https://pocketbase.io/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  PocketBase Docs
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/shadowchess-org/PB-Next"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4 - Connect */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.connect')}</h3>
            <div className="flex flex-col space-y-4">
              <a 
                href="https://github.com/shadowchess-org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Github className="h-5 w-5" />
                <span>GitHub</span>
              </a>
              <a 
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Facebook className="h-5 w-5" />
                <span>Facebook</span>
              </a>
              <a 
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Twitter className="h-5 w-5" />
                <span>Twitter</span>
              </a>
              <a 
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Linkedin className="h-5 w-5" />
                <span>LinkedIn</span>
              </a>
              <a 
                href="mailto:contact@example.com"
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Mail className="h-5 w-5" />
                <span>{t('footer.emailUs')}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-base-300 text-center text-sm text-base-content/60">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
    </ClientWrapper>
  );
}