/**
 * Buffer Circular Genérico em Memória O(1) (Gymbeat ML)
 * Armazena uma janela temporal deslizante sem alocação ou cópia contínua de arrays.
 */

export class CircularBuffer<T> {
  private buffer: (T | undefined)[];
  private capacity: number;
  private pointer: number = 0;
  private count: number = 0;

  constructor(capacity: number) {
    if (capacity < 1) throw new Error("A capacidade do buffer circular deve ser >= 1.");
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /**
   * Adiciona um item ao buffer em O(1).
   * Se o buffer estiver cheio, sobrescreve o elemento mais antigo.
   */
  public push(item: T): void {
    this.buffer[this.pointer] = item;
    this.pointer = (this.pointer + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  /**
   * Retorna os itens em ordem cronológica (do mais antigo para o mais recente).
   */
  public toArray(): T[] {
    const result: T[] = [];
    if (this.count === 0) return result;

    const start = this.count === this.capacity ? this.pointer : 0;
    for (let i = 0; i < this.count; i++) {
      const idx = (start + i) % this.capacity;
      const item = this.buffer[idx];
      if (item !== undefined) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Retorna a quantidade atual de itens no buffer.
   */
  public size(): number {
    return this.count;
  }

  /**
   * Indica se o buffer atingiu a capacidade máxima.
   */
  public isFull(): boolean {
    return this.count === this.capacity;
  }

  /**
   * Retorna o item mais recente inserido (topo do buffer).
   */
  public last(): T | undefined {
    if (this.count === 0) return undefined;
    const idx = (this.pointer - 1 + this.capacity) % this.capacity;
    return this.buffer[idx];
  }

  /**
   * Limpa o buffer.
   */
  public clear(): void {
    this.buffer = new Array(this.capacity);
    this.pointer = 0;
    this.count = 0;
  }
}
