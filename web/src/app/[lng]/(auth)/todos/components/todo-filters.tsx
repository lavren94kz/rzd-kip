// src/app/[lng]/(auth)/todos/components/todo-filters.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SortAsc, SortDesc } from "lucide-react";

interface TodoFiltersProps {
  lng: string;
  currentFilter?: string;
  currentSort?: string;
}

export function TodoFilters({ lng, currentFilter, currentSort }: TodoFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/${lng}/todos?${params.toString()}`);
  };

  const filterOptions = [
    { value: "", label: "All Todos" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
  ];

  const sortOptions = [
    { value: "-created", label: "Newest First", icon: SortDesc },
    { value: "created", label: "Oldest First", icon: SortAsc },
    { value: "title", label: "Title A-Z", icon: SortAsc },
    { value: "-title", label: "Title Z-A", icon: SortDesc },
    { value: "-priority", label: "High Priority First", icon: SortDesc },
    { value: "priority", label: "Low Priority First", icon: SortAsc },
    { value: "due_date", label: "Due Date (Earliest)", icon: SortAsc },
    { value: "-due_date", label: "Due Date (Latest)", icon: SortDesc },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Filter by Status */}
      <div>
        <label className="label">
          <span className="label-text font-medium">Filter by Status</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => updateParams("filter", option.value || null)}
              className={`btn btn-sm ${
                (currentFilter || "") === option.value
                  ? "btn-primary"
                  : "btn-outline"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort Options */}
      <div>
        <label className="label">
          <span className="label-text font-medium">Sort by</span>
        </label>
        <select
          value={currentSort || "-created"}
          onChange={(e) => updateParams("sort", e.target.value)}
          className="select select-bordered w-full"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Quick Actions */}
      <div className="md:col-span-2">
        <label className="label">
          <span className="label-text font-medium">Quick Filters</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              const params = new URLSearchParams();
              params.set("filter", "active");
              params.set("sort", "-priority");
              router.push(`/${lng}/todos?${params.toString()}`);
            }}
            className="btn btn-sm btn-outline"
          >
            High Priority Active
          </button>
          <button
            onClick={() => {
              const params = new URLSearchParams();
              params.set("filter", "active");
              params.set("sort", "due_date");
              router.push(`/${lng}/todos?${params.toString()}`);
            }}
            className="btn btn-sm btn-outline"
          >
            Due Soon
          </button>
          <button
            onClick={() => {
              const params = new URLSearchParams();
              params.set("filter", "completed");
              params.set("sort", "-updated");
              router.push(`/${lng}/todos?${params.toString()}`);
            }}
            className="btn btn-sm btn-outline"
          >
            Recently Completed
          </button>
        </div>
      </div>
    </div>
  );
}