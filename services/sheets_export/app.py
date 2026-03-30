import json
import os
import sys
from datetime import datetime, timezone
from typing import Any

import boto3
from boto3.dynamodb.conditions import Key


ddb = boto3.resource("dynamodb")
secrets = boto3.client("secretsmanager")

VENDOR_PATH = os.path.join(os.path.dirname(__file__), "vendor")
if os.path.isdir(VENDOR_PATH):
    sys.path.insert(0, VENDOR_PATH)


def _get_secret_json(name: str) -> dict[str, Any]:
    resp = secrets.get_secret_value(SecretId=name)
    s = resp.get("SecretString") or "{}"
    return json.loads(s)


def handler(event, context):
    """
    1~5분 주기로 실행되어 DynamoDB의 신규 submission을 Google Sheets에 append.

    google secret (Secrets Manager JSON) 예시:
    {
      "serviceAccountJson": "{...GCP service account json string...}",
      "sheetId": "....",
      "sheetName": "responses"
    }
    """
    submissions_table = ddb.Table(os.environ["SUBMISSIONS_TABLE"])
    aggregates_table = ddb.Table(os.environ["AGGREGATES_TABLE"])

    google_secret = _get_secret_json(os.environ["GOOGLE_SECRET_NAME"])
    sa_json_str = google_secret.get("serviceAccountJson")
    sheet_id = google_secret.get("sheetId")
    sheet_name = google_secret.get("sheetName", "responses")

    if not sa_json_str or not sheet_id:
        raise RuntimeError("Google secret missing fields: serviceAccountJson/sheetId")

    # Export cursor stored in aggregates table
    cursor_item = aggregates_table.get_item(Key={"pk": "STATE", "sk": "sheetsCursor"}).get("Item") or {}
    last_submitted_at = cursor_item.get("lastSubmittedAt")  # ISO string

    source = os.environ.get("SOURCE_TAG", "queer-parade-2026")

    # Query by GSI (source + submittedAt)
    kwargs = {
        "IndexName": "gsi1BySourceSubmittedAt",
        "KeyConditionExpression": Key("source").eq(source),
        "ScanIndexForward": True,
        "Limit": 200,
    }
    if last_submitted_at:
        kwargs["KeyConditionExpression"] = (
            Key("source").eq(source) & Key("submittedAt").gt(last_submitted_at)
        )

    resp = submissions_table.query(**kwargs)
    items = resp.get("Items", [])
    if not items:
        return {"statusCode": 200, "body": json.dumps({"exported": 0})}

    # Build rows
    rows = []
    for it in items:
        rows.append(
            [
                it.get("submittedAt", ""),
                it.get("name", ""),
                it.get("phone", ""),
                it.get("concern", ""),
                it.get("protectTarget", ""),
                it.get("neededThing", ""),
                ", ".join(it.get("interests", []) or []),
                it.get("generatedMessage", ""),
                it.get("userAgent", ""),
                it.get("source", ""),
                it.get("sendStatus", ""),
            ]
        )

    # Google Sheets append
    import json as _json
    from google.oauth2.service_account import Credentials  # type: ignore
    from googleapiclient.discovery import build  # type: ignore

    creds_info = _json.loads(sa_json_str)
    creds = Credentials.from_service_account_info(
        creds_info,
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    service = build("sheets", "v4", credentials=creds, cache_discovery=False)

    service.spreadsheets().values().append(
        spreadsheetId=sheet_id,
        range=f"{sheet_name}!A1",
        valueInputOption="RAW",
        insertDataOption="INSERT_ROWS",
        body={"values": rows},
    ).execute()

    new_cursor = items[-1].get("submittedAt") or datetime.now(timezone.utc).isoformat()
    aggregates_table.put_item(Item={"pk": "STATE", "sk": "sheetsCursor", "lastSubmittedAt": new_cursor})

    return {"statusCode": 200, "body": json.dumps({"exported": len(items)})}
