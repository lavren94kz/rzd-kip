// app/page.tsx
import { createServerClient } from "@/lib/pocketbase/server";
import { ArrowRight, Lock, Zap, Database } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  const client = await createServerClient();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to PB-Next-client
        </h1>
        <p className="text-xl text-muted-foreground">
          {client.authStore.record ? (
            <span>Logged in as {client.authStore.record?.email}</span>
          ) : (
            <span>A modern authentication system built with Next.js and PocketBase</span>
          )}
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 - Security */}
        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
          <div className="card-body">
            <div className="card-title gap-2">
              <Lock className="w-6 h-6 text-primary" />
              Secure Authentication
            </div>
            <p className="py-4">
              Built-in security features including password hashing, JWT tokens, and secure session management.
            </p>
            {!client.authStore.record && (
              <div className="card-actions justify-end">
                <Link href="/register" className="btn btn-primary">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Card 2 - Performance */}
        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
          <div className="card-body">
            <div className="card-title gap-2">
              <Zap className="w-6 h-6 text-primary" />
              Fast Performance
            </div>
            <p className="py-4">
              Built with Next.js App Router and React Server Components for optimal performance and SEO.
            </p>
            <div className="card-actions justify-end">
              <a 
                href="https://nextjs.org/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Learn More <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Card 3 - Database */}
        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
          <div className="card-body">
            <div className="card-title gap-2">
              <Database className="w-6 h-6 text-primary" />
              PocketBase Backend
            </div>
            <p className="py-4">
              Powered by PocketBase, providing a robust and scalable database with real-time capabilities.
            </p>
            <div className="card-actions justify-end">
              <a 
                href="https://pocketbase.io/docs/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                View Docs <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Link */}
      <div className="text-center">
        <p className="text-base text-muted-foreground">
          Visit{" "}
          <a
            href="https://github.com/shadowchess-org/PB-Next"
            target="_blank"
            className="link link-primary"
          >
            our GitHub repository
          </a>{" "}
          to read the documentation.
        </p>
      </div>
    </div>
  );
}