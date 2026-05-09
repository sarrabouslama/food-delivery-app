# Food Delivery App

A full-stack food delivery application with a NestJS backend and React frontend.

## Project Structure

```
food-delivery-app/
├── backend/          # NestJS API server
│   ├── src/
│   │   ├── modules/  # Feature modules (auth, orders, restaurants, etc.)
│   │   ├── config/   # Configuration files
│   │   ├── contracts/# Type definitions and interfaces
│   │   └── main.ts   # Application entry point
│   ├── prisma/       # Database schema and migrations
│   ├── test/         # E2E tests
│   └── package.json
├── frontend/         # React/Vite application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── assets/
│   │   └── main.tsx
│   └── package.json
└── README.md         # This file
```

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT
- **Real-time**: WebSockets, Server-Sent Events (SSE)

### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: CSS

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL database

### Installation

1. **Install dependencies for both projects:**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

2. **Setup environment variables:**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your database connection and other configurations
   ```

3. **Setup database:**
   ```bash
   # Run Prisma migrations
   cd backend
   npx prisma migrate dev
   ```

### Running the Application

#### Backend
```bash
cd backend
npm run start:dev      # Development mode with hot reload
npm run start:prod     # Production mode
npm run build         # Build the application
```

#### Frontend
```bash
cd frontend
npm run dev           # Development server
npm run build         # Build for production
npm run preview       # Preview production build
```

## API Modules

### Auth
- User registration and login
- JWT token management
- Password reset

### Orders
- Order creation and management
- Order tracking
- Order history

### Restaurants
- Restaurant information and menu management
- Restaurant search and filtering

### Notifications
- Push notifications
- Email notifications
- In-app notifications

### SSE (Server-Sent Events)
- Real-time event streaming
- Order status updates

### WebSocket
- Real-time bidirectional communication
- Live order tracking
- Real-time notifications

### Audit
- Activity logging
- Change tracking

### Users
- User profile management
- User preferences
