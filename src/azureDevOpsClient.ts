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

  // ─── Work Items ───────────────────────────────────────────────────────────

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
    if (fields.iterationPath) patchDoc.push({ op: "replace", path: "/fields/System.IterationPath", value: fields.iterationPath });
    const response = await this.client.patch(`/_apis/wit/workitems/${id}?api-version=7.1`, patchDoc, { headers: { "Content-Type": "application/json-patch+json" } });
    return response.data;
  }

  async deleteWorkItem(id: number): Promise<void> {
    await this.client.delete(`/_apis/wit/workitems/${id}?api-version=7.1`);
  }

  async addComment(workItemId: number, text: string): Promise<{ id: number; text: string; createdBy: string }> {
    const response = await this.client.post(
      `/_apis/wit/workItems/${workItemId}/comments?api-version=7.1-preview.3`,
      { text }
    );
    return {
      id: response.data.id,
      text: response.data.text,
      createdBy: response.data.createdBy?.displayName ?? "",
    };
  }

  async getComments(workItemId: number): Promise<Array<{ id: number; text: string; createdBy: string; createdDate: string }>> {
    const response = await this.client.get(`/_apis/wit/workItems/${workItemId}/comments?api-version=7.1-preview.3`);
    return response.data.comments.map((c: { id: number; text: string; createdBy: { displayName: string }; createdDate: string }) => ({
      id: c.id, text: c.text, createdBy: c.createdBy?.displayName ?? "", createdDate: c.createdDate,
    }));
  }

  async linkWorkItems(sourceId: number, targetId: number, linkType: string): Promise<void> {
    const patchDoc = [{
      op: "add",
      path: "/relations/-",
      value: {
        rel: linkType,
        url: `https://dev.azure.com/${this.organization}/_apis/wit/workItems/${targetId}`,
      },
    }];
    await this.client.patch(`/_apis/wit/workitems/${sourceId}?api-version=7.1`, patchDoc, { headers: { "Content-Type": "application/json-patch+json" } });
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

  // ─── Iterations / Sprints ─────────────────────────────────────────────────

  async getIterations(): Promise<Array<{ id: string; name: string; path: string; startDate?: string; finishDate?: string }>> {
    const response = await this.client.get(`/_apis/work/teamsettings/iterations?api-version=7.1`);
    return response.data.value.map((i: { id: string; name: string; path: string; attributes?: { startDate?: string; finishDate?: string } }) => ({
      id: i.id, name: i.name, path: i.path,
      startDate: i.attributes?.startDate, finishDate: i.attributes?.finishDate,
    }));
  }

  async updateIteration(iterationId: string, startDate: string, finishDate: string): Promise<{ id: string; name: string; startDate: string; finishDate: string }> {
    const response = await this.client.patch(
      `https://dev.azure.com/${this.organization}/_apis/wit/classificationnodes/iterations/${iterationId}?api-version=7.1`,
      { attributes: { startDate, finishDate } }
    );
    return { id: response.data.id, name: response.data.name, startDate: response.data.attributes?.startDate, finishDate: response.data.attributes?.finishDate };
  }

  async createIteration(name: string, startDate?: string, finishDate?: string): Promise<{ id: string; name: string; path: string }> {
    const body: { name: string; attributes?: { startDate: string; finishDate: string } } = { name };
    if (startDate && finishDate) body.attributes = { startDate, finishDate };
    const response = await this.client.post(
      `https://dev.azure.com/${this.organization}/${this.project}/_apis/wit/classificationnodes/iterations?api-version=7.1`,
      body
    );
    return { id: response.data.id, name: response.data.name, path: response.data.path };
  }

  async getSprintWorkItems(iterationId: string): Promise<WorkItemListResult[]> {
    const rel = await this.client.get(`/_apis/work/teamsettings/iterations/${iterationId}/workitems?api-version=7.1`);
    const allIds: number[] = [
      ...((rel.data.workItemRelations ?? []) as Array<{ target?: { id: number } }>)
        .filter(r => r.target)
        .map(r => r.target!.id),
    ];
    if (allIds.length === 0) return [];
    const itemsResponse = await this.client.get(`/_apis/wit/workitems?ids=${allIds.join(",")}&fields=System.Id,System.Title,System.WorkItemType,System.State,System.AssignedTo,Microsoft.VSTS.Common.Priority,Microsoft.VSTS.Scheduling.StoryPoints&api-version=7.1`);
    return itemsResponse.data.value.map((item: { id: number; url: string; fields: Record<string, unknown> }) => ({
      id: item.id, title: item.fields["System.Title"] as string, type: item.fields["System.WorkItemType"] as string,
      state: item.fields["System.State"] as string, assignedTo: (item.fields["System.AssignedTo"] as { displayName?: string } | undefined)?.displayName,
      priority: item.fields["Microsoft.VSTS.Common.Priority"] as number | undefined, storyPoints: item.fields["Microsoft.VSTS.Scheduling.StoryPoints"] as number | undefined,
      url: `https://dev.azure.com/${this.organization}/${this.project}/_workitems/edit/${item.id}`
    }));
  }

  async getTeamCapacity(iterationId: string): Promise<Array<{ member: string; activities: Array<{ name: string; capacityPerDay: number }>; daysOff: Array<{ start: string; end: string }> }>> {
    const response = await this.client.get(`/_apis/work/teamsettings/iterations/${iterationId}/capacities?api-version=7.1`);
    return response.data.value.map((c: { teamMember: { displayName: string }; activities: Array<{ name: string; capacityPerDay: number }>; daysOff: Array<{ start: string; end: string }> }) => ({
      member: c.teamMember?.displayName ?? "",
      activities: c.activities ?? [],
      daysOff: c.daysOff ?? [],
    }));
  }

  // ─── Repositories ─────────────────────────────────────────────────────────

  async listRepositories(): Promise<Array<{ id: string; name: string; defaultBranch?: string; remoteUrl?: string }>> {
    const response = await this.client.get(`/_apis/git/repositories?api-version=7.1`);
    return response.data.value.map((r: { id: string; name: string; defaultBranch?: string; remoteUrl?: string }) => ({
      id: r.id, name: r.name, defaultBranch: r.defaultBranch, remoteUrl: r.remoteUrl,
    }));
  }

  // ─── Pull Requests ────────────────────────────────────────────────────────

  async listPullRequests(status = "active"): Promise<Array<{ id: number; title: string; status: string; createdBy: string; sourceBranch: string; targetBranch: string; repo: string }>> {
    const response = await this.client.get(`/_apis/git/pullrequests?searchCriteria.status=${status}&api-version=7.1`);
    return response.data.value.map((pr: { pullRequestId: number; title: string; status: string; createdBy: { displayName: string }; sourceRefName: string; targetRefName: string; repository: { name: string } }) => ({
      id: pr.pullRequestId, title: pr.title, status: pr.status,
      createdBy: pr.createdBy?.displayName ?? "",
      sourceBranch: pr.sourceRefName?.replace("refs/heads/", "") ?? "",
      targetBranch: pr.targetRefName?.replace("refs/heads/", "") ?? "",
      repo: pr.repository?.name ?? "",
    }));
  }

  async getPullRequest(prId: number): Promise<{ id: number; title: string; description: string; status: string; createdBy: string; sourceBranch: string; targetBranch: string; repo: string }> {
    const response = await this.client.get(`/_apis/git/pullrequests/${prId}?api-version=7.1`);
    const pr = response.data;
    return {
      id: pr.pullRequestId, title: pr.title, description: pr.description ?? "",
      status: pr.status, createdBy: pr.createdBy?.displayName ?? "",
      sourceBranch: pr.sourceRefName?.replace("refs/heads/", "") ?? "",
      targetBranch: pr.targetRefName?.replace("refs/heads/", "") ?? "",
      repo: pr.repository?.name ?? "",
    };
  }

  async createPullRequest(repoId: string, title: string, sourceBranch: string, targetBranch: string, description?: string): Promise<{ id: number; title: string; url: string }> {
    const response = await this.client.post(
      `/_apis/git/repositories/${repoId}/pullrequests?api-version=7.1`,
      { title, description: description ?? "", sourceRefName: `refs/heads/${sourceBranch}`, targetRefName: `refs/heads/${targetBranch}` }
    );
    return { id: response.data.pullRequestId, title: response.data.title, url: response.data.url };
  }

  // ─── Pipelines ────────────────────────────────────────────────────────────

  async listPipelines(): Promise<Array<{ id: number; name: string; folder: string }>> {
    const response = await this.client.get(`/_apis/pipelines?api-version=7.1`);
    return response.data.value.map((p: { id: number; name: string; folder: string }) => ({
      id: p.id, name: p.name, folder: p.folder,
    }));
  }

  async triggerPipeline(pipelineId: number, branch?: string): Promise<{ id: number; state: string; url: string }> {
    const body: { resources?: { repositories?: { self?: { refName?: string } } } } = {};
    if (branch) body.resources = { repositories: { self: { refName: `refs/heads/${branch}` } } };
    const response = await this.client.post(`/_apis/pipelines/${pipelineId}/runs?api-version=7.1`, body);
    return { id: response.data.id, state: response.data.state, url: response.data._links?.web?.href ?? "" };
  }

  async getPipelineStatus(pipelineId: number, runId: number): Promise<{ id: number; state: string; result?: string; url: string }> {
    const response = await this.client.get(`/_apis/pipelines/${pipelineId}/runs/${runId}?api-version=7.1`);
    return { id: response.data.id, state: response.data.state, result: response.data.result, url: response.data._links?.web?.href ?? "" };
  }

  // ─── Teams ────────────────────────────────────────────────────────────────

  async listTeams(): Promise<Array<{ id: string; name: string; description?: string }>> {
    const response = await this.client.get(`https://dev.azure.com/${this.organization}/_apis/projects/${this.project}/teams?api-version=7.1`);
    return response.data.value.map((t: { id: string; name: string; description?: string }) => ({
      id: t.id, name: t.name, description: t.description,
    }));
  }

  async getTeamMembers(teamId: string): Promise<Array<{ id: string; displayName: string; uniqueName: string }>> {
    const response = await this.client.get(`https://dev.azure.com/${this.organization}/_apis/projects/${this.project}/teams/${teamId}/members?api-version=7.1`);
    return response.data.value.map((m: { identity: { id: string; displayName: string; uniqueName: string } }) => ({
      id: m.identity?.id ?? "", displayName: m.identity?.displayName ?? "", uniqueName: m.identity?.uniqueName ?? "",
    }));
  }

  // ─── Projects ─────────────────────────────────────────────────────────────

  async getProjects(): Promise<Array<{ id: string; name: string }>> {
    const response = await this.client.get(`https://dev.azure.com/${this.organization}/_apis/projects?api-version=7.1`);
    return response.data.value.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }));
  }
}
