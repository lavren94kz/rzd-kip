// lib/actions/auth.ts
"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "../pocketbase/server";
import { ClientResponseError } from "pocketbase";

interface AuthResult {
  error?: string;
  errors?: string[];
  redirect?: string;
}

export async function login(formData: FormData) {
  const client = await createServerClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await client.collection("users").authWithPassword(email, password);
    // Return the base path, the client will add the language prefix
    return { redirect: "/dashboard" };
  } catch (e) {
    console.error("Login error:", e);
    if (e instanceof ClientResponseError) {
      return { error: "Invalid email or password" };
    }
    return { error: "An unexpected error occurred" };
  }
}

export async function register(formData: FormData): Promise<AuthResult> {
  const client = await createServerClient();

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const passwordConfirm = formData.get("passwordConfirm") as string;
  const language = formData.get("language") as string;

  try {
    // First check name existence
    const nameExists = await client.collection("users").getList(1, 1, {
      filter: `name = "${name}"`,
    });

    if (nameExists.totalItems > 0) {
      return { errors: ["This name is already taken"] };
    }

    // Then check email existence
    const emailExists = await client.collection("users").getList(1, 1, {
      filter: `email = "${email}"`,
    });

    if (emailExists.totalItems > 0) {
      return { errors: ["This email is already registered"] };
    }

    // Create new user
    // await client.collection("users").create({
    //   name,
    //   email,
    //   password,
    //   passwordConfirm,
    //   language, // Store language preference in user record if your PB schema supports it
    // });

    // Create new user
    await client.collection("users").create({
      name,
      email,
      password,
      passwordConfirm,
      language,
    });

    // Login after registration and ensure the auth store is updated
    await client.collection("users").authWithPassword(email, password);

    // Make sure the auth is saved in cookies
    if (typeof document !== "undefined") {
      document.cookie = client.authStore.exportToCookie({ httpOnly: false });
    }

    // Add a small delay to ensure auth state propagation
    await new Promise((resolve) => setTimeout(resolve, 100));

    return { redirect: `/dashboard` };
  } catch (error: unknown) {
    if (error instanceof ClientResponseError) {
      const validationErrors = error.data?.data;
      if (validationErrors) {
        const errors: string[] = [];
        for (const field in validationErrors) {
          const fieldError = validationErrors[field];
          if (fieldError.code === "validation_not_unique") {
            if (field === "name") {
              errors.push("This name is already taken");
            } else if (field === "email") {
              errors.push("This email is already registered");
            }
          } else if (fieldError.message) {
            errors.push(fieldError.message);
          }
        }
        if (errors.length > 0) {
          return { errors };
        }
      }
      if (error.message) {
        return { errors: [error.message] };
      }
    }
    return { errors: ["Registration failed. Please try again."] };
  }
}

export async function logout() {
  const client = await createServerClient();
  await client.authStore.clear();
  revalidatePath("/", "layout");
  return { redirect: "/login" };
}
