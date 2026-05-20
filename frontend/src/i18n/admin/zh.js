const zh = {
    "admin": {
        "title": "管理后台",
        "userRole": {
            "superAdmin": "超级管理员",
            "tenantAdmin": "店主",
            "admin": "管理员"
        },
        "logout": "退出",
        "menu": {
            "dashboard": "仪表盘",
            "products": "商品管理",
            "orders": "订单管理",
            "tickets": "工单管理",
            "cards": "卡密管理",
            "users": "用户管理",
            "agents": "代理管理",
            "support": "联系客服",
            "settings": "商城设置",
            "setup": "新手起航"
        },
        "prefs": {
            "language": "语言",
            "currency": "货币",
            "rate": "汇率",
            "rateHint": "1 美元 = ? 人民币（用于后台展示换算）",
            "save": "保存"
        },
        "dashboard": {
            "alerts": {
                "refunding": "{{count}} 个待退款订单",
                "unpaid": "{{count}} 个待支付订单"
            },
            "stats": {
                "totalOrders": "总订单",
                "totalRevenue": "总收入",
                "totalProducts": "商品数",
                "totalUsers": "用户数",
                "totalVisits": "总访问量",
                "todaySuffix": "今日",
                "todayOrders": "今日订单",
                "todayRevenue": "今日收入"
            },
            "paymentMonitor": {
                "title": "支付监控",
                "pendingCount": "{{count}} 笔待确认",
                "table": {
                    "orderNo": "订单号",
                    "product": "商品",
                    "method": "支付方式",
                    "amount": "金额",
                    "time": "时间"
                },
                "noMethod": "未选择",
                "countUnit": "笔"
            },
            "recentOrders": {
                "title": "最近订单",
                "noData": "暂无订单",
                "table": {
                    "orderNo": "订单号",
                    "product": "商品",
                    "amount": "金额",
                    "status": "状态",
                    "time": "时间"
                }
            },
            "orderStatus": {
                "completed": "已完成",
                "pending": "待支付",
                "paid": "已支付",
                "shipped": "已发货",
                "cancelled": "已取消",
                "refunding": "退款中",
                "refunded": "已退款",
                "expired": "已过期"
            }
        },
        "products": {
            "title": "商品管理",
            "add": "+ 添加商品",
            "categories": "📁 分类管理",
            "table": {
                "name": "商品名称",
                "price": "价格",
                "stock": "库存",
                "sold": "已售",
                "weight": "权重",
                "status": "状态",
                "actions": "操作"
            },
            "active": "上架",
            "inactive": "下架",
            "edit": "编辑",
            "cards": "卡密",
            "preview": "预览",
            "delete": "删除",
            "noProducts": "暂无商品",
            "loading": "加载中...",
            "deleteConfirm": "确定删除该商品吗？",
            "deleteSuccess": "商品已删除",
            "createSuccess": "商品添加成功",
            "updateSuccess": "商品更新成功",
            "operationFailed": "操作失败"
        },
        "orders": {
            "title": "订单管理",
            "totalCount": "共 {{count}} 条订单",
            "search": "搜索订单号 / 邮箱 / 商品名",
            "allStatus": "全部状态",
            "table": {
                "orderNo": "订单号",
                "product": "商品",
                "amount": "金额",
                "email": "邮箱",
                "remark": "备注",
                "status": "状态",
                "time": "时间",
                "actions": "操作"
            },
            "view": "查看",
            "ship": "发货",
            "noOrders": "暂无订单"
        },
        "tickets": {
            "title": "工单管理",
            "stats": {
                "total": "全部工单",
                "pending": "待处理",
                "inProgress": "处理中",
                "pendingSuperAdmin": "待超管处理",
                "closed": "已关闭",
                "userUnread": "用户未读",
                "pendingReply": "待回复"
            },
            "list": "工单列表",
            "noTickets": "暂无工单",
            "table": {
                "ticketNo": "工单号",
                "subject": "主题",
                "user": "用户",
                "status": "状态",
                "time": "时间",
                "actions": "操作"
            }
        },
        "cards": {
            "title": "卡密管理",
            "add": "添加卡密",
            "import": "导入",
            "table": {
                "content": "内容",
                "product": "商品",
                "status": "状态",
                "createdAt": "创建时间",
                "actions": "操作"
            },
            "available": "可用",
            "sold": "已售",
            "noCards": "暂无卡密"
        },
        "users": {
            "title": "用户管理",
            "table": {
                "username": "用户名",
                "email": "邮箱",
                "orders": "订单数",
                "registered": "注册时间",
                "actions": "操作"
            },
            "noUsers": "暂无用户"
        },
        "common": {
            "save": "保存",
            "saving": "保存中...",
            "cancel": "取消",
            "confirm": "确认",
            "delete": "删除",
            "edit": "编辑",
            "add": "添加",
            "search": "搜索",
            "filter": "筛选",
            "export": "导出",
            "refresh": "刷新",
            "actions": "操作",
            "status": "状态",
            "time": "时间",
            "noData": "暂无数据",
            "loading": "加载中...",
            "success": "成功",
            "failed": "失败",
            "operationSuccess": "操作成功",
            "operationFailed": "操作失败",
            "confirmDelete": "确定删除吗？",
            "yes": "是",
            "no": "否"
        }
    },
    "inline": {
        "no": {
            "products": {
                "e7dfa4b": "暂无商品"
            },
            "theme": {
                "selected": {
                    "5149ae5": "未选择主题"
                }
            },
            "configuration": {
                "sender": {
                    "shows": {
                        "your": {
                            "store": {
                                "name": {
                                    "monthly": {
                                        "quota": {
                                            "": {
                                                "f7f009a": "零配置，发件人显示店铺名称，有月额度限制"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "sub": {
                "admins": {
                    "yet": {
                        "396c511": "暂无子管理员"
                    }
                }
            }
        },
        "edit": {
            "product": {
                "f161576": "编辑商品"
            },
            "permissions": {
                "31cb6d7": "编辑权限"
            },
            "sub": {
                "admin": {
                    "permissions": {
                        "85e2ca6": "编辑子管理员权限"
                    }
                }
            }
        },
        "setup": {
            "guide": {
                "hidden": {
                    "3b15f9b": "新手引导已隐藏"
                }
            },
            "progress": {
                "bc73d02": "设置进度"
            }
        },
        "failed": {
            "to": {
                "hide": {
                    "please": {
                        "try": {
                            "again": {
                                "later": {
                                    "c53926e": "隐藏失败，请稍后重试"
                                }
                            }
                        }
                    }
                }
            }
        },
        "publish": {
            "your": {
                "first": {
                    "product": {
                        "2303958": "发布第一款商品"
                    }
                }
            },
            "84d8bfb": "去发布"
        },
        "add": {
            "product": {
                "details": {
                    "and": {
                        "card": {
                            "key": {
                                "inventory": {
                                    "so": {
                                        "buyers": {
                                            "can": {
                                                "pla": {
                                                    "6c29e69": "添加商品信息和卡密库存，让买家可以下单购买"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "failed": {
                "4bda4aa": "添加失败"
            },
            "sub": {
                "admin": {
                    "6a4a6ce": "Add子管理员"
                }
            },
            "new": {
                "sub": {
                    "admin": {
                        "2577681": "Add新子管理员"
                    }
                }
            }
        },
        "configure": {
            "2702202": "去配置",
            "payment": {
                "methods": {
                    "987d02d": "配置收款方式"
                }
            },
            "stock": {
                "calculation": {
                    "and": {
                        "order": {
                            "timeout": {
                                "rules": {
                                    "8ee9656": "配置库存计算方式和Order Timeout规则"
                                }
                            }
                        }
                    }
                }
            }
        },
        "set": {
            "up": {
                "alipay": {
                    "or": {
                        "usdt": {
                            "payments": {
                                "so": {
                                    "funds": {
                                        "go": {
                                            "directly": {
                                                "to": {
                                                    "your": {
                                                        "": {
                                                            "0d7d845": "设置支付宝或 USDT 收款，买家付款后资金直达您的账户"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "the": {
                "display": {
                    "language": {
                        "for": {
                            "the": {
                                "admin": {
                                    "panel": {
                                        "takes": {
                                            "effect": {
                                                "im": {
                                                    "8a87b38": "设置后台管理界面的显示语言（即时生效）"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "store": {
                    "currency": {
                        "after": {
                            "switching": {
                                "product": {
                                    "prices": {
                                        "will": {
                                            "u": {
                                                "39c9211": "设置商城的经营货币。切换后商品价格单位将变更，已有商品价格不会自动转换，请手动调整。"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "buyer": {
                "side": {
                    "language": {
                        "in": {
                            "auto": {
                                "mode": {
                                    "visitors": {
                                        "can": {
                                            "switch": {
                                                "it": {
                                                    "": {
                                                        "81bb27c": "设置买家端显示语言。自动模式下，访客可在导航栏自行切换。"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "upgrade": {
            "plan": {
                "f72f918": "升级套餐"
            },
            "after": {
                "the": {
                    "free": {
                        "trial": {
                            "ends": {
                                "to": {
                                    "keep": {
                                        "accepting": {
                                            "orders": {
                                                "a": {
                                                    "918404c": "免费试用到期后需升级套餐才能继续接单，升级后解锁更多功能"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "to": {
                "unlock": {
                    "more": {
                        "themes": {
                            "cda1023": "升级套餐可解锁更多主题"
                        }
                    }
                }
            },
            "3147f08": "升级"
        },
        "choose": {
            "plan": {
                "0966710": "选择套餐"
            },
            "a": {
                "notification": {
                    "type": {
                        "and": {
                            "send": {
                                "a": {
                                    "test": {
                                        "to": {
                                            "the": {
                                                "admin": {
                                                    "emai": {
                                                        "0db3856": "选择一种通知Type，发送模拟通知到管理员邮箱"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "connect": {
            "custom": {
                "domain": {
                    "f6623f9": "绑定独立域名"
                }
            },
            "e9f4a87": "去绑定"
        },
        "use": {
            "your": {
                "own": {
                    "domain": {
                        "for": {
                            "the": {
                                "store": {
                                    "to": {
                                        "strengthen": {
                                            "your": {
                                                "brand": {
                                                    "p": {
                                                        "61c24d6": "使用自己的域名访问商城，提升品牌专业度（专业版功能）"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "mail": {
                        "server": {
                            "with": {
                                "no": {
                                    "platform": {
                                        "quota": {
                                            "limit": {
                                                "3c3bee8": "使用自己的邮箱服务器，无额度限制"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "this": {
                "for": {
                    "agents": {
                        "theme": {
                            "pools": {
                                "and": {
                                    "withdrawals": {
                                        "disable": {
                                            "it": {
                                                "i": {
                                                    "40ace2b": "用于管理代理、皮肤池和提现；不需要时可关闭。"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "complete": {
            "your": {
                "first": {
                    "order": {
                        "5d6a6ab": "完成第一笔订单"
                    }
                }
            },
            "the": {
                "steps": {
                    "below": {
                        "to": {
                            "quickly": {
                                "launch": {
                                    "your": {
                                        "store": {
                                            "3a75aa6": "按照以下步骤完成设置，快速开启你的商城之旅"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "share": {
            "your": {
                "store": {
                    "link": {
                        "with": {
                            "customers": {
                                "and": {
                                    "start": {
                                        "receiving": {
                                            "you": {
                                                "7f874b9": "将商城地址分享给客户，开始接收第一笔订单"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "copied": {
            "2aff14e": "✓ 已复制"
        },
        "copy": {
            "link": {
                "0d260eb": "复制链接"
            }
        },
        "hide": {
            "guide": {
                "0d42f78": "不再显示"
            }
        },
        "congratulations": {
            "all": {
                "steps": {
                    "are": {
                        "complete": {
                            "and": {
                                "your": {
                                    "store": {
                                        "is": {
                                            "rea": {
                                                "ccd047c": "恭喜！所有步骤已完成，你的商城已准备就绪"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "optional": {
            "dfa6fb8": "可选",
            "a52b3ba": "选填"
        },
        "important": {
            "c2627d9": "重要"
        },
        "tips": {
            "8a95b16": "小贴士"
        },
        "products": {
            "support": {
                "bulk": {
                    "card": {
                        "key": {
                            "import": {
                                "so": {
                                    "you": {
                                        "can": {
                                            "upload": {
                                                "many": {
                                                    "0710b7f": "商品支持批量导入卡密，一次上传多张"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "you": {
            "can": {
                "switch": {
                    "store": {
                        "themes": {
                            "in": {
                                "store": {
                                    "settings": {
                                        "636104a": "在店铺设置中可切换商城主题皮肤"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "after": {
            "an": {
                "order": {
                    "is": {
                        "completed": {
                            "card": {
                                "keys": {
                                    "are": {
                                        "emailed": {
                                            "to": {
                                                "buyers": {
                                                    "": {
                                                        "af04f68": "订单完成后系统自动发送卡密邮件给买家"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "removal": {
                "the": {
                    "account": {
                        "becomes": {
                            "a": {
                                "normal": {
                                    "user": {
                                        "and": {
                                            "can": {
                                                "stil": {
                                                    "af28da8": "移除权限后账号会降级为普通用户，仍可登录购物"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "the": {
            "dashboard": {
                "shows": {
                    "real": {
                        "time": {
                            "order": {
                                "and": {
                                    "revenue": {
                                        "data": {
                                            "4fd6de3": "仪表盘可查看实时订单和收入数据"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "admin": {
            "language": {
                "a3bd876": "后台语言"
            },
            "notification": {
                "email": {
                    "085f350": "管理员收信邮箱"
                }
            },
            "settings": {
                "dd2392b": "管理员设置"
            }
        },
        "store": {
            "currency": {
                "fe524a0": "经营货币"
            },
            "settings": {
                "d95dc37": "Store Settings"
            },
            "name": {
                "b223d79": "商城名称"
            },
            "language": {
                "8f95cf0": "商城语言"
            },
            "url": {
                "3755cdc": "商城链接"
            },
            "policies": {
                "template": {
                    "txt": {
                        "1424c6b": "商城协议模板.txt"
                    }
                }
            },
            "slug": {
                "ca1f7e9": "商城 Slug"
            },
            "owner": {
                "1830eb7": "商城所有者",
                "has": {
                    "all": {
                        "permissions": {
                            "including": {
                                "store": {
                                    "settings": {
                                        "and": {
                                            "251b332": "商城所有者拥有全部权限（含Store Settings、套餐管理）"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "saved": {
            "edcefa5": "保存成功"
        },
        "save": {
            "failed": {
                "1b32f27": "保存失败"
            },
            "settings": {
                "bdd3186": "保存设置"
            },
            "payment": {
                "settings": {
                    "5ed4b51": "保存支付设置"
                }
            },
            "order": {
                "settings": {
                    "1cc7703": "Save Order Settings"
                }
            },
            "email": {
                "settings": {
                    "ef7cb1b": "保存Email"
                }
            },
            "permissions": {
                "e1ebb48": "保存权限"
            }
        },
        "network": {
            "error": {
                "c15d73e": "网络错误"
            }
        },
        "passwords": {
            "do": {
                "not": {
                    "match": {
                        "2de89f3": "两次输入的密码不一致"
                    }
                }
            }
        },
        "password": {
            "min": {
                "6": {
                    "chars": {
                        "8a9dde5": "密码至少 6 位"
                    }
                }
            },
            "updated": {
                "5c338f7": "密码已更新"
            },
            "must": {
                "be": {
                    "at": {
                        "least": {
                            "6": {
                                "characters": {
                                    "366a31c": "密码至少 6 位"
                                }
                            }
                        }
                    }
                }
            }
        },
        "update": {
            "failed": {
                "8e798b4": "更新失败"
            },
            "password": {
                "cd02826": "更New Password"
            }
        },
        "alipay": {
            "please": {
                "enter": {
                    "app": {
                        "id": {
                            "0620f7f": "支付宝：请填写 App ID"
                        }
                    },
                    "private": {
                        "key": {
                            "e40bdce": "支付宝：请填写应用私钥"
                        }
                    },
                    "public": {
                        "key": {
                            "1ce5a9a": "支付宝：请填写支付宝公钥"
                        }
                    }
                }
            },
            "face": {
                "to": {
                    "face": {
                        "003c1ad": "支付宝当面付"
                    }
                }
            },
            "public": {
                "key": {
                    "f1b9616": "支付宝公钥",
                    "for": {
                        "signature": {
                            "verification": {
                                "b3ec4f7": "支付宝公钥（用于验签）"
                            }
                        }
                    }
                }
            }
        },
        "settings": {
            "saved": {
                "96f47b4": "配置已保存"
            }
        },
        "basic": {
            "info": {
                "183eebc": "基础信息"
            }
        },
        "payment": {
            "d9fbbc6": "支付设置",
            "methods": {
                "6d30081": "支付方式"
            }
        },
        "orders": {
            "19d0b2a": "订单设置"
        },
        "email": {
            "dceeba7": "Email",
            "notifications": {
                "1b7b91b": "Email Notification"
            },
            "password": {
                "app": {
                    "password": {
                        "69f9bd8": "邮箱密码/授权码"
                    }
                }
            },
            "for": {
                "notifications": {
                    "defaults": {
                        "to": {
                            "login": {
                                "email": {
                                    "f3e43a1": "接收通知的邮箱（默认为登录邮箱）"
                                }
                            }
                        }
                    }
                }
            },
            "and": {
                "password": {
                    "are": {
                        "required": {
                            "ae17f89": "邮箱和密码必填"
                        }
                    }
                }
            }
        },
        "admins": {
            "d35236c": "管理员"
        },
        "account": {
            "d72d065": "Security"
        },
        "plan": {
            "e8ec140": "Plan"
        },
        "manage": {
            "store": {
                "info": {
                    "payment": {
                        "methods": {
                            "account": {
                                "security": {
                                    "and": {
                                        "domai": {
                                            "f6fe2d3": "管理商城信息、支付方式、Security和域名配置"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "your": {
            "store": {
                "name": {
                    "ebd1ef9": "你的商城名称"
                }
            },
            "current": {
                "plan": {
                    "does": {
                        "not": {
                            "include": {
                                "email": {
                                    "notification": {
                                        "quota": {
                                            "": {
                                                "7fef012": "当前套餐不包含Email Notification额度，邮件功能已禁用。请升级套餐后启用。"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "replace": {
            "6ce02bc": "Change"
        },
        "upload": {
            "logo": {
                "2a5b9fa": "Upload Logo"
            },
            "failed": {
                "7d90602": "Upload failed"
            },
            "favicon": {
                "28f504b": "上传 Favicon"
            },
            "policy": {
                "file": {
                    "txt": {
                        "49d0a77": "上传协议文件（.txt）"
                    }
                }
            }
        },
        "logo": {
            "uploaded": {
                "076e78c": "Logo uploaded"
            }
        },
        "clear": {
            "a0e44b2": "Clear",
            "uploaded": {
                "content": {
                    "a5ba771": "清除已上传内容"
                }
            }
        },
        "recommended": {
            "size": {
                "32": {
                    "x": {
                        "32": {
                            "ico": {
                                "or": {
                                    "png": {
                                        "97179ea": "Recommended: 32x32, ICO or PNG"
                                    }
                                }
                            }
                        }
                    }
                },
                "200": {
                    "x": {
                        "200": {
                            "png": {
                                "svg": {
                                    "supported": {
                                        "0d81dfb": "Recommended: 200x200, PNG/SVG"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "favicon": {
            "a21d15d": "Favicon（书签栏图标）",
            "uploaded": {
                "af41074": "Favicon 上传成功"
            }
        },
        "theme": {
            "410cf43": "主题"
        },
        "classic": {
            "c59d41b": "经典主题"
        },
        "minimal": {
            "db5115a": "简约主题",
            "style": {
                "7dbe337": "精简风格"
            }
        },
        "custom": {
            "theme": {
                "edda78b": "定制主题"
            },
            "953741b": "定制",
            "domain": {
                "c02c51e": "自定义域名"
            },
            "domains": {
                "are": {
                    "a": {
                        "paid": {
                            "feature": {
                                "please": {
                                    "upgrade": {
                                        "to": {
                                            "a": {
                                                "suppor": {
                                                    "e6b3d54": "绑定自定义域名是付费功能，请升级到支持的套餐后启用。"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "themes": {
                "aab67f7": "定制主题"
            }
        },
        "please": {
            "select": {
                "a": {
                    "theme": {
                        "647628a": "请选择一个主题"
                    }
                }
            }
        },
        "switch": {
            "theme": {
                "0f2165b": "切换主题"
            }
        },
        "auto": {
            "browser": {
                "language": {
                    "8d0adbd": "自动（根据访客浏览器）"
                }
            },
            "53a3bc0": "自动计算"
        },
        "agent": {
            "system": {
                "4353d5e": "代理系统"
            }
        },
        "current": {
            "plan": {
                "does": {
                    "not": {
                        "support": {
                            "the": {
                                "agent": {
                                    "system": {
                                        "please": {
                                            "upgrad": {
                                                "efdcdd0": "当前套餐不支持代理系统，请升级后启用。"
                                            }
                                        }
                                    }
                                }
                            },
                            "sub": {
                                "admins": {
                                    "please": {
                                        "upgrade": {
                                            "to": {
                                                "e": {
                                                    "89e1ba0": "当前套餐不支持Add子管理员，请升级套餐后启用。"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "password": {
                "cad7e6b": "Current Password"
            }
        },
        "enabled": {
            "agent": {
                "menu": {
                    "is": {
                        "visible": {
                            "in": {
                                "the": {
                                    "sidebar": {
                                        "5ad2235": "已启用，侧边栏显示代理菜单"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "disabled": {
            "agent": {
                "menu": {
                    "is": {
                        "hidden": {
                            "2c8b403": "已关闭，侧边栏隐藏代理菜单"
                        }
                    }
                }
            }
        },
        "not": {
            "supported": {
                "by": {
                    "current": {
                        "plan": {
                            "3628749": "（当前套餐不支持）"
                        }
                    }
                }
            }
        },
        "download": {
            "template": {
                "e4c7f42": "下载参考模板"
            }
        },
        "file": {
            "format": {
                "plain": {
                    "text": {
                        "txt": {
                            "use": {
                                "purchase": {
                                    "policy": {
                                        "and": {
                                            "refund": {
                                                "po": {
                                                    "53eb065": "文件格式：纯文本 .txt，用「【Purchase Policy】」和「【Refund Policy】」作为分隔标记。可先下载模板参考格式后修改再上传。"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "uploaded": {
            "content": {
                "preview": {
                    "094a071": "已上传内容预览"
                }
            }
        },
        "collapse": {
            "538e5c8": "折叠 ▲"
        },
        "expand": {
            "3107846": "展开 ▼"
        },
        "saving": {
            "18c1774": "Saving..."
        },
        "enable": {
            "payment": {
                "methods": {
                    "for": {
                        "buyers": {
                            "funds": {
                                "go": {
                                    "directly": {
                                        "to": {
                                            "your": {
                                                "": {
                                                    "4a53a57": "启用买家可用的支付方式，款项将直接进入你的收款账户。"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "all": {
                "8d8b492": "全开放"
            }
        },
        "app": {
            "id": {
                "c0125a9": "应用 App ID"
            },
            "private": {
                "key": {
                    "86b2173": "应用私钥"
                }
            },
            "password": {
                "4da5546": "授权码"
            }
        },
        "rsa2": {
            "app": {
                "private": {
                    "key": {
                        "18c4561": "RSA2 应用私钥"
                    }
                }
            }
        },
        "usd": {
            "pricing": {
                "with": {
                    "alipay": {
                        "cny": {
                            "collection": {
                                "example": {
                                    "8": {
                                        "x": {
                                            "7": {
                                                "2": {
                                                    "57": {
                                                        "60": {
                                                            "52fb4e9": "美元定价、支付宝人民币收款。例如 $8 x 7.2 = ¥57.60"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "stores": {
                "collect": {
                    "usdt": {
                        "at": {
                            "1": {
                                "1": {
                                    "no": {
                                        "exchange": {
                                            "rate": {
                                                "needed": {
                                                    "47fdc62": "美元商城按 1:1 收取 USDT，无需设置汇率"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "trc20": {
            "receiving": {
                "wallet": {
                    "2aab6ca": "TRC20 收款钱包地址"
                }
            }
        },
        "exchange": {
            "rate": {
                "1": {
                    "usdt": {
                        "cny": {
                            "51a7779": "汇率（1 USDT = ? CNY）"
                        }
                    }
                }
            }
        },
        "bep20": {
            "receiving": {
                "wallet": {
                    "835e5ab": "BEP20 收款钱包地址"
                }
            }
        },
        "login": {
            "email": {
                "cb75967": "登录邮箱"
            }
        },
        "user": {
            "role": {
                "d45abd7": "用户角色"
            }
        },
        "change": {
            "password": {
                "0afa917": "Change Password"
            }
        },
        "new": {
            "password": {
                "57a200d": "New Password"
            },
            "ticket": {
                "d1818f7": "New Ticket创建",
                "1f5a015": "📮 New Ticket"
            },
            "user": {
                "registration": {
                    "16930a4": "New User"
                }
            }
        },
        "at": {
            "least": {
                "6": {
                    "characters": {
                        "7ffb04e": "至少 6 位"
                    }
                }
            }
        },
        "confirm": {
            "new": {
                "password": {
                    "2f631ee": "确认New Password"
                }
            }
        },
        "updating": {
            "e060893": "更新中..."
        },
        "order": {
            "settings": {
                "f9ade7b": "订单设置"
            },
            "timeout": {
                "982bde5": "Order Timeout时间"
            },
            "paid": {
                "9f137b9": "Order Paid",
                "f7ee83e": "💰 订单支付"
            },
            "cancelled": {
                "e74cb32": "Order Cancelled",
                "df76e50": "🚫 Order Cancelled"
            }
        },
        "stock": {
            "calculation": {
                "3fce3ce": "库存计算方式"
            },
            "equals": {
                "available": {
                    "card": {
                        "count": {
                            "and": {
                                "is": {
                                    "deducted": {
                                        "after": {
                                            "deli": {
                                                "0efda59": "库存 = 可用卡密数量，发货后自动扣减"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "alert": {
                "aad841e": "⚠️ Stock Alert"
            }
        },
        "manual": {
            "843ab14": "手动设置",
            "delivery": {
                "needed": {
                    "fc11d3d": "待手动发货"
                }
            }
        },
        "enter": {
            "stock": {
                "manually": {
                    "without": {
                        "linking": {
                            "it": {
                                "to": {
                                    "card": {
                                        "count": {
                                            "9693c33": "手动填写库存数量，不与卡密数量关联"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "minutes": {
            "96cd1c2": "min"
        },
        "unpaid": {
            "orders": {
                "are": {
                    "cancelled": {
                        "automatically": {
                            "after": {
                                "timeout": {
                                    "897dd2e": "未支付Order Timeout后Auto Cancel"
                                }
                            }
                        }
                    }
                }
            }
        },
        "send": {
            "card": {
                "details": {
                    "to": {
                        "buyers": {
                            "automatically": {
                                "after": {
                                    "orders": {
                                        "are": {
                                            "c": {
                                                "948090b": "配置Auto-send card keys email after order completion给买家"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "refund": {
                "success": {
                    "email": {
                        "after": {
                            "an": {
                                "order": {
                                    "is": {
                                        "refunded": {
                                            "589a724": "订单完成退款后向用户发送退款成功邮件"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "platform": {
            "emails": {
                "this": {
                    "month": {
                        "f1fbf39": "本月Platform sends邮件"
                    }
                }
            },
            "sending": {
                "040437c": "Platform sends",
                "needs": {
                    "no": {
                        "configuration": {
                            "your": {
                                "store": {
                                    "name": {
                                        "is": {
                                            "u": {
                                                "db7b340": "Platform sends无需配置，系统以你的店铺名称作为发件人。额度由套餐决定。"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "unlimited": {
            "6381d24": "不限"
        },
        "monthly": {
            "quota": {
                "exceeded": {
                    "lifetime": {
                        "pack": {
                            "credits": {
                                "will": {
                                    "be": {
                                        "used": {
                                            "au": {
                                                "b1a0c2d": "📦 当月已超额，将自动消耗永久资源包"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "is": {
                    "used": {
                        "up": {
                            "buy": {
                                "a": {
                                    "pack": {
                                        "or": {
                                            "switch": {
                                                "to": {
                                                    "your": {
                                                        "own": {
                                                            "sm": {
                                                                "ae3a651": "⚠️ 本月额度已用完，可购买资源包或切换Own SMTP"
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "buy": {
            "pack": {
                "a692abf": "购买资源包"
            }
        },
        "sending": {
            "mode": {
                "02ee4c5": "发送模式"
            }
        },
        "own": {
            "smtp": {
                "fd68a8b": "Own SMTP"
            }
        },
        "smtp": {
            "server": {
                "c5216fc": "SMTP 服务器"
            },
            "port": {
                "dafafac": "SMTP Port"
            }
        },
        "sender": {
            "email": {
                "d1ca2dd": "发件邮箱"
            }
        },
        "notification": {
            "toggles": {
                "53299f2": "通知开关"
            }
        },
        "notify": {
            "admins": {
                "after": {
                    "users": {
                        "complete": {
                            "payment": {
                                "a2b6d45": "用户完成支付后通知管理员"
                            }
                        }
                    }
                },
                "when": {
                    "users": {
                        "submit": {
                            "tickets": {
                                "efb780e": "用户提交New Ticket时通知管理员"
                            }
                        }
                    },
                    "a": {
                        "new": {
                            "user": {
                                "registers": {
                                    "aa51bd0": "有New User时通知管理员"
                                }
                            }
                        }
                    },
                    "product": {
                        "stock": {
                            "is": {
                                "below": {
                                    "the": {
                                        "threshold": {
                                            "307be7b": "商品库存低于阈值时通知管理员"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "an": {
                        "order": {
                            "is": {
                                "cancelled": {
                                    "f7f4f9c": "订单被取消时通知管理员"
                                }
                            }
                        }
                    }
                }
            },
            "when": {
                "a": {
                    "paid": {
                        "order": {
                            "needs": {
                                "manual": {
                                    "delivery": {
                                        "85a05e3": "订单已支付但无卡密自动发放，需手动发货时通知"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "low": {
            "stock": {
                "alert": {
                    "2179fee": "库存不足预警"
                }
            }
        },
        "refund": {
            "notification": {
                "fcc5470": "退款成功通知"
            }
        },
        "leave": {
            "blank": {
                "to": {
                    "use": {
                        "the": {
                            "login": {
                                "email": {
                                    "a788521": "留空则使用登录邮箱接收通知"
                                }
                            }
                        }
                    }
                }
            }
        },
        "test": {
            "notification": {
                "5eb1e5b": "测试通知"
            }
        },
        "pending": {
            "delivery": {
                "779546f": "📦 待发货"
            }
        },
        "select": {
            "theme": {
                "c00031f": "选择主题"
            },
            "all": {
                "23cc93b": "全选"
            }
        },
        "modern": {
            "classic": {
                "91121ba": "现代经典"
            }
        },
        "private": {
            "themes": {
                "authorized": {
                    "only": {
                        "for": {
                            "you": {
                                "a53fd6f": "仅授权给您的私有主题"
                            }
                        }
                    }
                }
            }
        },
        "sub": {
            "admin": {
                "created": {
                    "75b7194": "子管理员创建成功"
                }
            },
            "admins": {
                "313e4ba": "子管理员",
                "can": {
                    "manage": {
                        "products": {
                            "orders": {
                                "cards": {
                                    "tickets": {
                                        "and": {
                                            "user": {
                                                "69aba6a": "子管理员可管理：商品、订单、卡密、工单、用户"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "only": {
                        "access": {
                            "the": {
                                "current": {
                                    "store": {
                                        "95742a8": "子管理员只能访问当前商城，无法跨商城操作"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "create": {
            "failed": {
                "f14034d": "创建失败"
            },
            "sub": {
                "admin": {
                    "27d6dbc": "创建子管理员"
                }
            }
        },
        "permissions": {
            "updated": {
                "8555f3d": "权限已更新"
            },
            "8a9ebea": "权限配置"
        },
        "removed": {
            "312f80f": "已移除"
        },
        "deselect": {
            "all": {
                "bd85e69": "取消全选"
            }
        },
        "invite": {
            "staff": {
                "to": {
                    "help": {
                        "manage": {
                            "the": {
                                "store": {
                                    "sub": {
                                        "admins": {
                                            "have": {
                                                "all": {
                                                    "pe": {
                                                        "4ff82d6": "邀请员工协助管理商城，子管理员拥有除「套餐与Store Settings」外的全部权限"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "owner": {
            "store": {
                "admin": {
                    "all": {
                        "permissions": {
                            "24f4772": "所有者 · 店主 · 全部权限"
                        }
                    }
                }
            }
        },
        "name": {
            "0c5acea": "姓名"
        },
        "staff": {
            "name": {
                "51d7e7f": "员工姓名"
            },
            "can": {
                "change": {
                    "the": {
                        "password": {
                            "after": {
                                "login": {
                                    "eb04f0f": "员工可在登录后自行Change Password"
                                }
                            }
                        }
                    }
                }
            }
        },
        "initial": {
            "password": {
                "551df71": "初始密码"
            }
        },
        "default": {
            "58cd596": "默认"
        },
        "disable": {
            "all": {
                "9d7cba6": "全关闭"
            }
        },
        "creating": {
            "3abc349": "创建中..."
        },
        "click": {
            "add": {
                "sub": {
                    "admin": {
                        "to": {
                            "invite": {
                                "staff": {
                                    "b87bb13": "点击右上角「+ Add子管理员」邀请员工协助管理"
                                }
                            }
                        }
                    }
                }
            }
        },
        "remove": {
            "permissions": {
                "2b4c4d4": "移除权限"
            }
        },
        "permission": {
            "notes": {
                "74ba764": "权限说明"
            }
        }
    }
}

export default zh
