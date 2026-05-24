type MobileToastType = "success" | "error";

interface MobileToastEvent {
  message: string;
  type: MobileToastType;
}

const EVENT_NAME = "mg-mobile-toast";

export function mobileToast(message: string, type: MobileToastType = "success") {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { message, type } }));
}

export function onMobileToast(handler: (e: MobileToastEvent) => void) {
  const listener = ((e: CustomEvent<MobileToastEvent>) => handler(e.detail)) as EventListener;
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
