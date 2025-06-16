"use client";

import { useUser } from "@/components/pocketbase-provider";
import { deleteAccount } from "@/lib/actions/account";
import { useState } from "react";
import { Trash2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

export function DashboardClient({ lng }: { lng: string }) {
  const user = useUser();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleDeleteClick = () => {
    setShowConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowConfirm(false);
  };

  const handleConfirmDelete = async () => {
    try {
      const result = await deleteAccount();
      
      if (result.error) {
        setError(result.error);
      } else if (result.redirect) {
        router.push(`/${lng}${result.redirect}`);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setError(t('dashboard.errors.deleteUnexpected'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-base-content">
            {t('dashboard.accountInfo.title')}
          </h2>
          <div className="space-y-3">
            {user?.name && (
              <p className="text-base-content/80">
                <span className="font-medium">{t('dashboard.accountInfo.name')}:</span> {user.name}
              </p>
            )}
            <p className="text-base-content/80">
              <span className="font-medium">{t('dashboard.accountInfo.email')}:</span> {user?.email}
            </p>
            <p className="text-base-content/80">
              <span className="font-medium">{t('dashboard.accountInfo.id')}:</span> {user?.id}
            </p>
          </div>
        </div>
      </div>

      {/* Delete Account Section */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-error">
            {t('dashboard.dangerZone.title')}
          </h2>
          
          {error && (
            <div className="alert alert-error">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {!showConfirm ? (
            <button
              onClick={handleDeleteClick}
              className="btn btn-error btn-outline"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('dashboard.dangerZone.deleteButton')}
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-base-content/80">
                {t('dashboard.dangerZone.confirmMessage')}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleConfirmDelete}
                  className="btn btn-error"
                >
                  {t('dashboard.dangerZone.confirmDelete')}
                </button>
                <button
                  onClick={handleCancelDelete}
                  className="btn btn-ghost"
                >
                  {t('dashboard.dangerZone.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}