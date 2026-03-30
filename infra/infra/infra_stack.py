import json

from aws_cdk import (
    Duration,
    RemovalPolicy,
    Stack,
    CfnOutput,
    aws_apigateway as apigw,
    aws_certificatemanager as acm,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_dynamodb as dynamodb,
    aws_events as events,
    aws_events_targets as targets,
    aws_iam as iam,
    aws_lambda as lambda_,
    aws_route53 as route53,
    aws_route53_targets as route53_targets,
    aws_s3 as s3,
    aws_s3_deployment as s3deploy,
    aws_secretsmanager as secretsmanager,
    aws_sqs as sqs,
    aws_wafv2 as wafv2,
)
from constructs import Construct

class InfraStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ===== Context inputs (cdk.json 또는 `cdk deploy -c key=value`) =====
        # domain_name: 예) fortune.example.com
        # hosted_zone_name: 예) example.com
        # (선택) route53_hosted_zone_id: 이미 존재하는 HostedZone id를 명시하고 싶으면
        domain_name = self.node.try_get_context("domain_name")
        hosted_zone_name = self.node.try_get_context("hosted_zone_name")
        hosted_zone_id = self.node.try_get_context("route53_hosted_zone_id")

        # ===== Storage: DynamoDB =====
        submissions = dynamodb.Table(
            self,
            "SubmissionsTable",
            partition_key=dynamodb.Attribute(name="submissionId", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN,
            point_in_time_recovery=True,
        )

        # export/query를 위해 submittedAt 기준 GSI 추가 (source는 상수 파티션 키)
        submissions.add_global_secondary_index(
            index_name="gsi1BySourceSubmittedAt",
            partition_key=dynamodb.Attribute(name="source", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="submittedAt", type=dynamodb.AttributeType.STRING),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        aggregates = dynamodb.Table(
            self,
            "AggregatesTable",
            partition_key=dynamodb.Attribute(name="pk", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="sk", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN,
            point_in_time_recovery=True,
        )

        # ===== Queue: SQS + DLQ =====
        dlq = sqs.Queue(
            self,
            "SendDlq",
            retention_period=Duration.days(14),
        )

        send_queue = sqs.Queue(
            self,
            "SendQueue",
            visibility_timeout=Duration.seconds(60),
            dead_letter_queue=sqs.DeadLetterQueue(max_receive_count=5, queue=dlq),
        )

        # ===== Secrets (ARN only; 실제 값은 배포 후 주입) =====
        # - SOLAPI: apiKey/apiSecret/fromNumber
        # - Google Service Account JSON + sheet id
        solapi_secret_name = self.node.try_get_context("solapi_secret_name") or "fortune/solapi"
        google_secret_name = self.node.try_get_context("google_secret_name") or "fortune/google"

        # Create secrets placeholders (values should be set after deploy)
        solapi_secret = secretsmanager.Secret(
            self,
            "SolapiSecret",
            secret_name=solapi_secret_name,
            removal_policy=RemovalPolicy.RETAIN,
            generate_secret_string=secretsmanager.SecretStringGenerator(
                secret_string_template=json.dumps({"apiKey": "", "apiSecret": "", "from": ""}, ensure_ascii=False),
                generate_string_key="__placeholder",
            ),
        )
        google_secret = secretsmanager.Secret(
            self,
            "GoogleSecret",
            secret_name=google_secret_name,
            removal_policy=RemovalPolicy.RETAIN,
            generate_secret_string=secretsmanager.SecretStringGenerator(
                secret_string_template=json.dumps(
                    {"serviceAccountJson": "", "sheetId": "", "sheetName": "responses"}, ensure_ascii=False
                ),
                generate_string_key="__placeholder",
            ),
        )

        # ===== Lambda common settings =====
        lambda_env_base = {
            "SUBMISSIONS_TABLE": submissions.table_name,
            "AGGREGATES_TABLE": aggregates.table_name,
            "SEND_QUEUE_URL": send_queue.queue_url,
            "SOLAPI_SECRET_NAME": solapi_secret_name,
            "GOOGLE_SECRET_NAME": google_secret_name,
            "SOURCE_TAG": "queer-parade-2026",
        }

        def code_with_requirements(path: str) -> lambda_.Code:
            # Docker 없이 synth/deploy가 가능하도록, 의존성은 repo의 vendor/에 미리 설치해 둡니다.
            return lambda_.Code.from_asset(path)

        submit_fn = lambda_.Function(
            self,
            "SubmitFunction",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="app.handler",
            code=lambda_.Code.from_asset("../services/submit"),
            timeout=Duration.seconds(10),
            memory_size=512,
            environment=lambda_env_base,
        )

        worker_fn = lambda_.Function(
            self,
            "WorkerFunction",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="app.handler",
            code=code_with_requirements("../services/worker"),
            timeout=Duration.seconds(30),
            memory_size=512,
            environment=lambda_env_base,
        )

        export_fn = lambda_.Function(
            self,
            "SheetsExportFunction",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="app.handler",
            code=code_with_requirements("../services/sheets_export"),
            timeout=Duration.seconds(60),
            memory_size=512,
            environment=lambda_env_base,
        )

        admin_fn = lambda_.Function(
            self,
            "AdminSummaryFunction",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="app.handler",
            code=lambda_.Code.from_asset("../services/admin"),
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=lambda_env_base,
        )

        # Permissions
        submissions.grant_read_write_data(submit_fn)
        aggregates.grant_read_write_data(submit_fn)
        send_queue.grant_send_messages(submit_fn)

        submissions.grant_read_write_data(worker_fn)
        aggregates.grant_read_write_data(worker_fn)
        send_queue.grant_consume_messages(worker_fn)

        submissions.grant_read_data(export_fn)
        aggregates.grant_read_write_data(export_fn)

        aggregates.grant_read_data(admin_fn)

        # Secrets Manager read (by name)
        for fn in [submit_fn, worker_fn, export_fn]:
            fn.add_to_role_policy(
                iam.PolicyStatement(
                    actions=["secretsmanager:GetSecretValue"],
                    resources=[solapi_secret.secret_arn, google_secret.secret_arn],
                )
            )

        # SQS trigger for worker
        worker_fn.add_event_source_mapping(
            "WorkerSqsEventSource",
            event_source_arn=send_queue.queue_arn,
            batch_size=5,
        )

        # ===== API Gateway =====
        api = apigw.RestApi(
            self,
            "FortuneApi",
            rest_api_name="fortune-api",
            deploy_options=apigw.StageOptions(
                throttling_rate_limit=50,
                throttling_burst_limit=100,
            ),
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=["GET", "POST", "OPTIONS"],
                allow_headers=["Content-Type"],
            ),
        )

        api_prefix = api.root.add_resource("api")
        submit_res = api_prefix.add_resource("submit")
        submit_res.add_method("POST", apigw.LambdaIntegration(submit_fn))

        admin_res = api_prefix.add_resource("admin")
        admin_summary = admin_res.add_resource("summary")
        admin_summary.add_method("GET", apigw.LambdaIntegration(admin_fn))

        # ===== Scheduler: 1~5분 주기 Export =====
        rule = events.Rule(
            self,
            "SheetsExportSchedule",
            schedule=events.Schedule.rate(Duration.minutes(1)),
        )
        rule.add_target(targets.LambdaFunction(export_fn))

        # ===== Static web: S3 + CloudFront + WAF + Route53 =====
        web_bucket = s3.Bucket(
            self,
            "WebBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            removal_policy=RemovalPolicy.RETAIN,
            enforce_ssl=True,
        )

        oai = cloudfront.OriginAccessIdentity(self, "WebOai")
        web_bucket.grant_read(oai)

        # WAFv2 Web ACL (CloudFront scope)
        web_acl = wafv2.CfnWebACL(
            self,
            "WebAcl",
            default_action=wafv2.CfnWebACL.DefaultActionProperty(allow={}),
            scope="CLOUDFRONT",
            visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
                cloud_watch_metrics_enabled=True,
                metric_name="fortune-web-acl",
                sampled_requests_enabled=True,
            ),
            rules=[
                wafv2.CfnWebACL.RuleProperty(
                    name="AWSManagedCommonRuleSet",
                    priority=1,
                    statement=wafv2.CfnWebACL.StatementProperty(
                        managed_rule_group_statement=wafv2.CfnWebACL.ManagedRuleGroupStatementProperty(
                            vendor_name="AWS",
                            name="AWSManagedRulesCommonRuleSet",
                        )
                    ),
                    override_action=wafv2.CfnWebACL.OverrideActionProperty(none={}),
                    visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
                        cloud_watch_metrics_enabled=True,
                        metric_name="awsCommon",
                        sampled_requests_enabled=True,
                    ),
                )
            ],
        )

        # Optional custom domain + ACM cert (CloudFront는 us-east-1)
        certificate = None
        zone = None
        if domain_name and hosted_zone_name:
            zone = (
                route53.HostedZone.from_hosted_zone_attributes(
                    self,
                    "HostedZone",
                    hosted_zone_id=hosted_zone_id,
                    zone_name=hosted_zone_name,
                )
                if hosted_zone_id
                else route53.HostedZone.from_lookup(self, "HostedZoneLookup", domain_name=hosted_zone_name)
            )
            certificate = acm.DnsValidatedCertificate(
                self,
                "WebCert",
                domain_name=domain_name,
                hosted_zone=zone,
                region="us-east-1",
            )

        distribution = cloudfront.Distribution(
            self,
            "WebDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3Origin(web_bucket, origin_access_identity=oai),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
            ),
            additional_behaviors={
                "api/*": cloudfront.BehaviorOptions(
                    origin=origins.HttpOrigin(
                        f"{api.rest_api_id}.execute-api.{self.region}.amazonaws.com",
                        origin_path=f"/{api.deployment_stage.stage_name}",
                    ),
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
                    cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
                    origin_request_policy=cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
                )
            },
            domain_names=[domain_name] if (domain_name and certificate) else None,
            certificate=certificate,
            web_acl_id=web_acl.attr_arn,
            default_root_object="index.html",
        )

        # Deploy static site from /web
        s3deploy.BucketDeployment(
            self,
            "DeployWeb",
            sources=[s3deploy.Source.asset("../web")],
            destination_bucket=web_bucket,
            distribution=distribution,
            distribution_paths=["/*"],
        )

        if zone and domain_name:
            route53.ARecord(
                self,
                "AliasRecord",
                zone=zone,
                record_name=domain_name,
                target=route53.RecordTarget.from_alias(route53_targets.CloudFrontTarget(distribution)),
            )

        CfnOutput(self, "ApiUrl", value=api.url)
        CfnOutput(self, "CloudFrontUrl", value=f"https://{distribution.distribution_domain_name}")
        if domain_name:
            CfnOutput(self, "CustomDomain", value=f"https://{domain_name}")
