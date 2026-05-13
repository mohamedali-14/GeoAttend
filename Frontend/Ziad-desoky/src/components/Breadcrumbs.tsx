/**
 * Breadcrumbs — navigation trail
 * Usage: <Breadcrumbs items={[{ label: "Admin" }, { label: "Users", href: "/admin/users" }, { label: "Edit" }]} />
 */
import { useNavigate } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: Props) {
  const navigate = useNavigate();

  return (
    <nav className="flex items-center gap-1 text-sm mb-6" aria-label="Breadcrumb">
      <button onClick={() => navigate("/admin")}
        className="text-slate-500 hover:text-white transition-colors flex items-center gap-1">
        <Home className="w-3.5 h-3.5" />
      </button>

      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
          {item.href && i < items.length - 1 ? (
            <button onClick={() => navigate(item.href!)}
              className="text-slate-400 hover:text-white transition-colors">
              {item.label}
            </button>
          ) : (
            <span className="text-white font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
