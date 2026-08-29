
from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    redirect,
    url_for
)

import requests
import os
import uuid
import webbrowser
import threading
from dotenv import load_dotenv


# ==========================================
# LOAD ENVIRONMENT VARIABLES
# ==========================================

load_dotenv()


# ==========================================
# FLASK APP
# ==========================================

app = Flask(__name__)


# ==========================================
# CASHFREE CONFIGURATION
# ==========================================

CASHFREE_CLIENT_ID = os.getenv(
    "CASHFREE_CLIENT_ID"
)

CASHFREE_CLIENT_SECRET = os.getenv(
    "CASHFREE_CLIENT_SECRET"
)


# sandbox for testing
# production for live payments

CASHFREE_MODE = os.getenv(
    "CASHFREE_MODE",
    "sandbox"
)


# ==========================================
# CASHFREE API URL
# ==========================================

if CASHFREE_MODE == "production":

    CASHFREE_BASE_URL = (
        "https://api.cashfree.com/pg"
    )

else:

    CASHFREE_BASE_URL = (
        "https://sandbox.cashfree.com/pg"
    )


# ==========================================
# API VERSION
# ==========================================

CASHFREE_API_VERSION = "2025-01-01"


# ==========================================
# HOME PAGE
# ==========================================

@app.route("/")
def home():

    return render_template(
        "index.html"
    )


# ==========================================
# CREATE CASHFREE ORDER
# ==========================================

@app.route(
    "/create-order",
    methods=["POST"]
)
def create_order():

    try:

        # ----------------------------------
        # GET FORM DATA
        # ----------------------------------

        name = request.form.get(
            "name",
            ""
        ).strip()


        email = request.form.get(
            "email",
            ""
        ).strip()


        full_phone = request.form.get(
            "full_phone",
            ""
        ).strip()


        # ----------------------------------
        # VALIDATION
        # ----------------------------------

        if not name:

            return jsonify({

                "success": False,

                "error":
                    "Name is required."

            }), 400


        if not email:

            return jsonify({

                "success": False,

                "error":
                    "Email is required."

            }), 400


        if not full_phone:

            return jsonify({

                "success": False,

                "error":
                    "WhatsApp number is required."

            }), 400


        # ----------------------------------
        # REMOVE + FROM PHONE
        # ----------------------------------

        customer_phone = (
            full_phone
            .replace("+", "")
            .replace(" ", "")
        )


        # ----------------------------------
        # UNIQUE ORDER ID
        # ----------------------------------

        order_id = (
            "SARMAK_"
            + uuid.uuid4().hex[:20]
        )


        # ----------------------------------
        # CASHFREE REQUEST
        # ----------------------------------

        payload = {

            "order_id":
                order_id,

            "order_amount":
                9,

            "order_currency":
                "INR",

            "customer_details": {

                "customer_id":
                    order_id,

                "customer_name":
                    name,

                "customer_email":
                    email,

                "customer_phone":
                    customer_phone

            },

            "order_meta": {

                "return_url":
                    request.host_url.rstrip("/")
                    + "/payment-success"
                    + "?order_id="
                    + order_id

            },

            "order_note":
                "WORRIES to Hired Workshop"

        }


        # ----------------------------------
        # HEADERS
        # ----------------------------------

        headers = {

            "Content-Type":
                "application/json",

            "Accept":
                "application/json",

            "x-api-version":
                CASHFREE_API_VERSION,

            "x-client-id":
                CASHFREE_CLIENT_ID,

            "x-client-secret":
                CASHFREE_CLIENT_SECRET

        }


        # ----------------------------------
        # CALL CASHFREE
        # ----------------------------------

        response = requests.post(

            CASHFREE_BASE_URL + "/orders",

            json=payload,

            headers=headers,

            timeout=30

        )


        # ----------------------------------
        # DEBUG
        # ----------------------------------

        print(
            "Cashfree Status:",
            response.status_code
        )

        print(
            "Cashfree Response:",
            response.text
        )


        # ----------------------------------
        # CASHFREE ERROR
        # ----------------------------------

        if response.status_code not in [
            200,
            201
        ]:

            try:

                error_data = response.json()

            except Exception:

                error_data = {

                    "message":
                        response.text

                }


            return jsonify({

                "success": False,

                "error":
                    error_data.get(
                        "message",
                        "Cashfree order creation failed."
                    )

            }), 400


        # ----------------------------------
        # GET RESPONSE
        # ----------------------------------

        data =response.json()


        payment_session_id =data.get(
                "payment_session_id"
            )


        if not payment_session_id:

            return jsonify({

                "success": False,

                "error":
                    "Cashfree did not return payment_session_id."

            }), 500


        # ----------------------------------
        # SUCCESS RESPONSE TO FRONTEND
        # ----------------------------------

        return jsonify({

            "success": True,

            "order_id":
                data.get(
                    "order_id",
                    order_id
                ),

            "payment_session_id":
                payment_session_id,

            "mode":
                CASHFREE_MODE

        })


    except Exception as e:

        print(
            "CREATE ORDER ERROR:",
            str(e)
        )


        return jsonify({

            "success": False,

            "error":
                "Unable to create Cashfree order."

        }), 500


# ==========================================
# PAYMENT SUCCESS / RETURN URL
# ==========================================

@app.route(
    "/payment-success"
)
def payment_success():

    order_id = request.args.get(
            "order_id"
        )


    return render_template(

        "payment-success.html",

        order_id=order_id

    )


# ==========================================
# RUN FLASK
# ==========================================

if __name__ == "__main__":

    url = "http://127.0.0.1:5000/"

    threading.Timer(
        1.5,
        lambda: webbrowser.open(url)
    ).start()

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
        use_reloader=False
    )
