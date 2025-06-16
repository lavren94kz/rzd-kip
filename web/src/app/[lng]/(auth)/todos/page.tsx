// src/app/[lng]/(auth)/todos/page.tsx
import { createServerClient } from "@/lib/pocketbase/server";
import { TodoList } from "./components/todo-list";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getTodos } from "@/lib/actions/todos";

interface TodosPageProps {
  params: Promise<{ lng: string }>;
  searchParams: Promise<{ 
    filter?: string; 
    sort?: string; 
    search?: string;
  }>;
}

export default async function TodosPage({ 
  params, 
  searchParams 
}: TodosPageProps) {
  const { lng } = await params;
  const { filter, sort, search } = await searchParams;
  
  const client = await createServerClient();
  
  if (!client.authStore.model) {
    return <div>Not authenticated</div>;
  }

  let todos;
  try {
    // Build filter query
    let filterQuery = "";
    
    if (filter === "active") {
      filterQuery = "completed = false";
    } else if (filter === "completed") {
      filterQuery = "completed = true";
    }
    
    if (search) {
      const searchFilter = `title ~ "${search}" || description ~ "${search}"`;
      filterQuery = filterQuery 
        ? `(${filterQuery}) && (${searchFilter})`
        : searchFilter;
    }

    todos = await getTodos(filterQuery, sort);
  } catch (error) {
    console.error("Failed to fetch todos:", error);
    todos = { items: [], totalItems: 0 };
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-base-content">My Todos</h1>
          <p className="text-base-content/60 mt-1">
            {todos.totalItems} total tasks
          </p>
        </div>
        <Link
          href={`/${lng}/todos/new`}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Todo
        </Link>
      </div>

      {/* Todo List Component */}
      <TodoList 
        initialTodos={todos.items} 
        lng={lng}
        currentFilter={filter}
        currentSort={sort}
        currentSearch={search}
      />
    </div>
  );
}