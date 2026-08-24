// Resolve the active device key by matching the configured media queries, then
// falling back to the first configured device (finally "desktop").
export function detectDeviceKey() {
  const devices = Object.values(window.motionkitData?.device_config || {});
  for (const d of devices) {
    if (!d?.mediaQuery) continue;
    try {
      if (window.matchMedia(d.mediaQuery).matches) return d.key;
    } catch (e) {
      /* invalid mq */
    }
  }
  return devices[0]?.key || "desktop";
}
