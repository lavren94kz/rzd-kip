// app/[lng]/(auth)/dashboard/page.tsx
import { createServerClient } from "@/lib/pocketbase/server";
import { DashboardClient } from "./page-client";
import { Settings, Activity } from "lucide-react";

export default async function Dashboard({
  params,
}: {
  params: Promise<{ lng: string; }>;
}) {
  const { lng } = await params;
  const client = await createServerClient();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-base-content">Dashboard</h1>
        <button className="btn btn-primary">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </button>
      </div>

      {/* Main Content */}
      <DashboardClient lng={lng} />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>
    </div>
  );
}