// src/pages/Home/sections/YoupataFeedSection.tsx

import { useBusinessFeed } from '../../hooks/useBusinessFeed';

import FeedSectionBase from './FeedSectionBase';
import YoupataManagedPostCard from '../YoupataManagedPostCard';
import YoupataManagedProductCard from '../YoupataManagedProductCard';

type Props = {
  onOpenBusiness: (id: number) => void;
  onOpenPost: (id: number) => void;
  onOpenProduct: (id: number, youpata?: boolean) => void;
  onPurchase: (id: number) => void;
};

function YoupataFeedSection({
  onOpenBusiness,
  onOpenPost,
  onOpenProduct,
  onPurchase,
}: Props) {
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
    tab: 'youpata',
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
      emptyTitle="No Youpata-managed items yet"
      emptySub="Items managed directly by Youpata will show up here."
      renderItem={(item) =>
        item.kind === 'post' ? (
          <YoupataManagedPostCard
            item={item}
            onOpenBusiness={onOpenBusiness}
            onOpenPost={onOpenPost}
          />
        ) : (
          <YoupataManagedProductCard
            item={item}
            onOpenBusiness={onOpenBusiness}
            onOpenProduct={(id) => onOpenProduct(id, true)}
            onPurchase={onPurchase}
          />
        )
      }
    />
  );
}

export default YoupataFeedSection;