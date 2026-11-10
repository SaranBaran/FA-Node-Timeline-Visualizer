from __future__ import annotations

from enum import Enum

import json

from mapping import NODE_ID, TITLE, DESCRIPTION, FAMILY_INT, SPEC_EVENT, SUSPECTS, DATE, LOC, SUB_LOC, CASES
from formatting import parse_date, to_json

from dataclasses import dataclass, field, asdict
from datetime import date, datetime
from enum import Enum
from typing import Literal, Optional
from openpyxl import load_workbook
from pathlib import Path


DatePrecision = Literal["day", "month", "year", "unknown"]


class EdgeLabel(Enum):
    REGULAR = "regular relation"
    AUTHORIZATION = "investigative authorization process"
    INVESTIGATION = "criminal investigation"
    CASE = "criminal case"
    JURISDICTION = "decision of lack of jurisdiction and venue"
    EXTENSION = "extension of the same event"
    APPEAL = "appeal process"


@dataclass
class EventNode:
    id: str                       
    title: str
    description: str = ""
    start_date: Optional[date] = None    
    family_intervention: bool = False
    special: bool = False
    suspects: list[str] = field(default_factory=list)
    cases: list[str] = field(default_factory=list)
    location: Optional[str] = None
    sub_location: Optional[str] = None

@dataclass
class Edge:
    source: str      
    target: str
    label: EdgeLabel

"""""

#Bunlar lazım mı sor çünkü şu anda lazım mı bilmiyorum
@dataclass
class Suspect:
    name: str   
    cases: list[Case] = field(default_factory=list, repr=False)

@dataclass
class Evidence:
    name: str      
    desc: str

@dataclass
class Case:
    id: str
    title: str    
    desc: str
    suspects: list[Suspect] = field(default_factory=list, repr=False)
    evidences: list[Evidence]


@dataclass
class Involvement:
    suspect: str                 
    case: str                  
    role: str = ""               
    node: str = "" 

"""

ROOT = Path(__file__).resolve().parent.parent   # the project folder
workbook = load_workbook(filename=ROOT / "data" / "raw" / "Node_FA_Hrant_Dink_v2.xlsx", read_only= True)

sheet = workbook.active

total = sum(1 for row in sheet.iter_rows(min_row=2, values_only=True)
            if row[NODE_ID] for c in (6, 8, 10) if row[c])
print("child cells in sheet:", total)

nodes = []
edges = []

for row in sheet.iter_rows(min_row=2, values_only=True):
    if not row[NODE_ID]:
        continue
    event_date = parse_date(row[DATE])[0]
    node = EventNode(id=row[NODE_ID],
                      title=row[TITLE],
                      description=row[DESCRIPTION],
                      start_date = event_date,
                      family_intervention=row[FAMILY_INT],
                      special=row[SPEC_EVENT],
                      suspects=row[SUSPECTS],
                      location=row[LOC],
                      sub_location=row[SUB_LOC],
                      cases=row[CASES])
    nodes.append(node)

    for child in range(6,9):
        if row[child]:
            edge = Edge(
                source= row[NODE_ID],
                target=row[child],
                label = row[child+3]
            )
            edges.append(edge)

json_str = json.dumps(asdict(nodes[0]), default=to_json, ensure_ascii=False)
data = {"nodes": [asdict(n) for n in nodes], "edges": [asdict(e) for e in edges]}
out = ROOT / "web" / "public" / "data.json"
out.write_text(json.dumps(data, default=to_json, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Wrote {len(nodes)} nodes and {len(edges)} edges to {out}")