from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import cv2
import numpy as np
import base64
from deepface import DeepFace
from db import face_db, sanitize_numpy
import uvicorn
from datetime import datetime, timedelta
from collections import defaultdict
import time

app = FastAPI()

# Rate limiting setup
RATE_LIMIT_WINDOW = 1  # 1 second window
MAX_REQUESTS_PER_WINDOW = 5  # Maximum 5 requests per second
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

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


class ImageData(BaseModel):
    image: str


@app.get("/", response_class=HTMLResponse)
async def serve_frontend(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/analyze")
async def analyze_face(request: Request):
    try:
        data = await request.json()
        image_data = data['image']
        
        # Analyze face attributes
        result = DeepFace.analyze(
            img_path=image_data,
            actions=['age', 'gender', 'emotion'],
            detector_backend='retinaface'
        )
        
        # Get face embedding for matching
        embedding = face_db.get_face_embedding(image_data)
        if embedding is not None:
            # Find matching face
            match = face_db.find_match(embedding)
            if match:
                result[0]['match'] = match
        
        # Ensure all numpy values are converted to Python native types
        return sanitize_numpy(result[0])
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.post("/register")
async def register_face(request: Request):
    try:
        data = await request.json()
        image_data = data['image']
        name = data['name']
        print(name)
        # Register face using the database module
        result = face_db.register_face(name, image_data)
        return JSONResponse(content=sanitize_numpy(result))
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
