// lib/actions/todos.ts
"use server";

import { createServerClient } from "../pocketbase/server";
import { revalidatePath } from "next/cache";
import { ClientResponseError } from "pocketbase";
import { TodosRecord } from "../pocketbase/types";

interface TodoResult {
  error?: string;
  success?: boolean;
  todo?: TodosRecord;
}

export async function createTodo(formData: FormData): Promise<TodoResult> {
  const client = await createServerClient();

  if (!client.authStore.model?.id) {
    return { error: "Not authenticated" };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const priority = formData.get("priority") as "low" | "medium" | "high";
  const due_date = formData.get("due_date") as string;

  try {
    const todo = await client.collection("todos").create({
      title,
      description: description || "",
      priority: priority || "medium",
      due_date: due_date || null,
      completed: false,
      user: client.authStore.model.id,
    });

    revalidatePath("/", "layout");
    return { success: true, todo };
  } catch (error) {
    console.error("Create todo error:", error);
    if (error instanceof ClientResponseError) {
      return { error: error.message };
    }
    return { error: "Failed to create todo" };
  }
}

export async function updateTodo(
  id: string,
  formData: FormData
): Promise<TodoResult> {
  const client = await createServerClient();

  if (!client.authStore.model?.id) {
    return { error: "Not authenticated" };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const priority = formData.get("priority") as "low" | "medium" | "high";
  const due_date = formData.get("due_date") as string;

  try {
    const todo = await client.collection("todos").update(id, {
      title,
      description: description || "",
      priority: priority || "medium",
      due_date: due_date || null,
    });

    revalidatePath("/", "layout");
    return { success: true, todo };
  } catch (error) {
    console.error("Update todo error:", error);
    if (error instanceof ClientResponseError) {
      return { error: error.message };
    }
    return { error: "Failed to update todo" };
  }
}

export async function toggleTodoComplete(id: string): Promise<TodoResult> {
  const client = await createServerClient();

  if (!client.authStore.model?.id) {
    return { error: "Not authenticated" };
  }

  try {
    // First get the current todo
    const currentTodo = await client.collection("todos").getOne(id);
    
    // Toggle the completed status
    const todo = await client.collection("todos").update(id, {
      completed: !currentTodo.completed,
    });

    revalidatePath("/", "layout");
    return { success: true, todo };
  } catch (error) {
    console.error("Toggle todo error:", error);
    if (error instanceof ClientResponseError) {
      return { error: error.message };
    }
    return { error: "Failed to toggle todo" };
  }
}

export async function deleteTodo(id: string): Promise<TodoResult> {
  const client = await createServerClient();

  if (!client.authStore.model?.id) {
    return { error: "Not authenticated" };
  }

  try {
    await client.collection("todos").delete(id);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Delete todo error:", error);
    if (error instanceof ClientResponseError) {
      return { error: error.message };
    }
    return { error: "Failed to delete todo" };
  }
}

export async function getTodos(filter?: string, sort?: string) {
  const client = await createServerClient();

  if (!client.authStore.model?.id) {
    throw new Error("Not authenticated");
  }

  try {
    let filterQuery = `user = "${client.authStore.model.id}"`;
    
    if (filter) {
      filterQuery += ` && ${filter}`;
    }

    const todos = await client.collection("todos").getList(1, 50, {
      filter: filterQuery,
      sort: sort || "-created",
    });

    return todos;
  } catch (error) {
    console.error("Get todos error:", error);
    throw error;
  }
}

export async function getTodo(id: string) {
  const client = await createServerClient();

  if (!client.authStore.model?.id) {
    throw new Error("Not authenticated");
  }

  try {
    const todo = await client.collection("todos").getOne(id, {
      filter: `user = "${client.authStore.model.id}"`,
    });

    return todo;
  } catch (error) {
    console.error("Get todo error:", error);
    throw error;
  }
}