import { Link, useNavigate } from 'react-router-dom'
import { useBuyerL } from '../../../../hooks/useBuyerL'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import './NotFound.css'

function ZenNotFound() {
    const L = useBuyerL()
    const navigate = useNavigate()
    const storefront = useStorefront()
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''

    return (
        <div className="fn-404-page">
            <div className="fn-404-card">
                <div className="fn-404-visual">
                    <span className="fn-404-number">404</span>
                    <span className="fn-404-dot" />
                </div>

                <span className="fn-404-icon">🔍</span>

                <h1 className="fn-404-title">{L('common.error')}</h1>
                <p className="fn-404-desc">
                    {L('common.noData')}
                </p>

                <div className="fn-404-divider" />

                <div className="fn-404-actions">
                    <Link to={`${prefix}/`} className="fn-404-btn-primary">
                        {L('nav.home')}
                    </Link>
                    <button onClick={() => navigate(-1)} className="fn-404-btn-secondary">
                        ← {L('common.back')}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ZenNotFound
