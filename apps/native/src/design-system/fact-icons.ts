import type { FactIcon } from "@tattvix/api";
import { BedDouble, Cake, CalendarClock, Flag, HeartHandshake, LogIn, LogOut, MapPin, Moon, Phone, UserRound, UsersRound, type LucideIcon } from "lucide-react-native";

/** The shared fact icon names, as native Lucide components (web maps the same names). */
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
