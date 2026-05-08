import client from './client';
import ENDPOINTS from './endpoints';

export const requestUpload = async (
	payload: any,
): Promise<any> => {
	try {
		const res = await client.post(ENDPOINTS.media.requestUpload, payload);
		return res.data?.data ?? res.data;
	} catch (err: any) {
		console.log('requestUpload error', err?.response?.status, err?.message);
		throw err;
	}
};


export const confirmUpload = async (
	payload: any,
): Promise<any> => {
	try {
		const res = await client.post(ENDPOINTS.media.confirmUpload, payload);
		return res.data?.data ?? res.data;
	} catch (err: any) {
		console.log('confirmUpload error', err?.response?.status, err?.message);
		throw err;
	}
};