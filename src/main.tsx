import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Pre-seed localStorage with admin and sample users
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
      {
        id: 'user-001',
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        password: 'password123',
        role: 'user',
        college: 'AKTU-affiliated',
        phone: '+91 9876543210',
        joinedDate: '2025-02-15',
        enrolledCourses: ['course-1', 'course-3'],
        disabled: false,
      },
      {
        id: 'user-002',
        name: 'Priya Verma',
        email: 'priya@example.com',
        password: 'password123',
        role: 'user',
        college: 'IPU-affiliated',
        phone: '+91 9876543211',
        joinedDate: '2025-03-10',
        enrolledCourses: ['course-4', 'course-6'],
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
