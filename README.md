# 프리즘지점 포춘쿠키 (AWS 버전)

Google Apps Script로 만든 포춘쿠키 웹앱을 AWS로 이전한 버전입니다.

## 구성(목표)
- **정적 웹**: S3 + CloudFront (`/`, `/assets/*`)
- **API**: API Gateway (`/api/*`) → Lambda(Python)
- **저장**: DynamoDB(원본 제출/상태) + 집계 카운터
- **비동기 작업**: SQS + DLQ
- **문자 발송**: SOLAPI (Lambda Worker에서 발송)
- **Google Sheets Export**: EventBridge Scheduler → Export Lambda (1~5분)
- **보안**: CloudFront + WAF (+ Shield Standard)

## 로컬 개발(개요)
1) 인프라: `infra/` (AWS CDK, Python)\n
2) 런타임 코드: `services/` (Lambda 핸들러)\n
3) 정적 웹: `web/` (S3에 배포되는 파일)

## 시크릿/환경변수 정책
- **절대 레포에 비밀 값을 커밋하지 않습니다.**
- 실제 키 값은 **AWS Secrets Manager/SSM**에 저장하고, Lambda는 **Secret ARN/Name만** 환경변수로 받습니다.

