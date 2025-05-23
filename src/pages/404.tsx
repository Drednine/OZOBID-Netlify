'use client'

export default function Custom404() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h2 className="text-4xl font-bold text-gray-800 mb-4">404 - Страница не найдена</h2>
      <p className="text-gray-600 mb-8">К сожалению, запрашиваемая страница не существует.</p>
      <a 
        href="/"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        На главную
      </a>
    </div>
  )
} 