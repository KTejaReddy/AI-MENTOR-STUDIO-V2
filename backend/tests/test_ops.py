import sys
import os
sys.path.insert(0, '.')

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.dependencies import get_current_user
from app.models.user import User

client = TestClient(app)

# Helper function to create dummy User objects
def create_mock_user(email: str):
    return User(
        email=email,
        full_name="Test User"
    )

def test_ops_unauthorized_access():
    """Verify that a regular authenticated user receives a 404 Not Found for admin endpoints."""
    # Override current user dependency to return a non-admin user
    app.dependency_overrides[get_current_user] = lambda: create_mock_user("regular@gmail.com")
    
    resp = client.get("/api/v1/ops/overview")
    assert resp.status_code == 404
    assert resp.json() == {"detail": "Not Found"}
    
    resp_models = client.get("/api/v1/ops/models")
    assert resp_models.status_code == 404
    
    resp_keys = client.get("/api/v1/ops/keys")
    assert resp_keys.status_code == 404

    # Clean up overrides
    app.dependency_overrides.clear()


def test_ops_authorized_access():
    """Verify that an authorized admin user can successfully query overview and models stats."""
    # Override current user dependency to return the admin user
    app.dependency_overrides[get_current_user] = lambda: create_mock_user("arkoreai0@gmail.com")
    
    resp = client.get("/api/v1/ops/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert "lessons_today" in data
    assert "total_requests" in data
    assert "total_tokens" in data
    
    resp_models = client.get("/api/v1/ops/models")
    assert resp_models.status_code == 200
    models_data = resp_models.json()
    assert isinstance(models_data, list)
    assert len(models_data) > 0
    assert models_data[0]["model_name"] == "All Models"

    # Clean up overrides
    app.dependency_overrides.clear()
