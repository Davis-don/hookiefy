import './home.css'
import { FaRegHeart, FaHeart, FaRegComment, FaShare, FaBookmark, FaRegBookmark } from "react-icons/fa";
import { useState } from 'react';

function Home() {
  const [liked, setLiked] = useState<{ [key: number]: boolean }>({});
  const [saved, setSaved] = useState<{ [key: number]: boolean }>({});

  const toggleLike = (postId: number) => {
    setLiked(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const toggleSave = (postId: number) => {
    setSaved(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const posts = [
    {
      id: 1,
      username: "Davis Ikou",
      handle: "@davis_ikou",
      avatar: "https://i.pravatar.cc/150?img=11",
      time: "2 hours ago",
      location: "Nairobi, Kenya",
      image: "https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?w=800&h=600&fit=crop",
      caption: "Just had the most amazing sunset view at the rooftop lounge. The vibe was unmatched! 🌅✨ #NairobiNights #SunsetVibes",
      likes: 1234,
      comments: 89,
      shares: 45
    },
    {
      id: 2,
      username: "Jane Smith",
      handle: "@jane_smith",
      avatar: "https://i.pravatar.cc/150?img=5",
      time: "3 hours ago",
      location: "Mombasa, Kenya",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop",
      caption: "Beach days are the best days! 🌊☀️ Nothing beats the sound of waves and good company. #BeachLife #Mombasa",
      likes: 567,
      comments: 42,
      shares: 23
    },
    {
      id: 3,
      username: "Mike Ochieng",
      handle: "@mike_ochieng",
      avatar: "https://i.pravatar.cc/150?img=33",
      time: "5 hours ago",
      location: "Kisumu, Kenya",
      image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=600&fit=crop",
      caption: "Lake Victoria never disappoints! The sunset boat ride was therapeutic. 🚤🌅 #Kisumu #LakeVictoria",
      likes: 892,
      comments: 67,
      shares: 34
    },
    {
      id: 4,
      username: "Sarah Akinyi",
      handle: "@sarah_akinyi",
      avatar: "https://i.pravatar.cc/150?img=44",
      time: "7 hours ago",
      location: "Nakuru, Kenya",
      image: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&h=600&fit=crop",
      caption: "Spent the day at Lake Nakuru National Park. Saw flamingos, rhinos, and the most breathtaking views! 🦩🦏🌿 #Wildlife #Nakuru",
      likes: 2301,
      comments: 156,
      shares: 89
    },
    {
      id: 5,
      username: "James Mwangi",
      handle: "@james_mwangi",
      avatar: "https://i.pravatar.cc/150?img=22",
      time: "12 hours ago",
      location: "Eldoret, Kenya",
      image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop",
      caption: "Coffee and chill vibes at the new café in town. Perfect spot for creative thinking! ☕💭 #Eldoret #CoffeeLover",
      likes: 445,
      comments: 38,
      shares: 12
    },
    {
      id: 6,
      username: "Faith Chebet",
      handle: "@faith_chebet",
      avatar: "https://i.pravatar.cc/150?img=25",
      time: "1 day ago",
      location: "Nairobi, Kenya",
      image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop",
      caption: "Nature therapy at its finest! Hiking through the Ngong Hills was absolutely incredible. 🌄🥾 #NgongHills #NatureLover",
      likes: 678,
      comments: 54,
      shares: 27
    },
    {
      id: 7,
      username: "Peter Kiprop",
      handle: "@peter_kiprop",
      avatar: "https://i.pravatar.cc/150?img=55",
      time: "2 days ago",
      location: "Naivasha, Kenya",
      image: "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?w=800&h=600&fit=crop",
      caption: "Camping by Lake Naivasha was a dream! Woke up to hippos grazing and the most beautiful sunrise. 🏕️🦛 #Naivasha #Camping",
      likes: 1567,
      comments: 112,
      shares: 56
    }
  ];

  // Story avatars with real images - using string only, no null
  const stories = [
    { id: 1, name: "Your Story", image: "", isAdd: true },
    { id: 2, name: "Jane Smith", image: "https://i.pravatar.cc/150?img=5" },
    { id: 3, name: "Mike Ochieng", image: "https://i.pravatar.cc/150?img=33" },
    { id: 4, name: "Sarah Akinyi", image: "https://i.pravatar.cc/150?img=44" },
    { id: 5, name: "James Mwangi", image: "https://i.pravatar.cc/150?img=22" },
    { id: 6, name: "Faith Chebet", image: "https://i.pravatar.cc/150?img=25" },
    { id: 7, name: "Peter Kiprop", image: "https://i.pravatar.cc/150?img=55" },
    { id: 8, name: "Grace Nekesa", image: "https://i.pravatar.cc/150?img=60" },
  ];

  return (
    <div className="user-feed">
      <div className="user-feed-header">
        <h4>Feed</h4>
        <div className="feed-header-actions">
          <button className="feed-header-btn">Following</button>
          <button className="feed-header-btn feed-header-active">For You</button>
        </div>
      </div>
      
      {/* Story Circles */}
      <div className="user-stories">
        {stories.map((story) => (
          <div className="story-circle" key={story.id}>
            <div className={`story-avatar ${story.isAdd ? 'story-add-avatar' : ''}`}>
              {story.isAdd ? (
                <span className="story-add-icon">+</span>
              ) : (
                <img src={story.image} alt={story.name} className="story-avatar-img" />
              )}
            </div>
            <span>{story.name}</span>
          </div>
        ))}
      </div>

      {/* Posts */}
      {posts.map((post) => (
        <div className="user-post" key={post.id}>
          <div className="post-header">
            <img 
              src={post.avatar} 
              alt={post.username} 
              className="post-avatar-img" 
            />
            <div className="post-user-info">
              <div className="post-user-name">
                <h5>{post.username}</h5>
                <span className="post-handle">{post.handle}</span>
              </div>
              <div className="post-meta">
                <span>{post.time}</span>
                <span className="post-dot">•</span>
                <span>{post.location}</span>
              </div>
            </div>
          </div>

          <div className="post-image-wrapper">
            <img 
              src={post.image} 
              alt={post.caption} 
              className="post-image-content" 
              loading="lazy"
            />
          </div>

          <div className="post-actions-row">
            <div className="post-actions-left">
              <button 
                className={`post-action-btn ${liked[post.id] ? 'liked' : ''}`}
                onClick={() => toggleLike(post.id)}
              >
                {liked[post.id] ? <FaHeart className="heart-icon" /> : <FaRegHeart />}
              </button>
              <button className="post-action-btn">
                <FaRegComment />
              </button>
              <button className="post-action-btn">
                <FaShare />
              </button>
            </div>
            <div className="post-actions-right">
              <button 
                className={`post-action-btn ${saved[post.id] ? 'saved' : ''}`}
                onClick={() => toggleSave(post.id)}
              >
                {saved[post.id] ? <FaBookmark /> : <FaRegBookmark />}
              </button>
            </div>
          </div>

          <div className="post-likes">
            <FaHeart className="likes-heart-icon" />
            <span>{liked[post.id] ? post.likes + 1 : post.likes} likes</span>
          </div>

          <div className="post-caption">
            <strong>{post.username}</strong> {post.caption}
          </div>

          <div className="post-comments">
            <span>View all {post.comments} comments</span>
          </div>

          <div className="post-comment-input">
            <input type="text" placeholder="Add a comment..." />
            <button>Post</button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default Home