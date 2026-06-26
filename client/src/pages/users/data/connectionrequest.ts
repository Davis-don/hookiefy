export interface ConnectionRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  time: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
}

export const connectionRequests: ConnectionRequest[] = [
  {
    id: "req_1",
    senderId: "user_1",
    senderName: "Davis Ikou",
    senderAvatar: "https://i.pravatar.cc/150?img=11",
    time: "2 minutes ago",
    message: "Hi, would love to connect!",
    status: "pending"
  },
  {
    id: "req_2",
    senderId: "user_2",
    senderName: "Jane Smith",
    senderAvatar: "https://i.pravatar.cc/150?img=5",
    time: "15 minutes ago",
    message: "Hey! Saw your profile and wanted to say hi 👋",
    status: "pending"
  },
  {
    id: "req_3",
    senderId: "user_3",
    senderName: "Mike Ochieng",
    senderAvatar: "https://i.pravatar.cc/150?img=33",
    time: "1 hour ago",
    message: "Great photos! Let's connect.",
    status: "pending"
  },
  {
    id: "req_4",
    senderId: "user_4",
    senderName: "Sarah Akinyi",
    senderAvatar: "https://i.pravatar.cc/150?img=44",
    time: "3 hours ago",
    message: "Would love to meet up!",
    status: "pending"
  },
  {
    id: "req_5",
    senderId: "user_5",
    senderName: "James Mwangi",
    senderAvatar: "https://i.pravatar.cc/150?img=22",
    time: "5 hours ago",
    message: "Hey, are you free this weekend?",
    status: "pending"
  },
  {
    id: "req_6",
    senderId: "user_6",
    senderName: "Faith Chebet",
    senderAvatar: "https://i.pravatar.cc/150?img=25",
    time: "12 hours ago",
    message: "I saw your profile and I'm interested! 😊",
    status: "pending"
  },
  {
    id: "req_7",
    senderId: "user_7",
    senderName: "Peter Kiprop",
    senderAvatar: "https://i.pravatar.cc/150?img=55",
    time: "1 day ago",
    message: "Let's grab coffee sometime!",
    status: "pending"
  }
];