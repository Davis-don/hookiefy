// sampleNotificationData.ts
// Sample notification data with 10 different notifications

export interface NotificationData {
  id: string | number
  name: string
  title: string
  description: string
  imgUrl: string
  timestamp?: string
  isRead?: boolean
}

export const sampleNotifications: NotificationData[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    title: "✨ Sarah wants to connect",
    description: "Hey! I saw your profile and would love to get to know you better.",
    imgUrl: "https://randomuser.me/api/portraits/women/1.jpg",
    timestamp: "2 minutes ago",
    isRead: false
  },
  {
    id: 2,
    name: "Michael Chen",
    title: "🎯 New hookup request from Michael",
    description: "I think we have a lot in common. Let's chat!",
    imgUrl: "https://randomuser.me/api/portraits/men/2.jpg",
    timestamp: "15 minutes ago",
    isRead: false
  },
  {
    id: 3,
    name: "Emma Rodriguez",
    title: "💕 Emma is interested",
    description: "Your photos caught my attention. Would you like to meet?",
    imgUrl: "https://randomuser.me/api/portraits/women/3.jpg",
    timestamp: "1 hour ago",
    isRead: false
  },
  {
    id: 4,
    name: "David Kim",
    title: "🌟 David sent you a request",
    description: "I'm new to this area and looking to meet interesting people.",
    imgUrl: "https://randomuser.me/api/portraits/men/4.jpg",
    timestamp: "3 hours ago",
    isRead: true
  },
  {
    id: 5,
    name: "Olivia Williams",
    title: "💫 Olivia wants to hang out",
    description: "Love your vibe! Let's grab coffee sometime?",
    imgUrl: "https://randomuser.me/api/portraits/women/5.jpg",
    timestamp: "5 hours ago",
    isRead: false
  },
  {
    id: 6,
    name: "James Taylor",
    title: "🎸 James is looking for a hookup",
    description: "Music lover here. Would love to connect with you!",
    imgUrl: "https://randomuser.me/api/portraits/men/6.jpg",
    timestamp: "1 day ago",
    isRead: true
  },
  {
    id: 7,
    name: "Sophia Martinez",
    title: "🌸 New request from Sophia",
    description: "You seem really fun! Let's plan something exciting.",
    imgUrl: "https://randomuser.me/api/portraits/women/7.jpg",
    timestamp: "1 day ago",
    isRead: false
  },
  {
    id: 8,
    name: "Daniel Lee",
    title: "⚡ Daniel wants to connect",
    description: "Adventure seeker here. Looking for someone to explore with.",
    imgUrl: "https://randomuser.me/api/portraits/men/8.jpg",
    timestamp: "2 days ago",
    isRead: true
  },
  {
    id: 9,
    name: "Isabella White",
    title: "💖 Isabella sent you a hookup request",
    description: "Your profile made me smile. Would love to chat!",
    imgUrl: "https://randomuser.me/api/portraits/women/9.jpg",
    timestamp: "3 days ago",
    isRead: false
  },
  {
    id: 10,
    name: "Alexander Brown",
    title: "🔥 Alexander is interested",
    description: "Let's make some memories together. Hit me up!",
    imgUrl: "https://randomuser.me/api/portraits/men/10.jpg",
    timestamp: "5 days ago",
    isRead: true
  }
]