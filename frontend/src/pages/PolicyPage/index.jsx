import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useStorefront, useStorefrontPath } from '../../store/storefrontStore'
import { usePageTitle } from '../../hooks/usePageTitle'
import './PolicyPage.css'

export function TermsPage() {
    const storefront = useStorefront()
    const { withPrefix } = useStorefrontPath()
    const content = storefront?.agreements?.purchasePolicy
    usePageTitle('购买协议')

    if (!content) {
        return (
            <div className="policy-page">
                <div className="policy-container">
                    <div className="policy-empty">暂无购买协议</div>
                    <Link to={withPrefix('/')} className="policy-back"><FiArrowLeft /> 返回首页</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="policy-page">
            <div className="policy-container">
                <Link to={withPrefix('/')} className="policy-back"><FiArrowLeft /> 返回首页</Link>
                <div className="policy-header">
                    <h1>购买协议</h1>
                    <p className="policy-shop">{storefront?.shopName}</p>
                </div>
                <div className="policy-content">{content}</div>
            </div>
        </div>
    )
}

export function RefundPolicyPage() {
    const storefront = useStorefront()
    const { withPrefix } = useStorefrontPath()
    const content = storefront?.agreements?.refundPolicy
    usePageTitle('退款政策')

    if (!content) {
        return (
            <div className="policy-page">
                <div className="policy-container">
                    <div className="policy-empty">暂无退款政策</div>
                    <Link to={withPrefix('/')} className="policy-back"><FiArrowLeft /> 返回首页</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="policy-page">
            <div className="policy-container">
                <Link to={withPrefix('/')} className="policy-back"><FiArrowLeft /> 返回首页</Link>
                <div className="policy-header">
                    <h1>退款政策</h1>
                    <p className="policy-shop">{storefront?.shopName}</p>
                </div>
                <div className="policy-content">{content}</div>
            </div>
        </div>
    )
}
