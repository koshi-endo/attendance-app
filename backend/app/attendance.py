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


def upsert_attendance_record(
    db: Session, user_id: int, target_date: date, attendance_data: dict
) -> models.Attendance:
    """Create or update attendance record for specific date."""
    from . import schemas
    
    # Parse time strings
    clock_in_time = datetime.strptime(f"{target_date} {attendance_data['clock_in']}", "%Y-%m-%d %H:%M")
    clock_out_time = None
    if attendance_data.get('clock_out'):
        clock_out_time = datetime.strptime(f"{target_date} {attendance_data['clock_out']}", "%Y-%m-%d %H:%M")
    
    # Calculate work hours if both times are provided
    work_hours = None
    status = "checked_in"
    
    if clock_out_time:
        work_duration = clock_out_time - clock_in_time
        # Subtract break minutes
        break_minutes = attendance_data.get('break_minutes', 0)
        effective_seconds = work_duration.total_seconds() - (break_minutes * 60)
        work_hours = max(0, effective_seconds) / 3600
        status = "checked_out"
    
    # Find existing record
    existing_record = get_today_attendance(db, user_id, target_date)
    
    if existing_record:
        # Update existing record
        existing_record.check_in_time = clock_in_time
        existing_record.check_out_time = clock_out_time
        existing_record.break_minutes = attendance_data.get('break_minutes', 0)
        existing_record.note = attendance_data.get('note')
        existing_record.status = status
        existing_record.work_hours = round(work_hours, 2) if work_hours else None
        existing_record.updated_at = datetime.now()
        
        db.commit()
        db.refresh(existing_record)
        return existing_record
    else:
        # Create new record
        new_attendance = models.Attendance(
            user_id=user_id,
            date=target_date,
            check_in_time=clock_in_time,
            check_out_time=clock_out_time,
            status=status,
            work_hours=round(work_hours, 2) if work_hours else None,
            break_minutes=attendance_data.get('break_minutes', 0),
            note=attendance_data.get('note')
        )
        
        db.add(new_attendance)
        db.commit()
        db.refresh(new_attendance)
        return new_attendance