from datetime import date, datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import and_
from sqlalchemy.orm import Session

from . import models


def get_today_attendance(
    db: Session, user_id: int, target_date: date = None
) -> Optional[models.Attendance]:
    """Get attendance record for a specific date (defaults to today)."""
    if target_date is None:
        target_date = date.today()

    return (
        db.query(models.Attendance)
        .filter(
            and_(
                models.Attendance.user_id == user_id,
                models.Attendance.date == target_date,
            )
        )
        .first()
    )


def check_in_user(db: Session, user_id: int) -> models.Attendance:
    """Check in a user for today."""
    today = date.today()
    now = datetime.now()

    existing_record = get_today_attendance(db, user_id, today)
    if existing_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already checked in for today",
        )

    attendance = models.Attendance(
        user_id=user_id, date=today, check_in_time=now, status="checked_in"
    )

    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


def check_out_user(db: Session, user_id: int) -> models.Attendance:
    """Check out a user for today."""
    today = date.today()
    now = datetime.now()

    attendance = get_today_attendance(db, user_id, today)
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No check-in record found for today",
        )

    if attendance.check_out_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already checked out for today",
        )

    work_duration = now - attendance.check_in_time
    work_hours = work_duration.total_seconds() / 3600

    attendance.check_out_time = now
    attendance.status = "checked_out"
    attendance.work_hours = round(work_hours, 2)
    attendance.updated_at = now

    db.commit()
    db.refresh(attendance)
    return attendance


def get_user_attendance_records(
    db: Session,
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 100,
) -> List[models.Attendance]:
    """Get attendance records for a user within date range."""
    query = db.query(models.Attendance).filter(models.Attendance.user_id == user_id)

    if start_date:
        query = query.filter(models.Attendance.date >= start_date)
    if end_date:
        query = query.filter(models.Attendance.date <= end_date)

    return query.order_by(models.Attendance.date.desc()).limit(limit).all()
