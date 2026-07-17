import httpx
import json
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test_auth():
    email = f"test_{uuid.uuid4()}@example.com"
    password = "SecurePassword123!"
    
    print(f"Registering {email}...")
    with httpx.Client(timeout=10.0) as client:
        res = client.post(f"{BASE_URL}/auth/register", json={
            "email": email,
            "password": password,
            "full_name": "Test User"
        })
    
    if res.status_code != 200:
        print(f"Registration failed: {res.text}")
        return False
        
    data = res.json()
    token = data["access_token"]
    refresh_token = data["refresh_token"]
    print("Registration successful!")
    
    # Try protected route
    print("Testing protected route (history)...")
    with httpx.Client(timeout=10.0) as client:
        res = client.get(f"{BASE_URL}/history", headers={"Authorization": f"Bearer {token}"})
    if res.status_code == 200:
        print("Protected route access successful!")
    else:
        print(f"Protected route access failed: {res.text}")
        
    return True

if __name__ == "__main__":
    test_auth()
