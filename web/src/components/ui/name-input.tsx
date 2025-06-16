// components/name-input.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePocketBase } from "@/components/pocketbase-provider";
import { debounce } from 'lodash';
import { Check, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function NameInput() {
  const [name, setName] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const client = usePocketBase();
  const { t } = useTranslation();

  const checkNameAvailability = useCallback(async (nameToCheck: string) => {
    if (nameToCheck.length < 4) {
      setIsAvailable(null);
      setError(t('auth.name.tooShort'));
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const response = await client.collection('users').getList(1, 1, {
        filter: `name = "${nameToCheck}"`,
      });
      
      setIsAvailable(response.totalItems === 0);
      if (response.totalItems > 0) {
        setError(t('auth.name.taken'));
      }
    } catch (e) {
      console.error('Name check error:', e);
      setError(t('auth.name.checkError'));
    } finally {
      setIsChecking(false);
    }
  }, [client, t]);

  // Memoize the debounced function
  const debouncedCheck = useMemo(
    () => debounce(checkNameAvailability, 300),
    [checkNameAvailability]
  );

  useEffect(() => {
    if (name.length >= 4) {
      debouncedCheck(name);
    } else {
      setIsAvailable(null);
      if (name.length > 0) {
        setError(t('auth.name.tooShort'));
      } else {
        setError(null);
      }
    }

    return () => {
      debouncedCheck.cancel();
    };
  }, [name, debouncedCheck, t]);

  return (
    <div>
      <label htmlFor="name" className="block text-sm font-medium text-base-content/80 mb-1">
        {t('auth.name.label')}
      </label>
      <div className="relative">
        <input
          id="name"
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('auth.name.placeholder')}
          required
          className={`input input-bordered w-full bg-base-200 focus:bg-base-100 transition-colors pr-10
            ${error ? 'input-error' : isAvailable ? 'input-success' : ''}`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {isChecking ? (
            <Loader2 className="h-5 w-5 animate-spin text-base-content/50" />
          ) : isAvailable ? (
            <Check className="h-5 w-5 text-success" />
          ) : error ? (
            <X className="h-5 w-5 text-error" />
          ) : null}
        </div>
      </div>
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
      {isAvailable && (
        <p className="mt-1 text-sm text-success">{t('auth.name.available')}</p>
      )}
    </div>
  );
}