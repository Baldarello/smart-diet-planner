const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeUserToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push messaging is not supported');
    }

    if (!vapidPublicKey) {
        console.error('VAPID public key not found. Push notifications cannot be enabled.');
        throw new Error('VAPID public key not configured.');
    }
    
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
        console.log('User is already subscribed.');
        return subscription;
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
    });

    console.log('User subscribed:', subscription);
    // In a real app, send this subscription to your backend server.
    // await fetch('/api/subscribe', {
    //     method: 'POST',
    //     body: JSON.stringify(subscription),
    //     headers: { 'Content-Type': 'application/json' }
    // });
    
    return subscription;
}

export async function unsubscribeUserFromPush() {
    if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
        const successful = await subscription.unsubscribe();
        if (successful) {
            console.log('User unsubscribed.');
            // In a real app, also notify the backend to remove the subscription.
        } else {
            throw new Error('Unsubscription failed.');
        }
    }
}
