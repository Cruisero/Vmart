const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../frontend/src/pages/Admin/Dashboard/index.jsx');
let content = fs.readFileSync(file, 'utf8');

const startTag = 'function UsersManage() {';
const startIdx = content.indexOf(startTag);
if (startIdx === -1) {
    console.error('UsersManage start not found');
    process.exit(1);
}

const endTag = 'function BackupSettings';
const endIdx = content.indexOf(endTag, startIdx);
if (endIdx === -1) {
    console.error('BackupSettings start not found');
    process.exit(1);
}

console.log('Replacing UsersManage from', startIdx, 'to', endIdx);

const prefix = content.slice(0, startIdx);
const suffix = content.slice(endIdx);

const translatedUsers = `function UsersManage() {
    const location = useLocation()
    const L = useAdminL()
    const basePath = location.pathname.replace(/\\/users.*$/, '') || '/admin'
    const [agentEnabled, setAgentEnabled] = useState(true) // 默认显示，待配置加载
    const navigate = useNavigate()
    const { showToast, showConfirm } = useToast()
    const token = useAuthStore(state => state.token)
    const currentUser = useAuthStore(state => state.user)
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'
    const [users, setUsers] = useState([])
    const [initialLoading, setInitialLoading] = useState(true)
    const [searching, setSearching] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalUsers, setTotalUsers] = useState(0)
    const [adminCount, setAdminCount] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const pageSize = 20

    // 拉取Agent开关Status
    useEffect(() => {
        if (!token) return
        fetch('/api/admin/settings', { headers: { Authorization: \`Bearer \${token}\` } })
            .then(r => r.json())
            .then(d => {
                const v = d?.settings?.agentEnabled
                setAgentEnabled(v === true || v === 'true')
            })
            .catch(() => {})
    }, [token])
    const searchTimerRef = useRef(null)
    const [showCreateAdmin, setShowCreateAdmin] = useState(false)
    const [newAdmin, setNewAdmin] = useState({ email: '', password: '', username: '' })
    const [creating, setCreating] = useState(false)

    // 统一用 ref 追踪最新值，避免闭包陷阱
    const searchTermRef = useRef(searchTerm)
    const roleFilterRef = useRef(roleFilter)
    const currentPageRef = useRef(currentPage)
    searchTermRef.current = searchTerm
    roleFilterRef.current = roleFilter
    currentPageRef.current = currentPage

    const doFetch = async (page, search, role, isFirstLoad = false) => {
        if (isFirstLoad) setInitialLoading(true)
        else setSearching(true)
        try {
            const params = new URLSearchParams({ page, pageSize, search, role })
            const res = await fetch(\`/api/admin/users?\${params}\`, {
                headers: { 'Authorization': \`Bearer \${token}\` }
            })
            const data = await res.json()
            setUsers(data.users || [])
            setTotalUsers(data.total || 0)
            setAdminCount((data.users || []).filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length)
            setTotalPages(Math.ceil((data.total || 0) / pageSize))
        } catch (error) {
            showToast(L('加载用户列表失败', 'Failed to load users'), 'error')
        } finally {
            setInitialLoading(false)
            setSearching(false)
        }
    }

    // 首次加载
    useEffect(() => {
        doFetch(1, '', 'all', true)
    }, [token])

    // 翻页 / Role筛选
    useEffect(() => {
        if (initialLoading) return
        doFetch(currentPage, searchTermRef.current, roleFilter)
    }, [currentPage, roleFilter])

    // Search防抖
    useEffect(() => {
        clearTimeout(searchTimerRef.current)
        searchTimerRef.current = setTimeout(() => {
            setSearchTerm(searchInput)
            if (currentPageRef.current !== 1) {
                setCurrentPage(1)
            } else {
                doFetch(1, searchInput, roleFilterRef.current)
            }
        }, 400)
        return () => clearTimeout(searchTimerRef.current)
    }, [searchInput])

    const handleChangeRole = async (userId, newRole) => {
        try {
            const res = await fetch(\`/api/admin/users/\${userId}/role\`, {
                method: 'PATCH',
                headers: { 'Authorization': \`Bearer \${token}\`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            })
            if (res.ok) {
                showToast(L('用户角色更新成功', 'Role updated'), 'success')
                doFetch(currentPageRef.current, searchTermRef.current, roleFilterRef.current)
            } else {
                const data = await res.json()
                showToast(data.error || L('更新用户角色失败', 'Role update failed'), 'error')
            }
        } catch {
            showToast(L('操作失败', 'Operation failed'), 'error')
        }
    }

    const handleCreateAdmin = async (e) => {
        e.preventDefault()
        if (!newAdmin.email || !newAdmin.password) {
            showToast(L('请输入邮箱和密码', 'Please enter email and password'), 'error')
            return
        }
        setCreating(true)
        try {
            const res = await fetch('/api/admin/admins', {
                method: 'POST',
                headers: { 'Authorization': \`Bearer \${token}\`, 'Content-Type': 'application/json' },
                body: JSON.stringify(newAdmin)
            })
            const data = await res.json()
            if (res.ok) {
                showToast(L('子管理员创建成功', 'Sub-admin created'), 'success')
                setShowCreateAdmin(false)
                setNewAdmin({ email: '', password: '', username: '', role: 'ADMIN' })
                doFetch(currentPageRef.current, searchTermRef.current, roleFilterRef.current)
            } else {
                showToast(data.error || L('创建子管理员失败', 'Creation failed'), 'error')
            }
        } catch {
            showToast(L('创建失败', 'Creation failed'), 'error')
        } finally {
            setCreating(false)
        }
    }

    const handleDeleteAdmin = (userId, username) => {
        showConfirm(
            L('移除管理员权限', 'Remove Admin'), 
            L(\`确定要移除管理员“\${username}”的管理员权限吗？该账号将被降级为普通用户。\`, \`Are you sure you want to remove \${username} from admin? The account will be downgraded to regular user.\`), 
            async () => {
                try {
                    const res = await fetch(\`/api/admin/admins/\${userId}\`, {
                        method: 'DELETE',
                        headers: { 'Authorization': \`Bearer \${token}\` }
                    })
                    const data = await res.json()
                    if (res.ok) {
                        showToast(L('管理员移除成功', 'Admin removed'), 'success')
                        doFetch(currentPageRef.current, searchTermRef.current, roleFilterRef.current)
                    } else {
                        showToast(data.error || L('操作失败', 'Operation failed'), 'error')
                    }
                } catch {
                    showToast(L('操作失败', 'Operation failed'), 'error')
                }
            }
        )
    }

    const getRoleLabel = (role) => {
        switch (role) {
            case 'SUPER_ADMIN': return L('超级管理员', 'Super Admin')
            case 'TENANT_ADMIN': return L('店主', 'Store Owner')
            case 'ADMIN': return L('管理员', 'Admin')
            case 'AGENT': return L('代理分站', 'Agent')
            case 'CUSTOMER': return L('普通用户', 'Customer')
            default: return L('用户', 'User')
        }
    }

    if (initialLoading) {
        return (
            <div className="manage-page">
                <div className="users-skeleton">
                    <div className="users-skeleton-header" />
                    <div className="users-skeleton-toolbar" />
                    {[...Array(6)].map((_, i) => <div key={i} className="users-skeleton-row" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="manage-page">
            {/* 顶部统计卡片 */}
            <div className="users-header-cards">
                <div className="users-header-card">
                    <div className="users-header-card-icon total">
                        <FiUsers size={20} />
                    </div>
                    <div>
                        <div className="users-header-card-value">{totalUsers}</div>
                        <div className="users-header-card-label">{L('总用户数', 'Total Users')}</div>
                    </div>
                </div>
                <div className="users-header-card">
                    <div className="users-header-card-icon admin">
                        <FiShield size={20} />
                    </div>
                    <div>
                        <div className="users-header-card-value">{adminCount}</div>
                        <div className="users-header-card-label">{L('管理员', 'Admins')}</div>
                    </div>
                </div>
                <div className="users-header-card">
                    <div className="users-header-card-icon normal">
                        <FiUser size={20} />
                    </div>
                    <div>
                        <div className="users-header-card-value">{totalUsers - adminCount}</div>
                        <div className="users-header-card-label">{L('普通用户', 'Users')}</div>
                    </div>
                </div>
                {isSuperAdmin && (
                    <div className="users-header-card users-header-card-action" onClick={() => setShowCreateAdmin(true)}>
                        <div className="users-header-card-icon add">
                            <FiShield size={20} />
                        </div>
                        <div>
                            <div className="users-header-card-value" style={{ fontSize: '0.95rem' }}>{L('+ 新增', '+ Add')}</div>
                            <div className="users-header-card-label">{L('子管理员', 'Sub-Admins')}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Sub-Admin弹窗 */}
            {showCreateAdmin && (
                <div className="confirm-overlay" onClick={() => setShowCreateAdmin(false)}>
                    <div className="confirm-dialog" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <h3 className="confirm-title" style={{ marginTop: 0 }}>{L('新增子管理员', 'Add Sub-Admin')}</h3>
                        <form onSubmit={handleCreateAdmin}>
                            <div className="form-group">
                                <label>{L('邮箱 *', 'Email *')}</label>
                                <input type="email" className="form-input" required value={newAdmin.email} onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))} placeholder="admin@example.com" />
                            </div>
                            <div className="form-group">
                                <label>{L('密码 *', 'Password *')}</label>
                                <input type="password" className="form-input" required minLength={6} value={newAdmin.password} onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))} placeholder={L('最少 6 位字符', 'Min 6 chars')} />
                            </div>
                            <div className="form-group">
                                <label>{L('用户名', 'Username')}</label>
                                <input type="text" className="form-input" value={newAdmin.username} onChange={e => setNewAdmin(p => ({ ...p, username: e.target.value }))} placeholder={L('可选', 'Optional')} />
                            </div>
                            <div className="confirm-actions">
                                <button type="button" className="btn btn-cancel" onClick={() => setShowCreateAdmin(false)}>{L('取消', 'Cancel')}</button>
                                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? L('创建中...', 'Creating...') : L('创建', 'Create')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Search栏 */}
            <div className="users-search-bar">
                <div className="users-search-input-wrap">
                    <FiSearch className="users-search-icon" size={16} />
                    <input
                        type="text"
                        className="users-search-input"
                        placeholder={L('搜索邮箱或用户名...', 'Search email or username...')}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                    {searching && <span className="users-search-spinner" />}
                    {searchInput && !searching && (
                        <button className="users-search-clear" onClick={() => setSearchInput('')}>×</button>
                    )}
                </div>
                <div className="users-role-tabs">
                    {[['all', L('全部', 'All')], ['CUSTOMER', L('普通用户', 'Customer')], ['ADMIN', L('子管理员', 'Admin')], ['TENANT_ADMIN', L('店主', 'Owner')]].map(([val, label]) => (
                        <button
                            key={val}
                            className={\`users-role-tab\${roleFilter === val ? ' active' : ''}\`}
                            onClick={() => { setRoleFilter(val); setCurrentPage(1) }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="users-result-count">
                    {searchInput 
                        ? L(\`找到 \${totalUsers} 个匹配的用户\`, \`Found \${totalUsers} results\`) 
                        : L(\`总共 \${totalUsers} 个用户\`, \`Total \${totalUsers} users\`)}
                </div>
            </div>

            {/* User列表 */}
            <div className={\`users-table-wrapper\${searching ? ' users-table-searching' : ''}\`}>
                {users.length === 0 ? (
                    <div className="users-empty">
                        <FiUsers size={40} />
                        <p>{searchInput ? L(\`未找到匹配 “\${searchInput}” 的用户\`, \`No results for "\${searchInput}" matching users\`) : L('暂无客户用户', 'No customers')}</p>
                        {searchInput && (
                            <button className="btn btn-secondary btn-sm" onClick={() => setSearchInput('')}>{L('清空搜索', 'Clear Search')}</button>
                        )}
                    </div>
                ) : (
                    <table className="admin-table users-table">
                        <thead>
                            <tr>
                                <th>{L('用户', 'User')}</th>
                                <th>{L('角色', 'Role')}</th>
                                {agentEnabled && <th>{L('来源', 'Source')}</th>}
                                <th>{L('订单量', 'Orders')}</th>
                                <th>{L('注册时间', 'Registered')}</th>
                                <th>{L('操作', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-avatar-sm">
                                                {(user.username || user.email || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="user-info-cell">
                                                <span className="user-name-cell">{user.username || L('未设置', 'Not set')}</span>
                                                <span className="user-email-cell">{user.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {isSuperAdmin && user.role !== 'SUPER_ADMIN' ? (
                                            <select
                                                className={\`role-select \${(user.role || '').toLowerCase()}\`}
                                                value={user.role}
                                                onChange={(e) => handleChangeRole(user.id, e.target.value)}
                                            >
                                                <option value="USER">{L('普通用户', 'Users')}</option>
                                                <option value="ADMIN">{L('子管理员', 'Admins')}</option>
                                            </select>
                                        ) : (
                                            <span className={\`role-badge \${(user.role || '').toLowerCase()}\`}>
                                                {getRoleLabel(user.role)}
                                            </span>
                                        )}
                                    </td>
                                    {agentEnabled && (
                                        <td>
                                            {user.referralAgent ? (
                                                <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: 6, background: '#EEF2FF', color: '#4F46E5' }}>
                                                    {user.referralAgent.shopName}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.78rem', color: '#D1D5DB' }}>{L('主站', 'Main Site')}</span>
                                            )}
                                        </td>
                                    )}
                                    <td>{user._count?.orders || 0}</td>
                                    <td className="time">{new Date(user.createdAt).toLocaleDateString('zh-CN')}</td>
                                    <td className="actions">
                                        <button className="action-btn edit" onClick={() => navigate(\`\${basePath}/orders?userId=\${user.id}\`)}>{L('查看订单', 'View Orders')}</button>
                                        {isSuperAdmin && user.role === 'ADMIN' && (
                                            <button className="action-btn delete" onClick={() => handleDeleteAdmin(user.id, user.username || user.email)}>{L('移除管理', 'Remove Admin')}</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>{L('← 上一页', '← Prev')}</button>
                    {(() => {
                        const pages = []
                        const start = Math.max(1, currentPage - 2)
                        const end = Math.min(totalPages, currentPage + 2)
                        if (start > 1) {
                            pages.push(<button key={1} onClick={() => setCurrentPage(1)} style={1 === currentPage ? { background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', borderColor: 'transparent' } : {}}>1</button>)
                            if (start > 2) pages.push(<span key="ls">...</span>)
                        }
                        for (let i = start; i <= end; i++) {
                            pages.push(<button key={i} onClick={() => setCurrentPage(i)} style={i === currentPage ? { background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', borderColor: 'transparent' } : {}}>{i}</button>)
                        }
                        if (end < totalPages) {
                            if (end < totalPages - 1) pages.push(<span key="rs">...</span>)
                            pages.push(<button key={totalPages} onClick={() => setCurrentPage(totalPages)} style={totalPages === currentPage ? { background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', borderColor: 'transparent' } : {}}>{totalPages}</button>)
                        }
                        return pages
                    })()}
                    <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>{L('下一页 →', 'Next →')}</button>
                    <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>{L(\`页码 \${currentPage}/\${totalPages}\`, \`Page \${currentPage}/\${totalPages}\`)}</span>
                </div>
            )}
        </div>
    )
}
`;

const newContent = prefix + translatedUsers + suffix;
fs.writeFileSync(file, newContent, 'utf8');
console.log('Successfully translated UsersManage!');
