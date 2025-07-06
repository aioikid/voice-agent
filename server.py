import os
import asyncio
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
import uvicorn
from livekit import agents, api

# .envファイルから環境変数を読み込む
load_dotenv()
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

# --- FastAPI Webサーバーのセットアップ ---
app = FastAPI()

# --- フロントエンドのファイルを提供 ---
app.mount("/assets", StaticFiles(directory="public/assets"), name="assets")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    file_path = os.path.join("public", full_path.strip("/"))
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join("public", "index.html"))


# --- ルームセッションを生成するためのAPIエンドポイント ---
@app.get("/token")
async def get_token(room_name: str, identity: str):
    if not all([LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET]):
        raise HTTPException(status_code=500, detail="LiveKit server credentials not set")

    try:
        # LiveKit Room APIクライアントを初期化
        lk_api = api.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        
        # ユーザー用のトークンを生成
        token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET) \
            .with_identity(identity) \
            .with_name(identity) \
            .with_grant(api.VideoGrant(room_join=True, room=room_name)) \
            .to_jwt()

        # AIエージェントをルームに参加させる
        # JobType.JT_ROOM を使用して、指定されたルームでエージェントを起動
        await lk_api.create_job(
            agents.Job(
                id=f"agent-for-{room_name}",
                room=api.Room(name=room_name),
                agent=agents.Agent(type=agents.Agent.Type.AGENT_TYPE_DEFAULT)
            )
        )
        
        return {"token": token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get token or dispatch agent: {e}")


# --- メインの実行部分 ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)