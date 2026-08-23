import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)

import('./App.tsx')
  .then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  })
  .catch((error) => {
    console.error('Failed to start the app:', error)
    root.render(
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          background: '#0B0B14',
          color: '#F1F1FF',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Something went wrong while starting the app</h1>
        <p style={{ opacity: 0.8, maxWidth: '32rem', margin: 0 }}>
          {error instanceof Error ? error.message : 'An unexpected error occurred. Please try again shortly.'}
        </p>
      </div>,
    )
  })
