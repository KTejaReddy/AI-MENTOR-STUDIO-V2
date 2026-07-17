"""Load curriculum data from JSON files in the data directory."""
import json
import logging
from pathlib import Path
from typing import List, Dict

from app.curriculum.schemas import Branch, Subject

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "curriculum"


def load_all_branches() -> Dict[str, Branch]:
    """Load all branch JSON files from the data directory."""
    if not DATA_DIR.exists():
        logger.warning("Curriculum data directory not found: %s", DATA_DIR)
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        return {}

    branches: Dict[str, Branch] = {}
    for path in sorted(DATA_DIR.glob("*.json")):
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            branch = Branch(**data)
            if branch.branch_id in branches:
                logger.warning("Duplicate branch_id '%s' in %s", branch.branch_id, path.name)
            branches[branch.branch_id] = branch
            logger.debug("Loaded branch '%s' with %d subjects from %s", branch.name, len(branch.subjects), path.name)
        except Exception as e:
            logger.error("Failed to load curriculum file %s: %s", path.name, e)

    logger.info("Loaded %d branches from %d files", len(branches), len(list(DATA_DIR.glob("*.json"))))
    return branches


def load_branch(branch_id: str) -> Branch | None:
    """Load a single branch by ID."""
    branches = load_all_branches()
    return branches.get(branch_id)


def get_subject_index(branches: Dict[str, Branch]) -> Dict[str, tuple[str, str, Subject]]:
    """Build a flat index: subject_id -> (branch_id, branch_name, Subject)."""
    index: Dict[str, tuple[str, str, Subject]] = {}
    for branch_id, branch in branches.items():
        for subject in branch.subjects:
            if subject.id in index:
                logger.warning("Duplicate subject_id '%s' in branches '%s' and '%s'",
                               subject.id, index[subject.id][0], branch_id)
            index[subject.id] = (branch_id, branch.name, subject)
    return index
