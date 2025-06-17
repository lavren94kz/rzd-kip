// src/app/[lng]/(auth)/todos/components/todo-list.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TodosResponse } from "@/lib/pocketbase/types";
import { TodoItem } from "./todo-item";
import { TodoFilters } from "./todo-filters";
import { Search, Filter } from "lucide-react";

interface TodoListProps {
  initialTodos: TodosResponse[];
  lng: string;
  currentFilter?: string;
  currentSort?: string;
  currentSearch?: string;
}

export function TodoList({ 
  initialTodos, 
  lng, 
  currentFilter,
  currentSort,
  currentSearch 
}: TodoListProps) {
  const [todos, setTodos] = useState(initialTodos);
  const [searchTerm, setSearchTerm] = useState(currentSearch || "");
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter todos client-side for immediate feedback
  const filteredTodos = todos.filter(todo => {
    const matchesSearch = searchTerm === "" || 
      todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (todo.description && todo.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = 
      !currentFilter || currentFilter === "all" ||
      (currentFilter === "active" && !todo.completed) ||
      (currentFilter === "completed" && todo.completed);
    
    return matchesSearch && matchesFilter;
  });

  // Sort todos client-side
  const sortedTodos = [...filteredTodos].sort((a, b) => {
    switch (currentSort) {
      case "title":
        return a.title.localeCompare(b.title);
      case "-title":
        return b.title.localeCompare(a.title);
      case "priority":
        const priorityOrder = { low: 1, medium: 2, high: 3 };
        return priorityOrder[a.priority || "medium"] - priorityOrder[b.priority || "medium"];
      case "-priority":
        const priorityOrderDesc = { low: 3, medium: 2, high: 1 };
        return priorityOrderDesc[a.priority || "medium"] - priorityOrderDesc[b.priority || "medium"];
      case "due_date":
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      case "-due_date":
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return -1;
        if (!b.due_date) return 1;
        return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
      case "created":
        return new Date(a.created).getTime() - new Date(b.created).getTime();
      case "-created":
      default:
        return new Date(b.created).getTime() - new Date(a.created).getTime();
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm) {
      params.set("search", searchTerm);
    } else {
      params.delete("search");
    }
    router.push(`/${lng}/todos?${params.toString()}`);
  };

  const updateTodo = (updatedTodo: TodosResponse) => {
    setTodos(prev => prev.map(todo => 
      todo.id === updatedTodo.id ? updatedTodo : todo
    ));
  };

  const removeTodo = (todoId: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== todoId));
  };

  const activeTodos = todos.filter(todo => !todo.completed);
  const completedTodos = todos.filter(todo => todo.completed);

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
                placeholder="Search todos..."
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
            <TodoFilters 
              lng={lng}
              currentFilter={currentFilter}
              currentSort={currentSort}
            />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat bg-base-100 rounded-lg shadow-md">
          <div className="stat-title">Total</div>
          <div className="stat-value text-primary">{todos.length}</div>
        </div>
        <div className="stat bg-base-100 rounded-lg shadow-md">
          <div className="stat-title">Active</div>
          <div className="stat-value text-warning">{activeTodos.length}</div>
        </div>
        <div className="stat bg-base-100 rounded-lg shadow-md">
          <div className="stat-title">Completed</div>
          <div className="stat-value text-success">{completedTodos.length}</div>
        </div>
      </div>

      {/* Todo Items */}
      <div className="space-y-4">
        {sortedTodos.length === 0 ? (
          <div className="text-center py-12 bg-base-100 rounded-lg shadow-md">
            <p className="text-base-content/60">
              {searchTerm || currentFilter ? "No todos match your criteria" : "No todos yet"}
            </p>
            {!searchTerm && !currentFilter && (
              <p className="text-sm text-base-content/40 mt-2">
                Create your first todo to get started!
              </p>
            )}
          </div>
        ) : (
          sortedTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              lng={lng}
              onUpdate={updateTodo}
              onDelete={removeTodo}
            />
          ))
        )}
      </div>
    </div>
  );
}