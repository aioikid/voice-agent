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

def log_pipe(pipe, log_level):
    try:
        with pipe:
            for line in iter(pipe.readline, ''):
                print(f"AGENT LOG [{log_level}]: {line.strip()}")
    except Exception as e:
        print(f"AGENT LOGPIPE ERROR: {e}")

def start_agent():
    global agent_process, agent_status
    
    if agent_process and agent_process.poll() is None:
        try:
            agent_process.terminate()
            agent_process.wait(timeout=5)
        except:
            agent_process.kill()
            agent_process.wait()
    
    try:
        # "dev" を "start" に変更
        agent_process = subprocess.Popen(
            ["python", "-u", "agent.py", "start"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        
        stdout_thread = threading.Thread(target=log_pipe, args=[agent_process.stdout, "INFO"], daemon=True)
        stderr_thread = threading.Thread(target=log_pipe, args=[agent_process.stderr, "ERROR"], daemon=True)
        stdout_thread.start()
        stderr_thread.start()

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
            time.sleep(15)
        except Exception as e:
            print(f"Error in agent monitor: {e}")
            time.sleep(30)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# ... 他のAPIエンドポイント ...

app.mount("/", StaticFiles(directory="public", html=True), name="public")

def main():
    if not os.path.exists(".env"):
        print("Warning: .env file not found.")
    
    monitor_thread = threading.Thread(target=monitor_agent, daemon=True)
    monitor_thread.start()
    
    start_agent()
    
    print("Starting LiveKit Voice Agent Server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

if __name__ == "__main__":
    main()