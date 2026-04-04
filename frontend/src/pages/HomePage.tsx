import { Link } from 'react-router-dom'

const cards = [
  {
    to: '/uv',
    title: 'UV & burn alerts',
    text: 'Live index for your location plus burn-risk messaging.',
  },
  {
    to: '/scan',
    title: 'Photo scan',
    text: 'Webcam or upload—demo model + informal warmth signal.',
  },
  {
    to: '/learn',
    title: 'Sun exposure & cancer awareness',
    text: 'How UV adds up and why protection matters long-term.',
  },
] as const

export function HomePage() {
  return (
    <div className="page home-page">
      <p className="home-lead">
        Live <strong>UV index</strong> and <strong>burn alerts</strong>, optional{' '}
        <strong>photo processing</strong>, and <strong>education</strong> on sun exposure
        and skin cancer risk—built for safer habits, not to replace medical care.
      </p>

      <ul className="home-cards">
        {cards.map((c) => (
          <li key={c.to}>
            <Link to={c.to} className="home-card">
              <span className="home-card-title">{c.title}</span>
              <span className="home-card-text">{c.text}</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="home-hint">
        Use the tabs above anytime. Your UV reading and last scan persist while this tab
        stays open.
      </p>
    </div>
  )
}
