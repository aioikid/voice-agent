import { useState, useEffect, useCallback, useRef } from 'react';
import { Room, RoomEvent, Track, RemoteTrack, createLocalAudioTrack, LocalAudioTrack } from 'livekit-client';
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

  // 詳細なデバイス診断関数
  const diagnoseAudioDevices = useCallback(async () => {
    console.log('=== 🔍 詳細なオーディオデバイス診断開始 ===');
    
    try {
      // 基本的な環境チェック
      console.log('🌐 環境情報:');
      console.log('  - User Agent:', navigator.userAgent);
      console.log('  - URL:', window.location.href);
      console.log('  - Secure Context:', window.isSecureContext);
      console.log('  - MediaDevices available:', !!navigator.mediaDevices);
      console.log('  - getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
      
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia is not supported');
      }

      // 権限状態の詳細確認
      console.log('🔐 権限状態確認:');
      try {
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('  - Microphone permission:', micPermission.state);
        
        // 権限変更の監視
        micPermission.onchange = () => {
          console.log('  - Permission changed to:', micPermission.state);
        };
      } catch (permError) {
        console.log('  - Permission query not supported:', permError);
      }

      // デバイス列挙（権限前）
      console.log('🎤 デバイス列挙（権限前）:');
      let devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputsBefore = devices.filter(device => device.kind === 'audioinput');
      console.log(`  - Audio inputs found: ${audioInputsBefore.length}`);
      audioInputsBefore.forEach((device, index) => {
        console.log(`    ${index + 1}. ID: ${device.deviceId}, Label: "${device.label}", Group: ${device.groupId}`);
      });

      // 最小限の権限要求
      console.log('🔓 最小限の権限要求:');
      let testStream: MediaStream | null = null;
      try {
        testStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 44100,
            channelCount: 1
          }
        });
        console.log('  ✅ 基本的な音声アクセス成功');
        
        const tracks = testStream.getAudioTracks();
        console.log(`  - Audio tracks: ${tracks.length}`);
        tracks.forEach((track, index) => {
          const settings = track.getSettings();
          console.log(`    Track ${index + 1}:`, {
            label: track.label,
            deviceId: settings.deviceId,
            sampleRate: settings.sampleRate,
            channelCount: settings.channelCount,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState
          });
        });
        
      } catch (streamError) {
        console.error('  ❌ 基本的な音声アクセス失敗:', streamError);
        throw streamError;
      } finally {
        if (testStream) {
          testStream.getTracks().forEach(track => track.stop());
        }
      }

      // デバイス列挙（権限後）
      console.log('🎤 デバイス列挙（権限後）:');
      devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputsAfter = devices.filter(device => device.kind === 'audioinput');
      console.log(`  - Audio inputs found: ${audioInputsAfter.length}`);
      audioInputsAfter.forEach((device, index) => {
        console.log(`    ${index + 1}. ID: ${device.deviceId}, Label: "${device.label}", Group: ${device.groupId}`);
      });

      return {
        success: true,
        audioDevices: audioInputsAfter,
        hasPermission: true
      };

    } catch (error) {
      console.error('=== ❌ デバイス診断失敗 ===');
      console.error('Error details:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        audioDevices: [],
        hasPermission: false
      };
    }
  }, []);

  const connect = useCallback(async () => {
    if (!config.url || !config.token) {
      setState(prev => ({ ...prev, error: 'Missing configuration' }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // まず詳細診断を実行
      const diagnosis = await diagnoseAudioDevices();
      
      if (!diagnosis.success) {
        throw diagnosis.error || new Error('Audio device diagnosis failed');
      }

      if (diagnosis.audioDevices.length === 0) {
        throw new Error('No audio input devices available');
      }

      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.Connected, () => {
        console.log('✅ Room connected successfully');
        setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
        audioLevelInterval.current = setInterval(updateAudioLevel, 100);
        enableMicrophone(room, diagnosis.audioDevices);
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
  }, [config, updateAudioLevel, diagnoseAudioDevices]);

  const enableMicrophone = useCallback(async (room: Room, availableDevices?: MediaDeviceInfo[]) => {
    try {
      console.log('=== 🎤 マイク有効化開始 ===');
      
      // 利用可能なデバイスがある場合は最初のデバイスを使用
      const targetDeviceId = availableDevices && availableDevices.length > 0 
        ? availableDevices[0].deviceId 
        : undefined;
      
      console.log('🎯 Target device ID:', targetDeviceId);

      // 方法1: 特定のデバイスIDを指定してcreateLocalAudioTrack
      if (targetDeviceId) {
        console.log('=== 方法1: 特定デバイスでcreateLocalAudioTrack ===');
        try {
          const audioTrack = await createLocalAudioTrack({
            deviceId: targetDeviceId,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          });
          
          console.log('✅ Audio track created with specific device:', {
            label: audioTrack.mediaStreamTrack.label,
            deviceId: audioTrack.mediaStreamTrack.getSettings().deviceId,
            enabled: audioTrack.mediaStreamTrack.enabled,
            readyState: audioTrack.mediaStreamTrack.readyState
          });

          await room.localParticipant.publishTrack(audioTrack);
          console.log('✅ Audio track published successfully');
          return;
          
        } catch (trackError) {
          console.error('❌ Specific device createLocalAudioTrack failed:', trackError);
        }
      }

      // 方法2: デバイスIDなしでcreateLocalAudioTrack
      console.log('=== 方法2: デフォルトデバイスでcreateLocalAudioTrack ===');
      try {
        const audioTrack = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
        
        console.log('✅ Audio track created with default device:', {
          label: audioTrack.mediaStreamTrack.label,
          deviceId: audioTrack.mediaStreamTrack.getSettings().deviceId,
          enabled: audioTrack.mediaStreamTrack.enabled,
          readyState: audioTrack.mediaStreamTrack.readyState
        });

        await room.localParticipant.publishTrack(audioTrack);
        console.log('✅ Audio track published successfully');
        return;
        
      } catch (trackError) {
        console.error('❌ Default createLocalAudioTrack failed:', trackError);
      }

      // 方法3: getUserMediaで直接ストリーム取得
      console.log('=== 方法3: getUserMedia直接取得 ===');
      try {
        const constraints: MediaStreamConstraints = {
          audio: targetDeviceId ? {
            deviceId: { exact: targetDeviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        };

        console.log('🎛️ Using constraints:', constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        const audioTracks = stream.getAudioTracks();
        console.log(`✅ Audio stream obtained with ${audioTracks.length} tracks`);
        
        if (audioTracks.length > 0) {
          const track = audioTracks[0];
          console.log('🎵 Audio track details:', {
            label: track.label,
            deviceId: track.getSettings().deviceId,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            settings: track.getSettings()
          });

          const localAudioTrack = new LocalAudioTrack(track);
          await room.localParticipant.publishTrack(localAudioTrack);
          console.log('✅ Manual audio track published successfully');
          return;
        }
        
      } catch (streamError) {
        console.error('❌ getUserMedia failed:', streamError);
      }

      // 方法4: 最も基本的なgetUserMedia
      console.log('=== 方法4: 最基本getUserMedia ===');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioTracks = stream.getAudioTracks();
        
        if (audioTracks.length > 0) {
          const track = audioTracks[0];
          const localAudioTrack = new LocalAudioTrack(track);
          await room.localParticipant.publishTrack(localAudioTrack);
          console.log('✅ Basic audio track published successfully');
          return;
        }
        
      } catch (basicError) {
        console.error('❌ Basic getUserMedia failed:', basicError);
        throw basicError;
      }
      
    } catch (error) {
      console.error('=== ❌ 全ての音声アクセス方法が失敗 ===');
      console.error('Final error:', error);
      
      if (error instanceof Error) {
        let errorMessage = '';
        
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = 'マイクアクセスが拒否されました。\n\n解決方法:\n1. ブラウザのアドレスバー左側の🔒マークをクリック\n2. マイクを「許可」に設定\n3. ページを更新してください';
            break;
          case 'NotFoundError':
            errorMessage = 'マイクデバイスが見つかりません。\n\n確認事項:\n1. マイクが正しく接続されているか\n2. システムのサウンド設定でマイクが認識されているか\n3. デバイスマネージャーでマイクが正常に動作しているか';
            break;
          case 'NotReadableError':
            errorMessage = 'マイクが他のアプリケーションで使用中です。\n\n解決方法:\n1. Zoom、Teams、Discord、Skype等を完全に終了\n2. ブラウザの他のタブで音声通話を終了\n3. ブラウザを再起動\n4. 必要に応じてPCを再起動';
            break;
          case 'OverconstrainedError':
            errorMessage = 'マイクの設定制約に問題があります。\n\n解決方法:\n1. システムのマイク設定を確認\n2. マイクのサンプルレートを44.1kHzまたは48kHzに設定\n3. ブラウザを再起動';
            break;
          case 'AbortError':
            errorMessage = 'マイクアクセスが中断されました。\n\n解決方法:\n1. ページを更新\n2. 再度接続を試行';
            break;
          default:
            errorMessage = `マイクアクセスエラー (${error.name}): ${error.message}\n\n一般的な解決方法:\n1. ブラウザを再起動\n2. PCを再起動\n3. 別のブラウザで試行`;
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