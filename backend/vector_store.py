import json
import logging

import asyncpg
import numpy as np
from pgvector.asyncpg import register_vector

from models import ProductData, SearchResult

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 3072


class PGVectorStore:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    @classmethod
    async def create(cls, dsn: str) -> "PGVectorStore":
        pool = await asyncpg.create_pool(dsn=dsn, min_size=2, max_size=10, init=register_vector)
        store = cls(pool)
        await store._init_schema()
        return store

    async def _init_schema(self) -> None:
        async with self.pool.acquire() as conn:
            await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            await conn.execute(f"""
                CREATE TABLE IF NOT EXISTS products (
                    id          TEXT PRIMARY KEY,
                    title       TEXT NOT NULL,
                    description TEXT NOT NULL,
                    characteristics JSONB DEFAULT '[]',
                    price       FLOAT NOT NULL,
                    image_base64 TEXT DEFAULT '',
                    created_at  TEXT,
                    embedding   VECTOR({EMBEDDING_DIM})
                );
                CREATE INDEX IF NOT EXISTS idx_products_emb
                    ON products USING hnsw (embedding vector_cosine_ops);
            """)
        logger.info("PGVectorStore schema ready.")

    @property
    async def count(self) -> int:
        async with self.pool.acquire() as conn:
            return await conn.fetchval("SELECT COUNT(*) FROM products")

    async def add(self, product: ProductData, embedding: np.ndarray) -> None:
        async with self.pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO products (id, title, description, characteristics, price, image_base64, created_at, embedding)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING""",
                product.id, product.title, product.description,
                json.dumps(product.characteristics), product.price,
                product.image_base64, product.created_at,
                embedding.tolist(),
            )

    async def update(self, product_id: str, product: ProductData, embedding: np.ndarray) -> bool:
        async with self.pool.acquire() as conn:
            result = await conn.execute(
                """UPDATE products SET title=$2, description=$3, characteristics=$4,
                   price=$5, image_base64=$6, embedding=$7 WHERE id=$1""",
                product_id, product.title, product.description,
                json.dumps(product.characteristics), product.price,
                product.image_base64, embedding.tolist(),
            )
            return result != "UPDATE 0"

    async def delete(self, product_id: str) -> bool:
        async with self.pool.acquire() as conn:
            result = await conn.execute("DELETE FROM products WHERE id=$1", product_id)
            return result != "DELETE 0"

    async def list_all(self) -> list[ProductData]:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id,title,description,characteristics,price,image_base64,created_at FROM products ORDER BY created_at DESC"
            )
        return [_row_to_product(r) for r in rows]

    async def search(self, query_embedding: np.ndarray, top_k: int = 5) -> list[SearchResult]:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                f"""SELECT id,title,description,characteristics,price,image_base64,created_at,
                           1 - (embedding <=> $1::vector) AS score
                    FROM products
                    ORDER BY embedding <=> $1::vector
                    LIMIT $2""",
                query_embedding.tolist(), top_k,
            )
        return [
            SearchResult(product=_row_to_product(r), similarity_score=max(0.0, min(1.0, float(r["score"]))))
            for r in rows
        ]


def _row_to_product(row) -> ProductData:
    chars = row["characteristics"]
    if isinstance(chars, str):
        chars = json.loads(chars)
    return ProductData(
        id=row["id"],
        title=row["title"],
        description=row["description"],
        characteristics=chars,
        price=row["price"],
        image_base64=row["image_base64"] or "",
        created_at=row["created_at"] or "",
    )
