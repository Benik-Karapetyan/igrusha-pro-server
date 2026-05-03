const config = require("config");

/**
 * Fetches payment status from the gateway and persists payment fields on `order`
 * when the HTTP response is OK and errorCode === 0.
 * Call only for card orders.
 *
 * @returns {Promise<{ ok: boolean, errorCode?: number, errorMessage?: string, isPaid?: boolean, orderId?: string | null, orderNumber?: string, amount?: number | null }>}
 */
async function syncOrderPaymentFromGateway(order) {
  const userName = config.get("paymentGatewayUserName");
  const password = config.get("paymentGatewayPassword");
  if (!userName || !password) {
    return {
      ok: false,
      errorCode: 500,
      errorMessage:
        "Payment gateway credentials are not configured on the server.",
    };
  }

  const gatewayPayload = {
    userName,
    password,
  };
  if (order.payment?.gatewayOrderId) {
    gatewayPayload.orderId = order.payment.gatewayOrderId;
  } else {
    gatewayPayload.orderNumber = order.orderNumber;
  }

  const gatewayUrl = `${config
    .get("paymentGatewayBaseUrl")
    .replace(/\/$/, "")}/payment/rest/getOrderStatusExtended.do`;

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

  if (!gatewayResponse.ok || errorCode !== 0) {
    return {
      ok: false,
      errorCode,
      errorMessage:
        parsedResponse.errorMessage ||
        "Failed to retrieve order status from payment gateway.",
    };
  }

  const gatewayOrderStatus = Number(parsedResponse.orderStatus);
  const hasOrderStatus = !Number.isNaN(gatewayOrderStatus);

  const isPaid = hasOrderStatus
    ? gatewayOrderStatus === 2
    : Boolean(order.payment?.isPaid);

  let paidAt = order.payment?.paidAt ?? null;
  if (isPaid) {
    paidAt = paidAt || new Date();
  } else if (hasOrderStatus) {
    paidAt = null;
  }

  const amountMinor =
    parsedResponse.amount !== undefined
      ? Number(parsedResponse.amount)
      : order.payment?.amountMinor ?? null;

  order.payment = {
    ...order.payment,
    gatewayOrderId:
      parsedResponse.orderId || order.payment?.gatewayOrderId || null,
    amountMinor,
    isPaid,
    paidAt,
    lastStatusSyncAt: new Date(),
  };
  await order.save();

  return {
    ok: true,
    isPaid,
    orderId: parsedResponse.orderId || order.payment.gatewayOrderId || null,
    orderNumber: parsedResponse.orderNumber || order.orderNumber,
    amount: order.payment.amountMinor,
    errorCode: 0,
    errorMessage: parsedResponse.errorMessage || "",
  };
}

module.exports = syncOrderPaymentFromGateway;
