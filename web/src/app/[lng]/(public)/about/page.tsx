import { languages } from "@/app/i18n/settings";
import { AboutClient } from "./about-client";

interface AboutPageProps {
  params: Promise<{
    lng: string;
  }>;
}

// Generate static params for all supported languages
export async function generateStaticParams() {
  return languages.map((lng) => ({ lng }));
}

export default async function AboutPage({ params }: AboutPageProps) {
  // Await the params
  const { lng } = await params;

  // If the language is not supported, fallback to the first language from the array (English)
  const currentLng = languages.includes(lng) ? lng : languages[0];

  return <AboutClient lng={currentLng} />;
}