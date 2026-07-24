import os
import json
import uuid
import shutil
import hashlib
import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends, Request
from fastapi.responses import StreamingResponse

# Lazy loaded document libraries
_doc_libs_cache = None

def get_document_libraries():
    global _doc_libs_cache
    if _doc_libs_cache is None:
        import fitz  # PyMuPDF
        import docx
        import pptx
        _doc_libs_cache = (fitz, docx, pptx)
    return _doc_libs_cache

from sse_starlette.sse import EventSourceResponse
from app.core.rate_limit import limiter
from app.core.dependencies import get_current_user
from app.models.user import User

from app.ai.gateway import gateway
from app.ai.key_manager import key_manager
from app.ai.groq_provider import GroqProvider
from app.services.document_indexer import DocumentIndexer
from app.schemas.document import (
    DocumentAnalyzeRequest,
    DocumentGenerateRequest,
    DocumentExplainRequest,
    DocumentChatRequest,
    DocumentSummaryRequest,
    DocumentActionResponse,
    DocumentUploadResponse,
)

import time
import logging
import traceback
logger = logging.getLogger(__name__)

router = APIRouter()

DOCS_DIR = os.path.join(os.getcwd(), "data", "documents")
os.makedirs(DOCS_DIR, exist_ok=True)

CACHE_DIR = os.path.join(DOCS_DIR, "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

def extract_text(file_path: str, filename: str) -> str:
    logger.info(f"Text extraction start for: {filename}")
    start_time = time.time()
    ext = filename.split('.')[-1].lower()
    text = ""
    try:
        fitz, docx, pptx = get_document_libraries()
        if ext == "pdf":
            doc = fitz.open(file_path)
            for page in doc:
                text += page.get_text() + "\n\n"
        elif ext in ("docx", "doc"):
            doc = docx.Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])
        elif ext in ("pptx", "ppt"):
            prs = pptx.Presentation(file_path)
            for slide in prs.slides:
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        text += shape.text + "\n"
        else:
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse document: {str(e)}")
    
    elapsed = time.time() - start_time
    logger.info(f"Text extraction complete in {elapsed:.2f}s")
    if elapsed > 2.0:
        logger.warning(f"WARNING: Text extraction stage took {elapsed:.2f}s, exceeding 2s target")
    return text

async def _run_document_analysis(doc_id: str, filename: str, file_hash: str, user_id: str):
    logger.info(f"Starting analysis for document_id: {doc_id}")
    start_time = time.time()
    
    user_dir = os.path.join(DOCS_DIR, user_id)
    os.makedirs(user_dir, exist_ok=True)
    file_path = os.path.join(user_dir, f"{doc_id}_file")
    json_path = os.path.join(user_dir, f"{doc_id}.json")
    index_file_path = os.path.join(user_dir, f"{doc_id}_index.json")
    
    try:
        text = extract_text(file_path, filename)
        if not text.strip():
            raise ValueError("Document contains no readable text.")
            
        logger.info(f"Chapter detection start for {doc_id}")
        chapter_start = time.time()
        prompt = f"""You are an expert AI Document Analyzer and Curriculum Designer.
Analyze the following document text and extract a structured Table of Contents, comprehensive metadata, and a Knowledge Graph of key concepts.
Return ONLY valid JSON.
Format:
{{
    "title": "Document Title",
    "metadata": {{
        "subject": "e.g. Computer Science",
        "branch": "e.g. Networking",
        "difficulty": "intermediate",
        "reading_time_minutes": 30,
        "learning_objectives": ["obj1", "obj2"],
        "key_concepts": ["concept1", "concept2"],
        "prerequisites": ["prereq1"],
        "key_definitions": ["def1", "def2"]
    }},
    "knowledge_graph": {{
        "nodes": [{{"id": "concept1", "label": "Concept 1", "type": "Concept"}}],
        "edges": [{{"source": "concept1", "target": "concept2", "relation": "depends on"}}]
    }},
    "chapters": [
        {{
            "title": "Chapter 1",
            "sections": [
                {{
                    "title": "Section 1.1",
                    "headings": ["Heading 1"]
                }}
            ]
        }}
    ]
}}

Document Text (truncated):
{text[:15000]}
"""
        provider = GroqProvider(key_manager)
        response = await provider.complete(
            type("CompletionRequest", (object,), {
                "model": "llama-3.1-8b-instant",  # Speed target: 8B is <2s
                "messages": [{"role": "user", "content": prompt}],
                "to_dict": lambda s: {"model": s.model, "messages": s.messages, "response_format": {"type": "json_object"}}
            })()
        )
        parsed = json.loads(response.content)
        outline = {"title": parsed.get("title", filename), "chapters": parsed.get("chapters", [])}
        metadata = parsed.get("metadata", {"subject": "General", "difficulty": "intermediate"})
        knowledge_graph = parsed.get("knowledge_graph", {"nodes": [], "edges": []})
        
        chapter_elapsed = time.time() - chapter_start
        logger.info(f"Chapter detection completed in {chapter_elapsed:.2f}s for {doc_id}. Found {len(outline.get('chapters', []))} chapters.")
        if chapter_elapsed > 2.0:
            logger.warning(f"WARNING: Chapter detection stage took {chapter_elapsed:.2f}s, exceeding 2s target")
            
        logger.info(f"Index creation start for {doc_id}")
        index_start = time.time()
        indexer = DocumentIndexer()
        chunks = indexer.index(text, outline)
        indexer.set_metadata(doc_id, metadata, knowledge_graph)
        indexer.save_state(index_file_path)
        index_elapsed = time.time() - index_start
        logger.info(f"Index creation completed in {index_elapsed:.2f}s for {doc_id}. Chunk count: {len(chunks)}")
        if index_elapsed > 2.0:
            logger.warning(f"WARNING: Index creation stage took {index_elapsed:.2f}s, exceeding 2s target")
            
        doc_data = {
            "id": doc_id,
            "filename": filename,
            "status": "ready",
            "file_hash": file_hash,
            "outline": outline,
            "metadata": metadata,
            "knowledge_graph": knowledge_graph,
            "full_text": text,
            "chunks": chunks
        }
        
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(doc_data, f)
            
        # Cache globally
        cache_json_path = os.path.join(CACHE_DIR, f"{file_hash}.json")
        with open(cache_json_path, "w", encoding="utf-8") as f:
            json.dump(doc_data, f)
        cache_index_path = os.path.join(CACHE_DIR, f"{file_hash}_index.json")
        shutil.copyfile(index_file_path, cache_index_path)
        
        total_analysis_elapsed = time.time() - start_time
        logger.info(f"Total analysis completed in {total_analysis_elapsed:.2f}s for {doc_id}")
        if total_analysis_elapsed > 2.0:
            # We don't warning log this because first LLM call might take slightly over 2s in cold starts, but chapter_elapsed tracks Groq specific time.
            pass
        return doc_data
        
    except Exception as e:
        logger.error(f"Error in document analysis for {doc_id}: {e}\n{traceback.format_exc()}")
        try:
            doc_data = {
                "id": doc_id,
                "filename": filename,
                "status": "failed",
                "file_hash": file_hash,
                "error": str(e),
                "outline": {"title": filename, "chapters": []},
                "metadata": {"subject": "General", "difficulty": "intermediate"},
                "knowledge_graph": {"nodes": [], "edges": []},
                "full_text": "",
                "chunks": []
            }
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(doc_data, f)
        except Exception:
            pass
        raise

from app.core.dependencies import get_current_user
from app.models.user import User

@router.get("/list")
async def list_documents(current_user: User = Depends(get_current_user)):
    user_dir = os.path.join(DOCS_DIR, current_user.id)
    if not os.path.exists(user_dir):
        return {"documents": []}
        
    docs = []
    for f in os.listdir(user_dir):
        if f.endswith(".json") and not f.endswith("_index.json") and f != "cache":
            try:
                with open(os.path.join(user_dir, f), "r", encoding="utf-8") as file:
                    data = json.load(file)
                    docs.append({
                        "document_id": data.get("id"),
                        "filename": data.get("filename"),
                        "title": data.get("outline", {}).get("title", data.get("filename")),
                        "status": data.get("status", "ready"),
                        "outline": {"title": data.get("outline", {}).get("title", data.get("filename")), "chapters": []}
                    })
            except:
                pass
    return {"documents": docs}

@router.get("/{document_id}")
async def get_document(document_id: str, current_user: User = Depends(get_current_user)):
    user_dir = os.path.join(DOCS_DIR, current_user.id)
    file_path = os.path.join(user_dir, f"{document_id}.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Document not found")
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

@router.delete("/{document_id}")
async def delete_document(document_id: str, current_user: User = Depends(get_current_user)):
    user_dir = os.path.join(DOCS_DIR, current_user.id)
    for ext in [".json", "_index.json", "_file"]:
        path = os.path.join(user_dir, f"{document_id}{ext}")
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass
    return {"status": "deleted"}

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(background_tasks: BackgroundTasks, file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    logger.info("Upload start")
    start_time = time.time()
    
    ALLOWED_MIME_TYPES = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain"
    }
    
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, DOCX, PPTX, and TXT are allowed.")
        
    doc_id = str(uuid.uuid4())
    user_dir = os.path.join(DOCS_DIR, current_user.id)
    os.makedirs(user_dir, exist_ok=True)
    temp_file_path = os.path.join(user_dir, f"{doc_id}_file")
    
    # Read bytes to compute hash
    file_bytes = await file.read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    
    cache_json_path = os.path.join(CACHE_DIR, f"{file_hash}.json")
    cache_index_path = os.path.join(CACHE_DIR, f"{file_hash}_index.json")
    
    if os.path.exists(cache_json_path) and os.path.exists(cache_index_path):
        logger.info("Cache hit: reusing previously parsed document analysis")
        with open(cache_json_path, "r", encoding="utf-8") as f:
            cached_data = json.load(f)
            
        cached_data["id"] = doc_id
        with open(os.path.join(user_dir, f"{doc_id}.json"), "w", encoding="utf-8") as f:
            json.dump(cached_data, f)
            
        shutil.copyfile(cache_index_path, os.path.join(user_dir, f"{doc_id}_index.json"))
        # Save dummy empty file for delete/list requirements
        with open(temp_file_path, "wb") as f:
            f.write(b"")
            
        upload_elapsed = time.time() - start_time
        logger.info(f"Upload finish (cached recovery) in {upload_elapsed:.2f}s")
        pages_estimate = max(1, len(cached_data.get("full_text", "")) // 2000)
        return DocumentUploadResponse(
            document_id=doc_id,
            filename=file.filename,
            pages=pages_estimate,
            status="uploaded"
        )
        
    # Write actual file contents
    with open(temp_file_path, "wb") as f:
        f.write(file_bytes)
        
    # Initialize placeholder json
    doc_data = {
        "id": doc_id,
        "filename": file.filename,
        "status": "processing",
        "file_hash": file_hash,
        "outline": {"title": file.filename, "chapters": []},
        "metadata": {"subject": "General", "difficulty": "intermediate"},
        "knowledge_graph": {"nodes": [], "edges": []},
        "full_text": "",
        "chunks": []
    }
    with open(os.path.join(user_dir, f"{doc_id}.json"), "w", encoding="utf-8") as f:
        json.dump(doc_data, f)
        
    # Trigger background parsing task
    background_tasks.add_task(_run_document_analysis, doc_id, file.filename, file_hash, current_user.id)
    
    upload_elapsed = time.time() - start_time
    logger.info(f"Upload finish (background task triggered) in {upload_elapsed:.2f}s")
    if upload_elapsed > 2.0:
        logger.warning(f"WARNING: Upload stage took {upload_elapsed:.2f}s, exceeding 2s target")
        
    # Estimate pages based on upload file size as a proxy
    pages_estimate = max(1, len(file_bytes) // 50000)
    
    return DocumentUploadResponse(
        document_id=doc_id,
        filename=file.filename,
        pages=pages_estimate,
        status="uploaded"
    )

@router.post("/{document_id}/analyze")
async def analyze_document(document_id: str, req: DocumentAnalyzeRequest, current_user: User = Depends(get_current_user)):
    logger.info(f"Analyzing document: {document_id}")
    start_time = time.time()
    
    doc_id = document_id
    user_dir = os.path.join(DOCS_DIR, current_user.id)
    file_path = os.path.join(user_dir, f"{doc_id}.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Poll background task state
    wait_start = time.time()
    status = "processing"
    doc_data = {}
    
    while time.time() - wait_start < 45.0:  # Timeout after 45s
        with open(file_path, "r", encoding="utf-8") as f:
            doc_data = json.load(f)
        status = doc_data.get("status", "processing")
        if status in ("ready", "failed"):
            break
        await asyncio.sleep(0.5)
        
    if status == "failed":
        raise HTTPException(status_code=500, detail=f"Document analysis failed in background task: {doc_data.get('error')}")
    elif status == "processing":
        logger.warning(f"Background task timed out for {doc_id}. Running synchronous fallback analysis...")
        doc_data = await _run_document_analysis(doc_id, doc_data["filename"], doc_data["file_hash"])
        
    outline = doc_data["outline"]
    metadata = doc_data["metadata"]
    chunks = doc_data.get("chunks", [])
    
    elapsed = time.time() - start_time
    logger.info(f"Analysis complete for {doc_id} in {elapsed:.2f}s")
    
    return {
        "id": doc_id,
        "document_id": doc_id,
        "filename": doc_data["filename"],
        "outline": outline,
        "metadata": metadata,
        "chunks_count": len(chunks)
    }

@router.post("/{document_id}/generate")
@limiter.limit("10/minute")
async def generate_lesson(request: Request, document_id: str, body: DocumentGenerateRequest, current_user: User = Depends(get_current_user)):
    logger.info(f"Generating lesson for document {document_id}, chapter: {body.chapter_id}")
    start_time = time.time()
    
    user_dir = os.path.join(DOCS_DIR, current_user.id)
    file_path = os.path.join(user_dir, f"{document_id}.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Document not found")
        
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    subject = data.get("metadata", {}).get("subject", data["filename"])
    topic = body.chapter_id
    
    logger.info(f"Retrieving relevant chunks for topic: {topic}")
    indexer = DocumentIndexer()
    index_path = os.path.join(user_dir, f"{document_id}_index.json")
    
    context = ""
    if os.path.exists(index_path) and indexer.load_state(index_path):
        relevant_chunks = indexer.search(topic, top_k=3)
        if relevant_chunks:
            context = "\n\n".join([c["content"] for c in relevant_chunks])
            logger.info(f"Retrieved {len(relevant_chunks)} chunks for context ({len(context)} characters)")
        else:
            context = data["full_text"][:5000]
            logger.warning("No relevant chunks found, using document start.")
    else:
        context = data["full_text"][:5000]
        logger.warning("Index not found, using document start.")

    async def event_generator():
        logger.info(f"Starting generator stream for {topic} in {time.time() - start_time:.2f}s")
        first_token_sent = False
        stream_start_time = time.time()
        
        async for event in gateway.generate(
            subject=subject,
            topic=topic,
            output_language="English",
            context=context,
            is_document=True,
        ):
            if not first_token_sent and event.get("type") == "section_chunk" and event.get("content"):
                first_token_sent = True
                first_token_lat = time.time() - stream_start_time
                logger.info(f"First token latency: {first_token_lat:.2f}s")
                if first_token_lat > 2.0:
                    logger.warning(f"WARNING: First token latency took {first_token_lat:.2f}s, exceeding 2s target")
            yield {"event": "message", "data": json.dumps(event)}
            
        total_elapsed = time.time() - start_time
        logger.info(f"Total generation time: {total_elapsed:.2f}s")

    return EventSourceResponse(event_generator())

@router.post("/{document_id}/explain", response_model=DocumentActionResponse)
@limiter.limit("20/minute")
async def document_explain(request: Request, document_id: str, body: DocumentExplainRequest, current_user: User = Depends(get_current_user)):
    user_dir = os.path.join(DOCS_DIR, current_user.id)
    file_path = os.path.join(user_dir, f"{document_id}.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Document not found")
        
    provider = GroqProvider(key_manager)
    prompt = f"Explain the following text clearly and concisely:\n\n{body.selection}"
    
    try:
        response = await provider.complete(
            type("CompletionRequest", (object,), {"model": "llama-3.3-70b-versatile", "messages": [{"role": "user", "content": prompt}], "to_dict": lambda s: {"model": s.model, "messages": s.messages}})()
        )
        return DocumentActionResponse(result=response.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{document_id}/chat", response_model=DocumentActionResponse)
@limiter.limit("20/minute")
async def document_chat(request: Request, document_id: str, body: DocumentChatRequest, current_user: User = Depends(get_current_user)):
    user_dir = os.path.join(DOCS_DIR, current_user.id)
    file_path = os.path.join(user_dir, f"{document_id}.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Document not found")
        
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    if body.context:
        context = body.context
    else:
        indexer = DocumentIndexer()
        index_path = os.path.join(user_dir, f"{document_id}_index.json")
        if os.path.exists(index_path) and indexer.load_state(index_path):
            relevant_chunks = indexer.search(body.query, top_k=3)
            context = "\n\n".join([c["content"] for c in relevant_chunks]) if relevant_chunks else data["full_text"][:20000]
        else:
            # Fallback
            chunks = indexer.index(data["full_text"], data.get("outline", {}))
            relevant_chunks = indexer.search(body.query, top_k=3)
            context = "\n\n".join([c["content"] for c in relevant_chunks]) if relevant_chunks else data["full_text"][:20000]
    
    prompt = f"""Answer the user's question based strictly on the provided document context. If the answer is not in the context, say so.

Context:
{context}

Question: {body.query}"""

    provider = GroqProvider(key_manager)
    try:
        response = await provider.complete(
            type("CompletionRequest", (object,), {"model": "llama-3.3-70b-versatile", "messages": [{"role": "user", "content": prompt}], "to_dict": lambda s: {"model": s.model, "messages": s.messages}})()
        )
        return DocumentActionResponse(result=response.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{document_id}/summary", response_model=DocumentActionResponse)
@limiter.limit("10/minute")
async def document_summary(request: Request, document_id: str, body: DocumentSummaryRequest, current_user: User = Depends(get_current_user)):
    start_time = time.time()
    logger.info(f"Starting summary generation for document_id: {document_id}")
    try:
        # Step 1: Validate Document Exists
        try:
            user_dir = os.path.join(DOCS_DIR, current_user.id)
            file_path = os.path.join(user_dir, f"{document_id}.json")
            logger.info(f"File path: {file_path}")
            if not os.path.exists(file_path):
                raise ValueError(f"Document not found at {file_path}")
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except ValueError as e:
            raise
        except Exception as e:
            raise ValueError(f"Failed to read document JSON: {e}")

        # Logging status
        extraction_status = data.get("status", "unknown")
        logger.info(f"Extraction status: {extraction_status}")

        # Step 2: Validate extracted text is not empty
        context = data.get("full_text", "")
        logger.info(f"Extracted character count: {len(context)}")
        if not context or not context.strip():
            raise ValueError("Extracted text is empty")
        
        # Step 3: Validate chunks exist
        document_chunks = data.get("chunks", [])
        chunk_count = len(document_chunks)
        logger.info(f"Chunk count: {chunk_count}")
        if not document_chunks or chunk_count == 0:
            raise ValueError("No chunks exist for this document")

        chapters = data.get("outline", {}).get("chapters", [])
        if body.chapter_id:
            found = False
            for chapter in chapters:
                if chapter.get("title") == body.chapter_id:
                    context = chapter.get("content", "")
                    found = True
                    break
            if not found:
                raise ValueError("Chapter not found")
        
        # Step 4: Validate prompt is not empty
        prompt = f"Summarize the following document content into a concise set of key takeaways:\\n\\n{context[:25000]}"
        logger.info(f"Prompt length: {len(prompt)}")
        if not prompt or not prompt.strip():
            raise ValueError("Prompt is empty")
        
        # Step 5: Validate model exists
        model = "llama-3.3-70b-versatile"
        logger.info(f"Selected model: {model}")
        if not model:
            raise ValueError("Model not found")
            
        # Step 6: Validate API key exists
        if key_manager.get_healthy_count() == 0:
            raise ValueError("No healthy API key available")
        
        api_key = key_manager.get_available_key(model)
        if not api_key:
            raise ValueError("API key exists but none available for model")
        
        masked_key = f"{api_key.key[:5]}...{api_key.key[-4:]}" if len(api_key.key) > 9 else "***"
        logger.info(f"API key: {masked_key}")

        provider = GroqProvider(key_manager)
        completion_req = type("CompletionRequest", (object,), {"model": model, "messages": [{"role": "user", "content": prompt}], "to_dict": lambda s: {"model": s.model, "messages": s.messages}})()
        
        # Log Groq request
        groq_req_dict = completion_req.to_dict()
        logger.info(f"Groq request: {json.dumps(groq_req_dict)}")
        
        # Step 7: Validate Groq response is valid
        try:
            response = await provider.complete(completion_req)
        except Exception as e:
            raise ValueError(f"Failed to generate summary via Groq: {str(e)}")
            
        if not response or not hasattr(response, 'content') or not response.content:
            raise ValueError("Invalid or empty response from Groq")
            
        # Log Groq response
        logger.info(f"Groq response: {response.content}")
        
        total_time = time.time() - start_time
        logger.info(f"Total processing time: {total_time:.2f}s")
        
        return DocumentActionResponse(result=response.content)
        
    except ValueError as ve:
        logger.error(f"Validation failed: {str(ve)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Unexpected error in document_summary: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=f"An unexpected error occurred during summary generation: {str(e)}")


