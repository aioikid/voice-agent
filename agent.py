"""
LiveKit Voice Agent with OpenAI Whisper STT and OpenAI TTS
Modified from the original LiveKit documentation to use OpenAI for both STT and TTS
"""

from dotenv import load_dotenv
import os
import asyncio
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import openai, noise_cancellation, silero

load_dotenv()


class VoiceAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="You are a helpful voice AI assistant. Respond naturally and conversationally. Keep responses concise but informative. Always respond in Japanese when the user speaks Japanese, and in English when they speak English."
        )


async def entrypoint(ctx: agents.JobContext):
    """
    Main entry point for the voice agent using OpenAI Whisper for STT and OpenAI TTS
    """
    # Try to import turn detector, but continue without it if models aren't available
    turn_detection = None
    try:
        from livekit.plugins.turn_detector.multilingual import MultilingualModel
        turn_detection = MultilingualModel()
        print("Turn detection enabled")
    except Exception as e:
        print(f"Warning: Turn detection not available: {e}")
        print("Agent will work without turn detection. To enable it, run: python agent.py download-files")
    
    session = AgentSession(
        # Use OpenAI Whisper for Speech-to-Text
        stt=openai.STT(
            model="whisper-1",
            language="auto"  # Auto-detect language
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
        
        # Turn Detection for better conversation flow (optional)
        turn_detection=turn_detection,
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
    
    print("Agent connected to room, waiting for participants...")
    
    # Wait a moment for the connection to stabilize
    await asyncio.sleep(2)
    
    # Send initial greeting
    try:
        await session.generate_reply(
            instructions="Say exactly this in Japanese: 'こんにちは！音声AIアシスタントです。接続テストが成功しました。何かお手伝いできることはありますか？'"
        )
        print("Initial greeting sent")
    except Exception as e:
        print(f"Failed to send initial greeting: {e}")
        # Try a simpler approach
        try:
            await session.generate_reply(
                instructions="Say 'Hello, I am your voice assistant. Connection test successful.'"
            )
            print("Simple greeting sent")
        except Exception as e2:


if __name__ == "__main__":
    # Run the agent
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))