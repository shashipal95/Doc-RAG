"""
Vector Store Service
Pinecone operations for document storage and retrieval
"""
from typing import List, Dict
from pinecone import Pinecone, ServerlessSpec

from app.core.config import get_settings

settings = get_settings()

# Initialize Pinecone
pc = Pinecone(api_key=settings.PINECONE_API_KEY)


def setup_index():
    """Create or connect to Pinecone index"""
    existing = [idx["name"] for idx in pc.list_indexes()]
    
    if settings.PINECONE_INDEX_NAME not in existing:
        pc.create_index(
            name=settings.PINECONE_INDEX_NAME,
            dimension=settings.PINECONE_DIMENSION,
            metric=settings.PINECONE_METRIC,
            spec=ServerlessSpec(
                cloud=settings.PINECONE_CLOUD,
                region=settings.PINECONE_REGION
            ),
        )
    
    return pc.Index(settings.PINECONE_INDEX_NAME)


# Global index instance
index = setup_index()


def upsert_vectors(
    vectors: List[Dict],
    namespace: str
) -> int:
    """
    Insert or update vectors in Pinecone
    
    Args:
        vectors: List of vector dicts with id, values, metadata
        namespace: User namespace for data isolation
        
    Returns:
        Number of vectors upserted
    """
    index.upsert(vectors=vectors, namespace=namespace)
    return len(vectors)


def query_vectors(
    query_vector: List[float],
    namespace: str,
    top_k: int = 3
) -> List[Dict]:
    """
    Query similar vectors from Pinecone
    
    Args:
        query_vector: Query embedding vector
        namespace: User namespace to query
        top_k: Number of results to return
        
    Returns:
        List of matching vectors with metadata
    """
    results = index.query(
        vector=query_vector,
        top_k=top_k,
        include_metadata=True,
        namespace=namespace,
    )
    
    return results.get("matches", [])


def delete_all_user_vectors(namespace: str):
    """Delete all vectors for a user namespace"""
    index.delete(delete_all=True, namespace=namespace)


def get_index_stats():
    """Get Pinecone index statistics"""
    return index.describe_index_stats()
