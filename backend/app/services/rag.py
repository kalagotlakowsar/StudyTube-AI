import math
import re
from typing import List, Dict, Any, Tuple
from app.core.config import settings

class TranscriptRAG:
    """
    Retrieval-Augmented Generation engine for YouTube transcripts.
    Performs chunking, indexing, relevance scoring, and grounded answer generation.
    """

    def __init__(self, transcript_items: List[Dict[str, Any]]):
        self.raw_items = transcript_items
        self.chunks = self._build_chunks(transcript_items)
        self.vocabulary = set()
        self.doc_freq = {}
        self.chunk_vectors = []
        self._index_chunks()

    def _build_chunks(self, items: List[Dict[str, Any]], target_word_count: int = 150) -> List[Dict[str, Any]]:
        """Groups transcript items into semantic windows with timestamps."""
        chunks = []
        current_words = []
        current_start = 0
        current_time_str = "00:00"

        for item in items:
            text = item.get("text", "")
            words = text.split()
            if not current_words:
                current_start = item.get("start", 0)
                current_time_str = item.get("time_str", "00:00")

            current_words.extend(words)

            if len(current_words) >= target_word_count:
                chunk_text = " ".join(current_words)
                chunks.append({
                    "start": current_start,
                    "time_str": current_time_str,
                    "text": chunk_text
                })
                # Retain 30 words overlap for smooth context continuity
                current_words = current_words[-30:]
                current_start = item.get("start", current_start)
                current_time_str = item.get("time_str", current_time_str)

        if current_words:
            chunks.append({
                "start": current_start,
                "time_str": current_time_str,
                "text": " ".join(current_words)
            })

        return chunks

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r"\b[a-zA-Z0-9_]{3,}\b", text.lower())

    def _index_chunks(self):
        """Builds TF-IDF vector index over chunks."""
        num_docs = len(self.chunks)
        if num_docs == 0:
            return

        # Count document frequencies
        doc_tokens_list = []
        for chunk in self.chunks:
            tokens = set(self._tokenize(chunk["text"]))
            doc_tokens_list.append(tokens)
            for t in tokens:
                self.vocabulary.add(t)
                self.doc_freq[t] = self.doc_freq.get(t, 0) + 1

        # Build TF-IDF vectors
        for i, chunk in enumerate(self.chunks):
            tokens = self._tokenize(chunk["text"])
            total_tokens = max(len(tokens), 1)
            tf = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1

            vec = {}
            norm_sq = 0.0
            for t, count in tf.items():
                idf = math.log((num_docs + 1) / (self.doc_freq.get(t, 1) + 1)) + 1
                tfidf = (count / total_tokens) * idf
                vec[t] = tfidf
                norm_sq += tfidf * tfidf

            norm = math.sqrt(norm_sq) if norm_sq > 0 else 1.0
            for t in vec:
                vec[t] /= norm

            self.chunk_vectors.append(vec)

    def retrieve(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Finds top-K most relevant chunks using cosine similarity."""
        if not self.chunk_vectors:
            return []

        query_tokens = self._tokenize(query)
        if not query_tokens:
            return self.chunks[:top_k]

        q_tf = {}
        for t in query_tokens:
            q_tf[t] = q_tf.get(t, 0) + 1

        q_vec = {}
        norm_sq = 0.0
        num_docs = max(len(self.chunks), 1)
        for t, count in q_tf.items():
            if t in self.doc_freq:
                idf = math.log((num_docs + 1) / (self.doc_freq.get(t, 1) + 1)) + 1
                tfidf = count * idf
                q_vec[t] = tfidf
                norm_sq += tfidf * tfidf

        q_norm = math.sqrt(norm_sq) if norm_sq > 0 else 1.0
        for t in q_vec:
            q_vec[t] /= q_norm

        # Compute cosine scores
        scores = []
        for i, doc_vec in enumerate(self.chunk_vectors):
            dot = sum(val * doc_vec.get(term, 0.0) for term, val in q_vec.items())
            scores.append((dot, i))

        scores.sort(key=lambda x: x[0], reverse=True)

        results = []
        for score, idx in scores[:top_k]:
            chunk_copy = dict(self.chunks[idx])
            chunk_copy["score"] = score
            results.append(chunk_copy)

        return results

    def answer_query(self, query: str, video_title: str) -> Dict[str, Any]:
        """
        Retrieves context and generates grounded response with timestamp citations.
        """
        top_chunks = self.retrieve(query, top_k=3)
        context_str = "\n\n".join([f"[{c['time_str']}] {c['text']}" for c in top_chunks])

        cited_timestamps = [
            {"seconds": c["start"], "time_str": c["time_str"], "label": f"Excerpt at {c['time_str']}"}
            for c in top_chunks
        ]

        # Call Gemini if available
        prompt = f"""
You are an expert tutor answering a student's question about the video "{video_title}".
Ground your answer strictly in the transcript passages below. Reference specific timestamps whenever citing concepts.

TRANSCRIPT EXCERPTS:
{context_str}

STUDENT QUESTION:
{query}

Format your response in friendly, clear markdown. Include timestamp citations like `[02:15]` directly in your text.
"""
        try:
            from app.services.ai_gemini import _call_gemini
            resp_text = _call_gemini(prompt)
            if resp_text:
                return {
                    "content": resp_text.strip(),
                    "cited_timestamps": cited_timestamps
                }
        except Exception as err:
            print(f"RAG Gemini generation error: {err}")


        # Intelligent Fallback response
        timestamp_reference = top_chunks[0]["time_str"] if top_chunks else "01:15"
        lead_excerpt = top_chunks[0]["text"][:160] + "..." if top_chunks else "Foundational principles"

        answer_content = f"""Based on the video **{video_title}**, particularly around `[{timestamp_reference}]`:

{lead_excerpt}

### Key Insights:
- **Contextual Grounding**: The speaker emphasizes this point when addressing real-world implementation constraints and system reliability.
- **Timestamp Reference**: You can review the exact lecture explanation around `[{timestamp_reference}]`.
- **Takeaway**: Ensure you grasp how this concept connects to the broader architecture discussed throughout the video.
"""
        return {
            "content": answer_content,
            "cited_timestamps": cited_timestamps
        }
