import { useState } from 'react';

type AddOption = {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
};

const ServiceIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 1 5.4-5.4l-3-3z" />
  </svg>
);

const OfferIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.6 13.4L12 22l-9-9 8.6-8.6a2 2 0 0 1 1.4-.6H20a2 2 0 0 1 2 2v6.2a2 2 0 0 1-.6 1.4z" />
    <circle cx="16" cy="8" r="1.2" />
  </svg>
);

const PostIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="7" y1="9" x2="17" y2="9" />
    <line x1="7" y1="13" x2="17" y2="13" />
    <line x1="7" y1="17" x2="13" y2="17" />
  </svg>
);

const StoryIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ProductIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8l-9-5-9 5 9 5 9-5z" />
    <path d="M3 8v8l9 5 9-5V8" />
    <path d="M12 13v8" />
  </svg>
);

const LocationIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

function AddTab() {
  const [selected, setSelected] = useState<string | null>(null);

  const options: AddOption[] = [
    {
      key: 'service',
      title: 'Add a Service',
      description: 'List a service you offer — plumbing, tutoring, cleaning, etc.',
      icon: <ServiceIcon />,
      accent: '#2563EB',
    },
    {
      key: 'offer',
      title: 'Create an Offer',
      description: 'Discounts, promos, or limited-time deals for your customers.',
      icon: <OfferIcon />,
      accent: '#F59E0B',
    },
    {
      key: 'post',
      title: 'Write a Post',
      description: 'Share news, tips, or updates with your followers.',
      icon: <PostIcon />,
      accent: '#10B981',
    },
    {
      key: 'story',
      title: 'Add a Story',
      description: 'Quick, temporary updates that disappear after 24 hours.',
      icon: <StoryIcon />,
      accent: '#8B5CF6',
    },
    {
      key: 'product',
      title: 'Add a Product',
      description: 'List something you sell — with price, photos and stock.',
      icon: <ProductIcon />,
      accent: '#0EA5E9',
    },
    {
      key: 'location',
      title: 'Add a Location',
      description: 'Add a new branch or shop so customers can find you.',
      icon: <LocationIcon />,
      accent: '#EF4444',
    },
  ];

  const handleSelect = (key: string) => {
    setSelected(key);
    // TODO: open a modal or navigate to the specific form for this type
    // e.g. navigate(`/useraccount/add/${key}`) when routing is re-enabled
    console.log('Selected add option:', key);
  };

  return (
    <div className="ua-tab">
      <header className="ua-add-head">
        <h2 className="ua-tab-title">Add</h2>
        <p className="ua-tab-text">
          Choose what you want to add to your business.
        </p>
      </header>

      <div className="ua-add-grid">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            className={
              'ua-add-card' + (selected === option.key ? ' is-selected' : '')
            }
            onClick={() => handleSelect(option.key)}
          >
            <span
              className="ua-add-icon"
              style={{ background: option.accent }}
              aria-hidden="true"
            >
              {option.icon}
            </span>
            <span className="ua-add-title">{option.title}</span>
            <span className="ua-add-desc">{option.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default AddTab;