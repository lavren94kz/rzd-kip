// lib/actions/account.ts
"use server";

import { createServerClient } from "../pocketbase/server";
import { revalidatePath } from "next/cache";

interface DeleteAccountResult {
  error?: string;
  redirect?: string;
}

export async function deleteAccount(): Promise<DeleteAccountResult> {
  const client = await createServerClient();

  try {
    // Check if we have a logged in user
    if (!client.authStore.model?.id) {
      return { error: "Not authenticated" };
    }

    // Delete the user account
    await client.collection("users").delete(client.authStore.model.id);

    // Clear the auth store
    client.authStore.clear();

    // Revalidate the layout to update navigation
    revalidatePath("/", "layout");

    return { redirect: "/login" };
  } catch (error) {
    console.error("Delete account error:", error);
    return { error: "Failed to delete account. Please try again." };
  }
}
