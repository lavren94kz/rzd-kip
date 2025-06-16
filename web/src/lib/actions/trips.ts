// src/lib/actions/trips.ts
"use server";

import { createServerClient } from "../pocketbase/server";
import { revalidatePath } from "next/cache";
import { ClientResponseError } from "pocketbase";
import { TripsRecord } from "../pocketbase/types";

interface TripResult {
  error?: string;
  success?: boolean;
  trip?: TripsRecord;
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

  console.log("Raw form data:", {
    start_datetime,
    end_datetime,
    username,
    target,
    station,
    driver
  });

  console.log("Formatted datetimes:", {
    start: formattedStartDateTime,
    end: formattedEndDateTime
  });

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

  console.log("Final trip data being sent to PocketBase:", tripData);

  try {
    const trip = await client.collection("trips").create(tripData);

    revalidatePath("/", "layout");
    return { success: true, trip };
  } catch (error) {
    console.error("Create trip error:", error);
    if (error instanceof ClientResponseError) {
      console.log("Error status:", error.status);
      console.log("Error data:", error.data);
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

export async function getTrips(filter?: string, sort?: string, page: number = 1, perPage: number = 10) {
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

    return trips;
  } catch (error) {
    console.error("Get trips error:", error);
    throw error;
  }
}

export async function getAllTrips(page: number = 1, perPage: number = 10, sort?: string) {
  const client = await createServerClient();

  if (!client.authStore.model?.id) {
    throw new Error("Not authenticated");
  }

  try {
    const trips = await client.collection("trips").getList(page, perPage, {
      sort: sort || "-start_datetime",
      expand: "user,username", // Expand both user and username relations
    });

    return trips;
  } catch (error) {
    console.error("Get all trips error:", error);
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