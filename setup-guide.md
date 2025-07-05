# 🎯 **次のステップ: エージェントファイルの作成**

## 📝 **1. agent.py ファイルを作成**

以下の内容で `agent.py` ファイルを作成してください：

```python
"""
LiveKit Voice Agent with OpenAI Whisper STT and OpenAI TTS
Modified from the original LiveKit documentation to use OpenAI for both STT and TTS
"""

from dotenv import load_dotenv
import os
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import openai, noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

load_dotenv()


class VoiceAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="You are a helpful voice AI assistant. Respond naturally and conversationally. Keep responses concise but informative."
        )


async def entrypoint(ctx: agents.JobContext):
    """
    Main entry point for the voice agent using OpenAI Whisper for STT and OpenAI TTS
    """
    session = AgentSession(
        # Use OpenAI Whisper for Speech-to-Text
        stt=openai.STT(
            model="whisper-1",
            language="en"  # You can set this to "auto" for auto-detection
        ),
        
        # Use OpenAI for Language Model
        llm=openai.LLM(
            model="gpt-4o-mini",
            temperature=0.7
        ),
        
        # Use OpenAI TTS for Text-to-Speech
        tts=openai.TTS(
            model="tts-1",  # or "tts-1-hd" for higher quality
            voice="alloy"   # Options: alloy, echo, fable, onyx, nova, shimmer
        ),
        
        # Voice Activity Detection
        vad=silero.VAD.load(),
        
        # Turn Detection for better conversation flow
        turn_detection=MultilingualModel(),
    )

    await session.start(
        room=ctx.room,
        agent=VoiceAssistant(),
        room_input_options=RoomInputOptions(
            # LiveKit Cloud enhanced noise cancellation
            # If self-hosting, omit this parameter
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    await ctx.connect()

    # Send initial greeting
    await session.generate_reply(
        instructions="Greet the user warmly and let them know you're ready to help them with any questions or tasks."
    )


if __name__ == "__main__":
    # Run the agent
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
```

## 🔑 **2. .env ファイルを作成**

以下の内容で `.env` ファイルを作成してください：

```env
# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here
LIVEKIT_URL=wss://talktune-exng0106.livekit.cloud

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Room configuration
DEFAULT_ROOM_NAME=talktune
```

## 🔧 **3. APIキーの取得と設定**

### LiveKit APIキー:
1. [LiveKit Cloud](https://cloud.livekit.io/) にアクセス
2. プロジェクトを作成またはログイン
3. Settings → API Keys でキーを取得
4. `.env` ファイルの `LIVEKIT_API_KEY` と `LIVEKIT_API_SECRET` に入力

### OpenAI APIキー:
1. [OpenAI Platform](https://platform.openai.com/) にアクセス
2. API Keys セクションでキーを作成
3. `.env` ファイルの `OPENAI_API_KEY` に入力

## 🚀 **4. エージェントの起動**

APIキーを設定したら、以下のコマンドでエージェントを起動：

```powershell
python agent.py dev
```

## ✅ **5. 動作確認**

1. エージェントが起動したら、このWebアプリケーションで「Connect」ボタンをクリック
2. マイクへのアクセスを許可
3. 話しかけてAIからの応答を確認

---

**現在の状況**: Pythonパッケージのインストール完了 ✅  
**次のステップ**: 上記のファイルを作成してAPIキーを設定