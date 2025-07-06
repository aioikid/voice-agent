import { useState, useEffect, useCallback, useRef } from 'react';
import { Room, RoomEvent, Track, RemoteTrack } from 'livekit-client';
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
        console.log('✅ Room connected successfully');
        setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
        audioLevelInterval.current = setInterval(updateAudioLevel, 100);
        enableMicrophone(room);
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('🔌 Room disconnected');
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
        console.log('📥 Track subscribed:', track.kind);
        if (track.kind === Track.Kind.Audio) {
          setState(prev => ({ ...prev, isListening: true }));
          const audioElement = track.attach();
          if (audioElement) {
            audioElement.autoplay = true;
            audioElement.volume = 1.0;
            document.body.appendChild(audioElement);
            console.log('🔊 Audio element attached and playing');
          }
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        console.log('📤 Track unsubscribed:', track.kind);
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

      console.log('🔗 Connecting to room...');
      await room.connect(config.url, config.token);
      
    } catch (error) {
      console.error('❌ Failed to connect:', error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  }, [config, updateAudioLevel]);

  const enableMicrophone = useCallback(async (room: Room) => {
    try {
      console.log('=== 🎤 マイク有効化開始 ===');
      
      // 環境チェック
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('このブラウザではマイクアクセスがサポートされていません');
      }

      // まず利用可能なデバイスを確認
      console.log('🔍 利用可能なデバイスを確認中...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      console.log('検出されたオーディオ入力デバイス:', audioInputs.length);
      
      if (audioInputs.length === 0) {
        console.warn('⚠️ オーディオ入力デバイスが検出されませんでした');
        // デバイスが検出されない場合でも、ブラウザのデフォルトを試行
      }
      
      // 段階的にマイクアクセスを試行
      let microphoneEnabled = false;
      
      // 方法1: LiveKitの標準的な方法（最もシンプル）
      try {
        console.log('🎯 方法1: LiveKit標準方法でマイク有効化');
        await room.localParticipant.enableCameraAndMicrophone(false, true);
        console.log('✅ LiveKit標準方法成功');
        microphoneEnabled = true;
      } catch (liveKitError) {
        console.log('❌ LiveKit標準方法失敗:', liveKitError);
      }
      
      // 方法2: 直接getUserMediaを使用（制約なし）
      if (!microphoneEnabled) {
        try {
          console.log('🎯 方法2: 直接getUserMedia（制約なし）');
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });
          
          const audioTracks = stream.getAudioTracks();
          console.log(`✅ 方法2成功: ${audioTracks.length}個のオーディオトラック取得`);
          
          if (audioTracks.length > 0) {
            // LiveKitにトラックを手動で追加
            await room.localParticipant.publishTrack(audioTracks[0], {
              name: 'microphone',
              source: Track.Source.Microphone
            });
            console.log('✅ トラック公開成功');
            microphoneEnabled = true;
          }
        } catch (directError) {
          console.log('❌ 方法2失敗:', directError);
        }
      }
      
      // 方法3: より柔軟な制約でgetUserMedia
      if (!microphoneEnabled) {
        try {
          console.log('🎯 方法3: 柔軟な制約でgetUserMedia');
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              sampleRate: 44100,
              channelCount: 1
            },
            video: false
          });
          
          const audioTracks = stream.getAudioTracks();
          console.log(`✅ 方法3成功: ${audioTracks.length}個のオーディオトラック取得`);
          
          if (audioTracks.length > 0) {
            await room.localParticipant.publishTrack(audioTracks[0], {
              name: 'microphone',
              source: Track.Source.Microphone
            });
            console.log('✅ トラック公開成功');
            microphoneEnabled = true;
          }
        } catch (flexibleError) {
          console.log('❌ 方法3失敗:', flexibleError);
        }
      }
      
      // 方法4: 特定のデバイスIDを指定してgetUserMedia
      if (!microphoneEnabled && audioInputs.length > 0) {
        for (const device of audioInputs) {
          try {
            console.log(`🎯 方法4: 特定デバイス試行 - ${device.label || device.deviceId}`);
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: { deviceId: { exact: device.deviceId } },
              video: false
            });
            
            const audioTracks = stream.getAudioTracks();
            console.log(`✅ 方法4成功: デバイス ${device.label || device.deviceId}`);
            
            if (audioTracks.length > 0) {
              await room.localParticipant.publishTrack(audioTracks[0], {
                name: 'microphone',
                source: Track.Source.Microphone
              });
              console.log('✅ トラック公開成功');
              microphoneEnabled = true;
              break;
            }
          } catch (deviceError) {
            console.log(`❌ デバイス ${device.label || device.deviceId} 失敗:`, deviceError);
          }
        }
      }
      
      // 方法5: 最後の手段 - 最小限の制約
      if (!microphoneEnabled) {
        try {
          console.log('🎯 方法5: 最小限の制約でgetUserMedia');
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              mandatory: {},
              optional: []
            } as any,
            video: false
          });
          
          const audioTracks = stream.getAudioTracks();
          console.log(`✅ 方法5成功: ${audioTracks.length}個のオーディオトラック取得`);
          
          if (audioTracks.length > 0) {
            await room.localParticipant.publishTrack(audioTracks[0], {
              name: 'microphone',
              source: Track.Source.Microphone
            });
            console.log('✅ トラック公開成功');
            microphoneEnabled = true;
          }
        } catch (minimalError) {
          console.log('❌ 方法5失敗:', minimalError);
        }
      }
      
      if (microphoneEnabled) {
        console.log('🎉 マイク有効化完了');
      } else {
        throw new Error('すべてのマイクアクセス方法が失敗しました');
      }
      
    } catch (error) {
      console.error('❌ マイク有効化失敗:', error);
      
      if (error instanceof Error) {
        let errorMessage = '';
        
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = 'マイクアクセスが拒否されました。ブラウザの設定でマイクアクセスを許可してください。';
            break;
          case 'NotFoundError':
            errorMessage = 'マイクが見つかりません。以下を確認してください：\n1. マイクが正しく接続されている\n2. システムのサウンド設定でマイクが認識されている\n3. 他のアプリケーション（Zoom、Teams等）でマイクを使用していない\n4. ブラウザを再起動してみる';
            break;
          case 'NotReadableError':
            errorMessage = 'マイクが他のアプリケーションで使用されています。他のアプリを閉じてから再試行してください。';
            break;
          case 'OverconstrainedError':
            errorMessage = 'マイクの設定に問題があります。ブラウザを再起動してお試しください。';
            break;
          default:
            errorMessage = `マイクアクセスエラー: ${error.message}\n\n対処法：\n1. ブラウザを再起動\n2. PCを再起動\n3. 別のブラウザで試行\n4. マイクの接続を確認`;
        }
        
        setState(prev => ({ ...prev, error: errorMessage }));
      } else {
        setState(prev => ({ 
          ...prev, 
          error: 'マイクアクセスに失敗しました。ブラウザを再起動してお試しください。' 
        }));
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting from room...');
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
        console.log('🔇 Microphone muted:', newMutedState);
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