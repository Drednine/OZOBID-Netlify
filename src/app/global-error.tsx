'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8 text-center">
            <div>
              <h1 className="mt-6 text-center text-4xl font-extrabold text-gray-900">500</h1>
              <h2 className="mt-2 text-center text-2xl font-bold text-gray-900">
                Внутренняя ошибка сервера
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Произошла непредвиденная ошибка. Мы уже работаем над её устранением.
              </p>
            </div>
            <div>
              <button
                onClick={() => reset()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Попробовать снова
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
} 