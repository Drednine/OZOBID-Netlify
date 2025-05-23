'use client';

import Link from 'next/link';

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Подтвердите ваш email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            На ваш email отправлено письмо с инструкциями по подтверждению аккаунта.
            Пожалуйста, проверьте вашу почту и следуйте инструкциям.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
            Вернуться на страницу входа
          </Link>
        </div>
      </div>
    </div>
  );
} 