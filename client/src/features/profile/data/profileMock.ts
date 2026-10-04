// src/pages/accounts/User/components/profile/profileMock.ts

export type ProfileStats = {
  followers: string;
  following: string;
  posts: string;
  activity: string;
};

export type ProfileData = {
  name: string;
  handle: string;
  avatarUrl: string;
  coverUrl: string;
  online: boolean;
  stats: ProfileStats;
  quote: string;
  bio: string;
  location: string;
  tags: string[];
};

export const MOCK_PROFILE: ProfileData = {
  name: 'Annette Black',
  handle: '@annblack',
  avatarUrl:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
  coverUrl:
    'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=1200&auto=format&fit=crop&q=80',
  online: true,
  stats: {
    followers: '1.2K',
    following: '287',
    posts: '47',
    activity: 'High',
  },
  quote: '"I create, I think, I develop."',
  bio: 'Designer → Product Thinker. I love clean lines and clear ideas.',
  location: 'Moscow → Berlin',
  tags: ['#Minimalism', '#DesignThinking', '#Photography'],
};