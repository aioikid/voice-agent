# LiveKit Voice Agent プロジェクトセットアップ

## 1. プロジェクトフォルダの作成
```powershell
mkdir ~/voice-agent-project
cd ~/voice-agent-project
```

## 2. 必要なファイルを作成

### Python関連ファイル

**agent.py** - メインのPythonエージェント
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

**requirements.txt** - Python依存関係
```
# LiveKit Agents with OpenAI integrations
livekit-agents[openai,silero,turn-detector]~=1.0
livekit-plugins-noise-cancellation~=0.2
python-dotenv

# Optional: for development and testing
uvicorn
fastapi
```

**.env** - 環境変数設定ファイル
```
# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here
LIVEKIT_URL=wss://talktune-exng0106.livekit.cloud

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Room configuration
DEFAULT_ROOM_NAME=talktune
```

## 3. Pythonパッケージのインストール
```bash
pip install -r requirements.txt
```

## 4. APIキーの設定
1. LiveKit Cloud (https://cloud.livekit.io/) でAPIキーを取得
2. OpenAI Platform (https://platform.openai.com/) でAPIキーを取得
3. .envファイルに実際のキーを入力

## 5. エージェントの起動
```bash
python agent.py dev
```

## 6. Webアプリケーションの使用
- このWebContainer環境のWebアプリケーションを使用
- または、React/TypeScriptファイルもローカルに作成可能

## 注意事項
- Pythonエージェントはローカルで実行
- Webアプリケーションはこの環境またはローカルで実行
- 両方が同じLiveKitルームに接続する必要があります