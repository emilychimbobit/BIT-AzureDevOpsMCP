#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import * as dotenv from "dotenv";
import { AzureDevOpsClient, WorkItemFields } from "./azureDevOpsClient.js";

dotenv.config();

const ORGANIZATION = process.env.AZURE_DEVOPS_ORG || "";
const PROJECT = process.env.AZURE_DEVOPS_PROJECT || "";
const PAT = process.env.AZURE_DEVOPS_PAT || "";

if (!ORGANIZATION || !PROJECT || !PAT) {
  console.error(
    "⍌ Error: Faltan variables de entorno requeridas.\n" +
      "Por favor configura en .env:\n" +
      "  AZURE_DEVOPS_ORG=tu-organizacion\n" +
      "  AZURE_DEVOPS_PROJECT=tu-proyecto\n" +
      "  AZURE_DEVOPS_PAT=tu-personal-access-token"
  );
  process.exit(1);
}

const azureClient = new AzureDevOpsClient(ORGANIZATION, PROJECT, PAT);

const tools: Tool[] = [
  // ─── Work Items ───────────────────────────────────────────────────────────
  { name: "create_epic", description: "Crea una Épica en Azure DevOps", inputSchema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "number", enum: [1,2,3,4] }, assignedTo: { type: "string" }, tags: { type: "string" }, iterationPath: { type: "string" }, areaPath: { type: "string" } }, required: ["title"] } },
  { name: "create_feature", description: "Crea una Feature en Azure DevOps", inputSchema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "number", enum: [1,2,3,4] }, storyPoints: { type: "number" }, assignedTo: { type: "string" }, tags: { type: "string" }, iterationPath: { type: "string" }, areaPath: { type: "string" }, parentId: { type: "number" } }, required: ["title"] } },
  { name: "create_user_story", description: "Crea una Historia de Usuario en Azure DevOps", inputSchema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, acceptanceCriteria: { type: "string" }, priority: { type: "number", enum: [1,2,3,4] }, storyPoints: { type: "number" }, assignedTo: { type: "string" }, tags: { type: "string" }, iterationPath: { type: "string" }, areaPath: { type: "string" }, parentId: { type: "number" } }, required: ["title"] } },
  { name: "create_task", description: "Crea una Tarea en Azure DevOps", inputSchema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "number", enum: [1,2,3,4] }, storyPoints: { type: "number" }, assignedTo: { type: "string" }, tags: { type: "string" }, iterationPath: { type: "string" }, areaPath: { type: "string" }, parentId: { type: "number" } }, required: ["title"] } },
  { name: "create_bug", description: "Crea un Bug en Azure DevOps", inputSchema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, acceptanceCriteria: { type: "string" }, priority: { type: "number", enum: [1,2,3,4] }, assignedTo: { type: "string" }, tags: { type: "string" }, iterationPath: { type: "string" }, areaPath: { type: "string" }, parentId: { type: "number" } }, required: ["title"] } },
  { name: "get_work_item", description: "Obtiene detalles de un Work Item por ID", inputSchema: { type: "object", properties: { id: { type: "number" } }, required: ["id"] } },
  { name: "update_work_item", description: "Actualiza un Work Item existente", inputSchema: { type: "object", properties: { id: { type: "number" }, title: { type: "string" }, description: { type: "string" }, acceptanceCriteria: { type: "string" }, priority: { type: "number", enum: [1,2,3,4] }, storyPoints: { type: "number" }, assignedTo: { type: "string" }, tags: { type: "string" }, iterationPath: { type: "string" } }, required: ["id"] } },
  { name: "delete_work_item", description: "Elimina un Work Item por ID", inputSchema: { type: "object", properties: { id: { type: "number" } }, required: ["id"] } },
  { name: "list_work_items", description: "Lista Work Items del proyecto", inputSchema: { type: "object", properties: { type: { type: "string", enum: ["Epic","Feature","User Story","Task","Bug"] }, top: { type: "number" } } } },
  { name: "add_comment", description: "Agrega un comentario a un Work Item", inputSchema: { type: "object", properties: { workItemId: { type: "number" }, text: { type: "string" } }, required: ["workItemId", "text"] } },
  { name: "get_comments", description: "Obtiene los comentarios de un Work Item", inputSchema: { type: "object", properties: { workItemId: { type: "number" } }, required: ["workItemId"] } },
  { name: "link_work_items", description: "Vincula dos Work Items. linkType puede ser: System.LinkTypes.Hierarchy-Reverse (padre), System.LinkTypes.Hierarchy-Forward (hijo), System.LinkTypes.Related (relacionado)", inputSchema: { type: "object", properties: { sourceId: { type: "number" }, targetId: { type: "number" }, linkType: { type: "string" } }, required: ["sourceId", "targetId", "linkType"] } },
  // ─── Sprints ──────────────────────────────────────────────────────────────
  { name: "list_iterations", description: "Lista sprints/iteraciones con sus fechas de inicio y fin", inputSchema: { type: "object", properties: {} } },
  { name: "create_iteration", description: "Crea un nuevo sprint/iteración", inputSchema: { type: "object", properties: { name: { type: "string" }, startDate: { type: "string", description: "Fecha inicio YYYY-MM-DD" }, finishDate: { type: "string", description: "Fecha fin YYYY-MM-DD" } }, required: ["name"] } },
  { name: "update_iteration", description: "Actualiza las fechas de inicio y fin de un sprint/iteración", inputSchema: { type: "object", properties: { iterationId: { type: "string" }, startDate: { type: "string", description: "Fecha inicio YYYY-MM-DD" }, finishDate: { type: "string", description: "Fecha fin YYYY-MM-DD" } }, required: ["iterationId", "startDate", "finishDate"] } },
  { name: "get_sprint_work_items", description: "Lista los Work Items de un sprint específico", inputSchema: { type: "object", properties: { iterationId: { type: "string" } }, required: ["iterationId"] } },
  { name: "get_team_capacity", description: "Obtiene la capacidad del equipo para un sprint", inputSchema: { type: "object", properties: { iterationId: { type: "string" } }, required: ["iterationId"] } },
  // ─── Repos & PRs ──────────────────────────────────────────────────────────
  { name: "list_repositories", description: "Lista los repositorios del proyecto", inputSchema: { type: "object", properties: {} } },
  { name: "list_pull_requests", description: "Lista Pull Requests del proyecto", inputSchema: { type: "object", properties: { status: { type: "string", enum: ["active", "completed", "abandoned", "all"], description: "Estado del PR (default: active)" } } } },
  { name: "get_pull_request", description: "Obtiene el detalle de un Pull Request por ID", inputSchema: { type: "object", properties: { prId: { type: "number" } }, required: ["prId"] } },
  { name: "create_pull_request", description: "Crea un Pull Request", inputSchema: { type: "object", properties: { repoId: { type: "string", description: "ID del repositorio (de list_repositories)" }, title: { type: "string" }, sourceBranch: { type: "string" }, targetBranch: { type: "string" }, description: { type: "string" } }, required: ["repoId", "title", "sourceBranch", "targetBranch"] } },
  // ─── Pipelines ────────────────────────────────────────────────────────────
  { name: "list_pipelines", description: "Lista los pipelines del proyecto", inputSchema: { type: "object", properties: {} } },
  { name: "trigger_pipeline", description: "Ejecuta un pipeline", inputSchema: { type: "object", properties: { pipelineId: { type: "number" }, branch: { type: "string", description: "Rama a usar (opcional)" } }, required: ["pipelineId"] } },
  { name: "get_pipeline_status", description: "Obtiene el estado de una ejecución de pipeline", inputSchema: { type: "object", properties: { pipelineId: { type: "number" }, runId: { type: "number" } }, required: ["pipelineId", "runId"] } },
  // ─── Teams ────────────────────────────────────────────────────────────────
  { name: "list_teams", description: "Lista los equipos del proyecto", inputSchema: { type: "object", properties: {} } },
  { name: "get_team_members", description: "Obtiene los miembros de un equipo", inputSchema: { type: "object", properties: { teamId: { type: "string", description: "ID del equipo (de list_teams)" } }, required: ["teamId"] } },
  // ─── Projects ─────────────────────────────────────────────────────────────
  { name: "list_projects", description: "Lista proyectos de la organización", inputSchema: { type: "object", properties: {} } },
];

const server = new Server({ name: "azure-devOps-mcp", version: "2.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    // ─── Work Items ─────────────────────────────────────────────────────────
    if (["create_epic","create_user_story","create_task","create_feature","create_bug"].includes(name)) {
      const typeMap: Record<string, "Epic" | "User Story" | "Task" | "Feature" | "Bug"> = { create_epic: "Epic", create_user_story: "User Story", create_task: "Task", create_feature: "Feature", create_bug: "Bug" };
      const labelMap: Record<string, string> = { create_epic: "Épica", create_user_story: "Historia de Usuario", create_task: "Tarea", create_feature: "Feature", create_bug: "Bug" };
      const item = await azureClient.createWorkItem(typeMap[name], args as unknown as WorkItemFields);
      return { content: [{ type: "text", text: `✅ ${labelMap[name]} creada!\n\n**ID:** ${item.id}\n**Título:** ${(item.fields as Record<string,unknown>)["System.Title"]}\n**URL:** https://dev.azure.com/${ORGANIZATION}/${PROJECT}/_workitems/edit/${item.id}` }] };
    }
    if (name === "get_work_item") {
      const item = await azureClient.getWorkItem((args as {id:number}).id);
      return { content: [{ type: "text", text: JSON.stringify(item.fields, null, 2) }] };
    }
    if (name === "update_work_item") {
      const { id, ...fields } = args as unknown as { id: number } & WorkItemFields;
      const item = await azureClient.updateWorkItem(id, fields);
      return { content: [{ type: "text", text: `✅ Work Item #${item.id} actualizado.` }] };
    }
    if (name === "delete_work_item") {
      await azureClient.deleteWorkItem((args as { id: number }).id);
      return { content: [{ type: "text", text: `✅ Work Item #${(args as { id: number }).id} eliminado.` }] };
    }
    if (name === "list_work_items") {
      const { type, top = 20 } = args as { type?: string; top?: number };
      const items = await azureClient.listWorkItems(type, top);
      if (items.length === 0) return { content: [{ type: "text", text: "No se encontraron work items." }] };
      return { content: [{ type: "text", text: `📋 ${items.length} items:\n\n${items.map(i => `#${i.id} | ${i.type} | ${i.state} | ${i.title}`).join("\n")}` }] };
    }
    if (name === "add_comment") {
      const { workItemId, text } = args as { workItemId: number; text: string };
      const comment = await azureClient.addComment(workItemId, text);
      return { content: [{ type: "text", text: `✅ Comentario agregado al Work Item #${workItemId} (ID comentario: ${comment.id})` }] };
    }
    if (name === "get_comments") {
      const { workItemId } = args as { workItemId: number };
      const comments = await azureClient.getComments(workItemId);
      if (comments.length === 0) return { content: [{ type: "text", text: "No hay comentarios." }] };
      return { content: [{ type: "text", text: comments.map(c => `[${c.createdDate}] ${c.createdBy}: ${c.text}`).join("\n\n") }] };
    }
    if (name === "link_work_items") {
      const { sourceId, targetId, linkType } = args as { sourceId: number; targetId: number; linkType: string };
      await azureClient.linkWorkItems(sourceId, targetId, linkType);
      return { content: [{ type: "text", text: `✅ Work Items #${sourceId} y #${targetId} vinculados con tipo "${linkType}".` }] };
    }
    // ─── Sprints ─────────────────────────────────────────────────────────────
    if (name === "list_iterations") {
      const iterations = await azureClient.getIterations();
      return { content: [{ type: "text", text: iterations.map(i => `ID: ${i.id} | ${i.name} | Inicio: ${i.startDate ?? "sin fecha"} | Fin: ${i.finishDate ?? "sin fecha"}`).join("\n") }] };
    }
    if (name === "create_iteration") {
      const { name: iterName, startDate, finishDate } = args as { name: string; startDate?: string; finishDate?: string };
      const iter = await azureClient.createIteration(iterName, startDate, finishDate);
      return { content: [{ type: "text", text: `✅ Sprint "${iter.name}" creado.\n**ID:** ${iter.id}\n**Path:** ${iter.path}` }] };
    }
    if (name === "update_iteration") {
      const { iterationId, startDate, finishDate } = args as { iterationId: string; startDate: string; finishDate: string };
      const result = await azureClient.updateIteration(iterationId, startDate, finishDate);
      return { content: [{ type: "text", text: `✅ Sprint "${result.name}" actualizado:\n- Inicio: ${result.startDate}\n- Fin: ${result.finishDate}` }] };
    }
    if (name === "get_sprint_work_items") {
      const { iterationId } = args as { iterationId: string };
      const items = await azureClient.getSprintWorkItems(iterationId);
      if (items.length === 0) return { content: [{ type: "text", text: "No hay work items en este sprint." }] };
      return { content: [{ type: "text", text: `📋 ${items.length} items en el sprint:\n\n${items.map(i => `#${i.id} | ${i.type} | ${i.state} | ${i.title}`).join("\n")}` }] };
    }
    if (name === "get_team_capacity") {
      const { iterationId } = args as { iterationId: string };
      const capacity = await azureClient.getTeamCapacity(iterationId);
      if (capacity.length === 0) return { content: [{ type: "text", text: "No hay datos de capacidad para este sprint." }] };
      return { content: [{ type: "text", text: capacity.map(c => `${c.member}: ${c.activities.map(a => `${a.name} (${a.capacityPerDay}h/día)`).join(", ") || "sin actividades"}`).join("\n") }] };
    }
    // ─── Repos & PRs ─────────────────────────────────────────────────────────
    if (name === "list_repositories") {
      const repos = await azureClient.listRepositories();
      return { content: [{ type: "text", text: repos.map(r => `ID: ${r.id} | ${r.name} | ${r.defaultBranch ?? ""} | ${r.remoteUrl ?? ""}`).join("\n") }] };
    }
    if (name === "list_pull_requests") {
      const { status = "active" } = args as { status?: string };
      const prs = await azureClient.listPullRequests(status);
      if (prs.length === 0) return { content: [{ type: "text", text: "No hay pull requests." }] };
      return { content: [{ type: "text", text: prs.map(pr => `#${pr.id} | ${pr.status} | ${pr.repo} | ${pr.sourceBranch} → ${pr.targetBranch} | ${pr.title}`).join("\n") }] };
    }
    if (name === "get_pull_request") {
      const pr = await azureClient.getPullRequest((args as { prId: number }).prId);
      return { content: [{ type: "text", text: `**PR #${pr.id}:** ${pr.title}\n**Estado:** ${pr.status}\n**Repo:** ${pr.repo}\n**Rama:** ${pr.sourceBranch} → ${pr.targetBranch}\n**Creado por:** ${pr.createdBy}\n**Descripción:** ${pr.description}` }] };
    }
    if (name === "create_pull_request") {
      const { repoId, title, sourceBranch, targetBranch, description } = args as { repoId: string; title: string; sourceBranch: string; targetBranch: string; description?: string };
      const pr = await azureClient.createPullRequest(repoId, title, sourceBranch, targetBranch, description);
      return { content: [{ type: "text", text: `✅ Pull Request creado!\n**ID:** ${pr.id}\n**Título:** ${pr.title}` }] };
    }
    // ─── Pipelines ───────────────────────────────────────────────────────────
    if (name === "list_pipelines") {
      const pipelines = await azureClient.listPipelines();
      return { content: [{ type: "text", text: pipelines.map(p => `ID: ${p.id} | ${p.folder} | ${p.name}`).join("\n") }] };
    }
    if (name === "trigger_pipeline") {
      const { pipelineId, branch } = args as { pipelineId: number; branch?: string };
      const run = await azureClient.triggerPipeline(pipelineId, branch);
      return { content: [{ type: "text", text: `✅ Pipeline ejecutado!\n**Run ID:** ${run.id}\n**Estado:** ${run.state}\n**URL:** ${run.url}` }] };
    }
    if (name === "get_pipeline_status") {
      const { pipelineId, runId } = args as { pipelineId: number; runId: number };
      const run = await azureClient.getPipelineStatus(pipelineId, runId);
      return { content: [{ type: "text", text: `**Run #${run.id}**\n**Estado:** ${run.state}\n**Resultado:** ${run.result ?? "en progreso"}\n**URL:** ${run.url}` }] };
    }
    // ─── Teams ───────────────────────────────────────────────────────────────
    if (name === "list_teams") {
      const teams = await azureClient.listTeams();
      return { content: [{ type: "text", text: teams.map(t => `ID: ${t.id} | ${t.name}${t.description ? ` | ${t.description}` : ""}`).join("\n") }] };
    }
    if (name === "get_team_members") {
      const { teamId } = args as { teamId: string };
      const members = await azureClient.getTeamMembers(teamId);
      return { content: [{ type: "text", text: members.map(m => `${m.displayName} | ${m.uniqueName}`).join("\n") }] };
    }
    // ─── Projects ────────────────────────────────────────────────────────────
    if (name === "list_projects") {
      const projects = await azureClient.getProjects();
      return { content: [{ type: "text", text: projects.map(p => p.name).join("\n") }] };
    }

    return { content: [{ type: "text", text: `❌ Herramienta desconocida: ${name}` }], isError: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return { content: [{ type: "text", text: `❌ Error: ${message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 Azure DevOps MCP Server v2.0.0 iniciado");
}

main().catch(error => { console.error("Error fatal:", error); process.exit(1); });
