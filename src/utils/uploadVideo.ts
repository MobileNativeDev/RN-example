import RNBlobUtil from 'react-native-blob-util';
import { requestUpload, confirmUpload } from '@api/media';
import { normalizeUri } from './additionFunctions';

type UploadRequestResponse = {
  uploadUrl?: string;
  url?: string;
  method?: 'PUT' | 'POST';
  fields?: Record<string, string> | null;
  fileKey?: string;
  key?: string;
  uploadKey?: string;
};

type UploadOptions = {
  path: string;
  filename?: string;
  contentType?: string;
  size?: number;
};

export const uploadVideo = async (opts: UploadOptions): Promise<any> => {
  const { path, filename, contentType, size } = opts;

  const reqPayload = {
    contentType: contentType ?? 'video/mp4',
    size: size ?? undefined,
  };

  let reqRes: UploadRequestResponse;
  try {
    reqRes = await requestUpload(reqPayload);
  } catch (e) {
    console.log('[uploadVideo] requestUpload failed', e);
    throw e;
  }

  const uploadUrl = reqRes?.uploadUrl || reqRes?.url;
  const fileKey = reqRes?.fileKey || reqRes?.key || reqRes?.uploadKey;

  if (!uploadUrl) {
    throw new Error('[uploadVideo] No uploadUrl returned from requestUpload');
  }

  try {
    const method = reqRes?.method ? String(reqRes.method).toUpperCase() : 'PUT';
    const localPath = path.startsWith('file://') ? path.replace('file://', '') : path;

    if (method === 'PUT') {
      await RNBlobUtil.fetch(
        'PUT',
        uploadUrl,
        { 'Content-Type': contentType ?? 'video/mp4' },
        RNBlobUtil.wrap(localPath)
      );
    } else if (method === 'POST') {
      const multipart: any[] = [];
      if (reqRes?.fields) {
        Object.keys(reqRes.fields).forEach((k) => {
          multipart.push({ name: k, data: String(reqRes.fields![k]) });
        });
      }
      multipart.push({
        name: 'file',
        filename: filename ?? 'video.mp4',
        type: contentType ?? 'video/mp4',
        data: RNBlobUtil.wrap(localPath)
      });
      await RNBlobUtil.fetch('POST', uploadUrl, { 'Content-Type': 'multipart/form-data' }, multipart);
    }
  } catch (e) {
    console.log('[uploadVideo] upload to presigned URL failed', e);
    throw e;
  }

  try {
    const confirmRes = await confirmUpload({ fileKey });
    
    const finalUrl = confirmRes?.downloadUrl || confirmRes?.videoUrl || confirmRes?.url || confirmRes?.fileUrl;
    
    if (!finalUrl) {
      console.warn('[uploadVideo] No downloadUrl in confirmUpload response, returning full response');
      return confirmRes;
    }
    
    return finalUrl;
  } catch (e) {
    console.log('[uploadVideo] confirmUpload failed', e);
    throw e;
  }
};

export default async function uploadLocal(fileUri: string) {
  const local = normalizeUri(fileUri);

  const statPath = local.startsWith('file://') ? local.replace('file://', '') : local;

  let size = undefined;
  try {
    const st = await RNBlobUtil.fs.stat(statPath);
    size = typeof st.size === 'string' ? Number(st.size) : st.size;
  } catch (err) {
    console.warn('Failed to stat file for size, continuing without size', err);
  }

  if (typeof size === 'number' && Number.isFinite(size)) {
    const sizeInMB = size / (1024 * 1024);
    const MAX_MB = 60;
    if (sizeInMB > MAX_MB) {
      const message = `Selected video is ${sizeInMB.toFixed(
        2,
      )}MB. Maximum allowed size is ${MAX_MB}MB. Please choose a shorter video.`;
      // try {
      //   Alert.alert('Video too large', message);
      // } catch {}
      throw new Error(message);
    }
  }

  const filename = local.split('/').pop() ?? 'video.mp4';
  const contentType = 'video/mp4'; 

  const result = await uploadVideo({
    path: local,
    filename,      
    contentType,   
    size,       
  });

  return result;
}