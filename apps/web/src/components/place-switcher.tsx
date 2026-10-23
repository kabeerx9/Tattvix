// The place switcher (ADR 0003, "Place switcher"): one searchable list of
// everywhere the user can work or travel from. The model and its
// permission rules live in lib/workspace-switcher.ts; this file renders it.
import { useQueries } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@tattvix/ui/lib/utils";
import { Check, ChevronDown, Clock, Plus, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { BrandMark } from "@/components/brand";
import { propertyPhotoQueries } from "@/features/property-photos/queries";
import { getInitials } from "@/lib/initials";
import {
  buildSwitcherSections,
  needsPlaceSearch,
  type Place,
} from "@/lib/workspace-switcher";

/** Who is signed in, for the Personal place's picture. */
export type PlacePerson = { name: string; imageUrl?: string };

/* ------------------------------------------------------------------ */
/* Pictures                                                            */
/* ------------------------------------------------------------------ */

/**
 * A place's picture: the property cover (or its initials while there is
 * none), the person's photo or initials, or a neutral shield for Platform.
 */
export function PlaceThumb({
  place,
  person,
  coverUrl,
  className,
}: {
  place: Place | null;
  person: PlacePerson;
  coverUrl?: string;
  className?: string;
}) {
  const base = "grid size-8 shrink-0 place-items-center overflow-hidden";
  if (!place || place.kind === "platform") {
    // Bare and neutral: the Tattwix mark for "no single place", a shield for platform admin.
    return (
      <span aria-hidden className={cn(base, "text-foreground", className)}>
        {place ? <ShieldCheck className="size-[62%]" strokeWidth={1.75} /> : <BrandMark className="size-[62%]" />}
      </span>
    );
  }
  if (place.kind === "register") {
    // An outline, not a filled tile: this is an invitation, not a place yet.
    const Icon = place.pending ? Clock : Plus;
    return (
      <span aria-hidden className={cn(base, "rounded-lg border border-dashed border-input text-foreground", className)}>
        <Icon className="size-[48%]" strokeWidth={1.75} />
      </span>
    );
  }
  if (place.kind === "personal") {
    return person.imageUrl ? (
      <img src={person.imageUrl} alt="" className={cn(base, "rounded-full object-cover", className)} />
    ) : (
      <span aria-hidden className={cn(base, "rounded-full bg-foreground text-xs font-semibold text-background", className)}>
        {getInitials(person.name)}
      </span>
    );
  }
  return coverUrl ? (
    <img src={coverUrl} alt="" className={cn(base, "rounded-lg object-cover", className)} />
  ) : (
    <span aria-hidden className={cn(base, "rounded-lg bg-muted text-[11px] font-semibold text-muted-foreground", className)}>
      {getInitials(place.label)}
    </span>
  );
}

/** Name and detail shown for the current place (pill, phone top bar). */
export function placeIdentity(place: Place | null, person: PlacePerson) {
  if (!place) return { title: "Hotels", detail: "Choose a property" };
  if (place.kind === "personal") return { title: person.name, detail: "Personal" };
  if (place.kind === "platform" || place.kind === "register") return { title: place.label, detail: place.detail };
  return { title: place.label, detail: place.kind === "property" ? place.detail : place.organization.name };
}

/* ------------------------------------------------------------------ */
/* Triggers                                                            */
/* ------------------------------------------------------------------ */

/** The person's photo or initials: the account half of the combined control. */
export function PersonAvatar({ person, className }: { person: PlacePerson; className?: string }) {
  return person.imageUrl ? (
    <img src={person.imageUrl} alt="" className={cn("size-8 shrink-0 rounded-full object-cover", className)} />
  ) : (
    <span
      aria-hidden
      className={cn("grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-xs font-semibold text-background", className)}
    >
      {getInitials(person.name)}
    </span>
  );
}

/** Short name of the current place for the pill and the phone tab. */
export function shortPlaceLabel(place: Place | null) {
  if (!place) return "Hotels";
  if (place.kind === "personal") return "Personal";
  if (place.kind === "platform") return "Admin";
  return place.label;
}

/**
 * Desktop: one control, top-right, for where you are and who you are.
 * The current place (picture and short name) then the person's avatar;
 * Personal shows the avatar once. Opens the account and switch panel (also ⌘K).
 */
export function AccountPill({
  place,
  person,
  coverUrl,
  open,
  onToggle,
}: {
  place: Place | null;
  person: PlacePerson;
  coverUrl?: string;
  open: boolean;
  onToggle: () => void;
}) {
  const identity = placeIdentity(place, person);
  const personal = place?.kind === "personal";
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-keyshortcuts="Meta+K Control+K"
      aria-label={`${identity.title}, signed in as ${person.name}. Switch place or manage account`}
      onClick={onToggle}
      className={cn(
        "press flex h-12 max-w-[280px] min-w-0 items-center gap-2.5 rounded-full border border-border py-1 pr-1.5 pl-1.5 outline-none hover:shadow-raised focus-visible:ring-2 focus-visible:ring-ring",
        personal && "pl-4",
        open && "shadow-raised",
      )}
    >
      {personal ? null : <PlaceThumb place={place} person={person} coverUrl={coverUrl} className="size-9 rounded-full" />}
      <span className="min-w-0 truncate text-sm font-semibold">{shortPlaceLabel(place)}</span>
      <ChevronDown className={cn("-ml-1 size-4 shrink-0 text-muted-foreground transition-transform duration-(--duration-press)", open && "rotate-180")} aria-hidden />
      <PersonAvatar person={person} className="size-9" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* The list                                                            */
/* ------------------------------------------------------------------ */

/**
 * Covers for the hotel rows, fetched only while the list is open. Signed
 * URLs expire, so these follow the photo query's staleness but do not poll.
 */
function usePlaceCovers(places: Place[]) {
  const properties = places.flatMap((place) => (place.kind === "property" ? [place] : []));
  const results = useQueries({
    queries: properties.map((place) => ({
      ...propertyPhotoQueries.list(place.organization.slug, place.property.slug),
      refetchInterval: false as const,
      retry: false,
    })),
  });
  const covers = new Map<string, string>();
  properties.forEach((place, index) => {
    const url = results[index]?.data?.cover?.url;
    if (url) covers.set(place.key, url);
  });
  return covers;
}

/**
 * Personal and Platform, then Recent, then hotels by organization. Search
 * appears at 7+ hotels. ↑↓ move, ↵ opens. Rows are real links, so a place
 * can also be opened in a new tab.
 */
export function PlaceList({
  places,
  currentKey,
  recentKeys,
  person,
  autoFocus = false,
  onPick,
}: {
  places: Place[];
  currentKey: string | null;
  recentKeys: readonly string[];
  person: PlacePerson;
  autoFocus?: boolean;
  onPick: (place: Place) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const searchable = needsPlaceSearch(places);
  const sections = useMemo(
    () => buildSwitcherSections(places, { query, recentKeys, currentKey }),
    [places, query, recentKeys, currentKey],
  );
  const flat = sections.flatMap((section) => section.places);
  const [highlight, setHighlight] = useState(() => Math.max(0, flat.findIndex((place) => place.key === currentKey)));
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const covers = usePlaceCovers(places);
  const listId = "place-switcher-list";

  useEffect(() => {
    setHighlight((value) => Math.min(value, Math.max(0, flat.length - 1)));
  }, [flat.length]);

  useEffect(() => {
    if (!autoFocus) return;
    // Fine pointers type straight away; on touch the keyboard would hide the list.
    if (searchable && window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus({ preventScroll: true });
    else listRef.current?.focus({ preventScroll: true });
  }, [autoFocus, searchable]);

  // Follow the keyboard highlight, but open at the top so the account header shows first.
  const opened = useRef(false);
  useEffect(() => {
    if (!opened.current) {
      opened.current = true;
      return;
    }
    listRef.current?.querySelector("[data-highlighted]")?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  function open(place: Place) {
    onPick(place);
    void navigate(place.home);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!flat.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlight((value) => (value + step + flat.length) % flat.length);
    } else if (event.key === "Enter" && flat[highlight]) {
      event.preventDefault();
      open(flat[highlight]!);
    }
  }

  let index = -1;
  const highlighted = flat[highlight];
  return (
    <div className="grid grid-cols-1 gap-2" onKeyDown={onKeyDown}>
      {searchable ? (
        <label className="flex h-11 items-center gap-2 rounded-full border border-input px-4 focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlight(0);
            }}
            placeholder="Search hotels or organizations"
            aria-label="Search places"
            aria-controls={listId}
            aria-activedescendant={highlighted ? `place-${highlighted.key}` : undefined}
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-subtle-foreground md:text-sm"
          />
        </label>
      ) : null}
      <div
        ref={listRef}
        id={listId}
        tabIndex={-1}
        role="listbox"
        aria-label="Switch to"
        aria-activedescendant={highlighted ? `place-${highlighted.key}` : undefined}
        className="grid grid-cols-1 gap-3 outline-none"
      >
        {sections.map((section) => (
          <div key={section.key} role="group" aria-label={section.title ?? "You"}>
            {section.title ? <p className="px-2 pt-1 pb-1 text-xs text-subtle-foreground">{section.title}</p> : null}
            <ul className="grid grid-cols-1">
              {section.places.map((place) => {
                index += 1;
                const at = index;
                const active = place.key === currentKey;
                const isHighlighted = at === highlight;
                return (
                  <li
                    key={`${section.key}-${place.key}`}
                    id={section.key === "recent" ? undefined : `place-${place.key}`}
                    role="option"
                    aria-selected={active}
                    data-highlighted={isHighlighted ? "" : undefined}
                  >
                    <Link
                      {...place.home}
                      tabIndex={-1}
                      onClick={() => onPick(place)}
                      onPointerMove={() => setHighlight(at)}
                      className={cn(
                        "flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2 text-left outline-none md:min-h-12",
                        isHighlighted && "bg-muted",
                      )}
                    >
                      <PlaceThumb place={place} person={person} coverUrl={covers.get(place.key)} className="size-10 md:size-9" />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-[15px] md:text-sm", active ? "font-semibold" : "font-medium")}>
                          {place.kind === "personal" ? `${place.label} · ${person.name}` : place.label}
                        </span>
                        <span className="block truncate text-[13px] text-muted-foreground md:text-xs">{place.detail}</span>
                      </span>
                      {active ? <Check className="size-4 shrink-0 text-foreground" aria-label="Current" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {flat.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">No place matches “{query}”.</p>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop popover and the arrival cue                                 */
/* ------------------------------------------------------------------ */

/** Anchored under the top-right pill, growing from its corner; closes on outside press or Escape (focus returns to the pill). */
export function PlacePopover({
  open,
  onClose,
  trigger,
  children,
}: {
  open: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onClose();
      ref.current?.querySelector<HTMLElement>("[aria-haspopup]")?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return (
    <div ref={ref} className="relative min-w-0">
      {trigger}
      {open ? (
        <div
          role="dialog"
          aria-label="Account and places"
          className="place-popover absolute top-[calc(100%+8px)] right-0 z-40 max-h-[min(72vh,620px)] w-[380px] overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-border bg-popover p-3 shadow-raised"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** "Lakeview Residency · Today": confirms where a switch landed, then leaves. */
export function PlaceCue({ cue }: { cue: { id: number; label: string } | null }) {
  if (!cue) return null;
  return (
    <div key={cue.id} role="status" className="place-cue pointer-events-none">
      <span className="flex h-9 max-w-[calc(100vw-32px)] items-center truncate rounded-full border border-border bg-background px-4 text-sm font-medium whitespace-nowrap shadow-raised">
        {cue.label}
      </span>
    </div>
  );
}
