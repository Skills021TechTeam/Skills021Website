import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Pre-seed localStorage with admin user
const seedUsers = () => {
  const existingUsers = localStorage.getItem('skills021_users')
  if (!existingUsers) {
    const users = [
      {
        id: 'admin-001',
        name: 'Admin Skills021',
        email: 'admin@skills021.com',
        password: 'admin123',
        role: 'admin',
        college: 'Skills021 HQ',
        phone: '+91 9999999999',
        joinedDate: '2024-01-01',
        enrolledCourses: [],
        disabled: false,
      },
    ]
    localStorage.setItem('skills021_users', JSON.stringify(users))
  }
}

seedUsers()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
