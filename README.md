# 🔷 Azure DevOps MCP Server para Claude

Servidor MCP (Model Context Protocol) que conecta Claude con Azure DevOps para crear y gestionar épicas, historias de usuario, tareas y más, directamente desde la conversación.

## 🛠️ Herramientas disponibles

| Herramienta | Descripción |
|---|---|
| `create_epic` | Crea una Épica |
| `create_feature` | Crea una Feature |
| `create_user_story` | Crea una Historia de Usuario |
| `create_task` | Crea una Tarea |
| `create_bug` | Crea un Bug |
| `get_work_item` | Obtiene detalles de un work item por ID |
| `update_work_item` | Actualiza un work item existente |
| `list_work_items` | Lista work items (con filtro opcional por tipo) |
| `list_iterations` | Lista los sprints/iteraciones disponibles |
| `list_projects` | Lista proyectos de la organización |

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

1. Ve a `https://dev.azure.com/TU_ORG/_usersSettings/tokens`
2. Clic en **"+ New Token"**
3. Configura:
   - **Name:** Claude MCP
   - **Expiration:** Elige una fecha
   - **Scopes:** Selecciona **Work Items → Read & Write**
4. Clic en **Create** y **copia el token**

---

## 🔌 Conectar con Claude

### Opción A: Claude Desktop

Edita el archivo de configuración de Claude Desktop:

**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "azure-devops": {
      "command": "node",
      "args": ["/ruta/absoluta/a/azure-devops-mcp/dist/index.js"],
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

**Claude no ve las herramientas:** Reinicia Claude Desktop.
