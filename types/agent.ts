export interface Agent {
  id: string;
  type: string;
  status: "healthy" | "pending" | "crashed";
  host: string;
  config: Record<string, any>;
}

export interface Host {
  id: string;
  name: string;
  status: "online" | "offline";
}
