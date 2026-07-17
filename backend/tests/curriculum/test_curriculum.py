"""Curriculum Management System — comprehensive verification tests."""
import sys
sys.path.insert(0, '.')

from app.curriculum.registry import curriculum_registry
from app.curriculum.loader import load_all_branches, get_subject_index
from app.curriculum.validator import validate_curriculum
from app.curriculum.search import search_curriculum, autocomplete

print("=" * 60)
print("CURRICULUM MANAGEMENT SYSTEM — VERIFICATION REPORT")
print("=" * 60)

# 1. Load all data
print("\n--- 1. Loading Curriculum Data ---")
curriculum_registry.reload()

# 2. Full load test
print("\n--- 2. Full Load Test ---")
branches = load_all_branches()
print(f"  Files loaded: {len(branches)} branches")
expected_branch_count = 27
assert len(branches) >= expected_branch_count, f"Expected >= {expected_branch_count} branches, got {len(branches)}"
print(f"  PASS: {len(branches)} branches loaded (expected at least {expected_branch_count})")

# 3. Subject count
print("\n--- 3. Subject Count Test ---")
subject_index = get_subject_index(branches)
total_subjects = len(subject_index)
print(f"  Total subjects: {total_subjects}")
assert total_subjects >= 400, f"Expected at least 400 subjects, got {total_subjects}"
print(f"  PASS: {total_subjects} subjects indexed")

# 4. Lab count
print("\n--- 4. Lab Count Test ---")
lab_subjects = [s_id for s_id, (_, _, s) in subject_index.items() if s.has_lab]
print(f"  Subjects with lab component: {len(lab_subjects)}")
assert len(lab_subjects) > 0, "Expected at least some subjects with labs"

# 5. Validation
print("\n--- 5. Validation Test ---")
errors = curriculum_registry.get_validation_errors()
if errors:
    print(f"  WARNINGS ({len(errors)}):")
    for err in errors[:20]:
        print(f"    - {err}")
    if len(errors) > 20:
        print(f"    ... and {len(errors) - 20} more")
else:
    print("  No validation errors found")
print(f"  PASS: Validation completed")

# 6. Search test
print("\n--- 6. Search Test ---")
results = search_curriculum("data structures")
print(f"  Search 'data structures': {results.total} results")
assert results.total > 0, "Search should find results for 'data structures'"
print(f"  PASS: Search works")

# 7. Autocomplete test
print("\n--- 7. Autocomplete Test ---")
suggestions = autocomplete("computer", limit=10)
print(f"  Autocomplete 'computer': {len(suggestions)} suggestions")
assert len(suggestions) > 0, "Autocomplete should find suggestions for 'computer'"
for s in suggestions[:5]:
    print(f"    [{s['type']}] {s['label']} ({s['value']})")
print(f"  PASS: Autocomplete works")

# 8. Branch details
print("\n--- 8. Branch Detail Test ---")
for bid, branch in branches.items():
    print(f"  {bid}: {branch.name} — {len(branch.subjects)} subjects")

# 9. Check specific important subjects exist
print("\n--- 9. Required Subject Test ---")
required_subjects = [
    "cse-data-structures", "cse-algorithms", "cse-operating-systems",
    "cse-database-management-systems", "cse-computer-networks",
    "aiml-machine-learning", "aiml-deep-learning", "aiml-artificial-intelligence",
    "ece-digital-electronics", "ece-microprocessors",
    "me-thermodynamics", "me-fluid-mechanics",
    "civil-structural-analysis", "civil-geotechnical-engineering",
    "eee-power-systems", "eee-electrical-machines",
    "chem-chemical-reaction-engineering", "chem-mass-transfer",
    "biotech-genetic-engineering", "biotech-bioinformatics",
]
missing = []
for sid in required_subjects:
    if sid not in subject_index:
        missing.append(sid)
if missing:
    print(f"  MISSING subjects: {missing}")
else:
    print("  All required subjects present")
assert len(missing) == 0, f"Missing {len(missing)} required subjects: {missing}"
print(f"  PASS: All required subjects exist")

# 10. Stats from registry API
print("\n--- 10. Registry API Stats ---")
stats = curriculum_registry.get_stats()
print(f"  Branches: {stats.total_branches}")
print(f"  Subjects: {stats.total_subjects}")
print(f"  Labs: {stats.total_labs}")
assert stats.total_branches >= expected_branch_count
assert stats.total_subjects >= 400
assert stats.total_labs > 0

# Summary
print("\n" + "=" * 60)
print(f"SUMMARY: {stats.total_branches} branches, {stats.total_subjects} subjects, {stats.total_labs} labs")
print(f"Validation errors: {len(errors)}")
print("ALL CURRICULUM TESTS PASSED")
print("=" * 60)
