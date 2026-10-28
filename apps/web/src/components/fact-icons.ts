import type { FactIcon, FactTone } from "@tattvix/api";
import { BedDouble, Cake, CalendarClock, Flag, HeartHandshake, LogIn, LogOut, MapPin, Moon, Phone, UserRound, UsersRound, type LucideIcon } from "lucide-react";

/** The shared fact icon names, as web Lucide components (native maps the same names). */
export const factIcons: Record<FactIcon, LucideIcon> = {
  name: UserRound,
  phone: Phone,
  birthday: Cake,
  nationality: Flag,
  address: MapPin,
  contact: HeartHandshake,
  relationship: UsersRound,
  room: BedDouble,
  requested: CalendarClock,
  checkedIn: LogIn,
  checkedOut: LogOut,
  nights: Moon,
};

/** Solid fills behind white fact icons; mirrors native's `toneFills` (factTones in @tattvix/api picks one). */
export const toneFills: Record<FactTone, string> = {
  teal: "#0f5e5c",
  blue: "#2f5bb7",
  rose: "#c2255c",
  amber: "#b45309",
  green: "#12804a",
  plum: "#8c1340",
  slate: "#5b6472",
};
