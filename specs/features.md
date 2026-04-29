# Feature Specification - Postboy

## 1. Request Builder
- **Methods**: GET, POST, PUT, DELETE, PATCH.
- **Dynamic URL**: Supports environment variables in the URL string.
- **Parameters**: Key-value table for query params.
- **Headers**: Custom header management.
- **Body**: Support for JSON and Raw Text.
- **Auth**: Bearer and Basic Auth presets.

## 2. Collections Management
- **Folders**: Group requests by project or feature area.
- **Persistence**: Auto-saves state to local disk.
- **Actions**: Create, Rename, Delete, and Toggle visibility.

## 3. Environment Variables
- **Variable Scoping**: Switch between different environments (e.g., Local, Prod).
- **Tag Syntax**: Use `{{variable_name}}` anywhere in your request.
- **Management**: Bulk edit variables via a simple `key=value` interface.

## 4. Response Handling
- **Status Codes**: Color-coded success/error indicators.
- **Performance**: Response time tracking in milliseconds.
- **Large Payloads**: Specialized CSS flexbox layout to handle scrollable multi-MB responses without freezing.
- **Formatting**: Automatic JSON prettification.

## 5. Interoperability
- **Postman Import**: Compatibility with Postman Collection v2.1 exports.
- **History**: Automatically keeps track of previous requests.
