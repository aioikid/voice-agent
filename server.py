"""
Combined server for serving the frontend and managing the voice agent
"""
import asyncio
import os
import subprocess
import threading
import time
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="LiveKit Voice Agent Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent_process = None
agent_status = {"running": False, "last_started": None, "error": None}

def start_agent():
    global agent_process, agent_status
    
    try:
        if agent_process and agent_process.poll() is None:
            agent_process.terminate()
            agent_process.wait(timeout=10)
    except:
        pass
    
    try:
        agent_process = subprocess.Popen(
            ["python", "agent.py", "dev"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        agent_status["running"] = True
        agent_status["last_started"] = time.time()
        agent_status["error"] = None
        
        print(f"Voice agent started with PID: {agent_process.pid}")
        
    except Exception as e:
        agent_status["running"] = False
        agent_status["error"] = str(e)
        print(f"Failed to start voice agent: {e}")

def monitor_agent():
    global agent_process, agent_status
    
    while True:
        try:
            if agent_process and agent_process.poll() is not None:
                agent_status["running"] = False
                print("Voice agent process died, restarting...")
                start_agent()
            
            time.sleep(30)
            
        except Exception as e:
            print(f"Error in agent monitor: {e}")
            time.sleep(60)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "agent_running": agent_status["running"],
        "timestamp": time.time()
    }

@app.get("/agent/status")
async def get_agent_status():
    global agent_process
    
    is_running = agent_process and agent_process.poll() is None
    agent_status["running"] = is_running
    
    return {
        "running": is_running,
        "last_started": agent_status["last_started"],
        "error": agent_status["error"],
        "pid": agent_process.pid if agent_process else None
    }

@app.post("/agent/restart")
async def restart_agent():
    try:
        start_agent()
        return {"message": "Agent restart initiated", "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to restart agent: {str(e)}")

public_dir = Path("public")
if public_dir.exists():
    app.mount("/static", StaticFiles(directory="public"), name="static")
    
    @app.get("/")
    async def serve_frontend():
        return FileResponse("public/index.html")
    
    @app.get("/{path:path}")
    async def serve_frontend_routes(path: str):
        file_path = public_dir / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        else:
            return FileResponse("public/index.html")

def main():
    if not os.path.exists(".env"):
        print("Warning: .env file not found. Please create one based on .env.example")
    
    monitor_thread = threading.Thread(target=monitor_agent, daemon=True)
    monitor_thread.start()
    
    start_agent()
    
    print("Starting LiveKit Voice Agent Server...")
    print("Frontend will be available at: http://localhost:8000")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )

if __name__ == "__main__":
    main()