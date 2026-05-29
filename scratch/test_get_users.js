const adminController = require('../backend/src/controllers/adminController')

// Mock req and res objects
const req = {
    tenantId: '97abafe8-7aef-4b8b-82ff-5b62f1a3ea15', // gq48i3 tenant
    query: {
        page: '1',
        pageSize: '20',
        search: '',
        role: 'all'
    }
}

const res = {
    json: function(data) {
        console.log('API Response:', JSON.stringify(data, null, 2))
    },
    status: function(code) {
        console.log('HTTP Status:', code)
        return this
    }
}

const next = function(err) {
    console.error('API Error via next():', err)
}

async function run() {
    console.log('--- Simulating getUsers API Request ---')
    await adminController.getUsers(req, res, next)
}

run()
