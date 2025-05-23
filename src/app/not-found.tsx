import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="mt-6 text-center text-4xl font-extrabold text-gray-900">404</h1>
          <h2 className="mt-2 text-center text-2xl font-bold text-gray-900">
            Страница не найдена
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Извините, запрашиваемая страница не существует.
          </p>
        </div>
        <div>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  );
}