export type RequestStatus = "pending" | "accepted" | "rejected";

export interface IFriendRequest {
  sender: string;
  receiver: string;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFriendship {
  user1: string;
  user2: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FriendListEntry {
  id: string;
  name: string;
  username: string;
  image: string;
  online: boolean;
  lastActiveAt: Date;
}
