import os
import asyncio
import logging
from dotenv import load_dotenv
from livekit import agents
from livekit.plugins import openai

# --- ログ設定 ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("voice-assistant")
load_dotenv()

# --- AIエージェントの定義 ---
class VoiceAssistant(agents.Agent):
    def __init__(self) -> None:
        super().__init__()
        # セッションごとに会話履歴を管理するためのリスト
        self.chat_history = []

    async def entrypoint(self, ctx: agents.JobContext):
        logger.info("✅ エージェントがルームに参加しました。")
        
        # AIの初期設定（ペルソナ）
        initial_instructions = "You are a helpful voice AI assistant. Respond naturally and conversationally. Keep responses concise but informative. Always respond in Japanese when the user speaks Japanese, and in English when they speak English."
        self.chat_history.append({'role': 'system', 'content': initial_instructions})

        # STT, LLM, TTSのパイプラインを定義
        session = agents.AgentSession(
            stt=openai.STT(model="whisper-1", language="ja"),
            llm=openai.LLM(model="gpt-4o-mini"),
            tts=openai.TTS(model="tts-1", voice="alloy"),
        )
        
        # セッションを開始
        await session.start(ctx.room)
        
        # 最初の挨拶を送信
        await asyncio.sleep(1)
        await session.say("こんにちは！AIアシスタントです。何かお手伝いできることはありますか？", allow_interruptions=False)
        logger.info("✅ 最初の挨拶を送信しました。")

        # ユーザーの発言を待ち、応答するループ
        async for msg in session.chat_history.body():
            if msg.role == "user":
                logger.info(f"ユーザーの発言を処理中: {msg.content}")
                self.chat_history.append({'role': 'user', 'content': msg.content})
                
                # 応答を生成して再生
                response_text = await session.say(self.chat_history)
                
                # 応答を履歴に追加
                self.chat_history.append({'role': 'assistant', 'content': response_text})
                logger.info(f"AIの応答を完了しました: {response_text}")

# --- スクリプト実行のエントリーポイント ---
if __name__ == "__main__":
    agents.cli.run_agent(VoiceAssistant)