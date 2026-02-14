from datetime import datetime
from zoneinfo import ZoneInfo

def to_ist(utc_str: str) -> str:
    """Converts a UTC ISO string to an IST string."""
    if not utc_str: return utc_str
    try:

        print(f"DEBUG: Processing {utc_str}")
        dt = datetime.fromisoformat(utc_str.replace("Z", "+00:00"))
        print(f"DEBUG: Parsed DT: {dt}")
        ist_dt = dt.astimezone(ZoneInfo("Asia/Kolkata"))
        print(f"DEBUG: IST DT: {ist_dt}")
        return ist_dt.strftime("%Y-%m-%d %H:%M:%S IST")
    except Exception as e:
        print(f"DEBUG: ERROR: {e}")
        return utc_str

test_val = "2026-02-14T18:03:18.318+00:00"
print(f"Result: {to_ist(test_val)}")
