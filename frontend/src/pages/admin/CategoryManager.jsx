import React, { useEffect, useState } from "react";
import api from "@/lib/axios";

const CategoryManager = () => {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPlatforms = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/admin/platforms");
      const data = res.data;
      // Support both new shape: { success, platforms: [...] }
      // and legacy admin shape: [ { platform_id, name, ... } ]
      const list = Array.isArray(data) ? data : data?.platforms || [];
      setPlatforms(list || []);
    } catch (err) {
      console.error("Fetch platforms error:", err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err.message ||
        "Failed to load platforms";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          padding: 40,
          color: "#00d2ff",
          textAlign: "center",
          fontWeight: 600,
        }}
      >
        Loading categories...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ color: "#ef4444", marginBottom: 16 }}>Error: {error}</div>
        <button
          onClick={fetchPlatforms}
          style={{
            marginTop: 8,
            padding: "8px 20px",
            background: "#00d2ff",
            color: "#000",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, color: "#e2e8f0" }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          marginBottom: 24,
          color: "#f1f5f9",
        }}
      >
        Category Manager
      </h1>

      {platforms.length === 0 ? (
        <div style={{ color: "#64748b" }}>
          No platforms found.
          <br />
          Check if seeder ran correctly and that MongoDB is configured.
        </div>
      ) : (
        platforms.map((platform) => (
          <div
            key={platform._id}
            style={{
              marginBottom: 20,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderLeft: `3px solid ${platform.color || "#00d2ff"}`,
              borderRadius: 12,
              padding: 20,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#f1f5f9",
                marginBottom: 12,
              }}
            >
              {platform.icon || "📱"} {platform.name}{" "}
              <span
                style={{
                  color: "#64748b",
                  fontSize: 13,
                  fontWeight: 400,
                  marginLeft: 12,
                }}
              >
                {platform.categories_count || 0} categories
              </span>
            </h2>

            {(platform.categories || []).map((cat) => (
              <div
                key={cat._id}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.02)",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "#94a3b8",
                  fontSize: 14,
                }}
              >
                <span
                  style={{
                    color: "#00d2ff",
                    fontWeight: 700,
                    minWidth: 24,
                  }}
                >
                  #{cat.priority}
                </span>
                <span>{cat.icon || "📂"}</span>
                <span>{cat.name}</span>
                <span
                  style={{
                    marginLeft: "auto",
                    color: "#475569",
                    fontSize: 12,
                  }}
                >
                  {(cat.services_count ?? 0) + " services"}
                </span>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
};

export default CategoryManager;

