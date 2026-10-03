# Web Redesign — Plan 2b: Overview Data (due-out dates, occupancy & revenue summary)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Overview the data the A3.1 design assumed — expected check-out dates, a 7-day occupancy trend and (for roles allowed to see money) revenue — and render it: Departures KPI, "Leaving today" list, occupancy trend chart, revenue KPI, "Due out" column, avatars, and two layout fixes.

**Architecture:** Server adds one derived field to the existing stay list item and one read-only summary endpoint; both are pure functions over existing rows (no migration). Revenue is **field-level authorised**: the endpoint needs `stays:view`, and returns `revenue: null` unless the member also has `reports:view`. Revenue is **recognised per night stayed** (room charge `unit_price` lands on each night from the check-in date), extras on the day they were posted; voided charges excluded. Aggregation happens in Python over the property's stays — fine at pilot scale; a DB-side aggregate is the next step at volume.

**Tech Stack:** Django + DRF (`api_view`, `get_accessible_property`), zod contracts, React/TanStack Query, Recharts.

**Spec:** `docs/superpowers/specs/2026-10-03-web-visual-redesign-design.md` §7 (this plan resolves its "needs endpoint" rows except photos). Reference look: `docs/design/reference/overview.jpg`.

## Global Constraints

- No migrations. No changes to existing endpoint behaviour other than the added field.
- Unauthorised access returns **404** (project convention via `get_accessible_property`), never 403.
- Dates are property-local calendar dates via `timezone.localdate()` / `timezone.localtime()` (server `TIME_ZONE`), serialised `YYYY-MM-DD`.
- Money stays integer paise (`*_minor`).
- Web: same constraints as Plans 1–2 (tokens only, light only, no `dark:`; teal rare).
- **Never commit.** Leave changes unstaged.

## Commands

- Server tests: `cd apps/server && .venv/bin/python manage.py test api.tests.<module>` (do **not** use `uv`/`pnpm` — no network). If the test DB is unreachable from your sandbox, still write the tests, say so, and the reviewer runs them.
- Contracts tests: `cd packages/contracts && node --import tsx --test 'src/**/*.test.ts'`
- Web tests: `cd apps/web && node --import tsx --test 'src/**/*.test.ts'` · types: `cd apps/web && ./node_modules/.bin/vite build && ./node_modules/.bin/tsc --noEmit`

## Review Focus

1. **Reception (no `reports:view`) gets occupancy but `revenue: null`, and the UI hides revenue entirely** — Task 2 test `test_reception_sees_occupancy_without_revenue`; Task 4 renders revenue only when non-null.
2. **Checkout day is not an occupied night** (guest leaving on the 3rd doesn't count for the 3rd) — Task 2 test `test_occupancy_excludes_checkout_day`.
3. **Voided charges never count as revenue** — Task 2 test `test_revenue_excludes_voided_and_spreads_room_nights`.
4. **Stay with no billed nights / not checked in → `expectedCheckOutDate: null`**, and the UI shows nothing rather than a bogus date — Task 1 test + Task 4 metric test.
5. **`days` outside 1–31 → 400** — Task 2 test `test_days_parameter_is_validated`.

---

### Task 1: `expectedCheckOutDate` on stay list/detail (server + contract)

**Files:** `apps/server/api/check_in.py` (`build_hotel_stay_list_item`), new test in `apps/server/api/tests/test_hotel_operations_api.py` (append a test class), `packages/contracts/src/check-in.ts` (`hotelStayListItemSchema`), `packages/contracts/src/check-in.test.ts`.

- [ ] **Step 1: Failing server test** — append to `test_hotel_operations_api.py` (reuse that module's existing fixtures/helpers for creating an org, property, owner membership, room and a checked-in stay; read the top of the file first):

```python
class ExpectedCheckOutDateTests(<same base class and setUp helpers as the module>):
    def test_checked_in_stay_reports_check_in_date_plus_billed_nights(self):
        # check in with nights=3, then force a known check-in time
        ...
        Stay.objects.filter(id=stay.id).update(
            checked_in_at=timezone.make_aware(datetime(2026, 10, 1, 14, 20))
        )
        response = self.client.get(<stay list URL for the property>)
        item = next(i for i in response.json()["stays"] if i["id"] == str(stay.public_id))
        self.assertEqual(item["expectedCheckOutDate"], "2026-10-04")

    def test_pending_stay_has_no_expected_check_out_date(self):
        ...
        self.assertIsNone(item["expectedCheckOutDate"])
```
(Use the module's real helper names/URL names; check how stay ids are exposed — `public_id` vs `id` — in `build_guest_stay_payload`.)

- [ ] **Step 2: Run — expect FAIL** (`KeyError`/missing key).
- [ ] **Step 3: Implement** in `build_hotel_stay_list_item`, add to the returned dict:

```python
        "expectedCheckOutDate": _expected_check_out_date(stay),
```
and a module-level helper:

```python
def _expected_check_out_date(stay: Stay) -> str | None:
    """Check-in calendar day + billed nights, in property-local time.

    A date, not a datetime: the property's check-out *time* is a separate
    setting, and staff think in "leaving today", not timestamps.
    """
    if stay.checked_in_at is None or not stay.billing_nights:
        return None
    start = timezone.localtime(stay.checked_in_at).date()
    return (start + timedelta(days=stay.billing_nights)).isoformat()
```
(Import `timedelta` / `timezone` if not already imported.)

- [ ] **Step 4: Run — expect PASS**, plus run the whole `test_hotel_operations_api` and `test_check_in_api` modules (the detail payload extends the list item).
- [ ] **Step 5: Contract** — in `hotelStayListItemSchema` add `expectedCheckOutDate: z.iso.date().nullable(),`; add a contracts test that a list item with `expectedCheckOutDate: "2026-10-04"` parses and one with `"tomorrow"` fails. Run contracts tests.
- [ ] **Step 6: Stop — leave unstaged.**

### Task 2: Overview summary endpoint (server)

**Files:** create `apps/server/api/hotel_overview.py` (pure builders), add view `hotel_overview_summary` to `apps/server/api/hotel_report_views.py`, route in `apps/server/api/urls.py`, create `apps/server/api/tests/test_hotel_overview_api.py`.

**Route:** `GET api/hotel/<org>/<prop>/overview/?days=7` (name `hotel-overview-summary`).

**Response:**
```json
{
  "dateFrom": "2026-09-27",
  "dateTo": "2026-10-03",
  "activeRooms": 24,
  "occupancy": [{ "date": "2026-09-27", "occupiedRooms": 9 }, ...],
  "revenue": null | { "totalMinor": 28330000, "byDay": [{ "date": "2026-09-27", "amountMinor": 3120000 }, ...] }
}
```
`occupancy` and `revenue.byDay` have exactly `days` entries, oldest first, `dateTo` = today. `activeRooms` is today's active room count (rooms have no history; documented approximation).

- [ ] **Step 1: Failing tests** — `test_hotel_overview_api.py` (model the setUp on `test_hotel_reports_api.py`: org, property, other property, owner/manager/reception users + memberships, rooms). Tests:
  - `test_reception_sees_occupancy_without_revenue` — reception (scoped to the property) → 200, `revenue` is `None`, `occupancy` has 7 entries.
  - `test_owner_sees_revenue` — owner → `revenue` is a dict with 7 `byDay` entries.
  - `test_other_property_is_404` — owner of org A requesting org B's property → 404.
  - `test_occupancy_excludes_checkout_day` — stay checked in 2026-10-01, checked out 2026-10-03 (force timestamps via `.update`; freeze "today" with `unittest.mock.patch("django.utils.timezone.localdate", return_value=date(2026, 10, 3))` or pass `today` into the builder) → occupied on 10-01 and 10-02, **not** 10-03.
  - `test_revenue_excludes_voided_and_spreads_room_nights` — ROOM charge qty 2 @ 350000 on a stay checked in 10-01 → 350000 on 10-01 and 10-02; an EXTRA 2 @ 15000 posted 10-02 → +30000 on 10-02; a voided EXTRA → nothing.
  - `test_days_parameter_is_validated` — `?days=0` and `?days=32` → 400; missing → 7.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** `hotel_overview.py`:

```python
from datetime import date, timedelta

from django.utils import timezone

from .models import OperationalStayStatus, Room, Stay, StayCharge


def _day(value) -> date:
    return timezone.localtime(value).date()


def build_overview_summary(*, property_, today: date, days: int, include_revenue: bool) -> dict:
    window = [today - timedelta(days=offset) for offset in range(days - 1, -1, -1)]
    first, last = window[0], window[-1]

    stays = list(
        Stay.objects.filter(
            property=property_,
            operational_status__in=[
                OperationalStayStatus.CHECKED_IN,
                OperationalStayStatus.CHECKED_OUT,
            ],
            checked_in_at__isnull=False,
        )
    )
    occupancy = []
    for day in window:
        occupied = sum(
            1
            for stay in stays
            if _day(stay.checked_in_at) <= day
            and (stay.checked_out_at is None or _day(stay.checked_out_at) > day)
        )
        occupancy.append({"date": day.isoformat(), "occupiedRooms": occupied})

    payload = {
        "dateFrom": first.isoformat(),
        "dateTo": last.isoformat(),
        "activeRooms": Room.objects.filter(property=property_, is_active=True).count(),
        "occupancy": occupancy,
        "revenue": None,
    }
    if not include_revenue:
        return payload

    totals = {day: 0 for day in window}
    charges = StayCharge.objects.filter(
        stay__property=property_, voided_at__isnull=True
    ).select_related("stay")
    for charge in charges:
        if charge.kind == StayCharge.Kind.ROOM:
            start = _day(charge.stay.checked_in_at or charge.created_at)
            for night in range(charge.quantity):
                day = start + timedelta(days=night)
                if day in totals:
                    totals[day] += charge.unit_price_minor
        else:
            day = _day(charge.created_at)
            if day in totals:
                totals[day] += charge.quantity * charge.unit_price_minor
    payload["revenue"] = {
        "totalMinor": sum(totals.values()),
        "byDay": [{"date": day.isoformat(), "amountMinor": totals[day]} for day in window],
    }
    return payload
```
(Adjust field names — `is_active`, `voided_at`, `Kind` — to the real model if any differ; check `models.py`.)

View in `hotel_report_views.py`:
```python
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def hotel_overview_summary(request, organization_slug: str, property_slug: str):
    property_ = get_accessible_property(
        user=request.user.db_user,
        organization_slug=organization_slug,
        property_slug=property_slug,
        permission=Permission.STAYS_VIEW,
    )
    try:
        days = int(request.query_params.get("days", "7"))
    except ValueError:
        days = 0
    if not 1 <= days <= 31:
        return Response({"detail": "days must be between 1 and 31."}, status=400)
    membership = Membership.objects.get(
        user=request.user.db_user, organization=property_.organization
    )
    include_revenue = Permission.REPORTS_VIEW in permissions_for_membership_role(membership.role)
    return Response(
        build_overview_summary(
            property_=property_,
            today=timezone.localdate(),
            days=days,
            include_revenue=include_revenue,
        )
    )
```
(Match the module's existing error-response shape for 400s if it uses a helper; import `Membership`, `permissions_for_membership_role`.)

- [ ] **Step 4: Run — expect PASS**; also run `test_hotel_reports_api` and `test_rbac`.
- [ ] **Step 5: Stop — leave unstaged.**

### Task 3: Contract + web data layer

**Files:** `packages/contracts/src/hotel-operations.ts` (+ export in `index.ts`, + test), `apps/web/src/features/hotel-overview/api.ts`, `keys.ts`, `queries.ts` (create; copy the shape of `features/hotel-reports/{api,keys,queries}.ts`).

- [ ] **Step 1:** Add
```ts
export const hotelOverviewSummaryResponseSchema = z.object({
  dateFrom: z.iso.date(),
  dateTo: z.iso.date(),
  activeRooms: z.number().int().nonnegative(),
  occupancy: z.array(z.object({ date: z.iso.date(), occupiedRooms: z.number().int().nonnegative() })),
  revenue: z
    .object({
      totalMinor: z.number().int().nonnegative(),
      byDay: z.array(z.object({ date: z.iso.date(), amountMinor: z.number().int().nonnegative() })),
    })
    .nullable(),
});
export type HotelOverviewSummaryResponse = z.infer<typeof hotelOverviewSummaryResponseSchema>;
```
+ a contracts test (valid payload parses; `revenue: null` parses; negative amount fails).
- [ ] **Step 2:** `hotelOverviewQueries.summary(org, prop, days = 7)` → `GET /api/hotel/{org}/{prop}/overview/?days={days}`, parsed with the schema, `staleTime: 60_000`.
- [ ] **Step 3:** Contracts tests + web types pass. **Stop.**

### Task 4: Overview UI richness + layout fixes

**Files:** `apps/web/src/features/hotel-overview/metrics.ts` (+ tests), `components/hotel-overview-page.tsx`, new `components/occupancy-trend-chart.tsx`, dashboard route loader, `apps/web/src/features/hotel-stays/components/hotel-stay-detail-page.tsx` (one Fact).

- [ ] **Step 1: Metrics (test-first).** Add and test:
  - `getLeavingToday(stays, today)` → CHECKED_IN stays whose `expectedCheckOutDate <= localDayKey(today)`, sorted by date then name; includes overdue.
  - `countDeparturesToday(stays, today)` → `{ done, due }` where `done` = stays whose `checkedOutAt` is today and `due` = `getLeavingToday(stays, today).length`.
  - `getOccupancyTrend(summary)` → `[{ date, label, percent }]` with `percent = activeRooms ? round(occupied/activeRooms*100) : 0`.
  Tests: null `expectedCheckOutDate` excluded; overdue (yesterday) included; percent 0 when activeRooms 0.
- [ ] **Step 2: Loader** — also `ensureQueryData(hotelOverviewQueries.summary(org, prop))`.
- [ ] **Step 3: KPI strip** (6 when revenue allowed, else 5): Occupancy (value %, detail "11 of 24 rooms", plus a delta pill vs yesterday from the trend: `▲ 4 pts` success / `▼ 5 pts` danger / hidden when 0) · In house · Arrivals today · Departures today (value = done + due, detail "`{done}` done · `{due}` due") · Waiting for a room · Revenue, 7 days (only if `summary.revenue`; full value with the app's existing money formatter).
  **Fix truncation:** in `Kpi`, the label must not truncate — change its label span from `truncate` to `leading-tight` (allow 2 lines); keep `min-w-0`.
- [ ] **Step 4: Needs action → three columns** like the reference: Waiting for a room | Leaving today | To clean (`md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)]`, `divide-x divide-border-soft`). **Fix name truncation:** each waiting row is two lines — name (`text-sm font-medium`) over meta (`text-xs text-subtle-foreground`: "+N · 10:42"); the Assign button sits right, vertically centred; avatar initials `size-8 rounded-full bg-muted text-xs`. Leaving today rows: avatar · name over "Room 112 · Standard" · `StatusPill tone="warning"` "Due today" (or `tone="danger"` "Overdue" when the date is before today). Empty: "No departures due."
- [ ] **Step 5: Charts row** — two panels side by side (`lg:grid-cols-2`): existing "Arrivals and departures" and new "Occupancy" (`occupancy-trend-chart.tsx`: Recharts `AreaChart`, `ChartContainer` config `{ occupancy: { label: "Occupancy", color: "var(--chart-1)" } }`, area fill `var(--color-occupancy)` at `fillOpacity={0.12}`, stroke 2, Y axis 0–100 with `%` tick formatter, `isAnimationActive={false}`).
- [ ] **Step 6: In-house table** — add initials avatar before the name and a "Due out" column (`expectedCheckOutDate` formatted "Sun 4 Oct"; "Today" when today; `—` when null); rows due today/overdue get `StatusPill tone="warning"` "Leaving today" instead of "Checked in".
- [ ] **Step 7: Stay detail** — add `<Fact label="Due out" …>` when `expectedCheckOutDate` exists and the stay is not checked out.
- [ ] **Step 8: Verify** — web tests (44 + new) pass; types 0. **Stop — leave unstaged.**
