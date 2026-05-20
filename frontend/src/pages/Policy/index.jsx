import { Link, useLocation } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useStorefront, useStorefrontPath } from '../../store/storefrontStore'
import { usePageTitle } from '../../hooks/usePageTitle'
import './Policy.css'

function PolicyPage() {
    const location = useLocation()
    const storefront = useStorefront()
    const { withPrefix } = useStorefrontPath()
    const agreements = storefront?.agreements

    const isTerms = location.pathname.includes('/terms')
    const title = isTerms ? '购买协议' : '退款政策'
    const content = isTerms ? agreements?.purchasePolicy : agreements?.refundPolicy

    usePageTitle(title)

    if (!content) {
        return (
            <div className="policy-page">
                <Link to={withPrefix('/')} className="policy-back">
                    <FiArrowLeft /> 返回首页
                </Link>
                <div className="policy-container">
                    <div className="policy-empty">
                        <h2>暂无{title}</h2>
                        <p>商户尚未设置{title}内容</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="policy-page">
            <Link to={withPrefix('/')} className="policy-back">
                <FiArrowLeft /> 返回首页
            </Link>

            <div className="policy-container">
                <div className="policy-header">
                    <h1>{title}</h1>
                    <p className="policy-shop">{storefront?.shopName}</p>
                </div>

                <div className="policy-content">
                    {content.split('\n').map((line, i) => {
                        const trimmed = line.trim()
                        if (!trimmed) return <br key={i} />
                        // 标题行（以"一、" "二、" 等开头，或全大写）
                        if (/^[一二三四五六七八九十]+、/.test(trimmed)) {
                            return <h2 key={i}>{trimmed}</h2>
                        }
                        // 重要提示
                        if (trimmed.startsWith('重要提示')) {
                            return <p key={i} className="policy-highlight">{trimmed}</p>
                        }
                        // 列表项
                        if (/^\d+\.\s/.test(trimmed)) {
                            return <p key={i} className="policy-ordered">{trimmed}</p>
                        }
                        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                            return <p key={i} className="policy-list">{trimmed}</p>
                        }
                        if (trimmed.startsWith('注：') || trimmed.startsWith('注:')) {
                            return <p key={i} className="policy-note">{trimmed}</p>
                        }
                        return <p key={i}>{trimmed}</p>
                    })}
                </div>

                <div className="policy-footer">
                    <p>如有疑问，请通过 <Link to={withPrefix('/tickets/new')}>工单系统</Link> 联系我们。</p>
                </div>
            </div>
        </div>
    )
}

export default PolicyPage
