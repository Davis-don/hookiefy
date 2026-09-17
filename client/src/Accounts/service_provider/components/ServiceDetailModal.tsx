// ServiceDetailModal.tsx
import { useEffect, useState } from 'react'
import {
  FiX,
  FiStar,
  FiTool,
  FiPackage,
  FiEye,
  FiEyeOff,
  FiChevronLeft,
  FiChevronRight,
  FiImage,
  FiCalendar,
  FiTag,
  FiDollarSign,
  FiMoreHorizontal,
} from 'react-icons/fi'
import './servicedetailmodal.css'

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */

interface ServiceCategory {
  id: number
  name: string
  slug: string
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
  listing_type: 'service' | 'product'
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
}

interface ServiceDetailModalProps {
  service: Service | null
  onClose: () => void
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
   Formatters
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

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

const ServiceDetailModal = ({
  service,
  onClose,
}: ServiceDetailModalProps) => {
  const [activeIndex, setActiveIndex] = useState(0)

  /* Reset to the primary image when a new service is opened */
  useEffect(() => {
    if (!service) return
    const primaryIdx = service.images.findIndex((i) => i.is_primary)
    setActiveIndex(primaryIdx >= 0 ? primaryIdx : 0)
  }, [service])

  /* Escape closes, arrows navigate */
  useEffect(() => {
    if (!service) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') {
        setActiveIndex((i) =>
          service.images.length === 0
            ? 0
            : (i + 1) % service.images.length
        )
      }
      if (e.key === 'ArrowLeft') {
        setActiveIndex((i) =>
          service.images.length === 0
            ? 0
            : (i - 1 + service.images.length) %
              service.images.length
        )
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [service, onClose])

  /* Lock body scroll while modal is open */
  useEffect(() => {
    if (!service) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [service])

  if (!service) return null

  const images = service.images ?? []
  const active = images.length > 0 ? images[activeIndex] : null
  const hasMultiple = images.length > 1

  const goPrev = () => {
    if (!hasMultiple) return
    setActiveIndex((i) => (i - 1 + images.length) % images.length)
  }

  const goNext = () => {
    if (!hasMultiple) return
    setActiveIndex((i) => (i + 1) % images.length)
  }

  return (
    <div
      className="sdm-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="sdm-post"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ══════════════════════════════════════════════
            Top bar — floating over everything
           ══════════════════════════════════════════════ */}
        <div className="sdm-topbar">
          <span className="sdm-topbar-title">Listing Details</span>
          <button
            type="button"
            className="sdm-topbar-close"
            onClick={onClose}
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>

        {/* ══════════════════════════════════════════════
            Hero image — full width, cover, tall
           ══════════════════════════════════════════════ */}
        <div className="sdm-hero">
          {active ? (
            <>
              <img
                src={active.image_url}
                alt={service.title}
                className="sdm-hero-image"
                key={active.id}
              />

              {/* Soft gradient at the bottom for readability */}
              <div className="sdm-hero-gradient" aria-hidden="true" />

              {/* Primary badge — top left */}
              {active.is_primary && (
                <span className="sdm-hero-badge">
                  <FiStar />
                  Cover Photo
                </span>
              )}

              {/* Multi-image counter — top right */}
              {hasMultiple && (
                <span className="sdm-hero-counter">
                  <FiImage />
                  {activeIndex + 1} / {images.length}
                </span>
              )}

              {/* Prev / Next arrows */}
              {hasMultiple && (
                <>
                  <button
                    type="button"
                    className="sdm-hero-nav sdm-hero-nav-prev"
                    onClick={goPrev}
                    aria-label="Previous image"
                  >
                    <FiChevronLeft />
                  </button>
                  <button
                    type="button"
                    className="sdm-hero-nav sdm-hero-nav-next"
                    onClick={goNext}
                    aria-label="Next image"
                  >
                    <FiChevronRight />
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="sdm-hero-empty">
              <FiImage />
              <span>No images uploaded</span>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════
            Dots indicator — Instagram style
           ══════════════════════════════════════════════ */}
        {hasMultiple && (
          <div className="sdm-dots">
            {images.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                className={`sdm-dot ${
                  idx === activeIndex ? 'sdm-dot-active' : ''
                }`}
                onClick={() => setActiveIndex(idx)}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            Body — the actual detail content
           ══════════════════════════════════════════════ */}
        <div className="sdm-content">
          {/* Author-ish strip: category + type + status */}
          <div className="sdm-strip">
            <div className="sdm-strip-avatar">
              {service.title.charAt(0).toUpperCase()}
            </div>

            <div className="sdm-strip-meta">
              <span className="sdm-strip-name">
                {service.category?.name || 'Uncategorised'}
              </span>
              <span className="sdm-strip-sub">
                {service.listing_type === 'service'
                  ? 'Service'
                  : 'Product'}
                {' · '}
                {service.is_active ? 'Active' : 'Hidden'}
              </span>
            </div>

            <div className="sdm-strip-tags">
              <span
                className={`sdm-pill sdm-pill-${
                  service.listing_type
                }`}
              >
                {service.listing_type === 'service' ? (
                  <>
                    <FiTool /> Service
                  </>
                ) : (
                  <>
                    <FiPackage /> Product
                  </>
                )}
              </span>

              {service.is_featured && (
                <span className="sdm-pill sdm-pill-featured">
                  <FiStar /> Featured
                </span>
              )}

              <span
                className={`sdm-pill ${
                  service.is_active
                    ? 'sdm-pill-active'
                    : 'sdm-pill-inactive'
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
          </div>

          {/* Title */}
          <h1 className="sdm-title">{service.title}</h1>

          {/* Price strip — bold and prominent */}
          <div className="sdm-price-strip">
            <div className="sdm-price-left">
              <span className="sdm-price-amount">
                KES {Number(service.price).toLocaleString()}
              </span>
              <span className="sdm-price-unit">
                {formatUnit(service.pricing_unit)}
              </span>
            </div>

            <span className="sdm-price-category">
              <FiTag />
              {service.category?.name || 'Uncategorised'}
            </span>
          </div>

          {/* Description */}
          <section className="sdm-block">
            <h2 className="sdm-block-title">About this listing</h2>
            <p className="sdm-block-text">{service.description}</p>
          </section>

          {/* Details grid */}
          <section className="sdm-block">
            <h2 className="sdm-block-title">Details</h2>

            <div className="sdm-details">
              <div className="sdm-detail-row">
                <span className="sdm-detail-label">
                  <FiPackage className="sdm-detail-icon" />
                  Listing Type
                </span>
                <span className="sdm-detail-value">
                  {service.listing_type === 'service'
                    ? 'Service'
                    : 'Product'}
                </span>
              </div>

              <div className="sdm-detail-row">
                <span className="sdm-detail-label">
                  <FiDollarSign className="sdm-detail-icon" />
                  Pricing
                </span>
                <span className="sdm-detail-value">
                  {formatPrice(service.price, service.pricing_unit)}
                </span>
              </div>

              <div className="sdm-detail-row">
                <span className="sdm-detail-label">
                  <FiTag className="sdm-detail-icon" />
                  Category
                </span>
                <span className="sdm-detail-value">
                  {service.category?.name || '—'}
                </span>
              </div>

              <div className="sdm-detail-row">
                <span className="sdm-detail-label">
                  <FiImage className="sdm-detail-icon" />
                  Photos
                </span>
                <span className="sdm-detail-value">
                  {service.image_count}{' '}
                  {service.image_count === 1 ? 'photo' : 'photos'}
                </span>
              </div>

              <div className="sdm-detail-row">
                <span className="sdm-detail-label">
                  <FiCalendar className="sdm-detail-icon" />
                  Created
                </span>
                <span className="sdm-detail-value">
                  {formatDate(service.created_at)}
                </span>
              </div>

              <div className="sdm-detail-row">
                <span className="sdm-detail-label">
                  <FiMoreHorizontal className="sdm-detail-icon" />
                  Last Updated
                </span>
                <span className="sdm-detail-value">
                  {formatDate(service.updated_at)}
                </span>
              </div>
            </div>
          </section>

          {/* Thumbnails strip — below the fold for extra images */}
          {hasMultiple && (
            <section className="sdm-block">
              <h2 className="sdm-block-title">All photos</h2>

              <div className="sdm-thumb-strip">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    className={`sdm-thumb ${
                      idx === activeIndex ? 'sdm-thumb-active' : ''
                    }`}
                    onClick={() => {
                      setActiveIndex(idx)
                      // Scroll back to the top of the modal
                      const post = document.querySelector('.sdm-post')
                      if (post) {
                        post.scrollTo({ top: 0, behavior: 'smooth' })
                      }
                    }}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <img src={img.image_url} alt="" loading="lazy" />
                    {img.is_primary && (
                      <span className="sdm-thumb-star">
                        <FiStar />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Bottom spacer for iOS safe area */}
          <div className="sdm-bottom-spacer" />
        </div>
      </div>
    </div>
  )
}

export default ServiceDetailModal