const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function getUserTokens(userId: string) {
  const res = await fetch(`${API_URL}/api/tokens/user/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch tokens");
  return res.json();
}

export interface FeatureConfig {
  id: string;
  percent: number;
}

export async function deployToken(data: {
  userId: string;
  platform: string;
  name: string;
  symbol: string;
  description?: string;
  initialBuy?: number;
  features?: string[] | FeatureConfig[];
  image?: File;
}) {
  const formData = new FormData();
  formData.append("userId", data.userId);
  formData.append("platform", data.platform);
  formData.append("name", data.name);
  formData.append("symbol", data.symbol);
  if (data.description) formData.append("description", data.description);
  if (data.initialBuy) formData.append("initialBuy", data.initialBuy.toString());
  if (data.features) {
    // Convert features to the format backend expects
    const featuresData = data.features.map(f => 
      typeof f === 'string' ? { id: f, percent: 50 } : f
    );
    formData.append("features", JSON.stringify(featuresData));
  }
  if (data.image) formData.append("image", data.image);

  const res = await fetch(`${API_URL}/api/tokens/deploy`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Deploy failed");
  }

  return res.json();
}

export async function getTokenInfo(mint: string) {
  const res = await fetch(`${API_URL}/api/tokens/info/${mint}`);
  if (!res.ok) throw new Error("Token not found");
  return res.json();
}

export async function updateTokenSettings(mint: string, userId: string, settings: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/api/tokens/settings/${mint}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, ...settings }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Update failed");
  }

  return res.json();
}
