const config = require("config");

const registerOrderPayment = async (
  orderNumber,
  totalAmount,
  language,
  returnUrl
) => {
  const userName = config.get("paymentGatewayUserName");
  const password = config.get("paymentGatewayPassword");
  if (!userName || !password) {
    return {
      errorCode: 500,
      errorMessage:
        "Payment gateway credentials are not configured on the server.",
    };
  }

  const amountMultiplier = Number(
    config.get("paymentGatewayAmountMultiplier") || 100
  );
  const amountInMinorUnits = String(Math.round(totalAmount * amountMultiplier));

  const gatewayUrl = `${config
    .get("paymentGatewayBaseUrl")
    .replace(/\/$/, "")}/payment/rest/register.do`;

  const gatewayPayload = {
    userName,
    password,
    orderNumber,
    amount: amountInMinorUnits,
    currency: config.get("paymentGatewayCurrency"),
    returnUrl,
    ...(language ? { language } : {}),
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
  const isRegistered =
    gatewayResponse.ok &&
    errorCode === 0 &&
    parsedResponse.orderId &&
    parsedResponse.formUrl;

  const payment = {
    gatewayOrderId: parsedResponse.orderId || null,
    formUrl: parsedResponse.formUrl || null,
    registeredAt: isRegistered ? new Date() : undefined,
  };

  if (!isRegistered) {
    return {
      errorCode,
      errorMessage: parsedResponse.errorMessage || "",
    };
  } else {
    return { payment };
  }
};

module.exports = registerOrderPayment;
