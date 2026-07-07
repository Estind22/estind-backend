import pkg from 'web-push';
const { sendNotification, setVapidDetails } = pkg;

setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    "BEirdPR0gakIz6TkeB-__ypVUR7f9o5Sjup0B8nvERnSxecACY_jdG9p3HEYKQyOjztBcnfTO1GOCQKm-_jvASk",
    "-Q7Pca8kPGHbXnnvD-D3rRgkKK8BST-bDUIdYlzNloY"
);

export const sendPush = (subscription, payload) => {
    // returns a promise
    return sendNotification(subscription, JSON.stringify(payload));
}

// helper to build payload
export const buildCallPayload = ({ phone, initiatedBy, origin }) => {
    return {
        title: 'Call request',
        body: `Tap to call ${phone}`,
        phone,
        initiatedBy,
        origin
    };
}
