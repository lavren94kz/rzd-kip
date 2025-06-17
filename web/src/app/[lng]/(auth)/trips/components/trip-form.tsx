// src/app/[lng]/(auth)/trips/components/trip-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTrip, updateTrip, getAllUsers } from "@/lib/actions/trips";
import { TripsResponse, UsersResponse } from "@/lib/pocketbase/types";
import { Save, ArrowLeft, Calendar, User, MapPin, Train, Truck } from "lucide-react";
import Link from "next/link";

interface TripFormProps {
  lng: string;
  trip?: TripsResponse;
  mode: "create" | "edit";
}

export function TripForm({ lng, trip, mode }: TripFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UsersResponse[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const router = useRouter();

  // Load users for the username dropdown
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await getAllUsers();
        setUsers(usersData.items);
      } catch (error) {
        console.error("Failed to load users:", error);
        setError("Failed to load users list");
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadUsers();
  }, []);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      let result;
      if (mode === "create") {
        result = await createTrip(formData);
      } else if (trip) {
        result = await updateTrip(trip.id, formData);
      }

      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        router.push(`/${lng}/trips`);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const now = new Date();
  const defaultDateTime = now.toISOString().slice(0, 16);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/${lng}/trips`}
          className="btn btn-ghost btn-circle"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {mode === "create" ? "Create New Trip" : "Edit Trip"}
          </h1>
          <p className="text-base-content/60">
            {mode === "create" 
              ? "Add a new trip record" 
              : "Update trip details"
            }
          </p>
        </div>
      </div>

      {/* Form */}
      <form action={handleSubmit} className="card bg-base-100 shadow-md">
        <div className="card-body space-y-6">
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          {/* Date/Time Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date & Time *
                </span>
              </label>
              <input
                type="datetime-local"
                name="start_datetime"
                defaultValue={trip?.start_datetime ? new Date(trip.start_datetime).toISOString().slice(0, 16) : defaultDateTime}
                required
                className="input input-bordered w-full"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  End Date & Time *
                </span>
              </label>
              <input
                type="datetime-local"
                name="end_datetime"
                defaultValue={trip?.end_datetime ? new Date(trip.end_datetime).toISOString().slice(0, 16) : defaultDateTime}
                required
                className="input input-bordered w-full"
              />
            </div>
          </div>

          {/* Basic Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Username *
                </span>
              </label>
              {isLoadingUsers ? (
                <div className="input input-bordered w-full flex items-center">
                  <span className="loading loading-spinner loading-sm mr-2"></span>
                  Loading users...
                </div>
              ) : (
                <select
                  name="username"
                  defaultValue={trip?.username || ""}
                  required
                  className="select select-bordered w-full"
                >
                  <option value="">Select a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Target *</span>
              </label>
              <select
                name="target"
                defaultValue={trip?.target || "KIP"}
                required
                className="select select-bordered w-full"
              >
                <option value="KIP">KIP</option>
                <option value="CP">CP</option>
                <option value="KZP">KZP</option>
              </select>
            </div>
          </div>

          {/* Location & Route Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Station *
                </span>
              </label>
              <input
                type="text"
                name="station"
                defaultValue={trip?.station || ""}
                placeholder="Enter station name..."
                required
                className="input input-bordered w-full"
                maxLength={200}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Route *</span>
              </label>
              <input
                type="text"
                name="route"
                defaultValue={trip?.route || ""}
                placeholder="Enter route..."
                required
                className="input input-bordered w-full"
                maxLength={200}
              />
            </div>
          </div>

          {/* Staff Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Driver *</span>
                <span className="label-text-alt">Last name, initials, personnel number</span>
              </label>
              <input
                type="text"
                name="driver"
                defaultValue={trip?.driver || ""}
                placeholder="Ivanov I.I., #12345"
                required
                className="input input-bordered w-full"
                maxLength={200}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Assistant Driver</span>
                <span className="label-text-alt">Optional</span>
              </label>
              <input
                type="text"
                name="assistant_driver"
                defaultValue={trip?.assistant_driver || ""}
                placeholder="Petrov P.P., #67890"
                className="input input-bordered w-full"
                maxLength={200}
              />
            </div>
          </div>

          {/* Train & Locomotive Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Train className="h-4 w-4" />
                  Train Number *
                </span>
              </label>
              <input
                type="text"
                name="train_number"
                defaultValue={trip?.train_number || ""}
                placeholder="Enter train number..."
                required
                className="input input-bordered w-full"
                maxLength={50}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Locomotive *
                </span>
              </label>
              <select
                name="locomotive"
                defaultValue={trip?.locomotive || "Mercedes"}
                required
                className="select select-bordered w-full"
              >
                <option value="Mercedes">Mercedes</option>
                <option value="Honda">Honda</option>
                <option value="BMW">BMW</option>
              </select>
            </div>
          </div>

          {/* Locomotive Number */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Locomotive Number *</span>
            </label>
            <input
              type="text"
              name="locomotive_number"
              defaultValue={trip?.locomotive_number || ""}
              placeholder="Enter locomotive number..."
              required
              className="input input-bordered w-full"
              maxLength={50}
            />
          </div>

          {/* Form Actions */}
          <div className="card-actions justify-end pt-4 border-t border-base-300">
            <Link
              href={`/${lng}/trips`}
              className="btn btn-ghost"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingUsers}
              className={`btn btn-primary ${isSubmitting ? 'loading' : ''}`}
            >
              {!isSubmitting && <Save className="h-4 w-4 mr-2" />}
              {mode === "create" ? "Create Trip" : "Update Trip"}
            </button>
          </div>
        </div>
      </form>

      {/* Tips */}
      <div className="mt-6 p-4 bg-base-200 rounded-lg">
        <h3 className="font-medium mb-2">Tips:</h3>
        <ul className="text-sm text-base-content/70 space-y-1">
          <li>• Enter accurate date and time information</li>
          <li>• Select the correct user from the dropdown</li>
          <li>• Use the format &quot;Last name I.I., #personnel_number&quot; for driver information</li>
          <li>• Assistant driver field is optional</li>
          <li>• Double-check locomotive and train numbers</li>
        </ul>
      </div>
    </div>
  );
}