from app.core.dependencies import get_current_user
from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException

from app.compiler.runners import get_runner
from app.compiler.models import ExecutionRequest

router = APIRouter()

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
