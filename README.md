# Neat Catch 🎯

![Status](https://img.shields.io/badge/Status-Active-green)
[![npm version](https://img.shields.io/npm/v/neat-catch)](https://www.npmjs.com/package/neat-catch)
![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)
[![license](https://img.shields.io/npm/l/neat-catch)](https://github.com/Dforrunner/neat-catch/blob/main/LICENSE)
![bundle size](https://img.shields.io/bundlephobia/min/neat-catch)
![node](https://img.shields.io/node/v/neat-catch)

A comprehensive utility library for elegant error handling in TypeScript and JavaScript. Transform messy try-catch blocks into clean, readable tuple-based results.

## 🚀 Why neat-catch?

- **🔄 Universal**: Handle both synchronous and asynchronous operations seamlessly
- **📦 Type-safe**: Full TypeScript support with intelligent type inference
- **🎨 Clean API**: Transform errors into readable `[data, error]` tuples
- **🛠 Comprehensive**: Multiple utilities for different error handling scenarios
- **⚡ Zero dependencies**: Lightweight and fast
- **🌐 Universal**: Works in Node.js, browsers, and edge runtimes

## 📦 Installation

```bash
pnpm install neat-catch
# or
npm install neat-catch
# or
yarn add neat-catch
```

## 🎯 Quick Start

```typescript
import { neatCatch } from "neat-catch";

// Synchronous operations
const [result, error] = neatCatch(() => JSON.parse('{"hello": "world"}'));

if (error) {
  // ...handle error
}

// Asynchronous operations
const [data, fetchError] = await neatCatch(async () => {
  const response = await fetch("/api/users");
  return response.json();
});

if (fetchError) {
  // ...handle error
}
```

# API Reference

## Core Functions

<details>
<summary><code>neatCatch&lt;TFn, E&gt;(fn, errorTransformer?)</code></summary>

### Parameters

- `fn: TFn` - The sync or async function to execute
- `errorTransformer?: (error: unknown) => E` - Optional function to transform caught errors

### Returns

- For sync functions: `[ReturnType<TFn>, null] | [null, E]`
- For async functions: `Promise<[Awaited<ReturnType<TFn>>, null] | [null, E]>`

### Description

A utility function that executes a sync or async function and returns a tuple where the first element is the data (or null if error) and the second element is the error (or null if successful).

### Examples

```typescript
// Synchronous function
const [data, error] = neatCatch(() => {
  return JSON.parse('{"valid": "json"}');
});

if (error) {
  console.error("Parse failed:", error);
} else {
  console.log("Parsed data:", data);
}

// Asynchronous function
const [result, error] = await neatCatch(async () => {
  const response = await fetch("/api/data");
  return response.json();
});

// With error transformer
const [data, error] = await neatCatch(
  async () => fetch("/api/data"),
  (err) => `Network error: ${err}`
);
```

</details>

<details>
<summary><code>createNeatWrapper&lt;TArgs, TReturn, E&gt;(fn, errorTransformer?)</code></summary>

### Parameters

- `fn: (...args: TArgs) => TReturn | Promise<TReturn>` - The function to wrap (can be sync or async)
- `errorTransformer?: (error: unknown) => E` - Optional function to transform caught errors

### Returns

- For sync functions: `<TOverride = TReturn>(...args: TArgs) => [TOverride, null] | [null, E]`
- For async functions: `<TOverride = TReturn>(...args: TArgs) => Promise<[TOverride, null] | [null, E]>`

### Description

Creates a wrapped version of a function that always returns a neat tuple when called.

### Examples

```typescript
// Wrapping a synchronous function
const safeParse = createNeatWrapper(JSON.parse);
const [data, error] = safeParse('{"key": "value"}');
const [dataWithType, error2] = safeParse<{ key: "value" }>('{"key": "value"}');

// Wrapping an asynchronous function
const safeFetch = createNeatWrapper(fetch);
const [response, error] = await safeFetch("/api/data");

// With error transformer
const safeParseWithTransform = createNeatWrapper(
  JSON.parse,
  (err) => `JSON parsing failed: ${err}`
);

// Using with parameters
const safeCalculate = createNeatWrapper((a: number, b: number) => a / b);
const [result, error] = safeCalculate(10, 2); // [5, null]
const [result2, error2] = safeCalculate(10, 0); // [null, Error]
```

</details>

<details>
<summary><code>neatCatchAll&lt;T, E&gt;(operations, errorTransformer?)</code></summary>

### Parameters

- `operations: { [K in keyof T]: () => Promise<T[K]> }` - An array of functions returning Promises
- `errorTransformer?: (error: unknown) => E` - Optional function to transform caught errors

### Returns

```typescript
Promise<{
  results: { [K in keyof T]: T[K] | null } | null;
  errors: { [K in keyof T]: E | null } | null;
}>;
```

### Description

Utility for handling multiple async operations and collecting results/errors. The index of results and errors corresponds to the index of the input operations.

### Examples

Note that errors and results correspond to their index.

```typescript
// Multiple API calls
const [outcome] = await neatCatchAll([
  () => fetch("/api/users").then((r) => r.json()),
  () => fetch("/api/posts").then((r) => r.json()),
  () => fetch("/api/comments").then((r) => r.json()),
]);

if (outcome.errors) {
  console.log("Some operations failed:", outcome.errors);

  //or handle specific errors. If there wasn't an error for the given fetch call it'll be 'undefined'
  const [usersFetchError, postsFetchError, commentsFetchError] = outcome.errors;

  if (usersFetchError) {
    //handle error
  }
  if (postsFetchError) {
    //handle error
  }
  if (commentsFetchError) {
    //handle error
  }
}

if (outcome.results) {
  const [users, posts, comments] = outcome.results;
  console.log("Success results:", { users, posts, comments });
}

// With error transformer
const { results, errors } = await neatCatchAll(
  [() => Promise.resolve("success"), () => Promise.reject(new Error("failed"))],
  (err) => `Transformed: ${err}`
);
```

</details>

<details>
<summary><code>neatCatchRetry&lt;T, E&gt;(fn, options?)</code></summary>

### Parameters

- `fn: () => Promise<T>` - The async function to execute
- `options?: NeatCatchRetryOptions<E>` - Configuration options for retries

### Options

```typescript
type NeatCatchRetryOptions<E = Error> = {
  maxRetries?: number; // Default: 3
  delay?: number; // Default: 1000ms
  backoff?: "linear" | "exponential"; // Default: "exponential"
  errorTransformer?: (error: unknown, attempt: number) => E;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};
```

### Returns

`Promise<[T, null] | [null, E]>`

### Description

Utility for retrying operations with neat error handling and configurable retry strategies.

### Examples

```typescript
// Basic retry - will retry 3 times with 1s delay and exponential backoff by default
const [data, error] = await neatCatchRetry(async () => {
  const response = await fetch("/api/unreliable-endpoint");
  if (!response.ok) throw new Error("API failed");
  return response.json();
});

// With custom options
const [result, error] = await neatCatchRetry(fetchDataFromApiFn, {
  maxRetries: 5,
  delay: 2000,
  backoff: "linear",
  shouldRetry: (error, attempt) => {
    // Only retry on network errors
    return error instanceof TypeError && attempt < 3;
  },
  errorTransformer: (error, attempt) => ({
    message: `Failed after ${attempt} attempts: ${error}`,
    attempt,
  }),
});
```

</details>

## Error Transformers

<details>
<summary><code>errorTransformers.toString</code></summary>

### Parameters

- `error: unknown` - The error to transform

### Returns

`string` - Error message as string

### Description

Transforms any error into a simple message string.

### Example

```typescript
const [data, error] = neatCatch((): void => {
  throw new Error("Something went wrong");
}, errorTransformers.toString);
// error will be: "Something went wrong"
```

</details>

<details>
<summary><code>errorTransformers.toObject</code></summary>

### Parameters

- `error: unknown` - The error to transform

### Returns

```typescript
{
  message: string;
  stack?: string;
  name?: string;
  cause?: unknown;
}
```

### Description

Transforms errors into a structured object with message and stack information.

### Example

```typescript
const [data, error] = neatCatch((): void => {
  throw new TypeError("Invalid type");
}, errorTransformers.toObject);
// error will be: { message: "Invalid type", stack: "...", name: "TypeError" }
```

</details>

<details>
<summary><code>errorTransformers.withTimestamp</code></summary>

### Parameters

- `error: unknown` - The error to transform

### Returns

```typescript
{
  error: unknown;
  timestamp: number;
  isoString: string;
}
```

### Description

Transforms errors into a structured object with timestamp information.

### Example

```typescript
const [data, error] = neatCatch((): void => {
  throw new Error("Timestamped error");
}, errorTransformers.withTimestamp);
// error will be: { error: Error, timestamp: 1638360000000, isoString: "2021-12-01T12:00:00.000Z" }
```

</details>

<details>
<summary><code>errorTransformers.fetchError</code></summary>

### Parameters

- `error: unknown` - The error to transform

### Returns

```typescript
{
  message: string;
  status?: number;
  statusText?: string;
  url?: string;
  isNetworkError: boolean;
  isTimeout: boolean;
}
```

### Description

Transforms HTTP fetch errors into a structured format with network and timeout detection.

### Example

```typescript
const safeFetch = createNeatWrapper(fetch, errorTransformers.fetchError);
const [response, error] = await safeFetch("/api/data");

if (error) {
  if (error.isNetworkError) {
    console.log("Network issue detected");
  }
  if (error.status === 404) {
    console.log("Resource not found");
  }
}
```

</details>

<details>
<summary><code>errorTransformers.withContext</code></summary>

### Parameters

- `context: T` - Additional context to include with the error

### Returns

Function that transforms error: `(error: unknown) => T & { error: unknown }`

### Description

Wraps an error with additional context information.

### Example

```typescript
const [data, error] = neatCatch(
  () => processUserData(userId),
  errorTransformers.withContext({
    userId,
    operation: "processUserData",
    timestamp: Date.now(),
  })
);
// error will include the context along with the original error
```

</details>

<details>
<summary><code>errorTransformers.toSimpleError</code></summary>

### Parameters

- `error: unknown` - The error to transform

### Returns

`{ message: string }`

### Description

Simplifies errors by extracting only the message and discarding other properties.

### Example

```typescript
const [data, error] = neatCatch(() => {
  throw new Error("Simple error");
}, errorTransformers.toSimpleError);
// error will be: { message: "Simple error" }
```

</details>

<details>
<summary><code>errorTransformers.forLogging</code></summary>

### Parameters

- `error: unknown` - The error to transform

### Returns

```typescript
{
  message: string;
  stack?: string;
  name?: string;
  timestamp: number;
  environment?: string;
}
```

### Description

Transforms errors for logging purposes with detailed information including environment context.

### Example

```typescript
const [data, error] = neatCatch((): void => {
  throw new Error("Logging error");
}, errorTransformers.forLogging);
// error will include message, stack, timestamp, and NODE_ENV if available
```

</details>

## Type Definitions

<details>
<summary><code>NeatCatchResult&lt;T, E&gt;</code></summary>

### Definition

```typescript
type NeatCatchResult<T, E = Error> = [T, null] | [null, E];
```

### Description

Type utility representing the neat tuple result pattern used throughout the library.

### Example

```typescript
function processData(): NeatCatchResult<string> {
  try {
    return ["processed data", null];
  } catch (error) {
    return [null, error as Error];
  }
}
```

</details>

<details>
<summary><code>NeatCatchRetryOptions&lt;E&gt;</code></summary>

### Definition

```typescript
type NeatCatchRetryOptions<E = Error> = {
  maxRetries?: number;
  delay?: number;
  backoff?: "linear" | "exponential";
  errorTransformer?: (error: unknown, attempt: number) => E;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};
```

### Description

Configuration options for the `neatCatchRetry` function, allowing customization of retry behavior.

</details>

## Usage Patterns

### Basic Error Handling

```typescript
import neatCatch from "neat-catch";

// Simple usage
const [data, error] = await neatCatch(async () => {
  const response = await fetch("/api/data");
  return response.json();
});

if (error) {
  console.error("Operation failed:", error);
  return;
}

console.log("Success:", data);
```

### Function Wrapping

```typescript
import { createNeatWrapper, errorTransformers } from "neat-catch";

// Create reusable wrapped functions
const safeJsonParse = createNeatWrapper(JSON.parse, errorTransformers.toString);
const safeFetch = createNeatWrapper(fetch, errorTransformers.fetchError);

// Use throughout your application
const [parsed, parseError] = safeJsonParse(jsonString);
const [response, fetchError] = await safeFetch("/api/endpoint");

// Supports types
const [parsed, parseError] = safeJsonParse<JsonStringType>(jsonString);
const [response, fetchError] =
  await safeFetch<ApiResponseType>("/api/endpoint");
```

### Batch Operations

```typescript
import { neatCatchAll } from "neat-catch";

// Handle multiple async operations
const { results, errors } = await neatCatchAll([
  () => fetch("/api/users").then((r) => r.json()),
  () => fetch("/api/posts").then((r) => r.json()),
  () => fetchUserPreferences(userId),
]);

// Process results and errors with index correspondence
if (errors?.[0]) console.error("Users fetch failed:", errors[0]);
if (errors?.[1]) console.error("Posts fetch failed:", errors[1]);
if (results?.[0]) console.log("Users:", results[0]);
```

### Retry Operations

```typescript
import { neatCatchRetry } from "neat-catch";

// Retry with exponential backoff
const [data, error] = await neatCatchRetry(unstableApiCall, {
  maxRetries: 3,
  delay: 1000,
  backoff: "exponential",
  shouldRetry: (error) => error.name !== "ValidationError",
});
```

## 🔧 Real-World Examples

### API Error Handling

💡 For api calls that utilize `fetch` I actually recommend checking out [neat-fetch](https://www.npmjs.com/package/neat-fetch) npm package. It works similar to neat-catch but it's specifically geared towards `fetch`.

```typescript
import { neatCatch, errorTransformers } from "neat-catch";

async function fetchUser(id: string) {
  const [response, fetchError] = await neatCatch(
    () => fetch(`/api/users/${id}`),
    errorTransformers.fetchError
  );

  if (fetchError) {
    if (fetchError.isNetworkError) {
      // handle error
      return;
    }
    // handle other errors
    return;
  }

  const [userData, parseError] = await neatCatch(
    () => response.json(),
    errorTransformers.toString
  );

  if (parseError) {
    // handle parse error
    return;
  }

  return userData;
}
```

### Database & Async Operations Error Handling

```typescript
import {
  neatCatch,
  errorTransformers,
  neatCatchRetry,
  createNeatWrapper,
} from "neat-catch";

// Database operations with connection handling
class DatabaseService {
  constructor(private db: any) {} // Your database client

  async findUser(id: string) {
    const [user, error] = await neatCatch(
      () => this.db.user.findUnique({ where: { id } }),
      errorTransformers.withContext({ operation: "findUser", userId: id })
    );

    if (error) {
      // Handle specific errors. I'm throwing them in these examples but you should probably handle them better.
      if (error.error.code === "P2025") {
        throw new Error(`User ${id} not found`);
      }
      if (error.error.code === "P1001") {
        throw new Error("Database connection failed");
      }
      throw new Error(`Database error: ${error.error.message}`);
    }

    return user;
  }

  async createUserWithRetry(userData: any) {
    const [user, error] = await neatCatchRetry(
      () => this.db.user.create({ data: userData }),
      {
        maxRetries: 3,
        delay: 1000,
        shouldRetry: (error) => {
          const dbError = error as any;
          // Retry on connection issues, not on constraint violations
          return dbError.code === "P1001" || dbError.code === "P1017";
        },
        errorTransformer: errorTransformers.forLogging,
      }
    );

    if (error) {
      console.error("Failed to create user after retries:", error);
      throw new Error("Unable to create user - please try again later");
    }

    return user;
  }

  // Transaction with rollback handling
  async transferFunds(fromId: string, toId: string, amount: number) {
    const [result, error] = await neatCatch(
      async () => {
        return await this.db.$transaction(async (tx: any) => {
          // Debit from source account
          const [fromAccount, fromError] = await neatCatch(() =>
            tx.account.update({
              where: { id: fromId },
              data: { balance: { decrement: amount } },
            })
          );

          if (fromError) {
            throw new Error(
              `Failed to debit account ${fromId}: ${fromError.message}`
            );
          }

          if (!fromAccount || fromAccount.balance < 0) {
            throw new Error("Insufficient funds");
          }

          // Credit to destination account
          const [toAccount] = await neatCatch(() =>
            tx.account.update({
              where: { id: toId },
              data: { balance: { increment: amount } },
            })
          );

          if (!toAccount) {
            throw new Error("Destination account not found");
          }

          return { fromAccount, toAccount };
        });
      },
      errorTransformers.withContext({
        operation: "transferFunds",
        fromId,
        toId,
        amount,
      })
    );

    if (error) {
      console.error("Transfer failed:", error);
      throw new Error(`Transfer failed: ${error.error.message}`);
    }

    return result;
  }
}

// Redis cache operations
class CacheService {
  constructor(private redis: any) {}

  async get<T>(key: string): Promise<T | null> {
    const [data, error] = await neatCatch(async () => {
      const result = await this.redis.get(key);
      return result ? JSON.parse(result) : null;
    }, errorTransformers.toString);

    if (error) {
      console.warn(`Cache get failed for key ${key}:`, error);
      return null; // Graceful degradation
    }

    return data;
  }

  async set(key: string, value: any, ttlSeconds = 3600) {
    const [, error] = await neatCatch(
      () => this.redis.setex(key, ttlSeconds, JSON.stringify(value)),
      errorTransformers.withTimestamp
    );

    if (error) {
      console.error(`Cache set failed for key ${key}:`, error);
      // Don't throw - cache failures shouldn't break the app
    }
  }

  async invalidatePattern(pattern: string) {
    const [, error] = await neatCatch(async () => {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return keys.length;
    }, errorTransformers.forLogging);

    if (error) {
      console.error(`Cache invalidation failed for pattern ${pattern}:`, error);
    }
  }
}

// File system operations
import { readFile, writeFile, mkdir, access } from "fs/promises";
import { dirname } from "path";

const safeReadFile = createNeatWrapper(readFile);
const safeWriteFile = createNeatWrapper(writeFile);
const safeMkdir = createNeatWrapper(mkdir);

async function processDataFile(inputPath: string, outputPath: string) {
  // Check if input file exists
  const [, accessError] = await neatCatch(
    () => access(inputPath),
    errorTransformers.toString
  );

  if (accessError) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  // Read and parse data
  const [rawData, readError] = await safeReadFile(inputPath, "utf8");

  if (readError) {
    throw new Error(`Failed to read file: ${readError.message}`);
  }

  const [parsedData, parseError] = await neatCatch(
    () => JSON.parse(rawData),
    errorTransformers.toObject
  );

  if (parseError) {
    throw new Error(`Invalid JSON in ${inputPath}: ${parseError.message}`);
  }

  // Process data
  const [processedData, processError] = await neatCatch(
    async () => {
      // Simulate async processing
      await new Promise((resolve) => setTimeout(resolve, 100));
      return parsedData.map((item: any) => ({
        ...item,
        processed: true,
        timestamp: Date.now(),
      }));
    },
    errorTransformers.withContext({ operation: "dataProcessing" })
  );

  if (processError) {
    throw new Error(`Data processing failed: ${processError.error}`);
  }

  // Ensure output directory exists
  const [, mkdirError] = await safeMkdir(dirname(outputPath), {
    recursive: true,
  });

  if (mkdirError) {
    console.warn(`Failed to create directory: ${mkdirError.message}`);
  }

  // Write processed data
  const [, writeError] = await safeWriteFile(
    outputPath,
    JSON.stringify(processedData, null, 2)
  );

  if (writeError) {
    throw new Error(`Failed to write output: ${writeError.message}`);
  }

  return { processed: processedData.length, outputPath };
}

// Email service with queue processing
class EmailService {
  constructor(
    private emailClient: any,
    private queue: any
  ) {}

  async sendEmail(to: string, subject: string, body: string) {
    const [result, error] = await neatCatchRetry(
      () =>
        this.emailClient.send({
          to,
          subject,
          html: body,
          from: "noreply@example.com",
        }),
      {
        maxRetries: 3,
        delay: 2000,
        backoff: "exponential",
        shouldRetry: (error) => {
          const emailError = error as any;
          // Retry on rate limits and server errors, not on invalid email
          return emailError.statusCode >= 500 || emailError.statusCode === 429;
        },
        errorTransformer: errorTransformers.withContext({
          operation: "sendEmail",
          recipient: to,
        }),
      }
    );

    if (error) {
      // Add to retry queue for later processing
      const [, queueError] = await neatCatch(
        () =>
          this.queue.add("email-retry", {
            to,
            subject,
            body,
            attempts: 0,
            lastError: error.message,
          }),
        errorTransformers.forLogging
      );

      if (queueError) {
        console.error("Failed to queue email for retry:", queueError);
      }

      throw new Error(`Email delivery failed: ${error.message}`);
    }

    return result;
  }

  async processBatchEmails(
    emails: Array<{ to: string; subject: string; body: string }>
  ) {
    const results = await Promise.allSettled(
      emails.map(async (email, index) => {
        const [result, error] = await neatCatch(
          () => this.sendEmail(email.to, email.subject, email.body),
          errorTransformers.withContext({ batchIndex: index })
        );

        return { index, email: email.to, result, error };
      })
    );

    const successful = results
      .filter((r) => r.status === "fulfilled" && !r.value.error)
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter(Boolean);

    const failed = results
      .filter(
        (r) =>
          r.status === "rejected" || (r.status === "fulfilled" && r.value.error)
      )
      .map((r) =>
        r.status === "fulfilled" ? r.value : { error: r.reason?.message }
      );

    return {
      successful: successful.length,
      failed: failed.length,
      details: { successful, failed },
    };
  }
}

// WebSocket connection with reconnection
class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect(url: string) {
    const [, error] = await neatCatchRetry(
      () =>
        new Promise<void>((resolve, reject) => {
          const ws = new WebSocket(url);

          ws.onopen = () => {
            this.ws = ws;
            this.reconnectAttempts = 0;
            resolve();
          };

          ws.onerror = (error) => reject(error);
          ws.onclose = () => this.handleReconnect(url);
        }),
      {
        maxRetries: this.maxReconnectAttempts,
        delay: 1000,
        backoff: "exponential",
        errorTransformer: errorTransformers.withContext({
          operation: "websocket-connect",
          url,
        }),
      }
    );

    if (error) {
      throw new Error(`WebSocket connection failed: ${error.message}`);
    }
  }

  private async handleReconnect(url: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;

    const [, error] = await neatCatch(
      () =>
        new Promise((resolve) =>
          setTimeout(resolve, 1000 * this.reconnectAttempts)
        ),
      errorTransformers.toString
    );

    if (!error) {
      await this.connect(url);
    }
  }

  async sendMessage(data: any) {
    const [, error] = await neatCatch(
      () => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          throw new Error("WebSocket not connected");
        }
        this.ws.send(JSON.stringify(data));
      },
      errorTransformers.withContext({
        operation: "websocket-send",
        dataType: typeof data,
      })
    );

    if (error) {
      throw new Error(`Failed to send message: ${error.error}`);
    }
  }
}
```

### Form Validation

```typescript
import { neatCatch, createNeatWrapper } from "neat-catch";

const safeValidate = createNeatWrapper((data: any) => {
  if (!data.email) throw new Error("Email is required");
  if (!data.password) throw new Error("Password is required");
  return { valid: true };
});

function handleFormSubmit(formData: any) {
  const [validation, error] = safeValidate(formData);

  if (error) {
    showErrorMessage(error.message);
    return;
  }

  // Continue with valid form data
  submitForm(formData);
}
```

### File Operations

```typescript
import { neatCatch } from "neat-catch";
import { readFile, writeFile } from "fs/promises";

async function processFile(inputPath: string, outputPath: string) {
  const [content, readError] = await neatCatch(() =>
    readFile(inputPath, "utf8")
  );

  if (readError) {
    console.error(`Failed to read ${inputPath}:`, readError.message);
    return false;
  }

  const [processed, processError] = neatCatch(
    () => content.toUpperCase() // Some processing
  );

  if (processError) {
    console.error("Processing failed:", processError.message);
    return false;
  }

  const [, writeError] = await neatCatch(() =>
    writeFile(outputPath, processed)
  );

  if (writeError) {
    console.error(`Failed to write ${outputPath}:`, writeError.message);
    return false;
  }

  return true;
}
```

## 🆚 Comparison with Traditional Error Handling

### Before (Traditional try-catch)

```typescript
async function traditionalWay() {
  let userData;
  let userPosts;

  try {
    const userResponse = await fetch("/api/user");
    userData = await userResponse.json();

    const postsResponse = await fetch(`/api/posts/${userData.id}`);
    userPosts = await postsResponse.json();

    return { user: userData, posts: userPosts };
  } catch (error) {
    console.error("Server error:", error);
    return;
  }
}
```

### After (neat-catch)

```typescript
async function neatWay() {
  const [userData, userError] = await neatCatch(async () => {
    const response = await fetch("/api/user");
    return response.json();
  });

  if (userError) {
    console.error("Failed to fetch user:", userError);
    return;
  }

  const [userPosts, postsError] = await neatCatch(async () => {
    const response = await fetch(`/api/posts/${userData.id}`);
    return response.json();
  });

  if (postsError) {
    console.error("Failed to fetch posts:", postsError);
    return;
  }

  return { user: userData, posts: userPosts };
}
```

As you can see this is written in a synchronous way which makes it easier to follow and it encourages handle of errors. This makes debugging much easier as well. 

## 🎨 Type Safety

neat-catch provides excellent TypeScript support with intelligent type inference:

```typescript
// Types are automatically inferred
const [stringResult, error1] = neatCatch(() => "hello");
// stringResult: string | null, error1: Error | null

const [numberResult, error2] = await neatCatch(async () => 42);
// numberResult: number | null, error2: Error | null

// Custom error types
const [data, customError] = neatCatch(
  () => riskyOperation(),
  (err): CustomError => ({ code: 500, message: String(err) })
);
// customError: CustomError | null
```

## 📄 License

MIT © [dforrunner](https://github.com/dforrunner/neat-catch/blob/HEAD/LICENSE)
