import React from 'react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            OZOBID
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Платформа для управления ставками и товарами на маркетплейсе Озон
          </p>
        </div>
        
        <div className="mt-10 bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            В разработке
          </h2>
          <p className="text-gray-600">
            Мы работаем над созданием платформы для автоматизации управления ставками и контроля бюджета на Озон.
          </p>
        </div>
      </div>
    </div>
  );
}
