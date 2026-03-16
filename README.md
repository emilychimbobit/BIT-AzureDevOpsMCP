# 🔷 Azure DevOps MCP Server para Claude

Servidor MCP (Model Context Protocol) que conecta Claude con Azure DevOps para crear y gestionar épicas, historias de usuario, tareas, sprints, repositorios, pipelines y más, directamente desde la conversación.

## 🛠️ Herramientas disponibles

### Work Items
| Herramienta | Descripción |
|---|---|
| `create_epic` | Crea una Épica |
| `create_feature` | Crea una Feature |
| `create_user_story` | Crea una Historia de Usuario |
| `create_task` | Crea una Tarea |
| `create_bug` | Crea un Bug |
| `get_work_item` | Obtiene detalles de un work item por ID |
| `update_work_item` | Actualiza un work item existente (título, descripción, prioridad, story points, asignado, tags, sprint) |
| `delete_work_item` | Elimina un work item por ID |
| `list_work_items` | Lista work items con filtro opcional por tipo |
| `add_comment` | Agrega un comentario a un work item |
| `get_comments` | Obtiene los comentarios de un work item |
| `link_work_items` | Vincula dos work items (padre-hijo, relacionado, etc.) |

### Sprints / Iteraciones
| Herramienta | Descripción |
|---|---|
| `list_iterations` | Lista sprints con ID, nombre y fechas de inicio y fin |
| `create_iteration` | Crea un nuevo sprint/iteración |
| `update_iteration` | Actualiza las fechas de inicio y fin de un sprint |
| `get_sprint_work_items` | Lista los work items de un sprint específico |
| `get_team_capacity` | Obtiene la capacidad del equipo para un sprint |

### Repositorios
| Herramienta | Descripción |
|---|---|
| `list_repositories` | Lista los repositorios del proyecto |

### Pull Requests
| Herramienta | Descripción |
|---|---|
| `list_pull_requests` | Lista PRs (filtro por estado: active, completed, abandoned) |
| `get_pull_request` | Obtiene el detalle de un PR por ID |
| `create_pull_request` | Crea un Pull Request |

### Pipelines
| Herramienta | Descripción |
|---|---|
| `list_pipelines` | Lista los pipelines del proyecto |
| `trigger_pipeline` | Ejecuta un pipeline (con rama opcional) |
| `get_pipeline_status` | Obtiene el estado de una ejecución de pipeline |

### Equipos
| Herramienta | Descripción |
|---|---|
| `list_teams` | Lista los equipos del proyecto |
| `get_team_members` | Obtiene los miembros de un equipo |

### Proyectos
| Herramienta | Descripción |
|---|---|
| `list_projects` | Lista todos los proyectos de la organización |

---

## 🚀 Instalación

### Requisitos previos
- Node.js 18 o superior
- Una cuenta de Azure DevOps con acceso a un proyecto

### 1. Instalar dependencias

```bash
npm install
npm run build
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus datos:

```env
AZURE_DEVOPS_ORG=tu-organizacion
AZURE_DEVOPS_PROJECT=tu-proyecto
AZURE_DEVOPS_PAT=tu-personal-access-token
```

### 3. Obtener un Personal Access Token (PAT)

1. Ve a `https://tu-organizacion.visualstudio.com/_usersSettings/tokens`
2. Clic en **"+ New Token"**
3. Configura:
   - **Name:** Claude MCP
   - **Expiration:** Elige una fecha
   - **Scopes:** Selecciona **Work Items → Read & Write**, **Code → Read & Write**, **Build → Read & Execute**
4. Clic en **Create** y **copia el token**

---

## 🔌 Conectar con Claude Desktop

Edita el archivo de configuración de Claude Desktop:

**Windows:** `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json`

**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Agrega la sección `mcpServers`:

```json
{
  "mcpServers": {
    "azure-devops": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": ["C:\\ruta\\absoluta\\al\\proyecto\\dist\\index.js"],
      "env": {
        "AZURE_DEVOPS_ORG": "tu-organizacion",
        "AZURE_DEVOPS_PROJECT": "tu-proyecto",
        "AZURE_DEVOPS_PAT": "tu-pat"
      }
    }
  }
}
```

Reinicia Claude Desktop y verás las herramientas disponibles.

---

## 🐛 Troubleshooting

**Error 401 Unauthorized:** El PAT es incorrecto o expiró. Genera uno nuevo.

**Error 404 Not Found:** Verifica que la org y proyecto estén correctos.

**Claude no ve las herramientas:** Reinicia Claude Desktop completamente desde la bandeja del sistema.

**No aparece el martillo en Claude Desktop:** Verifica que el config esté en la ruta correcta para tu instalación (ver sección de instalación).
