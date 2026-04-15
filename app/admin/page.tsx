import Link from "next/link";
import type { Route } from "next";
import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE_NAME, isAdminPasswordConfigured, isAuthorizedAdminCookieValue } from "@/lib/admin-auth";
import { getAdminSubmissions } from "@/lib/admin-submissions";
import { getDailySubmissionCounts, getOpsSnapshot } from "@/lib/ops";
import { getPublicStorageUrl } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALL_PAGE_SIZE = 100;

type AdminTab = "recent" | "all" | "export";

type PageProps = {
  searchParams: Promise<{
    tab?: string | string[];
    page?: string | string[];
    from?: string | string[];
    to?: string | string[];
    auth?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeTab(value: string | undefined): AdminTab {
  if (value === "all" || value === "export") {
    return value;
  }
  return "recent";
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.floor(parsed));
}

function adminTabHref(tab: AdminTab, page?: number): Route {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (tab === "all" && page && page > 1) {
    params.set("page", String(page));
  }
  return `/admin?${params.toString()}` as Route;
}

function formatDate(input: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(input));
}

function SubmissionTable({ rows }: { rows: Awaited<ReturnType<typeof getAdminSubmissions>> }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>제출시각(KST)</th>
            <th>ID</th>
            <th>이름</th>
            <th>연락처</th>
            <th>유입</th>
            <th>걱정되는 순간</th>
            <th>지키고 싶은 대상</th>
            <th>필요한 것</th>
            <th>관심분야</th>
            <th>응원의 한마디</th>
            <th>생성 문구</th>
            <th>문자상태</th>
            <th>이미지</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="mono">{formatDate(row.submitted_at)}</td>
              <td className="mono">{row.id}</td>
              <td>{row.name}</td>
              <td className="mono">{row.phone}</td>
              <td>{row.source || "-"}</td>
              <td>{row.concern || "-"}</td>
              <td>{row.protect_target || "-"}</td>
              <td>{row.needed_thing || "-"}</td>
              <td>{row.interests.join(", ") || "-"}</td>
              <td className="admin-cell-long">{row.support_message || "-"}</td>
              <td className="admin-cell-long">{row.generated_message || "-"}</td>
              <td>
                <strong>{row.send_status}</strong>
                {row.send_error ? <div className="admin-error">{row.send_error}</div> : null}
              </td>
              <td>
                {row.share_image_key ? (
                  <a href={getPublicStorageUrl(row.share_image_key)} target="_blank" rel="noreferrer">
                    보기
                  </a>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const isAuthed = isAuthorizedAdminCookieValue(cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value);
  const authFailed = firstParam(params.auth) === "failed";
  const authMisconfigured = firstParam(params.auth) === "misconfigured" || !isAdminPasswordConfigured();

  if (!isAuthed) {
    return (
      <main className="container">
        <section className="card">
          <div className="hero" />
          <div className="content">
            <h1 className="title">관리자 대시보드</h1>
            <p className="desc">관리자 비밀번호를 입력하세요.</p>
            {authMisconfigured ? <p className="error">`ADMIN_PASSWORD` 환경변수가 필요합니다.</p> : null}
            {authFailed ? <p className="error">비밀번호가 올바르지 않습니다.</p> : null}
            <form className="admin-auth-form" method="POST" action="/api/admin/login">
              <input type="hidden" name="next" value="/admin" />
              <label className="admin-export-field">
                비밀번호
                <input type="password" name="password" inputMode="numeric" autoComplete="current-password" required />
              </label>
              <button type="submit" className="ghost-btn">
                로그인
              </button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  const tab = normalizeTab(firstParam(params.tab));
  const page = parsePositiveInt(firstParam(params.page), 1);
  const exportFrom = firstParam(params.from) ?? "";
  const exportTo = firstParam(params.to) ?? "";

  const [snapshot, recentRows, allRowsWithNext, dailyCounts] = await Promise.all([
    getOpsSnapshot(),
    tab === "recent" ? getAdminSubmissions(100) : Promise.resolve([]),
    tab === "all" ? getAdminSubmissions({ limit: ALL_PAGE_SIZE + 1, offset: (page - 1) * ALL_PAGE_SIZE }) : Promise.resolve([]),
    getDailySubmissionCounts(30)
  ]);

  const allRows = allRowsWithNext.slice(0, ALL_PAGE_SIZE);
  const hasNextPage = allRowsWithNext.length > ALL_PAGE_SIZE;
  const hasPrevPage = page > 1;

  return (
    <main className="container">
      <section className="card">
        <div className="hero" />
        <div className="content">
          <h1 className="title">Admin Dashboard</h1>
          <p className="desc">실시간 운영 상태, 최근 100건, 전체 이력(페이지네이션), 기간별 CSV 내보내기를 확인합니다.</p>
          <form method="POST" action="/api/admin/logout" style={{ marginBottom: 12 }}>
            <button type="submit" className="ghost-btn">
              로그아웃
            </button>
          </form>
          <div className="ops-grid">
            <div>
              <div className="ops-label">전체 제출</div>
              <div className="ops-value">{snapshot.submissions.total}</div>
            </div>
            <div>
              <div className="ops-label">최근 5분</div>
              <div className="ops-value">{snapshot.submissions.last5m}</div>
            </div>
            <div>
              <div className="ops-label">발송 완료</div>
              <div className="ops-value">{snapshot.submissions.sent}</div>
            </div>
            <div>
              <div className="ops-label">발송 대기</div>
              <div className="ops-value">{snapshot.submissions.pending}</div>
            </div>
            <div>
              <div className="ops-label">발송 실패</div>
              <div className="ops-value">{snapshot.submissions.failed}</div>
            </div>
          </div>

          {dailyCounts.length > 0 ? (
            <>
              <h2 style={{ marginTop: 24, marginBottom: 8 }}>일별 제출 현황</h2>
              <div className="admin-table-wrap">
                <table className="admin-table admin-table-daily">
                  <colgroup>
                    <col style={{ width: "96px" }} />
                    <col style={{ width: "88px" }} />
                    <col style={{ width: "88px" }} />
                    <col style={{ width: "88px" }} />
                    <col style={{ width: "88px" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th style={{ textAlign: "right" }}>전체</th>
                      <th style={{ textAlign: "right" }}>완료</th>
                      <th style={{ textAlign: "right" }}>대기</th>
                      <th style={{ textAlign: "right" }}>실패</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyCounts.map((row) => (
                      <tr key={row.date}>
                        <td className="mono admin-daily-date">{row.date}</td>
                        <td className="mono" style={{ textAlign: "right" }}>{row.total}</td>
                        <td className="mono" style={{ textAlign: "right" }}>{row.sent}</td>
                        <td className="mono" style={{ textAlign: "right" }}>{row.pending}</td>
                        <td className="mono" style={{ textAlign: "right" }}>{row.failed > 0 ? <strong style={{ color: "#c0392b" }}>{row.failed}</strong> : row.failed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="card section">
        <div className="hero" />
        <div className="content">
          <nav className="admin-tabs" aria-label="관리 탭">
            <a className={tab === "recent" ? "admin-tab active" : "admin-tab"} href={adminTabHref("recent")}>
              최근 100건
            </a>
            <a className={tab === "all" ? "admin-tab active" : "admin-tab"} href={adminTabHref("all")}>
              전체 이력
            </a>
            <a className={tab === "export" ? "admin-tab active" : "admin-tab"} href={adminTabHref("export")}>
              CSV 내보내기
            </a>
          </nav>

          {tab === "recent" ? (
            <>
              <h2 style={{ marginTop: 0 }}>최근 제출 100건</h2>
              <SubmissionTable rows={recentRows} />
            </>
          ) : null}

          {tab === "all" ? (
            <>
              <h2 style={{ marginTop: 0 }}>전체 이력 (페이지네이션)</h2>
              <p className="desc" style={{ marginTop: 0 }}>
                페이지당 {ALL_PAGE_SIZE}건, 현재 {page}페이지
              </p>
              <SubmissionTable rows={allRows} />
              <div className="admin-pagination">
                {hasPrevPage ? (
                  <a className="ghost-btn" href={adminTabHref("all", page - 1)}>
                    이전 페이지
                  </a>
                ) : (
                  <span className="admin-pagination-placeholder" />
                )}
                <span className="mono">{page}페이지</span>
                {hasNextPage ? (
                  <a className="ghost-btn" href={adminTabHref("all", page + 1)}>
                    다음 페이지
                  </a>
                ) : (
                  <span className="admin-pagination-placeholder" />
                )}
              </div>
            </>
          ) : null}

          {tab === "export" ? (
            <>
              <h2 style={{ marginTop: 0 }}>기간 선택 CSV 내보내기</h2>
              <p className="desc" style={{ marginTop: 0 }}>
                아래 기간을 선택해 CSV를 다운로드하세요. 날짜/시간은 KST 기준으로 입력하세요.
              </p>
              <form className="admin-export-form" method="GET" action="/api/admin/export.csv">
                <label className="admin-export-field">
                  시작 시각
                  <input type="datetime-local" name="from" defaultValue={exportFrom} />
                </label>
                <label className="admin-export-field">
                  종료 시각
                  <input type="datetime-local" name="to" defaultValue={exportTo} />
                </label>
                <label className="admin-export-field">
                  최대 건수
                  <input type="number" name="limit" min={1} max={10000} defaultValue={10000} />
                </label>
                <button type="submit" className="ghost-btn">
                  CSV 다운로드
                </button>
              </form>
              <p className="desc">
                기간 미입력 시 전체 범위에서 조회합니다. 빠른 다운로드:{" "}
                <Link href="/api/admin/export.csv" prefetch={false}>
                  전체 CSV
                </Link>
              </p>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
