const fetch = global.fetch || require('node-fetch');

const CLOUDFLARE_API_URL = 'https://api.cloudflare.com/client/v4';
const getApiToken = () => process.env.CLOUDFLARE_API_TOKEN;
const getZoneId = () => process.env.CLOUDFLARE_ZONE_ID;
const getFallbackOrigin = () => process.env.CLOUDFLARE_FALLBACK_ORIGIN;

/**
 * Helper to check if Cloudflare configuration is present
 */
function isConfigured() {
    return !!(getApiToken() && getZoneId() && getFallbackOrigin());
}

/**
 * Common headers for Cloudflare API requests
 */
function getHeaders() {
    return {
        'Authorization': `Bearer ${getApiToken()}`,
        'Content-Type': 'application/json'
    };
}


/**
 * Create a custom hostname in Cloudflare
 * @param {string} hostname - The tenant custom domain (e.g. shop.tenant.com)
 */
async function createCustomHostname(hostname) {
    if (!isConfigured()) {
        throw new Error('Cloudflare integration environment variables are not fully configured.');
    }

    const cleanHostname = hostname.trim().toLowerCase();
    const url = `${CLOUDFLARE_API_URL}/zones/${getZoneId()}/custom_hostnames`;

    const body = {
        hostname: cleanHostname,
        ssl: {
            method: 'http', // Use 'http' validation, which is automatic once CNAME is pointed
            type: 'dv'      // Domain Validated certificate
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            // If it already exists, that is fine, return the existing one or handle gracefully
            if (data.errors && data.errors.some(e => e.code === 1406 || e.message.includes('already exists'))) {
                return await getCustomHostname(cleanHostname);
            }
            throw new Error(data.errors?.[0]?.message || 'Failed to create Custom Hostname on Cloudflare');
        }

        return data.result;
    } catch (error) {
        console.error(`[CloudflareService] Error creating custom hostname for ${hostname}:`, error);
        throw error;
    }
}

/**
 * Retrieve details of a custom hostname by hostname string
 * @param {string} hostname - The custom domain
 */
async function getCustomHostname(hostname) {
    if (!isConfigured()) {
        throw new Error('Cloudflare integration environment variables are not fully configured.');
    }

    const cleanHostname = hostname.trim().toLowerCase();
    const url = `${CLOUDFLARE_API_URL}/zones/${getZoneId()}/custom_hostnames?hostname=${encodeURIComponent(cleanHostname)}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.errors?.[0]?.message || 'Failed to fetch Custom Hostname from Cloudflare');
        }

        // Return first matching result
        return data.result?.[0] || null;
    } catch (error) {
        console.error(`[CloudflareService] Error fetching custom hostname ${hostname}:`, error);
        throw error;
    }
}

/**
 * Delete a custom hostname from Cloudflare by hostname string
 * @param {string} hostname - The custom domain
 */
async function deleteCustomHostname(hostname) {
    if (!isConfigured()) {
        throw new Error('Cloudflare integration environment variables are not fully configured.');
    }

    const cleanHostname = hostname.trim().toLowerCase();

    try {
        const customHostname = await getCustomHostname(cleanHostname);
        if (!customHostname) {
            return { success: true, message: 'Custom hostname not found in Cloudflare, skipping deletion.' };
        }

        const url = `${CLOUDFLARE_API_URL}/zones/${getZoneId()}/custom_hostnames/${customHostname.id}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: getHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.errors?.[0]?.message || 'Failed to delete Custom Hostname from Cloudflare');
        }

        return { success: true, id: data.result.id };
    } catch (error) {
        console.error(`[CloudflareService] Error deleting custom hostname ${hostname}:`, error);
        throw error;
    }
}

/**
 * Query verification and SSL status of a custom domain
 * @param {string} hostname - The custom domain
 */
async function getCustomHostnameStatus(hostname) {
    try {
        const customHostname = await getCustomHostname(hostname);
        if (!customHostname) {
            return {
                exists: false,
                status: 'none',
                sslStatus: 'none',
                message: '域名在 Cloudflare 中不存在'
            };
        }

        return {
            exists: true,
            id: customHostname.id,
            hostname: customHostname.hostname,
            status: customHostname.status, // e.g., 'active', 'pending'
            sslStatus: customHostname.ssl?.status || 'none', // e.g., 'active', 'pending', 'initializing'
            sslMethod: customHostname.ssl?.method,
            sslType: customHostname.ssl?.type,
            // TXT verification tokens if needed for pre-validation
            ownershipValidation: customHostname.ownership_verification || null,
            sslValidationRecords: customHostname.ssl?.validation_records || null,
            verificationErrors: customHostname.verification_errors || []
        };
    } catch (error) {
        console.error(`[CloudflareService] Error getting status for ${hostname}:`, error);
        throw error;
    }
}

module.exports = {
    isConfigured,
    createCustomHostname,
    getCustomHostname,
    deleteCustomHostname,
    getCustomHostnameStatus,
    get FALLBACK_ORIGIN() { return getFallbackOrigin(); }
};
