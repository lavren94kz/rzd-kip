// src/app/[lng]/(auth)/trips/components/trips-table.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TripsResponse } from "@/lib/pocketbase/types";
import { Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TripsTableProps {
  initialTrips: TripsResponse[];
  lng: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  currentSort?: string;
}

export function TripsTable({ 
  initialTrips, 
  lng, 
  currentPage,
  totalPages,
  totalItems,
  currentSort = "-start_datetime"
}: TripsTableProps) {
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
    params.set("page", "1");
    router.push(`/${lng}/all-trips?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/${lng}/all-trips?${params.toString()}`);
  };

  const handleSort = (field: string) => {
    const params = new URLSearchParams(searchParams.toString());
    let newSort = field;
    
    // If already sorting by this field, toggle direction
    if (currentSort === field) {
      newSort = `-${field}`;
    } else if (currentSort === `-${field}`) {
      newSort = field;
    }
    
    params.set("sort", newSort);
    params.set("page", "1");
    router.push(`/${lng}/all-trips?${params.toString()}`);
  };

  const getSortIcon = (field: string) => {
    if (currentSort === field) {
      return <ArrowUp className="h-4 w-4" />;
    } else if (currentSort === `-${field}`) {
      return <ArrowDown className="h-4 w-4" />;
    }
    return <ArrowUpDown className="h-4 w-4" />;
  };

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`/${lng}/all-trips?${params.toString()}`);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTargetBadge = (target: string) => {
    switch (target) {
      case "KIP":
        return "badge-primary";
      case "CP":
        return "badge-secondary";
      case "KZP":
        return "badge-accent";
      default:
        return "badge-ghost";
    }
  };

  const getLocomotiveBadge = (locomotive: string) => {
    switch (locomotive) {
      case "Mercedes":
        return "badge-info";
      case "Honda":
        return "badge-success";
      case "BMW":
        return "badge-warning";
      default:
        return "badge-ghost";
    }
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

      {/* Trips Table */}
      <div className="bg-base-100 rounded-lg shadow-md overflow-hidden">
        {trips.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-base-content/60">
              {searchTerm ? "No trips match your criteria" : "No trips yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th 
                    className="cursor-pointer hover:bg-base-200"
                    onClick={() => handleSort("start_datetime")}
                  >
                    <div className="flex items-center gap-2">
                      Start Time
                      {getSortIcon("start_datetime")}
                    </div>
                  </th>
                  <th 
                    className="cursor-pointer hover:bg-base-200"
                    onClick={() => handleSort("username")}
                  >
                    <div className="flex items-center gap-2">
                      User
                      {getSortIcon("username")}
                    </div>
                  </th>
                  <th 
                    className="cursor-pointer hover:bg-base-200"
                    onClick={() => handleSort("target")}
                  >
                    <div className="flex items-center gap-2">
                      Target
                      {getSortIcon("target")}
                    </div>
                  </th>
                  <th 
                    className="cursor-pointer hover:bg-base-200"
                    onClick={() => handleSort("station")}
                  >
                    <div className="flex items-center gap-2">
                      Station
                      {getSortIcon("station")}
                    </div>
                  </th>
                  <th>Route</th>
                  <th>Driver</th>
                  <th>Assistant</th>
                  <th 
                    className="cursor-pointer hover:bg-base-200"
                    onClick={() => handleSort("train_number")}
                  >
                    <div className="flex items-center gap-2">
                      Train #
                      {getSortIcon("train_number")}
                    </div>
                  </th>
                  <th 
                    className="cursor-pointer hover:bg-base-200"
                    onClick={() => handleSort("locomotive")}
                  >
                    <div className="flex items-center gap-2">
                      Locomotive
                      {getSortIcon("locomotive")}
                    </div>
                  </th>
                  <th 
                    className="cursor-pointer hover:bg-base-200"
                    onClick={() => handleSort("end_datetime")}
                  >
                    <div className="flex items-center gap-2">
                      End Time
                      {getSortIcon("end_datetime")}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => (
                  <tr key={trip.id} className="hover">
                    <td>
                      <div className="text-sm">
                        {formatDateTime(trip.start_datetime)}
                      </div>
                    </td>
                    <td>
                      <div className="font-medium">
                        {trip.expand?.username?.name || trip.expand?.username?.email || 'Unknown User'}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getTargetBadge(trip.target)}`}>
                        {trip.target}
                      </span>
                    </td>
                    <td>
                      <div className="max-w-32 truncate" title={trip.station}>
                        {trip.station}
                      </div>
                    </td>
                    <td>
                      <div className="max-w-32 truncate" title={trip.route}>
                        {trip.route}
                      </div>
                    </td>
                    <td>
                      <div className="max-w-32 truncate text-xs" title={trip.driver}>
                        {trip.driver}
                      </div>
                    </td>
                    <td>
                      <div className="max-w-32 truncate text-xs" title={trip.assistant_driver || ''}>
                        {trip.assistant_driver || '-'}
                      </div>
                    </td>
                    <td>
                      <div className="font-mono text-sm">
                        {trip.train_number}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className={`badge badge-sm ${getLocomotiveBadge(trip.locomotive)}`}>
                          {trip.locomotive}
                        </span>
                        <span className="text-xs font-mono">
                          #{trip.locomotive_number}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">
                        {formatDateTime(trip.end_datetime)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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