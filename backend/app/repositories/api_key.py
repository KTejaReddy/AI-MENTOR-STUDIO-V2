from sqlalchemy.orm import Session
from app.models.api_key import StoredApiKey
from app.repositories.base import BaseRepository


class ApiKeyRepository(BaseRepository[StoredApiKey]):
    def __init__(self, db: Session, user_id: str | None = None):
        super().__init__(StoredApiKey, db, user_id=user_id)
        
    def _apply_query_filter(self, query):
        if self.user_id:
            query = query.filter(StoredApiKey.user_id == self.user_id)
        return query

    def get_by_key_value(self, key_value: str):
        return self._apply_query_filter(self.db.query(StoredApiKey)).filter(StoredApiKey.key_value == key_value).first()

    def get_enabled_keys(self):
        return self._apply_query_filter(self.db.query(StoredApiKey)).filter(StoredApiKey.is_enabled == True).all()

    def get_by_status(self, status: str):
        return self._apply_query_filter(self.db.query(StoredApiKey)).filter(StoredApiKey.status == status).all()

    def count_by_status(self, status: str) -> int:
        return self._apply_query_filter(self.db.query(StoredApiKey)).filter(StoredApiKey.status == status).count()
