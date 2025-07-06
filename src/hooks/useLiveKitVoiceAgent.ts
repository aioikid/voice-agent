import { useState, useEffect, useCallback, useRef } from 'react';
import { Room, RoomEvent, Track, RemoteTrack, createLocalAudioTrack } from 'livekit-client';
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

  const roomRef = useRef<Room | null>(null);
  const audioLevelInterval = useRef<NodeJS.Timeout | null>(null);

  const updateAudioLevel = useCallback(() => {
    if (!roomRef.current) return;

    const localTrack = roomRef.current.localParticipant.audioTrackPublications.values().next().value?.track;
    if (localTrack && localTrack.kind === Track.Kind.Audio) {
      const level = localTrack.getAudioLevel();
      setState(prev => ({ ...prev, audioLevel: level }));
    }
  }, []);

  const connect = useCallback(async () => {
    if (!config.url || !config.token) {
      setState(prev => ({ ...prev, error: 'Missing configuration' }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.Connected, () => {
        console.log('Room connected successfully');
        setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
        audioLevelInterval.current = setInterval(updateAudioLevel, 100);
        enableMicrophone(room);
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('Room disconnected');
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false,
          isListening: false
        }));
        
        if (audioLevelInterval.current) {
          clearInterval(audioLevelInterval.current);
          audioLevelInterval.current = null;
        }
      });

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        console.log('Track subscribed:', track.kind);
        if (track.kind === Track.Kind.Audio) {
          setState(prev => ({ ...prev, isListening: true }));
          const audioElement = track.attach();
          if (audioElement) {
            audioElement.autoplay = true;
            audioElement.volume = 1.0;
            document.body.appendChild(audioElement);
            console.log('Audio element attached and playing');
          }
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        console.log('Track unsubscribed:', track.kind);
        if (track.kind === Track.Kind.Audio) {
          setState(prev => ({ ...prev, isListening: false }));
          const audioElements = document.querySelectorAll('audio');
          audioElements.forEach(element => {
            if (element.srcObject === track.mediaStream) {
              element.remove();
            }
          });
        }
      });

      console.log('Connecting to room...');
      await room.connect(config.url, config.token);
      
    } catch (error) {
      console.error('Failed to connect:', error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  }, [config, updateAudioLevel]);

  const enableMicrophone = useCallback(async (room: Room) => {
    try {
      console.log('=== 音声専用マイクアクセス開始 ===');
      console.log('Navigator.mediaDevices available:', !!navigator.mediaDevices);
      console.log('getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
      console.log('Current URL:', window.location.href);
      console.log('Is secure context:', window.isSecureContext);
      
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      // デバイス一覧を取得
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      console.log('Available audio input devices:', audioInputs.length);
      console.log('Audio devices:', audioInputs.map(device => ({
        deviceId: device.deviceId,
        label: device.label,
        groupId: device.groupId
      })));
      
      if (audioInputs.length === 0) {
        throw new Error('No audio input devices found');
      }

      // 権限状態を確認
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('Microphone permission state:', permission.state);
      } catch (permError) {
        console.log('Permission query not supported:', permError);
      }

      // 方法1: createLocalAudioTrackを使用（音声専用）
      console.log('=== 方法1: createLocalAudioTrack使用 ===');
      try {
        console.log('Creating local audio track...');
        const audioTrack = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
        
        console.log('Audio track created successfully:', {
          label: audioTrack.mediaStreamTrack.label,
          deviceId: audioTrack.mediaStreamTrack.getSettings().deviceId,
          enabled: audioTrack.mediaStreamTrack.enabled,
          muted: audioTrack.mediaStreamTrack.muted,
          readyState: audioTrack.mediaStreamTrack.readyState
        });

        // トラックをルームに公開
        console.log('Publishing audio track to room...');
        await room.localParticipant.publishTrack(audioTrack);
        console.log('Audio track published successfully');
        
        return; // 成功したので終了
        
      } catch (trackError) {
        console.error('createLocalAudioTrack failed:', trackError);
      }

      // 方法2: getUserMediaで直接音声ストリームを取得
      console.log('=== 方法2: getUserMedia直接使用 ===');
      try {
        console.log('Getting user media (audio only)...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false // 明示的にビデオを無効化
        });
        
        console.log('Audio stream obtained:', stream);
        const audioTracks = stream.getAudioTracks();
        console.log('Audio tracks in stream:', audioTracks.length);
        
        if (audioTracks.length > 0) {
          const track = audioTracks[0];
          console.log('Audio track details:', {
            label: track.label,
            deviceId: track.getSettings().deviceId,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            settings: track.getSettings()
          });

          // LiveKitのLocalAudioTrackを作成
          const { LocalAudioTrack } = await import('livekit-client');
          const localAudioTrack = new LocalAudioTrack(track);
          
          console.log('Publishing manual audio track...');
          await room.localParticipant.publishTrack(localAudioTrack);
          console.log('Manual audio track published successfully');
          
          return; // 成功したので終了
        }
        
      } catch (streamError) {
        console.error('getUserMedia failed:', streamError);
      }

      // 方法3: 最後の手段 - enableCameraAndMicrophone（ただし音声のみ）
      console.log('=== 方法3: enableCameraAndMicrophone（音声のみ）===');
      try {
        console.log('Using enableCameraAndMicrophone with audio only...');
        await room.localParticipant.enableCameraAndMicrophone(false, true);
        console.log('enableCameraAndMicrophone succeeded');
        return;
        
      } catch (enableError) {
        console.error('enableCameraAndMicrophone failed:', enableError);
        throw enableError;
      }
      
    } catch (error) {
      console.error('=== 全ての音声アクセス方法が失敗 ===');
      console.error('Final error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setState(prev => ({ 
            ...prev, 
            error: 'マイクアクセスが拒否されました。ブラウザのアドレスバー左側の🔒マークをクリックして、マイクを「許可」に設定してください。' 
          }));
        } else if (error.name === 'NotFoundError') {
          setState(prev => ({ 
            ...prev, 
            error: 'マイクデバイスが見つかりません。システムのマイク設定とデバイスマネージャーを確認してください。' 
          }));
        } else if (error.name === 'NotReadableError') {
          setState(prev => ({ 
            ...prev, 
            error: 'マイクが他のアプリケーション（Zoom、Teams、Discord等）で使用中です。他のアプリを完全に終了してブラウザを再起動してください。' 
          }));
        } else if (error.name === 'OverconstrainedError') {
          setState(prev => ({ 
            ...prev, 
            error: 'マイクの制約設定に問題があります。システムのマイク設定を確認してください。' 
          }));
        } else {
          setState(prev => ({ 
            ...prev, 
            error: `マイクアクセスエラー (${error.name}): ${error.message}` 
          }));
        }
      } else {
        setState(prev => ({ 
          ...prev, 
          error: 'マイクアクセスに失敗しました。ブラウザを再起動してお試しください。' 
        }));
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('Disconnecting from room...');
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    
    if (audioLevelInterval.current) {
      clearInterval(audioLevelInterval.current);
      audioLevelInterval.current = null;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (roomRef.current) {
      const audioTrack = roomRef.current.localParticipant.audioTrackPublications.values().next().value?.track;
      if (audioTrack) {
        const newMutedState = !audioTrack.isMuted;
        audioTrack.setMuted(newMutedState);
        setState(prev => ({ ...prev, isMuted: newMutedState }));
        console.log('Microphone muted:', newMutedState);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    state,
    connect,
    disconnect,
    toggleMute,
  };
};