import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  neatCatch,
  createNeatWrapper,
  neatCatchAll,
  neatCatchRetry,
  errorTransformers,
} from "./index";

describe("neatCatch", () => {
  describe("synchronous functions", () => {
    it("should return data when function succeeds", () => {
      const [result, error] = neatCatch(() => "success");

      expect(result).toBe("success");
      expect(error).toBeNull();
    });

    it("should return error when function throws", () => {
      const [result, error] = neatCatch((): void => {
        throw new Error("test error");
      });

      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("test error");
    });

    it("should transform errors when errorTransformer is provided", () => {
      const [result, error] = neatCatch(
        (): void => {
          throw new Error("original error");
        },
        (err) => `Transformed: ${(err as Error).message}`
      );

      expect(result).toBeNull();
      expect(error).toBe("Transformed: original error");
    });

    it("should handle functions that return undefined", () => {
      const [result, error] = neatCatch(() => {});

      expect(result).toBeUndefined();
      expect(error).toBeNull();
    });

    it("should handle functions that return null", () => {
      const [result, error] = neatCatch(() => null);

      expect(result).toBeNull();
      expect(error).toBeNull();
    });

    it("should handle functions that return numbers", () => {
      const [result, error] = neatCatch(() => 42);

      expect(result).toBe(42);
      expect(error).toBeNull();
    });

    it("should handle functions that return objects", () => {
      const [result, error] = neatCatch(() => ({ key: "value" }));

      expect(result).toEqual({ key: "value" });
      expect(error).toBeNull();
    });

    it("should handle functions that return arrays", () => {
      const [result, error] = neatCatch(() => [1, 2, 3]);

      expect(result).toEqual([1, 2, 3]);
      expect(error).toBeNull();
    });

    it("should handle non-Error throws (string)", () => {
      const [result, error] = neatCatch((): void => {
        throw "string error";
      });

      expect(result).toBeNull();
      expect(error).toBe("string error");
    });

    it("should handle non-Error throws (object)", () => {
      const errorObj = { message: "custom error", code: 500 };
      const [result, error] = neatCatch((): void => {
        throw errorObj;
      });

      expect(result).toBeNull();
      expect(error).toBe(errorObj);
    });

    it("should handle non-Error throws with errorTransformer", () => {
      const [result, error] = neatCatch(
        (): void => {
          throw { message: "custom error" };
        },
        (err) => (err as any).message
      );

      expect(result).toBeNull();
      expect(error).toBe("custom error");
    });
  });

  describe("asynchronous functions", () => {
    it("should return data when async function succeeds", async () => {
      const [result, error] = await neatCatch(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "async success";
      });

      expect(result).toBe("async success");
      expect(error).toBeNull();
    });

    it("should return error when async function rejects", async () => {
      const [result, error] = await neatCatch(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error("async error");
      });

      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("async error");
    });

    it("should transform async errors", async () => {
      const [result, error] = await neatCatch(
        async () => {
          throw new Error("async original error");
        },
        (err) => ({ message: (err as Error).message, timestamp: Date.now() })
      );

      expect(result).toBeNull();
      expect(error).toHaveProperty("message", "async original error");
      expect(error).toHaveProperty("timestamp");
    });

    it("should handle async functions that return undefined", async () => {
      const [result, error] = await neatCatch(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(result).toBeUndefined();
      expect(error).toBeNull();
    });

    it("should handle async functions that return null", async () => {
      const [result, error] = await neatCatch(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return null;
      });

      expect(result).toBeNull();
      expect(error).toBeNull();
    });

    it("should handle Promise.reject with non-Error", async () => {
      const [result, error] = await neatCatch(async () => {
        return Promise.reject("rejected string");
      });

      expect(result).toBeNull();
      expect(error).toBe("rejected string");
    });

    it("should handle Promise.reject with object", async () => {
      const errorObj = { message: "rejected object", code: 500 };
      const [result, error] = await neatCatch(async () => {
        return Promise.reject(errorObj);
      });

      expect(result).toBeNull();
      expect(error).toBe(errorObj);
    });
  });

  describe("edge cases", () => {
    it("should handle functions that throw undefined", () => {
      const [result, error] = neatCatch((): void => {
        throw undefined;
      });

      expect(result).toBeNull();
      expect(error).toBeUndefined();
    });

    it("should handle functions that throw null", () => {
      const [result, error] = neatCatch((): void => {
        throw null;
      });

      expect(result).toBeNull();
      expect(error).toBeNull();
    });

    it("should handle empty error transformer", () => {
      const [result, error] = neatCatch(
        (): void => {
          throw new Error("test error");
        },
        () => undefined
      );

      expect(result).toBeNull();
      expect(error).toBeUndefined();
    });

    it("should handle error transformer that throws", () => {
      const [result, error] = neatCatch(
        (): void => {
          throw new Error("original error");
        },
        () => {
          throw new Error("transformer error");
        }
      );

      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
      expect((error as any).errors[1].message).toBe("transformer error");
    });

    it("should handle functions that return already resolved promises", async () => {
      const resolvedPromise = Promise.resolve("immediate resolve");
      const [result, error] = await neatCatch(() => resolvedPromise);

      expect(result).toBe("immediate resolve");
      expect(error).toBeNull();
    });

    it("should handle functions that return already rejected promises", async () => {
      const rejectedPromise = Promise.reject("immediate reject");
      const [result, error] = await neatCatch(() => rejectedPromise);

      expect(result).toBeNull();
      expect(error).toBe("immediate reject");
    });
  });

  describe("type safety", () => {
    it("should preserve types for synchronous functions", () => {
      const [result, error] = neatCatch(() => 42);

      // Type check - result should be number | null
      if (result !== null) {
        const num: number = result;
        expect(num).toBe(42);
      }

      // Error should be Error | null
      if (error !== null) {
        const err: Error = error;
        expect(err).toBeInstanceOf(Error);
      }
    });

    it("should preserve types for asynchronous functions", async () => {
      const [result, error] = await neatCatch(async () => {
        return { data: "test", count: 1 };
      });

      // Type check - result should be { data: string, count: number } | null
      if (result !== null) {
        const obj: { data: string; count: number } = result;
        expect(obj.data).toBe("test");
        expect(obj.count).toBe(1);
      }
    });

    it("should handle generic error types with errorTransformer", () => {
      const [result, error] = neatCatch(
        (): void => {
          throw new Error("test error");
        },
        (err) => (err as Error).message
      );

      // Error should be string | null
      if (error !== null) {
        const errMsg: string = error;
        expect(errMsg).toBe("test error");
      }
    });
  });
});

describe("createNeatWrapper", () => {
  it("should wrap synchronous functions", () => {
    const safeJsonParse = createNeatWrapper(JSON.parse);

    const [result, error] = safeJsonParse<{ valid: string }>(
      '{"valid": "json"}'
    );
    expect(result).toEqual({ valid: "json" });
    expect(error).toBeNull();

    const [result2, error2] = safeJsonParse("invalid json");
    expect(result2).toBeNull();
    expect(error2).toBeInstanceOf(Error);
  });

  it("should wrap asynchronous functions", async () => {
    const asyncFn = async (value: string) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      if (value === "error") throw new Error("test error");
      return `processed: ${value}`;
    };

    const safeAsyncFn = createNeatWrapper(asyncFn);

    const [result, error] = await safeAsyncFn("success");
    expect(result).toBe("processed: success");
    expect(error).toBeNull();

    const [result2, error2] = await safeAsyncFn("error");
    expect(result2).toBeNull();
    expect(error2).toBeInstanceOf(Error);
  });
});

describe("neatCatchAll", () => {
  it("should handle all successful operations", async () => {
    const operations = [
      () => Promise.resolve("result1"),
      () => Promise.resolve("result2"),
      () => Promise.resolve("result3"),
    ];

    const { results, errors } = await neatCatchAll(operations);

    expect(results).toEqual(["result1", "result2", "result3"]);
    expect(errors).toBeNull();
  });

  it("should collect all errors when operations fail", async () => {
    const operations = [
      () => Promise.resolve("result1"),
      () => Promise.reject("error2"),
      () => Promise.reject("error3"),
    ];

    const { results, errors } = await neatCatchAll(operations);

    expect(results).toHaveLength(1);
    expect(errors).toHaveLength(3);
    expect(errors![1]).toBe("error2");
    expect(errors![2]).toBe("error3");
  });
});

describe("neatCatchRetry", () => {
  it("should succeed on first attempt without retries", async () => {
    const mockFn = vi.fn().mockResolvedValue("success");

    const [result, error] = await neatCatchRetry(mockFn);

    expect(result).toBe("success");
    expect(error).toBeNull();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should succeed after some retries", async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce("first error")
      .mockRejectedValueOnce("second error")
      .mockResolvedValueOnce("success");

    vi.useRealTimers();
    const resultPromise = neatCatchRetry(mockFn, {
      maxRetries: 2,
      delay: 10,
      backoff: "linear",
    });

    const [result, error] = await resultPromise;

    expect(result).toBe("success");
    expect(error).toBeNull();
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it("should fail after all retries exhausted", async () => {
    const mockError = new Error("persistent error");
    const mockFn = vi.fn().mockRejectedValue(mockError);
    vi.useRealTimers();
    const resultPromise = neatCatchRetry(mockFn, { maxRetries: 2, delay: 100 });

    const [result, error] = await resultPromise;

    expect(result).toBeNull();
    expect(error).toBe(mockError);
    expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it("should use exponential backoff by default", async () => {
    vi.useRealTimers();
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("first error"))
      .mockRejectedValueOnce(new Error("second error"))
      .mockResolvedValueOnce("success");

    const [result, error] = await neatCatchRetry(mockFn, { delay: 10 });

    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(result).toBe("success");
    expect(error).toBeNull();
  });

  it("should use linear backoff when specified", async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("first error"))
      .mockRejectedValueOnce(new Error("second error"))
      .mockResolvedValueOnce("success");

    const [result, error] = await neatCatchRetry(mockFn, {
      delay: 100,
      backoff: "linear",
    });

    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(result).toBe("success");
    expect(error).toBeNull();
  });

  it("should respect custom shouldRetry function", async () => {
    const retryableError = new Error("retryable");
    const nonRetryableError = new Error("non-retryable");

    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(retryableError)
      .mockRejectedValueOnce(nonRetryableError)
      .mockResolvedValueOnce("success");

    const shouldRetry = (error: unknown) =>
      (error as Error).message === "retryable";

    const [result, error] = await neatCatchRetry(mockFn, {
      maxRetries: 3,
      delay: 100,
      shouldRetry,
    });

    expect(result).toBeNull();
    expect(error).toBe(nonRetryableError);
    expect(mockFn).toHaveBeenCalledTimes(2); // Should not have made the third call
  });

  it("should transform errors using errorTransformer", async () => {
    const mockError = new Error("original error");
    const mockFn = vi.fn().mockRejectedValue(mockError);

    const errorTransformer = (error: unknown, attempt: number) =>
      `Attempt ${attempt}: ${(error as Error).message}`;

    const [result, error] = await neatCatchRetry(mockFn, {
      maxRetries: 1,
      delay: 100,
      errorTransformer,
    });

    expect(result).toBeNull();
    expect(error).toBe("Attempt 2: original error"); // Second attempt is when it finally fails
  });

  it("should handle zero retries", async () => {
    const mockError = new Error("error");
    const mockFn = vi.fn().mockRejectedValue(mockError);

    const resultPromise = neatCatchRetry(mockFn, { maxRetries: 0, delay: 10 });

    // No need to advance timers as no retries should happen
    const [result, error] = await resultPromise;

    expect(result).toBeNull();
    expect(error).toBe(mockError);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should handle custom maxRetries", async () => {
    const mockError = new Error("error");
    const mockFn = vi.fn().mockRejectedValue(mockError);

    const [result, error] = await neatCatchRetry(mockFn, {
      maxRetries: 5,
      delay: 10,
    });

    expect(result).toBeNull();
    expect(error).toBe(mockError);
    expect(mockFn).toHaveBeenCalledTimes(6); // Initial + 5 retries
  });

  it("should handle different error types", async () => {
    const stringError = "string error";
    const objectError = { message: "object error", code: 500 };

    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(stringError)
      .mockRejectedValueOnce(objectError)
      .mockResolvedValueOnce("success");

    const [result, error] = await neatCatchRetry(mockFn, {
      maxRetries: 2,
      delay: 10,
    });

    expect(result).toBe("success");
    expect(error).toBeNull();
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it("should handle shouldRetry function that uses attempt number", async () => {
    const mockError = new Error("error");
    const mockFn = vi.fn().mockRejectedValue(mockError);

    const shouldRetry = (error: unknown, attempt: number) => attempt <= 2;

    const [result, error] = await neatCatchRetry(mockFn, {
      maxRetries: 5,
      delay: 100,
      shouldRetry,
    });

    expect(result).toBeNull();
    expect(error).toBe(mockError);
    expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries (not the full 5)
  });
});

describe("errorTransformers", () => {
  describe("toString", () => {
    it("should extract message from Error objects", () => {
      const error = new Error("Test error message");
      const result = errorTransformers.toString(error);
      expect(result).toBe("Test error message");
    });

    it("should return string errors as-is", () => {
      const error = "String error";
      const result = errorTransformers.toString(error);
      expect(result).toBe("String error");
    });

    it("should extract message from error-like objects", () => {
      const error = { message: "Error-like object message" };
      const result = errorTransformers.toString(error);
      expect(result).toBe("Error-like object message");
    });

    it("should convert other types to string", () => {
      expect(errorTransformers.toString(123)).toBe("123");
      expect(errorTransformers.toString(null)).toBe("null");
      expect(errorTransformers.toString(undefined)).toBe("undefined");
      expect(errorTransformers.toString({})).toBe("[object Object]");
    });
  });

  describe("toObject", () => {
    it("should convert Error objects to structured format", () => {
      const error = new Error("Test error");
      error.stack = "test stack";
      error.name = "TestError";

      const result = errorTransformers.toObject(error);

      expect(result).toEqual({
        message: "Test error",
        stack: "test stack",
        name: "TestError",
      });
    });

    it("should include cause if present", () => {
      const cause = new Error("Root cause");
      const error = new Error("Test error", { cause });

      const result = errorTransformers.toObject(error);

      expect(result.cause).toBe(cause);
    });

    it("should handle error-like objects", () => {
      const error = {
        message: "Custom error",
        stack: "custom stack",
        name: "CustomError",
        cause: "some cause",
      };

      const result = errorTransformers.toObject(error);

      expect(result).toEqual(error);
    });

    it("should handle primitive values", () => {
      expect(errorTransformers.toObject("string error")).toEqual({
        message: "string error",
      });

      expect(errorTransformers.toObject(123)).toEqual({
        message: "123",
      });
    });
  });

  describe("withTimestamp", () => {
    it("should wrap error with timestamp information", () => {
      const error = new Error("Test error");
      const result = errorTransformers.withTimestamp(error);

      expect(result.error).toBe(error);
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("isoString");
      expect(typeof result.timestamp).toBe("number");
      expect(result.isoString).toBe(new Date(result.timestamp).toISOString());
    });
  });

  describe("fetchError", () => {
    it("should handle Response error objects", () => {
      const error = {
        status: 404,
        statusText: "Not Found",
        url: "https://example.com/api",
      };

      const result = errorTransformers.fetchError(error);

      expect(result).toEqual({
        message: "HTTP error 404",
        status: 404,
        statusText: "Not Found",
        url: "https://example.com/api",
        isNetworkError: false,
        isTimeout: false,
      });
    });

    it("should handle timeout errors", () => {
      const error = {
        status: 408,
        statusText: "Request Timeout",
      };

      const result = errorTransformers.fetchError(error);

      expect(result).toEqual({
        message: "HTTP error 408",
        status: 408,
        statusText: "Request Timeout",
        isNetworkError: false,
        isTimeout: true,
      });
    });

    it("should handle network errors (TypeError)", () => {
      const error = new TypeError("Failed to fetch");
      const result = errorTransformers.fetchError(error);

      expect(result).toEqual({
        message: "Failed to fetch",
        isNetworkError: true,
        isTimeout: false,
      });
    });

    it("should handle timeout errors (TimeoutError)", () => {
      const error = new Error("Request timeout");
      error.name = "TimeoutError";

      const result = errorTransformers.fetchError(error);

      expect(result).toEqual({
        message: "Request timeout",
        isNetworkError: true,
        isTimeout: true,
      });
    });

    it("should handle regular Error objects", () => {
      const error = new Error("Generic error");
      const result = errorTransformers.fetchError(error);

      expect(result).toEqual({
        message: "Generic error",
        isNetworkError: false,
        isTimeout: false,
      });
    });

    it("should handle other error types", () => {
      const result = errorTransformers.fetchError("string error");

      expect(result).toEqual({
        message: "string error",
        isNetworkError: false,
        isTimeout: false,
      });
    });
  });

  describe("withContext", () => {
    it("should wrap error with context information", () => {
      const context = { userId: 123, requestId: "abc" };
      const error = new Error("Test error");

      const transformer = errorTransformers.withContext(context);
      const result = transformer(error);

      expect(result).toEqual({
        userId: 123,
        requestId: "abc",
        error: error,
      });
    });
  });

  describe("toSimpleError", () => {
    it("should extract message from Error objects", () => {
      const error = new Error("Test error");
      const result = errorTransformers.toSimpleError(error);

      expect(result).toEqual({
        message: "Test error",
      });
    });

    it("should convert other types to message string", () => {
      const result = errorTransformers.toSimpleError("string error");

      expect(result).toEqual({
        message: "string error",
      });
    });
  });

  describe("forLogging", () => {
    it("should create log-friendly error object", () => {
      const error = new Error("Test error");
      error.stack = "test stack";
      error.name = "TestError";

      const result = errorTransformers.forLogging(error);

      expect(result).toEqual({
        message: "Test error",
        stack: "test stack",
        name: "TestError",
        timestamp: expect.any(Number),
        environment: expect.any(String),
      });
    });

    it("should include environment if available", () => {
      // Mock process.env.NODE_ENV
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      const error = new Error("Test error");
      const result = errorTransformers.forLogging(error);

      expect(result.environment).toBe("test");

      // Restore original value
      process.env.NODE_ENV = originalEnv;
    });

    it("should work without process.env", () => {
      // Temporarily remove process
      const originalProcess = global.process;
      // @ts-ignore
      delete global.process;

      const error = new Error("Test error");
      const result = errorTransformers.forLogging(error);

      expect(result).not.toHaveProperty("environment");

      // Restore process
      global.process = originalProcess;
    });
  });
});
