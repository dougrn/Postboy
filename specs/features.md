# Feature Specification - Postboy

## 1. Request Builder
- **Methods**: GET, POST, PUT, DELETE, PATCH.
- **Dynamic URL**: Supports environment variables in the URL string.
- **Parameters**: Key-value table for query params.
- **Headers**: Custom header management.
- **Body**: Support for JSON, Raw Text, GraphQL, and Multipart/Form-Data (File Uploads).
- **Editor**: Monaco Editor integrated for advanced syntax highlighting and code editing.
- **Auth**: Bearer and Basic Auth presets.

## 2. Protocol Support
- **HTTP/HTTPS**: Full async execution engine via HTTPX.
- **WebSocket**: Native WS client tab with connection management, message sending, and log history via backend proxy.
- **GraphQL**: Dedicated query and variables editor with proxy execution.

## 3. Collections Management
- **Hierarchical Folders**: Group requests by nested folders within collections.
- **Persistence**: Auto-saves state to local disk JSON files.
- **Actions**: Create, Rename, Delete, Duplicate, and Drag-and-drop support.

## 4. Environment Variables
- **Variable Scoping**: Switch between different environments (e.g., Local, Prod).
- **Tag Syntax**: Use `{{variable_name}}` anywhere in your request (URL, body, headers).
- **Management**: Bulk edit variables via a simple `key=value` interface.

## 5. Automation and Scripting
- **Pre-request Scripts**: Sandboxed JavaScript execution before request is fired to manipulate payload/headers.
- **Post-request Tests**: Validation logic executed against the response object to generate Pass/Fail test results.
- **Developer Console**: Integrated terminal to write JS, debug requests, and log outputs manually.

## 6. Response Handling
- **Status Codes**: Color-coded success/error indicators.
- **Performance**: Response time tracking in milliseconds.
- **Interactive JSON Viewer**: Integration with jsoneditor for expandable/collapsible node visualization.
- **Large Payloads**: Specialized CSS flexbox layout to handle scrollable multi-MB responses without freezing.

## 7. Interoperability
- **Postman Import**: Compatibility with Postman Collection v2.1 exports.
- **History**: Automatically keeps track of previous requests with auto-pruning (max 100 entries).
- **Tab Persistence**: LocalStorage persistence for active tabs with keyboard shortcuts (Ctrl+1 to Ctrl+7).