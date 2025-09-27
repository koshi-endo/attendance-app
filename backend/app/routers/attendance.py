from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from .. import attendance, auth, schemas
from ..database import get_db

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/check-in", response_model=schemas.Attendance)
async def check_in(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    """Check in for the current day."""
    return attendance.check_in_user(db, current_user.id)


@router.post("/check-out", response_model=schemas.Attendance)
async def check_out(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    """Check out for the current day."""
    return attendance.check_out_user(db, current_user.id)


@router.get("/today", response_model=Optional[schemas.Attendance])
async def get_today_attendance(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    """Get today's attendance record."""
    return attendance.get_today_attendance(db, current_user.id)


@router.get("/records", response_model=List[schemas.Attendance])
async def get_attendance_records(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records"),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    """Get attendance records for the current user."""
    return attendance.get_user_attendance_records(
        db, current_user.id, start_date, end_date, limit
    )


@router.get("/summary", response_model=schemas.AttendanceSummary)
async def get_attendance_summary(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    """Get attendance summary for the current user."""
    records = attendance.get_user_attendance_records(
        db, current_user.id, start_date, end_date
    )

    total_days = len(records)
    total_hours = sum(record.work_hours or 0 for record in records)
    average_hours = total_hours / total_days if total_days > 0 else 0

    return schemas.AttendanceSummary(
        total_days=total_days,
        total_hours=round(total_hours, 2),
        average_hours=round(average_hours, 2),
        records=records
    )


@router.get("/status")
async def get_attendance_status(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    """Get current attendance status (checked in/out)."""
    today_record = attendance.get_today_attendance(db, current_user.id)

    if not today_record:
        return {"status": "not_checked_in", "message": "Not checked in today"}

    if today_record.check_out_time:
        return {
            "status": "checked_out",
            "message": f"Checked out at {today_record.check_out_time.strftime('%H:%M')}",
            "work_hours": today_record.work_hours
        }

    return {
        "status": "checked_in",
        "message": f"Checked in at {today_record.check_in_time.strftime('%H:%M')}",
        "duration": str(datetime.now() - today_record.check_in_time).split('.')[0]
    }


@router.put("/me/{work_date}", response_model=schemas.Attendance)
async def upsert_my_attendance(
    work_date: date,
    attendance_data: schemas.AttendanceUpsert,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create or update attendance record for a specific date."""
    try:
        record = attendance.upsert_attendance_record(
            db, current_user.id, work_date, attendance_data
        )
        return record
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        ) from e
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        ) from e
