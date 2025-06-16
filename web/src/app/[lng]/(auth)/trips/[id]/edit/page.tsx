// src/app/[lng]/(auth)/trips/[id]/edit/page.tsx
import { getTrip } from "@/lib/actions/trips";
import { TripForm } from "../../components/trip-form";
import { notFound } from "next/navigation";

interface EditTripPageProps {
  params: Promise<{ lng: string; id: string }>;
}

export default async function EditTripPage({ params }: EditTripPageProps) {
  const { lng, id } = await params;

  try {
    const trip = await getTrip(id);
    return <TripForm lng={lng} trip={trip} mode="edit" />;
  } catch (error) {
    console.error("Failed to fetch trip:", error);
    notFound();
  }
}