// src/app/[lng]/(auth)/trips/components/trip-list.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TripsResponse } from "@/lib/pocketbase/types";
import { TripItem } from "./trip-item";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TripListProps {
  initialTrips: TripsResponse[];
  lng: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  isReadOnly?: boolean;
}

export function TripList({ 
  initialTrips, 
  lng, 
  currentPage,
  totalPages,
  totalItems,
  isReadOnly = false
}: TripListProps) {
  const [trips, setTrips] = useState(initialTrips);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm) {
      params.set("search", searchTerm);
    } else {
      params.delete("search");
    }
    params.set("page", "1"); // Reset to first page on search
    router.push(`/${lng}/trips?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/${lng}/trips?${params.toString()}`);
  };

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset to first page on filter change
    router.push(`/${lng}/trips?${params.toString()}`);
  };

  const removeTrip = (tripId: string) => {
    setTrips(prev => prev.filter(trip => trip.id !== tripId));
  };

  const targetOptions = [
    { value: "", label: "All Targets" },
    { value: "KIP", label: "KIP" },
    { value: "CP", label: "CP" },
    { value: "KZP", label: "KZP" },
  ];

  const locomotiveOptions = [
    { value: "", label: "All Locomotives" },
    { value: "Mercedes", label: "Mercedes" },
    { value: "Honda", label: "Honda" },
    { value: "BMW", label: "BMW" },
  ];

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="bg-base-100 rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-base-content/40" />
              <input
                type="text"
                placeholder="Search trips..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input input-bordered w-full pl-10"
              />
            </div>
          </form>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'}`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-base-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Target Filter */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">Filter by Target</span>
                </label>
                <select
                  onChange={(e) => updateFilter("target", e.target.value || null)}
                  className="select select-bordered w-full"
                  defaultValue={searchParams.get("target") || ""}
                >
                  {targetOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Locomotive Filter */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">Filter by Locomotive</span>
                </label>
                <select
                  onChange={(e) => updateFilter("locomotive", e.target.value || null)}
                  className="select select-bordered w-full"
                  defaultValue={searchParams.get("locomotive") || ""}
                >
                  {locomotiveOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat bg-base-100 rounded-lg shadow-md">
          <div className="stat-title">Total Trips</div>
          <div className="stat-value text-primary">{totalItems}</div>
        </div>
        <div className="stat bg-base-100 rounded-lg shadow-md">
          <div className="stat-title">Current Page</div>
          <div className="stat-value text-secondary">{currentPage}</div>
        </div>
        <div className="stat bg-base-100 rounded-lg shadow-md">
          <div className="stat-title">Total Pages</div>
          <div className="stat-value text-accent">{totalPages}</div>
        </div>
      </div>

      {/* Trip Items */}
      <div className="space-y-4">
        {trips.length === 0 ? (
          <div className="text-center py-12 bg-base-100 rounded-lg shadow-md">
            <p className="text-base-content/60">
              {searchTerm ? "No trips match your criteria" : "No trips yet"}
            </p>
            {!searchTerm && !isReadOnly && (
              <p className="text-sm text-base-content/40 mt-2">
                Create your first trip to get started!
              </p>
            )}
          </div>
        ) : (
          trips.map((trip) => (
            <TripItem
              key={trip.id}
              trip={trip}
              lng={lng}
              onDelete={removeTrip}
              isReadOnly={isReadOnly}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="btn btn-outline"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`btn btn-sm ${
                    currentPage === pageNum ? 'btn-primary' : 'btn-outline'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="btn btn-outline"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}