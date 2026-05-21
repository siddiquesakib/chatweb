import Pusher from "pusher";

type EventPayload = Record<string, unknown>;

let pusherServer: Pusher | null = null;

function getPusher(): Pusher {
  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return pusherServer;
}

export async function triggerConversationEvent(
  conversationId: string,
  event: string,
  data: EventPayload,
): Promise<void> {
  await getPusher().trigger(`private-chat-${conversationId}`, event, data);
}

export async function triggerUserEvent(
  userId: string,
  event: string,
  data: EventPayload,
): Promise<void> {
  await getPusher().trigger(`private-user-${userId}`, event, data);
}

export async function triggerPresenceEvent(
  event: string,
  data: EventPayload,
): Promise<void> {
  await getPusher().trigger("presence-chat-app", event, data);
}

export function getPusherClient(): Pusher {
  return getPusher();
}
