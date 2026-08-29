const CASHFREE_API_VERSION = "2025-01-01";

function getCashfreeBaseUrl(mode) {
  return mode === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

exports.handler = async function (event) {
  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        success: false,
        error: "Method not allowed."
      })
    };
  }

  // Get Cashfree credentials from Netlify
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const cashfreeMode = process.env.CASHFREE_MODE || "sandbox";

  // Check credentials
  if (!clientId || !clientSecret) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        success: false,
        error: "Cashfree credentials are missing."
      })
    };
  }

  // Get order ID from URL
  const orderId = event.queryStringParameters?.order_id;

  if (!orderId) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        success: false,
        error: "Order ID is missing."
      })
    };
  }

  try {
    // Ask Cashfree for order details
    const response = await fetch(
      `${getCashfreeBaseUrl(cashfreeMode)}/orders/${encodeURIComponent(orderId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-api-version": CASHFREE_API_VERSION,
          "x-client-id": clientId,
          "x-client-secret": clientSecret
        }
      }
    );

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      data = {};
    }

    // If Cashfree API returns an error
    if (!response.ok) {
      return {
        statusCode: response.status || 500,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          success: false,
          error: data.message || "Unable to check payment status."
        })
      };
    }

    // Return payment status to payment-status.html
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        success: true,
        order_id: data.order_id,
        payment_status: data.order_status
      })
    };

  } catch (error) {
    console.error("Cashfree payment check error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        success: false,
        error: "Unable to check payment status."
      })
    };
  }
};