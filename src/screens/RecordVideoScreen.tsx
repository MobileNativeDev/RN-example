// import { CustomButton } from '@components/customComponents/CustomButton';
// import { useNavigation, useRoute } from '@react-navigation/native';
// import { useEffect, useRef, useState } from 'react';
// import {
//   Alert,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
//   Linking,
// } from 'react-native';
// import {
//   Camera,
//   useCameraDevice,
//   useCameraPermission,
//   useMicrophonePermission,
// } from 'react-native-vision-camera';
// import { launchCamera } from 'react-native-image-picker';
// import Video from 'react-native-video';

// type RouteParams = {
//   onRecorded?: (video: {
//     uri: string;
//     duration: number;
//     thumbnail?: string;
//   }) => void;
// };

// export const RecordVideoScreen = () => {
//   const navigation = useNavigation();
//   const route = useRoute();

//   const cameraPermission = useCameraPermission();
//   const microphonePermission = useMicrophonePermission();

//   const params = (route.params as RouteParams) || undefined;
//   const onRecorded = params?.onRecorded;

//   const [usingFront, setUsingFront] = useState(false);

//   const device = useCameraDevice(usingFront ? 'front' : 'back');
//   const [isRecording, setIsRecording] = useState(false);
//   const [elapsed, setElapsed] = useState(0);
//   const [videoUri, setVideoUri] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   const cameraRef = useRef<Camera>(null);
//   const timerRef = useRef<NodeJS.Timeout | null>(null);
//   const startTimeRef = useRef<number | null>(null);
//   const recordingActiveRef = useRef(false);
//   const [cameraReady, setCameraReady] = useState(false);

//   useEffect(() => {
//     if (isRecording) {
//       startTimeRef.current = Date.now();
//       timerRef.current = setInterval(() => {
//         if (startTimeRef.current) {
//           const diff = Math.floor((Date.now() - startTimeRef.current) / 1000);
//           setElapsed(diff);
//         }
//       }, 500);
//     } else if (timerRef.current) {
//       clearInterval(timerRef.current);
//       timerRef.current = null;
//     }
//     return () => {
//       if (timerRef.current) {
//         clearInterval(timerRef.current);
//         timerRef.current = null;
//       }
//     };
//   }, [isRecording]);

//   const formatTime = (seconds: number) => {
//     const mins = Math.floor(seconds / 60)
//       .toString()
//       .padStart(2, '0');
//     const secs = (seconds % 60).toString().padStart(2, '0');
//     return `${mins}:${secs}`;
//   };

//   const toggleCamera = () => {
//     if (isRecording) return;
//     setUsingFront(prev => !prev);
//   };

//   const startRecording = async () => {
//     if (!cameraRef.current) return;
//     if (!cameraReady) {
//       return;
//     }
//     setError(null);
//     try {
//       setIsRecording(true);
//       recordingActiveRef.current = true;
//       startTimeRef.current = Date.now();
//       cameraRef.current.startRecording({
//         onRecordingFinished: async video => {
//           recordingActiveRef.current = false;
//           setIsRecording(false);
//           setVideoUri(video.path);
//         },
//         onRecordingError: e => {
//           console.log('Recording error', e);
//           recordingActiveRef.current = false;
//           setIsRecording(false);
//           setError('Recording error');
//         },
//         fileType: 'mp4',
//         flash: 'off',
//         videoCodec: 'h265',
//       });
//     } catch (e) {
//       console.log('Failed to start recording', e);
//       recordingActiveRef.current = false;
//       setIsRecording(false);
//     }
//   };

//   const stopRecording = async () => {
//     if (!cameraRef.current) return;
//     if (!recordingActiveRef.current) return;
//     const now = Date.now();
//     if (startTimeRef.current && now - startTimeRef.current < 400) {
//       const delay = 400 - (now - startTimeRef.current);
//       setTimeout(() => {
//         if (!cameraRef.current) return;
//         if (!recordingActiveRef.current) return;
//         try {
//           cameraRef.current!.stopRecording();
//         } catch (e) {
//           console.log('Stop recording error (delayed)', e);
//         }
//       }, delay);
//       return;
//     }
//     try {
//       cameraRef.current.stopRecording();
//     } catch (e) {
//       console.log('Stop recording error', e);
//     }
//   };

//   const reset = () => {
//     setVideoUri(null);
//     setElapsed(0);
//     setError(null);
//   };

//   const finish = () => {
//     if (videoUri && onRecorded) {
//       onRecorded({ uri: videoUri, duration: elapsed });
//     }
//     navigation.goBack();
//   };

//   const recordWithSystemCamera = async () => {
//     try {
//       const res = await launchCamera({
//         mediaType: 'video',
//         videoQuality: 'high',
//         durationLimit: 120,
//       });
//       if (res && res.assets && res.assets.length > 0) {
//         const asset = res.assets[0];
//         if (asset.uri) {
//           setVideoUri(asset.uri);
//         }
//       }
//     } catch (e) {
//       console.log('System camera recording failed', e);
//       setError('System camera recording failed');
//     }
//   };

//   // Request permissions (camera + microphone)
//   const requestPermissions = async () => {
//     try {
//       const camResult = await cameraPermission.requestPermission();
//       const micResult = await microphonePermission.requestPermission();
//       if (!camResult || !micResult) {
//         Alert.alert(
//           'Permissions required',
//           'Camera and microphone permissions are required. Please enable them in settings if you denied previously.',
//           [
//             { text: 'Open Settings', onPress: () => Linking.openSettings() },
//             { text: 'OK' },
//           ],
//         );
//       }
//     } catch (e) {
//       console.warn('Permission request failed', e);
//       Alert.alert(
//         'Permission error',
//         'Failed to request camera/microphone permissions. You can enable them manually in system settings.',
//         [
//           { text: 'Open Settings', onPress: () => Linking.openSettings() },
//           { text: 'OK' },
//         ],
//       );
//     }
//   };

//   // Auto-request on mount if not granted (one attempt)
//   useEffect(() => {
//     if (
//       !cameraPermission.hasPermission ||
//       !microphonePermission.hasPermission
//     ) {
//       requestPermissions();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // Track mounted state and ensure active recordings are stopped on unmount
//   useEffect(() => {
//     return () => {
//       if (recordingActiveRef.current && cameraRef.current) {
//         try {
//           cameraRef.current.stopRecording();
//         } catch (e) {
//           console.log('Stop on unmount error', e);
//         }
//       }
//     };
//   }, []);

//   return (
//     <View className="flex-1 bg-black">
//       {!videoUri &&
//         (!cameraPermission.hasPermission ||
//         !microphonePermission.hasPermission ? (
//           <View className="flex-1 justify-center items-center px-6">
//             <Text className="text-white text-center mb-4">
//               Camera and microphone access is required to record video.
//             </Text>
//             <CustomButton
//               title="Grant permissions"
//               onPress={requestPermissions}
//               style="bg-plum px-4 py-3"
//               textStyle="text-white"
//             />
//             <TouchableOpacity
//               onPress={() => Linking.openSettings()}
//               className="mt-4"
//             >
//               <Text className="text-xs text-white/70 underline">
//                 Open system settings
//               </Text>
//             </TouchableOpacity>
//           </View>
//         ) : device ? (
//           <Camera
//             ref={cameraRef}
//             style={StyleSheet.absoluteFill}
//             device={device}
//             isActive={true}
//             video={true}
//             audio={true}
//             onError={e => {
//               console.warn('Camera runtime error', e);
//               setError(e?.message ?? 'Camera error');
//             }}
//             onInitialized={() => {
//               setCameraReady(true);
//             }}
//           />
//         ) : (
//           <View className="flex-1 justify-center items-center px-6">
//             <Text className="text-white text-center mb-4">
//               No camera device found. Using system camera fallback.
//             </Text>
//             <CustomButton
//               title="Record with system camera"
//               onPress={recordWithSystemCamera}
//               style="bg-plum px-4 py-3"
//               textStyle="text-white"
//             />
//           </View>
//         ))}
//       {videoUri && (
//         <View className="flex-1">
//           <Video
//             source={{ uri: videoUri }}
//             style={{ flex: 1 }}
//             resizeMode="contain"
//             paused={false}
//             repeat
//           />
//         </View>
//       )}
//       <View className="absolute bottom-0 left-0 right-0 p-5 bg-black/60">
//         {error && <Text className="text-red-400 mb-2 text-sm">{error}</Text>}
//         {!videoUri &&
//           cameraPermission.hasPermission &&
//           microphonePermission.hasPermission &&
//           device && (
//             <View className="flex-row items-center justify-between mb-3">
//               <TouchableOpacity
//                 onPress={toggleCamera}
//                 className="px-2 py-2 rounded bg-white/10 w-[60px]"
//               >
//                 <Text className="text-white text-center text-sm">
//                   {usingFront ? 'Back' : 'Front'}
//                 </Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 onPress={isRecording ? stopRecording : startRecording}
//                 className={`h-14 w-14 rounded-full ${'bg-whiteWithTransparentColor'}`}
//               >
//                 <Text className="text-white font-bold text-[38px] text-center ">
//                   {isRecording ? '■' : '●'}
//                 </Text>
//               </TouchableOpacity>
//               <Text className="text-white font-MulishBold w-[60px] text-center">
//                 {isRecording ? `${formatTime(elapsed)}` : '00:00'}
//               </Text>
//             </View>
//           )}

//         <View className="flex-row justify-between">
//           {videoUri && (
//             <>
//               <CustomButton
//                 title={'Re-record'}
//                 onPress={() => (videoUri ? reset() : navigation.goBack())}
//                 style="bg-redColor px-4 py-3"
//                 textStyle="text-white"
//               />
//               <CustomButton
//                 title="Done"
//                 onPress={finish}
//                 style="bg-purpleColor px-4 py-3 ml-3"
//                 textStyle="text-white"
//               />
//             </>
//           )}
//         </View>
//       </View>
//     </View>
//   );
// };
