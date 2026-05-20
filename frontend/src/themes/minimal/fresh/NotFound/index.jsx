import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './NotFound.css'

function FreshNotFound() {
    const { t } = useTranslation()
    const navigate = useNavigate()

    return (
        <div className="fn-404-page">
            <div className="fn-404-card">
                <div className="fn-404-visual">
                    <span className="fn-404-number">404</span>
                    <span className="fn-404-dot" />
                </div>

                <span className="fn-404-icon">🔍</span>

                <h1 className="fn-404-title">{t('common.error')}</h1>
                <p className="fn-404-desc">
                    {t('common.noData')}
                </p>

                <div className="fn-404-divider" />

                <div className="fn-404-actions">
                    <Link to="/" className="fn-404-btn-primary">
                        {t('nav.home')}
                    </Link>
                    <button onClick={() => navigate(-1)} className="fn-404-btn-secondary">
                        ← {t('common.back')}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default FreshNotFound
