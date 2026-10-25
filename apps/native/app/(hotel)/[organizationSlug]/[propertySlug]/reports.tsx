// Reports for the hotel owner and manager: a preset range, occupancy and stay
// status counts (paid plan), who is in house now, and the register for the
// range with a CSV share. The register and in-house list stay readable after
// the trial lapses; only the analytics show the paid-plan placeholder.
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { HotelReportRegisterEntry } from "@tattvix/contracts";
import { ClipboardList, Lock, UserRound } from "lucide-react-native";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import {
  EmptyState,
  InitialsAvatar,
  Kpi,
  KpiRow,
  LargeTitle,
  Panel,
  PillTabs,
  ListRow,
  Screen,
  SecondaryHeader,
  SectionTitle,
  StatusPill,
  TextLink,
  toast,
  space,
} from "@/src/design-system";
import { api, queries } from "@/src/lib/api";
import { getDeskScope } from "@/src/lib/desk-scope";
import { errorMessage, formatDateTime, formatTime, initialsOf } from "@/src/lib/format";
import { useHotelPlace } from "@/src/lib/hotel-place";
import { reportPresets, reportRangeFor, type ReportPreset } from "@/src/lib/report-range";
import { shareCsv } from "@/src/lib/share-csv";

// 402 means the plan does not include analytics. Retrying will not change that.
function isPaidPlanError(error: unknown) {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "ApiError" && (error as { status?: unknown }).status === 402;
}

const SHARE_FAILED = "The register could not be shared.";

const noRetryOnPaidPlan = (count: number, error: unknown) => !isPaidPlanError(error) && count < 3;

function stayStatusPill(status: HotelReportRegisterEntry["operationalStatus"]) {
  if (status === "CHECKED_IN") return <StatusPill tone="success">Checked in</StatusPill>;
  if (status === "CHECKED_OUT") return <StatusPill tone="neutral">Checked out</StatusPill>;
  return <StatusPill tone="warning">Pending</StatusPill>;
}

export default function ReportsScreen() {
  const place = useHotelPlace();
  const scope = getDeskScope(place);
  const router = useRouter();
  const { organizationSlug, propertySlug } = scope;
  const [preset, setPreset] = useState<ReportPreset>("today");
  const [sharing, setSharing] = useState(false);
  // Recomputed per render: the range follows the day the screen is looking at.
  const range = useMemo(() => reportRangeFor(preset, new Date()), [preset]);

  // keepPreviousData: switching presets keeps the current lists on screen instead of blanking the page.
  const registerQuery = useQuery({ ...queries.hotelReports.register(organizationSlug, propertySlug, range), placeholderData: keepPreviousData });
  const inHouseQuery = useQuery(queries.hotelReports.inHouse(organizationSlug, propertySlug));
  const occupancyQuery = useQuery({ ...queries.hotelReports.occupancy(organizationSlug, propertySlug), retry: noRetryOnPaidPlan });
  const statusQuery = useQuery({
    ...queries.hotelReports.statusCounts(organizationSlug, propertySlug, range),
    retry: noRetryOnPaidPlan,
    placeholderData: keepPreviousData,
  });

  const locked = isPaidPlanError(occupancyQuery.error) || isPaidPlanError(statusQuery.error);
  const refreshing = [registerQuery, inHouseQuery, occupancyQuery, statusQuery].some((query) => query.isRefetching);

  function refreshAll() {
    void Promise.all([registerQuery.refetch(), inHouseQuery.refetch(), occupancyQuery.refetch(), statusQuery.refetch()]);
  }

  async function shareRegister() {
    if (sharing) return;
    setSharing(true);
    try {
      const { blob, filename } = await api.hotelReports.downloadRegisterCsv(organizationSlug, propertySlug, range);
      await shareCsv(blob, filename ?? `register-${range.dateFrom}_${range.dateTo}.csv`);
    } catch (error) {
      toast(errorMessage(error, SHARE_FAILED) ?? SHARE_FAILED);
    } finally {
      setSharing(false);
    }
  }

  if (!registerQuery.data) {
    if (registerQuery.isError) return <RetryScreen onRetry={() => void registerQuery.refetch()} retrying={registerQuery.isFetching} />;
    return <PendingScreen />;
  }

  const register = registerQuery.data.entries;
  const inHouse = inHouseQuery.data?.entries ?? [];
  const occupancy = occupancyQuery.data;
  const counts = statusQuery.data?.counts;
  const valueOrDash = (value: number | undefined) => (value === undefined ? "—" : value);

  return (
    <Screen refreshing={refreshing} onRefresh={refreshAll}>
      <SecondaryHeader title="Reports" onBack={() => router.back()} />
      <LargeTitle meta={place.propertyName}>Reports</LargeTitle>
      <PillTabs items={reportPresets.map((item) => ({ key: item.key, label: item.label }))} value={preset} onChange={(key) => setPreset(key as ReportPreset)} />

      {locked ? (
        <View style={styles.section}>
          <EmptyState icon={Lock} text="Analytics are part of the paid plan. The register and in-house list below are always yours." />
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <SectionTitle>Occupancy</SectionTitle>
            <KpiRow>
              <Kpi label="Occupied" value={occupancy ? `${occupancy.occupiedRooms} / ${occupancy.activeRooms}` : "—"} />
              <Kpi label="Ready" value={valueOrDash(occupancy?.statusCounts.VACANT)} />
            </KpiRow>
            <KpiRow>
              <Kpi label="Cleaning" value={valueOrDash(occupancy?.statusCounts.CLEANING)} />
              <Kpi label="Maintenance" value={valueOrDash(occupancy?.statusCounts.MAINTENANCE)} />
            </KpiRow>
          </View>
          <View style={styles.section}>
            <SectionTitle>Stay status</SectionTitle>
            <KpiRow>
              <Kpi label="Pending" value={valueOrDash(counts?.pendingCheckIn)} />
              <Kpi label="Checked in" value={valueOrDash(counts?.checkedIn)} />
              <Kpi label="Checked out" value={valueOrDash(counts?.checkedOut)} />
            </KpiRow>
          </View>
        </>
      )}

      <View style={styles.section}>
        <SectionTitle meta={`${inHouse.length} ${inHouse.length === 1 ? "guest" : "guests"} now`}>In house</SectionTitle>
        {inHouse.length ? (
          <Panel>
            {inHouse.map((entry) => (
              <ListRow
                key={entry.stayId}
                title={entry.guestName}
                detail={`Room ${entry.roomNumber ?? "—"} · in ${formatTime(entry.checkedInAt)}`}
                leading={<InitialsAvatar initials={initialsOf(entry.guestName)} size={40} />}
              />
            ))}
          </Panel>
        ) : (
          <EmptyState
            icon={UserRound}
            text={inHouseQuery.isError ? "The in-house list could not be loaded." : inHouseQuery.isPending ? "Loading who is in house…" : "No guests in house right now."}
            action={inHouseQuery.isError ? { label: "Try again", onPress: () => void inHouseQuery.refetch() } : undefined}
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionTitle action={<TextLink label={sharing ? "Preparing…" : "Share CSV"} onPress={() => void shareRegister()} />}>Register</SectionTitle>
        {register.length ? (
          <Panel>
            {register.map((entry) => {
              const detail = [
                `Room ${entry.roomNumber ?? "—"}`,
                entry.companionCount > 0 ? `+${entry.companionCount}` : null,
                entry.checkedInAt ? `In ${formatDateTime(entry.checkedInAt)}` : null,
                entry.checkedOutAt ? `Out ${formatDateTime(entry.checkedOutAt)}` : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <ListRow
                  key={entry.stayId}
                  title={entry.guestName}
                  detail={detail}
                  trailing={stayStatusPill(entry.operationalStatus)}
                />
              );
            })}
          </Panel>
        ) : (
          <EmptyState icon={ClipboardList} text="No stays in this range." />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xl, gap: space.md },
});
