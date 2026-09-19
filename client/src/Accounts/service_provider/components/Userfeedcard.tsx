// Userfeedcard.tsx
import { useEffect, useRef, useState } from 'react'
import {
  FiStar,
  FiHeart,
  FiPackage,
  FiTool,
  FiMapPin,
  FiExternalLink,
  FiImage,
  FiPhone,
  FiUserPlus,
  FiSend,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi'
import './userfeedcard.css'
import type {
  FeedItem,
  FeedUser,
  FeedService,
  FeedAdvert,
} from './Userservicesesfeed'
import { usePostActionStore } from '../../common/store/usepaymentstore'
import { useAuthStore } from '../../../store/authtokenstore'
import Like from './stories/Like'
import Share from './stories/Share'

/* ────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────── */

const PRICING_UNITS: Record<string, string> = {
  per_hour: 'Per Hour',
  per_day: 'Per Day',
  per_week: 'Per Week',
  per_month: 'Per Month',
  per_job: 'Per Job',
  per_item: 'Per Item',
}

function formatPrice(price: string, unit: string) {
  const num = Number(price)
  if (Number.isNaN(num) || num === 0) return '—'
  const unitLabel = PRICING_UNITS[unit] ?? unit
  const amount = `KES ${num.toLocaleString()}`
  return unitLabel ? `${amount} · ${unitLabel}` : amount
}

function initials(first?: string, last?: string) {
  const f = (first || '?').charAt(0).toUpperCase()
  const l = (last || '?').charAt(0).toUpperCase()
  return `${f}${l}`
}

/* ────────────────────────────────────────────────────────
   Description with see-more toggle
   ──────────────────────────────────────────────────────── */

interface DescriptionProps {
  text: string
}

function Description({ text }: DescriptionProps) {
  const [expanded, setExpanded] = useState(false)

  if (!text) return null

  const likelyLong = text.length > 160

  return (
    <div className="ufc-desc-wrap">
      <p
        className={`ufc-post-description ${
          expanded ? 'ufc-post-description-expanded' : ''
        }`}
      >
        {text}
      </p>

      {likelyLong && (
        <button
          type="button"
          className="ufc-see-more"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? 'See less' : 'See more'}
        </button>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────
   Single-image media
   ──────────────────────────────────────────────────────── */

interface SingleImageProps {
  src: string
  alt: string
  count?: number
}

function SingleImage({ src, alt, count }: SingleImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  if (errored) {
    return (
      <div className="ufc-media ufc-media-empty">
        <FiImage className="ufc-media-icon" />
      </div>
    )
  }

  return (
    <div className="ufc-media">
      {!loaded && (
        <div className="ufc-media-skeleton" aria-hidden="true" />
      )}

      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`ufc-media-img ${
          loaded ? 'ufc-media-img-loaded' : 'ufc-media-img-loading'
        }`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setErrored(true)
          setLoaded(true)
        }}
      />

      {count && count > 1 && loaded && (
        <span className="ufc-media-count">
          <FiImage /> {count}
        </span>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────
   Carousel
   ──────────────────────────────────────────────────────── */

interface CarouselImage {
  id: number
  image_url: string
}

interface CarouselProps {
  images: CarouselImage[]
  alt: string
}

function Carousel({ images, alt }: CarouselProps) {
  const [index, setIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [paused, setPaused] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startTimeRef = useRef(0)

  const count = images.length

  const goTo = (i: number) => {
    const next = ((i % count) + count) % count
    setIndex(next)
  }

  const goNext = () => goTo(index + 1)
  const goPrev = () => goTo(index - 1)

  useEffect(() => {
    if (paused || count <= 1) return

    const t = setInterval(() => {
      setIndex((i) => (i + 1) % count)
    }, 4500)

    return () => clearInterval(t)
  }, [paused, count])

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    startXRef.current = e.clientX
    startTimeRef.current = Date.now()
    setPaused(true)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const dx = e.clientX - startXRef.current
    setDragX(dx)
  }

  const onPointerUp = () => {
    if (!isDragging) return

    const width = containerRef.current?.offsetWidth ?? 1
    const duration = Date.now() - startTimeRef.current
    const velocity = Math.abs(dragX) / Math.max(duration, 1)

    const passedThreshold = Math.abs(dragX) > width * 0.25
    const isFlick = velocity > 0.5 && Math.abs(dragX) > 30

    if ((passedThreshold || isFlick) && dragX < 0) {
      goNext()
    } else if ((passedThreshold || isFlick) && dragX > 0) {
      goPrev()
    }

    setIsDragging(false)
    setDragX(0)

    setTimeout(() => setPaused(false), 2500)
  }

  const onPointerCancel = () => {
    setIsDragging(false)
    setDragX(0)
    setTimeout(() => setPaused(false), 2500)
  }

  const width = containerRef.current?.offsetWidth ?? 1
  const dragPercent = isDragging ? (dragX / width) * 100 : 0
  const translatePercent = -(index * 100) + dragPercent

  return (
    <div
      className="ufc-carousel"
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={`ufc-carousel-track ${
          isDragging ? 'ufc-carousel-track-dragging' : ''
        }`}
        style={{ transform: `translateX(${translatePercent}%)` }}
      >
        {images.map((img) => (
          <div className="ufc-carousel-slide" key={img.id}>
            <img
              src={img.image_url}
              alt={alt}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="ufc-carousel-img"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="ufc-carousel-nav ufc-carousel-nav-prev"
        onClick={goPrev}
        aria-label="Previous image"
      >
        <FiChevronLeft />
      </button>
      <button
        type="button"
        className="ufc-carousel-nav ufc-carousel-nav-next"
        onClick={goNext}
        aria-label="Next image"
      >
        <FiChevronRight />
      </button>

      <div className="ufc-carousel-dots" role="tablist">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Go to image ${i + 1}`}
            className={`ufc-carousel-dot ${
              i === index ? 'ufc-carousel-dot-active' : ''
            }`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>

      <span className="ufc-carousel-count">
        {index + 1} / {count}
      </span>
    </div>
  )
}

/* ────────────────────────────────────────────────────────
   SERVICE POST
   Order: header → media → action bar → body → footer
   ──────────────────────────────────────────────────────── */

function ServicePost({ service }: { service: FeedService }) {
  const isHookup = service.listing_type === 'hookup'
  const open = usePostActionStore((s) => s.open)
  const { access } = useAuthStore()

  const userId: number =
    (access as unknown as { id?: number })?.id ??
    Number(localStorage.getItem('user_id') ?? 0)

  const handleGetContact = () => {
    open(service.id)
  }

  const feedImages: CarouselImage[] =
    Array.isArray((service as any).images) &&
    (service as any).images.length > 0
      ? (service as any).images.map(
          (i: { id: number; image_url: string }) => ({
            id: i.id,
            image_url: i.image_url,
          })
        )
      : service.primary_image_url
      ? [{ id: 0, image_url: service.primary_image_url }]
      : []

  return (
    <article
      className={`ufc-post ufc-post-service ${
        isHookup ? 'ufc-post-hookup' : ''
      }`}
    >
      {/* Header */}
      <header className="ufc-header">
        {service.provider ? (
          <>
            {service.provider.profile_image_url ? (
              <img
                src={service.provider.profile_image_url}
                alt={service.provider.full_name}
                className="ufc-header-avatar"
                loading="lazy"
              />
            ) : (
              <div className="ufc-header-avatar ufc-header-avatar-fallback">
                {initials(
                  service.provider.first_name,
                  service.provider.last_name
                )}
              </div>
            )}

            <div className="ufc-header-meta">
              <span className="ufc-header-name">
                {service.provider.full_name || 'Provider'}
              </span>
              <span className="ufc-header-sub">
                {service.provider.role === 'serviceprovider'
                  ? 'Service Provider'
                  : service.provider.role}
                {service.category?.name
                  ? ` · ${service.category.name}`
                  : ''}
              </span>
            </div>
          </>
        ) : (
          <div className="ufc-header-meta">
            <span className="ufc-header-name">
              {service.category?.name || 'Listing'}
            </span>
          </div>
        )}
      </header>

      {/* Media */}
      {feedImages.length > 1 ? (
        <Carousel images={feedImages} alt={service.title} />
      ) : feedImages.length === 1 ? (
        <SingleImage
          src={feedImages[0].image_url}
          alt={service.title}
          count={service.image_count}
        />
      ) : null}

      {/* ACTION BAR — Like + Share, immediately below the image */}
      <div className="ufc-action-bar">
        <div className="ufc-actions">
          <Like
            postId={service.id}
            userId={userId}
            contentType="clientservice"
            size="md"
          />

          <Share
            postId={service.id}
            userId={userId}
            postTitle={service.title}
            contentType="clientservice"
            size="md"
          />
        </div>
      </div>

      {/* Body */}
      <div className="ufc-post-body">
        <div className="ufc-post-tags">
          <span
            className={`ufc-type ufc-type-${service.listing_type}`}
          >
            {service.listing_type === 'service' && (
              <>
                <FiTool /> Service
              </>
            )}
            {service.listing_type === 'product' && (
              <>
                <FiPackage /> Product
              </>
            )}
            {service.listing_type === 'hookup' && (
              <>
                <FiHeart /> Hookup
              </>
            )}
          </span>

          {service.is_featured && (
            <span className="ufc-featured">
              <FiStar /> Featured
            </span>
          )}
        </div>

        <h2 className="ufc-post-title">
          {service.title || 'Untitled listing'}
        </h2>

        <Description text={service.description || ''} />

        {!isHookup ? (
          <div className="ufc-price-row">
            <span className="ufc-price-label">Price</span>
            <span className="ufc-price-value">
              {formatPrice(service.price, service.pricing_unit)}
            </span>
          </div>
        ) : (
          <div className="ufc-price-row ufc-price-row-hookup">
            <span className="ufc-hookup-note">
              Looking for company
            </span>
          </div>
        )}
      </div>

      {/* Footer — Get Contact stays at the bottom */}
      <footer className="ufc-footer">
        <button
          type="button"
          className="ufc-cta ufc-cta-primary"
          onClick={handleGetContact}
        >
          <FiPhone />
          <span>Get Contact</span>
        </button>
      </footer>
    </article>
  )
}

/* ────────────────────────────────────────────────────────
   USER POST
   ──────────────────────────────────────────────────────── */

function UserPost({ user }: { user: FeedUser }) {
  const locationParts = [user.city, user.county, user.country].filter(
    Boolean
  )

  const handleConnect = () => {
    console.log('Connect with user', user.id)
  }

  return (
    <article className="ufc-post ufc-post-user">
      <header className="ufc-header">
        {user.profile_image_url ? (
          <img
            src={user.profile_image_url}
            alt={user.first_name}
            className="ufc-header-avatar"
            loading="lazy"
          />
        ) : (
          <div className="ufc-header-avatar ufc-header-avatar-fallback ufc-header-avatar-user">
            {initials(user.first_name, user.last_name)}
          </div>
        )}

        <div className="ufc-header-meta">
          <span className="ufc-header-name">
            {user.first_name} {user.last_name}
          </span>
          {locationParts.length > 0 && (
            <span className="ufc-header-sub">
              <FiMapPin className="ufc-header-sub-icon" />
              {locationParts.join(', ')}
            </span>
          )}
        </div>
      </header>

      {user.profile_image_url && (
        <SingleImage
          src={user.profile_image_url}
          alt={`${user.first_name} ${user.last_name}`}
        />
      )}

      <div className="ufc-post-body">
        {user.bio && <Description text={user.bio} />}

        {(user.minimum_age ||
          user.maximum_age ||
          user.interested_in_gender) && (
          <div className="ufc-chips">
            {user.interested_in_gender && (
              <span className="ufc-chip">
                Interested in:{' '}
                {user.interested_in_gender === 'M'
                  ? 'Men'
                  : user.interested_in_gender === 'F'
                  ? 'Women'
                  : user.interested_in_gender}
              </span>
            )}
            {(user.minimum_age || user.maximum_age) && (
              <span className="ufc-chip">
                Age: {user.minimum_age ?? '?'}–
                {user.maximum_age ?? '?'}
              </span>
            )}
          </div>
        )}
      </div>

      <footer className="ufc-footer ufc-footer-split">
        <button
          type="button"
          className="ufc-cta ufc-cta-secondary"
          onClick={handleConnect}
        >
          <FiUserPlus />
          <span>Connect</span>
        </button>
        <button
          type="button"
          className="ufc-cta ufc-cta-primary"
          onClick={handleConnect}
        >
          <FiSend />
          <span>Say Hi</span>
        </button>
      </footer>
    </article>
  )
}

/* ────────────────────────────────────────────────────────
   ADVERT POST
   ──────────────────────────────────────────────────────── */

function AdvertPost({ advert }: { advert: FeedAdvert }) {
  const open = () => {
    if (advert.url) {
      window.open(advert.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <article className="ufc-post ufc-post-advert">
      <header className="ufc-header">
        <div className="ufc-header-avatar ufc-header-avatar-advert">
          A
        </div>
        <div className="ufc-header-meta">
          <span className="ufc-header-name">Sponsored</span>
          <span className="ufc-header-sub">Promoted</span>
        </div>
      </header>

      <div className="ufc-post-body">
        <h2 className="ufc-post-title">{advert.title}</h2>
        {advert.description && (
          <Description text={advert.description} />
        )}
      </div>

      {advert.url && (
        <footer className="ufc-footer">
          <button
            type="button"
            className="ufc-cta ufc-cta-primary"
            onClick={open}
          >
            <FiExternalLink />
            <span>Learn more</span>
          </button>
        </footer>
      )}
    </article>
  )
}

/* ────────────────────────────────────────────────────────
   Dispatch
   ──────────────────────────────────────────────────────── */

interface UserfeedcardProps {
  item: FeedItem
}

const Userfeedcard = ({ item }: UserfeedcardProps) => {
  if (item.type === 'service') {
    return <ServicePost service={item.data} />
  }

  if (item.type === 'user') {
    return <UserPost user={item.data} />
  }

  if (item.type === 'advert') {
    return <AdvertPost advert={item.data} />
  }

  return null
}

export default Userfeedcard