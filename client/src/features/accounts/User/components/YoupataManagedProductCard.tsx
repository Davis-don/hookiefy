// src/components/feed/YoupataManagedProductCard.tsx

import ProductCard from './feed/ProductCard';
import YoupataManagedBadge from './YoupataManagedBadge';
import './youpataManagedProductCard.css';

/**
 * Seller contact number — used for both the "Call seller"
 * and "WhatsApp seller" actions. Change this constant when
 * the seller contact moves; nothing else needs to move.
 *
 * Kept in E.164 form (no `+`, no spaces, no leading zero)
 * for the WhatsApp deep link, and a separate display form
 * for the tel: link so the number reads naturally when
 * dialled. If you later pull the number from the product /
 * business record, replace both constants with
 * `cardProps.item.seller_phone` (or wherever it lives) —
 * the rest of the component is unchanged.
 */
const SELLER_PHONE_E164 = '254758420860';        // for wa.me
const SELLER_PHONE_DISPLAY = '+254 758 420 860'; // for tel:

/**
 * WhatsApp deep link. `wa.me` opens the WhatsApp app on
 * mobile and WhatsApp Web on desktop, and pre-fills a
 * chat with the seller.
 *
 * Both the product name AND the product id are embedded
 * in the pre-filled message so the seller can trace
 * exactly which listing the buyer tapped — the name alone
 * is not unique (two listings can share a name, or the
 * name can change between the buyer tapping and the
 * seller reading). The id is stable and unique.
 *
 * `productName` is optional because `FeedItem.name` is
 * typed as `string | undefined` upstream. When the name
 * is missing we fall back to a message that still carries
 * the id, so the seller can look up the product even if
 * the buyer's card rendered without a name.
 */
function buildWhatsAppUrl(
  productId: number | string,
  productName?: string,
): string {
  const label = (productName ?? '').trim();
  const text = encodeURIComponent(
    label
      ? `Hi, I'm interested in "${label}" (product #${productId}) on Youpata.`
      : `Hi, I'm interested in product #${productId} on Youpata.`,
  );
  return `https://wa.me/${SELLER_PHONE_E164}?text=${text}`;
}

/** `tel:` link — opens the dialer on mobile, prompts on desktop. */
function buildCallUrl(): string {
  return `tel:+${SELLER_PHONE_E164}`;
}

type ProductCardProps = React.ComponentProps<typeof ProductCard> & {
  /** Called when the "Pay via M-Pesa" button is pressed. */
  onPurchase: (productId: number) => void;
};

function YoupataManagedProductCard({
  onPurchase,
  ...cardProps
}: ProductCardProps) {
  // Sold out when the backend explicitly says in_stock is false.
  // Matches ProductCard's derivation so the card and the
  // purchase button can never disagree.
  const soldOut = cardProps.item.in_stock === false;

  // Product id is the trace key for both contact actions —
  // pulled once here so every action below uses the same
  // value even if `cardProps.item` is mutated upstream.
  const productId = cardProps.item.id;

  // `FeedItem.name` is `string | undefined` — the helper
  // accepts the optional type and handles the empty case.
  const whatsappUrl = buildWhatsAppUrl(productId, cardProps.item.name);
  const callUrl = buildCallUrl();

  return (
    <div className="youpata-product-card-wrap">
      <ProductCard
        {...cardProps}
        badge={<YoupataManagedBadge size="sm" />}
      />

      <div className="youpata-product-card-actions">
        {/* Primary action — pay via M-Pesa. Hidden entirely
            when sold out (matches the prior behaviour: the
            button slot shows "Sold out" instead). */}
        {soldOut ? (
          <button
            type="button"
            className="youpata-product-card-purchase is-sold-out"
            disabled
            aria-disabled="true"
            title="This product is currently out of stock"
          >
            Sold out
          </button>
        ) : (
          <button
            type="button"
            className="youpata-product-card-purchase"
            onClick={() => onPurchase(productId)}
          >
            Pay via M-Pesa
          </button>
        )}

        {/* Secondary actions — contact the seller directly.
            Kept available even when sold out: a buyer who
            sees "Sold out" should still be able to ask the
            seller when it's back, or arrange a pre-order.

            Both anchors carry `data-product-id` so click
            handlers, analytics, or any future wrapper can
            trace the tap back to the listing without
            re-deriving it from the URL. */}
        <div className="youpata-product-card-contact">
          <a
            className="youpata-product-card-contact-btn is-call"
            href={callUrl}
            data-product-id={productId}
            aria-label={`Call seller at ${SELLER_PHONE_DISPLAY} about product ${productId}`}
          >
            {/* Simple inline phone glyph — kept as inline SVG so
                no icon-font / extra dependency is needed. */}
            <svg
              className="youpata-product-card-contact-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.25 1z"
                fill="currentColor"
              />
            </svg>
            Call seller
          </a>

          <a
            className="youpata-product-card-contact-btn is-whatsapp"
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-product-id={productId}
            aria-label={`Chat with seller on WhatsApp at ${SELLER_PHONE_DISPLAY} about product ${productId}`}
          >
            {/* WhatsApp glyph — same inline-SVG approach. */}
            <svg
              className="youpata-product-card-contact-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.26-8.24zm-3.6 4.1c-.17 0-.45.06-.68.31-.23.25-.9.88-.9 2.14s.92 2.48 1.05 2.65c.13.17 1.79 2.73 4.34 3.83.6.26 1.07.42 1.44.54.6.19 1.15.16 1.58.1.48-.07 1.48-.6 1.69-1.19.21-.59.21-1.09.15-1.19-.06-.1-.23-.16-.48-.28-.25-.13-1.48-.73-1.71-.81-.23-.09-.4-.13-.56.13-.17.25-.65.81-.8.98-.15.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.25-1.49-1.4-1.74-.15-.25-.02-.38.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.36-.77-1.86-.2-.48-.41-.42-.56-.42-.15 0-.31-.02-.48-.02z"
                fill="currentColor"
              />
            </svg>
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

export default YoupataManagedProductCard;