// src/app/[lng]/(auth)/todos/components/todo-item.tsx
"use client";

import { useState } from "react";
import { TodosResponse } from "@/lib/pocketbase/types";
import { toggleTodoComplete, deleteTodo } from "@/lib/actions/todos";
import { Check, Clock, Edit, Trash2, Calendar, Flag } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

interface TodoItemProps {
  todo: TodosResponse;
  lng: string;
  onUpdate: (todo: TodosResponse) => void;
  onDelete: (todoId: string) => void;
}

export function TodoItem({ todo, lng, onUpdate, onDelete }: TodoItemProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { t } = useTranslation();

  const handleToggleComplete = async () => {
    setIsToggling(true);
    try {
      const result = await toggleTodoComplete(todo.id);
      if (result.success && result.todo) {
        onUpdate(result.todo);
      }
    } catch (error) {
      console.error("Failed to toggle todo:", error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this todo?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteTodo(todo.id);
      if (result.success) {
        onDelete(todo.id);
      }
    } catch (error) {
      console.error("Failed to delete todo:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-error";
      case "medium":
        return "text-warning";
      case "low":
        return "text-info";
      default:
        return "text-base-content/60";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return "badge-error";
      case "medium":
        return "badge-warning";
      case "low":
        return "badge-info";
      default:
        return "badge-ghost";
    }
  };

  const isOverdue = todo.due_date && new Date(todo.due_date) < new Date() && !todo.completed;
  const isDueSoon = todo.due_date && 
    new Date(todo.due_date) > new Date() && 
    new Date(todo.due_date).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000; // 24 hours

  return (
    <div className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow ${
      todo.completed ? 'opacity-75' : ''
    }`}>
      <div className="card-body p-4">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <button
            onClick={handleToggleComplete}
            disabled={isToggling}
            className={`btn btn-circle btn-sm ${
              todo.completed ? 'btn-success' : 'btn-outline'
            } ${isToggling ? 'loading' : ''}`}
          >
            {!isToggling && todo.completed && <Check className="h-4 w-4" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className={`font-semibold ${
                  todo.completed ? 'line-through text-base-content/60' : 'text-base-content'
                }`}>
                  {todo.title}
                </h3>
                
                {todo.description && (
                  <p className={`text-sm mt-1 ${
                    todo.completed ? 'line-through text-base-content/40' : 'text-base-content/70'
                  }`}>
                    {todo.description}
                  </p>
                )}

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  {/* Priority */}
                  <div className="flex items-center gap-1">
                    <Flag className={`h-3 w-3 ${getPriorityColor(todo.priority || "medium")}`} />
                    <span className={`badge badge-sm ${getPriorityBadge(todo.priority || "medium")}`}>
                      {todo.priority || "medium"}
                    </span>
                  </div>

                  {/* Due Date */}
                  {todo.due_date && (
                    <div className={`flex items-center gap-1 ${
                      isOverdue ? 'text-error' : isDueSoon ? 'text-warning' : 'text-base-content/60'
                    }`}>
                      <Calendar className="h-3 w-3" />
                      <span className="text-xs">
                        {new Date(todo.due_date).toLocaleDateString()}
                      </span>
                      {isOverdue && (
                        <span className="badge badge-error badge-sm">Overdue</span>
                      )}
                      {isDueSoon && !isOverdue && (
                        <span className="badge badge-warning badge-sm">Due Soon</span>
                      )}
                    </div>
                  )}

                  {/* Created Date */}
                  <div className="flex items-center gap-1 text-base-content/40">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">
                      {new Date(todo.created).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link
                  href={`/${lng}/todos/${todo.id}/edit`}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}