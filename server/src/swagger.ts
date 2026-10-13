import swaggerJsdoc from "swagger-jsdoc";

// Builds the OpenAPI spec by scanning JSDoc @openapi comments in the route
// files listed under `apis`. As you annotate more route files, they're
// picked up automatically — nothing else to wire in.
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "BugBoard API",
      version: "1.0.0",
      description:
        "REST API for BugBoard — a multi-team bug tracker with role-based permissions and an enforced bug lifecycle.",
    },
    servers: [{ url: "http://localhost:4000", description: "Local dev server" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        // NOTE: adjust the "user" fields here if your actual /register,
        // /login, /me responses include more/different fields than this.
        AuthResponse: {
          type: "object",
          properties: {
            token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
            user: {
              type: "object",
              properties: {
                id: { type: "string", example: "6ac62dbabd81ee5240778a52" },
                name: { type: "string", example: "Mobile Admin" },
                email: { type: "string", example: "mobile-admin@example.com" },
              },
            },
          },
        },
        Team: {
          type: "object",
          properties: {
            id: { type: "string", example: "6ab28e3e9ccfdbc2eb406814" },
            name: { type: "string", example: "Mobile Team" },
            key: { type: "string", example: "MOB" },
            createdBy: { type: "string", example: "6ac62dbabd81ee5240778a52" },
          },
        },
        Member: {
          type: "object",
          properties: {
            userId: { type: "string", example: "6ac62dbabd81ee5240778a52" },
            name: { type: "string", example: "Mobile Admin" },
            email: { type: "string", example: "mobile-admin@example.com" },
            role: { type: "string", enum: ["admin", "developer", "qa"] },
          },
        },
        Attachment: {
          type: "object",
          properties: {
            url: { type: "string" },
            filename: { type: "string" },
            mimetype: { type: "string" },
            uploadedBy: { type: "string" },
          },
        },
        Bug: {
          type: "object",
          properties: {
            id: { type: "string", example: "6b1f2e3e9ccfdbc2eb406820" },
            team: { type: "string", example: "6ab28e3e9ccfdbc2eb406814" },
            title: { type: "string", example: "Safari login hangs after password change" },
            description: { type: "string" },
            stepsToReproduce: { type: "array", items: { type: "string" } },
            expectedResult: { type: "string" },
            actualResult: { type: "string" },
            environment: {
              type: "object",
              properties: {
                device: { type: "string" },
                browser: { type: "string" },
              },
            },
            severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            status: {
              type: "string",
              enum: ["open", "in_progress", "fixed", "verified", "closed", "reopened"],
            },
            reporter: { type: "string" },
            assignee: { type: "string", nullable: true },
            labels: { type: "array", items: { type: "string" } },
            attachments: {
              type: "array",
              items: { $ref: "#/components/schemas/Attachment" },
            },
            linkedBugs: { type: "array", items: { type: "string" } },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Comment: {
          type: "object",
          properties: {
            id: { type: "string" },
            bug: { type: "string" },
            author: { type: "string" },
            text: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Activity: {
          type: "object",
          properties: {
            id: { type: "string" },
            bug: { type: "string" },
            actor: { type: "object", description: "Populated user — not id-normalized, see your toJSON notes" },
            action: {
              type: "string",
              enum: [
                "status_changed",
                "assigned",
                "unassigned",
                "comment_added",
                "attachment_added",
                "attachment_removed",
                "bug_updated",
              ],
            },
            meta: { type: "object" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        MessageResponse: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
    // Most endpoints require a Bearer token — set as the default here and
    // overridden per-route (security: []) where it doesn't apply, e.g. login/register.
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);