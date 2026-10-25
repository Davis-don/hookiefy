// src/components/feed/YoupataManagedPostCard.tsx

import PostCard from './feed/PostCard';
import YoupataManagedBadge from './YoupataManagedBadge';

type PostCardProps = React.ComponentProps<typeof PostCard>;

function YoupataManagedPostCard(props: PostCardProps) {
  return (
    <PostCard
      {...props}
      badge={<YoupataManagedBadge size="sm" />}
    />
  );
}

export default YoupataManagedPostCard;