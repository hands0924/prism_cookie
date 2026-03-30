import json
import os
import re
import uuid
from datetime import datetime, timezone

import boto3


ddb = boto3.resource("dynamodb")
sqs = boto3.client("sqs")


Q1_MSGS = {
    "아플 때": [
        "당신은 아플 때 삶이 흔들리지 않기를 바라는 마음이 커 보여요.",
        "몸의 불안은 일상 전체를 흔들 수 있기에, 지금의 걱정은 아주 현실적이고도 중요한 감각이에요.",
        "당신은 건강의 문제를 단지 개인의 문제가 아니라 삶의 기반으로 느끼고 있어요.",
    ],
    "가족/파트너 문제": [
        "당신은 관계의 균열이 삶 전체에 미치는 무게를 잘 알고 있어요.",
        "소중한 사람과의 관계가 흔들릴 때, 마음 한가운데가 먼저 불안해진다는 걸 이미 겪어본 것 같아요.",
        "당신에게 관계는 스쳐 지나가는 감정이 아니라 삶을 지탱하는 중요한 축이에요.",
    ],
    "일이 끊길 때": [
        "당신은 삶의 리듬이 무너질 때 찾아오는 불안을 아주 현실적으로 바라보고 있어요.",
        "일의 불확실성 앞에서도 버텨온 시간이 있었기에, 지금의 걱정은 결코 가볍지 않아요.",
        "당신은 안정적인 내일이 얼마나 큰 힘이 되는지 누구보다 잘 알고 있어요.",
    ],
    "노후": [
        "당신은 오늘만이 아니라 오래 이어질 삶의 시간을 함께 바라보고 있어요.",
        "아직 오지 않은 시간을 준비하고 싶다는 마음은, 당신이 삶을 책임감 있게 대하고 있다는 뜻이기도 해요.",
        "먼 미래를 걱정할 수 있다는 건 그만큼 오래, 잘 살아가고 싶다는 마음의 표현이에요.",
    ],
    "갑작스러운 사고": [
        "당신은 예고 없이 찾아오는 변수 앞에서 삶이 얼마나 쉽게 흔들릴 수 있는지 알고 있어요.",
        "우연한 사고가 남기는 흔들림을 가볍게 넘기지 않는 당신의 감각은 매우 현실적이에요.",
        "예상할 수 없는 순간에도 나와 내 삶을 지키고 싶다는 마음이 분명하게 느껴져요.",
    ],
}

Q2_MSGS = {
    "나 자신": [
        "지금 당신은 무엇보다도 스스로를 잃지 않는 삶을 바라고 있고,",
        "당신이 지키고 싶은 첫 번째 대상이 나 자신이라는 건, 이미 중요한 회복의 감각을 알고 있다는 뜻이고,",
        "나 자신을 지키려는 선택은 결코 이기적인 것이 아니라 앞으로를 위한 단단한 시작이에요. 그래서",
    ],
    "파트너": [
        "당신에게 파트너는 함께 미래를 상상하고 싶은 소중한 존재이고,",
        "누군가와 나란히 살아가는 마음이 지금 당신의 선택을 더 진지하게 만들고 있고,",
        "파트너를 지키고 싶다는 마음에는 사랑만이 아니라 책임과 용기도 함께 담겨 있어요. 그래서",
    ],
    "가족": [
        "당신은 가족이라는 울타리를 오래 지켜내고 싶은 마음이 커 보이고,",
        "가족을 떠올리는 당신의 선택에는 삶을 함께 견디고 이어가려는 마음이 담겨 있고,",
        "누군가의 안부와 일상을 지키고 싶다는 마음이 지금의 당신을 움직이고 있어요. 그래서",
    ],
    "반려동물": [
        "당신에게 반려동물은 돌봄과 애정이 구체적인 일상이 되는 존재이고,",
        "말보다 더 깊은 방식으로 서로를 의지하는 존재를 지키고 싶은 마음이 느껴지고,",
        "함께 살아가는 작은 존재의 안온함이 당신에게 큰 의미라는 게 전해져요. 그래서",
    ],
    "아직 잘 모르겠다": [
        "아직 무엇을 가장 먼저 지켜야 할지 천천히 살피고 있는 중일 수 있고,",
        "선명한 답을 아직 정하지 못했다는 건, 그만큼 삶을 가볍게 고르지 않고 있다는 뜻이고,",
        "지금은 대상을 정하기보다 내 마음의 방향을 알아가는 시간일 수 있어요. 그래서",
    ],
}

Q3_MSGS = {
    "정보": [
        "지금은 막연한 불안보다 선명한 정보가 더 필요해 보여요.",
        "알수록 덜 흔들리고 이해할수록 더 준비할 수 있다는 감각이 지금의 당신에게 중요해 보여요.",
        "당신은 불안을 견디는 것보다, 제대로 알고 선택하는 힘을 원하고 있어요.",
    ],
    "안전망": [
        "더 안전하게 기대설 수 있는 기반을 필요로 하고 있어요.",
        "삶의 흔들림 속에서도 무너지지 않게 받쳐주는 안전망이 지금의 당신에게 큰 힘이 되어줄 거예요.",
        "당신은 강해지는 것만큼이나 지켜질 수 있는 조건을 중요하게 여기고 있어요.",
    ],
    "응원": [
        "지금은 정답보다도 마음을 붙잡아주는 응원이 더 필요해 보여요.",
        "잘하고 있다는 신호, 계속 가도 된다는 응원이 지금의 당신에게 가장 큰 힘이 될 수 있어요.",
        "당신은 해결책뿐 아니라 마음을 잃지 않게 해주는 온기를 필요로 하고 있어요.",
    ],
    "계획": [
        "지금은 막연한 다짐보다 구체적인 계획이 더 필요해 보여요.",
        "한 걸음씩 정리된 계획은 불안을 줄이고 삶을 더 또렷하게 만들어줄 거예요.",
        "당신은 버티는 하루보다 준비된 내일을 더 원하고 있어요.",
    ],
    "연결": [
        "지금은 혼자가 아니라는 감각과 좋은 연결이 큰 힘이 되어줄 거예요.",
        "필요한 순간 손을 내밀 수 있는 연결은 삶을 훨씬 단단하게 만들어줘요.",
        "당신은 정보나 제도 이전에, 믿고 이어질 수 있는 관계의 힘을 필요로 하고 있어요.",
    ],
}

CLOSINGS = [
    "오늘 고른 마음의 재료들이 당신의 미래를 조금 더 다정하고 단단하게 구워줄 거예요.",
    "지금의 선택은 불안을 없애기보다, 삶을 더 선명하게 돌보는 방향으로 당신을 이끌 거예요.",
    "당신이 지키고 싶은 것을 잊지 않는 한, 다음 계절의 삶도 분명 더 단단해질 거예요.",
    "오늘 받은 이 작은 포춘이 당신의 내일에 오래 남는 힌트가 되길 바라요.",
    "서두르지 않아도 괜찮아요. 당신의 미래는 이미 천천히, 그러나 분명하게 익어가고 있어요.",
]


def _pick(arr, seed: str) -> str:
    # deterministic-ish: seed로 단순 해시를 만들어 같은 입력이면 같은 메시지가 나오게(중복 발송/리트라이 UX 안정)
    h = sum(ord(c) for c in seed) % 1_000_000
    return arr[h % len(arr)]


def generate_message(concern: str, protect_target: str, needed_thing: str) -> list[str]:
    l1 = _pick(Q1_MSGS.get(concern, Q1_MSGS["아플 때"]), f"q1:{concern}")
    l2a = _pick(Q2_MSGS.get(protect_target, Q2_MSGS["나 자신"]), f"q2:{protect_target}")
    l2b = _pick(Q3_MSGS.get(needed_thing, Q3_MSGS["정보"]), f"q3:{needed_thing}")
    l3 = _pick(CLOSINGS, f"c:{concern}:{protect_target}:{needed_thing}")
    return [l1, f"{l2a} {l2b}", l3]


def normalize_phone(phone: str) -> str:
    digits = re.sub(r"[^0-9]", "", phone or "")
    # 한국 번호 가정: 010xxxxxxxx
    return digits


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
    try:
        raw_body = event.get("body") or ""
        if event.get("isBase64Encoded"):
            import base64

            raw_body = base64.b64decode(raw_body).decode("utf-8")
        payload = json.loads(raw_body) if raw_body else {}

        name = (payload.get("name") or "").strip()
        phone_raw = (payload.get("phone") or "").strip()
        concern = payload.get("concern") or ""
        protect_target = payload.get("protectTarget") or ""
        needed_thing = payload.get("neededThing") or ""
        interests = payload.get("interests") or []
        user_agent = payload.get("userAgent") or ""

        if not name:
            return _resp(400, {"success": False, "error": "name_required"})
        if not phone_raw:
            return _resp(400, {"success": False, "error": "phone_required"})

        phone = normalize_phone(phone_raw)
        if len(phone) < 8:
            return _resp(400, {"success": False, "error": "phone_invalid"})

        submission_id = str(uuid.uuid4())
        submitted_at = datetime.now(timezone.utc).isoformat()
        source = os.environ.get("SOURCE_TAG", "queer-parade-2026")

        message_lines = generate_message(concern, protect_target, needed_thing)
        message_text = "\n".join(message_lines)

        submissions_table = ddb.Table(os.environ["SUBMISSIONS_TABLE"])
        aggregates_table = ddb.Table(os.environ["AGGREGATES_TABLE"])

        item = {
            "submissionId": submission_id,
            "submittedAt": submitted_at,
            "source": source,
            "name": name,
            "phone": phone,
            "concern": concern,
            "protectTarget": protect_target,
            "neededThing": needed_thing,
            "interests": interests,
            "generatedMessage": message_text,
            "userAgent": user_agent,
            "sendStatus": "PENDING",
        }

        submissions_table.put_item(Item=item)

        # Aggregates: GLOBAL + 옵션별 카운트
        def inc(sk: str, n: int = 1):
            aggregates_table.update_item(
                Key={"pk": "GLOBAL", "sk": sk},
                UpdateExpression="ADD #c :n",
                ExpressionAttributeNames={"#c": "count"},
                ExpressionAttributeValues={":n": n},
            )

        inc("total")
        if concern:
            inc(f"concern#{concern}")
        if protect_target:
            inc(f"protectTarget#{protect_target}")
        if needed_thing:
            inc(f"neededThing#{needed_thing}")
        if isinstance(interests, list):
            for it in interests:
                if it:
                    inc(f"interest#{it}")

        sqs.send_message(
            QueueUrl=os.environ["SEND_QUEUE_URL"],
            MessageBody=json.dumps({"submissionId": submission_id}, ensure_ascii=False),
        )

        return _resp(
            200,
            {
                "success": True,
                "name": name,
                "message": message_lines,
                "submissionId": submission_id,
            },
        )
    except Exception as e:
        return _resp(500, {"success": False, "error": str(e)})
