// Yandex.Direct API client
// Ported from Боты/src/bots/direct/api.ts

import type { ApiResponse } from "../types";

const DIRECT_API = "https://api.direct.yandex.com/json/v5";

export interface DirectCampaign {
  Id: number;
  Name: string;
  Status: string;
  State: string;
}

export interface DirectStats {
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  avgCpc: number;
  conversions: number;
  costPerConversion: number;
}

export interface CampaignStats extends DirectStats {
  campaignId: number;
  campaignName: string;
}

export interface ReportParams {
  dateFrom: string;
  dateTo: string;
  campaignIds?: number[];
  includeConversions?: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function directRequest<T>(
  service: string,
  token: string,
  login: string,
  body: object,
  isReport = false
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Client-Login": login,
    "Accept-Language": "ru",
    "Content-Type": "application/json",
  };

  if (isReport) {
    headers["processingMode"] = "auto";
    headers["returnMoneyInMicros"] = "false";
    headers["skipReportHeader"] = "true";
    headers["skipColumnHeader"] = "false";
    headers["skipReportSummary"] = "true";
  }

  try {
    const response = await fetch(`${DIRECT_API}/${service}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (response.status === 202) {
      const retryAfter = parseInt(response.headers.get("retryIn") || "5", 10);
      await sleep(retryAfter * 1000);
      return directRequest(service, token, login, body, isReport);
    }

    if (!response.ok) {
      const errorData = (await response.json()) as {
        error: { error_code: number; error_detail: string };
      };
      return {
        ok: false,
        error: errorData.error?.error_detail || `API error: ${response.status}`,
        errorCode: errorData.error?.error_code || response.status,
      };
    }

    if (isReport) {
      const text = await response.text();
      return { ok: true, data: text as unknown as T };
    }

    const data = await response.json();
    return { ok: true, data: data as T };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function validateTokenAndLogin(
  token: string,
  login: string
): Promise<ApiResponse<DirectCampaign[]>> {
  const result = await directRequest<{ result: { Campaigns: DirectCampaign[] } }>(
    "campaigns", token, login, {
      method: "get",
      params: { SelectionCriteria: {}, FieldNames: ["Id", "Name", "Status", "State"] },
    }
  );
  if (!result.ok) return { ok: false, error: result.error, errorCode: result.errorCode };
  return { ok: true, data: result.data?.result?.Campaigns || [] };
}

export async function getCampaigns(token: string, login: string): Promise<ApiResponse<DirectCampaign[]>> {
  return validateTokenAndLogin(token, login);
}

export async function getStats(
  token: string,
  login: string,
  params: ReportParams
): Promise<ApiResponse<DirectStats>> {
  const fieldNames = ["Impressions", "Clicks", "Ctr", "Cost", "AvgCpc"];
  if (params.includeConversions) fieldNames.push("Conversions", "CostPerConversion");

  const selectionCriteria: Record<string, unknown> = {
    DateFrom: params.dateFrom,
    DateTo: params.dateTo,
  };

  if (params.campaignIds && params.campaignIds.length > 0) {
    selectionCriteria["Filter"] = [{
      Field: "CampaignId", Operator: "IN", Values: params.campaignIds.map(String),
    }];
  }

  const result = await directRequest<string>("reports", token, login, {
    params: {
      SelectionCriteria: selectionCriteria,
      FieldNames: fieldNames,
      ReportName: `Report_${Date.now()}`,
      ReportType: "ACCOUNT_PERFORMANCE_REPORT",
      DateRangeType: "CUSTOM_DATE",
      Format: "TSV",
      IncludeVAT: "YES",
    },
  }, true);

  if (!result.ok || !result.data) {
    return { ok: false, error: result.error, errorCode: result.errorCode };
  }

  return { ok: true, data: parseTsvReport(result.data as string, params.includeConversions) };
}

export async function getCampaignStats(
  token: string,
  login: string,
  params: ReportParams
): Promise<ApiResponse<CampaignStats[]>> {
  const fieldNames = ["CampaignId", "CampaignName", "Impressions", "Clicks", "Ctr", "Cost", "AvgCpc"];
  if (params.includeConversions) fieldNames.push("Conversions", "CostPerConversion");

  const selectionCriteria: Record<string, unknown> = {
    DateFrom: params.dateFrom,
    DateTo: params.dateTo,
  };

  if (params.campaignIds && params.campaignIds.length > 0) {
    selectionCriteria["Filter"] = [{
      Field: "CampaignId", Operator: "IN", Values: params.campaignIds.map(String),
    }];
  }

  const result = await directRequest<string>("reports", token, login, {
    params: {
      SelectionCriteria: selectionCriteria,
      FieldNames: fieldNames,
      ReportName: `CampaignReport_${Date.now()}`,
      ReportType: "CAMPAIGN_PERFORMANCE_REPORT",
      DateRangeType: "CUSTOM_DATE",
      Format: "TSV",
      IncludeVAT: "YES",
    },
  }, true);

  if (!result.ok || !result.data) {
    return { ok: false, error: result.error, errorCode: result.errorCode };
  }

  return { ok: true, data: parseCampaignTsvReport(result.data as string, params.includeConversions) };
}

function parseTsvReport(tsv: string, includeConversions = false): DirectStats {
  const lines = tsv.trim().split("\n");
  if (lines.length < 2) return emptyStats();

  const values = lines[1].split("\t");
  return {
    impressions: parseInt(values[0], 10) || 0,
    clicks: parseInt(values[1], 10) || 0,
    ctr: parseFloat(values[2]) || 0,
    cost: parseFloat(values[3]) || 0,
    avgCpc: parseFloat(values[4]) || 0,
    conversions: includeConversions ? parseInt(values[5], 10) || 0 : 0,
    costPerConversion: includeConversions ? parseFloat(values[6]) || 0 : 0,
  };
}

function parseCampaignTsvReport(tsv: string, includeConversions = false): CampaignStats[] {
  const lines = tsv.trim().split("\n");
  if (lines.length < 2) return [];

  return lines.slice(1).map((line) => {
    const values = line.split("\t");
    return {
      campaignId: parseInt(values[0], 10),
      campaignName: values[1],
      impressions: parseInt(values[2], 10) || 0,
      clicks: parseInt(values[3], 10) || 0,
      ctr: parseFloat(values[4]) || 0,
      cost: parseFloat(values[5]) || 0,
      avgCpc: parseFloat(values[6]) || 0,
      conversions: includeConversions ? parseInt(values[7], 10) || 0 : 0,
      costPerConversion: includeConversions ? parseFloat(values[8]) || 0 : 0,
    };
  });
}

function emptyStats(): DirectStats {
  return { impressions: 0, clicks: 0, ctr: 0, cost: 0, avgCpc: 0, conversions: 0, costPerConversion: 0 };
}

export function formatDateForApi(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getDateRange(period: "day" | "week" | "month", offset = 0): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);

  switch (period) {
    case "day":
      to.setDate(to.getDate() - 1 - offset);
      from.setDate(from.getDate() - 1 - offset);
      break;
    case "week":
      to.setDate(to.getDate() - 1 - offset * 7);
      from.setDate(from.getDate() - 7 - offset * 7);
      break;
    case "month":
      to.setDate(to.getDate() - 1 - offset * 30);
      from.setDate(from.getDate() - 30 - offset * 30);
      break;
  }

  return { from, to };
}

/** Daily data point for charts */
export interface DailyDirectPoint {
  date: string; // YYYY-MM-DD
  cost: number;
  clicks: number;
  impressions: number;
  ctr: number;
  conversions: number;
  costPerConversion: number;
}

/**
 * Fetch daily breakdown of ad stats for a date range (for Recharts).
 */
export async function getDailyStats(
  token: string,
  login: string,
  params: ReportParams
): Promise<ApiResponse<DailyDirectPoint[]>> {
  const fieldNames = ["Date", "Impressions", "Clicks", "Ctr", "Cost"];
  if (params.includeConversions) fieldNames.push("Conversions", "CostPerConversion");

  const selectionCriteria: Record<string, unknown> = {
    DateFrom: params.dateFrom,
    DateTo: params.dateTo,
  };

  if (params.campaignIds && params.campaignIds.length > 0) {
    selectionCriteria["Filter"] = [{
      Field: "CampaignId", Operator: "IN", Values: params.campaignIds.map(String),
    }];
  }

  const result = await directRequest<string>("reports", token, login, {
    params: {
      SelectionCriteria: selectionCriteria,
      FieldNames: fieldNames,
      ReportName: `DailyReport_${Date.now()}`,
      ReportType: "ACCOUNT_PERFORMANCE_REPORT",
      DateRangeType: "CUSTOM_DATE",
      Format: "TSV",
      IncludeVAT: "YES",
    },
  }, true);

  if (!result.ok || !result.data) {
    return { ok: false, error: result.error, errorCode: result.errorCode };
  }

  const lines = (result.data as string).trim().split("\n");
  if (lines.length < 2) return { ok: true, data: [] };

  const points: DailyDirectPoint[] = lines.slice(1).map((line) => {
    const v = line.split("\t");
    const hasConv = params.includeConversions;
    return {
      date: v[0],
      impressions: parseInt(v[1], 10) || 0,
      clicks: parseInt(v[2], 10) || 0,
      ctr: parseFloat(v[3]) || 0,
      cost: parseFloat(v[4]) || 0,
      conversions: hasConv ? parseInt(v[5], 10) || 0 : 0,
      costPerConversion: hasConv ? parseFloat(v[6]) || 0 : 0,
    };
  }).sort((a, b) => a.date.localeCompare(b.date));

  return { ok: true, data: points };
}

export function getErrorMessage(errorCode?: number): string {
  switch (errorCode) {
    case 52: return "Токен недействителен. Получите новый токен.";
    case 53: return "Нет доступа к этому аккаунту. Проверьте логин.";
    case 54: return "Слишком много запросов. Попробуйте через минуту.";
    case 500: case 502: case 503: return "Сервер Яндекс.Директа временно недоступен.";
    default: return "Ошибка при запросе к API.";
  }
}
