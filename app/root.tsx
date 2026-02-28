import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';

import './styles/app.css';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Met Accounting — CIL Gold Plant</title>
        <Meta />
        <Links />
      </head>
      <body className="bg-navy-800 text-gray-200 font-sans antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404
        ? 'The requested page could not be found.'
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-navy-800 p-4">
      <div className="bg-navy-700 rounded-lg p-8 max-w-lg border border-navy-500/30">
        <h1 className="text-2xl font-bold text-gold-400 mb-2">{message}</h1>
        <p className="text-gray-300 mb-4">{details}</p>
        {stack && (
          <pre className="bg-navy-900 rounded p-3 text-xs text-gray-400 overflow-x-auto">
            <code>{stack}</code>
          </pre>
        )}
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors text-sm"
        >
          Reload Page
        </button>
      </div>
    </main>
  );
}
