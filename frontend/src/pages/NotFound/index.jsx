import { Link } from 'react-router-dom'

function NotFound() {
    return (
        <div className="not-found-page" style={{ textAlign: 'center', padding: '80px 20px' }}>
            <h1 style={{ fontSize: '6rem', marginBottom: '16px', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>404</h1>
            <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>页面不存在</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                您访问的页面不存在或已被删除
            </p>
            <Link to="/" className="btn btn-primary">
                返回首页
            </Link>
        </div>
    )
}

export default NotFound
