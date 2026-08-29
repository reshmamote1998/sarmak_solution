const CASHFREE_API_VERSION = "2025-01-01";

function getCashfreeBaseUrl(mode) {
  return mode === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: "Method not allowed." })
    };
  }

  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const cashfreeMode = process.env.CASHFREE_MODE || "sandbox";

  if (!clientId || !clientSecret) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        error: "Cashfree credentials are missing. Add CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in Netlify environment variables."
      })
    };
  }

  let payload;

  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: "Invalid JSON payload." })
    };
  }

  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim();
  const phone = String(payload.phone || "").trim();

  if (!name || !email || !phone) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: "Name, email, and WhatsApp number are required." })
    };
  }

  const cleanedPhone = phone.replace(/[+\s]/g, "");
  const orderId = `SARMAK_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const siteOrigin = event.headers.origin || event.headers.host || "https://example.com";
  const baseUrl = siteOrigin.startsWith("http") ? siteOrigin : `https://${siteOrigin}`;

  const orderPayload = {
    order_id: orderId,
    order_amount: 9,
    order_currency: "INR",
    customer_details: {
      customer_id: orderId,
      customer_name: name,
      customer_email: email,
      customer_phone: cleanedPhone
    },
    order_meta: {
      //return_url: `${baseUrl}/payment_success.html?order_id=${orderId}`
       return_url: `${baseUrl}/payment-status.html?order_id=${orderId}`    },
    order_note: "Worried to Hired Workshop"
  };

  const response = await fetch(`${getCashfreeBaseUrl(cashfreeMode)}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-api-version": CASHFREE_API_VERSION,
      "x-client-id": clientId,
      "x-client-secret": clientSecret
    },
    body: JSON.stringify(orderPayload)
  });

  const responseText = await response.text();

  if (!response.ok) {
    let errorPayload = { message: responseText };

    try {
      errorPayload = JSON.parse(responseText);
    } catch (error) {
      // Ignore parsing errors and use the raw text response
    }

    return {
      statusCode: response.status || 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        error: errorPayload.message || "Cashfree order creation failed."
      })
    };
  }

  let data;

  try {
    data = JSON.parse(responseText);
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: "Cashfree returned an invalid response." })
    };
  }

  const paymentSessionId = data.payment_session_id;

  if (!paymentSessionId) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: "Cashfree did not return a payment_session_id." })
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      success: true,
      order_id: data.order_id || orderId,
      payment_session_id: paymentSessionId,
      mode: cashfreeMode
    })
  };
};
