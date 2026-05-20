import Pusher from "pusher";

const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

type EventPayload = Record<string, unknown>;

export async function triggerConversationEvent(
  conversationId: string,
  event: string,
  data: EventPayload,
): Promise<void> {
  await pusherServer.trigger(`private-chat-${conversationId}`, event, data);
}

export async function triggerUserEvent(
  userId: string,
  event: string,
  data: EventPayload,
): Promise<void> {
  await pusherServer.trigger(`private-user-${userId}`, event, data);
}

export async function triggerPresenceEvent(
  event: string,
  data: EventPayload,
): Promise<void> {
  await pusherServer.trigger("presence-chat-app", event, data);
}

export { pusherServer };
export default pusherServer;
