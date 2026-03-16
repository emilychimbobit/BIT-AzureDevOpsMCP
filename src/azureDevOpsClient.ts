import axios, { AxiosInstance } from "axios";

export interface WorkItemFields {
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  priority?: number;
  storyPoints?: number;
  assignedTo?: string;
  tags?: string;
  iterationPath?: string;
  areaPath?: string;
  parentId?: number;
}

export interface WorkItem {
  id: number;
  url: string;
  fields: Record<string, unknown>;
}

export interface WorkItemListResult {
  id: number;
  title: string;
  type: string;
  state: string;
  assignedTo?: string;
  priority?: number;
  storyPoints?: number;
  url: string;
}

export class AzureDevOpsClient {
  private client: AxiosInstance;
  private organization: string;
  private project: string;

  constructor(organization: string, project: string, pat: string) {
    this.organization = organization;
    this.project = encodeURIComponent(project);

    const token = Buffer.from(`:${pat}`).toString("base64");

    this.client = axios.create({
      baseURL: `https://dev.azure.com/${organization}/${this.project}`,
      headers: {
        Authorization: `Basic ${token}`,
        "Content-Type": "application/json",
      },
    });
  }

  async createWorkItem(
    type: "Epic" | "User Story" | "Task" | "Feature" | "Bug",
    fields: WorkItemFields
  ): Promise<WorkItem> {
    const patchDoc: Array<{ op: string; path: string; value: unknown }> = [
      { op: "add", path: "/fields/System.Title", value: fields.title },
    ];
    if (fields.description) patchDoc.push({ op: "add", path: "/fields/System.Description", value: fields.description });
    if (fields.acceptanceCriteria) patchDoc.push({ op: "add", path: "/fields/Microsoft.VSTS.Common.AcceptanceCriteria", value: fields.acceptanceCriteria });
    if (fields.priority !== undefined) patchDoc.push({ op: "add", path: "/fields/Microsoft.VSTS.Common.Priority", value: fields.priority });
    if (fields.storyPoints !== undefined) patchDoc.push({ op: "add", path: "/fields/Microsoft.VSTS.Scheduling.StoryPoints", value: fields.storyPoints });
    if (fields.assignedTo) patchDoc.push({ op: "add", path: "/fields/System.AssignedTo", value: fields.assignedTo });
    if (fields.tags) patchDoc.push({ op: "add", path: "/fields/System.Tags", value: fields.tags });
    if (fields.iterationPath) patchDoc.push({ op: "add", path: "/fields/System.IterationPath", value: fields.iterationPath });
    if (fields.areaPath) patchDoc.push({ op: "add", path: "/fields/System.AreaPath", value: fields.areaPath });
    if (fields.parentId !== undefined) patchDoc.push({ op: "add", path: "/relations/-", value: { rel: "System.LinkTypes.Hierarchy-Reverse", url: `https://dev.azure.com/${this.organization}/_apis/wit/workItems/${fields.parentId}` } });
    const response = await this.client.post(`/_apis/wit/workitems/$${encodeURIComponent(type)}?api-version=7.1`, patchDoc, { headers: { "Content-Type": "application/json-patch+json" } });
    return response.data;
  }

  async getWorkItem(id: number): Promise<WorkItem> {
    const response = await this.client.get(`/_apis/wit/workitems/${id}?api-version=7.1`);
    return response.data;
  }

  async updateWorkItem(id: number, fields: Partial<WorkItemFields>): Promise<WorkItem> {
    const patchDoc: Array<{ op: string; path: string; value: unknown }> = [];
    if (fields.title) patchDoc.push({ op: "replace", path: "/fields/System.Title", value: fields.title });
    if (fields.description) patchDoc.push({ op: "replace", path: "/fields/System.Description", value: fields.description });
    if (fields.acceptanceCriteria) patchDoc.push({ op: "replace", path: "/fields/Microsoft.VSTS.Common.AcceptanceCriteria", value: fields.acceptanceCriteria });
    if (fields.priority !== undefined) patchDoc.push({ op: "replace", path: "/fields/Microsoft.VSTS.Common.Priority", value: fields.priority });
    if (fields.storyPoints !== undefined) patchDoc.push({ op: "replace", path: "/fields/Microsoft.VSTS.Scheduling.StoryPoints", value: fields.storyPoints });
    if (fields.assignedTo) patchDoc.push({ op: "replace", path: "/fields/System.AssignedTo", value: fields.assignedTo });
    if (fields.tags) patchDoc.push({ op: "replace", path: "/fields/System.Tags", value: fields.tags });
    const response = await this.client.patch(`/_apis/wit/workitems/${id}?api-version=7.1`, patchDoc, { headers: { "Content-Type": "application/json-patch+pjson" } });
    return response.data;
  }

  async listWorkItems(type?: string, top = 50): Promise<WorkItemListResult[]> {
    let wiql = `SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State], [System.AssignedTo], [Microsoft.VSTS.Common.Priority], [Microsoft.VSTS.Scheduling.StoryPoints] FROM WorkItems`;
    if (type) wiql += ` WHERE [System.WorkItemType] = '${type}'`;
    wiql += ` ORDER BY [System.ChangedDate] DESC`;
    const wiqlResponse = await this.client.post(`/_apis/wit/wiql?api-version=7.1`, { query: wiql });
    const ids: number[] = wiqlResponse.data.workItems.slice(0, top).map((wi: { id: number }) => wi.id);
    if (ids.length === 0) return [];
    const itemsResponse = await this.client.get(`/_apis/wit/workitems?ids=${ids.join(",")}&fields=System.Id,System.Title,System.WorkItemType,System.State,System.AssignedTo,Microsoft.VSTS.Common.Priority,Microsoft.VSTS.Scheduling.StoryPoints&api-version=7.1`);
    return itemsResponse.data.value.map((item: { id: number; url: string; fields: Record<string, unknown> }) => ({
      id: item.id, title: item.fields["System.Title"] as string, type: item.fields["System.WorkItemType"] as string,
      state: item.fields["System.State"] as string, assignedTo: (item.fields["System.AssignedTo"] as { displayName?: string } | undefined)?.displayName,
      priority: item.fields["Microsoft.VSTS.Common.Priority"] as number | undefined, storyPoints: item.fields["Microsoft.VSTS.Scheduling.StoryPoints"] as number | undefined,
      url: `https://dev.azure.com/${this.organization}/${this.project}/_workitems/edit/${item.id}`
    }));
  }

  async getProjects(): Promise<Array<{ id: string; name: string }>> {
    const response = await this.client.get(`https://dev.azure.com/${this.organization}/_apis/projects?api-version=7.1`);
    return response.data.value.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }));
  }

  async getIterations(): Promise<Array<{ id: string; name: string; path: string }>> {
    const response = await this.client.get(`/_apis/work/teamsettings/iterations?api-version=7.1`);
    return response.data.value.map((i: { id: string; name: string; path: string }) => ({ id: i.id, name: i.name, path: i.path }));
  }
}
