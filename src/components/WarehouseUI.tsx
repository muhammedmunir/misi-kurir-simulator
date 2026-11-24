import { useSceneStore } from "@/store/game";
import type { Packet, PacketStatus } from "@/types/game";
import { Scene } from "@/types/scene";
import { useMemo, useState } from "react";

function generateTestPackets(): Packet[] {
  const areas: string[] = ["bandar", "perumahan", "pasar", "industri", "kampung"];
  const priorities: ("normal" | "express" | "urgent")[] = ["normal", "normal", "express", "urgent"];
  const names = ["Ahmad", "Siti", "Raj", "Priya", "Muhammad", "Aisyah", "Fairuz", "Lina", "Hafiz", "Nadia"];

  return Array.from({ length: 12 }, (_, i) => ({
    id: `packet-${i}`,
    trackingNumber: `MSK-${Date.now().toString(36).toUpperCase()}-${String(i).padStart(4, "0")}`,
    senderName: names[Math.floor(Math.random() * names.length)],
    receiverName: names[Math.floor(Math.random() * names.length)],
    senderAddress: `No. ${Math.floor(Math.random() * 100)}, Jalan ${["Merdeka", "Bukit", "Pantai", "Taman", "Kampus"][Math.floor(Math.random() * 5)]}`,
    receiverAddress: `Lot ${Math.floor(Math.random() * 500)}, Kawasan ${["Industri A", "Perumahan B", "Pasar C"][Math.floor(Math.random() * 3)]}`,
    areaCode: areas[Math.floor(Math.random() * areas.length)],
    weight: Math.round((Math.random() * 5 + 0.1) * 100) / 100,
    dimensions: {
      length: Math.round(Math.random() * 40 + 5),
      width: Math.round(Math.random() * 30 + 5),
      height: Math.round(Math.random() * 25 + 3),
    },
    volume: 0,
    paymentMethod: Math.random() > 0.5 ? ("cod" as const) : ("prepaid" as const),
    codAmount: Math.random() > 0.5 ? Math.round(Math.random() * 200 * 100) / 100 : 0,
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    specialInstructions: "",
    status: "sorting" as PacketStatus,
    history: [{ status: "sorting", timestamp: Date.now(), reason: "Paket baru diterima" }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));
}

export function WarehouseUI() {
  const navigate = useSceneStore((s) => s.navigate);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const testPackets = useMemo(() => generateTestPackets(), []);

  const filteredPackets = testPackets.filter((p) => {
    if (filter !== "all" && p.priority !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.trackingNumber.toLowerCase().includes(q) ||
        p.receiverName.toLowerCase().includes(q) ||
        p.areaCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusLabel: Record<string, string> = {
    normal: "Biasa",
    express: "Ekspres",
    urgent: "Penting",
  };

  return (
    <div
      className="panel"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "rgba(10, 10, 15, 0.97)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>Gudang Ekspress</h2>
          <p style={{ margin: "4px 0 0", color: "#8888a0", fontSize: "13px" }}>
            {testPackets.length} paket · {testPackets.reduce((sum, p) => sum + p.weight, 0).toFixed(1)} kg
          </p>
        </div>
        <button
          onClick={() => navigate(Scene.GAME)}
          style={{
            padding: "8px 16px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: "8px",
            color: "#e8e8f0",
            fontSize: "14px",
          }}
        >
          ← Kembali
        </button>
      </div>

      {/* Search & filter */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          gap: "8px",
        }}
      >
        <input
          type="text"
          placeholder="Cari no. tracking, nama, wilayah..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            padding: "10px 12px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            color: "#e8e8f0",
            fontSize: "14px",
            outline: "none",
          }}
        />
        {["all", "normal", "express", "urgent"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "8px 12px",
              background: filter === f ? "#f59e0b" : "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: "8px",
              color: filter === f ? "#000" : "#e8e8f0",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {f === "all" ? "Semua" : statusLabel[f]}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
          padding: "12px 16px",
        }}
      >
        <div
          style={{
            padding: "10px",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#f59e0b" }}>{testPackets.length}</div>
          <div style={{ fontSize: "11px", color: "#8888a0" }}>Total</div>
        </div>
        <div
          style={{
            padding: "10px",
            background: "rgba(34, 197, 94, 0.1)",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#22c55e" }}>
            {testPackets.filter((p) => p.paymentMethod === "cod").length}
          </div>
          <div style={{ fontSize: "11px", color: "#8888a0" }}>COD</div>
        </div>
        <div
          style={{
            padding: "10px",
            background: "rgba(239, 68, 68, 0.1)",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#ef4444" }}>
            {testPackets.filter((p) => p.priority === "urgent").length}
          </div>
          <div style={{ fontSize: "11px", color: "#8888a0" }}>Urgent</div>
        </div>
      </div>

      {/* Packet list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 16px 16px",
        }}
      >
        {filteredPackets.map((packet) => (
          <div
            key={packet.id}
            style={{
              padding: "12px",
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${
                packet.priority === "urgent"
                  ? "rgba(239, 68, 68, 0.3)"
                  : packet.priority === "express"
                    ? "rgba(245, 158, 11, 0.3)"
                    : "rgba(255,255,255,0.08)"
              }`,
              borderRadius: "10px",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "8px",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, fontFamily: "monospace", color: "#f59e0b" }}>
                  {packet.trackingNumber}
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "2px" }}>ke {packet.receiverName}</div>
              </div>
              <span
                style={{
                  padding: "3px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  background:
                    packet.priority === "urgent"
                      ? "rgba(239, 68, 68, 0.2)"
                      : packet.priority === "express"
                        ? "rgba(245, 158, 11, 0.2)"
                        : "rgba(255,255,255,0.08)",
                  color:
                    packet.priority === "urgent" ? "#ef4444" : packet.priority === "express" ? "#f59e0b" : "#8888a0",
                }}
              >
                {statusLabel[packet.priority]}
              </span>
            </div>
            <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#8888a0" }}>
              <span>📍 {packet.areaCode}</span>
              <span>⚖️ {packet.weight} kg</span>
              {packet.paymentMethod === "cod" && <span>💰 COD</span>}
            </div>
          </div>
        ))}
        {filteredPackets.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px", color: "#555570" }}>
            <p>Tiada paket dijumpai</p>
          </div>
        )}
      </div>
    </div>
  );
}
