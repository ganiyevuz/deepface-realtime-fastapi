import sqlite3
import json
import numpy as np
from typing import Optional, Dict, Any, List, Tuple, Union
from deepface import DeepFace

def sanitize_numpy(obj: Any) -> Any:
    """Convert numpy types to Python native types for JSON serialization."""
    if isinstance(obj, dict):
        return {k: sanitize_numpy(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_numpy(i) for i in obj]
    elif isinstance(obj, (np.float32, np.float64, np.int32, np.int64)):
        return float(obj) if isinstance(obj, (np.float32, np.float64)) else int(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

class FaceDB:
    def __init__(self, db_path: str = 'faces.db'):
        self.db_path = db_path
        self.init_db()

    def init_db(self):
        """Initialize the database with required tables."""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS faces
                    (id INTEGER PRIMARY KEY,
                     name TEXT NOT NULL,
                     embedding TEXT NOT NULL,
                     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
        conn.commit()
        conn.close()

    @staticmethod
    def embedding_to_str(embedding: np.ndarray) -> str:
        """Convert numpy array embedding to string for storage."""
        return json.dumps(embedding.tolist())

    @staticmethod
    def str_to_embedding(embedding_str: str) -> np.ndarray:
        """Convert stored string back to numpy array embedding."""
        return np.array(json.loads(embedding_str))

    def add_face(self, name: str, embedding: np.ndarray) -> bool:
        """Add a new face to the database."""
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            c.execute('INSERT INTO faces (name, embedding) VALUES (?, ?)',
                     (name, self.embedding_to_str(embedding)))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error adding face: {e}")
            return False

    def get_all_faces(self) -> List[Tuple[str, np.ndarray]]:
        """Retrieve all faces from the database."""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('SELECT name, embedding FROM faces')
        faces = [(name, self.str_to_embedding(embedding_str)) 
                for name, embedding_str in c.fetchall()]
        conn.close()
        return faces

    def find_match(self, embedding: np.ndarray, threshold: float = 0.6) -> Optional[Dict[str, Any]]:
        """Find the best matching face in the database."""
        stored_faces = self.get_all_faces()
        
        if not stored_faces:
            return None
        
        best_match = None
        best_distance = float('-inf')  # Changed from inf to -inf since we want maximum similarity
        
        for name, stored_embedding in stored_faces:
            # Calculate cosine similarity
            similarity = np.dot(embedding, stored_embedding) / (
                np.linalg.norm(embedding) * np.linalg.norm(stored_embedding)
            )
            
            if similarity > best_distance:
                best_distance = similarity
                best_match = {
                    'name': name,
                    'confidence': float(similarity)  # Convert to Python float
                }
        
        if best_match and best_match['confidence'] >= threshold:
            return sanitize_numpy(best_match)  # Ensure all values are JSON serializable
        return None

    def get_face_embedding(self, img: np.ndarray) -> Optional[np.ndarray]:
        """Extract face embedding from image data."""
        try:
            # First verify that a face is detected
            face_objs = DeepFace.extract_faces(
                img_path=img,
                detector_backend='retinaface',
                enforce_detection=True,
                align=True
            )
            
            if not face_objs or len(face_objs) == 0:
                print("No face detected in image")
                return None
            
            # Get the aligned face image
            aligned_face = face_objs[0]['face']
            
            # Get embedding for the aligned face
            result = DeepFace.represent(
                img_path=aligned_face,
                model_name='VGG-Face',
                detector_backend='retinaface',
                enforce_detection=False  # We already detected the face
            )
            
            if result and len(result) > 0:
                return np.array(result[0]['embedding'])
            else:
                print("Failed to extract face embedding")
                return None
            
        except Exception as e:
            print(f"Error extracting face embedding: {str(e)}")
            return None

    def register_face(self, name: str, img: np.ndarray) -> Dict[str, Any]:
        """Register a new face in the database."""
        try:
            # First check if a face is detected
            face_objs = DeepFace.extract_faces(
                img_path=img,
                detector_backend='retinaface',
                enforce_detection=True,
                align=True
            )
            
            if not face_objs or len(face_objs) == 0:
                return {
                    "status": "error",
                    "message": "Yuz aniqlanmadi. Iltimos, yuzingizni to'g'ri joylashtiring."
                }
            
            # Get embedding
            embedding = self.get_face_embedding(img)
            if embedding is None:
                return {
                    "status": "error",
                    "message": "Yuz ma'lumotlarini olishda xatolik yuz berdi. Qaytadan urinib ko'ring."
                }
            
            # Check if face already exists
            existing_match = self.find_match(embedding, threshold=0.8)
            if existing_match:
                return {
                    "status": "error",
                    "message": f"Bu yuz allaqachon ro'yxatdan o'tkazilgan: {existing_match['name']}"
                }
            
            # Add new face
            if self.add_face(name, embedding):
                return {
                    "status": "success",
                    "message": f"{name} uchun yuz muvaffaqiyatli ro'yxatdan o'tkazildi"
                }
            return {
                "status": "error",
                "message": "Yuzni ro'yxatdan o'tkazishda xatolik yuz berdi"
            }
        except Exception as e:
            print(f"Registration error: {str(e)}")
            return {
                "status": "error",
                "message": f"Xatolik yuz berdi: {str(e)}"
            }

# Create a global instance
face_db = FaceDB() 