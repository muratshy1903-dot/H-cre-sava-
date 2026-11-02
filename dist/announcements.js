export const RECORD_NOTICE_MS=60*60*1000;
export function activeRecordNotice(record,now=Date.now()){
 if(!record||!record.isRecord||!Number.isFinite(record.at)||now>=record.at+RECORD_NOTICE_MS)return null;
 return {...record,expiresAt:record.at+RECORD_NOTICE_MS};
}
