// src/app/[lng]/(auth)/trips/new/page.tsx
import { TripForm } from "../components/trip-form";

interface NewTripPageProps {
  params: Promise<{ lng: string }>;
}

export default async function NewTripPage({ params }: NewTripPageProps) {
  const { lng } = await params;

  return <TripForm lng={lng} mode="create" />;
}