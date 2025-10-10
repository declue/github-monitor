from typing import List, Optional, Any, Dict
from pydantic import BaseModel


class RateLimitInfo(BaseModel):
    limit: int
    remaining: int
    reset: int
    used: int


class TreeNode(BaseModel):
    id: str
    name: str
    type: str
    status: Optional[str] = None
    url: Optional[str] = None
    children: List['TreeNode'] = []
    metadata: Dict[str, Any] = {}
    hasChildren: bool = False  # Indicates if node has children to load
    isLoaded: bool = False  # Indicates if children are already loaded


TreeNode.model_rebuild()
