import { useState, useEffect, useCallback, useRef } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { VoiceAgentState, LiveKitConfig } from '../types';

export const useLiveKitVoiceAgent = (config: LiveKitConfig) => {
  const [state, setState] = useState<VoiceAgentState>({
    isConnected: false,
    isConnecting: false,
    isMuted: false,
    isListening: false,
    audioLevel: 0,
    error: null,
  });

  const roomRef = useRef<Room>(new Room());
  const audioLevelInterval = useRef<NodeJS.Timeout | null>(null);

  const updateAudioLevel = useCallback(() => {
    const room = roomRef.current;
    if (!room || !room.localParticipant) {
      return;
    }
    const level = room.localParticipant.audioLevel;
    setState(prev => ({ ...prev, audioLevel: level }));
  }, []);

  const connect = useCallback(async (roomName: string, identity: string) => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const response = await fetch(`/token?room_name=${roomName}&identity=${identity}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get token: ${response.statusText} - ${errorText}`);
      }
      const data = await response.json();
      const token = data.token;
      
      const room = roomRef.current;

      room
        .on(RoomEvent.Disconnected, () => {
          console.log('🔌 Room disconnected');
          setState(prev => ({ ...prev, isConnected: false, isConnecting: false, isListening: false, audioLevel: 0 }));
          if (audioLevelInterval.current) {
            clearInterval(audioLevelInterval.current);
          }
        })
        .on(RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === Track.Kind.Audio) {
                const audioElement = track.attach();
                document.body.appendChild(audioElement);
                console.log('🔊 Remote audio track subscribed and attached');
            }
        })
        .on(RoomEvent.TrackUnsubscribed, (track) => {
            track.detach().forEach(element => element.remove());
        });

      await room.connect(config.url, token);
      console.log('✅ Room connected successfully');
      
      setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));

      await room.localParticipant.setMicrophoneEnabled(true);
      console.log('✅ Microphone enabled');
      
      if (audioLevelInterval.current) clearInterval(audioLevelInterval.current);
      audioLevelInterval.current = setInterval(updateAudioLevel, 200);

    } catch (error) {
      console.error('❌ Failed to connect:', error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  }, [config.url, updateAudioLevel]);

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const room = roomRef.current;
    if (room && room.localParticipant) {
      const newMutedState = !room.localParticipant.isMicrophoneEnabled;
      room.localParticipant.setMicrophoneEnabled(newMutedState);
      setState(prev => ({ ...prev, isMuted: newMutedState }));
    }
  }, []);

  useEffect(() => {
    const room = roomRef.current;
    return () => {
      room.disconnect();
    };
  }, []);

  return {
    state,
    connect,
    disconnect,
    toggleMute,
  };
};