// src/pages/Home/sections/PostsFeedSection.tsx

import { useBusinessFeed } from '../../hooks/useBusinessFeed';

import FeedSectionBase from './FeedSectionBase';
import PostCard from '../feed/PostCard';
import YoupataManagedPostCard from '../YoupataManagedPostCard';

type Props = {
  onOpenBusiness: (id: number) => void;
  onOpenPost: (id: number) => void;
};

function PostsFeedSection({ onOpenBusiness, onOpenPost }: Props) {
  const {
    data,
    isLoading,
    isFetching,
    isFetchingMore,
    isError,
    error,
    refetch,
    loadMore,
  } = useBusinessFeed({
    tab: 'posts',
    limit: 10,
  });

  return (
    <FeedSectionBase
      data={data}
      isLoading={isLoading}
      isFetching={isFetching}
      isFetchingMore={isFetchingMore}
      isError={isError}
      error={error as Error | null}
      refetch={refetch}
      loadMore={loadMore}
      emptyTitle="No posts yet"
      emptySub="Posts from other businesses will appear here."
      renderItem={(item) =>
        item.is_youpata_managed ? (
          <YoupataManagedPostCard
            item={item}
            onOpenBusiness={onOpenBusiness}
            onOpenPost={onOpenPost}
          />
        ) : (
          <PostCard
            item={item}
            onOpenBusiness={onOpenBusiness}
            onOpenPost={onOpenPost}
          />
        )
      }
    />
  );
}

export default PostsFeedSection;