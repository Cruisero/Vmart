const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../../frontend/src/pages/Admin/Dashboard/index.jsx');
let code = fs.readFileSync(targetFile, 'utf8');

const setupGuideCode = `
            {/* 新手起航 (仅商户可见) */}
            {user?.role === 'TENANT_ADMIN' && (
                <div className="setup-guide-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '8px', borderRadius: '8px' }}><FiPackage size={20} /></div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>新手起航</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>完成以下步骤，正式开启您的数字商城营业之旅</p>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-body)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ color: stats.totalProducts > 0 ? '#10b981' : 'var(--text-muted)' }}>
                                    {stats.totalProducts > 0 ? <FiCheckCircle size={20} /> : <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border-color)' }} />}
                                </div>
                                <span style={{ color: stats.totalProducts > 0 ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: stats.totalProducts > 0 ? 'line-through' : 'none' }}>发布第一款商品</span>
                            </div>
                            <Link to="/admin/products" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>去上架</Link>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-body)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ color: 'var(--text-muted)' }}>
                                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border-color)' }} />
                                </div>
                                <span style={{ color: 'var(--text-primary)' }}>绑定专属域名</span>
                            </div>
                            <Link to="/admin/settings" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>去配置</Link>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-body)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ color: 'var(--text-muted)' }}>
                                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border-color)' }} />
                                </div>
                                <span style={{ color: 'var(--text-primary)' }}>订阅高级套餐 <span style={{ fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>未订阅无法营业</span></span>
                            </div>
                            <Link to="/admin/settings" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>选择套餐</Link>
                        </div>
                    </div>
                </div>
            )}
`;

code = code.replace(/\{\/\* 统计卡片 \*\/\}/, setupGuideCode + '\n            {/* 统计卡片 */}');

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Patched DashboardHome successfully');
