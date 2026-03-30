import json
import os

import boto3
from boto3.dynamodb.conditions import Key


ddb = boto3.resource("dynamodb")


def _resp(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }


def handler(event, context):
    aggregates_table = ddb.Table(os.environ["AGGREGATES_TABLE"])

    # GLOBAL 파티션 전체 스캔(파티션 단위 Query)
    resp = aggregates_table.query(
        KeyConditionExpression=Key("pk").eq("GLOBAL")
    )
    items = resp.get("Items", [])

    summary = {"total": 0, "concern": {}, "protectTarget": {}, "neededThing": {}, "interest": {}}

    for it in items:
        sk = it.get("sk", "")
        count = int(it.get("count", 0))
        if sk == "total":
            summary["total"] = count
            continue
        if "#" in sk:
            kind, val = sk.split("#", 1)
            if kind in summary and isinstance(summary[kind], dict):
                summary[kind][val] = count

    return _resp(200, {"success": True, "summary": summary})
