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

### Current Endpoints

#### Create/Update Attendance Record
```bash
# Create a new attendance record
curl -X PUT "http://localhost:8000/attendance/me/2023-12-01" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clock_in": "09:00",
    "clock_out": "17:00",
    "break_minutes": 60,
    "note": "Regular work day"
  }'

# Update existing record (same endpoint)
curl -X PUT "http://localhost:8000/attendance/me/2023-12-01" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clock_in": "08:30",
    "clock_out": "17:30",
    "break_minutes": 45,
    "note": "Updated work day"
  }'

# Create record with only clock-in (work in progress)
curl -X PUT "http://localhost:8000/attendance/me/2023-12-01" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clock_in": "09:00",
    "break_minutes": 0,
    "note": "Started work"
  }'
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

### Legacy Endpoints (Deprecated)

⚠️ **These endpoints are deprecated and will be removed in a future version. Use `PUT /attendance/me/{work_date}` instead.**

#### Check In (Legacy)
```bash
curl -X POST "http://localhost:8000/attendance/check-in" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Check Out (Legacy)
```bash
curl -X POST "http://localhost:8000/attendance/check-out" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Today's Attendance (Legacy)
```bash
curl -X GET "http://localhost:8000/attendance/today" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Attendance Fields

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `clock_in` | String | Clock-in time in HH:MM format | Required, 24-hour format |
| `clock_out` | String | Clock-out time in HH:MM format | Optional, must be >= clock_in |
| `break_minutes` | Integer | Break time in minutes | Default: 0, minimum: 0 |
| `note` | String | Optional note | Max length: 1000 characters |

### Business Rules

- **Upsert Behavior**: Creates new record if none exists for the date, otherwise updates existing record
- **Time Validation**: If both clock_in and clock_out are provided, clock_out must be >= clock_in
- **Work Hours Calculation**: `(clock_out - clock_in) - (break_minutes / 60)`
- **Authentication**: All attendance endpoints require valid JWT token
- **Permission**: Engineers can only access their own attendance records

### Database Schema

The attendance system uses the following database structure:

#### Attendance Table Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `id` | Integer | Primary key | Auto-generated |
| `user_id` | Integer | Foreign key to users table | Required |
| `date` | Date | Work date | Required |
| `check_in_time` | DateTime | Clock-in timestamp | Required |
| `check_out_time` | DateTime | Clock-out timestamp | Optional |
| `status` | String | Current status | "checked_in" or "checked_out" |
| `work_hours` | Float | Calculated work hours | Auto-calculated |
| `break_minutes` | Integer | Break time in minutes | 0 |
| `note` | Text | Optional note | NULL |
| `created_at` | DateTime | Record creation time | Auto-generated |
| `updated_at` | DateTime | Last update time | Auto-updated |

- Indexes on user_id and date for efficient queries
- Timezone-aware datetime fields for accurate time tracking

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens (change in production!)
- `CORS_ORIGINS`: Allowed CORS origins

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
│   ├── public/       # Static assets
│   ├── Dockerfile   # Frontend container
│   └── package.json # Node dependencies
├── docker-compose.yml # Service orchestration
└── README.md        # This file
```
