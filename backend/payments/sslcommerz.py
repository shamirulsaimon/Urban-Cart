import json
import uuid
from urllib.parse import urlencode
from urllib.request import Request, urlopen


class SSLCommerzError(Exception):
    pass


def create_sslcommerz_session(
    *,
    store_id: str,
    store_passwd: str,
    base_url: str,
    order_id: int,
    amount: str,
    currency: str,
    customer_name: str,
    customer_email: str,
    customer_phone: str,
    success_url: str,
    fail_url: str,
    cancel_url: str,
    ipn_url: str,
    # shipping info
    ship_name: str = "",
    ship_add1: str = "",
    ship_city: str = "",
    ship_country: str = "Bangladesh",
    ship_postcode: str = "1200",   # ✅ NEW
    cus_postcode: str = "1200",    # ✅ NEW
):
    tran_id = f"UC{order_id}-{uuid.uuid4().hex[:10]}"

    payload = {
        "store_id": store_id,
        "store_passwd": store_passwd,
        "total_amount": amount,
        "currency": currency,
        "tran_id": tran_id,

        "success_url": success_url,
        "fail_url": fail_url,
        "cancel_url": cancel_url,
        "ipn_url": ipn_url,

        # product
        "product_name": f"Order #{order_id}",
        "product_category": "Ecommerce",
        "product_profile": "general",

        # customer
        "cus_name": customer_name or "Customer",
        "cus_email": customer_email or "customer@example.com",
        "cus_add1": "Dhaka",
        "cus_city": "Dhaka",
        "cus_country": "Bangladesh",
        "cus_phone": customer_phone or "01700000000",
        "cus_postcode": str(cus_postcode or "1200"),  # ✅ NEW

        # ✅ shipping required
        "shipping_method": "YES",
        "ship_name": ship_name or (customer_name or "Customer"),
        "ship_add1": ship_add1 or "Dhaka",
        "ship_city": ship_city or "Dhaka",
        "ship_country": ship_country or "Bangladesh",
        "ship_postcode": str(ship_postcode or "1200"),  # ✅ NEW
    }

    url = base_url.rstrip("/") + "/gwprocess/v4/api.php"
    data = urlencode(payload).encode("utf-8")

    req = Request(url, data=data, method="POST")

    try:
        with urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
    except Exception as e:
        raise SSLCommerzError(f"SSLCommerz request failed: {e}")

    try:
        res = json.loads(body)
    except Exception:
        raise SSLCommerzError("Invalid JSON from SSLCommerz")

    if res.get("status") != "SUCCESS":
        raise SSLCommerzError(res.get("failedreason") or "SSLCommerz initiation failed")

    return {
        "tran_id": tran_id,
        "gateway_url": res.get("GatewayPageURL"),
        "sessionkey": res.get("sessionkey"),
        "raw": res,
    }
