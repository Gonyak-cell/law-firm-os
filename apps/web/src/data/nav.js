import {
  BarChart3,
  FlaskConical,
  Home,
  LayoutDashboard,
  LayoutGrid,
  LogIn,
  Moon,
  Settings,
  Sparkles,
  Users
} from "lucide-react";

export const navItems = [
  { id: "auth", icon: LogIn },
  { id: "home", icon: Home },
  { id: "content", icon: LayoutGrid },
  { id: "profiles", icon: Users },
  { id: "analytics", icon: BarChart3 },
  { id: "dashboards", icon: LayoutDashboard },
  { id: "ask", icon: Sparkles },
  { id: "experiments", icon: FlaskConical },
  { id: "admin", icon: Settings },
  { id: "dark", icon: Moon }
];
