from fastapi import HTTPException, status


class AppException(HTTPException):
    def __init__(
        self,
        detail: str = "An unexpected error occurred",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    ):
        super().__init__(status_code=status_code, detail=detail)


class NotFoundException(AppException):
    def __init__(self, resource: str = "Resource", identifier: str = ""):
        detail = f"{resource} not found"
        if identifier:
            detail += f": {identifier}"
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)


class ValidationException(AppException):
    def __init__(self, detail: str = "Validation failed"):
        super().__init__(detail=detail, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


class DuplicateException(AppException):
    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT)
