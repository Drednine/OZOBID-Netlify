import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 - Страница не найдена',
}

export default function NotFound() {
  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f3f4f6',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h2 style={{
            fontSize: '2.25rem',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '1rem'
          }}>
            404 - Страница не найдена
          </h2>
          <p style={{
            color: '#4b5563',
            marginBottom: '2rem'
          }}>
            К сожалению, запрашиваемая страница не существует.
          </p>
          <a
            href="/"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            На главную
          </a>
        </div>
      </body>
    </html>
  )
}