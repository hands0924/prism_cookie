import json
import os
import re
import sys
from typing import Any

import boto3


ddb = boto3.resource("dynamodb")
secrets = boto3.client("secretsmanager")

VENDOR_PATH = os.path.join(os.path.dirname(__file__), "vendor")
if os.path.isdir(VENDOR_PATH):
    sys.path.insert(0, VENDOR_PATH)


def _get_secret_json(name: str) -> dict[str, Any]:
    resp = secrets.get_secret_value(SecretId=name)
    s = resp.get("SecretString") or "{}"
    return json.loads(s)


def _normalize_phone(phone: str) -> str:
    return re.sub(r"[^0-9]", "", phone or "")


def handler(event, context):
    submissions_table = ddb.Table(os.environ["SUBMISSIONS_TABLE"])

    solapi_secret_name = os.environ["SOLAPI_SECRET_NAME"]
    solapi = _get_secret_json(solapi_secret_name)
    api_key = solapi.get("apiKey")
    api_secret = solapi.get("apiSecret")
    from_number = solapi.get("from")

    if not api_key or not api_secret or not from_number:
        raise RuntimeError("SOLAPI secret missing fields: apiKey/apiSecret/from")

    # Lazy import: 패키징 의존성(솔라피 SDK)을 코드와 함께 포함
    from solapi import SolapiMessageService  # type: ignore

    message_service = SolapiMessageService(api_key, api_secret)

    for record in event.get("Records", []):
        body = json.loads(record.get("body") or "{}")
        submission_id = body.get("submissionId")
        if not submission_id:
            continue

        item = submissions_table.get_item(Key={"submissionId": submission_id}).get("Item")
        if not item:
            continue

        if item.get("sendStatus") == "SENT":
            continue

        to_number = _normalize_phone(item.get("phone") or "")
        text = item.get("generatedMessage") or ""
        if not to_number or not text:
            submissions_table.update_item(
                Key={"submissionId": submission_id},
                UpdateExpression="SET sendStatus=:s, sendError=:e",
                ExpressionAttributeValues={":s": "FAILED", ":e": "missing_to_or_text"},
            )
            continue

        try:
            resp = message_service.send(
                {
                    "to": to_number,
                    "from": from_number,
                    "text": text,
                }
            )
            submissions_table.update_item(
                Key={"submissionId": submission_id},
                UpdateExpression="SET sendStatus=:s, sendMeta=:m REMOVE sendError",
                ExpressionAttributeValues={":s": "SENT", ":m": resp},
            )
        except Exception as e:
            submissions_table.update_item(
                Key={"submissionId": submission_id},
                UpdateExpression="SET sendStatus=:s, sendError=:e",
                ExpressionAttributeValues={":s": "FAILED", ":e": str(e)[:1000]},
            )
            raise
