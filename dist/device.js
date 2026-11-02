// A device hint for controls and leaderboard display; never used for permissions.
export function detectMobile(device={}){return device.userAgentData?.mobile===true||/Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(device.userAgent||'')||(device.platform==='MacIntel'&&device.maxTouchPoints>1)}
