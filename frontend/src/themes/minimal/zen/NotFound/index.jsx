import { Link, useNavigate } from 'react-router-dom'
import './NotFound.css'

function ZenNotFound() {
    const navigate = useNavigate()

    return (
        <div className="fn-404-page">
            <div className="fn-404-card">
                <div className="fn-404-visual">
                    <span className="fn-404-number">404</span>
                    <span className="fn-404-dot" />
                </div>

                <span className="fn-404-icon">🔍</span>

                <h1 className="fn-404-title">页面不存在</h1>
                <p className="fn-404-desc">
                    您访问的页面已被移除或从未存在过。<br />
                    请检查链接是否正确，或返回首页继续浏览。
                </p>

                <div className="fn-404-divider" />

                <div className="fn-404-actions">
                    <Link to="/" className="fn-404-btn-primary">
                        返回首页
                    </Link>
                    <button onClick={() => navigate(-1)} className="fn-404-btn-secondary">
                        ← 返回上一页
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ZenNotFound
