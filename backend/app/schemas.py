from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class User(UserBase):
    id: int
    is_superuser: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class AttendanceBase(BaseModel):
    date: date
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    status: str = "checked_in"
    work_hours: Optional[float] = None
    break_minutes: int = 0
    note: Optional[str] = None


class AttendanceCreate(BaseModel):
    pass


class AttendanceUpdate(BaseModel):
    check_out_time: datetime


class Attendance(AttendanceBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AttendanceResponse(BaseModel):
    id: int
    date: date
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    status: str
    work_hours: Optional[float] = None
    break_minutes: int = 0
    note: Optional[str] = None
    user: User

    class Config:
        from_attributes = True


class AttendanceSummary(BaseModel):
    total_days: int
    total_hours: float
    average_hours: float
    records: List[Attendance]
