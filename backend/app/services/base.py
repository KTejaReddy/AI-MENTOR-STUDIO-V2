from typing import TypeVar, Generic, Type, Optional, List
from app.repositories.base import BaseRepository
from app.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")
ResponseSchemaType = TypeVar("ResponseSchemaType")


class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType, ResponseSchemaType]):
    def __init__(
        self,
        repository: BaseRepository[ModelType],
        response_schema: Type[ResponseSchemaType],
    ):
        self.repository = repository
        self.response_schema = response_schema

    def create(self, data: CreateSchemaType) -> ResponseSchemaType:
        instance = self.repository.create(**data.model_dump())
        return self.response_schema.model_validate(instance)

    def get(self, id: int) -> Optional[ResponseSchemaType]:
        instance = self.repository.get(id)
        if not instance:
            return None
        return self.response_schema.model_validate(instance)

    def get_all(
        self, skip: int = 0, limit: int = 100, order_by: Optional[str] = None, desc: bool = False
    ) -> tuple[List[ResponseSchemaType], int]:
        items, total = self.repository.get_all(
            skip=skip, limit=limit, order_by=order_by, desc=desc
        )
        return [self.response_schema.model_validate(item) for item in items], total

    def update(self, id: int, data: UpdateSchemaType) -> Optional[ResponseSchemaType]:
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        instance = self.repository.update(id, **update_data)
        if not instance:
            return None
        return self.response_schema.model_validate(instance)

    def delete(self, id: int) -> bool:
        return self.repository.delete(id)
