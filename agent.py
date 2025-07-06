"""
LiveKit Voice Agent with OpenAI Whisper STT and OpenAI TTS
Modified from the original LiveKit documentation to use OpenAI for both STT and TTS
"""

from dotenv import load_dotenv
import os
import asyncio
import logging
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import openai, noise_cancellation, silero

# --- 詳細なログ設定 ---
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("voice-assistant")
# --------------------

load_dotenv()


class VoiceAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="You are a helpful voice AI assistant. Respond naturally and conversationally. Keep responses concise but informative. Always respond in Japanese when the user speaks Japanese, and in English when they speak English."
        )


async def entrypoint(ctx: agents.JobContext):
    logger.info("✅ エージェントのエントリーポイントが開始されました。")

    try:
        logger.info("⏳ AgentSessionの初期化を開始します...")
        session = AgentSession(
            stt=openai.STT(
                model="whisper-1",
                language="auto"
            ),
            llm=openai.LLM(
                model="gpt-4o-mini",
                temperature=0.7
            ),
            tts=openai.TTS(
                model="tts-1",
                voice="alloy"
            ),
            vad=silero.VAD.load(),
        )
        logger.info("✅ AgentSessionの初期化が完了しました。")

        logger.info("⏳ LiveKitルームへの接続を開始します...")
        await ctx.connect()
        logger.info("✅ LiveKitルームへの接続が完了しました。")

        logger.info("⏳ AgentSessionを開始します...")
        await session.start(
            room=ctx.room,
            agent=VoiceAssistant(),
            room_input_options=RoomInputOptions(
                noise_cancellation=noise_cancellation.BVC(),
            ),
        )
        logger.info("✅ AgentSessionが開始されました。参加者を待っています...")

        await asyncio.sleep(1)

        logger.info("⏳ 最初の挨拶を生成します...")
        await session.generate_reply(
            instructions="Say exactly this in Japanese: 'こんにちは！AIアシスタントです。正常に起動しました。'"
        )
        logger.info("✅ 最初の挨拶を送信しました。")

    except Exception as e:
        logger.error(f"❌ エントリーポイントで致命的なエラーが発生しました: {e}", exc_info=True)


if __name__ == "__main__":
    logger.info("🚀 メインスクリプトを開始します。")
    try:
        agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
    except Exception as e:
        logger.error(f"❌ アプリケーションの実行に失敗しました: {e}", exc_info=True)