// Updated src/app/[lng]/(auth)/dashboard/page.tsx
import { createServerClient } from "@/lib/pocketbase/server";
import { DashboardClient } from "./page-client";
import { Settings, Activity, CheckSquare, Plus } from "lucide-react";
import { getTodos } from "@/lib/actions/todos";
import Link from "next/link";

export default async function Dashboard({
  params,
}: {
  params: Promise<{ lng: string; }>;
}) {
  const { lng } = await params;
  const client = await createServerClient();

  // Get todo stats
  let todoStats = {
    total: 0,
    active: 0,
    completed: 0,
    overdue: 0,
  };

  try {
    const todos = await getTodos();
    const now = new Date();
    
    todoStats = {
      total: todos.totalItems,
      active: todos.items.filter(todo => !todo.completed).length,
      completed: todos.items.filter(todo => todo.completed).length,
      overdue: todos.items.filter(todo => 
        !todo.completed && 
        todo.due_date && 
        new Date(todo.due_date) < now
      ).length,
    };
  } catch (error) {
    console.error("Failed to fetch todo stats:", error);
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-base-content">Dashboard</h1>
        <button className="btn btn-primary">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </button>
      </div>

      {/* Quick Actions */}
      <div className="bg-base-100 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href={`/${lng}/todos/new`}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Todo
          </Link>
          <Link
            href={`/${lng}/todos?filter=active&sort=-priority`}
            className="btn btn-outline"
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            High Priority Tasks
          </Link>
          {todoStats.overdue > 0 && (
            <Link
              href={`/${lng}/todos?filter=active&sort=due_date`}
              className="btn btn-error btn-outline"
            >
              View Overdue ({todoStats.overdue})
            </Link>
          )}
        </div>
      </div>

      {/* Main Content */}
      <DashboardClient lng={lng} />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat bg-base-100 rounded-lg shadow-md">
          <div className="stat-figure text-primary">
            <Activity className="w-8 h-8" />
          </div>
          <div className="stat-title">Account Status</div>
          <div className="stat-value text-primary">Active</div>
          <div className="stat-desc">Member since {
            new Date(client.authStore.model?.created || "").toLocaleDateString()
          }</div>
        </div>

        <div className="stat bg-base-100 rounded-lg shadow-md">
          <div className="stat-figure text-info">
            <CheckSquare className="w-8 h-8" />
          </div>
          <div className="stat-title">Total Todos</div>
          <div className="stat-value text-info">{todoStats.total}</div>
          <div className="stat-desc">
            {todoStats.total === 0 ? "No todos yet" : "All time tasks"}
          </div>
        </div>

        <div className="stat bg-base-100 rounded-lg shadow-md">
          <div className="stat-figure text-warning">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="stat-title">Active Tasks</div>
          <div className="stat-value text-warning">{todoStats.active}</div>
          <div className="stat-desc">
            {todoStats.active === 0 ? "All caught up!" : "Need attention"}
          </div>
        </div>

        <div className="stat bg-base-100 rounded-lg shadow-md">
          <div className="stat-figure text-success">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="stat-title">Completed</div>
          <div className="stat-value text-success">{todoStats.completed}</div>
          <div className="stat-desc">
            {todoStats.completed === 0 ? "Start completing!" : "Great progress"}
          </div>
        </div>
      </div>

      {/* Overdue Alert */}
      {todoStats.overdue > 0 && (
        <div className="alert alert-error">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="font-bold">You have {todoStats.overdue} overdue task{todoStats.overdue > 1 ? 's' : ''}!</h3>
            <div className="text-xs">Check your todos to see what needs immediate attention.</div>
          </div>
          <div>
            <Link href={`/${lng}/todos?filter=active&sort=due_date`} className="btn btn-sm btn-outline">
              View Overdue
            </Link>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-base-100 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Todo Summary</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span>Completion Rate</span>
            <span className="font-semibold">
              {todoStats.total > 0 
                ? `${Math.round((todoStats.completed / todoStats.total) * 100)}%`
                : '0%'
              }
            </span>
          </div>
          {todoStats.total > 0 && (
            <div className="w-full bg-base-300 rounded-full h-2">
              <div 
                className="bg-success h-2 rounded-full transition-all"
                style={{ 
                  width: `${(todoStats.completed / todoStats.total) * 100}%` 
                }}
              ></div>
            </div>
          )}
          <div className="text-sm text-base-content/60 pt-2">
            {todoStats.total === 0 
              ? "Create your first todo to get started!"
              : `You've completed ${todoStats.completed} out of ${todoStats.total} total tasks.`
            }
          </div>
        </div>
      </div>
    </div>
  );
}