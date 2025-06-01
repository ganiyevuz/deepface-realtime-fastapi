from fastapi import FastAPI, Request, HTTPException, UploadFile, File, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import cv2
import numpy as np
from deepface import DeepFace
from db import face_db, sanitize_numpy
import uvicorn
from datetime import datetime, timedelta
from collections import defaultdict
import time
import os
import sys

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Rate limiting setup
RATE_LIMIT_WINDOW = 1  # 1 second window
MAX_REQUESTS_PER_WINDOW = 5  # Maximum 56 requests per second
request_history = defaultdict(list)

def check_rate_limit(client_id: str) -> bool:
    """Check if the client has exceeded the rate limit."""
    now = time.time()
    # Remove old requests outside the window
    request_history[client_id] = [t for t in request_history[client_id] 
                                if now - t < RATE_LIMIT_WINDOW]
    
    if len(request_history[client_id]) >= MAX_REQUESTS_PER_WINDOW:
        return False
    
    request_history[client_id].append(now)
    return True

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_id = request.client.host
    if not check_rate_limit(client_id):
        return JSONResponse(
            status_code=429,
            content={"error": "Too many requests. Please wait a moment."}
        )
    return await call_next(request)


class ImageData(BaseModel):
    image: str


@app.get("/", response_class=HTMLResponse)
async def serve_frontend(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

class ImageData(BaseModel):
    image: str

@app.post("/analyze")
async def analyze_face(image: UploadFile = File(...)):
    try:
        # Read image file
        start_time = time.time()
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

        # Analyze face attributes
        result = DeepFace.analyze(
            img_path=img,
            actions=['age', 'gender', 'emotion', 'race'],
            enforce_detection=True,
            detector_backend='retinaface'
        )

        # Get face embedding for matching
        embedding = face_db.get_face_embedding(img)
        if embedding is not None:
            # Find matching face
            match = face_db.find_match(embedding)
            if match:
                result[0]['match'] = match
        
        # Ensure all numpy values are converted to Python native types
        end_time = time.time()
        return sanitize_numpy(result[0])
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.post("/register")
async def register_face(name: str = Form(...), image: UploadFile = File(...)):
    try:
        # Validate name
        name = name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Ism bo'sh bo'lmasligi kerak")
        
        # Read and validate image
        contents = await image.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Rasm yuklanmadi")
            
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Noto'g'ri rasm formati")
            
        # Validate image size
        height, width = img.shape[:2]
        if width < 100 or height < 100:
            raise HTTPException(status_code=400, detail="Rasm hajmi juda kichik")
            
        # Try to detect face first
        try:
            face_objs = DeepFace.extract_faces(
                img_path=img,
                detector_backend='retinaface',
                enforce_detection=True,
                align=True
            )
            if not face_objs or len(face_objs) == 0:
                raise HTTPException(
                    status_code=400, 
                    detail="Yuz aniqlanmadi. Iltimos, yuzingizni to'g'ri joylashtiring."
                )
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Yuz aniqlashda xatolik: {str(e)}"
            )

        # Register face using the database module
        result = face_db.register_face(name, img)
        
        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["message"])
            
        return JSONResponse(
            status_code=200,
            content=result
        )
        
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": f"Ro'yxatdan o'tkazishda xatolik yuz berdi: {str(e)}"
            }
        )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
