const config = require("config");

async function refundPaidCardOrder(order) {
  if (order.paymentMethod !== "card") {
    return { ok: true };
  }

  if (!order.payment?.isPaid) {
    return { ok: true };
  }

  if (order.payment?.isPaymentRefunded) {
    return { ok: true };
  }

  if (!order.payment?.gatewayOrderId) {
    return {
      ok: false,
      status: 409,
      message:
        "Card order has no gateway order id; cannot refund. Register or sync payment first.",
    };
  }

  if (
    !Number.isFinite(order.payment.amountMinor) ||
    order.payment.amountMinor <= 0
  ) {
    return {
      ok: false,
      status: 409,
      message:
        "Missing charged amount (amountMinor). Sync payment status before cancelling or confirming return.",
    };
  }

  const userName = config.get("paymentGatewayUserName");
  const password = config.get("paymentGatewayPassword");
  if (!userName || !password) {
    return {
      ok: false,
      status: 500,
      message: "Payment gateway credentials are not configured on the server.",
    };
  }

  const gatewayUrl = `${config
    .get("paymentGatewayBaseUrl")
    .replace(/\/$/, "")}/payment/rest/refund.do`;

  const gatewayPayload = {
    userName,
    password,
    orderId: order.payment.gatewayOrderId,
    amount: String(Math.round(order.payment.amountMinor)),
  };

  const gatewayResponse = await fetch(gatewayUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(gatewayPayload),
  });

  const rawBody = await gatewayResponse.text();

  let parsedResponse = {};
  try {
    parsedResponse = rawBody ? JSON.parse(rawBody) : {};
  } catch (parseError) {
    parsedResponse = {
      errorCode: 500,
      errorMessage: "Invalid payment gateway response.",
    };
  }

  const errorCode = Number(parsedResponse.errorCode ?? 500);
  const success = gatewayResponse.ok && errorCode === 0;

  if (!success) {
    return {
      ok: false,
      status: 502,
      body: {
        errorCode,
        errorMessage:
          parsedResponse.errorMessage ||
          "Payment gateway refused or failed the refund.",
      },
    };
  }

  return { ok: true };
}

module.exports = refundPaidCardOrder;
