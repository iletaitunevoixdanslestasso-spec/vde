import { Bell } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import useNotificationsNonLues from "../../hooks/useNotificationsNonLues";
import "./NotificationInboxLink.css";

export default function NotificationInboxLink({
  token: tokenProp,
  className = "",
  showLabel = false,
  labelClassName = ""
}) {
  const { token: tokenRoute } = useParams();
  const token = tokenRoute || tokenProp;
  const location = useLocation();
  const nombre = useNotificationsNonLues(token);

  if (!token) return null;

  const destination = `/chanteur/${encodeURIComponent(token)}/notifications`;
  const actif = location.pathname === destination;
  const libelle = nombre > 0
    ? `Mes notifications, ${nombre} non ${nombre === 1 ? "lue" : "lues"}`
    : "Mes notifications";

  return (
    <Link
      to={destination}
      className={`notification-inbox-link ${className} ${actif ? "active" : ""}`.trim()}
      aria-label={libelle}
      aria-current={actif ? "page" : undefined}
      title={libelle}
    >
      <Bell size={22} aria-hidden="true" />
      {showLabel && <span className={labelClassName}>Mes notifications</span>}
      {nombre > 0 && (
        <span className="notification-inbox-link-badge" aria-hidden="true">
          {nombre > 99 ? "99+" : nombre}
        </span>
      )}
    </Link>
  );
}
