import { getOpsSnapshot } from "@/lib/ops";
import { isAuthorizedOpsKey } from "@/lib/ops-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ key?: string }>;
};

function formatSeconds(value: number | null): string {
  if (value === null) {
    return "-";
  }
  if (value < 60) {
    return `${value}s`;
  }
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}m ${seconds}s`;
}

function QueueTable(props: {
  title: string;
  data: { pending: number; processing: number; doneOrSent: number; failed: number; oldestPendingSeconds: number | null };
}) {
  return (
    <section className="card">
      <div className="hero" />
      <div className="content">
        <h2>{props.title}</h2>
        <div className="ops-grid">
          <div>
            <div className="ops-label">PENDING</div>
            <div className="ops-value">{props.data.pending}</div>
          </div>
          <div>
            <div className="ops-label">PROCESSING</div>
            <div className="ops-value">{props.data.processing}</div>
          </div>
          <div>
            <div className="ops-label">DONE/SENT</div>
            <div className="ops-value">{props.data.doneOrSent}</div>
          </div>
          <div>
            <div className="ops-label">FAILED</div>
            <div className="ops-value">{props.data.failed}</div>
          </div>
          <div>
            <div className="ops-label">Oldest Pending</div>
            <div className="ops-value">{formatSeconds(props.data.oldestPendingSeconds)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function OpsPage({ searchParams }: PageProps) {
  const { key } = await searchParams;
  if (!isAuthorizedOpsKey(key)) {
    return (
      <main className="container">
        <section className="card">
          <div className="hero" />
          <div className="content">
            <h1 className="title">Ops Dashboard</h1>
            <p className="desc">Unauthorized. Use /ops?key=YOUR_OPS_DASHBOARD_KEY</p>
          </div>
        </section>
      </main>
    );
  }

  const snapshot = await getOpsSnapshot();

  return (
    <main className="container">
      <section className="card">
        <div className="hero" />
        <div className="content">
          <h1 className="title">Ops Dashboard</h1>
          <p className="desc">Generated at {snapshot.generatedAt}</p>
          <div className="ops-grid">
            <div>
              <div className="ops-label">Submissions Total</div>
              <div className="ops-value">{snapshot.submissions.total}</div>
            </div>
            <div>
              <div className="ops-label">Submissions Last 5m</div>
              <div className="ops-value">{snapshot.submissions.last5m}</div>
            </div>
            <div>
              <div className="ops-label">Send SENT</div>
              <div className="ops-value">{snapshot.submissions.sent}</div>
            </div>
            <div>
              <div className="ops-label">Send PENDING</div>
              <div className="ops-value">{snapshot.submissions.pending}</div>
            </div>
            <div>
              <div className="ops-label">Send FAILED</div>
              <div className="ops-value">{snapshot.submissions.failed}</div>
            </div>
          </div>
        </div>
      </section>

      <QueueTable title="Submission Events" data={snapshot.submissionEvents} />
      <QueueTable title="Message Jobs" data={snapshot.messageJobs} />
      <QueueTable title="Share Image Jobs" data={snapshot.shareImageJobs} />
    </main>
  );
}
