const crypto = require('crypto');

const generateSignature = (reference, amountInCents, currency, integritySecret) => {
    const chain = `${reference}${amountInCents}${currency}${integritySecret}`;
    const hash = crypto.createHash('sha256').update(chain).digest('hex');
    return hash;
};

const verifyWebhookSignature = (checksum, transactionId, status, amountInCents, timestamp, eventsSecret) => {
    const chain = `${transactionId}${status}${amountInCents}${timestamp}${eventsSecret}`;
    const hash = crypto.createHash('sha256').update(chain).digest('hex');
    return hash === checksum;
};

module.exports = {
    generateSignature,
    verifyWebhookSignature
};