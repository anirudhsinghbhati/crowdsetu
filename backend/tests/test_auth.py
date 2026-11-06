import pytest

def test_login_success(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["role"] == "admin"
    assert data["username"] == "admin"

def test_login_invalid_password(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "wrongpassword"})
    assert res.status_code == 401
    assert "Wrong username or password" in res.json()["detail"]

def test_login_nonexistent_user(client):
    res = client.post("/api/auth/login", json={"username": "unknown_user", "password": "password"})
    assert res.status_code == 401

def test_users_list_and_create(client):
    # Login as admin to get token
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # List users
    users_res = client.get("/api/users", headers=headers)
    assert users_res.status_code == 200
    users = users_res.json()
    assert len(users) >= 3

    # Create new user
    new_user_res = client.post(
        "/api/users",
        json={"username": "test_officer", "password": "password123", "role": "operator", "name": "Test Officer"},
        headers=headers,
    )
    assert new_user_res.status_code == 201
    assert new_user_res.json()["username"] == "test_officer"

    # Verify newly created user can log in
    officer_login = client.post("/api/auth/login", json={"username": "test_officer", "password": "password123"})
    assert officer_login.status_code == 200
    assert officer_login.json()["role"] == "operator"

    # Delete user
    del_res = client.delete("/api/users/test_officer", headers=headers)
    assert del_res.status_code == 200
