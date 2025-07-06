import os
import asyncio
import logging
from dotenv import load_dotenv
from livekit import agents
from livekit.plugins import openai

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("voice-assistant")
load_dotenv()

class VoiceAssistant(agents.Agent):
    def __init__(self) -> None:
        super().__init__()
        self.chat_history = []

    async def entrypoint(self, ctx: agents.JobContext):
        logger.info("✅ エージェントがルームに参加しました。")
        initial_instructions = "You are a helpful voice AI assistant. Respond naturally and conversationally. Keep responses concise but informative. Always respond in Japanese when the user speaks Japanese, and in English when they speak English."
        self.chat_history.append({'role': 'system', 'content': initial_instructions})

        session = agents.AgentSession(
            stt=openai.STT(model="whisper-1", language="ja"),
            llm=openai.LLM(model="gpt-4o-mini"),
            tts=openai.TTS(model="tts-1", voice="alloy"),
        )
        
        await session.start(ctx.room)
        await asyncio.sleep(1)
        await session.say("こんにちは！AIアシスタントです。何かお手伝いできることはありますか？", allow_interruptions=False)
        logger.info("✅ 最初の挨拶を送信しました。")

        async for msg in session.chat_history.body():
            if msg.role == "user":
                logger.info(f"ユーザーの発言を処理中: {msg.content}")
                self.chat_history.append({'role': 'user', 'content': msg.content})
                response_text = await session.say(self.chat_history)
                self.chat_history.append({'role': 'assistant', 'content': response_text})
                logger.info(f"AIの応答を完了しました: {response_text}")

if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=VoiceAssistant))