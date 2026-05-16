import { Link } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import './style.css'

function RefundPolicy() {
    return (
        <div className="policy-page">
            <Link to="/" className="back-btn">
                <FiArrowLeft /> 返回首页
            </Link>

            <div className="policy-container">
                <div className="policy-header">
                    <h1>退款政策</h1>
                    <p className="update-date">最后更新日期：2026年3月1日</p>
                </div>

                <div className="policy-content">
                    <section className="highlight-section">
                        <h2>📌 重要提示</h2>
                        <p>本平台销售的均为虚拟数字商品（卡密/激活码/账号），具有不可复制回收的特殊性。一经发货（卡密已发放），原则上不支持退款。请在购买前仔细确认商品信息。</p>
                    </section>

                    <section>
                        <h2>一、支持退款的情况</h2>
                        <p>以下情况可申请全额退款：</p>
                        <ul>
                            <li><strong>卡密无法使用</strong>：收到的激活码/卡密/账号无法正常激活或登录（需在收到后 <strong>24 小时内</strong> 反馈）。</li>
                            <li><strong>重复发放</strong>：因系统故障导致同一卡密重复发放给不同用户。</li>
                            <li><strong>商品描述不符</strong>：实际收到的商品与商品详情页描述严重不符（如商品类型、有效期等关键信息不一致）。</li>
                            <li><strong>支付成功未发货</strong>：支付成功后超过 30 分钟仍未收到卡密，且客服在接到工单后 24 小时内无法解决。</li>
                        </ul>
                    </section>

                    <section>
                        <h2>二、不支持退款的情况</h2>
                        <ul>
                            <li>卡密/账号已正常使用或已被激活。</li>
                            <li>因个人原因不想要了或误购（虚拟商品不适用无理由退货）。</li>
                            <li>因用户自身操作不当（如登录环境异常、违反服务商条款等）导致账号被封禁。</li>
                            <li>超过有效反馈期限（收到卡密后超过 24 小时）才提出的问题。</li>
                            <li>用户自行修改账号密码、绑定信息后产生的问题。</li>
                            <li>因第三方服务商（如 Netflix、Spotify 等）政策调整导致的服务变化。</li>
                        </ul>
                    </section>

                    <section>
                        <h2>三、退款申请流程</h2>
                        <ol>
                            <li><strong>提交工单</strong>：通过本平台 <Link to="/tickets/new">工单系统</Link> 提交退款申请，需包含：订单号、问题描述、相关截图证据。</li>
                            <li><strong>客服审核</strong>：客服将在收到工单后 24 小时内进行审核。</li>
                            <li><strong>处理结果</strong>：审核通过后，将在 1-3 个工作日内完成退款操作。</li>
                        </ol>
                    </section>

                    <section>
                        <h2>四、退款方式</h2>
                        <table className="refund-table">
                            <thead>
                                <tr>
                                    <th>支付方式</th>
                                    <th>退款渠道</th>
                                    <th>预计到账时间</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>支付宝</td>
                                    <td>原路退回支付宝账户</td>
                                    <td>1-3 个工作日</td>
                                </tr>
                                <tr>
                                    <td>USDT-TRC20</td>
                                    <td>退回原转账地址</td>
                                    <td>1-3 个工作日</td>
                                </tr>
                                <tr>
                                    <td>USDT-BEP20</td>
                                    <td>退回原转账地址</td>
                                    <td>1-3 个工作日</td>
                                </tr>
                            </tbody>
                        </table>
                        <p className="note">注：使用加密货币支付的退款将按退款时的实时汇率折算，可能因汇率波动存在差异。</p>
                    </section>

                    <section>
                        <h2>五、补发政策</h2>
                        <p>对于符合退款条件的订单，我们优先提供<strong>免费补发</strong>处理：</p>
                        <ul>
                            <li>如库存充足，将在确认问题后 <strong>1 小时内</strong> 完成补发。</li>
                            <li>如库存不足无法补发，将按上述退款方式全额退款。</li>
                        </ul>
                    </section>

                    <section>
                        <h2>六、特别说明</h2>
                        <ul>
                            <li>每个订单仅限申请一次退款/补发。</li>
                            <li>恶意频繁申请退款的账户，本平台有权限制其购买权限。</li>
                            <li>本政策的最终解释权归 HaoDongXi 平台所有。</li>
                        </ul>
                    </section>

                    <div className="policy-footer">
                        <p>如有疑问，请通过 <Link to="/tickets/new">工单系统</Link> 联系我们，我们将竭诚为您服务。</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RefundPolicy
