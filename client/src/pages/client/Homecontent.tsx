


function HomeContent() {
  const profiles = [
    {
      id: 1,
      name: 'Sarah Chen',
      age: 28,
      location: 'San Francisco, CA',
      bio: 'Passionate about photography and hiking',
      compatibility: 92
    },
    {
      id: 2,
      name: 'Michael Park',
      age: 31,
      location: 'Los Angeles, CA',
      bio: 'Software engineer who loves cooking',
      compatibility: 88
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      age: 26,
      location: 'New York, NY',
      bio: 'Artist and coffee enthusiast',
      compatibility: 95
    },
    {
      id: 4,
      name: 'David Kim',
      age: 29,
      location: 'Seattle, WA',
      bio: 'Music producer and cat dad',
      compatibility: 84
    }
  ];

  return (
    <div className="hc-container">
      <div className="hc-header">
        <h1 className="hc-title">Discover Matches</h1>
        <p className="hc-subtitle">Find someone who shares your interests</p>
      </div>

      <div className="hc-filters">
        <button className="hc-filter-btn hc-filter-active">All</button>
        <button className="hc-filter-btn">New</button>
        <button className="hc-filter-btn">Online</button>
        <button className="hc-filter-btn">Nearby</button>
        <button className="hc-filter-btn">Compatibility</button>
      </div>

      <div className="hc-profiles-grid">
        {profiles.map((profile) => (
          <div key={profile.id} className="hc-profile-card">
            <div className="hc-profile-header">
              <div className="hc-profile-avatar">
                {profile.name.split(' ').map(n => n[0]).join('')}
              </div>
              <span className="hc-compatibility-badge">
                {profile.compatibility}% Match
              </span>
            </div>
            
            <div className="hc-profile-info">
              <h3 className="hc-profile-name">{profile.name}</h3>
              <p className="hc-profile-meta">
                {profile.age} • {profile.location}
              </p>
              <p className="hc-profile-bio">{profile.bio}</p>
            </div>

            <div className="hc-profile-actions">
              <button className="hc-action-btn hc-action-primary">Connect</button>
              <button className="hc-action-btn hc-action-secondary">Message</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HomeContent;