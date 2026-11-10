import re
from datetime import date, datetime
from enum import Enum


def parse_date(value):
    """
    Turns a date cell into (start_date, end_date, precision).

      '19.01.2007'    -> (2007-01-19, None, 'day')
      '00.03.2008'    -> (2008-03-01, None, 'month')
      '00.00.2008'    -> (2008-01-01, None, 'year')
      '22-23.02.2007' -> (2007-02-22, 2007-02-23, 'day')
      7.2006 (number) -> (2006-07-01, None, 'month')
      empty           -> (None, None, 'unknown')
    """

    if value is None or str(value).strip() == "":
        return None, None, "unknown"

    if isinstance(value, datetime):
        return value.date(), None, "day"

    if isinstance(value, (int, float)):
        month, year = str(value).split(".")
        return date(int(year), int(month), 1), None, "month"

    text = str(value).strip()

    m = re.fullmatch(r"(\d{1,2})-(\d{1,2})\.(\d{1,2})\.(\d{4})", text)
    if m:
        day1, day2, month, year = (int(x) for x in m.groups())
        return date(year, month, day1), date(year, month, day2), "day"

    m = re.fullmatch(r"(?:(\d{1,2})\.)?(\d{1,2})\.(\d{4})", text)
    if m:
        day = int(m.group(1) or 0)
        month = int(m.group(2))
        year = int(m.group(3))
        if month == 0:
            return date(year, 1, 1), None, "year"
        if day == 0:
            return date(year, month, 1), None, "month"
        return date(year, month, day), None, "day"

    print(f"Can't read date: {value!r}")
    return None, None, "unknown"



def to_json(value):
    if isinstance(value, date):
        return value.isoformat()      
    if isinstance(value, Enum):
        return value.value            
    raise TypeError(f"Can't save {type(value).__name__}")


def clean_id(value):
    if value is None:
        return ""
    return str(value).strip().upper()