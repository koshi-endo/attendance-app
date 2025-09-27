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
│   │   └── main.py   # FastAPI application
│   ├── tests/        # Test suite
│   ├── alembic/      # Database migrations
│   ├── Dockerfile    # Backend container
│   └── pyproject.toml # Python dependencies
├── frontend/         # React frontend
│   ├── src/         # Source code
│   ├── Dockerfile   # Frontend container
│   └── package.json # Node dependencies
├── docker-compose.yml # Service orchestration
└── README.md        # This file
```
