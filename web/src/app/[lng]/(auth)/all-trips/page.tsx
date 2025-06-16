// src/app/[lng]/(auth)/all-trips/page.tsx
import { createServerClient } from "@/lib/pocketbase/server";
import { TripsTable } from "../trips/components/trips-table";
import { Eye } from "lucide-react";
import { getAllTrips } from "@/lib/actions/trips";

interface AllTripsPageProps {
  params: Promise<{ lng: string }>;
  searchParams: Promise<{ 
    target?: string;
    locomotive?: string;
    search?: string;
    page?: string;
    sort?: string;
  }>;
}

export default async function AllTripsPage({ 
  params, 
  searchParams 
}: AllTripsPageProps) {
  const { lng } = await params;
  const { target, locomotive, search, page, sort } = await searchParams;
  
  const client = await createServerClient();
  
  if (!client.authStore.model) {
    return <div>Not authenticated</div>;
  }

  let trips;
  const currentPage = parseInt(page || "1");
  const perPage = 20; // More items per page for table view

  try {
    // Apply server-side sorting if specified
    trips = await getAllTrips(currentPage, perPage, sort);
    
  } catch (error) {
    console.error("Failed to fetch all trips:", error);
    trips = { items: [], totalItems: 0, totalPages: 0 };
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-base-content flex items-center gap-3">
            <Eye className="h-8 w-8 text-primary" />
            All Trips Overview
          </h1>
          <p className="text-base-content/60 mt-1">
            View all trips from all users in a sortable table - {trips.totalItems} total trips
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="alert alert-info">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div>
          <h3 className="font-bold">Information</h3>
          <div className="text-xs">
            This table shows all trips from all users, sorted by start date. 
            Click column headers to sort. You can view but not edit these entries.
          </div>
        </div>
      </div>

      {/* Trips Table Component */}
      <TripsTable 
        initialTrips={trips.items} 
        lng={lng}
        currentPage={currentPage}
        totalPages={trips.totalPages}
        totalItems={trips.totalItems}
        currentSort={sort}
      />
    </div>
  );
}