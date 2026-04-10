# ZenRequest English Manual

> A tutorial-style manual for new and returning users. It first gets you through the smallest successful workflow, then reorganizes the product into capability chapters you can revisit later.

## How to read this manual

If this is your first time using ZenRequest, read these sections in order:

1. [What to check after the first launch](#what-to-check-after-the-first-launch)
2. [Send your first HTTP request](#send-your-first-http-request)
3. [Understand responses, history, and replay](#understand-responses-history-and-replay)
4. [Start with the MCP workbench](#start-with-the-mcp-workbench)
5. [Connect to a local MCP server through stdio](#connect-to-a-local-mcp-server-through-stdio)

If you already know the main workflow, you can jump straight to the capability chapters:

- [HTTP request debugging](#http-request-debugging)
- [MCP workbench](#mcp-workbench)
- [Import and workspace organization](#import-and-workspace-organization)
- [History and replay](#history-and-replay)
- [Stdio usage notes](#stdio-usage-notes)

---

## What to check after the first launch

ZenRequest is a **local-first, lightweight, offline-first** desktop API workbench. It is not built around accounts, cloud sync, or team collaboration. It is built around the real workflow of developers who frequently debug APIs, reproduce issues, and validate protocols on their own machine.

After the first launch, check these three areas first:

- **Workspace and environment area**: switch the active workspace and environment-variable context
- **Request workbench**: create HTTP or MCP requests
- **Settings and help entry**: open the top settings area to jump into the in-app help entry that routes to repository docs

If you only want to confirm the app works, the simplest path is to send one HTTP request first and then explore the MCP workflow later.

![Main workspace overview](./assets/screenshots/phase-14/main-workspace-overview.png)

---

## Send your first HTTP request

The main ZenRequest workbench is built around the highest-frequency loop: **compose request → execute request → inspect response**.

Start with this path:

1. Open a new request tab
2. Select HTTP mode
3. Enter the request URL
4. Fill in the method, params, headers, or body when needed
5. Click send
6. Inspect the result in the response panel

At this stage, you do not need to understand every editing capability at once. Focus on the core chain first:

- URL and method define the target
- Params, headers, and body are supporting inputs
- The response panel is the main place to confirm results, diagnose failures, and keep debugging context

If the API requires variables or authentication, you can configure environment variables and auth later, but the best first-run experience is still the simplest successful request.

![First HTTP request flow](./assets/screenshots/phase-14/first-http-request.png)

---

## Understand responses, history, and replay

After the first successful request, ZenRequest becomes more than a request sender. Its value is that it preserves execution context so you can reuse and inspect it later.

Focus on these three capabilities:

### Response viewing

The response panel is not only for reading the response body. It also helps you understand:

- whether the request succeeded
- whether the result is structured JSON, HTML, or an error
- MCP protocol output and runtime diagnostics

### History

History keeps the requests you executed recently so you can:

- look back at the request that worked last time
- compare different attempts
- reopen an earlier execution context quickly

### Replay

When you already have a useful history entry, you can replay it directly instead of rebuilding it from scratch. This matters when you are checking regressions, re-validating behavior, or reproducing a bug.

![Response and history workflow](./assets/screenshots/phase-14/response-history-replay.png)

---

## Start with the MCP workbench

When you need to test an MCP server instead of a standard HTTP API, switch to MCP mode.

The MCP workbench is not meant to be an everything-client for every possible MCP scenario. It is a debugging workbench focused on validating MCP server behavior.

In the current version, the core flow centers on:

- `initialize`
- `tools.list`
- `tools.call`
- basic support for `resources`, `prompts`, `roots`, and `stdio`

If you are new to MCP, the most practical sequence is:

1. Run `initialize`
2. Run `tools.list`
3. Pick one tool and run `tools.call`

This gives you a better intuition for session flow and tool invocation before you get lost in raw protocol details.

![MCP workbench basics](./assets/screenshots/phase-14/mcp-workbench-basics.png)

---

## Connect to a local MCP server through stdio

If your MCP server runs as a local process instead of being exposed over HTTP, use the `stdio` transport.

ZenRequest already includes first-run `stdio` guidance in the product. This manual extends that path with the full mental model.

### Smallest successful path

The simplest `stdio` workflow is:

1. Switch the MCP transport to `stdio`
2. Fill in `command`
3. Add `args` only when needed
4. Add `cwd` only when a specific working directory is required
5. Run a basic MCP operation first to confirm the connection

### How to think about the three key fields

#### `command`

This is the command that launches the local MCP server process. The safest approach is:

- enter the exact command you already run in your terminal
- optimize for a successful launch first, not for abstraction

#### `args`

These are the extra arguments passed to `command`. You only need them when the real startup command already includes arguments.

For example:

- `node`
- args: `dist/index.js stdio`

#### `cwd`

This is the working directory. You only need it when the service depends on a specific project folder, config location, or relative paths.

If the server works in your terminal but fails in the workbench, check these first:

- whether `command` is correct
- whether the `args` order matches the terminal command exactly
- whether `cwd` points to the directory the server actually expects

![Stdio onboarding fields](./assets/screenshots/phase-14/stdio-onboarding-fields.png)

---

## HTTP request debugging

When you use ZenRequest as a day-to-day HTTP debugging tool, these are the capabilities you will return to most often:

- URL and method editing
- query parameters
- request headers
- body editing (JSON, raw text, form, binary)
- authentication
- mock templates
- assertion tests

The best way to use them is not to fill every field immediately. Move from **smallest successful request → incremental detail**, so it stays obvious which part caused the failure.

---

## MCP workbench

The MCP workbench is useful when you need to:

- verify that an MCP server initializes correctly
- inspect tool lists, tool schemas, and tool inputs
- check how `resources`, `prompts`, and `roots` behave in the current implementation
- keep history and replay entries for repeated protocol validation

When working in MCP mode, separate **protocol understanding** from **result validation**:

- confirm the operation type first
- confirm the input shape next
- then use the response and diagnostics to decide whether the problem is in the connection layer, protocol layer, or business logic

---

## Import and workspace organization

ZenRequest is not only a temporary request sender. You can gradually turn existing assets into a reusable local debugging workspace.

Current mainline capabilities include:

- workspace import / export
- importing cURL into editable request drafts
- collections and saved-request management
- environment variables and template resolution

An efficient workflow looks like this:

1. import an existing cURL command or request example
2. organize it into saved requests or collections
3. configure environment variables to reduce repeated edits
4. use history and replay to preserve stable verification paths

---

## History and replay

History and replay are two of the clearest ways ZenRequest differs from a one-off request sender.

They are especially useful when you need to:

- rerun a request that already worked
- compare the results from two different inputs
- preserve your local debugging trail while reproducing a production issue
- replay an MCP debugging chain and verify that the issue reproduces consistently

If you often find yourself explaining “how it worked last time,” you should lean on history and replay more aggressively instead of rebuilding requests each time.

---

## Stdio usage notes

`stdio` is a good fit for local process-based MCP servers, but it is also more sensitive to runtime environment details than HTTP mode. These principles make it more reliable:

- get the startup command working in your terminal first, then move it into the workbench
- do not assume every failure is a protocol problem; many failures come from command path, argument order, or working-directory issues
- start by validating a simple operation such as `initialize`
- once it works, keep history and stable config around so you do not have to rediscover the same setup repeatedly

When you see in-product onboarding content, treat it as the **smallest successful path**. This manual extends that into a stable, reusable way of working.

---

## How README and in-app help work together

In the current version, you have two primary documentation entry points:

- **In-app settings → help entry**: jumps from the product into repository docs
- **README**: the quick entry and navigation hub on the repository home page

The recommended relationship is:

- in-app help gets you to the right documentation entry
- README helps you decide which document to read next
- the English manual provides the continuous learning path

---

## What to read next

If you already completed the first-run flow, the best next steps are:

1. return to the capability chapter you use most often through `README.en.md`
2. turn one real API or MCP debugging flow into a reusable workspace asset
