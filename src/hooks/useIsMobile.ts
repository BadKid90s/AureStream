import { useSyncExternalStore } from 'react';

function getMobileSnapshot() {
  return window.innerWidth < 768;
}

function subscribe(cb: () => void) {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getMobileSnapshot, () => false);
}
