export const handleFcmBackgroundMessage = async (remoteMessage: any) => {
  console.log('[FCM] background message:', remoteMessage?.data);
};
