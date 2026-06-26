export interface YourActivity {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  time: string;
  message: string;
  status: 'accepted' | 'declined';
  respondedAt: string;
}

export const yourActivities: YourActivity[] = [
  {
    id: "act_1",
    senderId: "user_8",
    senderName: "Alice Wanjiru",
    senderAvatar: "https://i.pravatar.cc/150?img=10",
    time: "1 day ago",
    message: "Let's hang out!",
    status: "accepted",
    respondedAt: "1 day ago"
  },
  {
    id: "act_2",
    senderId: "user_9",
    senderName: "Bob Otieno",
    senderAvatar: "https://i.pravatar.cc/150?img=20",
    time: "2 days ago",
    message: "Hey, interested?",
    status: "declined",
    respondedAt: "2 days ago"
  },
  {
    id: "act_3",
    senderId: "user_10",
    senderName: "Carol Kemunto",
    senderAvatar: "https://i.pravatar.cc/150?img=15",
    time: "3 days ago",
    message: "Would love to meet you!",
    status: "accepted",
    respondedAt: "3 days ago"
  },
  {
    id: "act_4",
    senderId: "user_11",
    senderName: "David Omondi",
    senderAvatar: "https://i.pravatar.cc/150?img=30",
    time: "4 days ago",
    message: "Are you free this weekend?",
    status: "declined",
    respondedAt: "4 days ago"
  },
  {
    id: "act_5",
    senderId: "user_12",
    senderName: "Eunice Achieng",
    senderAvatar: "https://i.pravatar.cc/150?img=40",
    time: "5 days ago",
    message: "I saw your profile and I'm interested!",
    status: "accepted",
    respondedAt: "5 days ago"
  },
  {
    id: "act_6",
    senderId: "user_13",
    senderName: "Frank Odhiambo",
    senderAvatar: "https://i.pravatar.cc/150?img=50",
    time: "1 week ago",
    message: "Let's grab coffee sometime!",
    status: "declined",
    respondedAt: "1 week ago"
  }
];