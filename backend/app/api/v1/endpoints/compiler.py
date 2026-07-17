from app.core.dependencies import get_current_user
from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.ai.groq_provider import GroqProvider
from app.ai.key_manager import key_manager
from app.compiler.sandbox import sandbox

router = APIRouter()

class ExecuteRequest(BaseModel):
    language: str
    version: str
    code: str
    stdin: Optional[str] = ""

class AIActionRequest(BaseModel):
    action: str
    code: str
    language: str

@router.post("/execute")
async def execute_code(req: ExecuteRequest, current_user: User = Depends(get_current_user)):
    try:
        result = sandbox.execute(
            language=req.language,
            code=req.code,
            stdin=req.stdin
        )
        return {"run": result}
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
