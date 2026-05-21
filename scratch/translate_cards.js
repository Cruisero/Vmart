const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../frontend/src/pages/Admin/Dashboard/index.jsx');
let content = fs.readFileSync(file, 'utf8');

const startTag = 'function CardsManage() {';
const startIdx = content.indexOf(startTag);
if (startIdx === -1) {
    console.error('CardsManage start not found');
    process.exit(1);
}

const endTag = 'function UsersManage() {';
const endIdx = content.indexOf(endTag, startIdx);
if (endIdx === -1) {
    console.error('UsersManage start not found');
    process.exit(1);
}

console.log('Replacing CardsManage from', startIdx, 'to', endIdx);

const prefix = content.slice(0, startIdx);
const suffix = content.slice(endIdx);

const translatedCards = `function CardsManage() {
    const L = useAdminL()
    const { showToast } = useToast()
    const { token, user: currentUser } = useAuthStore()
    const isSuperAdmin = ['SUPER_ADMIN', 'TENANT_ADMIN'].includes(currentUser?.role) ||
        (currentUser?.role === 'ADMIN' && currentUser?.permissions?.['cards.delete'])
    const location = useLocation()

    // 从URL获取初始productId
    const params = new URLSearchParams(location.search)
    const initialProductId = params.get('productId') || ''

    const [cards, setCards] = useState([])
    const [products, setProducts] = useState([])
    const [selectedProductId, setSelectedProductId] = useState(initialProductId)
    const [selectedVariantFilter, setSelectedVariantFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [keyword, setKeyword] = useState('')
    const [keywordInput, setKeywordInput] = useState('')
    const keywordTimer = useRef(null)
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [cardStats, setCardStats] = useState({
        total: 0,
        available: 0,
        sold: 0,
        expired: 0
    })
    const [showImportModal, setShowImportModal] = useState(false)
    const [importText, setImportText] = useState('')
    const [importMode, setImportMode] = useState('batch')
    const [selectedVariantId, setSelectedVariantId] = useState('')
    const [selectedCards, setSelectedCards] = useState([])
    const [editingCard, setEditingCard] = useState(null)
    const [editContent, setEditContent] = useState('')

    // 获取Product列表
    useEffect(() => {
        if (!token) return
        const fetchProducts = async () => {
            try {
                const response = await fetch('/api/admin/products?pageSize=100', {
                    headers: { 'Authorization': \`Bearer \${token}\` }
                })
                const data = await response.json()
                if (response.ok && data.products) {
                    setProducts(data.products)
                }
            } catch (error) {
                console.error('获取Product列表Failed:', error)
            }
        }
        fetchProducts()
    }, [token])

    // 获取卡密列表
    const fetchCards = async () => {
        if (!token) return
        setLoading(true)
        try {
            const params = new URLSearchParams({ page, pageSize: 20 })
            if (selectedProductId) params.append('productId', selectedProductId)
            if (selectedVariantFilter) params.append('variantId', selectedVariantFilter)
            if (statusFilter) params.append('status', statusFilter)
            if (keyword) params.append('keyword', keyword)

            const response = await fetch(\`/api/admin/cards?\${params}\`, {
                headers: { 'Authorization': \`Bearer \${token}\` }
            })
            const data = await response.json()
            if (data.cards) {
                setCards(data.cards)
                setTotalPages(data.totalPages)
                setTotal(data.total)
                if (data.stats) {
                    setCardStats({
                        total: data.stats.total || 0,
                        available: data.stats.available || 0,
                        sold: data.stats.sold || 0,
                        expired: data.stats.expired || 0
                    })
                } else {
                    setCardStats({
                        total: data.total || 0,
                        available: data.cards.filter(c => c.status === 'AVAILABLE').length,
                        sold: data.cards.filter(c => c.status === 'SOLD').length,
                        expired: data.cards.filter(c => c.status === 'EXPIRED').length
                    })
                }
            }
        } catch (error) {
            showToast(L('加载卡密列表失败', 'Failed to load keys'), 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCards()
    }, [selectedProductId, selectedVariantFilter, statusFilter, keyword, page, token])

    // Batch Import Keys
    const handleImport = async () => {
        if (!selectedProductId) {
            showToast(L('请先选择一个商品', 'Please select a product first'), 'error')
            return
        }
        // 检查Product是否有Variant，有则必须选择
        const selectedProduct = products.find(p => p.id === selectedProductId)
        if (selectedProduct?.variants?.length > 0 && !selectedVariantId) {
            showToast(L('请选择商品规格', 'Select variant'), 'error')
            return
        }
        if (!importText.trim()) {
            showToast(L('请输入卡密内容', 'Enter card key content'), 'error')
            return
        }

        const cardsArray = importMode === 'single'
            ? [importText.trim()]
            : importText.split('\\n').map(c => c.trim()).filter(c => c)
        if (cardsArray.length === 0) {
            showToast(L('未找到有效的卡密内容', 'No valid keys'), 'error')
            return
        }

        try {

            const response = await fetch('/api/admin/cards/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify({
                    productId: selectedProductId,
                    variantId: selectedVariantId === 'default' ? null : selectedVariantId,
                    cards: cardsArray
                })
            })
            const data = await response.json()
            if (response.ok) {
                showToast(data.message || L('卡密导入成功', 'Keys imported successfully'), 'success')
                setShowImportModal(false)
                setImportText('')
                fetchCards()
            } else {
                showToast(data.error, 'error')
            }
        } catch (error) {
            showToast(L('导入失败', 'Import failed'), 'error')
        }
    }

    // Delete单个卡密
    const handleDelete = async (id) => {
        if (!confirm(L('确定要删除该卡密吗？', 'Delete this key?'))) return

        try {

            const response = await fetch(\`/api/admin/cards/\${id}\`, {
                method: 'DELETE',
                headers: { 'Authorization': \`Bearer \${token}\` }
            })
            const data = await response.json()
            if (response.ok) {
                showToast(data.message || L('删除成功', 'Deleted successfully'), 'success')
                fetchCards()
            } else {
                showToast(data.error, 'error')
            }
        } catch (error) {
            showToast(L('删除失败', 'DeleteFailed'), 'error')
        }
    }

    // Edit Key
    const handleEdit = (card) => {
        setEditingCard(card)
        setEditContent(card.content)
    }

    // SaveEdit
    const handleSaveEdit = async () => {
        if (!editContent.trim()) {
            showToast(L('卡密内容不能为空', 'Key content cannot be empty'), 'error')
            return
        }

        try {
            const response = await fetch(\`/api/admin/cards/\${editingCard.id}\`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify({ content: editContent.trim() })
            })
            const data = await response.json()
            if (response.ok) {
                showToast(data.message || L('保存成功', 'Saved successfully'), 'success')
                setEditingCard(null)
                setEditContent('')
                fetchCards()
            } else {
                showToast(data.error, 'error')
            }
        } catch (error) {
            showToast(L('保存失败', 'SaveFailed'), 'error')
        }
    }

    // 批量Delete
    const handleBatchDelete = async () => {
        if (selectedCards.length === 0) {
            showToast(L('请选择要删除的卡密', 'Please select keys to delete'), 'error')
            return
        }
        if (!confirm(L(\`确定要删除选中的 \${selectedCards.length} 张卡密吗？\`, \`Delete selected \${selectedCards.length} key(s)?\`))) return

        try {

            const response = await fetch('/api/admin/cards/batch-delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify({ ids: selectedCards, productId: selectedProductId })
            })
            const data = await response.json()
            if (response.ok) {
                showToast(data.message || L('批量删除成功', 'Batch delete success'), 'success')
                setSelectedCards([])
                fetchCards()
            } else {
                showToast(data.error, 'error')
            }
        } catch (error) {
            showToast(L('删除失败', 'DeleteFailed'), 'error')
        }
    }

    // 选择/Cancel选择卡密
    const toggleCardSelection = (id) => {
        setSelectedCards(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        )
    }

    // 全选/Cancel全选
    const toggleSelectAll = () => {
        const availableCards = cards.filter(c => c.status === 'AVAILABLE')
        if (selectedCards.length === availableCards.length) {
            setSelectedCards([])
        } else {
            setSelectedCards(availableCards.map(c => c.id))
        }
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'AVAILABLE': return <span className="badge badge-success">{L('可用', 'Available')}</span>
            case 'SOLD': return <span className="badge badge-warning">{L('已售出', 'Sold')}</span>
            case 'EXPIRED': return <span className="badge badge-danger">{L('已过期', 'Expired')}</span>
            default: return <span className="badge">{status}</span>
        }
    }

    const selectedProduct = products.find(p => p.id === selectedProductId)
    const productVariants = selectedProduct?.variants || []

    return (
        <div className="manage-page">
            <div className="page-header">
                <h2>{L('admin.cards.title')}</h2>
                <div className="header-actions">
                    {isSuperAdmin && selectedCards.length > 0 && (
                        <button className="btn btn-danger" onClick={handleBatchDelete}>
                            {L('删除选中', 'Delete Selected')} ({selectedCards.length})
                        </button>
                    )}
                    <button
                        className="btn btn-primary"
                        onClick={() => { setShowImportModal(true); setImportText(''); setImportMode('batch') }}
                    >
                        {L('+ 导入卡密', '+ Import Keys')}
                    </button>
                </div>
            </div>

            <div className="cards-stats-grid">
                <div className="cards-stat-card total">
                    <div className="cards-stat-label">{L('总卡密数', 'Total Keys')}</div>
                    <div className="cards-stat-value">{cardStats.total}</div>
                </div>
                <div className="cards-stat-card available">
                    <div className="cards-stat-label">{L('未售出', 'Available')}</div>
                    <div className="cards-stat-value">{cardStats.available}</div>
                </div>
                <div className="cards-stat-card sold">
                    <div className="cards-stat-label">{L('已售出', 'Used')}</div>
                    <div className="cards-stat-value">{cardStats.sold}</div>
                </div>
                <div className="cards-stat-card expired">
                    <div className="cards-stat-label">{L('已过期', 'Expired')}</div>
                    <div className="cards-stat-value">{cardStats.expired}</div>
                </div>
            </div>

            {/* 筛选栏 */}
            <div className="filter-bar">
                <div className="filter-group">
                    <label>{L('选择商品', 'Select Product')}</label>
                    <select
                        value={selectedProductId}
                        onChange={(e) => {
                            setSelectedProductId(e.target.value)
                            setSelectedVariantFilter('')
                            setPage(1)
                            setSelectedCards([])
                        }}
                    >
                        <option value="">{L('全部商品', 'All Products')}</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>{L('商品规格', 'Variant')}</label>
                    <select
                        value={selectedVariantFilter}
                        onChange={(e) => { setSelectedVariantFilter(e.target.value); setPage(1); }}
                        disabled={!selectedProductId}
                    >
                        <option value="">{L('全部规格', 'All Variants')}</option>
                        <option value="default">{L('默认规格', 'Default Variant')}</option>
                        {productVariants.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>{L('卡密状态', 'Status')}</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">{L('全部状态', 'All Status')}</option>
                        <option value="AVAILABLE">{L('可用', 'Available')}</option>
                        <option value="SOLD">{L('已售', 'Sold')}</option>
                        <option value="EXPIRED">{L('已过期', 'Expired')}</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>{L('搜索', 'Search')}</label>
                    <input
                        type="text"
                        className="filter-search-input"
                        placeholder={L('卡密内容 / 订单号', 'Card Key Content / Order No.')}
                        value={keywordInput}
                        onChange={(e) => {
                            setKeywordInput(e.target.value)
                            clearTimeout(keywordTimer.current)
                            keywordTimer.current = setTimeout(() => {
                                setKeyword(e.target.value)
                                setPage(1)
                            }, 400)
                        }}
                    />
                </div>
                <div className="filter-info">
                    {L(\`共 \${total} 条记录\`, \`Total \${total} records\`)}
                </div>
            </div>

            {/* 卡密列表 */}
            {loading ? (
                <div className="loading-state">{L('加载中...', 'Loading...')}</div>
            ) : cards.length === 0 ? (
                <div className="placeholder-content">
                    <FiCreditCard />
                    <p>{selectedProductId ? L('该商品暂无卡密', 'No keys for this product') : L('请选择商品来管理其卡密', 'Select a product to manage its keys')}</p>
                </div>
            ) : (
                <>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedCards.length > 0 && selectedCards.length === cards.filter(c => c.status === 'AVAILABLE').length}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th>{L('卡密内容', 'Card Key Content')}</th>
                                    <th>{L('所属商品', 'Product')}</th>
                                    <th>{L('规格', 'Variant')}</th>
                                    <th>{L('状态', 'Status')}</th>
                                    <th>{L('关联订单号', 'Order No.')}</th>
                                    <th>{L('导入时间', 'Created')}</th>
                                    <th>{L('操作', 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cards.map(card => (
                                    <tr key={card.id}>
                                        <td>
                                            {card.status === 'AVAILABLE' && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCards.includes(card.id)}
                                                    onChange={() => toggleCardSelection(card.id)}
                                                />
                                            )}
                                        </td>
                                        <td>
                                            <code className="card-content">{card.content.length > 50 ? card.content.substring(0, 50) + '...' : card.content}</code>
                                        </td>
                                        <td>{card.product?.name || '-'}</td>
                                        <td>{card.variant?.name || '-'}</td>
                                        <td>{getStatusBadge(card.status)}</td>
                                        <td>{card.order?.orderNo || '-'}</td>
                                        <td>{new Date(card.createdAt).toLocaleString('zh-CN')}</td>
                                        <td>
                                            {card.status === 'AVAILABLE' && (
                                                <div className="actions">
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => handleEdit(card)}
                                                    >
                                                        {L('编辑', 'Edit')}
                                                    </button>
                                                    {isSuperAdmin && (
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => handleDelete(card.id)}
                                                        >
                                                            {L('删除', 'Delete')}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 分页 */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                {L('上一页', 'Prev')}
                            </button>
                            <span>{L(\`页码 \${page} / \${totalPages}\`, \`Page \${page} / \${totalPages}\`)}</span>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                {L('下一页', 'Next')}
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* 导入弹窗 */}
            {showImportModal && (
                <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{importMode === 'single' ? L('添加单条卡密', 'Add Key') : L('批量导入卡密', 'Batch Import Keys')}</h3>
                            <button className="modal-close" onClick={() => setShowImportModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* 输入模式切换 */}
                            <div className="import-mode-toggle">
                                <button
                                    className={\`mode-btn \${importMode === 'single' ? 'active' : ''}\`}
                                    onClick={() => { setImportMode('single'); setImportText('') }}
                                >
                                    {L('单条导入', 'Single')}
                                </button>
                                <button
                                    className={\`mode-btn \${importMode === 'batch' ? 'active' : ''}\`}
                                    onClick={() => { setImportMode('batch'); setImportText('') }}
                                >
                                    {L('批量导入', 'Batch')}
                                </button>
                            </div>
                            <div className="form-group">
                                <label>{L('目标商品', 'Target Product')}</label>
                                <select
                                    value={selectedProductId}
                                    onChange={(e) => {
                                        setSelectedProductId(e.target.value)
                                        setSelectedVariantId('')
                                    }}
                                >
                                    <option value="">{L('选择商品', 'Select product')}</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            {/* Variant选择 - 当Product有Variant时必须选择 */}
                            {selectedProductId && products.find(p => p.id === selectedProductId)?.variants?.length > 0 && (
                                <div className="form-group">
                                    <label>{L('目标规格', 'Target Variant')} <span className="required">*</span></label>
                                    <select
                                        value={selectedVariantId}
                                        onChange={(e) => setSelectedVariantId(e.target.value)}
                                    >
                                        <option value="">{L('选择规格', 'Select variant')}</option>
                                        <option value="default">{L('默认规格', 'Default')} ({formatMoney(products.find(p => p.id === selectedProductId)?.price)})</option>
                                        {products.find(p => p.id === selectedProductId)?.variants?.map(v => (
                                            <option key={v.id} value={v.id}>{v.name} ({formatMoney(v.price)})</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="form-group">
                                <>
                                    <label>
                                        {L('卡密内容', 'Card Key Content')}{' '}
                                        <span className="hint">
                                            {importMode === 'single' ? L('（换行会被视为同一张卡密的内容）', '(line breaks are part of one key)') : L('（一行一条卡密）', '(One key per line)')}
                                        </span>
                                    </label>
                                    <textarea
                                        className="card-import-textarea"
                                        value={importText}
                                        onChange={(e) => setImportText(e.target.value)}
                                        placeholder={importMode === 'single'
                                            ? L('输入卡密内容（支持多行）...', 'Enter card key content (multi-line)..')
                                            : L('请输入卡密，一行一条\\n例如:\\nABC123-DEF456\\nXYZ789-GHI012', 'Enter keys, one per line\\ne.g.\\nABC123-DEF456\\nXYZ789-GHI012')
                                        }
                                    />
                                </>
                            </div>
                            <div className="import-preview">
                                {importMode === 'single'
                                    ? (importText.trim() ? L('将导入：1 张卡密', 'Will import: 1 key') : L('将导入：0 张卡密', 'Will import: 0 keys'))
                                    : L(\`将导入：\${importText.split('\\n').filter(c => c.trim()).length} 张卡密\`, \`Will import: \${importText.split('\\n').filter(c => c.trim()).length} key(s)\`)
                                }
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>{L('取消', 'Cancel')}</button>
                            <button className="btn btn-primary" onClick={handleImport}>{L('确认导入', 'Confirm Import')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit弹窗 */}
            {editingCard && (
                <div className="modal-overlay" onClick={() => setEditingCard(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{L('编辑卡密', 'Edit Key')}</h3>
                            <button className="modal-close" onClick={() => setEditingCard(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>{L('卡密内容', 'Card Key Content')}</label>
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    rows={5}
                                    placeholder={L('请输入卡密内容', 'Enter card key content')}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditingCard(null)}>{L('取消', 'Cancel')}</button>
                            <button className="btn btn-primary" onClick={handleSaveEdit}>{L('保存', 'Save')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
`;

const newContent = prefix + translatedCards + suffix;
fs.writeFileSync(file, newContent, 'utf8');
console.log('Successfully translated CardsManage!');
