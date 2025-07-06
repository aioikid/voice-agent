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
from contextlib import asynccontextmanager

# --- 詳細なログ設定 ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("voice-assistant")
# --------------------

load_dotenv()

# --- LiveKit Agent の定義 ---
class VoiceAssistant(agents.Agent):
    def __init__(self) -> None:
        super().__init__()

async def agent_entrypoint(ctx: agents.JobContext):
    logger.info("✅ エージェントのエントリーポイントが開始されました。")
    initial_instructions = "You are a helpful voice AI assistant. Respond naturally and conversationally. Keep responses concise but informative. Always respond in Japanese when the user speaks Japanese, and in English when they speak English."
    
    try:
        session = agents.AgentSession(
            stt=openai.STT(model="whisper-1", language="auto"),
            llm=openai.LLM(model="gpt-4o-mini"),
            tts=openai.TTS(model="tts-1", voice="alloy"),
        )
        logger.info("✅ AgentSessionの初期化が完了しました。")

        logger.info("⏳ AgentSessionを開始します...")
        await session.start(ctx.room)
        logger.info("✅ AgentSessionが開始されました。参加者を待っています...")

        await asyncio.sleep(1)

        logger.info("⏳ 最初の挨拶を生成します...")
        await session.say(initial_instructions, allow_interruptions=False)
        logger.info("✅ 最初の挨拶を送信しました。")

        async for msg in session.chat_history.body():
            if msg.role == "user":
                logger.info(f"ユーザーの発言を処理中: {msg.content}")
                await session.say(session.chat_history)
                logger.info("AIの応答を完了しました。")

    except Exception as e:
        logger.error(f"❌ エージェント処理でエラー: {e}", exc_info=True)


# --- Webサーバーのセットアップ ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Webサーバー起動。LiveKit Agent Workerを開始します。")
    worker = agents.Worker(request_fnc=agent_entrypoint)
    asyncio.create_task(worker.run())
    yield
    await worker.aclose()

app = FastAPI(lifespan=lifespan)

# --- フロントエンドのファイルを提供するための設定 ---
# ここを "dist" から "public" に修正
app.mount("/assets", StaticFiles(directory="public/assets"), name="assets")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    # ここを "dist" から "public" に修正
    public_dir = "public"
    file_path = os.path.join(public_dir, full_path)
    
    if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    return FileResponse(os.path.join(public_dir, "index.html"))


# --- メインの実行部分 ---
if __name__ == "__main__":
    logger.info("🚀 Uvicorn Webサーバーを起動します...")
    uvicorn.run(app, host="0.0.0.0", port=8000)