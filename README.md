# Attendance App

A modern attendance management system built with FastAPI backend and React TypeScript frontend.

## Architecture

- **Backend**: FastAPI with Python 3.11
- **Frontend**: React with TypeScript and Vite
- **Database**: PostgreSQL 15
- **Authentication**: JWT tokens with bcrypt password hashing
- **Containerization**: Docker and Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd attendance-app
```

2. Start all services:
```bash
docker compose up -d
```

This will start:
- PostgreSQL database on port 5432
- FastAPI backend on port 8000
- React frontend on port 5173

3. Access the applications:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Authentication

The application uses JWT-based authentication with the following endpoints:

### API Endpoints

#### Register a new user
```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "secure_password",
  "full_name": "Full Name"
}
```

#### Login
```bash
POST /auth/login
Content-Type: application/x-www-form-urlencoded

username=your_username&password=your_password
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### Get current user info
```bash
GET /auth/me
Authorization: Bearer <your_token>
```

#### Access protected routes
```bash
GET /auth/protected
Authorization: Bearer <your_token>
```

### Using Authentication

1. **Register a new user** using the `/auth/register` endpoint
2. **Login** using the `/auth/login` endpoint to get an access token
3. **Include the token** in the Authorization header for protected routes:
   ```
   Authorization: Bearer <your_access_token>
   ```

### Token Details

- **Algorithm**: HS256
- **Expiry**: 30 minutes
- **Secret**: Configured via `JWT_SECRET` environment variable
- **Password Hashing**: bcrypt with automatic salt generation

## Development

### Backend Development

```bash
cd backend
poetry shell
poetry install
poetry run fastapi dev app/main.py
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Database Migrations

The project uses Alembic for database migrations:

```bash
cd backend
# Generate a new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# View migration history
alembic history
```

### Running Tests

```bash
cd backend
poetry run pytest
```

### Pre-commit Hooks

Install pre-commit hooks for code quality:

```bash
pre-commit install
```

This will run:
- **Backend**: ruff, black, isort
- **Frontend**: eslint, prettier

## Attendance API

The application includes comprehensive attendance tracking with the following endpoints:

### Check In
```bash
curl -X POST "http://localhost:8000/attendance/check-in" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Check Out
```bash
curl -X POST "http://localhost:8000/attendance/check-out" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Today's Attendance
```bash
curl -X GET "http://localhost:8000/attendance/today" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Attendance Records
```bash
curl -X GET "http://localhost:8000/attendance/records?start_date=2024-01-01&end_date=2024-01-31&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Attendance Summary
```bash
curl -X GET "http://localhost:8000/attendance/summary?start_date=2024-01-01&end_date=2024-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Attendance Status
```bash
curl -X GET "http://localhost:8000/attendance/status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Business Rules

- **Check-in**: Users can only check in once per day
- **Check-out**: Users must check in before checking out
- **Work Hours**: Automatically calculated when checking out
- **Date Filtering**: Support for date range queries on attendance records
- **Authentication**: All attendance endpoints require valid JWT token

### Database Schema

The attendance system uses the following database structure:
- **attendance** table with foreign key to users table
- Indexes on user_id and date for efficient queries
- Timezone-aware datetime fields for accurate time tracking

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens (change in production!)
- `CORS_ORIGINS`: Allowed CORS origins

## Frontend

The frontend is built with React 18, TypeScript, and Vite. It uses Tailwind CSS for styling and shadcn/ui for components.

### Key Features
- Modern React with TypeScript
- Tailwind CSS for styling
- shadcn/ui component library
- Vite for fast development
- ESLint and Prettier for code quality
- Cookie-based JWT authentication
- Protected routing with role-based access
- Comprehensive attendance management UI

### Authentication System
- **Login Page**: `/login` with email/password form
- **Cookie-based Sessions**: JWT tokens stored in secure cookies
- **Protected Routes**: Role-based access control
- **Automatic Redirects**: Redirect to appropriate dashboard after login

### Routes
- `/login` - Login page (public)
- `/app` - Engineer dashboard (requires authentication)
- `/admin` - Admin dashboard (requires superuser privileges)
- `/` - Redirects to `/app`

### Engineer Attendance UI
The `/app` route provides a comprehensive attendance management interface:

#### Features
- **Month Navigation**: Navigate through different months to view attendance records
- **Daily Records Table**: View all attendance records for the selected month
- **Today's Attendance Form**: Quick form to update today's attendance with:
  - Clock In Time (required, HH:MM format)
  - Clock Out Time (optional, HH:MM format)
  - Break Minutes (number, default 0, must be ≥ 0)
  - Note (optional text field)

#### Validation
- Clock in time is required
- Clock out time must be after clock in time (when both provided)
- Break minutes must be 0 or greater
- Real-time form validation with error messages
- Loading states during form submission

#### API Integration
- Fetches monthly attendance records from `GET /attendance/records`
- Saves attendance via `PUT /attendance/me/{YYYY-MM-DD}`
- Displays success/error toast notifications
- Automatic data refresh after successful saves

### Development
```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:5175

### Testing
```bash
cd frontend
npm test        # Run tests
npm run test:ui # Run tests with UI
```

### Security Features
- JWT tokens stored in secure, httpOnly cookies
- Automatic token validation on page load
- Token expiration handling with redirect to login
- CSRF protection with SameSite cookie policy

## Project Structure

```
attendance-app/
├── backend/           # FastAPI backend
│   ├── app/          # Application code
│   │   ├── routers/  # API route handlers
│   │   ├── models.py # Database models
│   │   ├── schemas.py # Pydantic schemas
│   │   ├── auth.py   # Authentication utilities
│   │   ├── attendance.py # Attendance business logic
│   │   ├── database.py# Database configuration
│   │   └── main.py   # FastAPI application
│   ├── tests/        # Test suite
│   ├── alembic/      # Database migrations
│   ├── Dockerfile    # Backend container
│   └── pyproject.toml # Python dependencies
├── frontend/         # React frontend
│   ├── src/         # Source code
│   │   ├── components/ # React components
│   │   ├── contexts/   # React contexts
│   │   ├── pages/      # Page components
│   │   ├── lib/        # Utilities and API
│   │   └── test/       # Test files
│   ├── public/       # Static assets
│   ├── Dockerfile   # Frontend container
│   └── package.json # Node dependencies
├── docker-compose.yml # Service orchestration
└── README.md        # This file
```
