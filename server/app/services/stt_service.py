"""
Deepgram STT Service

Handles real-time speech-to-text using Deepgram's WebSocket API.
Includes VAD (Voice Activity Detection) via Deepgram's 'speech_started' events.
"""

import logging
from collections.abc import AsyncGenerator, Callable

from app.core.config import settings
from deepgram import (
    DeepgramClient,
    # DeepgramClientOptions, # Not found in v5?
    # LiveTranscriptionEvents,
    # LiveOptions,
)

logger = logging.getLogger(__name__)


class STTService:
    def __init__(self):
        self.api_key = settings.DEEPGRAM_API_KEY
        self.client = None
        if self.api_key:
            # config = DeepgramClientOptions(verbose=logging.WARNING)
            self.client = DeepgramClient(api_key=self.api_key)

    async def transcribe_stream(
        self,
        audio_stream: AsyncGenerator[bytes, None],
        on_transcript: Callable[[str, bool], None],
        on_speech_started: Callable[[], None] | None = None,
        on_utterance_end: Callable[[], None] | None = None,
        language: str = "ko",
    ):
        """
        Connects to Deepgram Live Transcription and processes audio stream.

        Args:
            audio_stream: Async generator yielding binary audio chunks.
            on_transcript: Callback(text: str, is_final: bool)
            on_speech_started: Callback when speech starts (Barge-in trigger)
            on_utterance_end: Callback when user stops speaking
        """
        if not self.client:
            logger.error("Deepgram API key missing")
            return

        try:
            dg_connection = self.client.listen.asyncwebsocket.v("1")

            # Define event handlers (Note: these are callbacks, not methods - no 'self')
            async def on_message(result, **kwargs):
                sentence = result.channel.alternatives[0].transcript
                if len(sentence) == 0:
                    return

                is_final = result.is_final
                # In Korean, we might want to wait for final to avoid half-words,
                # but interim results make it feel faster.
                if on_transcript:
                    await on_transcript(sentence, is_final)

            async def on_metadata(metadata, **kwargs):
                pass

            async def on_speech_started_handler(speech_started, **kwargs):
                if on_speech_started:
                    await on_speech_started()

            async def on_utterance_end_handler(utterance_end, **kwargs):
                if on_utterance_end:
                    await on_utterance_end()

            async def on_error(error, **kwargs):
                logger.error(f"Deepgram error: {error}")

            # Register handlers
            dg_connection.on("Results", on_message)
            dg_connection.on("SpeechStarted", on_speech_started_handler)
            dg_connection.on("UtteranceEnd", on_utterance_end_handler)
            dg_connection.on("Error", on_error)

            # Connect options
            # Using dict as LiveOptions class is missing in this version check
            options = {
                "model": "nova-2",
                "language": language,
                "smart_format": True,
                "encoding": "linear16",  # Assuming raw PCM
                "channels": 1,
                "sample_rate": 16000,
                "interim_results": True,
                "utterance_end_ms": 1000,
                "vad_events": True,
                "endpointing": 300,  # Wait 300ms silence to consider "final" locally
            }

            if await dg_connection.start(options) is False:
                logger.error("Failed to connect to Deepgram")
                return

            # Stream audio
            async for chunk in audio_stream:
                await dg_connection.send(chunk)

            # Finish
            await dg_connection.finish()

        except Exception as e:
            logger.error(f"STT Exception: {e}")


# Singleton
stt_service = STTService()
