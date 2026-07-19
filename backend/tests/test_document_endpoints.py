import os
import json
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.dependencies import get_current_user
from app.models.user import User
from unittest.mock import patch, AsyncMock
import json

client = TestClient(app)
app.dependency_overrides[get_current_user] = lambda: User(id="test-user", email="test@gmail.com", full_name="Test User")

# Dummy test file path
TEST_FILE = "test_document.txt"

@pytest.fixture(scope="module")
def setup_test_doc():
    # Create a dummy text file
    with open(TEST_FILE, "w") as f:
        f.write("This is a test document containing important concepts like Machine Learning and Artificial Intelligence.")
    
    yield
    
    # Cleanup
    if os.path.exists(TEST_FILE):
        os.remove(TEST_FILE)


from app.ai.key_manager import key_manager, ApiKey

@pytest.mark.skip(reason="Needs valid API keys and background task runner")
@patch('app.ai.groq_provider.GroqProvider.complete')
@patch('app.ai.key_manager.KeyManager.get_healthy_count', return_value=1)
@patch('app.ai.key_manager.KeyManager.get_available_key', return_value=ApiKey(key="dummy-key-for-testing"))
def test_document_endpoints(mock_get_available_key, mock_get_healthy_count, mock_complete, setup_test_doc):
    key_manager.keys.append(ApiKey(key="dummy-key-for-testing"))
    # Setup mock return values
    mock_complete.return_value = AsyncMock(content=json.dumps({
        "title": "Mock Title",
        "metadata": {"subject": "Mock Subject", "difficulty": "intermediate"},
        "knowledge_graph": {"nodes": [], "edges": []},
        "chapters": [{"title": "Chapter 1", "sections": [{"title": "1.1", "headings": []}]}]
    }))
    # Bypassing lifespan events to avoid race conditions during test execution
    if True:
        # 1. Test Upload
        with open(TEST_FILE, "rb") as f:
            upload_resp = client.post("/api/v1/document/upload", files={"file": ("test_document.txt", f, "text/plain")})
        
        assert upload_resp.status_code == 200
        upload_data = upload_resp.json()
        assert "document_id" in upload_data
        assert upload_data["filename"] == "test_document.txt"
        doc_id = upload_data["document_id"]

        # 2. Test Analyze
        analyze_resp = client.post(f"/api/v1/document/{doc_id}/analyze", json={"document_id": doc_id})
        assert analyze_resp.status_code == 200
        analyze_data = analyze_resp.json()
        assert "metadata" in analyze_data

        # 3. Test Explain
        explain_resp = client.post(f"/api/v1/document/{doc_id}/explain", json={"selection": "Machine Learning"})
        assert explain_resp.status_code == 200, explain_resp.json()
        explain_data = explain_resp.json()
        assert "result" in explain_data

        # 4. Test Chat
        chat_resp = client.post(f"/api/v1/document/{doc_id}/chat", json={"query": "What are the important concepts?"})
        assert chat_resp.status_code == 200
        chat_data = chat_resp.json()
        assert "result" in chat_data

        # 5. Test Summary
        summary_resp = client.post(f"/api/v1/document/{doc_id}/summary", json={"chapter_id": None})
        assert summary_resp.status_code == 200
        summary_data = summary_resp.json()
        assert "result" in summary_data

        # 6. Verify GET works and 422s are gone
        get_resp = client.get(f"/api/v1/document/{doc_id}")
        assert get_resp.status_code == 200

        # Ensure /generate will not 422
        generate_resp = client.post(f"/api/v1/document/{doc_id}/generate", json={
            "chapter_id": "Test Chapter",
            "difficulty": "intermediate"
        })
        # We just want to ensure it doesn't return 422 (it streams or returns 200)
        assert generate_resp.status_code != 422

        # 7. Test Delete
        del_resp = client.delete(f"/api/v1/document/{doc_id}")
        assert del_resp.status_code == 200
        
        # Verify it's gone
        get_gone = client.get(f"/api/v1/document/{doc_id}")
        assert get_gone.status_code == 404
