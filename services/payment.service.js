const Razorpay = require('razorpay');
const crypto = require('crypto');

let razorpayInstance = null;

const resolveRazorpayConfig = () => {
  const razorpayMode = (process.env.RAZORPAY_MODE || (process.env.NODE_ENV === 'production' ? 'live' : 'test')).toLowerCase();
  const razorpayKeyId = razorpayMode === 'live'
    ? (process.env.RAZORPAY_KEY_ID_LIVE || process.env.RAZORPAY_KEY_ID)
    : (process.env.RAZORPAY_KEY_ID_TEST || process.env.RAZORPAY_KEY_ID);
  const razorpayKeySecret = razorpayMode === 'live'
    ? (process.env.RAZORPAY_KEY_SECRET_LIVE || process.env.RAZORPAY_KEY_SECRET)
    : (process.env.RAZORPAY_KEY_SECRET_TEST || process.env.RAZORPAY_KEY_SECRET);

  return { razorpayMode, razorpayKeyId, razorpayKeySecret };
};

const getRazorpayClient = () => {
  const { razorpayMode, razorpayKeyId, razorpayKeySecret } = resolveRazorpayConfig();

  if (!razorpayKeyId || !razorpayKeySecret) {
    return null;
  }

  const needsRefresh = !razorpayInstance
    || razorpayInstance.__skillbridgeKeyId !== razorpayKeyId
    || razorpayInstance.__skillbridgeKeySecret !== razorpayKeySecret;

  if (needsRefresh) {
    razorpayInstance = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });
    razorpayInstance.__skillbridgeKeyId = razorpayKeyId;
    razorpayInstance.__skillbridgeKeySecret = razorpayKeySecret;

    if (razorpayMode === 'live' && /^rzp_test_/i.test(razorpayKeyId)) {
      console.warn('⚠️ Razorpay live mode is enabled, but a test key ID is configured. Update RAZORPAY_KEY_ID_LIVE / RAZORPAY_KEY_SECRET_LIVE.');
    }
  }

  return razorpayInstance;
};

/**
 * Verify Razorpay payment signature using timing-safe comparison.
 * Prevents timing side-channel attacks on signature forgery.
 */
const verifyPayment = (order_id, payment_id, signature) => {
  const { razorpayKeySecret } = resolveRazorpayConfig();

  if (!razorpayKeySecret) {
    return false;
  }

  if (!order_id || !payment_id || !signature) {
    return false;
  }

  const body = order_id + "|" + payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', razorpayKeySecret)
    .update(body.toString())
    .digest('hex');

  // Timing-safe comparison to prevent side-channel attacks
  try {
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
};

const fetchPaymentDetails = async (paymentId) => {
  const client = getRazorpayClient();

  if (!client || !paymentId) {
    return null;
  }

  return client.payments.fetch(paymentId);
};

const fetchOrderDetails = async (orderId) => {
  const client = getRazorpayClient();

  if (!client || !orderId) {
    return null;
  }

  return client.orders.fetch(orderId);
};

module.exports = {
  get razorpay() {
    return getRazorpayClient();
  },
  get razorpayMode() {
    return resolveRazorpayConfig().razorpayMode;
  },
  getRazorpayClient,
  verifyPayment,
  fetchPaymentDetails,
  fetchOrderDetails,
};
