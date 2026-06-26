export interface Post {
  id: string;
  firstName: string;
  lastName: string;
  time: string;
  location: string;
  image: string;
  caption: string;
}

export const posts: Post[] = [
  {
    id: "1",
    firstName: "Davis",
    lastName: "Ikou",
    time: "2 hours ago",
    location: "Nairobi, Kenya",
    image:
      "https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?w=800&h=600&fit=crop",
    caption:
      "Just had the most amazing sunset view at the rooftop lounge. The vibe was unmatched! 🌅✨ #NairobiNights #SunsetVibes",
  },
  {
    id: "2",
    firstName: "Jane",
    lastName: "Smith",
    time: "3 hours ago",
    location: "Mombasa, Kenya",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop",
    caption:
      "Beach days are the best days! 🌊☀️ Nothing beats the sound of waves and good company. #BeachLife #Mombasa",
  },
  {
    id: "3",
    firstName: "Mike",
    lastName: "Ochieng",
    time: "5 hours ago",
    location: "Kisumu, Kenya",
    image:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=600&fit=crop",
    caption:
      "Lake Victoria never disappoints! The sunset boat ride was therapeutic. 🚤🌅 #Kisumu #LakeVictoria",
  },
  {
    id: "4",
    firstName: "Sarah",
    lastName: "Akinyi",
    time: "7 hours ago",
    location: "Nakuru, Kenya",
    image:
      "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&h=600&fit=crop",
    caption:
      "Spent the day at Lake Nakuru National Park. Saw flamingos, rhinos, and breathtaking views! 🦩🦏🌿 #Wildlife #Nakuru",
  },
  {
    id: "5",
    firstName: "James",
    lastName: "Mwangi",
    time: "12 hours ago",
    location: "Eldoret, Kenya",
    image:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop",
    caption:
      "Coffee and chill vibes at the new café in town. Perfect spot for creative thinking! ☕💭 #CoffeeLover",
  },
  {
    id: "6",
    firstName: "Faith",
    lastName: "Chebet",
    time: "1 day ago",
    location: "Nairobi, Kenya",
    image:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop",
    caption:
      "Nature therapy at its finest! Hiking through the Ngong Hills was absolutely incredible. 🌄🥾 #NatureLover",
  },
  {
    id: "7",
    firstName: "Peter",
    lastName: "Kiprop",
    time: "2 days ago",
    location: "Naivasha, Kenya",
    image:
      "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?w=800&h=600&fit=crop",
    caption:
      "Camping by Lake Naivasha was a dream! Woke up to hippos grazing and a beautiful sunrise. 🏕️🦛 #Naivasha",
  },
];