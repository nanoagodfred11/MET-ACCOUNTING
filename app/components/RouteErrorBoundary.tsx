import { isRouteErrorResponse } from 'react-router';

export function RouteErrorBoundary({ error }: { error: unknown }) {
  let message = 'Something went wrong';
  let details = 'An unexpected error occurred while loading this page.';

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? 'Not Found' : `Error ${error.status}`;
    details = error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
  }

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="bg-navy-700 rounded-lg p-8 max-w-lg border border-red-500/30 text-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">{message}</h2>
        <p className="text-gray-400 text-sm mb-4">{details}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors text-sm"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
