from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

# Create FastAPI instance
app = FastAPI(
    title="DEMO API",
    description="FastAPI application",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CalculateRequest(BaseModel):
    # grouped_training_data: List[Dict[str, Any]] | None
    message: str|None

@app.post("/test")
async def root(data: CalculateRequest):
    return {"message-default": "Welcome to FastAPI application!", "data": data, "message": data.message}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
