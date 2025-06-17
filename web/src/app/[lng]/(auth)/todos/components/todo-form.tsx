// src/app/[lng]/(auth)/todos/components/todo-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTodo, updateTodo } from "@/lib/actions/todos";
import { TodosResponse } from "@/lib/pocketbase/types";
import { Save, ArrowLeft, Calendar, Flag, FileText } from "lucide-react";
import Link from "next/link";

interface TodoFormProps {
  lng: string;
  todo?: TodosResponse;
  mode: "create" | "edit";
}

export function TodoForm({ lng, todo, mode }: TodoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      let result;
      if (mode === "create") {
        result = await createTodo(formData);
      } else if (todo) {
        result = await updateTodo(todo.id, formData);
      }

      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        router.push(`/${lng}/todos`);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/${lng}/todos`}
          className="btn btn-ghost btn-circle"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {mode === "create" ? "Create New Todo" : "Edit Todo"}
          </h1>
          <p className="text-base-content/60">
            {mode === "create" 
              ? "Add a new task to your todo list" 
              : "Update your task details"
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

          {/* Title */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Title *
              </span>
            </label>
            <input
              type="text"
              name="title"
              defaultValue={todo?.title || ""}
              placeholder="Enter todo title..."
              required
              className="input input-bordered w-full"
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Description</span>
            </label>
            <textarea
              name="description"
              defaultValue={todo?.description || ""}
              placeholder="Add more details about this task..."
              className="textarea textarea-bordered h-24 resize-none"
              maxLength={1000}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Priority */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Flag className="h-4 w-4" />
                  Priority
                </span>
              </label>
              <select
                name="priority"
                defaultValue={todo?.priority ? String(todo.priority) : "medium"}
                className="select select-bordered w-full"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            {/* Due Date */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Due Date
                </span>
              </label>
              <input
                type="date"
                name="due_date"
                defaultValue={todo?.due_date ? todo.due_date.split('T')[0] : ""}
                min={today}
                className="input input-bordered w-full"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="card-actions justify-end pt-4 border-t border-base-300">
            <Link
              href={`/${lng}/todos`}
              className="btn btn-ghost"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`btn btn-primary ${isSubmitting ? 'loading' : ''}`}
            >
              {!isSubmitting && <Save className="h-4 w-4 mr-2" />}
              {mode === "create" ? "Create Todo" : "Update Todo"}
            </button>
          </div>
        </div>
      </form>

      {/* Tips */}
      <div className="mt-6 p-4 bg-base-200 rounded-lg">
        <h3 className="font-medium mb-2">Tips:</h3>
        <ul className="text-sm text-base-content/70 space-y-1">
          <li>• Use clear, actionable titles for your todos</li>
          <li>• Set due dates to help prioritize your tasks</li>
          <li>• Use high priority for urgent tasks</li>
          <li>• Add detailed descriptions for complex tasks</li>
        </ul>
      </div>
    </div>
  );
}