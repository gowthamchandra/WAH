import ssl
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ==============================
# Configuration Flags
# ==============================
USE_ALT_HOST = False               # keep until admin says
USE_CUSTOM_CA = False              # set True if corporate CA PEM is required
CUSTOM_CA_PATH = r"C:\certs\corp_root_ca.pem"
DISABLE_VERIFY_FOR_TEST = False    # only for testing, NOT for production
FORCE_TLS12 = True                 # enforce TLS 1.2+

# ==============================
# SMS API Configuration
# ==============================
URL = "https://www.smsgatewayhub.com/api/mt/SendSMS"
if USE_ALT_HOST:
    URL = "https://smsgatewayhub.com/api/mt/SendSMS"

API_KEY = "iaAwl37I5k6dzFSHkqDBPA"
SENDER_ID = "HILSMS"
DEST_NUMBER = "9545905275"
CHANNEL = "2"
DCS = "0"
TIMEOUT = 30

headers = {
    "Content-Type": "application/json",
    "Connection": "keep-alive"
}

# ==============================
# Audit Alert Message
# ==============================
message = (
    "ALERT: Audit on Monday. "
    "All concerned teams ensure records are ready. "
    "Hindalco Industries Ltd."
)

payload = {
    "Account": {
        "APIkey": API_KEY,
        "SenderId": SENDER_ID,
        "Channel": CHANNEL,
        "DCS": DCS
    },
    "Messages": [
        {
            "Text": message,
            "Number": DEST_NUMBER
        }
    ]
}

# ==============================
# TLS 1.2 Enforced Adapter
# ==============================
class TLSMinVersionHttpAdapter(HTTPAdapter):
    def __init__(self, min_version=None, *args, **kwargs):
        self.min_version = min_version
        super().__init__(*args, **kwargs)

    def _make_ctx(self):
        ctx = ssl.create_default_context()
        try:
            ctx.minimum_version = self.min_version or ssl.TLSVersion.TLSv1_2
        except Exception:
            ctx.options |= ssl.OP_NO_TLSv1 | ssl.OP_NO_TLSv1_1
        return ctx

    def init_poolmanager(self, connections, maxsize, block=False, **kwargs):
        kwargs["ssl_context"] = self._make_ctx()
        return super().init_poolmanager(connections, maxsize, block, **kwargs)

# ==============================
# Session with Retry Strategy
# ==============================
session = requests.Session()

retry_strategy = Retry(
    total=3,
    backoff_factor=1.5,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["POST"]
)

if FORCE_TLS12:
    adapter = TLSMinVersionHttpAdapter(max_retries=retry_strategy)
else:
    adapter = HTTPAdapter(max_retries=retry_strategy)

session.mount("https://", adapter)
session.mount("http://", adapter)

# ==============================
# SSL Verification Mode
# ==============================
verify_arg = True
if DISABLE_VERIFY_FOR_TEST:
    verify_arg = False
elif USE_CUSTOM_CA:
    verify_arg = CUSTOM_CA_PATH

# ==============================
# Send SMS
# ==============================
try:
    print("Sending Audit Alert SMS...")

    response = session.post(
        URL,
        json=payload,
        headers=headers,
        timeout=TIMEOUT,
        verify=verify_arg
    )

    print("\nSMS API Response")
    print("HTTP Status:", response.status_code)
    print("Raw Response:", response.text)

    try:
        data = response.json()
    except Exception:
        print("Response is not valid JSON.")
        data = None

    if response.status_code == 200 and isinstance(data, dict):
        if str(data.get("ErrorCode", "")).strip() == "000":
            print("Audit alert SMS accepted by the gateway.")
        else:
            print("Gateway returned an error.")
            print("ErrorCode   :", data.get("ErrorCode"))
            print("ErrorMessage:", data.get("ErrorMessage"))
    else:
        print("HTTP request failed or response invalid.")

except requests.exceptions.SSLError as e:
    print("SSL error. Certificate or inspection issue.", e)
except requests.exceptions.ConnectTimeout as e:
    print("Connection timeout.", e)
except requests.exceptions.ConnectionError as e:
    print("Connection error.", e)
except Exception as e:
    print("Unexpected error:", e)