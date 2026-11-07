// src/pages/Home/sections/ProductsFeedSection.tsx

import { useBusinessFeed } from '../../hooks/useBusinessFeed';

import FeedSectionBase from './FeedSectionBase';
import ProductCard from '../feed/ProductCard';
import YoupataManagedProductCard from '../YoupataManagedProductCard';

type Props = {
  onOpenBusiness: (id: number) => void;
  onOpenProduct: (id: number, youpata?: boolean) => void;
  onPurchase: (id: number) => void;
};

function ProductsFeedSection({
  onOpenBusiness,
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
    tab: 'products',
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
      emptyTitle="No products yet"
      emptySub="Products from other businesses will appear here."
      renderItem={(item) =>
        item.is_youpata_managed ? (
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
        )
      }
    />
  );
}

export default ProductsFeedSection;