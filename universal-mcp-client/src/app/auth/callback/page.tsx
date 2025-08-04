'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { oidcManager } from '@/lib/oidc-manager';

export default function CallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setStatus('processing');
        
        // Extract server ID from state parameter
        const urlParams = new URLSearchParams(window.location.search);
        const state = urlParams.get('state');
        let serverId: string | undefined;

        if (state) {
          try {
            const stateData = JSON.parse(state);
            serverId = stateData.serverId;
          } catch (e) {
            console.warn('Failed to parse state parameter:', e);
          }
        }

        // Handle the OAuth callback
        const user = await oidcManager.handleCallback(serverId);
        
        if (user) {
          setStatus('success');
          
          // Redirect back to dashboard after a brief success message
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          throw new Error('No user returned from authentication');
        }
      } catch (err) {
        console.error('OAuth callback failed:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
        
        // Redirect back to dashboard after error display
        setTimeout(() => {
          router.push('/');
        }, 5000);
      }
    };

    // Only run if we have URL parameters (indicating callback)
    if (typeof window !== 'undefined' && window.location.search) {
      handleCallback();
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Processing Authentication
              </h2>
              <p className="text-gray-600">
                Completing your sign-in...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Authentication Successful!
              </h2>
              <p className="text-gray-600 mb-4">
                You have been successfully authenticated.
              </p>
              <p className="text-sm text-gray-500">
                Redirecting you back to the dashboard...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Authentication Failed
              </h2>
              <p className="text-gray-600 mb-4">
                {error || 'Something went wrong during authentication.'}
              </p>
              <p className="text-sm text-gray-500">
                You will be redirected back to the dashboard shortly.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
