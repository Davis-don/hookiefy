// src/pages/Home/sections/AllFeedSection.tsx

import { useBusinessFeed } from '../../hooks/useBusinessFeed';

import FeedSectionBase from './FeedSectionBase';
import PostCard from '../feed/PostCard';
import ProductCard from '../feed/ProductCard';
import YoupataManagedPostCard from '../YoupataManagedPostCard';
import YoupataManagedProductCard from '../YoupataManagedProductCard';

type Props = {
  onOpenBusiness: (id: number) => void;
  onOpenPost: (id: number) => void;
  onOpenProduct: (id: number, youpata?: boolean) => void;
  onPurchase: (id: number) => void;
};

function AllFeedSection({
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
    tab: 'all',
    limit: 10,
    kind: 'all',
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
      emptyTitle="Nothing to show yet"
      emptySub="When other businesses publish posts or products, they'll appear here."
      renderItem={(item) => {
        const youpata = item.is_youpata_managed;

        if (item.kind === 'post') {
          return youpata ? (
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
          );
        }

        return youpata ? (
          <YoupataManagedProductCard
            item={item}
            onOpenBusiness={onOpenBusiness}
            onOpenProduct={(id) => onOpenProduct(id, true)}
            onPurchase={onPurchase}
          />
        ) : (
          <ProductCard
            item={item}
            onOpenBusiness={onOpenBusiness}
            onOpenProduct={onOpenProduct}
          />
        );
      }}
    />
  );
}

export default AllFeedSection;