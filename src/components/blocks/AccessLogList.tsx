import { useData } from "../../context/DataContext";
import type { AccessLog } from "../../types";

function toneFor(type: AccessLog["type"]) {
  if (type === "permanent") return { ae: "ae-green", ind: "ind-green", zone: "zone-green" };
  if (type === "visiteur") return { ae: "ae-orange", ind: "ind-orange", zone: "zone-orange" };
  return { ae: "ae-red", ind: "ind-red", zone: "zone-red" };
}

export default function AccessLogList({ limit = 6 }: { limit?: number }) {
  const { accessLogs } = useData();
  return (
    <div className="access-log">
      {accessLogs.slice(0, limit).map((e) => {
        const t = toneFor(e.type);
        return (
          <div key={e.id} className={`access-entry ${t.ae}`}>
            <span className={`ae-indicator ${t.ind}`} />
            <div className="ae-info">
              <div className="ae-name">{e.name}</div>
              <div className="ae-detail">Badge {e.badge} · {e.detail}</div>
            </div>
            <span className={`ae-zone ${t.zone}`}>{e.zone}</span>
            <span className="ae-time">{e.time}</span>
          </div>
        );
      })}
    </div>
  );
}
