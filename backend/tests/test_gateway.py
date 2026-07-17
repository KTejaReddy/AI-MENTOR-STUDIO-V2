"""Gateway integration tests."""
import sys
sys.path.insert(0, '.')

print("=== Gateway Integration Tests ===\n")

# 1. Import chain
from app.main import create_app
app = create_app()
routes = [(list(r.methods)[0], r.path) for r in app.routes if hasattr(r, 'path') and '/ai/' in str(r.path)]
print(f"AI Routes ({len(routes)}):")
for m, p in sorted(routes, key=lambda x: x[1]):
    print(f"  {m:6s} {p}")

# 2. Analysis pipeline
from app.ai.gateway import gateway
from app.ai.health_monitor import health_monitor
print("\n--- Analysis Pipeline ---")
result = gateway.analyze_topic("Data Structures", "AVL Trees")
print(f"  category={result['category']}, sections={len(result.get('sections_planned', []))}")
assert result["category"] in ("algorithm", "data-structures", "programming", "general"), f"Unexpected category: {result['category']}"
print("  PASS: Topic analyzed successfully")

# 3. Cache
print("\n--- Cache ---")
gateway.clear_cache()
stats = gateway.get_cache_stats()
print(f"  size={stats['size']}, max={stats['max_entries']}, ttl={stats['ttl_seconds']}")
assert stats["size"] == 0
print("  PASS: Cache empty after clear")

# 4. Models
print("\n--- Models ---")
models = gateway.get_models()
print(f"  {len(models)} models available")
assert len(models) >= 5, f"Expected at least 5 models, got {len(models)}"
model_ids = [m["id"] for m in models]
assert "llama-3.3-70b-versatile" in model_ids
assert "llama-3.1-8b-instant" in model_ids
print("  PASS: Models include expected entries")

# 5. Route resolution
print("\n--- Model Router ---")
route = gateway.get_route("Data Structures", "default", "Binary Search Trees")
print(f"  default/DS: {route['model_id']}")
assert route["model_id"] == "llama-3.3-70b-versatile"
route = gateway.get_route("Machine Learning", "deep", "Neural Networks")
print(f"  deep/ML: {route['model_id']}")
assert route["model_id"] == "llama-3.3-70b-versatile"
route = gateway.get_route("Aptitude", "interview", "System Design")
print(f"  interview/Aptitude: {route['model_id']}")
assert route["model_id"] == "llama-3.3-70b-versatile"
route = gateway.get_route("Aptitude", "quick", "Quick Sort")
print(f"  quick/Aptitude: {route['model_id']}")
assert route["model_id"] == "llama-3.3-70b-versatile"
print("  PASS: Model routing is correct")

# 6. Response Parser
print("\n--- Response Parser ---")
from app.ai.response_parser import response_parser

valid_json = (
    '{"metadata":{"title":"Test","subject":"CS","topic":"test","difficulty":"beginner","learningMode":"default"},'
    '"sections":{"explanation":{"type":"explanation","title":"Test","content":"Hello"}},'
    '"resources":{"keyTerms":[],"furtherReading":[]}}'
)
data, repaired = response_parser.validate(valid_json)
assert data["metadata"]["title"] == "Test"
assert not repaired
print("  PASS: Valid JSON accepted")

fenced = 'Some text ```json {"metadata":{"title":"Fenced","subject":"CS","topic":"t","difficulty":"beginner","learningMode":"default"},"sections":{"explanation":{"type":"explanation","title":"T","content":"C"}},"resources":{"keyTerms":[],"furtherReading":[]}} ``` end'
data, repaired = response_parser.validate(fenced)
assert data["metadata"]["title"] == "Fenced"
print("  PASS: JSON extracted from code fences")

broken = (
    "{'metadata': {'title': 'Broken', 'subject': 'CS', 'topic': 't', 'difficulty': 'beginner', 'learningMode': 'default'},"
    "'sections': {'explanation': {'type': 'explanation', 'title': 'T', 'content': 'C'}},"
    "'resources': {'keyTerms': [], 'furtherReading': []}}"
)
data, repaired = response_parser.validate(broken)
assert data["metadata"]["title"] == "Broken"
assert repaired
print("  PASS: Broken JSON repaired (single quotes)")

empty = "not json at all"
data, repaired = response_parser.validate(empty)
assert "introduction" in data.get("sections", {})
print("  PASS: Empty response gets fallback")

# 7. Subject Registry
print("\n--- Subject Registry ---")
subjects = gateway.get_subjects()
assert len(subjects) >= 400, f"Expected at least 400 subjects, got {len(subjects)}"
print(f"  {len(subjects)} subjects registered")

suggestions = gateway.get_subject_suggestions("tree")
assert len(suggestions) > 0, "Expected suggestions for 'tree'"
print(f"  {len(suggestions)} suggestions for 'tree'")

# 8. Health
print("\n--- Health Monitor ---")
health = gateway.get_health()
assert "status" in health
assert "providers" in health
assert "keys" in health
assert "cache" in health
print(f"  status={health['status']}, uptime={health['uptime_seconds']}s")
print(f"  providers={len(health['providers'])}, keys_total={health['keys']['total']}")

# 9. Stats
stats = health_monitor.get_stats()
assert "total_requests" in stats
print("  PASS: Health and stats endpoints work")

print("\n=== ALL 25 GATEWAY TESTS PASSED ===")
