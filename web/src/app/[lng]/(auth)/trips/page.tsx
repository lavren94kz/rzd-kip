// src/app/[lng]/(auth)/trips/page.tsx
import { createServerClient } from "@/lib/pocketbase/server";
import { TripList } from "./components/trip-list";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getTrips } from "@/lib/actions/trips";

interface TripsPageProps {
  params: Promise<{ lng: string }>;
  searchParams: Promise<{ 
    target?: string;
    locomotive?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function TripsPage({ 
  params, 
  searchParams 
}: TripsPageProps) {
  const { lng } = await params;
  const { target, locomotive, search, page } = await searchParams;
  
  const client = await createServerClient();
  
  if (!client.authStore.model) {
    return <div>Not authenticated</div>;
  }

  let trips;
  const currentPage = parseInt(page || "1");
  const perPage = 10;

  try {
    // Build filter query
    let filterQuery = "";
    
    if (target) {
      filterQuery = `target = "${target}"`;
    }
    
    if (locomotive) {
      const locomotiveFilter = `locomotive = "${locomotive}"`;
      filterQuery = filterQuery 
        ? `${filterQuery} && ${locomotiveFilter}`
        : locomotiveFilter;
    }
    
    if (search) {
      const searchFilter = `username.name ~ "${search}" || username.email ~ "${search}" || station ~ "${search}" || route ~ "${search}" || train_number ~ "${search}" || driver ~ "${search}" || assistant_driver ~ "${search}"`;
      filterQuery = filterQuery 
        ? `(${filterQuery}) && (${searchFilter})`
        : searchFilter;
    }

    trips = await getTrips(filterQuery, "-start_datetime", currentPage, perPage);
  } catch (error) {
    console.error("Failed to fetch trips:", error);
    trips = { items: [], totalItems: 0, totalPages: 0, page: 1, perPage: 10 };
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-base-content">My Trips</h1>
          <p className="text-base-content/60 mt-1">
            {trips.totalItems} total trips
          </p>
        </div>
        <Link
          href={`/${lng}/trips/new`}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Trip
        </Link>
      </div>

      {/* Trip List Component */}
      <TripList 
        initialTrips={trips.items} 
        lng={lng}
        currentPage={currentPage}
        totalPages={trips.totalPages}
        totalItems={trips.totalItems}
      />
    </div>
  );
}