import React, { useState } from 'react'
import './clientdatacard.css'

export interface ClientdatacardProps {
  id: string
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  country: string
  county: string
  location: string
  image: string
  info: string
}

const Clientdatacard: React.FC<ClientdatacardProps> = ({
  name,
  age,
  gender,
  country,
  county,
  location,
  image,
  info
}) => {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <article className="cd-card">
        {/* Image Section */}
        <div className="cd-card__image-wrapper" onClick={() => setShowModal(true)}>
          <img 
            src={image} 
            alt={name} 
            className="cd-card__image"
            loading="lazy"
          />
          <div className="cd-card__image-overlay">
            <span className="cd-card__expand-icon">🔍</span>
            <span className="cd-card__expand-text">View Full Image</span>
          </div>
        </div>

        {/* Content Section */}
        <div className="cd-card__content">
          {/* Name Row */}
          <div className="cd-card__row">
            <span className="cd-card__label">NAME</span>
            <span className="cd-card__value cd-card__value--name">{name}</span>
          </div>

          {/* Age Row */}
          <div className="cd-card__row">
            <span className="cd-card__label">AGE</span>
            <span className="cd-card__value">{age} years</span>
          </div>

          {/* Gender Row */}
          <div className="cd-card__row">
            <span className="cd-card__label">GENDER</span>
            <span className="cd-card__value cd-card__value--capitalize">{gender}</span>
          </div>

          {/* Location Row */}
          <div className="cd-card__row">
            <span className="cd-card__label">LOCATION</span>
            <span className="cd-card__value">{country}, {county}</span>
          </div>

          {/* Area Row */}
          <div className="cd-card__row">
            <span className="cd-card__label">AREA</span>
            <span className="cd-card__value">{location}</span>
          </div>

          {/* Info Section */}
          <div className="cd-card__info">
            <span className="cd-card__label cd-card__label--info">ABOUT</span>
            <p className="cd-card__info-text">{info}</p>
          </div>

          {/* Connect Button */}
          <button className="cd-card__connect-btn" onClick={() => alert(`Connection request sent to ${name}`)}>
            CONNECT
          </button>
        </div>
      </article>

      {/* Full Screen Modal */}
      {showModal && (
        <div className="cd-modal" onClick={() => setShowModal(false)}>
          <button className="cd-modal__close" onClick={() => setShowModal(false)}>×</button>
          
          <div className="cd-modal__container" onClick={(e) => e.stopPropagation()}>
            <div className="cd-modal__image-wrapper">
              <img src={image} alt={name} className="cd-modal__image" />
            </div>
            
            <div className="cd-modal__caption">
              <h3 className="cd-modal__name">{name}</h3>
              <p className="cd-modal__details">{age} years · {gender} · {country}, {county}</p>
              <p className="cd-modal__location">{location}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Clientdatacard