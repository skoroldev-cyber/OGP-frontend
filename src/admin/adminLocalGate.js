const raw = typeof import.meta !== 'undefined' ? import.meta.env ?? {} : {};

const enabled = raw.PROD ? false : String(raw.VITE_ADMIN_LOCAL_GATE ?? 'true').trim() !== 'false';

export const ADMIN_LOCAL_GATE = Object.freeze({ enabled });

export default ADMIN_LOCAL_GATE;
