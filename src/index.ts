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
  { name: "create_epic", description: "Crea una Épica en Azure DevOps", inputSchema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "number", enum: [1,2,3,4] }, assignedTo: { type: "string" }, tags: { type: "string" }, iterationPath: { type: "string" }, areaPath: { type: "string" } }, required: ["title"] } },
  { name: "create_user_story", description: "Crea una Historia de Usuario en Azure DevOps", inputSchema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, acceptanceCriteria: { type: "string" }, priority: { type: "number", enum: [1,2,3,4] }, storyPoints: { type: "number" }, assignedTo: { type: "string" }, tags: { type: "string" }, iterationPath: { type: "string" }, areaPath: { type: "string" }, parentId: { type: "number" } }, required: ["title"] } },
  { name: "create_task", description: "Crea una Tarea en Azure DevOps", inputSchema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "number", enum: [1,2,3,4] }, storyPoints: { type: "number" }, assignedTo: { type: "string" }, tags: { type: "string" }, iterationPath: { type: "string" }, areaPath: { type: "string" }, parentId: { type: "number" } }, required: ["title"] } },
  { name: "create_feature", description: "Crea una Feature en Azure DevOps", inputSchema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "number", enum: [1,2,3,4] }, storyPoints: { type: "number" }, assignedTo: { type: "string" }, tags: { type: "string" }, iterationPath: { type: "string" }, areaPath: { type: "string" }, parentId: { type: "number" } }, required: ["title"] } },
  { name: "create_bug", description: "Crea un Bug en Azure DevOps", inputSchema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, acceptanceCriteria: { type: "string" }, priority: { type: "number", enum: [1,2,3,4] }, assignedTo: { type: "string" }, tags: { type: "string" }, iterationPath: { type: "string" }, areaPath: { type: "string" }, parentId: { type: "number" } }, required: ["title"] } },
  { name: "get_work_item", description: "Obtiene detalles de un Work Item por ID", inputSchema: { type: "object", properties: { id: { type: "number" } }, required: ["id"] } },
  { name: "update_work_item", description: "Actualiza un Work Item existente", inputSchema: { type: "object", properties: { id: { type: "number" }, title: { type: "string" }, description: { type: "string" }, acceptanceCriteria: { type: "string" }, priority: { type: "number", enum: [1,2,3,4] }, storyPoints: { type: "number" }, assignedTo: { type: "string" }, tags: { type: "string" } }, required: ["id"] } },
  { name: "list_work_items", description: "Lista Work Items del proyecto", inputSchema: { type: "object", properties: { type: { type: "string", enum: ["Epic","User Story","Task","Feature","Bug"] }, top: { type: "number" } } } },
  { name: "list_iterations", description: "Lista sprints/iteraciones", inputSchema: { type: "object", properties: {} } },
  { name: "list_projects", description: "Lista proyectos de la organizacion", inputSchema: { type: "object", properties: {} } },
];

const server = new Server({ name: "azure-devOps-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    if (name === "create_epic" || name === "create_user_story" || name === "create_task" || name === "create_feature" || name === "create_bug") {
      const typeMap: Record<string, "Epic" | "User Story" | "Task" | "Feature" | "Bug"> = { create_epic: "Epic", create_user_story: "User Story", create_task: "Task", create_feature: "Feature", create_bug: "Bug" };
      const item = await azureClient.createWorkItem(typeMap[name], args as unknown as WorkItemFields);
      const typeLabels = { create_epic: "Épica", create_user_story: "Historia de Usuario", create_task: "Tarea", create_feature: "Feature", create_bug: "Bug" };
      return { content: [{ type: "text", text: `✅ ${typeLabels[name]} creada exitosamente!\n\n**ID:** ${item.id}\n**Título:** ${(item.fields as Record<string,unknown>)["System.Title"]}\n**URL:** https://dev.azure.com/${ORGANIZATION}/${PROJECT}/_workitems/edit/${item.id}` }] };
    }
    if (name === "get_work_item") {
      const item = await azureClient.getWorkItem((args as {id:number}).id);
      return { content: [{ type: "text", text: JSON.stringify(item.fields, null, 2) }] };
    }
    if (name === "update_work_item") {
      const { id, ...fields } = args as unknown as { id: number } & WorkItemFields;
      const item = await azureClient.updateWorkItem(id, fields);
      return { content: [{ type: "text", text: `✅ Work Item #${item.id} actualizado correctamente.` }] };
    }
    if (name === "list_work_items") {
      const { type, top = 20 } = args as { type?: string; top?: number };
      const items = await azureClient.listWorkItems(type, top);
      if (items.length === 0) return { content: [{ type: "text", text: "No se encontraron work items." }] };
      return { content: [{ type: "text", text: `📋 ${items.length} items:\n\n${items.map(i => `#${i.id} | ${i.type} | ${i.state} | ${i.title}`).join("\n")}` }] };
    }
    if (name === "list_iterations") {
      const iterations = await azureClient.getIterations();
      return { content: [{ type: "text", text: iterations.map(i => `${i.name}: ${i.path}`).join("\n") }] };
    }
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
  console.error("🚀 Azure DevOps MCP Server iniciado");
}

main().catch(error => { console.error("Error fatal:", error); process.exit(1); });
