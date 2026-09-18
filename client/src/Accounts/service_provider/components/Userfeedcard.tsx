// Userfeedcard.tsx
import { useState } from 'react'
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
} from 'react-icons/fi'
import './userfeedcard.css'
import type {
  FeedItem,
  FeedUser,
  FeedService,
  FeedAdvert,
} from './Userservicesesfeed'

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
   Media
   ──────────────────────────────────────────────────────── */

interface MediaProps {
  src: string
  alt: string
  count?: number
}

function Media({ src, alt, count }: MediaProps) {
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
   SERVICE POST
   ──────────────────────────────────────────────────────── */

function ServicePost({ service }: { service: FeedService }) {
  const isHookup = service.listing_type === 'hookup'

  const handleGetContact = () => {
    console.log('Get contact for service', service.id)
  }

  return (
    <article
      className={`ufc-post ufc-post-service ${
        isHookup ? 'ufc-post-hookup' : ''
      }`}
    >
      {/* Header — no more "⋯" button */}
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

      {service.primary_image_url && (
        <Media
          src={service.primary_image_url}
          alt={service.title}
          count={service.image_count}
        />
      )}

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

        {service.description && (
          <p className="ufc-post-description">
            {service.description}
          </p>
        )}

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
        <Media
          src={user.profile_image_url}
          alt={`${user.first_name} ${user.last_name}`}
        />
      )}

      <div className="ufc-post-body">
        {user.bio && (
          <p className="ufc-post-description">{user.bio}</p>
        )}

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
          <p className="ufc-post-description">
            {advert.description}
          </p>
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