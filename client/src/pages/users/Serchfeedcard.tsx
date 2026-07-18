import "./serchfeedcard.css";
import useSearchFeedStore from "./store/sechfeed";

// Define the interface locally
interface SearchFeedCardUser {
  id: string;
  profileImage: string | null;
}

interface SerchfeedcardProps {
  user: SearchFeedCardUser;
}

function Serchfeedcard({ user }: SerchfeedcardProps) {
  const { setSelectedUser } = useSearchFeedStore();

  const handleCardClick = () => {
    console.log('🖱️ Card clicked for user:', user.id);
    // Update the store with the selected user ID
    setSelectedUser(user.id);
  };

  return (
    <div className="search-feed-card" onClick={handleCardClick}>
      <img
        src={user.profileImage || '/default-avatar.png'}
        alt={`User ${user.id}`}
        className="search-feed-card-image"
      />
    </div>
  );
}

export default Serchfeedcard;