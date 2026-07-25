from pydantic import BaseModel
from typing import Optional

class ExecutionResult(BaseModel):
    stdout: str
    stderr: str
    compile_output: str
    exit_code: int
    time_ms: int
    memory_mb: float
    compiler_version: str

class ExecutionRequest(BaseModel):
    language: str
    version: str
    code: str
    stdin: Optional[str] = ""
