import { expect, it } from 'vitest';
import { vertexBufferCapacity, VertexBufferLimitError } from '../src/vertex-buffer.js';

it('caps geometric buffer growth at the actual device limit while fitting the upload', () => {
  const payload = 208320744, limit = 268435456;
  expect(vertexBufferCapacity(payload, limit)).toBe(limit);
  expect(vertexBufferCapacity(limit, limit)).toBe(limit);
  expect(vertexBufferCapacity(1024, limit)).toBe(2048);
});
it('rejects a payload exceeding the limit with an actionable scene error', () => {
  expect(() => vertexBufferCapacity(312481116, 268435456)).toThrow(VertexBufferLimitError);
  expect(() => vertexBufferCapacity(312481116, 268435456)).toThrow('Reduce mesh density, shadow quality, or view count');
});
