from __future__ import annotations

from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .....core.domain.entities.document import Document, DocumentStatus
from .....core.ports.output.i_document_repository import IDocumentRepository
from ..models import DocumentModel


class SqlDocumentRepository(IDocumentRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, document_id: str) -> Document | None:
        result = await self._session.execute(
            select(DocumentModel).where(
                DocumentModel.id == document_id,
                DocumentModel.deleted_at.is_(None),
            )
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_by_space(self, space_id: str) -> list[Document]:
        result = await self._session.execute(
            select(DocumentModel)
            .where(DocumentModel.space_id == space_id, DocumentModel.deleted_at.is_(None))
            .order_by(DocumentModel.created_at.desc())
        )
        return [self._to_entity(m) for m in result.scalars().all()]

    async def save(self, document: Document) -> Document:
        existing = await self._session.get(DocumentModel, document.id)
        if existing:
            existing.filename = document.filename
            existing.content_type = document.content_type
            existing.status = document.status.value
            existing.chunk_count = document.chunk_count
            existing.error_message = document.error_message
        else:
            self._session.add(self._to_model(document))
        await self._session.flush()
        return document

    async def delete(self, document_id: str) -> None:
        await self._session.execute(
            update(DocumentModel)
            .where(DocumentModel.id == document_id)
            .values(deleted_at=datetime.utcnow())
        )

    def _to_entity(self, model: DocumentModel) -> Document:
        return Document(
            id=model.id,
            space_id=model.space_id,
            filename=model.filename,
            content_type=model.content_type,
            status=DocumentStatus(model.status),
            chunk_count=model.chunk_count,
            error_message=model.error_message,
            created_at=model.created_at,
            updated_at=model.updated_at,
            deleted_at=model.deleted_at,
        )

    def _to_model(self, document: Document) -> DocumentModel:
        return DocumentModel(
            id=document.id,
            space_id=document.space_id,
            filename=document.filename,
            content_type=document.content_type,
            status=document.status.value,
            chunk_count=document.chunk_count,
            error_message=document.error_message,
        )
