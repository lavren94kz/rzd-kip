// src/app/[lng]/(auth)/trips/components/trip-item.tsx
"use client";

import { useState } from "react";
import { TripsResponse, UsersResponse } from "@/lib/pocketbase/types";
import { deleteTrip } from "@/lib/actions/trips";
import { Edit, Trash2, Calendar, User, MapPin, Train, Truck, Clock } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

// Define the expanded trip type with proper username relation
type TripWithExpand = TripsResponse<{
  username?: UsersResponse;
}>;

interface TripItemProps {
  trip: TripWithExpand;
  lng: string;
  onDelete: (tripId: string) => void;
  isReadOnly?: boolean;
}

export function TripItem({ trip, lng, onDelete, isReadOnly = false }: TripItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { t } = useTranslation();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this trip?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteTrip(trip.id);
      if (result.success) {
        onDelete(trip.id);
      }
    } catch (error) {
      console.error("Failed to delete trip:", error);
    } finally {
      setIsDeleting(false);
    }
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

  // Helper function to get user display name
  const getUserDisplayName = (): string => {
    if (trip.expand?.username) {
      return trip.expand.username.name || trip.expand.username.email || 'Unknown User';
    }
    return 'Unknown User';
  };

  return (
    <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
      <div className="card-body p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Main Content */}
          <div className="flex-1">
            {/* Header with time and target */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-semibold">
                  {formatDateTime(trip.start_datetime)}
                </span>
              </div>
              <span className={`badge ${getTargetBadge(trip.target)}`}>
                {trip.target}
              </span>
            </div>

            {/* Trip Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {/* User Info */}
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-base-content/60" />
                <span className="text-base-content/80">
                  <strong>User:</strong> {getUserDisplayName()}
                </span>
              </div>

              {/* Station */}
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-base-content/60" />
                <span className="text-base-content/80">
                  <strong>Station:</strong> {trip.station}
                </span>
              </div>

              {/* Route */}
              <div className="flex items-center gap-2">
                <span className="text-base-content/80">
                  <strong>Route:</strong> {trip.route}
                </span>
              </div>

              {/* Driver */}
              <div className="flex items-center gap-2">
                <span className="text-base-content/80">
                  <strong>Driver:</strong> {trip.driver}
                </span>
              </div>

              {/* Assistant Driver */}
              {trip.assistant_driver && (
                <div className="flex items-center gap-2">
                  <span className="text-base-content/80">
                    <strong>Assistant:</strong> {trip.assistant_driver}
                  </span>
                </div>
              )}

              {/* Train Number */}
              <div className="flex items-center gap-2">
                <Train className="h-3 w-3 text-base-content/60" />
                <span className="text-base-content/80">
                  <strong>Train:</strong> {trip.train_number}
                </span>
              </div>

              {/* Locomotive */}
              <div className="flex items-center gap-2">
                <Truck className="h-3 w-3 text-base-content/60" />
                <span className="text-base-content/80">
                  <strong>Locomotive:</strong> 
                  <span className={`badge badge-sm ml-1 ${getLocomotiveBadge(trip.locomotive)}`}>
                    {trip.locomotive}
                  </span>
                  {trip.locomotive_number && ` #${trip.locomotive_number}`}
                </span>
              </div>
            </div>

            {/* End Time */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-base-300">
              <Clock className="h-3 w-3 text-base-content/60" />
              <span className="text-xs text-base-content/60">
                <strong>End:</strong> {formatDateTime(trip.end_datetime)}
              </span>
            </div>
          </div>

          {/* Actions */}
          {!isReadOnly && (
            <div className="flex gap-2">
              <Link
                href={`/${lng}/trips/${trip.id}/edit`}
                className="btn btn-ghost btn-sm"
              >
                <Edit className="h-4 w-4" />
              </Link>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`btn btn-ghost btn-sm text-error hover:bg-error/10 ${
                  isDeleting ? 'loading' : ''
                }`}
              >
                {!isDeleting && <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}