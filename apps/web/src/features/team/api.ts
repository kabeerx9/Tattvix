import { createTeamApi, createTeamQueries } from "@tattvix/api";
import { apiClient } from "@/lib/api";
export const teamApi = createTeamApi(apiClient);
export const teamQueries = createTeamQueries(teamApi);
