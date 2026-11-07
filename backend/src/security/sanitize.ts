import { Injectable } from '@nestjs/common';
import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';

/**
 * C0 control characters except tab, line feed and carriage return, plus DEL.
 * NUL in particular makes Postgres reject the whole request (it was a 500).
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Keys that could pollute object prototypes if they reached a merge or assign. */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const MAX_DEPTH = 20;

/**
 * SMS-33: cleans untrusted input before validation. Strings lose control characters,
 * objects lose prototype-polluting keys. Everything else is left for class-validator.
 */
export function sanitize(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return value.replace(CONTROL_CHARS, '');
  if (depth >= MAX_DEPTH || value === null || typeof value !== 'object')
    return value;
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));
  const clean: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (!FORBIDDEN_KEYS.has(key)) clean[key] = sanitize(v, depth + 1);
  }
  return clean;
}

/** Global pipe: runs on request bodies and query strings, before the ValidationPipe. */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    return metadata.type === 'body' || metadata.type === 'query'
      ? sanitize(value)
      : value;
  }
}
