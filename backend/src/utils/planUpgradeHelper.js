/**
 * 套餐升级/续费/降级 共享逻辑
 *
 * 规则（方案 A）：
 *   同级续费  → 在原到期日上叠加月数
 *   升级      → 从今天起算，原套餐剩余天数作废
 *   降级      → 保持当前高等级直到到期，新低等级排队生效
 */
const prisma = require('../config/database')
const logger = require('./logger')

const PLAN_RANK = { FREE: 0, BASIC: 1, STANDARD: 2, PRO: 3 }

/**
 * 计算套餐激活参数
 * @param {string} currentPlan      当前套餐等级
 * @param {Date|null} currentExpiresAt 当前到期时间
 * @param {string} newPlan          新购套餐等级
 * @param {number} newMonths        新购月数
 * @returns {{ effectivePlan: string, newExpiry: Date, pendingDowngrade: object|null, action: string }}
 */
function computePlanActivation(currentPlan, currentExpiresAt, newPlan, newMonths) {
    const now = new Date()
    const currentRank = PLAN_RANK[currentPlan] || 0
    const newRank = PLAN_RANK[newPlan] || 0
    const isActive = currentExpiresAt && new Date(currentExpiresAt) > now && currentPlan !== 'FREE'

    let baseDate = now
    let effectivePlan = newPlan
    let pendingDowngrade = null
    let action = 'new' // new | renewal | upgrade | downgrade

    if (!isActive) {
        // 无有效付费套餐（FREE / 已过期）→ 从今天起算
        baseDate = now
        effectivePlan = newPlan
        action = 'new'
    } else if (newRank > currentRank) {
        // 升级：从今天起算，旧套餐剩余天数作废
        baseDate = now
        effectivePlan = newPlan
        action = 'upgrade'
    } else if (newRank === currentRank) {
        // 同级续费：在原到期日上叠加
        baseDate = new Date(currentExpiresAt)
        effectivePlan = newPlan
        action = 'renewal'
    } else {
        // 降级：排队到当前套餐到期后再生效
        baseDate = new Date(currentExpiresAt)
        effectivePlan = currentPlan // 暂时保持当前高等级
        pendingDowngrade = {
            plan: newPlan,
            switchAt: new Date(currentExpiresAt).toISOString()
        }
        action = 'downgrade'
    }

    const newExpiry = new Date(baseDate)
    newExpiry.setMonth(newExpiry.getMonth() + newMonths)

    return { effectivePlan, newExpiry, pendingDowngrade, action }
}

/**
 * 存储待生效的降级计划
 */
async function storePendingPlanChange(shopId, plan, switchAt) {
    const key = `pending_plan_${shopId}`
    await prisma.platformSetting.upsert({
        where: { key },
        create: { key, value: JSON.stringify({ plan, switchAt }), description: '待生效的套餐降级' },
        update: { value: JSON.stringify({ plan, switchAt }) }
    })
    logger.info(`[planUpgrade] 已记录降级排队: shopId=${shopId}, plan=${plan}, switchAt=${switchAt}`)
}

/**
 * 清除待生效的降级计划（升级或同级续费时调用）
 */
async function clearPendingPlanChange(shopId) {
    const key = `pending_plan_${shopId}`
    try {
        await prisma.platformSetting.deleteMany({ where: { key } })
    } catch {}
}

/**
 * 检查并应用待生效的降级计划（在 trialGate 等中间件中调用）
 * @returns {boolean} 是否发生了切换
 */
async function applyPendingPlanChangeIfNeeded(shop) {
    const key = `pending_plan_${shop.id}`
    try {
        const setting = await prisma.platformSetting.findUnique({ where: { key } })
        if (!setting) return false

        const { plan, switchAt } = JSON.parse(setting.value)
        if (new Date() >= new Date(switchAt)) {
            await prisma.shop.update({
                where: { id: shop.id },
                data: { plan }
            })
            await prisma.platformSetting.delete({ where: { key } })
            shop.plan = plan // 更新内存中的引用
            logger.info(`[planUpgrade] 降级已生效: shopId=${shop.id}, newPlan=${plan}`)
            return true
        }
    } catch (e) {
        logger.error('[planUpgrade] 检查降级计划失败:', e.message)
    }
    return false
}

module.exports = {
    PLAN_RANK,
    computePlanActivation,
    storePendingPlanChange,
    clearPendingPlanChange,
    applyPendingPlanChangeIfNeeded
}
