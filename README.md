# LiveKit Voice Agent Web System

A production-ready web application for interacting with LiveKit voice agents, featuring OpenAI Whisper for Speech-to-Text and OpenAI TTS for Text-to-Speech.

## Features

- **Beautiful Web Interface**: Modern, responsive design with real-time audio visualization
- **OpenAI Integration**: Uses Whisper for STT and OpenAI TTS for natural speech synthesis
- **Real-time Audio**: Live audio level monitoring and voice activity detection
- **Connection Management**: Robust connection handling with error recovery
- **Mobile Responsive**: Works seamlessly on desktop, tablet, and mobile devices

## Setup

### 1. Backend (Python Agent)

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- Get LiveKit credentials from [LiveKit Cloud](https://cloud.livekit.io/)
- Get OpenAI API key from [OpenAI Platform](https://platform.openai.com/)

Download required model files:

```bash
python agent.py download-files
```

### 2. Frontend (React Web App)

The web application is already configured and ready to use. Start the development server:

```bash
npm run dev
```

## Usage

### Running the Voice Agent

Start the Python agent in development mode:

```bash
python agent.py dev
```

This will connect the agent to your LiveKit server and make it available for web clients.

### Using the Web Interface

1. Open the web application in your browser
2. Click the settings button to configure your LiveKit server details
3. Enter your LiveKit URL and access token
4. Click "Connect" to establish a voice session
5. Start speaking naturally with your AI assistant

## Configuration

### Voice Agent Settings

The Python agent uses the following OpenAI configurations:

- **STT**: OpenAI Whisper (`whisper-1`)
- **LLM**: GPT-4o-mini for conversations
- **TTS**: OpenAI TTS (`tts-1`) with "alloy" voice

You can modify these settings in `agent.py`:

```python
# Change TTS voice (options: alloy, echo, fable, onyx, nova, shimmer)
tts=openai.TTS(model="tts-1", voice="nova")

# Change language or enable auto-detection
stt=openai.STT(model="whisper-1", language="auto")
```

### Web Interface Configuration

The web app allows you to configure:
- LiveKit server URL
- Access token
- Room name

These settings are stored locally and can be modified through the settings modal.

## Deployment

### Backend Deployment

For production deployment of the voice agent, see the [LiveKit deployment guide](https://docs.livekit.io/agents/ops/deployment/).

### Frontend Deployment

Build the web application:

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment to any static hosting service.

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check your LiveKit credentials and server URL
2. **Audio Issues**: Ensure microphone permissions are granted in your browser
3. **No Voice Response**: Verify your OpenAI API key has sufficient credits

### Development Mode

For local development, you can run the agent in console mode:

```bash
python agent.py console
```

This allows you to test the voice agent directly in your terminal.

## License

This project is built using LiveKit and OpenAI services. Please refer to their respective terms of service.