"""Send pipeline alerts to a configured Teams Workflow. Python standard library only."""
import argparse
import datetime
import json
import os
import sqlite3
import urllib.error
import urllib.request
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("event", nargs="?", help="JSON file containing id, plant, meter, issue, severity and time")
    parser.add_argument("--db", default="ems-teams.sqlite")
    parser.add_argument("--export", metavar="JSON_FILE")
    args = parser.parse_args()
    with sqlite3.connect(args.db, timeout=30) as db:
        db.execute("CREATE TABLE IF NOT EXISTS attempts(id TEXT, plant TEXT, issue TEXT, status TEXT, at TEXT)")
        if args.export:
            db.row_factory = sqlite3.Row
            rows = db.execute("SELECT * FROM attempts ORDER BY rowid DESC LIMIT 500")
            Path(args.export).write_text(json.dumps([dict(r) for r in rows]))
            return
        if not args.event:
            parser.error("provide an event or --export")
        data = json.loads(Path(args.event).read_text())
        keys = ["id","plant","meter","issue","severity","time"]
        if any(not isinstance(data.get(k),str) or not data[k].strip() for k in keys):
            parser.error("all event fields must be non-empty strings")
        url = os.environ.get("TEAMS_WORKFLOW_URL","")
        if not url.startswith("https://"):
            parser.error("set TEAMS_WORKFLOW_URL in the job secret store")
        db.execute("BEGIN IMMEDIATE")
        if db.execute("SELECT 1 FROM attempts WHERE id=? AND status='Accepted'",(data["id"],)).fetchone():
            return
        facts = [{"title":k.capitalize(),"value":data[k]} for k in keys]
        card = {"type":"AdaptiveCard","version":"1.2","body":[{"type":"TextBlock","text":"EMS Atlas alert","weight":"Bolder"},{"type":"FactSet","facts":facts}]}
        payload = {"type":"message","attachments":[{"contentType":"application/vnd.microsoft.card.adaptive","contentUrl":None,"content":card}]}
        headers = {"Content-Type":"application/json"}
        if os.getenv("TEAMS_ACCESS_TOKEN"):
            headers["Authorization"] = "Bearer "+os.environ["TEAMS_ACCESS_TOKEN"]
        req = urllib.request.Request(url,data=json.dumps(payload).encode(),headers=headers)
        try:
            with urllib.request.urlopen(req,timeout=15) as response:
                status = "Accepted" if 200 <= response.status < 300 else "Failed"
        except urllib.error.HTTPError as exc:
            status = f"HTTP {exc.code}"
        except (OSError,TimeoutError):
            status = "Unknown outcome"
        at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        db.execute("INSERT INTO attempts VALUES (?,?,?,?,?)",(data["id"],data["plant"],data["issue"],status,at))
    print(status)
    if status != "Accepted":
        raise SystemExit(1)
if __name__ == "__main__":
    main()
