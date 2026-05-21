const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../frontend/src/pages/Admin/Dashboard/index.jsx');
let content = fs.readFileSync(file, 'utf8');

const startTag = 'function ProductsManage() {';
const startIdx = content.indexOf(startTag);
if (startIdx === -1) {
    console.error('ProductsManage start not found');
    process.exit(1);
}

const endTag = 'function OrdersManage() {';
const endIdx = content.indexOf(endTag, startIdx);
if (endIdx === -1) {
    console.error('OrdersManage start not found');
    process.exit(1);
}

console.log('Replacing ProductsManage from', startIdx, 'to', endIdx);

const prefix = content.slice(0, startIdx);
const suffix = content.slice(endIdx);

const translatedProducts = `function ProductsManage() {
    const L = useAdminL()
    const location = useLocation()
    // 推导 basePath：从Current路径反向计算（admin 路径是 .../admin/products）
    const basePath = location.pathname.replace(/\\/products.*$/, '') || '/admin'
    const { showToast, showConfirm } = useToast()
    const token = useAuthStore(state => state.token)
    const navigate = useNavigate()
    const [showModal, setShowModal] = useState(false)
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [pendingImages, setPendingImages] = useState([]) // pending的图片
    const [uploadProgress, setUploadProgress] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const [products, setProducts] = useState([]) // 从 API 获取的Product
    const [categories, setCategories] = useState([]) // 分类列表
    const [loading, setLoading] = useState(true)
    const [stockMode, setStockMode] = useState('auto') // 'auto' = 库存=卡密数量, 'manual' = 手动设置
    const [newCategory, setNewCategory] = useState({ name: '', icon: '📦' })
    const [editingCategory, setEditingCategory] = useState(null) // { id, name, icon }
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        fullDescription: '',
        price: '',
        stock: '',
        categoryId: '',
        images: [],
        weight: 0,
        variants: [], // Variants
        wholesalePrices: [], // 批发价阶梯（无Variant时用）
        wholesaleTiers: [], // 扁平批发价列表（有Variant时用）
        status: 'active'
    })

    // 从 API 获取Product列表和设置
    const [stockAlertIds, setStockAlertIds] = useState([])

    useEffect(() => {
        fetchProducts()
        fetchStockMode()
        fetchStockAlertIds()
    }, [])

    const fetchStockAlertIds = async () => {
        try {
            const res = await fetch('/api/admin/stock-alert/products', {
                headers: { 'Authorization': \`Bearer \${token}\` }
            })
            const data = await res.json()
            setStockAlertIds(data.productIds || [])
        } catch (e) {
            console.error('获取库存警报设置Failed:', e)
        }
    }

    const toggleStockAlert = async (productId) => {
        const isEnabled = stockAlertIds.includes(productId)
        const newIds = isEnabled
            ? stockAlertIds.filter(id => id !== productId)
            : [...stockAlertIds, productId]
        try {
            await fetch('/api/admin/stock-alert/products', {
                method: 'POST',
                headers: {
                    'Authorization': \`Bearer \${token}\`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ productIds: newIds })
            })
            setStockAlertIds(newIds)
            showToast(isEnabled ? L('已关闭库存警报', 'Stock alert disabled') : L('已开启库存警报', 'Stock alert enabled'), 'success')
        } catch (e) {
            showToast(L('设置失败', 'Setting failed'), 'error')
        }
    }

    const fetchStockMode = async () => {
        try {
            const res = await fetch('/api/admin/settings', {
                headers: { 'Authorization': \`Bearer \${token}\` }
            })
            const data = await res.json()
            if (data.settings?.stockMode) {
                setStockMode(data.settings.stockMode)
            }
        } catch (error) {
            console.error('获取设置Failed:', error)
        }
    }

    const fetchProducts = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/products', {
                headers: {
                    'Authorization': \`Bearer \${token}\`
                }
            })
            const data = await response.json()
            setProducts(data.products || [])
        } catch (error) {
            console.error('获取Product列表Failed:', error)
        } finally {
            setLoading(false)
        }
    }

    // 获取分类列表
    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/admin/categories', {
                headers: {
                    'Authorization': \`Bearer \${token}\`
                }
            })
            const data = await response.json()
            setCategories(data.categories || [])
        } catch (error) {
            console.error('获取分类Failed:', error)
        }
    }

    // Add Category
    const handleAddCategory = async () => {
        if (!newCategory.name.trim()) {
            showToast(L('请输入分类名称', 'Enter category name'), 'error')
            return
        }
        try {
            const response = await fetch('/api/admin/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify(newCategory)
            })
            if (!response.ok) throw new Error('Failed to add')
            showToast(L('分类添加成功', 'Category added'), 'success')
            setNewCategory({ name: '', icon: '📦' })
            fetchCategories()
        } catch (error) {
            showToast(L('分类添加失败', 'Failed to add category'), 'error')
        }
    }

    // Delete分类
    const handleDeleteCategory = async (categoryId, categoryName) => {
        showConfirm(L('删除分类', 'Delete Category'), L(\`确定要删除分类 "\${categoryName}" 吗？\`, \`Delete category "\${categoryName}"?\`), async () => {
            try {
                const response = await fetch(\`/api/admin/categories/\${categoryId}\`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': \`Bearer \${token}\`
                    }
                })
                if (!response.ok) throw new Error('Delete failed')
                showToast(L('分类已删除', 'Category deleted'), 'success')
                fetchCategories()
            } catch (error) {
                showToast(L('分类删除失败', 'Failed to delete category'), 'error')
            }
        })
    }

    // 更新分类
    const handleUpdateCategory = async () => {
        if (!editingCategory) return
        if (!editingCategory.name.trim()) {
            showToast(L('请输入分类名称', 'Enter category name'), 'error')
            return
        }
        try {
            const response = await fetch(\`/api/admin/categories/\${editingCategory.id}\`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify({
                    name: editingCategory.name,
                    icon: editingCategory.icon
                })
            })
            if (!response.ok) throw new Error('Update failed')
            showToast(L('分类已更新', 'Category updated'), 'success')
            setEditingCategory(null)
            fetchCategories()
        } catch (error) {
            showToast(L('分类更新失败', 'Failed to update category'), 'error')
        }
    }

    // 打开Categories弹窗
    const openCategoryModal = () => {
        fetchCategories()
        setShowCategoryModal(true)
    }

    const handleAdd = () => {
        setEditingProduct(null)
        setPendingImages([])
        setUploadProgress(0)
        setFormData({
            name: '',
            description: '',
            fullDescription: '',
            price: '',
            stock: '',
            categoryId: '',
            images: [],
            weight: 0,
            variants: [],
            wholesalePrices: [],
            wholesaleTiers: [],
            status: 'active',
            deliveryNote: ''
        })
        fetchCategories()
        setShowModal(true)
    }

    const handleEdit = (product) => {
        setEditingProduct(product)
        setPendingImages([])
        setUploadProgress(0)
        setFormData({
            name: product.name,
            description: product.description || '',
            fullDescription: product.fullDescription || '',
            price: product.price.toString(),
            stock: product.stock?.toString() || '',
            categoryId: product.categoryId || '',
            images: product.images || [],
            weight: product.weight || 0,
            variants: (product.variants || []).map(v => ({
                type: v.type || '',
                name: v.name,
                price: v.price.toString(),
                stock: v.stock?.toString() || '0',
                wholesalePrices: []
            })),
            wholesalePrices: (product.wholesalePrices || []).map(t => ({
                _key: Math.random().toString(36).slice(2),
                minQty: t.minQty?.toString() || '',
                price: t.price?.toString() || ''
            })),
            wholesaleTiers: (product.variants || []).flatMap(v =>
                (v.wholesalePrices || []).map(t => ({
                    _key: Math.random().toString(36).slice(2),
                    variantName: v.name,
                    minQty: t.minQty?.toString() || '',
                    price: t.price?.toString() || ''
                }))
            ),
            // 自动检测是否EnableVariant类型分组（如果有任何Variant带 type 则Enable）
            enableVariantTypes: (product.variants || []).some(v => v.type && v.type.trim() !== ''),
            status: product.status?.toLowerCase() || 'active',
            deliveryNote: product.deliveryNote || ''
        })
        fetchCategories()
        setShowModal(true)
    }

    const handleDelete = (product) => {
        showConfirm(
            L('删除商品', 'Delete Product'),
            L(\`确定要删除商品 "\${product.name}" 吗？此操作无法撤销。\`, \`Delete product "\${product.name}"? This cannot be undone.\`),
            async () => {
                try {
                    const response = await fetch(\`/api/admin/products/\${product.id}\`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': \`Bearer \${token}\`
                        }
                    })
                    if (!response.ok) {
                        throw new Error('Delete failed')
                    }
                    showToast(L('商品已删除', 'Product deleted'), 'success')
                    fetchProducts()
                } catch (error) {
                    showToast(L('删除失败: ', 'Delete failed: ') + error.message, 'error')
                }
            }
        )
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // 校验：必须有Variant价格 或 顶层售价
        const validVariants = formData.variants.filter(v => v.name && v.price)
        const topPrice = parseFloat(formData.price)
        if (validVariants.length === 0 && (!topPrice || topPrice <= 0)) {
            showToast(L('请添加商品规格，或在“售价”字段中输入价格', 'Please add product variants, or enter a price in the "Price" field'), 'error')
            return
        }

        // 准备Products据
        // 提取图片路径数组
        const imagePaths = formData.images.map(img => {
            if (typeof img === 'string') return img
            return img.urls?.medium || img.urls?.original || img
        })

        // 价格：有Variant则后端自动取最低；没Variant用顶层售价
        const productData = {
            name: formData.name,
            description: formData.description,
            fullDescription: formData.fullDescription,
            price: validVariants.length > 0 ? 0 : (parseFloat(formData.price) || 0),
            stock: formData.stock ? parseInt(formData.stock) : 0,
            image: imagePaths[0] || null,
            images: imagePaths,
            weight: parseInt(formData.weight) || 0,
            variants: formData.variants.filter(v => v.name && v.price).map(v => ({
                ...v,
                wholesalePrices: formData.wholesaleTiers
                    .filter(t => t.variantName === v.name && t.minQty && t.price)
                    .map(t => ({ minQty: parseInt(t.minQty), price: parseFloat(t.price) }))
            })),
            wholesalePrices: formData.wholesalePrices
                .filter(t => t.minQty && t.price)
                .map(t => ({ minQty: parseInt(t.minQty), price: parseFloat(t.price) })),
            status: formData.status?.toUpperCase() || 'ACTIVE',
            deliveryNote: formData.deliveryNote || ''
        }

        // 只有选择了分类才包含 categoryId
        if (formData.categoryId && formData.categoryId !== '') {
            productData.categoryId = formData.categoryId
        }

        try {
            const url = editingProduct
                ? \`/api/admin/products/\${editingProduct.id}\`
                : '/api/admin/products'

            const response = await fetch(url, {
                method: editingProduct ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify(productData)
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Operation failed')
            }

            if (editingProduct) {
                showToast(L('商品已更新', 'Product updated'), 'success')
            } else {
                showToast(L('商品添加成功', 'Product added'), 'success')
            }
            setShowModal(false)
            // Refresh页面以显示新Product（临时方案）
            fetchProducts()
        } catch (error) {
            showToast(L('操作失败: ', 'Operation failed: ') + error.message, 'error')
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    // 处理图片选择
    const handleImageSelect = async (e) => {
        const files = Array.from(e.target.files)
        if (files.length === 0) return

        // 验证并生成预览
        const newPending = []
        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                showToast(L(\`\${file.name} 不是图片文件\`, \`\${file.name} is not an image file\`), 'warning')
                continue
            }
            if (file.size > 5 * 1024 * 1024) {
                showToast(L(\`\${file.name} 超过了 5MB限制\`, \`\${file.name} exceeds 5MB\`), 'warning')
                continue
            }
            // 生成预览
            const preview = await new Promise((resolve) => {
                const reader = new FileReader()
                reader.onload = (ev) => resolve(ev.target.result)
                reader.readAsDataURL(file)
            })
            newPending.push({ file, preview, name: file.name })
        }
        setPendingImages(prev => [...prev, ...newPending])
        e.target.value = '' // 重置 input
    }

    // Upload待Upload图片
    const handleUploadImages = async () => {
        if (pendingImages.length === 0) {
            showToast(L('请先选择图片', 'Please select images first'), 'warning')
            return
        }

        setIsUploading(true)
        setUploadProgress(0)

        try {
            const formDataUpload = new FormData()
            pendingImages.forEach(item => {
                formDataUpload.append('images', item.file)
            })

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formDataUpload
            })

            if (!response.ok) {
                throw new Error('Upload failed')
            }

            const result = await response.json()

            // Add到Uploaded列表
            const newImages = result.images.map(img => ({
                fileName: img.fileName,
                urls: img.urls
            }))

            setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...newImages]
            }))

            setPendingImages([])
            setUploadProgress(100)
            showToast(L(\`成功上传 \${result.images.length} 张图片\`, \`Successfully uploaded \${result.images.length} images\`), 'success')
        } catch (error) {
            showToast(L('图片上传失败: ', 'Image upload failed: ') + error.message, 'error')
        } finally {
            setIsUploading(false)
        }
    }

    // Delete待Upload图片
    const removePendingImage = (index) => {
        setPendingImages(prev => prev.filter((_, i) => i !== index))
    }

    // DeleteUploaded图片
    const removeUploadedImage = async (index) => {
        const image = formData.images[index]
        try {
            await fetch(\`/api/upload/\${image.fileName}\`, {
                method: 'DELETE'
            })
            setFormData(prev => ({
                ...prev,
                images: prev.images.filter((_, i) => i !== index)
            }))
            showToast(L('图片已删除', 'Image deleted'), 'success')
        } catch (error) {
            showToast(L('删除失败', 'Delete failed'), 'error')
        }
    }

    return (
        <div className="manage-page">
            <div className="page-header">
                <h2>{L('admin.products.title')}</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-secondary" onClick={openCategoryModal}>{L('admin.products.categories')}</button>
                    <button className="btn btn-primary" onClick={handleAdd}>{L('admin.products.add')}</button>
                </div>
            </div>
            <div className="products-table-wrapper">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>{L('admin.products.table.name')}</th>
                            <th>{L('admin.products.table.price')}</th>
                            <th>{L('admin.products.table.stock')}</th>
                            <th>{L('admin.cards.sold')}</th>
                            <th>{L('admin.products.table.weight')}</th>
                            <th>{L('admin.common.status')}</th>
                            <th>{L('admin.common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>{L('admin.common.loading')}</td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>{L('inline.no.products.e7dfa4b')}</td></tr>
                        ) : products.map(product => (
                            <tr key={product.id}>
                                <td>{product.name}</td>
                                <td>{formatMoney(product.price)}</td>
                                <td>{product.stock}</td>
                                <td>{product.soldCount || 0}</td>
                                <td>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        background: product.weight > 50 ? 'rgba(255,107,53,0.12)' : product.weight > 0 ? 'rgba(59,130,246,0.1)' : 'rgba(148,163,184,0.1)',
                                        color: product.weight > 50 ? '#ff6b35' : product.weight > 0 ? '#3b82f6' : '#94a3b8'
                                    }}>{product.weight || 0}</span>
                                </td>
                                <td>
                                    <span className={\`status-badge \${product.status?.toLowerCase()}\`}>
                                        {product.status === 'ACTIVE' ? L('admin.products.active') : L('admin.products.inactive')}
                                    </span>
                                </td>
                                <td className="actions">
                                    <button className="action-btn edit" onClick={() => handleEdit(product)}>{L('admin.common.edit')}</button>
                                    <button className="action-btn cards" onClick={() => navigate(\`\${basePath}/cards?productId=\${product.id}\`)}>{L('admin.products.cards')}</button>
                                    <button
                                        className={\`action-btn \${stockAlertIds.includes(product.id) ? 'alert-on' : 'alert-off'}\`}
                                        onClick={(e) => { e.stopPropagation(); toggleStockAlert(product.id) }}
                                        title={stockAlertIds.includes(product.id) ? L('禁用库存警报', 'Disable stock alert') : L('启用库存警报', 'Enable stock alert')}
                                    >
                                        {stockAlertIds.includes(product.id) ? <FiBell /> : <FiBellOff />}
                                    </button>
                                    <button className="action-btn delete" onClick={() => handleDelete(product)}>{L('admin.common.delete')}</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Product弹窗 */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{editingProduct ? L('inline.edit.product.f161576') : L('admin.products.add')}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>{L('admin.products.table.name')} *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder={L('admin.products.table.name')}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>{L('简短描述', 'Short Description')} <span style={{ color: '#999', fontWeight: 'normal' }}>{L('（展示在商品卡片及标题下方）', '(shown on product card and below title)')}</span></label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder={L('商品亮点一句话介绍', 'One-line product highlight')}
                                    rows={2}
                                />
                            </div>
                            <div className="form-group">
                                <label>{L('详细描述', 'Full Description')} <span style={{ color: '#999', fontWeight: 'normal' }}>{L('（展示在商品详情页底部）', '(shown at bottom of product detail page)')}</span></label>
                                <textarea
                                    name="fullDescription"
                                    value={formData.fullDescription}
                                    onChange={handleChange}
                                    placeholder={L('【商品详情】\\\\n• 介绍详情1\\\\n• 介绍详情2\\\\n\\\\n【使用说明】\\\\n1. 第一步\\\\n2. 第二步', '【Product Info】\\\\n• Item detail 1\\\\n• Item detail 2\\\\n\\\\n【How to Use】\\\\n1. Step one\\\\n2. Step two')}
                                    rows={6}
                                />
                            </div>

                            {/* Variants - 放在价格上方 */}
                            <div className="form-group variants-section">
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span>
                                        {L('规格变体', 'Variants')}
                                        <span style={{ color: '#999', fontWeight: 'normal', marginLeft: 8 }}>
                                            {L('（可选，例如：月付、季付、年付）', '(optional, e.g.: Monthly, Quarterly, Annual)')}
                                        </span>
                                    </span>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'normal', fontSize: '0.9rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.enableVariantTypes || false}
                                            onChange={(e) => {
                                                setFormData({ ...formData, enableVariantTypes: e.target.checked })
                                            }}
                                            style={{ width: 16, height: 16 }}
                                        />
                                        {L('启用规格分组', 'Enable variant type grouping')}
                                    </label>
                                </label>

                                {formData.enableVariantTypes ? (
                                    /* 带类型分组的Variant */
                                    <>
                                        {(() => {
                                            // 按类型分组Variant
                                            const types = [...new Set(formData.variants.map(v => v.type || 'Default').filter(Boolean))]
                                            if (types.length === 0) types.push('Default')

                                            return types.map((typeName, typeIndex) => (
                                                <div key={typeIndex} className="variant-type-group" style={{
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: 8,
                                                    padding: 16,
                                                    marginBottom: 12,
                                                    background: 'var(--card-bg)'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                                        <span style={{ fontWeight: 500 }}>{L('类型:', 'Type:')}</span>
                                                        <input
                                                            type="text"
                                                            value={typeName === 'Default' ? '' : typeName}
                                                            placeholder={L('输入规格类型名称，如：共享型、独享型', 'Enter type name, e.g.: Shared, Dedicated')}
                                                            onChange={(e) => {
                                                                const oldType = typeName
                                                                const newType = e.target.value || 'Default'
                                                                const newVariants = formData.variants.map(v =>
                                                                    (v.type || 'Default') === oldType ? { ...v, type: newType === 'Default' ? '' : newType } : v
                                                                )
                                                                setFormData({ ...formData, variants: newVariants })
                                                            }}
                                                            style={{ flex: 1 }}
                                                        />
                                                        {types.length > 1 && (
                                                            <button
                                                                type="button"
                                                                className="remove-variant-btn"
                                                                onClick={() => {
                                                                    const newVariants = formData.variants.filter(v => (v.type || 'Default') !== typeName)
                                                                    setFormData({ ...formData, variants: newVariants })
                                                                }}
                                                                title={L('删除此类型', 'Delete this type')}
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* 该类型下的Variant列表 */}
                                                    {formData.variants
                                                        .map((v, i) => ({ ...v, originalIndex: i }))
                                                        .filter(v => (v.type || 'Default') === typeName)
                                                        .map((variant) => (
                                                            <div key={variant.originalIndex} className="variant-row">
                                                                <button
                                                                    type="button"
                                                                    className="move-variant-btn"
                                                                    disabled={variant.originalIndex === 0 || (formData.variants[variant.originalIndex - 1]?.type || '') !== (variant.type || '')}
                                                                    title={L('上移', 'Move up')}
                                                                    onClick={() => {
                                                                        const newVariants = [...formData.variants]
                                                                        const i = variant.originalIndex
                                                                        ;[newVariants[i - 1], newVariants[i]] = [newVariants[i], newVariants[i - 1]]
                                                                        setFormData({ ...formData, variants: newVariants })
                                                                    }}
                                                                >
                                                                    ↑
                                                                </button>
                                                                <input
                                                                    type="text"
                                                                    placeholder={L('规格名称', 'Variant name')}
                                                                    value={variant.name}
                                                                    onChange={(e) => {
                                                                        const newVariants = [...formData.variants]
                                                                        newVariants[variant.originalIndex].name = e.target.value
                                                                        setFormData({ ...formData, variants: newVariants })
                                                                    }}
                                                                    style={{ flex: 2 }}
                                                                />
                                                                <input
                                                                    type="number"
                                                                    placeholder={L('售价', 'Price')}
                                                                    value={variant.price}
                                                                    onChange={(e) => {
                                                                        const newVariants = [...formData.variants]
                                                                        newVariants[variant.originalIndex].price = e.target.value
                                                                        setFormData({ ...formData, variants: newVariants })
                                                                    }}
                                                                    step="0.01"
                                                                    style={{ flex: 1 }}
                                                                />
                                                                {stockMode === 'manual' && (
                                                                <input
                                                                    type="number"
                                                                    placeholder={L('库存', 'Stock')}
                                                                    value={variant.stock}
                                                                    onChange={(e) => {
                                                                        const newVariants = [...formData.variants]
                                                                        newVariants[variant.originalIndex].stock = e.target.value
                                                                        setFormData({ ...formData, variants: newVariants })
                                                                    }}
                                                                    style={{ flex: 1 }}
                                                                />
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    className="remove-variant-btn"
                                                                    onClick={() => {
                                                                        const newVariants = formData.variants.filter((_, i) => i !== variant.originalIndex)
                                                                        setFormData({ ...formData, variants: newVariants })
                                                                    }}
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        ))}

                                                    <button
                                                        type="button"
                                                        className="add-variant-btn"
                                                        style={{ marginTop: 8 }}
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData,
                                                                variants: [...formData.variants, {
                                                                    type: typeName === 'Default' ? '' : typeName,
                                                                    name: '',
                                                                    price: '',
                                                                    
                                                                    stock: '0'
                                                                }]
                                                            })
                                                        }}
                                                    >
                                                        + {L('添加规格', 'Add Variant')}
                                                    </button>
                                                </div>
                                            ))
                                        })()}

                                        <button
                                            type="button"
                                            className="add-variant-btn"
                                            style={{ background: 'transparent', border: '2px dashed var(--border-color)', color: 'var(--primary-color)' }}
                                            onClick={() => {
                                                const existingTypes = [...new Set(formData.variants.map(v => v.type || 'Default'))]
                                                const newTypeName = \`Type\${existingTypes.length + 1}\`
                                                setFormData({
                                                    ...formData,
                                                    variants: [...formData.variants, {
                                                        type: newTypeName,
                                                        name: '',
                                                        price: '',
                                                        
                                                        stock: '0'
                                                    }]
                                                })
                                            }}
                                        >
                                            + {L('添加规格类型', 'Add Type')}
                                        </button>
                                    </>
                                ) : (
                                    /*None类型分组的简单Variant */
                                    <>
                                        {formData.variants.map((variant, index) => (
                                            <div key={index} className="variant-row">
                                                <button
                                                    type="button"
                                                    className="move-variant-btn"
                                                    disabled={index === 0}
                                                    title={L('上移', 'Move up')}
                                                    onClick={() => {
                                                        const newVariants = [...formData.variants]
                                                        ;[newVariants[index - 1], newVariants[index]] = [newVariants[index], newVariants[index - 1]]
                                                        setFormData({ ...formData, variants: newVariants })
                                                    }}
                                                >
                                                    ↑
                                                </button>
                                                <input
                                                    type="text"
                                                    placeholder={L('规格名称', 'Variant name')}
                                                    value={variant.name}
                                                    onChange={(e) => {
                                                        const newVariants = [...formData.variants]
                                                        newVariants[index].name = e.target.value
                                                        setFormData({ ...formData, variants: newVariants })
                                                    }}
                                                    style={{ flex: 2 }}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder={L('售价', 'Price')}
                                                    value={variant.price}
                                                    onChange={(e) => {
                                                        const newVariants = [...formData.variants]
                                                        newVariants[index].price = e.target.value
                                                        setFormData({ ...formData, variants: newVariants })
                                                    }}
                                                    step="0.01"
                                                    style={{ flex: 1 }}
                                                />
                                                {stockMode === 'manual' && (
                                                <input
                                                    type="number"
                                                    placeholder={L('库存', 'Stock')}
                                                    value={variant.stock}
                                                    onChange={(e) => {
                                                        const newVariants = [...formData.variants]
                                                        newVariants[index].stock = e.target.value
                                                        setFormData({ ...formData, variants: newVariants })
                                                    }}
                                                    style={{ flex: 1 }}
                                                />
                                                )}
                                                <button
                                                    type="button"
                                                    className="remove-variant-btn"
                                                    onClick={() => {
                                                        const newVariants = formData.variants.filter((_, i) => i !== index)
                                                        setFormData({ ...formData, variants: newVariants })
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}

                                        <button
                                            type="button"
                                            className="add-variant-btn"
                                            onClick={() => {
                                                setFormData({
                                                    ...formData,
                                                    variants: [...formData.variants, { name: '', price: '',  stock: '0' }]
                                                })
                                            }}
                                        >
                                            + {L('添加规格', 'Add Variant')}
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* 售价 + 库存（始终显示售价；手动Stock Mode +NoneVariant才显示库存） */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>{L('商品售价', 'Price')} ({getCurrencySymbol()}) *</label>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        step="0.01"
                                        required={!(formData.variants.length > 0 && formData.variants.some(v => v.name))}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {L('添加规格变体后，商品售价将以规格定价为准', 'When variants are added, price follows variant pricing')}
                                    </span>
                                </div>
                                {!(formData.variants.length > 0 && formData.variants.some(v => v.name)) && stockMode === 'manual' && (
                                    <div className="form-group">
                                        <label>{L('库存 *', 'Stock *')}</label>
                                        <input
                                            type="number"
                                            name="stock"
                                            value={formData.stock}
                                            onChange={handleChange}
                                            placeholder="0"
                                            min="0"
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Wholesale Pricing —— 独立区块，有Variant时Approve下拉绑定Variant Name */}
                            <div className="form-group wholesale-section">
                                <label>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 6 }}>
                                        <polyline points="7 13 12 18 17 13" />
                                        <polyline points="7 6 12 11 17 6" />
                                    </svg>
                                    {L('批发价格阶梯 (起批价)', 'Wholesale Pricing')}
                                    <span style={{ color: '#999', fontWeight: 'normal', fontSize: '0.85rem', marginLeft: 8 }}>
                                        {L('当购买达到指定数量时自动适用此价格', 'Auto-applied when minimum quantity is reached')}
                                    </span>
                                </label>
                                <div className="wholesale-editor wholesale-editor--standalone wholesale-editor--open">
                                    <div className="wholesale-editor__body">
                                        {(() => {
                                            const hasVariants = formData.variants.length > 0 && formData.variants.some(v => v.name)
                                            const variantNames = hasVariants
                                                ? formData.variants.filter(v => v.name).map(v => v.name)
                                                : []

                                            const allTiers = hasVariants
                                                ? formData.wholesaleTiers
                                                : formData.wholesalePrices

                                            const updateTier = (key, field, value) => {
                                                if (hasVariants) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        wholesaleTiers: prev.wholesaleTiers.map(t =>
                                                            t._key === key ? { ...t, [field]: value } : t
                                                        )
                                                    }))
                                                } else {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        wholesalePrices: prev.wholesalePrices.map(t =>
                                                            t._key === key ? { ...t, [field]: value } : t
                                                        )
                                                    }))
                                                }
                                            }

                                            const removeTier = (key) => {
                                                if (hasVariants) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        wholesaleTiers: prev.wholesaleTiers.filter(t => t._key !== key)
                                                    }))
                                                } else {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        wholesalePrices: prev.wholesalePrices.filter(t => t._key !== key)
                                                    }))
                                                }
                                            }

                                            const changeVariantBinding = (key, newVariantName) => {
                                                if (!hasVariants) return
                                                setFormData(prev => ({
                                                    ...prev,
                                                    wholesaleTiers: prev.wholesaleTiers.map(t =>
                                                        t._key === key ? { ...t, variantName: newVariantName } : t
                                                    )
                                                }))
                                            }

                                            const addTier = () => {
                                                const firstVariantName = variantNames[0] || ''
                                                const newTier = {
                                                    _key: Math.random().toString(36).slice(2),
                                                    ...(hasVariants ? { variantName: firstVariantName } : {}),
                                                    minQty: '',
                                                    price: ''
                                                }
                                                if (hasVariants) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        wholesaleTiers: [...prev.wholesaleTiers, newTier]
                                                    }))
                                                } else {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        wholesalePrices: [...prev.wholesalePrices, newTier]
                                                    }))
                                                }
                                            }

                                            return (
                                                <>
                                                    {allTiers.length > 0 && (
                                                        <div className={\`wholesale-editor__header-row \${hasVariants ? 'wholesale-editor__header-row--with-variant' : ''}\`}>
                                                            {hasVariants && (
                                                                <span className="wholesale-editor__col-label">{L('绑定规格', 'Variant')}</span>
                                                            )}
                                                            <span className="wholesale-editor__col-label">{L('起购数量', 'Min Qty')}</span>
                                                            <span className="wholesale-editor__col-label">{L('批发单价', 'Unit Price')} ({getCurrencySymbol()})</span>
                                                            <span />
                                                        </div>
                                                    )}
                                                    {allTiers.map((tier, idx) => (
                                                        <div key={tier._key} className={\`wholesale-editor__tier-row \${hasVariants ? 'wholesale-editor__tier-row--with-variant' : ''}\`}>
                                                            <span className="wholesale-editor__tier-index">{idx + 1}</span>
                                                            {hasVariants && (
                                                                <div className="wholesale-editor__input-wrap">
                                                                    <select
                                                                        className="wholesale-editor__select"
                                                                        value={tier.variantName}
                                                                        onChange={(e) => changeVariantBinding(tier._key, e.target.value)}
                                                                    >
                                                                        {variantNames.map(name => (
                                                                            <option key={name} value={name}>{name}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}
                                                            <div className="wholesale-editor__input-wrap">
                                                                <input
                                                                    type="number"
                                                                    className="wholesale-editor__input"
                                                                    placeholder={L('如: 10', 'e.g. 10')}
                                                                    min="1"
                                                                    value={tier.minQty}
                                                                    onChange={(e) => updateTier(tier._key, 'minQty', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="wholesale-editor__input-wrap">
                                                                <input
                                                                    type="number"
                                                                    className="wholesale-editor__input"
                                                                    placeholder={L('如: 9.90', 'e.g. 9.90')}
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={tier.price}
                                                                    onChange={(e) => updateTier(tier._key, 'price', e.target.value)}
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="wholesale-editor__remove-btn"
                                                                onClick={() => removeTier(tier._key)}
                                                                title={L('删除此阶梯', 'Delete this tier')}
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="3 6 5 6 21 6" />
                                                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        className="wholesale-editor__add-btn"
                                                        onClick={addTier}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <line x1="12" y1="5" x2="12" y2="19" />
                                                            <line x1="5" y1="12" x2="19" y2="12" />
                                                        </svg>
                                                        {L('添加批发价阶梯', 'Add wholesale tier')}
                                                    </button>
                                                </>
                                            )
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>{L('所属分类', 'Category')}</label>
                                <CustomSelect
                                    name="categoryId"
                                    value={formData.categoryId}
                                    onChange={handleChange}
                                    placeholder={L('选择分类', 'Select category')}
                                    options={categories.map(cat => ({
                                        value: cat.id,
                                        label: \`\${cat.icon} \${cat.name}\`
                                    }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>{L('商品排序权重', 'Product Weight')} <span style={{ color: '#999', fontWeight: 'normal' }}>{L('（0-100，数值越大排序越靠前，默认 0）', '(0-100，Higher = higher priority, default 0)')}</span></label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <input
                                        type="range"
                                        name="weight"
                                        min="0"
                                        max="100"
                                        value={formData.weight}
                                        onChange={handleChange}
                                        style={{ flex: 1, cursor: 'pointer' }}
                                    />
                                    <input
                                        type="number"
                                        name="weight"
                                        min="0"
                                        max="100"
                                        value={formData.weight}
                                        onChange={handleChange}
                                        style={{ width: '80px', textAlign: 'center', padding: '6px 8px' }}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{L('商品图片', 'Product Images')} <span className="upload-count">{L(\`（已上传 \${formData.images.length} 张，\${pendingImages.length} 张待上传）\`, \`(\${formData.images.length} uploaded, \${pendingImages.length} pending)\`)}</span></label>
                                <div className="image-upload-area multi">
                                    {/* Uploaded images */}
                                    {formData.images.map((img, index) => {
                                        // 处理不同格式 of 图片数据
                                        const imgUrl = typeof img === 'string'
                                            ? \`\${img}\`
                                            : img.urls?.medium
                                                ? \`\${img.urls.medium}\`
                                                : \`\${img.urls?.original || img}\`
                                        return (
                                            <div key={\`uploaded-\${index}\`} className="image-preview uploaded">
                                                <img src={imgUrl} alt={\`Uploaded \${index + 1}\`} />
                                                <button
                                                    type="button"
                                                    className="remove-image-btn"
                                                    onClick={() => removeUploadedImage(index)}
                                                >
                                                    ×
                                                </button>
                                                <span className="image-status done">✓</span>
                                            </div>
                                        )
                                    })}

                                    {/* pending的图片 */}
                                    {pendingImages.map((img, index) => (
                                        <div key={\`pending-\${index}\`} className="image-preview pending">
                                            <img src={img.preview} alt={img.name} />
                                            <button
                                                type="button"
                                                className="remove-image-btn"
                                                onClick={() => removePendingImage(index)}
                                            >
                                                ×
                                            </button>
                                            <span className="image-status pending">{L('待上传', 'pending')}</span>
                                        </div>
                                    ))}

                                    {/* Add Image按钮 */}
                                    <label className="upload-add-btn">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageSelect}
                                            style={{ display: 'none' }}
                                        />
                                        <div className="upload-add-content">
                                            <FiImage className="upload-icon" />
                                            <span>{L('添加图片', 'Add Image')}</span>
                                        </div>
                                    </label>
                                </div>

                                {/* Upload按钮和进度 */}
                                {pendingImages.length > 0 && (
                                    <div className="upload-actions">
                                        <button
                                            type="button"
                                            className="btn btn-primary upload-btn"
                                            onClick={handleUploadImages}
                                            disabled={isUploading}
                                        >
                                            {isUploading ? L('上传中...', 'Uploading...') : L(\`上传 \${pendingImages.length} 张图片\`, \`Upload \${pendingImages.length} image(s)\`)}
                                        </button>
                                        {isUploading && (
                                            <div className="upload-progress-bar">
                                                <div className="upload-progress-fill" style={{ width: \`\${uploadProgress}%\` }} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label>{L('发货附言 (提货说明)', 'Delivery Note')} <span style={{ color: '#999', fontWeight: 'normal' }}>{L('（发货后展示在订单提货页面，不填则隐藏）', '(Shown on order page after shipping. Leave empty to hide.)')}</span></label>
                                <textarea
                                    name="deliveryNote"
                                    value={formData.deliveryNote}
                                    onChange={handleChange}
                                    placeholder={L('例如：请使用浏览器无痕模式登录...', 'e.g. Please login in incognito mode...')}
                                    rows={3}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>{L('状态', 'Status')}</label>
                                <select name="status" value={formData.status} onChange={handleChange}>
                                    <option value="active">{L('上架销售', 'Active')}</option>
                                    <option value="inactive">{L('下架仓库', 'Inactive')}</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    {L('取消', 'Cancel')}
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingProduct ? L('保存修改', 'Save Changes') : L('admin.products.add')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Categories弹窗 */}
            {showCategoryModal && (
                <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📁 {L('分类管理', 'Categories')}</h3>
                            <button className="modal-close" onClick={() => setShowCategoryModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* Add New Category */}
                            <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>{L('添加新分类', 'Add New Category')}</h4>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder={L('图标 (表情)', 'Icon (emoji)')}
                                        value={newCategory.icon}
                                        onChange={e => setNewCategory(prev => ({ ...prev, icon: e.target.value }))}
                                        className="input"
                                        style={{ width: '80px', textAlign: 'center', fontSize: '20px' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder={L('分类名称', 'Category Name')}
                                        value={newCategory.name}
                                        onChange={e => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                                        className="input"
                                        style={{ flex: 1 }}
                                    />
                                    <button className="btn btn-primary" onClick={handleAddCategory}>{L('添加', 'Add')}</button>
                                </div>
                            </div>

                            {/* 分类列表 */}
                            <div>
                                <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    {L(\`已有分类 (\${categories.length})\`, \`Existing Categories (\${categories.length})\`)}
                                </h4>
                                {categories.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>{L('暂无分类', 'No categories')}</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {categories.map(cat => (
                                            editingCategory?.id === cat.id ? (
                                                <div key={cat.id} style={{
                                                    padding: '12px 16px',
                                                    background: 'var(--bg-secondary)',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--primary, #ff6b35)',
                                                    display: 'flex', flexDirection: 'column', gap: 8
                                                }}>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <input
                                                            type="text"
                                                            value={editingCategory.icon}
                                                            onChange={e => setEditingCategory(prev => ({ ...prev, icon: e.target.value }))}
                                                            className="input"
                                                            style={{ width: 70, textAlign: 'center', fontSize: 18 }}
                                                            placeholder={L('图标', 'Icon')}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editingCategory.name}
                                                            onChange={e => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
                                                            className="input"
                                                            style={{ flex: 1 }}
                                                            placeholder={L('分类名称', 'Category Name')}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={() => setEditingCategory(null)}
                                                            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                                                        >{L('admin.common.cancel')}</button>
                                                        <button
                                                            className="btn btn-primary"
                                                            onClick={handleUpdateCategory}
                                                            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                                                        >{L('保存', 'Save')}</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div key={cat.id} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '12px 16px',
                                                    background: 'var(--bg-secondary)',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border-color)'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <span style={{ fontSize: '24px' }}>{cat.icon}</span>
                                                        <div>
                                                            <div style={{ fontWeight: '500' }}>{cat.name}</div>
                                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                                                {L(\`\${cat.productCount || 0} 个商品\`, \`\${cat.productCount || 0} product(s)\`)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button
                                                            className="action-btn edit"
                                                            onClick={() => setEditingCategory({ id: cat.id, name: cat.name, icon: cat.icon || '📦' })}
                                                            style={{ padding: '6px 12px' }}
                                                        >{L('编辑', 'Edit')}</button>
                                                        <button
                                                            className="action-btn delete"
                                                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                            style={{ padding: '6px 12px' }}
                                                        >{L('删除', 'Delete')}</button>
                                                    </div>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
`;

const newContent = prefix + translatedProducts + suffix;
fs.writeFileSync(file, newContent, 'utf8');
console.log('Successfully translated ProductsManage!');
