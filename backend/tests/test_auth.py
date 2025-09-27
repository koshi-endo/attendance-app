from fastapi.testclient import TestClient


def test_register_user(client: TestClient, test_user):
    response = client.post("/auth/register", json=test_user)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user["email"]
    assert data["username"] == test_user["username"]
    assert data["full_name"] == test_user["full_name"]
    assert "id" in data
    assert "created_at" in data


def test_register_duplicate_email(client: TestClient, test_user):
    client.post("/auth/register", json=test_user)

    duplicate_user = test_user.copy()
    duplicate_user["username"] = "different_username"

    response = client.post("/auth/register", json=duplicate_user)
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]


def test_register_duplicate_username(client: TestClient, test_user):
    client.post("/auth/register", json=test_user)

    duplicate_user = test_user.copy()
    duplicate_user["email"] = "different@example.com"

    response = client.post("/auth/register", json=duplicate_user)
    assert response.status_code == 400
    assert "Username already taken" in response.json()["detail"]


def test_login_success(client: TestClient, test_user):
    client.post("/auth/register", json=test_user)

    login_data = {"username": test_user["username"], "password": test_user["password"]}

    response = client.post("/auth/login", data=login_data)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_username(client: TestClient, test_user):
    client.post("/auth/register", json=test_user)

    login_data = {"username": "nonexistent", "password": test_user["password"]}

    response = client.post("/auth/login", data=login_data)
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]


def test_login_invalid_password(client: TestClient, test_user):
    client.post("/auth/register", json=test_user)

    login_data = {"username": test_user["username"], "password": "wrongpassword"}

    response = client.post("/auth/login", data=login_data)
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]


def test_get_current_user(client: TestClient, test_user):
    client.post("/auth/register", json=test_user)

    login_data = {"username": test_user["username"], "password": test_user["password"]}

    login_response = client.post("/auth/login", data=login_data)
    token = login_response.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/auth/me", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user["email"]
    assert data["username"] == test_user["username"]


def test_get_current_user_invalid_token(client: TestClient):
    headers = {"Authorization": "Bearer invalid_token"}
    response = client.get("/auth/me", headers=headers)

    assert response.status_code == 401
    assert "Could not validate credentials" in response.json()["detail"]


def test_protected_route_with_token(client: TestClient, test_user):
    client.post("/auth/register", json=test_user)

    login_data = {"username": test_user["username"], "password": test_user["password"]}

    login_response = client.post("/auth/login", data=login_data)
    token = login_response.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/auth/protected", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert test_user["username"] in data["message"]


def test_protected_route_without_token(client: TestClient):
    response = client.get("/auth/protected")
    assert response.status_code == 401


def test_password_hashing():
    from app.auth import get_password_hash, verify_password

    password = "testpassword123"
    hashed = get_password_hash(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrongpassword", hashed) is False
