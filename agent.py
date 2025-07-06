import os
import asyncio
import logging
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
import uvicorn
from livekit import agents
from livekit.plugins import openai

# --- 詳細なログ設定 ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("voice-assistant")
# --------------------

load_dotenv()

# --- FastAPI Webサーバーのセットアップ ---
app = FastAPI()

# --- LiveKit Agent の定義 ---
class VoiceAssistant(agents.Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="You are a helpful voice AI assistant. Respond naturally and conversationally. Keep responses concise but informative. Always respond in Japanese when the user speaks Japanese, and in English when they speak English."
        )

async def agent_entrypoint(ctx: agents.JobContext):
    logger.info("✅ エージェントのエントリーポイントが開始されました。")
    
    try:
        session = agents.AgentSession(
            stt=openai.STT(model="whisper-1", language="auto"),
            llm=openai.LLM(model="gpt-4o-mini", temperature=0.7),
            tts=openai.TTS(model="tts-1", voice="alloy"),
        )
        logger.info("✅ AgentSessionの初期化が完了しました。")

        logger.info("⏳ AgentSessionを開始します...")
        await session.start(
            room=ctx.room,
            agent=VoiceAssistant(),
        )
        logger.info("✅ AgentSessionが開始されました。参加者を待っています...")

        await asyncio.sleep(1)

        logger.info("⏳ 最初の挨拶を生成します...")
        await session.generate_reply(
            instructions="Say exactly this in Japanese: 'こんにちは！AIアシスタントです。正常に起動しました。'"
        )
        logger.info("✅ 最初の挨拶を送信しました。")

    except Exception as e:
        logger.error(f"❌ エージェント処理でエラー: {e}", exc_info=True)

# --- Webサーバー起動時にAgent Workerを開始する ---
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Webサーバー起動。LiveKit Agent Workerを開始します。")
    worker = agents.Worker(
        entrypoint_fnc=agent_entrypoint,
        worker_type=agents.JobType.ROOM
    )
    asyncio.create_task(worker.run())

# --- フロントエンドのファイルを提供するための設定 ---
app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    # パスが指定されていない場合は index.html を返す
    if not full_path or full_path == "/":
        return FileResponse("dist/index.html")
    
    # ファイルが存在する場合はそれを返す
    file_path = f"dist/{full_path}"
    if os.path.isfile(file_path):
        return FileResponse(file_path)

    # それ以外の場合（React Routerが処理するパス）は index.html を返す
    return FileResponse("dist/index.html")

# --- メインの実行部分 ---
if __name__ == "__main__":
    logger.info("🚀 Uvicorn Webサーバーを起動します...")
    uvicorn.run(app, host="0.0.0.0", port=8000)