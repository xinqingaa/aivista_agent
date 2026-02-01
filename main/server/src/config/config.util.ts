/**
 * 配置工具函数
 * 
 * 提供统一的环境变量解析方法
 */

/**
 * 解析布尔型环境变量
 * 
 * 规则：
 * - 'true' 或 '1' (不区分大小写) 返回 true
 * - undefined、null、''、'false'、'0' 等均返回 false
 * 
 * @param value - 环境变量值（string | undefined | null）
 * @returns 解析后的布尔值
 * 
 * @example
 * parseBooleanEnv('true')   // true
 * parseBooleanEnv('TRUE')   // true
 * parseBooleanEnv('1')      // true
 * parseBooleanEnv('false')  // false
 * parseBooleanEnv('0')      // false
 * parseBooleanEnv(undefined) // false
 * parseBooleanEnv('')       // false
 */
export function parseBooleanEnv(value: string | undefined | null): boolean {
  if (!value) {
    return false;
  }
  
  const normalized = String(value).toLowerCase().trim();
  return normalized === 'true' || normalized === '1';
}
