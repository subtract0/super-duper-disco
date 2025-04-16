export interface Agent {
  id: string;
  type: string;
  status: "healthy" | "pending" | "crashed" | "restarting" | "recovered" | "recovery_failed";
  host: string;
  config: Record<string, any>;
}

export interface Host {
  id: string;
  name: string;
  status: "online" | "offline";
}
