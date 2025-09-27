import time
from datetime import date, timedelta

from fastapi.testclient import TestClient


def test_check_in_success(client: TestClient, auth_headers):
    """Test successful check-in."""
    response = client.post("/attendance/check-in", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "checked_in"
    assert data["date"] == str(date.today())
    assert "check_in_time" in data
    assert data["check_out_time"] is None


def test_check_in_duplicate(client: TestClient, auth_headers):
    """Test duplicate check-in prevention."""
    client.post("/attendance/check-in", headers=auth_headers)

    response = client.post("/attendance/check-in", headers=auth_headers)
    assert response.status_code == 400
    assert "Already checked in" in response.json()["detail"]


def test_check_out_success(client: TestClient, auth_headers):
    """Test successful check-out."""
    client.post("/attendance/check-in", headers=auth_headers)

    time.sleep(0.1)

    response = client.post("/attendance/check-out", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "checked_out"
    assert data["check_out_time"] is not None
    assert data["work_hours"] is not None
    assert data["work_hours"] >= 0


def test_check_out_without_check_in(client: TestClient, auth_headers):
    """Test check-out without check-in."""
    response = client.post("/attendance/check-out", headers=auth_headers)
    assert response.status_code == 400
    assert "No check-in record found" in response.json()["detail"]


def test_check_out_duplicate(client: TestClient, auth_headers):
    """Test duplicate check-out prevention."""
    client.post("/attendance/check-in", headers=auth_headers)
    client.post("/attendance/check-out", headers=auth_headers)

    response = client.post("/attendance/check-out", headers=auth_headers)
    assert response.status_code == 400
    assert "Already checked out" in response.json()["detail"]


def test_get_today_attendance(client: TestClient, auth_headers):
    """Test getting today's attendance."""
    response = client.get("/attendance/today", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() is None

    client.post("/attendance/check-in", headers=auth_headers)
    response = client.get("/attendance/today", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "checked_in"


def test_get_attendance_records(client: TestClient, auth_headers):
    """Test getting attendance records."""
    client.post("/attendance/check-in", headers=auth_headers)
    client.post("/attendance/check-out", headers=auth_headers)

    response = client.get("/attendance/records", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["status"] == "checked_out"


def test_get_attendance_summary(client: TestClient, auth_headers):
    """Test getting attendance summary."""
    client.post("/attendance/check-in", headers=auth_headers)

    time.sleep(0.1)

    client.post("/attendance/check-out", headers=auth_headers)

    response = client.get("/attendance/summary", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_days"] == 1
    assert data["total_hours"] >= 0
    assert data["average_hours"] >= 0
    assert len(data["records"]) == 1


def test_get_attendance_status(client: TestClient, auth_headers):
    """Test getting attendance status."""
    response = client.get("/attendance/status", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "not_checked_in"

    client.post("/attendance/check-in", headers=auth_headers)
    response = client.get("/attendance/status", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "checked_in"

    client.post("/attendance/check-out", headers=auth_headers)
    response = client.get("/attendance/status", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "checked_out"


def test_attendance_requires_authentication(client: TestClient):
    """Test that attendance endpoints require authentication."""
    endpoints = [
        "/attendance/check-in",
        "/attendance/check-out",
        "/attendance/today",
        "/attendance/records",
        "/attendance/summary",
        "/attendance/status"
    ]

    for endpoint in endpoints:
        if endpoint in ["/attendance/check-in", "/attendance/check-out"]:
            response = client.post(endpoint)
        else:
            response = client.get(endpoint)
        assert response.status_code == 401


def test_date_range_filtering(client: TestClient, auth_headers):
    """Test date range filtering for attendance records."""
    client.post("/attendance/check-in", headers=auth_headers)
    client.post("/attendance/check-out", headers=auth_headers)

    today = date.today()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)

    response = client.get(
        f"/attendance/records?start_date={yesterday}&end_date={tomorrow}",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert len(response.json()) == 1

    response = client.get(
        f"/attendance/records?start_date={yesterday}&end_date={yesterday}",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert len(response.json()) == 0


def test_upsert_attendance_create_new_record(client: TestClient, auth_headers):
    """Test creating a new attendance record via upsert."""
    work_date = "2023-12-01"
    payload = {
        "clock_in": "09:00",
        "clock_out": "17:00",
        "break_minutes": 60,
        "note": "Regular work day"
    }

    response = client.put(f"/attendance/me/{work_date}", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["date"] == work_date
    assert data["status"] == "checked_out"
    assert data["work_hours"] == 7.0  # 8 hours - 1 hour break
    assert data["break_minutes"] == 60
    assert data["note"] == "Regular work day"


def test_upsert_attendance_update_existing_record(client: TestClient, auth_headers):
    """Test updating an existing attendance record via upsert."""
    work_date = "2023-12-01"

    initial_payload = {
        "clock_in": "09:00",
        "clock_out": "17:00",
        "break_minutes": 30,
        "note": "Initial note"
    }
    client.put(f"/attendance/me/{work_date}", json=initial_payload, headers=auth_headers)

    update_payload = {
        "clock_in": "08:30",
        "clock_out": "17:30",
        "break_minutes": 45,
        "note": "Updated note"
    }
    response = client.put(f"/attendance/me/{work_date}", json=update_payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["date"] == work_date
    assert data["work_hours"] == 8.25  # 9 hours - 45 minutes break
    assert data["break_minutes"] == 45
    assert data["note"] == "Updated note"


def test_upsert_attendance_only_clock_in(client: TestClient, auth_headers):
    """Test creating attendance record with only clock_in."""
    work_date = "2023-12-01"
    payload = {
        "clock_in": "09:00",
        "break_minutes": 0,
        "note": "Started work"
    }

    response = client.put(f"/attendance/me/{work_date}", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["date"] == work_date
    assert data["status"] == "checked_in"
    assert data["work_hours"] is None
    assert data["break_minutes"] == 0
    assert data["note"] == "Started work"


def test_upsert_attendance_validation_clock_out_before_clock_in(client: TestClient, auth_headers):
    """Test validation error when clock_out is before clock_in."""
    work_date = "2023-12-01"
    payload = {
        "clock_in": "17:00",
        "clock_out": "09:00",  # Invalid: before clock_in
        "break_minutes": 0,
        "note": "Invalid times"
    }

    response = client.put(f"/attendance/me/{work_date}", json=payload, headers=auth_headers)
    assert response.status_code == 422
    error_detail = response.json()["detail"]
    if isinstance(error_detail, list):
        assert any("clock_out must be greater than or equal to clock_in" in str(error) for error in error_detail)
    else:
        assert "clock_out must be greater than or equal to clock_in" in error_detail


def test_upsert_attendance_validation_negative_break_minutes(client: TestClient, auth_headers):
    """Test validation error for negative break_minutes."""
    work_date = "2023-12-01"
    payload = {
        "clock_in": "09:00",
        "clock_out": "17:00",
        "break_minutes": -30,  # Invalid: negative
        "note": "Invalid break time"
    }

    response = client.put(f"/attendance/me/{work_date}", json=payload, headers=auth_headers)
    assert response.status_code == 422


def test_upsert_attendance_validation_invalid_time_format(client: TestClient, auth_headers):
    """Test validation error for invalid time format."""
    work_date = "2023-12-01"
    payload = {
        "clock_in": "25:00",  # Invalid: hour > 23
        "clock_out": "17:00",
        "break_minutes": 0,
        "note": "Invalid time format"
    }

    response = client.put(f"/attendance/me/{work_date}", json=payload, headers=auth_headers)
    assert response.status_code == 422


def test_upsert_attendance_with_null_note(client: TestClient, auth_headers):
    """Test creating attendance record with null note."""
    work_date = "2023-12-01"
    payload = {
        "clock_in": "09:00",
        "clock_out": "17:00",
        "break_minutes": 30,
        "note": None
    }

    response = client.put(f"/attendance/me/{work_date}", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["note"] is None


def test_upsert_attendance_unauthorized(client: TestClient):
    """Test upsert attendance without authentication."""
    work_date = "2023-12-01"
    payload = {
        "clock_in": "09:00",
        "clock_out": "17:00",
        "break_minutes": 0,
        "note": "Should fail"
    }

    response = client.put(f"/attendance/me/{work_date}", json=payload)
    assert response.status_code == 401
