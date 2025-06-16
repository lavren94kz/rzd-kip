'use client';

import { useTranslation } from "@/app/i18n/client";

export function AboutClient({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, 'about');

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            {t('about.title')}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t('about.description')}
          </p>
        </div>

        {/* Mission Section */}
        <div className="bg-base-100 rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold mb-4">
            {t('about.mission.title')}
          </h2>
          <p className="text-base-content/80">
            {t('about.mission.text')}
          </p>
        </div>

        {/* Features Section */}
        <div className="bg-base-100 rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold mb-6">
            {t('about.features.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="flex items-center gap-4">
                <div className="shrink-0 h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-content">
                  {num}
                </div>
                <p className="text-base-content/80">{t(`about.features.list.${num}`)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-base-100 rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            {t('about.contact.title')}
          </h2>
          <p className="text-base-content/80">
            {t('about.contact.text')}
          </p>
        </div>
      </div>
    </div>
  );
}