// ─── Figma API Response Types ───

export interface FigmaUser {
  id: string;
  email: string;
  handle: string;
  img_url: string;
}

export interface FigmaFileResponse {
  name: string;
  lastModified: string;
  version: string;
  thumbnailUrl: string;
  editorType: string;
  document: FigmaNode;
  components: Record<string, FigmaComponent>;
  styles: Record<string, FigmaStyle>;
  schemaVersion: number;
}

export interface FigmaFileNodesResponse {
  name: string;
  lastModified: string;
  nodes: Record<string, { document: FigmaNode }>;
}

export interface FigmaTeamProjectsResponse {
  projects: FigmaProject[];
}

export interface FigmaProject {
  id: string;
  name: string;
}

export interface FigmaProjectFilesResponse {
  files: FigmaFileMeta[];
}

export interface FigmaFileMeta {
  key: string;
  name: string;
  thumbnail_url: string;
  last_modified: string;
}

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  componentSetId?: string;
}

export interface FigmaStyle {
  key: string;
  name: string;
  styleType: string;
  description: string;
}

// ─── Node Types ───

export type FigmaNodeType =
  | "DOCUMENT"
  | "CANVAS"
  | "FRAME"
  | "GROUP"
  | "SECTION"
  | "COMPONENT"
  | "COMPONENT_SET"
  | "INSTANCE"
  | "RECTANGLE"
  | "ELLIPSE"
  | "POLYGON"
  | "STAR"
  | "LINE"
  | "VECTOR"
  | "BOOLEAN_OPERATION"
  | "TEXT"
  | "SLICE";

export interface FigmaNode {
  id: string;
  name: string;
  type: FigmaNodeType;
  visible?: boolean;
  locked?: boolean;
  children?: FigmaNode[];
  opacity?: number;
  blendMode?: string;

  // Geometry
  absoluteBoundingBox?: FigmaBoundingBox;
  absoluteRenderBounds?: FigmaBoundingBox;
  size?: { x: number; y: number };
  relativeTransform?: number[][];
  rotation?: number;
  constraints?: FigmaLayoutConstraint;
  clipsContent?: boolean;

  // Layout (Auto-layout)
  layoutMode?: "HORIZONTAL" | "VERTICAL" | "NONE";
  primaryAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "BASELINE";
  primaryAxisSizingMode?: "FIXED" | "AUTO";
  counterAxisSizingMode?: "FIXED" | "AUTO";
  layoutSizingHorizontal?: "FIXED" | "HUG" | "FILL";
  layoutSizingVertical?: "FIXED" | "HUG" | "FILL";
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  counterAxisSpacing?: number;
  layoutWrap?: "NO_WRAP" | "WRAP";
  layoutAlign?: "INHERIT" | "STRETCH" | "MIN" | "MAX" | "CENTER";
  layoutGrow?: number;
  layoutPositioning?: "AUTO" | "ABSOLUTE";

  // Visual
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  strokeAlign?: "INSIDE" | "CENTER" | "OUTSIDE";
  strokeDashes?: number[];
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
  effects?: FigmaEffect[];

  // Text
  characters?: string;
  style?: FigmaTypeStyle;
  characterStyleOverrides?: number[];
  styleOverrideTable?: Record<string, FigmaTypeStyle>;
}

export interface FigmaBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FigmaLayoutConstraint {
  horizontal: "LEFT" | "RIGHT" | "CENTER" | "LEFT_RIGHT" | "SCALE";
  vertical: "TOP" | "BOTTOM" | "CENTER" | "TOP_BOTTOM" | "SCALE";
}

// ─── Paint / Color / Effect ───

export interface FigmaPaint {
  type: "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" | "IMAGE" | "EMOJI";
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
  gradientHandlePositions?: FigmaVector[];
  gradientStops?: FigmaGradientStop[];
  scaleMode?: string;
  imageRef?: string;
  blendMode?: string;
}

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaVector {
  x: number;
  y: number;
}

export interface FigmaGradientStop {
  position: number;
  color: FigmaColor;
}

export interface FigmaEffect {
  type: "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR";
  visible?: boolean;
  radius: number;
  color?: FigmaColor;
  offset?: FigmaVector;
  spread?: number;
  blendMode?: string;
}

// ─── Comments ───

export interface FigmaCommentUser {
  handle: string;
  img_url: string;
  id: string;
}

export interface FigmaCommentClientMeta {
  node_id?: string | null;
  node_offset?: { x: number; y: number } | null;
}

export interface FigmaComment {
  id: string;
  message: string;
  created_at: string;
  resolved_at: string | null;
  user: FigmaCommentUser;
  client_meta: FigmaCommentClientMeta | null;
  order_id: string;
  parent_id: string;
}

export interface FigmaCommentsResponse {
  comments: FigmaComment[];
}

// ─── Annotations (Dev Mode) ───

export interface FigmaAnnotation {
  label: string;
  description: string;
  annotation_type?: string;
}

export interface FigmaAnnotatedNode {
  document: FigmaNode & {
    annotations?: FigmaAnnotation[];
  };
}

// ─── Typography ───

export interface FigmaTypeStyle {
  fontFamily?: string;
  fontPostScriptName?: string;
  fontWeight?: number;
  fontSize?: number;
  textAlignHorizontal?: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
  textAlignVertical?: "TOP" | "CENTER" | "BOTTOM";
  letterSpacing?: number;
  lineHeightPx?: number;
  lineHeightPercent?: number;
  lineHeightPercentFontSize?: number;
  lineHeightUnit?: "PIXELS" | "FONT_SIZE_%" | "INTRINSIC_%";
  textCase?: "ORIGINAL" | "UPPER" | "LOWER" | "TITLE";
  textDecoration?: "NONE" | "UNDERLINE" | "STRIKETHROUGH";
  italic?: boolean;
  fills?: FigmaPaint[];
}
