// src/lib/actions/trips.ts - Fixed version with proper typing

"use server";

import { createServerClient } from "../pocketbase/server";
import { revalidatePath } from "next/cache";
import { ClientResponseError } from "pocketbase";
import { TripsRecord, TripsWithUserExpand } from "../pocketbase/types";

interface TripResult {
  error?: string;
  success?: boolean;
  trip?: TripsRecord;
}

interface TripsListResult {
  items: TripsWithUserExpand[];
  totalItems: number;
  totalPages: number;
  page: number;
  perPage: number;
}

// Helper function to format datetime for PocketBase
const formatDateTime = (dateTimeLocal: string) => {
  if (!dateTimeLocal) return "";
  // Convert datetime-local format to ISO string
  return new Date(dateTimeLocal).toISOString();
};

export async function createTrip(formData: FormData): Promise<TripResult> {
  const client = await createServerClient();

  if (!client.authStore.model?.id) {
    return { error: "Not authenticated" };
  }

  const start_datetime = formData.get("start_datetime") as string;
  const username = formData.get("username") as string;
  const target = formData.get("target") as "KIP" | "CP" | "KZP";
  const station = formData.get("station") as string;
  const driver = formData.get("driver") as string;
  const assistant_driver = formData.get("assistant_driver") as string;
  const route = formData.get("route") as string;
  const train_number = formData.get("train_number") as string;
  const locomotive = formData.get("locomotive") as "Mercedes" | "Honda" | "BMW";
  const locomotive_number = formData.get("locomotive_number") as string;
  const end_datetime = formData.get("end_datetime") as string;

  // Format datetimes for PocketBase
  const formattedStartDateTime = formatDateTime(start_datetime);
  const formattedEndDateTime = formatDateTime(end_datetime);

  const tripData = {
    start_datetime: formattedStartDateTime,
    username,
    target,
    station,
    driver,
    assistant_driver: assistant_driver || "",
    route,
    train_number,
    locomotive,
    locomotive_number,
    end_datetime: formattedEndDateTime,
    user: client.authStore.model.id,
  };

  try {
    const trip = await client.collection("trips").create(tripData);

    revalidatePath("/", "layout");
    return { success: true, trip };
  } catch (error) {
    console.error("Create trip error:", error);
    if (error instanceof ClientResponseError) {
      return { error: `Creation failed: ${error.message}. Details: ${JSON.stringify(error.data)}` };
    }
    return { error: "Failed to create trip" };
  }
}

export async function updateTrip(
  id: string,
  formData: FormData
): Promise<TripResult> {
  const client = await createServerClient();

  if (!client.authStore.model?.id) {
    return { error: "Not authenticated" };
  }

  const start_datetime = formData.get("start_datetime") as string;
  const username = formData.get("username") as string;
  const target = formData.get("target") as "KIP" | "CP" | "KZP";
  const station = formData.get("station") as string;
  const driver = formData.get("driver") as string;
  const assistant_driver = formData.get("assistant_driver") as string;
  const route = formData.get("route") as string;
  const train_number = formData.get("train_number") as string;
  const locomotive = formData.get("locomotive") as "Mercedes" | "Honda" | "BMW";
  const locomotive_number = formData.get("locomotive_number") as string;
  const end_datetime = formData.get("end_datetime") as string;

  try {
    const trip = await client.collection("trips").update(id, {
      start_datetime: formatDateTime(start_datetime),
      username,
      target,
      station,
      driver,
      assistant_driver: assistant_driver || "",
      route,
      train_number,
      locomotive,
      locomotive_number,
      end_datetime: formatDateTime(end_datetime),
    });

    revalidatePath("/", "layout");
    return { success: true, trip };
  } catch (error) {
    console.error("Update trip error:", error);
    if (error instanceof ClientResponseError) {
      return { error: error.message };
    }
    return { error: "Failed to update trip" };
  }
}

export async function deleteTrip(id: string): Promise<TripResult> {
  const client = await createServerClient();

  if (!client.authStore.model?.id) {
    return { error: "Not authenticated" };
  }

  try {
    await client.collection("trips").delete(id);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Delete trip error:", error);
    if (error instanceof ClientResponseError) {
      return { error: error.message };
    }
    return { error: "Failed to delete trip" };
  }
}

export async function getTrips(filter?: string, sort?: string, page: number = 1, perPage: number = 10): Promise<TripsListResult> {
  const client = await createServerClient();

  if (!client.authStore.model?.id) {
    throw new Error("Not authenticated");
  }

  try {
    let filterQuery = `user = "${client.authStore.model.id}"`;
    
    if (filter) {
      filterQuery += ` && ${filter}`;
    }

    const trips = await client.collection("trips").getList(page, perPage, {
      filter: filterQuery,
      sort: sort || "-start_datetime",
      expand: "username", // Expand the username relation to get user details
    });

    return {
      items: trips.items as TripsWithUserExpand[],
      totalItems: trips.totalItems,
      totalPages: trips.totalPages,
      page: trips.page,
      perPage: trips.perPage,
    };
  } catch (error) {
    console.error("Get trips error:", error);
    throw error;
  }
}

// Fixed getAllTrips function that properly handles sorting and returns correct type
export async function getAllTrips(page: number = 1, perPage: number = 10, sort?: string): Promise<TripsListResult> {
  const client = await createServerClient();

  if (!client.authStore.model?.id) {
    throw new Error("Not authenticated");
  }

  try {
    // Use the provided sort parameter or default to "-start_datetime"
    const sortOrder = sort || "-start_datetime";
    
    const trips = await client.collection("trips").getList(page, perPage, {
      sort: sortOrder,
      expand: "user,username", // Expand both user and username relations
    });

    return {
      items: trips.items as TripsWithUserExpand[],
      totalItems: trips.totalItems,
      totalPages: trips.totalPages,
      page: trips.page,
      perPage: trips.perPage,
    };
  } catch (error) {
    console.error("Get all trips error:", error);
    throw error;
  }
}

// Enhanced version with filtering support and proper typing
export async function getAllTripsWithFilters(
  page: number = 1, 
  perPage: number = 10, 
  sort?: string,
  filters?: {
    target?: string;
    locomotive?: string;
    search?: string;
  }
): Promise<TripsListResult> {
  const client = await createServerClient();

  if (!client.authStore.model?.id) {
    throw new Error("Not authenticated");
  }

  try {
    // Build filter query
    let filterQuery = "";
    const filterParts: string[] = [];

    // Filter by target
    if (filters?.target) {
      filterParts.push(`target = "${filters.target}"`);
    }

    // Filter by locomotive
    if (filters?.locomotive) {
      filterParts.push(`locomotive = "${filters.locomotive}"`);
    }

    // Search across multiple fields
    if (filters?.search) {
      const searchTerm = filters.search;
      const searchParts = [
        `station ~ "${searchTerm}"`,
        `route ~ "${searchTerm}"`,
        `train_number ~ "${searchTerm}"`,
        `driver ~ "${searchTerm}"`,
        `assistant_driver ~ "${searchTerm}"`,
        `locomotive_number ~ "${searchTerm}"`
      ];
      filterParts.push(`(${searchParts.join(" || ")})`);
    }

    // Combine all filters
    if (filterParts.length > 0) {
      filterQuery = filterParts.join(" && ");
    }

    // Use the provided sort parameter or default to "-start_datetime"
    const sortOrder = sort || "-start_datetime";
    
    const options: {
      sort: string;
      expand: string;
      filter?: string;
    } = {
      sort: sortOrder,
      expand: "user,username", // Expand both user and username relations
    };

    // Only add filter if we have one
    if (filterQuery) {
      options.filter = filterQuery;
    }

    const trips = await client.collection("trips").getList(page, perPage, options);

    return {
      items: trips.items as TripsWithUserExpand[],
      totalItems: trips.totalItems,
      totalPages: trips.totalPages,
      page: trips.page,
      perPage: trips.perPage,
    };
  } catch (error) {
    console.error("Get all trips with filters error:", error);
    throw error;
  }
}

export async function getTrip(id: string) {
  const client = await createServerClient();

  if (!client.authStore.model?.id) {
    throw new Error("Not authenticated");
  }

  try {
    const trip = await client.collection("trips").getOne(id, {
      filter: `user = "${client.authStore.model.id}"`,
      expand: "username", // Expand username relation for editing
    });

    return trip;
  } catch (error) {
    console.error("Get trip error:", error);
    throw error;
  }
}

// Add function to get all users for the username dropdown
export async function getAllUsers() {
  const client = await createServerClient();

  if (!client.authStore.model?.id) {
    throw new Error("Not authenticated");
  }

  try {
    const users = await client.collection("users").getList(1, 100, {
      sort: "name",
      fields: "id,name,email", // Only get necessary fields
    });

    return users;
  } catch (error) {
    console.error("Get users error:", error);
    throw error;
  }
}