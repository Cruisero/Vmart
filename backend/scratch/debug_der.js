const fs = require('fs');
const { execSync } = require('child_process');

const configPriv = "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCBXXPIn9P7NjpPTBrcuF5yIqrPHF7diTgAorp+8hRMFIMqKG3wJ+CBWKek1LgzfbzHTpT8c126I1WvpqjYvsJibnts3AOPAjkyeTJ+GygTKgV8B5b+cNIdmpUmcDo+4LLWALJQ3oyGoHrQ/L3xX+oUZx5K1CHvQA9EvRUMpzrbcU8vaKpW99A95oTrocGhXUT8/rDMyi7HQ5g3mK+04E+kYfF4YXdv1ECFI3DpqzvrSILS/GX4CPP6hI+yn4TMRSPTWoKyRzXOENZyA9VH4SkLaaVds9fTMpAJv3epvn0thfvLXHsVq85RNNVLKQx1dFGo9vN2FDL71gbGWg9A+EPtAgMBAAECggEAIjNAnvOSKUHG3Jv0JhIf9fCwU5zef5b9VT2wLEt3jj2GB6k0l18TfV6gw3TxVbuSIublgHBHgSRCTPO0g8i6vycSPk9UKYSe9ncQIEKxr49Wb9nZ016kTetGLylQXLsuzGDWw4ZyhEz86y9GT//ZdJdmbMX0SroWz0dlvzie2NCSV11AC6zPrfy81qqFPzFthdEqcFbiFH097kqWrgQHBno4m/1sR08Z73sZJNocmv2YEx8ggJT5yiem9gWD1eNMvtiggEvwOKYvBWvD4jVXcDDJZu/AckWZVfQqqdr3t2S22446ZejqwpzyIg29vT9WZcCRj6Wj4GO8XaeaDEsPAQKBgQDs2ksD6SUd7aRQu32uM2DDXYi11NsfpVHMO460JwNOGxJSI1GmETKoYZmMi9nvmRvK+K59pV6X0torssqq5H/ZJOFdCdS7/jW52/alWQO/M718B8EvggqyhOQYaxzJYu1H9PcAsbggF2BT161gTeSg0S921s75CJHfyMDpAZ4YQKBgQCL0q8UQZolQUUlkbK4PVXjLXvoGLpsp4yuafqdMLRcRXdAXwVywmk7k5L8PMyR73OXDigCeeED1Dw9H7f0qJZ/gbL+LLZpQbQ9MMLT7T9YcjAKtw67PBVj/BD1aBRhSjHqtBZgx0D/946mtiQAFtNX9/7+MXG5kSmOQxugX8mHDQKBgQCgm4WyqS3aFYMOm5Slw4Eh+cmk5o5TS6K+G5fvmfW3oUMMjn3+GNLM9KrGMdGjb597Iy8jGupRiL0Bx0VNMfpWTEUcgZ8IxmDemSFn/1VSNGvCqYjfFl1DZrPNe+4MRrFtqJ9o2Rkysti1DrUSLwUX/Jtogo5jFleIU9XSai9ZAQKBgHw1xhhdirzrtayBON3YhvLQVhFB3mJlmWDbfqmjOaX6g8xoXSOsNuWY3Gs865H8wJeBGOPSN6U6JeU6xyUNmtxccJDBUa5BkwcEyR6Q1MQSdEEgi3KjFnGC2+HV+rzOt3dDUdnZSBHbbhsFFQgLPuYXxas0a02o+dyKGwGl9hYFAoGBALtXR5YFTVmDGy5IRaWz0wzxQ1PgizYYVDw4015a+Nj6TwEE7NISL2fq+WiUDZzhy9PmBiS7jDHDOF/e/yU6ob6VAJIMB5qIIhy5+aQIox6lY5Zk8JBAqZZ9iHILmbUxbkVou1Sog1xiyn2PzQfho9gkkI4KAqm9Uj1QWH+CgG2";

fs.writeFileSync('configPriv.der', Buffer.from(configPriv, 'base64'));

try {
  console.log('--- ASN1 Parse ---');
  const res = execSync('openssl asn1parse -inform DER -in configPriv.der');
  console.log(res.toString());
} catch (err) {
  console.log('asn1parse failed:', err.message);
}

try {
  console.log('\n--- RSA Check ---');
  const res = execSync('openssl rsa -inform DER -in configPriv.der -check -noout');
  console.log(res.toString());
} catch (err) {
  console.log('openssl rsa failed:', err.message);
}

fs.unlinkSync('configPriv.der');
