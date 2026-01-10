/**
 * 向量嵌入服务接口
 * 
 * 支持多 provider（阿里云、OpenAI、DeepSeek 等）
 */
export interface IEmbeddingService {
  /**
   * 生成单个文本的向量嵌入
   * 
   * @param text - 要嵌入的文本
   * @returns 向量数组
   */
  embed(text: string): Promise<number[]>;

  /**
   * 批量生成文本的向量嵌入
   * 
   * @param texts - 要嵌入的文本数组
   * @returns 向量数组的数组
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * 获取向量维度
   * 
   * @returns 向量维度
   */
  getDimension(): number;
}
