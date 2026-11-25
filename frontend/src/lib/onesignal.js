const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
const SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'

function deferred() {
  if (typeof window === 'undefined') return null
  window.OneSignalDeferred = window.OneSignalDeferred || []
  return window.OneSignalDeferred
}

export function oneSignalAvailable() {
  return Boolean(APP_ID) && typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export function loadOneSignal() {
  if (!oneSignalAvailable()) return Promise.resolve(null)
  if (window.__voxoOneSignal) return window.__voxoOneSignal
  window.__voxoOneSignal = new Promise(resolve => {
    const ready = deferred()
    ready.push(async OneSignal => {
      await OneSignal.init({ appId: APP_ID, allowLocalhostAsSecureOrigin: process.env.NODE_ENV !== 'production' })
      resolve(OneSignal)
    })
    if (!document.querySelector(`script[src="${SDK_URL}"]`)) {
      const script = document.createElement('script')
      script.src = SDK_URL
      script.defer = true
      script.onerror = () => resolve(null)
      document.head.appendChild(script)
    }
  })
  return window.__voxoOneSignal
}

export async function setOneSignalIdentity(identity) {
  const OneSignal = await loadOneSignal()
  if (OneSignal && identity) await OneSignal.login(identity)
}

export async function clearOneSignalIdentity() {
  const OneSignal = await loadOneSignal()
  if (OneSignal) await OneSignal.logout()
}

export async function getOneSignalStatus() {
  if (!oneSignalAvailable()) return { available: false, permission: 'unsupported', subscribed: false }
  const OneSignal = await loadOneSignal()
  if (!OneSignal) return { available: false, permission: 'unavailable', subscribed: false }
  return { available: true, permission: OneSignal.Notifications.permission, subscribed: OneSignal.User.PushSubscription.optedIn }
}

export async function requestOneSignalPermission() {
  const OneSignal = await loadOneSignal()
  if (!OneSignal) throw new Error('OneSignal indisponible')
  await OneSignal.Notifications.requestPermission()
  return getOneSignalStatus()
}
