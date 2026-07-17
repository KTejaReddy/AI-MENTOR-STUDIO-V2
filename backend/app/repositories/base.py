from typing import TypeVar, Generic, Type, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], db: Session, user_id: Optional[str] = None):
        self.model = model
        self.db = db
        self.user_id = user_id

    def _apply_user_filter(self, query):
        if self.user_id and hasattr(self.model, "user_id"):
            return query.filter(self.model.user_id == self.user_id)
        return query

    def create(self, **kwargs) -> ModelType:
        if self.user_id and hasattr(self.model, "user_id") and "user_id" not in kwargs:
            kwargs["user_id"] = self.user_id
        instance = self.model(**kwargs)
        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def get(self, id: int) -> Optional[ModelType]:
        query = select(self.model).filter(self.model.id == id)
        query = self._apply_user_filter(query)
        return self.db.scalar(query)

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        desc: bool = False,
    ) -> tuple[List[ModelType], int]:
        query = select(self.model)
        query = self._apply_user_filter(query)
        
        count_query = select(func.count()).select_from(self.model)
        count_query = self._apply_user_filter(count_query)
        total = self.db.scalar(count_query)
        
        if order_by:
            order_col = getattr(self.model, order_by, None)
            if order_col:
                query = query.order_by(order_col.desc() if desc else order_col)
        query = query.offset(skip).limit(limit)
        items = list(self.db.scalars(query).all())
        return items, total or 0

    def update(self, id: int, **kwargs) -> Optional[ModelType]:
        instance = self.get(id)
        if not instance:
            return None
        for key, value in kwargs.items():
            if value is not None and hasattr(instance, key):
                setattr(instance, key, value)
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def delete(self, id: int) -> bool:
        instance = self.get(id)
        if not instance:
            return False
        self.db.delete(instance)
        self.db.commit()
        return True
