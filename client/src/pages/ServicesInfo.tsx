// ServicesInfo.tsx — public standalone viewer for a single listing
import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  FiArrowLeft,
  FiStar,
  FiTool,
  FiPackage,
  FiHeart,
  FiEye,
  FiEyeOff,
  FiChevronLeft,
  FiChevronRight,
  FiImage,
  FiCalendar,
  FiTag,
  FiDollarSign,
  FiMoreHorizontal,
  FiMapPin,
} from 'react-icons/fi'

import Spinner from '../components/Publicspinner/Spinner'

// ⚠️ VERIFY THESE PATHS
import Like from '../Accounts/service_provider/components/stories/Like'
import Share from '../Accounts/service_provider/components/stories/Share'

import './servicesinfo.css'

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */

type ListingType = 'service' | 'product' | 'hookup'

interface ServiceCategory {
  id: number
  name: string
  slug: string
}

interface ServiceProvider {
  id: number
  first_name: string
  last_name: string
  full_name: string
  profile_image_url: string | null
  role: string
  city?: string | null
  county?: string | null
  country?: string | null
}

interface ServiceImage {
  id: number
  image_url: string
  image_public_id: string
  is_primary: boolean
  display_order: number
}

interface Service {
  id: number
  listing_type: ListingType
  title: string
  description: string
  category: ServiceCategory
  price: string
  pricing_unit: string
  images: ServiceImage[]
  primary_image_url: string | null
  image_count: number
  is_active: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
  provider?: ServiceProvider | null
  likes_count?: number
  is_liked?: boolean
}

const PRICING_UNITS: Record<string, string> = {
  per_hour: 'Per Hour',
  per_day: 'Per Day',
  per_week: 'Per Week',
  per_month: 'Per Month',
  per_job: 'Per Job',
  per_item: 'Per Item',
}

/* ────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────── */

function formatPrice(price: string, unit: string) {
  const num = Number(price)
  if (Number.isNaN(num)) return '—'
  const amount = `KES ${num.toLocaleString()}`
  const unitLabel = PRICING_UNITS[unit]
  return unitLabel ? `${amount} · ${unitLabel}` : amount
}

function formatUnit(unit: string) {
  return PRICING_UNITS[unit] || unit
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return formatDate(iso)
}

function initialsFromProvider(p?: ServiceProvider | null) {
  if (!p) return '?'
  const f = (p.first_name || '').charAt(0).toUpperCase()
  const l = (p.last_name || '').charAt(0).toUpperCase()
  return `${f}${l}` || '?'
}

function providerName(p?: ServiceProvider | null) {
  if (!p) return 'Youpata provider'
  return (
    p.full_name ||
    `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() ||
    `Provider #${p.id}`
  )
}

/* ────────────────────────────────────────────────────────
   Fetch
   ──────────────────────────────────────────────────────── */

const API = import.meta.env.VITE_API_URL

async function fetchPublicService(id: string): Promise<Service> {
  const res = await fetch(`${API}/services/${id}/`, {
    headers: { Accept: 'application/json' },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error((data && data.message) || 'Listing not found')
  }
  return data.service as Service
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

function ServicesInfo() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const {
    data: service,
    isLoading,
    isError,
    error,
  } = useQuery<Service, Error>({
    queryKey: ['public-service', id],
    queryFn: () => fetchPublicService(id as string),
    enabled: !!id,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: 1,
  })

  useEffect(() => {
    document.title = service
      ? `${service.title} · Youpata`
      : 'Youpata · Listing'
    return () => {
      document.title = 'Youpata'
    }
  }, [service])

  if (isLoading) {
    return (
      <div className="svv-screen">
        <ServiceHeader onBack={() => navigate(-1)} />
        <div className="svv-loader">
          <Spinner
            message="Loading listing"
            slowMessage="Just a moment…"
            slowAfter={4000}
          />
        </div>
      </div>
    )
  }

  if (isError || !service) {
    return (
      <div className="svv-screen">
        <ServiceHeader onBack={() => navigate(-1)} />
        <div className="svv-error">
          <div className="svv-error-icon">🔍</div>
          <h1 className="svv-error-title">Listing not found</h1>
          <p className="svv-error-text">
            {error?.message || 'This listing may have been removed.'}
          </p>
          <button
            type="button"
            className="svv-error-btn"
            onClick={() => navigate('/')}
          >
            <FiArrowLeft /> Go to Youpata
          </button>
        </div>
      </div>
    )
  }

  const images = service.images ?? []
  const active = images.length > 0 ? images[0] : null
  const hasMultiple = images.length > 1
  const isHookup = service.listing_type === 'hookup'
  const provider = service.provider ?? null

  const typeLabel =
    service.listing_type === 'service'
      ? 'Service'
      : service.listing_type === 'product'
        ? 'Product'
        : 'Hookup'

  const locationParts = provider
    ? [provider.city, provider.county, provider.country].filter(Boolean)
    : []

  /* CTA → login with redirect back here */
  const goToLogin = () => {
    const here = window.location.pathname + window.location.search
    navigate(`/login?redirect=${encodeURIComponent(here)}`)
  }

  return (
    <div className="svv-screen">
      <ServiceHeader onBack={() => navigate(-1)} />

      <article className="svv-root">
        {/* ── Hero image / gallery ─────────────────── */}
        {active && (
          <div className="svv-hero">
            <HeroGallery images={images} isHookup={isHookup} />

            {hasMultiple && (
              <span className="svv-hero-count">
                <FiImage /> {images.length}
              </span>
            )}
          </div>
        )}

        {/* ── Content ────────────────────────────── */}
        <div className="svv-content">
          {/* Provider row — top of content, post-style */}
          {provider && (
            <div className="svv-author-row">
              <div className="svv-avatar">
                {provider.profile_image_url ? (
                  <img src={provider.profile_image_url} alt="" />
                ) : (
                  <span>{initialsFromProvider(provider)}</span>
                )}
              </div>
              <div className="svv-author-meta">
                <span className="svv-author-name">
                  {providerName(provider)}
                </span>
                <span className="svv-author-sub">
                  {provider.role === 'serviceprovider'
                    ? 'Service Provider'
                    : provider.role}
                  {locationParts.length > 0 && (
                    <>
                      {' · '}
                      <FiMapPin className="svv-author-sub-icon" />
                      {locationParts.join(', ')}
                    </>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Pills + title + price */}
          <header className="svv-header-block">
            <div className="svv-pill-row">
              <span
                className={`svv-pill svv-pill-${service.listing_type}`}
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
                <span className="svv-pill svv-pill-featured">
                  <FiStar /> Featured
                </span>
              )}

              <span
                className={`svv-pill ${
                  service.is_active
                    ? 'svv-pill-active'
                    : 'svv-pill-inactive'
                }`}
              >
                {service.is_active ? (
                  <>
                    <FiEye /> Active
                  </>
                ) : (
                  <>
                    <FiEyeOff /> Hidden
                  </>
                )}
              </span>
            </div>

            <h1 className="svv-title">
              {service.title || service.category?.name || 'Listing'}
            </h1>

            {!isHookup && (
              <div className="svv-price-row">
                <div className="svv-price-main">
                  <span className="svv-price-amount">
                    KES {Number(service.price).toLocaleString()}
                  </span>
                  <span className="svv-price-unit">
                    {formatUnit(service.pricing_unit)}
                  </span>
                </div>
                <span className="svv-price-category">
                  <FiTag />
                  {service.category?.name || 'Uncategorised'}
                </span>
              </div>
            )}
          </header>

          {/* ── Action bar — Like + Share ────────── */}
          <div className="svv-actions">
            <Like
              postId={service.id}
              userId={provider?.id}
              contentType="clientservice"
              size="md"
              showCount
            />

            <Share
              postId={service.id}
              userId={provider?.id}
              postTitle={service.title}
              contentType="clientservice"
              size="md"
            />
          </div>

          {/* ── About ───────────────────────────── */}
          <section className="svv-section">
            <h2 className="svv-section-title">
              {isHookup ? 'About' : 'About this listing'}
            </h2>
            <p className="svv-section-text">{service.description}</p>
          </section>

          {/* ── Details ──────────────────────────── */}
          <section className="svv-section">
            <h2 className="svv-section-title">Details</h2>
            <div className="svv-details">
              <div className="svv-detail-row">
                <span className="svv-detail-label">
                  {isHookup ? (
                    <FiHeart className="svv-detail-icon" />
                  ) : (
                    <FiPackage className="svv-detail-icon" />
                  )}
                  Listing Type
                </span>
                <span className="svv-detail-value">{typeLabel}</span>
              </div>

              {!isHookup && (
                <div className="svv-detail-row">
                  <span className="svv-detail-label">
                    <FiDollarSign className="svv-detail-icon" /> Pricing
                  </span>
                  <span className="svv-detail-value">
                    {formatPrice(service.price, service.pricing_unit)}
                  </span>
                </div>
              )}

              <div className="svv-detail-row">
                <span className="svv-detail-label">
                  <FiTag className="svv-detail-icon" /> Category
                </span>
                <span className="svv-detail-value">
                  {service.category?.name || '—'}
                </span>
              </div>

              <div className="svv-detail-row">
                <span className="svv-detail-label">
                  <FiImage className="svv-detail-icon" /> Photos
                </span>
                <span className="svv-detail-value">
                  {images.length}{' '}
                  {images.length === 1 ? 'photo' : 'photos'}
                </span>
              </div>

              <div className="svv-detail-row">
                <span className="svv-detail-label">
                  <FiCalendar className="svv-detail-icon" /> Posted
                </span>
                <span className="svv-detail-value">
                  {timeAgo(service.created_at)}
                </span>
              </div>

              <div className="svv-detail-row">
                <span className="svv-detail-label">
                  <FiMoreHorizontal className="svv-detail-icon" /> Last
                  Updated
                </span>
                <span className="svv-detail-value">
                  {formatDate(service.updated_at)}
                </span>
              </div>
            </div>
          </section>

          {/* ── All photos grid ──────────────────── */}
          {hasMultiple && (
            <section className="svv-section">
              <h2 className="svv-section-title">
                All photos ({images.length})
              </h2>
              <div className="svv-photo-grid">
                {images.map((img) => (
                  <div key={img.id} className="svv-photo-tile">
                    <img src={img.image_url} alt="" loading="lazy" />
                    {img.is_primary && !isHookup && (
                      <span className="svv-photo-star">
                        <FiStar />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Simple join CTA ──────────────────── */}
          <section className="svv-cta">
            <p className="svv-cta-text">
              Interested in this listing? Join Youpata to contact{' '}
              <strong>{providerName(provider)}</strong> and unlock
              their phone number.
            </p>

            <button
              type="button"
              className="svv-cta-btn"
              onClick={goToLogin}
            >
              Get in touch
            </button>
          </section>
        </div>
      </article>
    </div>
  )
}

/* ────────────────────────────────────────────────────────
   Hero gallery
   ──────────────────────────────────────────────────────── */

function HeroGallery({
  images,
  isHookup,
}: {
  images: ServiceImage[]
  isHookup: boolean
}) {
  const [index, setIndex] = useState(0)
  const startXRef = useRef(0)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)

  const count = images.length
  const active = images[index]

  const goTo = (i: number) => {
    const next = ((i % count) + count) % count
    setIndex(next)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true)
    startXRef.current = e.clientX
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    setDragX(e.clientX - startXRef.current)
  }
  const onPointerUp = () => {
    if (!dragging) return
    const threshold = 60
    if (dragX < -threshold) goTo(index + 1)
    else if (dragX > threshold) goTo(index - 1)
    setDragging(false)
    setDragX(0)
  }

  return (
    <div
      className="svv-gallery"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img
        src={active.image_url}
        alt=""
        className="svv-gallery-img"
        draggable={false}
        style={{
          transform: dragging
            ? `translateX(${dragX * 0.35}px)`
            : undefined,
          transition: dragging ? 'none' : 'transform .25s ease',
        }}
      />

      {count > 1 && (
        <>
          <button
            type="button"
            className="svv-gallery-nav svv-gallery-nav-prev"
            onClick={() => goTo(index - 1)}
            aria-label="Previous image"
          >
            <FiChevronLeft />
          </button>
          <button
            type="button"
            className="svv-gallery-nav svv-gallery-nav-next"
            onClick={() => goTo(index + 1)}
            aria-label="Next image"
          >
            <FiChevronRight />
          </button>

          <div className="svv-gallery-dots">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`svv-gallery-dot ${
                  i === index ? 'svv-dot-active' : ''
                }`}
                onClick={() => goTo(i)}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>

          <span className="svv-gallery-counter">
            {index + 1} / {count}
          </span>
        </>
      )}

      {active.is_primary && !isHookup && (
        <span className="svv-gallery-badge">
          <FiStar /> Cover
        </span>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────
   Header
   ──────────────────────────────────────────────────────── */

function ServiceHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="svv-topbar">
      <button
        type="button"
        className="svv-topbar-btn"
        onClick={onBack}
        aria-label="Back"
      >
        <FiArrowLeft />
      </button>

      <a href="/" className="svv-brand">
        <span className="yp-logo-you">You</span>
        <span className="yp-logo-p">p</span>
        <span className="yp-logo-ata">ata</span>
      </a>

      <div className="svv-topbar-spacer" />
    </header>
  )
}

export default ServicesInfo