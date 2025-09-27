# Attendance App

A mono-repo with FastAPI backend and React TypeScript frontend for attendance management.

## Development Setup

1. Clone the repository
2. Copy environment files:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```
3. Start the development environment:
   ```bash
   docker compose up
   ```

This will start:
- PostgreSQL database on port 5432
- FastAPI backend on port 8000
- React frontend on port 5173

## Services

- **Backend**: FastAPI with Python 3.11
- **Frontend**: React with TypeScript and Vite
- **Database**: PostgreSQL 15

## API Documentation

Once running, visit:
- Backend API docs: http://localhost:8000/docs
- Frontend: http://localhost:5173
