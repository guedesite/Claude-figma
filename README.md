# Figma MCP Server for Claude Code

MCP server that connects Claude Code to Figma. Browse your files, explore pages, and convert designs to clean HTML/CSS — right from the chat.

## Features

- **Paste any Figma URL** — auto-detects file, team, project, or prototype links
- **Browse interactively** — navigate teams, projects, files, and pages from the chat
- **Search by name** — previously accessed files are remembered and searchable
- **Convert to HTML + CSS** — Figma auto-layout maps to flexbox, typography, colors, shadows, gradients, border-radius
- **SVG icon export** — vectors and icons are downloaded as local `.svg` files
- **Token management** — environment variable or interactive setup in the chat

## Quick Start

### 1. Install

```bash
git clone https://github.com/your-username/Claude-figma.git
cd Claude-figma
npm install
npm run build
```

### 2. Get a Figma Token

1. Go to [Figma > Settings > Personal Access Tokens](https://www.figma.com/developers/api#access-tokens)
2. Click **"Create a new personal access token"**
3. Copy the token (starts with `figd_`)

### 3. Add to Claude Code

**Option A: CLI (recommended)**

```bash
claude mcp add figma node /absolute/path/to/Claude-figma/dist/index.js
```

**Option B: `.mcp.json` in your project**

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": ["/absolute/path/to/Claude-figma/dist/index.js"],
      "env": {
        "FIGMA_TOKEN": "figd_your_token_here"
      }
    }
  }
}
```

**Option C: Global (all projects)**

```bash
claude mcp add --scope user figma node /absolute/path/to/Claude-figma/dist/index.js
```

### 4. Use it

Open Claude Code and talk naturally:

> *"Implement the interface from my Figma"*

> *"Here's my Figma: https://www.figma.com/design/ABC123/MyDesign"*

> *"Connect to my Figma"*

**That's it.** Claude will automatically check the connection, parse your URL, show pages, convert the design to HTML/CSS, and implement it in your project.

## How to Use

### First time: token setup

```
You:    Connect to my Figma

Claude: No token found. To connect, you need a Personal Access Token:
        1. Go to https://www.figma.com/developers/api#access-tokens
        2. Create a new token
        3. Paste it here

You:    figd_abc123...

Claude: Token saved! Connected as Hugo Mathieu (hugo@email.com)
```

### Navigate by URL

```
You:    https://www.figma.com/design/COmn2s2JJT2m9xt3h2kbgu/KOVRIA

Claude: KOVRIA - Interface Salarie
        
        Pages (11):
          1. Tableau de Bord
          2. Mes informations
          3. Documents RH
          ...
        
        Which page do you want to explore or convert?
```

### Navigate by name

After the first access, files are remembered:

```
You:    Open KOVRIA

Claude: KOVRIA - Interface Salarie (11 pages)
        ...
```

### Navigate by team

```
You:    Browse my team: https://www.figma.com/files/team/123456/MyTeam

Claude: Team Projects (3 found):
          1. Web App
          2. Mobile App
          3. Design System
        
        Which project?
```

### Explore a page

```
You:    Show me the Dashboard page

Claude: Page: Tableau de Bord
        
        - Frame 14 (1440x1289)
          - Ma situation [horizontal]
          - Actions urgentes [vertical]
          - Validations [vertical]
        
        Which frame do you want to convert?
```

### Convert to HTML

```
You:    Convert the whole page, save icons to ./src/assets

Claude: HTML conversion of "Tableau de Bord" (1440x1289)
        30 SVG icons saved to ./src/assets/icons/
        
        [HTML + CSS output with flexbox layout, typography, colors...]
```

### Implement in your project

```
You:    Create a React component for this

Claude: [creates src/components/Dashboard.tsx]
        [creates src/components/Dashboard.css]
        [uses SVG icons from src/assets/icons/]
```

## Tools

| Tool | Description |
|------|-------------|
| `set_token` | Save and verify your Figma token |
| `test_connection` | Check if Figma is connected |
| `figma_browse` | **Main entry point** — paste a URL, search by name, or see recent files |
| `figma_list_projects` | List projects in a team |
| `figma_list_files` | List files in a project |
| `figma_get_file_info` | Get file metadata and page list |
| `figma_get_page` | Explore a page's frame hierarchy |
| `figma_get_node` | Get detailed properties of any node |
| `figma_to_html` | **Convert a design to HTML + CSS** with SVG export |

All tools accept Figma URLs in addition to raw IDs.

### Supported URL formats

| URL | Extracted |
|-----|----------|
| `figma.com/file/ABC123/Name` | File key |
| `figma.com/design/ABC123/Name` | File key |
| `figma.com/design/ABC123/Name?node-id=1-2` | File key + Node ID |
| `figma.com/proto/ABC123/Name` | File key (prototype) |
| `figma.com/board/ABC123/Name` | File key (FigJam) |
| `figma.com/files/team/12345/Name` | Team ID |
| `figma.com/files/project/789/Name` | Project ID |

## Token Management

| Method | Description |
|--------|-------------|
| `FIGMA_TOKEN` env var | Set in MCP config `env` block. Best for teams. |
| Interactive via `set_token` | Type your token in the chat. Saved to `~/.figma-mcp-config.json`. |

The env variable takes priority.

## HTML Conversion

### Figma to CSS mapping

| Figma | CSS |
|-------|-----|
| Auto-layout horizontal | `display: flex; flex-direction: row` |
| Auto-layout vertical | `display: flex; flex-direction: column` |
| `primaryAxisAlignItems` | `justify-content` |
| `counterAxisAlignItems` | `align-items` |
| `itemSpacing` | `gap` |
| Padding | `padding` |
| `layoutWrap: WRAP` | `flex-wrap: wrap` |
| Constraints (fixed layout) | `position: absolute` + `top/left/right/bottom` |
| Solid fill | `background-color` |
| Gradient fill | `linear-gradient()` / `radial-gradient()` |
| Text fill | `color` |
| Stroke | `border` |
| Corner radius | `border-radius` |
| Drop shadow | `box-shadow` |
| Inner shadow | `box-shadow: inset` |
| Layer blur | `filter: blur()` |
| Background blur | `backdrop-filter: blur()` |
| Typography | `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `text-align`, `text-transform`, `text-decoration` |
| Opacity | `opacity` |
| Clip content | `overflow: hidden` |
| Icons and vectors | `<img src="icons/name.svg">` |

### Output modes

- **Style tag** (default): CSS classes in a `<style>` block — cleaner, easier to adapt
- **Inline styles**: `style=""` attributes — simpler for quick prototypes

### SVG export

When `output_dir` is provided:
1. Vector and icon nodes are detected automatically
2. Exported as SVG via the Figma Image API
3. Downloaded as local `.svg` files in an `icons/` subfolder
4. Referenced with relative paths in the HTML

## Visual Testing

Tested on 11 pages from a real Figma project (KOVRIA — HR SaaS interface with dashboards, tables, calendars, forms, notifications). Each page was exported as PNG from Figma, converted to HTML, screenshotted with Puppeteer, and compared side by side.

| Page | Size | SVGs |
|------|------|------|
| Dashboard | 1440x1289 | 30 |
| Employee Profile | 1440x900 | 18 |
| HR Documents | 1440x1500 | 30 |
| Leave & Absence | 1440x1000 | 15 |
| Timesheet | 1440x1036 | 18 |
| Expenses | 1440x900 | 35 |
| Health & Safety | 1440x1566 | 22 |
| Help & Support | 4875x5712 | 122 |
| Notifications | 1440x1097 | 38 |
| HR Inbox | 1440x1425 | 39 |
| User Profile | 2458x1097 | 58 |

Run the tests yourself:

```bash
FIGMA_TOKEN=figd_xxx npx tsx tests/manual/visual-compare.ts <file_key>
```

## Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run dev          # Run with tsx (dev mode)
npm test             # Run 103 unit tests
npm run test:watch   # Watch mode
```

### Manual tests

```bash
# Connection test
FIGMA_TOKEN=figd_xxx npx tsx tests/manual/test-tools.ts

# Test with a specific file
FIGMA_TOKEN=figd_xxx npx tsx tests/manual/test-tools.ts <file_key>

# Visual comparison (PNG + HTML + Puppeteer screenshots)
FIGMA_TOKEN=figd_xxx npx tsx tests/manual/visual-compare.ts <file_key>
```

## Project Structure

```
src/
├── index.ts                  # Entry point (STDIO transport)
├── server.ts                 # MCP server + tool registration
├── config/
│   └── token-manager.ts      # Token + file history (env + config file)
├── api/
│   ├── figma-client.ts       # Figma REST API client
│   └── types.ts              # TypeScript types for Figma API
├── tools/                    # 9 MCP tools
│   ├── browse.ts             # figma_browse (entry point + file search)
│   ├── set-token.ts
│   ├── test-connection.ts
│   ├── list-projects.ts
│   ├── list-files.ts
│   ├── get-file-info.ts
│   ├── get-page.ts
│   ├── get-node.ts
│   └── figma-to-html.ts      # HTML converter + SVG export
├── converter/                # Figma-to-HTML engine
│   ├── index.ts              # convertNodeToHtml() + collectVectorNodeIds()
│   ├── node-handlers.ts      # Per-type rendering (FRAME, TEXT, VECTOR...)
│   ├── style-builder.ts      # Figma properties → CSS
│   ├── layout-resolver.ts    # Auto-layout → flexbox
│   ├── paint-resolver.ts     # Fills/strokes → background, border, color
│   ├── effect-resolver.ts    # Shadows/blur → box-shadow, filter
│   ├── typography-resolver.ts
│   └── html-formatter.ts     # Indentation + <style> block
└── utils/
    ├── color.ts              # RGBA (0-1) → CSS hex/rgba
    ├── logger.ts             # stderr-only logger
    ├── url-parser.ts         # Figma URL → file key, team ID, etc.
    └── svg-downloader.ts     # Download SVGs to local files
```

## Requirements

- Node.js >= 18
- Claude Code (CLI, Desktop, or IDE extension)

## License

MIT
