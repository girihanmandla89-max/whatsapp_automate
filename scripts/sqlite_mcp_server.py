import sys
import json
import sqlite3
import os

DB_PATH = os.environ.get("SQLITE_DB_PATH", r"E:\whatsapp automation\data\app_database.sqlite")

def send_response(response):
    line = json.dumps(response)
    sys.stdout.write(f"Content-Length: {len(line)}\r\n\r\n{line}")
    sys.stdout.flush()

def read_message():
    line = sys.stdin.readline()
    if not line:
        return None
    line = line.strip()
    if not line:
        return None
    
    # Check for Content-Length header or plain JSON
    if line.startswith("Content-Length:"):
        length = int(line.split(":")[1].strip())
        sys.stdin.readline() # blank line
        content = sys.stdin.read(length)
        return json.loads(content)
    else:
        try:
            return json.loads(line)
        except Exception:
            return None

def handle_request(req):
    method = req.get("method")
    req_id = req.get("id")

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "sqlite-whatsapp-db",
                    "version": "1.0.0"
                }
            }
        }

    if method == "notifications/initialized":
        return None

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": [
                    {
                        "name": "read_query",
                        "description": "Execute a SELECT query against the WhatsApp automation SQLite database.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "The SQL SELECT query to execute"
                                }
                            },
                            "required": ["query"]
                        }
                    },
                    {
                        "name": "list_tables",
                        "description": "List all tables available in the SQLite database.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {}
                        }
                    },
                    {
                        "name": "describe_table",
                        "description": "Show the schema and column definitions for a specific table.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "table_name": {
                                    "type": "string",
                                    "description": "Name of the table"
                                }
                            },
                            "required": ["table_name"]
                        }
                    }
                ]
            }
        }

    if method == "tools/call":
        params = req.get("params", {})
        tool_name = params.get("name")
        args = params.get("arguments", {})

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        try:
            if tool_name == "list_tables":
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
                tables = [r[0] for r in cursor.fetchall()]
                conn.close()
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "content": [
                            {"type": "text", "text": json.dumps(tables, indent=2)}
                        ]
                    }
                }

            elif tool_name == "describe_table":
                tname = args.get("table_name", "")
                cursor.execute(f"PRAGMA table_info({tname});")
                cols = cursor.fetchall()
                conn.close()
                columns_info = [{"cid": c[0], "name": c[1], "type": c[2], "notnull": c[3], "dflt_value": c[4], "pk": c[5]} for c in cols]
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "content": [
                            {"type": "text", "text": json.dumps(columns_info, indent=2)}
                        ]
                    }
                }

            elif tool_name == "read_query":
                sql = args.get("query", "")
                cursor.execute(sql)
                rows = cursor.fetchall()
                col_names = [desc[0] for desc in cursor.description] if cursor.description else []
                conn.close()
                results = [dict(zip(col_names, row)) for row in rows]
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "content": [
                            {"type": "text", "text": json.dumps(results, default=str, indent=2)}
                        ]
                    }
                }

            conn.close()
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"}
            }
        except Exception as e:
            conn.close()
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {"type": "text", "text": f"Error: {str(e)}"}
                    ],
                    "isError": True
                }
            }

    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": -32601, "message": f"Unknown method: {method}"}
    }

def main():
    while True:
        try:
            req = read_message()
            if req is None:
                break
            res = handle_request(req)
            if res:
                # Output in JSON Lines format standard for MCP stdio
                sys.stdout.write(json.dumps(res) + "\n")
                sys.stdout.flush()
        except Exception:
            break

if __name__ == "__main__":
    main()
