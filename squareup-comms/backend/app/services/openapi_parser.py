"""OpenAPI 3.x spec parser — converts operations into CustomTool-compatible dicts.

Accepts an OpenAPI spec (JSON or YAML-like dict) from a URL or inline,
parses each ``path + method`` into a tool definition ready for the
``POST /api/custom-tools`` endpoint.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field

import httpx

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ParsedTool:
    """One tool generated from an OpenAPI operation."""

    name: str
    display_name: str
    description: str
    category: str
    input_schema: dict
    config: dict  # url_template, method, headers, body_template


@dataclass(frozen=True)
class OpenAPIImportResult:
    """Result of parsing an OpenAPI spec."""

    title: str
    version: str
    base_url: str
    tools: tuple[ParsedTool, ...]
    skipped: tuple[str, ...] = ()
    errors: tuple[str, ...] = ()


# ---------------------------------------------------------------------------
# Fetcher
# ---------------------------------------------------------------------------

async def fetch_openapi_spec(url: str) -> dict:
    """Fetch an OpenAPI spec from a URL and return as a dict."""
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()


# ---------------------------------------------------------------------------
# Parser
# ---------------------------------------------------------------------------

def parse_openapi_spec(
    spec: dict,
    *,
    base_url_override: str | None = None,
    auth_header: dict | None = None,
    category: str = "external",
    filter_operation_ids: list[str] | None = None,
    filter_tags: list[str] | None = None,
    max_tools: int = 50,
) -> OpenAPIImportResult:
    """Parse an OpenAPI 3.x spec dict into tool definitions.

    Parameters
    ----------
    spec:
        Parsed OpenAPI 3.x JSON object.
    base_url_override:
        Override the server URL from the spec.
    auth_header:
        Extra headers to inject (e.g. ``{"Authorization": "Bearer xxx"}``).
    category:
        Category for all generated tools.
    filter_operation_ids:
        If provided, only import operations with matching ``operationId``.
    filter_tags:
        If provided, only import operations that have at least one matching tag.
    max_tools:
        Safety cap on the number of tools to import.
    """
    info = spec.get("info", {})
    title = info.get("title", "Untitled API")
    version = info.get("version", "1.0.0")

    # Resolve base URL
    base_url = base_url_override or _extract_base_url(spec)
    base_url = base_url.rstrip("/")

    paths = spec.get("paths", {})
    tools: list[ParsedTool] = []
    skipped: list[str] = []
    errors: list[str] = []

    for path, path_item in paths.items():
        if not isinstance(path_item, dict):
            continue
        for method in ("get", "post", "put", "patch", "delete"):
            operation = path_item.get(method)
            if operation is None or not isinstance(operation, dict):
                continue

            op_id = operation.get("operationId", "")
            op_tags = operation.get("tags", [])

            # Apply filters
            if filter_operation_ids and op_id not in filter_operation_ids:
                skipped.append(f"{method.upper()} {path} ({op_id})")
                continue
            if filter_tags and not set(op_tags).intersection(filter_tags):
                skipped.append(f"{method.upper()} {path} ({op_id})")
                continue

            try:
                tool = _operation_to_tool(
                    base_url=base_url,
                    path=path,
                    method=method,
                    operation=operation,
                    spec=spec,
                    auth_header=auth_header or {},
                    category=category,
                )
                tools.append(tool)
            except Exception as exc:
                errors.append(f"{method.upper()} {path}: {exc}")

            if len(tools) >= max_tools:
                break
        if len(tools) >= max_tools:
            break

    return OpenAPIImportResult(
        title=title,
        version=version,
        base_url=base_url,
        tools=tuple(tools),
        skipped=tuple(skipped),
        errors=tuple(errors),
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_base_url(spec: dict) -> str:
    """Extract the first server URL from the spec."""
    servers = spec.get("servers", [])
    if servers and isinstance(servers, list) and isinstance(servers[0], dict):
        return servers[0].get("url", "https://api.example.com")
    return "https://api.example.com"


def _operation_to_tool(
    base_url: str,
    path: str,
    method: str,
    operation: dict,
    spec: dict,
    auth_header: dict,
    category: str,
) -> ParsedTool:
    """Convert a single OpenAPI operation to a ParsedTool."""
    op_id = operation.get("operationId", "")
    summary = operation.get("summary", "")
    description = operation.get("description", summary)

    # Generate a clean tool name
    tool_name = _make_tool_name(op_id, method, path)
    display_name = summary or _humanise_name(tool_name)

    # Collect parameters
    parameters = operation.get("parameters", [])
    path_params: list[dict] = []
    query_params: list[dict] = []
    header_params: list[dict] = []

    for param in parameters:
        param = _resolve_ref(param, spec)
        location = param.get("in", "query")
        if location == "path":
            path_params.append(param)
        elif location == "query":
            query_params.append(param)
        elif location == "header":
            header_params.append(param)

    # Build input_schema from params + request body
    properties: dict[str, dict] = {}
    required: list[str] = []

    for p in path_params:
        prop_name = p["name"]
        properties[prop_name] = _param_to_schema(p)
        required.append(prop_name)

    for p in query_params:
        prop_name = p["name"]
        properties[prop_name] = _param_to_schema(p)
        if p.get("required"):
            required.append(prop_name)

    # Request body
    body_schema = _extract_request_body_schema(operation, spec)
    has_body = body_schema is not None
    if body_schema:
        body_props = body_schema.get("properties", {})
        body_required = body_schema.get("required", [])
        for prop_name, prop_schema in body_props.items():
            properties[prop_name] = _simplify_schema(prop_schema)
            if prop_name in body_required:
                required.append(prop_name)

    input_schema: dict = {"type": "object", "properties": properties}
    if required:
        input_schema["required"] = required

    # Build URL template: replace {param} with {param} (already in that format)
    url_template = base_url + path
    # Add query parameters as template placeholders
    if query_params:
        qparts = []
        for qp in query_params:
            qname = qp["name"]
            qparts.append(f"{qname}={{{qname}}}")
        url_template += "?" + "&".join(qparts)

    # Build headers
    headers: dict[str, str] = {**auth_header}
    if has_body:
        headers["Content-Type"] = "application/json"
    for hp in header_params:
        hname = hp["name"]
        headers[hname] = f"{{{hname}}}"

    # Build config matching the HTTP tool format
    config: dict = {
        "url_template": url_template,
        "method": method.upper(),
        "headers": headers,
        "body_template": None,
        "openapi_path": path,
        "openapi_operation_id": op_id,
    }

    # If there's a body, create a body template with placeholders
    if has_body and body_schema:
        body_template: dict = {}
        for prop_name in body_schema.get("properties", {}):
            body_template[prop_name] = f"{{{prop_name}}}"
        config["body_template"] = body_template

    # Build description for LLM
    tool_description = description or display_name
    if not tool_description:
        tool_description = f"{method.upper()} {path}"

    return ParsedTool(
        name=tool_name,
        display_name=display_name[:200],
        description=tool_description[:2000],
        category=category,
        input_schema=input_schema,
        config=config,
    )


def _make_tool_name(op_id: str, method: str, path: str) -> str:
    """Generate a clean snake_case tool name."""
    if op_id:
        # Convert camelCase/PascalCase to snake_case
        name = re.sub(r"(?<=[a-z0-9])([A-Z])", r"_\1", op_id)
        name = re.sub(r"[^a-zA-Z0-9]", "_", name).lower()
        name = re.sub(r"_+", "_", name).strip("_")
        return name

    # Fallback: method + path segments
    segments = [s for s in path.split("/") if s and not s.startswith("{")]
    name = f"{method}_{'_'.join(segments)}"
    name = re.sub(r"[^a-z0-9_]", "_", name.lower())
    name = re.sub(r"_+", "_", name).strip("_")
    return name


def _humanise_name(snake_name: str) -> str:
    """Convert a snake_case name to a human-readable title."""
    return snake_name.replace("_", " ").title()


def _resolve_ref(obj: dict, spec: dict) -> dict:
    """Resolve a ``$ref`` pointer to the referenced object."""
    ref = obj.get("$ref")
    if not ref or not isinstance(ref, str):
        return obj
    parts = ref.lstrip("#/").split("/")
    resolved = spec
    for part in parts:
        resolved = resolved.get(part, {})
        if not isinstance(resolved, dict):
            return obj
    return resolved


def _param_to_schema(param: dict) -> dict:
    """Convert an OpenAPI parameter to a JSON Schema property."""
    schema = param.get("schema", {})
    result: dict = {"type": schema.get("type", "string")}
    if param.get("description"):
        result["description"] = param["description"]
    if "enum" in schema:
        result["enum"] = schema["enum"]
    if "default" in schema:
        result["default"] = schema["default"]
    return result


def _extract_request_body_schema(operation: dict, spec: dict) -> dict | None:
    """Extract the JSON schema for the request body, if present."""
    body = operation.get("requestBody")
    if not body:
        return None
    body = _resolve_ref(body, spec)
    content = body.get("content", {})
    json_content = content.get("application/json", {})
    schema = json_content.get("schema", {})
    schema = _resolve_ref(schema, spec)
    if not schema or not schema.get("properties"):
        return None
    return schema


def _simplify_schema(schema: dict) -> dict:
    """Simplify a nested OpenAPI schema to a flat JSON Schema property."""
    result: dict = {"type": schema.get("type", "string")}
    if schema.get("description"):
        result["description"] = schema["description"]
    if "enum" in schema:
        result["enum"] = schema["enum"]
    if "default" in schema:
        result["default"] = schema["default"]
    if schema.get("type") == "array" and "items" in schema:
        result["items"] = _simplify_schema(schema["items"])
    return result
