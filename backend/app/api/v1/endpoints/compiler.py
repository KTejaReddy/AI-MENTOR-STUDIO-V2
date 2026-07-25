from app.core.dependencies import get_current_user
from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.ai.groq_provider import GroqProvider
from app.ai.key_manager import key_manager
from app.compiler.runners import get_runner
from app.compiler.models import ExecutionRequest

router = APIRouter()

class AIActionRequest(BaseModel):
    action: str
    code: str
    language: str
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    compile_output: Optional[str] = None
    exit_code: Optional[int] = None

@router.post("/execute")
async def execute_code(req: ExecutionRequest, current_user: User = Depends(get_current_user)):
    try:
        runner = get_runner(req.language)
        result = runner.execute(
            code=req.code,
            stdin=req.stdin or ""
        )
        return {"run": result.dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution service error: {str(e)}")

@router.post("/ai-action")
async def ai_action(req: AIActionRequest, current_user: User = Depends(get_current_user)):
    prompts = {
        "explain": "Explain the following {language} code step-by-step. Keep it concise.",
        "debug": "Find and fix bugs in this {language} code. Explain what was wrong.",
        "optimize": "Optimize this {language} code for performance and readability. Explain the improvements.",
        "tests": "Generate unit test cases for this {language} code."
    }
    
    if req.action not in prompts:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    system_prompt = prompts[req.action].format(language=req.language)
    
    user_prompt = f"```\n{req.code}\n```"
    
    # Inject execution context if available
    context_parts = []
    if req.compile_output:
        context_parts.append(f"Compiler Output:\n```\n{req.compile_output}\n```")
    if req.stdout:
        context_parts.append(f"Standard Output:\n```\n{req.stdout}\n```")
    if req.stderr:
        context_parts.append(f"Standard Error:\n```\n{req.stderr}\n```")
    if req.exit_code is not None:
        context_parts.append(f"Exit Code: {req.exit_code}")
        
    if context_parts:
        user_prompt += "\n\nExecution Results:\n" + "\n\n".join(context_parts)
    
    provider = GroqProvider(key_manager)
    try:
        response = await provider.generate_completion(
            model_id="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )
        return {"result": response.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
