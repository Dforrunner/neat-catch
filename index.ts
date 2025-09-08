/**
 * A utility function that executes a sync or async function and returns a tuple
 * where the first element is the data (or null if error) and the second element
 * is the error (or null if successful)
 *
 * @param fn - The sync or async function to execute
 * @param errorTransformer - Optional function to transform caught errors
 * @returns A tuple of [data | null, error | null] (wrapped in Promise for async functions)
 */
export function neatCatch<TFn extends () => any, E = Error>(
  fn: TFn,
  errorTransformer?: (error: unknown) => E
): ReturnType<TFn> extends Promise<any>
  ? Promise<[Awaited<ReturnType<TFn>>, null] | [null, E]>
  : [ReturnType<TFn>, null] | [null, E] {
  const handleError = (error: unknown): [null, E] => [
    null,
    transformError(error, errorTransformer),
  ];

  try {
    const result = fn();

    if (
      result instanceof Promise ||
      (result != null &&
        (typeof result === "object" || typeof result === "function") &&
        typeof result.then === "function" &&
        typeof result.catch === "function")
    ) {
      return result
        .then((data: Awaited<ReturnType<TFn>>) => [data, null])
        .catch(handleError) as any;
    }

    return [result, null] as any;
  } catch (error) {
    return handleError(error) as any;
  }
}

// Overload for synchronous functions with type override
export function createNeatWrapper<TArgs extends any[], TReturn, E = Error>(
  fn: (...args: TArgs) => TReturn,
  errorTransformer?: (error: unknown) => E
): <TOverride = TReturn>(...args: TArgs) => [TOverride, null] | [null, E];

// Overload for asynchronous functions with type override
export function createNeatWrapper<TArgs extends any[], TReturn, E = Error>(
  fn: (...args: TArgs) => Promise<TReturn>,
  errorTransformer?: (error: unknown) => E
): <TOverride = TReturn>(
  ...args: TArgs
) => Promise<[TOverride, null] | [null, E]>;

/**
 * Creates a wrapped version of a function that always returns a neat tuple
 *
 * @param fn - The function to wrap (can be sync or async)
 * @param errorTransformer - Optional function to transform caught errors
 * @returns A new function that returns a neat tuple when called
 */
export function createNeatWrapper<TArgs extends any[], TReturn, E = Error>(
  fn: (...args: TArgs) => TReturn,
  errorTransformer?: (error: unknown) => E
) {
  return (...args: TArgs): any =>
    neatCatch(() => fn(...args), errorTransformer);
}

/**
 * Utility for handling multiple async operations and collecting results/errors.
 * The index of results and errors corresponds to the index of the input operations.
 *
 * @param operations - An array of functions returning Promises
 * @param errorTransformer - Optional function to transform caught errors
 * @returns An object with either all results or all errors
 */
export async function neatCatchAll<T extends readonly any[], E = Error>(
  operations: { [K in keyof T]: () => Promise<T[K]> },
  errorTransformer?: (error: unknown) => E
): Promise<{
  results: { [K in keyof T]: T[K] | null } | null;
  errors: { [K in keyof T]: E | null } | null;
}> {
  const settled = await Promise.allSettled(
    operations.map((op) => neatCatch(op, errorTransformer))
  );

  const results: any[] = [];
  const errors: any[] = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      const [data, error] = result.value;
      if (error) {
        errors[index] = error;
      } else {
        results[index] = data;
      }
    } else {
      errors[index] = transformError(result.reason, errorTransformer);
    }
  });

  return {
    results: results.length
      ? (results as { [K in keyof T]: T[K] | null })
      : null,
    errors: errors.length ? (errors as { [K in keyof T]: E | null }) : null,
  };
}

export type NeatCatchRetryOptions<E = Error> = {
  maxRetries?: number;
  delay?: number;
  backoff?: "linear" | "exponential";
  errorTransformer?: (error: unknown, attempt: number) => E;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};

/**
 * Utility for retrying operations with neat error handling
 *
 * @param fn - The async function to execute
 * @param options - Configuration options for retries
 * @returns A tuple of [data | null, error | null] after retries
 */
export async function neatCatchRetry<T, E = Error>(
  fn: () => Promise<T>,
  options: NeatCatchRetryOptions<E> = {}
): Promise<[T, null] | [null, E]> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = "exponential",
    errorTransformer,
    shouldRetry = () => true,
  } = options;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const [data, error] = await neatCatch(fn);

    if (!error) return [data, null];

    const isLastAttempt = attempt === maxRetries + 1;
    const shouldContinue = !isLastAttempt && shouldRetry(error, attempt);

    if (!shouldContinue) {
      const transformedError = errorTransformer
        ? transformError(error, (e) => errorTransformer(e, attempt))
        : (error as E);
      return [null, transformedError];
    }

    // Calculate delay for next attempt
    const nextDelay =
      backoff === "exponential"
        ? delay * Math.pow(2, attempt - 1)
        : delay * attempt;

    console.log({ attempt, isLastAttempt, shouldContinue, nextDelay });
    await new Promise((resolve) => setTimeout(resolve, nextDelay));
  }

  // This should never be reached, but TypeScript needs it
  return [null, new Error("Unexpected retry loop exit") as E];
}

/**
 * Common error transformers for convenience
 */
export const errorTransformers = {
  /**
   * Transforms any error into a simple message string
   */
  toString: (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      return error.message;
    }
    return String(error);
  },

  /**
   * Transforms errors into a structured object with message and stack
   */
  toObject: (
    error: unknown
  ): { message: string; stack?: string; name?: string; cause?: unknown } => {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...(error.cause !== undefined && { cause: error.cause }),
      };
    }

    if (error && typeof error === "object") {
      return {
        message: (error as any).message || "Unknown error",
        ...("stack" in error &&
          typeof error.stack === "string" && { stack: error.stack }),
        ...("name" in error &&
          typeof error.name === "string" && { name: error.name }),
        ...("cause" in error && { cause: error.cause }),
      };
    }

    return { message: String(error) };
  },

  /**
   * Transforms errors into a structured object with timestamp
   */
  withTimestamp: (
    error: unknown
  ): { error: unknown; timestamp: number; isoString: string } => {
    const now = Date.now();
    return {
      error,
      timestamp: now,
      isoString: new Date(now).toISOString(),
    };
  },

  /**
   * Transforms HTTP fetch errors into structured format
   */
  fetchError: (
    error: unknown
  ): {
    message: string;
    status?: number;
    statusText?: string;
    url?: string;
    isNetworkError: boolean;
    isTimeout: boolean;
  } => {
    // Handle Response objects (when fetch succeeds but response is not ok)
    if (error && typeof error === "object" && "status" in error) {
      return {
        message: `HTTP error ${error.status}`,
        status: Number(error.status),
        statusText:
          "statusText" in error ? String(error.statusText) : undefined,
        url: "url" in error ? String(error.url) : undefined,
        isNetworkError: false,
        isTimeout: Number(error.status) === 408,
      };
    }

    // Handle network errors
    if (error instanceof TypeError) {
      const message = error.message.toLowerCase();
      return {
        message: error.message,
        isNetworkError:
          message.includes("network") ||
          message.includes("fetch") ||
          message.includes("request"),
        isTimeout: message.includes("timeout"),
      };
    }

    // Handle timeout errors specifically
    if (error instanceof Error && error.name === "TimeoutError") {
      return {
        message: error.message,
        isNetworkError: true,
        isTimeout: true,
      };
    }

    // Handle other Error objects
    if (error instanceof Error) {
      return {
        message: error.message,
        isNetworkError: false,
        isTimeout: false,
      };
    }

    // Fallback for unknown error types
    return {
      message: String(error),
      isNetworkError: false,
      isTimeout: false,
    };
  },

  /**
   * Wraps an error with additional context information
   */
  withContext:
    <T extends Record<string, unknown>>(context: T) =>
    (error: unknown): T & { error: unknown } => ({
      ...context,
      error,
    }),

  /**
   * Simplifies errors by extracting only the message and discarding other properties
   */
  toSimpleError: (error: unknown): { message: string } => ({
    message: error instanceof Error ? error.message : String(error),
  }),

  /**
   * Transforms errors for logging purposes with detailed information
   */
  forLogging: (
    error: unknown
  ): {
    message: string;
    stack?: string;
    name?: string;
    timestamp: number;
    environment?: string;
  } => {
    const baseError = errorTransformers.toObject(error);
    return {
      ...baseError,
      timestamp: Date.now(),
      ...(typeof process !== "undefined" &&
        process.env &&
        process.env.NODE_ENV && {
          environment: process.env.NODE_ENV,
        }),
    };
  },
};

const transformError = <E>(
  error: unknown,
  transformer?: (error: unknown) => E
): E => {
  try {
    return transformer ? transformer(error) : (error as E);
  } catch (transformError) {
    return new AggregateError(
      [error, transformError],
      "Error transforming error. Both errors are in the 'errors' property."
    ) as E;
  }
};

// Type utilities for better developer experience
export type NeatCatchResult<T, E = Error> = [T, null] | [null, E];

// Re-export main function as default
export default neatCatch;
