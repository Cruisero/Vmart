import { Link } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import './style.css'

function Terms() {
    return (
        <div className="policy-page">
            <Link to="/" className="back-btn">
                <FiArrowLeft /> 返回首页
            </Link>

            <div className="policy-container">
                <div className="policy-header">
                    <h1>购买协议</h1>
                    <p className="update-date">最后更新日期：2026年3月1日</p>
                </div>

                <div className="policy-content">
                    <section>
                        <h2>一、服务说明</h2>
                        <p>欢迎使用 HaoDongXi（好东西）虚拟商品自动发卡平台（以下简称"本平台"）。本平台为用户提供数字订阅服务、软件激活码、会员账号等虚拟商品的在线购买服务。</p>
                        <p>本平台销售的商品包括但不限于：流媒体订阅（Netflix、Disney+、Spotify、Apple Music 等）、云存储服务（iCloud、Google One 等）、生产力工具（Notion、Cursor、Photoshop 等）、通讯服务（Google Voice 等）及其他数字产品。</p>
                    </section>

                    <section>
                        <h2>二、购买流程</h2>
                        <ol>
                            <li><strong>选择商品</strong>：浏览并选择您需要的虚拟商品，确认商品规格与价格。</li>
                            <li><strong>填写信息</strong>：正确填写接收卡密的电子邮箱地址。请务必确认邮箱地址准确无误，卡密将通过邮件自动发送。</li>
                            <li><strong>选择支付</strong>：选择您偏好的支付方式完成付款。</li>
                            <li><strong>获取卡密</strong>：支付成功后，系统将自动发放卡密至您填写的邮箱，同时在订单页面显示。</li>
                        </ol>
                    </section>

                    <section>
                        <h2>三、用户须知</h2>
                        <ul>
                            <li>购买前请仔细阅读商品详情页的说明，了解商品有效期、使用限制等信息。</li>
                            <li>请确保填写的邮箱地址正确且可正常接收邮件，因邮箱地址错误导致无法收到卡密的，请联系客服处理。</li>
                            <li>虚拟商品一经售出，不支持无理由退款（详见《退款政策》）。</li>
                            <li>购买的虚拟商品仅供个人使用，严禁转售、共享或用于任何违法违规用途。</li>
                            <li>请妥善保管您收到的卡密/账号信息，因个人保管不当导致的泄露或损失，本平台不承担责任。</li>
                        </ul>
                    </section>

                    <section>
                        <h2>四、支付方式</h2>
                        <p>本平台目前支持以下支付方式：</p>
                        <ul>
                            <li><strong>支付宝</strong>：支持扫码支付，即时到账。</li>
                            <li><strong>USDT-TRC20</strong>：通过波场（TRON）网络转账 USDT 支付。</li>
                            <li><strong>USDT-BEP20</strong>：通过 BSC（币安智能链）网络转账 USDT 支付。</li>
                        </ul>
                        <p>使用加密货币支付时，请务必使用对应链的网络转账，转错链将可能导致资产丢失且无法找回。</p>
                    </section>

                    <section>
                        <h2>五、商品保障</h2>
                        <ul>
                            <li>本平台保证所售商品均为正规渠道获取，可正常激活使用。</li>
                            <li>如收到的卡密/账号无法正常使用，请在收到后 24 小时内联系客服，我们将免费补发或退款。</li>
                            <li>商品的有效期以商品详情页标注为准，过期后本平台不承担续费义务。</li>
                        </ul>
                    </section>

                    <section>
                        <h2>六、免责条款</h2>
                        <ul>
                            <li>因不可抗力（如服务商政策变更、服务器故障等）导致商品无法使用的，本平台将尽力协调解决，但不承担超出商品价格的赔偿责任。</li>
                            <li>用户因违反服务商使用条款（如异常登录、违规操作等）导致账号被封禁的，本平台不承担责任。</li>
                            <li>本平台不对用户使用虚拟商品的具体行为承担法律责任。</li>
                        </ul>
                    </section>

                    <section>
                        <h2>七、知识产权</h2>
                        <p>本平台销售的所有数字产品的知识产权归原始服务提供商所有。本平台仅作为授权经销渠道提供购买服务，不对产品本身的功能、特性或质量缺陷承担责任。</p>
                    </section>

                    <section>
                        <h2>八、争议解决</h2>
                        <p>如在购买过程中产生任何争议，请优先通过本平台工单系统联系客服协商解决。我们承诺在收到工单后 24 小时内响应处理。</p>
                    </section>

                    <section>
                        <h2>九、协议修改</h2>
                        <p>本平台有权根据运营需要修改本协议内容。修改后的协议将在平台上公示，继续使用本平台服务即视为接受修改后的协议。</p>
                    </section>

                    <div className="policy-footer">
                        <p>如有疑问，请通过 <Link to="/tickets/new">工单系统</Link> 联系我们。</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Terms
