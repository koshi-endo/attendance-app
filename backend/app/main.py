import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import attendance, auth

load_dotenv()

app = FastAPI(
    title="Attendance App API",
    description="FastAPI backend for attendance management",
    version="1.0.0",
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(attendance.router)


@app.get("/")
async def root():
    return {"message": "Attendance App API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
