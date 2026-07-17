import json
import math
import re
from collections import defaultdict
from typing import List, Dict, Any, Tuple

class SimpleTFIDF:
    def __init__(self):
        self.doc_freqs = defaultdict(int)
        self.doc_count = 0
        self.vocab = set()
        self.idf = {}
        
    def _tokenize(self, text: str) -> List[str]:
        return [w.lower() for w in re.findall(r'\b\w+\b', text)]
        
    def fit(self, documents: List[str]):
        self.doc_count = len(documents)
        for doc in documents:
            words = set(self._tokenize(doc))
            for w in words:
                self.doc_freqs[w] += 1
                self.vocab.add(w)
                
        for w in self.vocab:
            self.idf[w] = math.log((self.doc_count + 1) / (self.doc_freqs[w] + 1)) + 1
            
    def transform_single(self, text: str) -> Dict[str, float]:
        words = self._tokenize(text)
        tf = defaultdict(int)
        for w in words:
            tf[w] += 1
            
        vec = {}
        for w, count in tf.items():
            if w in self.idf:
                vec[w] = count * self.idf[w]
        return vec
        
    def cosine_similarity(self, vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
        intersection = set(vec1.keys()) & set(vec2.keys())
        dot_product = sum(vec1[w] * vec2[w] for w in intersection)
        
        mag1 = math.sqrt(sum(v**2 for v in vec1.values()))
        mag2 = math.sqrt(sum(v**2 for v in vec2.values()))
        
        if mag1 == 0 or mag2 == 0:
            return 0.0
        return dot_product / (mag1 * mag2)


class DocumentIndexer:
    def __init__(self):
        self.vectorizer = SimpleTFIDF()
        self.chunks: List[Dict[str, Any]] = []
        self.chunk_vectors: List[Dict[str, float]] = []
        self.knowledge_graph: Dict[str, Any] = {"nodes": [], "edges": []}
        self.analysis_metadata: Dict[str, Any] = {}
        self.doc_id: str = ""

    def save_state(self, file_path: str):
        """Cache the entire indexed state to disk."""
        import json
        state = {
            "chunks": self.chunks,
            "chunk_vectors": self.chunk_vectors,
            "knowledge_graph": self.knowledge_graph,
            "analysis_metadata": self.analysis_metadata,
            "vocab": list(self.vectorizer.vocab),
            "idf": self.vectorizer.idf,
            "doc_count": self.vectorizer.doc_count,
            "doc_freqs": dict(self.vectorizer.doc_freqs),
            "doc_id": self.doc_id
        }
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(state, f)

    def load_state(self, file_path: str) -> bool:
        """Load cached state from disk."""
        import os, json
        if not os.path.exists(file_path):
            return False
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                state = json.load(f)
            self.chunks = state.get("chunks", [])
            self.chunk_vectors = state.get("chunk_vectors", [])
            self.knowledge_graph = state.get("knowledge_graph", {"nodes": [], "edges": []})
            self.analysis_metadata = state.get("analysis_metadata", {})
            self.doc_id = state.get("doc_id", "")
            
            self.vectorizer.vocab = set(state.get("vocab", []))
            self.vectorizer.idf = state.get("idf", {})
            self.vectorizer.doc_count = state.get("doc_count", 0)
            self.vectorizer.doc_freqs = defaultdict(int, state.get("doc_freqs", {}))
            return True
        except BaseException:
            return False

    def set_metadata(self, doc_id: str, analysis: Dict[str, Any], kg: Dict[str, Any]):
        self.doc_id = doc_id
        self.analysis_metadata = analysis
        self.knowledge_graph = kg

    def chunk_document(self, text: str, outline: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Split document into semantic chunks using sliding windows over the raw text.
        This preserves factual grounding rather than relying on LLM summaries.
        """
        chunks = []
        
        # Sliding window approach: ~1500 chars with ~200 chars overlap
        window_size = 1500
        overlap = 200
        
        # Clean up text slightly to avoid weird breaks
        clean_text = re.sub(r'\n{3,}', '\n\n', text)
        paragraphs = clean_text.split('\n\n')
        
        current_chunk_text = ""
        chunk_index = 0
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
                
            if len(current_chunk_text) + len(para) > window_size and current_chunk_text:
                chunks.append({
                    "id": f"chunk_{chunk_index}",
                    "title": f"Section {chunk_index + 1}",
                    "content": current_chunk_text.strip(),
                    "type": "text_window"
                })
                chunk_index += 1
                # Keep the last part of the current chunk for overlap
                overlap_text = current_chunk_text[-overlap:] if len(current_chunk_text) > overlap else current_chunk_text
                # Try to find a clean break (space) in the overlap
                space_idx = overlap_text.find(' ')
                if space_idx != -1:
                    overlap_text = overlap_text[space_idx:]
                current_chunk_text = overlap_text.strip() + "\n\n" + para
            else:
                current_chunk_text += para + "\n\n"
                
        # Add the last chunk
        if current_chunk_text.strip():
            chunks.append({
                "id": f"chunk_{chunk_index}",
                "title": f"Section {chunk_index + 1}",
                "content": current_chunk_text.strip(),
                "type": "text_window"
            })
            
        return chunks

    def index(self, text: str, outline: Dict[str, Any]) -> List[Dict[str, Any]]:
        self.chunks = self.chunk_document(text, outline)
        if not self.chunks:
            return []
            
        docs = [c["content"] for c in self.chunks]
        self.vectorizer.fit(docs)
        
        self.chunk_vectors = [self.vectorizer.transform_single(doc) for doc in docs]
        
        # Add basic "embedding" representation to the chunks (as tf-idf keywords)
        for i, chunk in enumerate(self.chunks):
            # top 5 keywords as a proxy for the embedding
            vec = self.chunk_vectors[i]
            top_keywords = sorted(vec.items(), key=lambda x: x[1], reverse=True)[:5]
            chunk["keywords"] = [k for k, v in top_keywords]
            
        return self.chunks

    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        if not self.chunks:
            return []
            
        query_vec = self.vectorizer.transform_single(query)
        scores = []
        for i, chunk_vec in enumerate(self.chunk_vectors):
            score = self.vectorizer.cosine_similarity(query_vec, chunk_vec)
            scores.append((score, self.chunks[i]))
            
        scores.sort(key=lambda x: x[0], reverse=True)
        return [chunk for score, chunk in scores[:top_k] if score > 0.0]

document_indexer = DocumentIndexer()
