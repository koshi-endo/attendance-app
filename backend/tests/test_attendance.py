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
