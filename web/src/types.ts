export interface FinOpsSummary {
  total_requests: number;
  total_tokens: number;
  uncached_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  output_tokens: number;
  overall_hit_rate: number;
  total_raw_cost_usd: number;
  total_actual_cost_usd: number;
  total_saved_usd: number;
  savings_percentage: number;
  avg_latency_ms: number;
  avg_ttft_ms: number;
  total_busters_repaired: number;
}

export interface RequestRecord {
  id: string;
  timestamp: string;
  model: string;
  provider: string;
  team_id?: string;
  project_id?: string;
  environment?: string;
  prefix_hash: string;
  uncached_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  output_tokens: number;
  raw_cost_usd: number;
  actual_cost_usd: number;
  saved_cost_usd: number;
  ttft_ms: number;
  latency_ms: number;
  busters_count: number;
  was_padded: boolean;
}

export interface TeamChargeback {
  team_id: string;
  total_requests: number;
  total_tokens: number;
  cache_hit_tokens: number;
  cache_hit_rate: number;
  total_raw_cost_usd: number;
  total_actual_usd: number;
  total_saved_usd: number;
  savings_percentage: number;
}

export interface WarmedPrefix {
  hash: string;
  model: string;
  last_ping: string;
  ping_count: number;
  active: boolean;
}

export interface BusterStat {
  buster_type: string;
  count: number;
}

export interface DetectedBuster {
  type: string;
  value: string;
  placeholder: string;
  original_key?: string;
}

export interface CompilationReport {
  original_tokens: number;
  optimized_tokens: number;
  static_tokens: number;
  dynamic_tokens: number;
  original_hash: string;
  optimized_hash: string;
  busters_detected: DetectedBuster[];
  tools_sorted: number;
  was_padded: boolean;
  padding_added: number;
  cache_control_set: boolean;
  breakpoints_count: number;
  estimated_hit_rate: number;
}

export interface AnalyzeResponse {
  original_body: string;
  optimized_body: string;
  report: CompilationReport;
  estimated_cache: string;
}
