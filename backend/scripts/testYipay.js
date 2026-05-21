const assert = require('assert')
const yipayService = require('../src/services/yipayService')

// Set up mock logger so we don't depend on actual winston logger properties during simple scripts
const logger = require('../src/utils/logger')

console.log('Testing Yipay signature computation...')

const mockConfig = {
    yipay_api_url: 'https://pay.example.com/submit.php',
    yipay_pid: '12345',
    yipay_key: 'mockkey123'
}

const mockOrder = {
    orderNo: 'TEST_ORDER_001',
    productName: '测试商品'
}

const payAmount = 9.9

const baseUrl = 'http://localhost:3000'

// Test createPaymentUrl
const paymentUrl = yipayService.createPaymentUrl(mockOrder, payAmount, mockConfig, baseUrl, 'alipay')
console.log('Generated payment URL:', paymentUrl)

assert(paymentUrl.startsWith('https://pay.example.com/submit.php'))
assert(paymentUrl.includes('pid=12345'))
assert(paymentUrl.includes('out_trade_no=TEST_ORDER_001'))
assert(paymentUrl.includes('type=alipay'))
assert(paymentUrl.includes('sign='))

// Parse query params to verify signature
const urlObj = new URL(paymentUrl)
const params = {}
urlObj.searchParams.forEach((v, k) => {
    params[k] = v
})

// Test verifySignature
const isValid = yipayService.verifySignature(params, mockConfig.yipay_key)
assert(isValid === true, 'Signature verification failed!')
console.log('Signature verified successfully!')

// Test verification with incorrect key
const isValidWrongKey = yipayService.verifySignature(params, 'wrongkey')
assert(isValidWrongKey === false, 'Signature should fail with wrong key!')
console.log('Signature failed with wrong key as expected!')

console.log('All tests passed successfully!')
