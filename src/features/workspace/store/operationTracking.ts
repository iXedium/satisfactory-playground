let _nextOperationId = 0;

export function generateOperationId(): string {
  return String(++_nextOperationId);
}

export function resetOperationIds(): void {
  _nextOperationId = 0;
}
